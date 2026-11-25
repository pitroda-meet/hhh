<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\Department;
use App\Models\Notification;
use App\Models\QueryCategory;
use App\Models\Ticket;
use App\Models\TicketStatusHistory;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Validation\ValidationException;

class TicketRoutingService
{
    /**
     * Resolve category -> active department -> active staff member.
     *
     * @return array{category: QueryCategory, department: Department, staff: ?User, strategy: string}
     */
    public function routeCategory(int $categoryId): array
    {
        $category = QueryCategory::query()
            ->where('id', $categoryId)
            ->where('active', true)
            ->first();

        if (! $category) {
            throw ValidationException::withMessages([
                'category_id' => ['Please choose an active query category.'],
            ]);
        }

        $department = Department::query()
            ->where('id', $category->department_id)
            ->where('active', true)
            ->first();

        if (! $department) {
            throw ValidationException::withMessages([
                'category_id' => ['The mapped department is unavailable. Please choose another category or contact an administrator.'],
            ]);
        }

        $strategy = (string) (AppSetting::getValue('routing_strategy', 'least_open') ?? 'least_open');
        $staff = $this->findAssignee($department->id, null, $strategy);

        return [
            'category' => $category,
            'department' => $department,
            'staff' => $staff,
            'strategy' => $strategy,
        ];
    }

    /**
     * Select an active staff member belonging to the target department.
     */
    public function findAssignee(int $departmentId, ?int $preferredStaffId = null, ?string $strategy = null): ?User
    {
        $candidates = User::query()
            ->whereHas('roleRelation', fn ($q) => $q->where('name', 'staff'))
            ->where('active', true)
            ->whereHas('departments', fn ($q) => $q->where('departments.id', $departmentId))
            ->orderBy('id')
            ->get();

        if ($preferredStaffId !== null) {
            return $candidates->firstWhere('id', $preferredStaffId);
        }

        if ($candidates->isEmpty()) {
            return null;
        }

        $strategy ??= (string) (AppSetting::getValue('routing_strategy', 'least_open') ?? 'least_open');

        if ($strategy === 'round_robin') {
            $cursors = AppSetting::getValue('routing_cursors', []);
            if (! is_array($cursors)) {
                $cursors = [];
            }
            $previousId = $cursors[(string) $departmentId] ?? $cursors[$departmentId] ?? null;
            $previousIndex = $candidates->search(fn (User $staff) => $staff->id === (int) $previousId);
            $nextIndex = $previousIndex === false ? 0 : ($previousIndex + 1) % $candidates->count();
            /** @var User $selected */
            $selected = $candidates->values()->get($nextIndex);
            $cursors[(string) $departmentId] = $selected->id;
            AppSetting::setValue('routing_cursors', $cursors);

            return $selected;
        }

        $activeCounts = Ticket::query()
            ->selectRaw('assigned_to, COUNT(*) as aggregate_count')
            ->whereIn('assigned_to', $candidates->pluck('id'))
            ->whereIn('status', Ticket::ACTIVE_STATUSES)
            ->groupBy('assigned_to')
            ->pluck('aggregate_count', 'assigned_to');

        return $candidates
            ->sort(function (User $a, User $b) use ($activeCounts) {
                $loadA = (int) ($activeCounts[$a->id] ?? 0);
                $loadB = (int) ($activeCounts[$b->id] ?? 0);

                return $loadA <=> $loadB ?: $a->id <=> $b->id;
            })
            ->first();
    }

    /**
     * Update ticket status, lifecycle timestamps, and append history.
     */
    public function addStatusHistory(Ticket $ticket, string $status, ?int $actorId, string $note): TicketStatusHistory
    {
        $now = ApiResponse::appNow();
        $previousStatus = $ticket->status;

        $ticket->status = $status;
        $ticket->updated_at = $now;

        if ($status === 'Resolved') {
            $ticket->resolved_at = $now;
        }

        if ($status === 'Closed') {
            $ticket->closed_at = $now;
        }

        if (in_array($status, Ticket::ACTIVE_STATUSES, true) && ! in_array($previousStatus, Ticket::ACTIVE_STATUSES, true)) {
            $slaHours = $ticket->department?->sla_hours ?? 24;
            $ticket->resolved_at = null;
            $ticket->closed_at = null;
            $ticket->rating = null;
            $ticket->feedback = '';
            $ticket->escalation_level = 0;
            $ticket->reopened_at = $now;
            $ticket->due_at = $now->addHours($slaHours);
        }

        $ticket->save();

        return TicketStatusHistory::query()->create([
            'ticket_id' => $ticket->id,
            'actor_id' => $actorId,
            'previous_status' => $previousStatus,
            'status' => $status,
            'note' => $note,
            'created_at' => $now,
        ]);
    }

    /**
     * Create notifications for unique non-null user IDs.
     *
     * @param  array<int, int|null>  $userIds
     * @param  array{ticket_id?: int|null, type: string, title: string, message: string}  $payload
     */
    public function notifyUsers(array $userIds, array $payload): void
    {
        $now = ApiResponse::appNow();
        $uniqueIds = collect($userIds)->filter()->map(fn ($id) => (int) $id)->unique()->values();

        foreach ($uniqueIds as $userId) {
            Notification::query()->create([
                'user_id' => $userId,
                'ticket_id' => $payload['ticket_id'] ?? null,
                'type' => $payload['type'],
                'title' => $payload['title'],
                'message' => $payload['message'],
                'read_at' => null,
                'created_at' => $now,
            ]);
        }
    }
}
