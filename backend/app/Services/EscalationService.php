<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\EscalationRule;
use App\Models\Ticket;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\DB;

class EscalationService
{
    public function __construct(
        private readonly TicketRoutingService $routingService,
    ) {}

    /**
     * Advance simulated clock (optional) and evaluate enabled escalation rules on active tickets.
     *
     * @return array{hours_advanced: int, escalated_count: int, ticket_ids: array<int, int>, current_time: string, time_offset_hours: int}
     */
    public function evaluate(int $advanceHours = 0, ?int $actorId = null): array
    {
        return DB::transaction(function () use ($advanceHours, $actorId) {
            $currentOffset = ApiResponse::timeOffsetHours();
            $newOffset = $currentOffset + $advanceHours;

            if ($advanceHours !== 0) {
                AppSetting::setValue('time_offset_hours', $newOffset);
            }

            $now = ApiResponse::appNow();
            $rules = EscalationRule::query()
                ->where('enabled', true)
                ->orderBy('threshold_hours')
                ->get();

            $changedIds = [];

            if ($rules->isNotEmpty()) {
                $activeTickets = Ticket::query()
                    ->whereIn('status', Ticket::ACTIVE_STATUSES)
                    ->with('department')
                    ->get();

                $supervisors = User::query()
                    ->where('active', true)
                    ->whereHas('roleRelation', fn ($q) => $q->where('name', 'principal'))
                    ->pluck('id')
                    ->all();

                $admins = User::query()
                    ->where('active', true)
                    ->whereHas('roleRelation', fn ($q) => $q->where('name', 'admin'))
                    ->pluck('id')
                    ->all();

                foreach ($activeTickets as $ticket) {
                    $anchor = $ticket->reopened_at ?? $ticket->created_at;
                    $ageHours = $anchor ? $anchor->diffInMinutes($now) / 60 : 0;

                    $matchingRule = $rules
                        ->reverse()
                        ->first(fn (EscalationRule $rule) => $ageHours >= $rule->threshold_hours
                            && ($rule->priority === 'All' || $rule->priority === $ticket->priority));

                    if (! $matchingRule || $ticket->escalation_level >= $matchingRule->threshold_hours) {
                        continue;
                    }

                    $ticket->escalation_level = $matchingRule->threshold_hours;
                    $this->routingService->addStatusHistory(
                        $ticket,
                        'Escalated',
                        $actorId,
                        "{$matchingRule->name}: unresolved for ".(int) floor($ageHours)." hours (threshold {$matchingRule->threshold_hours}h)."
                    );

                    $targets = $matchingRule->target_role === 'principal_admin'
                        ? array_merge($supervisors, $admins)
                        : $supervisors;

                    $this->routingService->notifyUsers(
                        array_merge([$ticket->student_id, $ticket->assigned_to], $targets),
                        [
                            'ticket_id' => $ticket->id,
                            'type' => 'escalated',
                            'title' => "{$ticket->ticket_number} escalated",
                            'message' => "{$ticket->subject} — {$matchingRule->name}. Your department has been notified.",
                        ]
                    );

                    $changedIds[] = $ticket->id;
                }
            }

            return [
                'hours_advanced' => $advanceHours,
                'escalated_count' => count($changedIds),
                'ticket_ids' => $changedIds,
                'current_time' => $now->toISOString(),
                'time_offset_hours' => $newOffset,
            ];
        });
    }
}
