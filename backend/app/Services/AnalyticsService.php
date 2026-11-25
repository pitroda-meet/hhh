<?php

namespace App\Services;

use App\Models\AiActionLog;
use App\Models\Department;
use App\Models\Faq;
use App\Models\QueryCategory;
use App\Models\Ticket;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Support\Collection;

class AnalyticsService
{
    public function __construct(
        private readonly TicketService $ticketService,
    ) {}

    /**
     * Compute real-time analytics from MySQL tickets, replies, ratings, and AI logs.
     *
     * @return array<string, mixed>
     */
    public function getReports(): array
    {
        $now = ApiResponse::appNow();
        $tickets = Ticket::query()
            ->with(['student.roleRelation', 'student.departments', 'assignedStaff.roleRelation', 'assignedStaff.departments', 'department', 'category'])
            ->withCount('replies')
            ->get();

        $active = $tickets->filter(fn (Ticket $t) => in_array($t->status, Ticket::ACTIVE_STATUSES, true));
        $resolved = $tickets->filter(fn (Ticket $t) => in_array($t->status, ['Resolved', 'Closed'], true));

        $average = function (Collection $values): float {
            if ($values->isEmpty()) {
                return 0.0;
            }

            return round($values->avg(), 1);
        };

        $responseHours = fn (Collection $subset): Collection => $subset
            ->filter(fn (Ticket $t) => $t->first_response_at !== null && $t->created_at !== null)
            ->map(fn (Ticket $t) => max(0, $t->created_at->diffInMinutes($t->first_response_at) / 60));

        $trend = [];
        for ($i = 0; $i < 30; $i++) {
            $day = $now->subDays(29 - $i);
            $dayKey = $day->format('Y-m-d');
            $trend[] = [
                'date' => $day->toISOString(),
                'label' => $day->format('j M'),
                'created' => $tickets->filter(fn (Ticket $t) => $t->created_at?->format('Y-m-d') === $dayKey)->count(),
                'resolved' => $tickets->filter(fn (Ticket $t) => $t->resolved_at?->format('Y-m-d') === $dayKey)->count(),
            ];
        }

        $departments = Department::query()->orderBy('id')->get()->map(function (Department $d) use ($tickets, $average, $responseHours) {
            $subset = $tickets->where('department_id', $d->id);

            return [
                'id' => $d->id,
                'name' => $d->name,
                'short' => $d->code,
                'total' => $subset->count(),
                'resolved' => $subset->filter(fn (Ticket $t) => in_array($t->status, ['Resolved', 'Closed'], true))->count(),
                'pending' => $subset->filter(fn (Ticket $t) => in_array($t->status, Ticket::ACTIVE_STATUSES, true))->count(),
                'average_response' => $average($responseHours($subset)),
            ];
        })->values()->all();

        $staffUsers = User::query()
            ->with(['roleRelation', 'departments'])
            ->where('active', true)
            ->whereHas('roleRelation', fn ($q) => $q->where('name', 'staff'))
            ->orderBy('id')
            ->get();

        $staffPerformance = $staffUsers->map(function (User $u) use ($tickets, $average, $responseHours) {
            $subset = $tickets->where('assigned_to', $u->id);
            $completed = $subset->filter(fn (Ticket $t) => in_array($t->status, ['Resolved', 'Closed'], true))->count();
            $ratings = $subset->pluck('rating')->filter(fn ($r) => $r !== null);

            return [
                ...$u->toPublicArray(),
                'department_names' => $u->departments->pluck('name')->implode(', '),
                'assigned' => $subset->count(),
                'pending' => $subset->count() - $completed,
                'resolved' => $completed,
                'average_response' => $average($responseHours($subset)),
                'satisfaction' => $average($ratings),
                'resolution_rate' => $subset->isNotEmpty() ? (int) round(($completed / $subset->count()) * 100) : 0,
            ];
        })->values()->all();

        $categories = QueryCategory::query()->orderBy('id')->get()
            ->map(fn (QueryCategory $c) => [
                'name' => $c->name,
                'value' => $tickets->where('category_id', $c->id)->count(),
            ])
            ->filter(fn (array $c) => $c['value'] > 0)
            ->values()
            ->all();

        $priorityRank = array_flip(Ticket::PRIORITIES);
        $critical = $active
            ->filter(fn (Ticket $t) => $t->priority === 'Critical' || $t->status === 'Escalated')
            ->sort(fn (Ticket $a, Ticket $b) => ($priorityRank[$b->priority] ?? 0) <=> ($priorityRank[$a->priority] ?? 0))
            ->map(fn (Ticket $t) => $this->ticketService->enrichTicket($t))
            ->values()
            ->all();

        $recent = $tickets
            ->sortByDesc('updated_at')
            ->take(5)
            ->map(fn (Ticket $t) => $this->ticketService->enrichTicket($t))
            ->values()
            ->all();

        $faqSearches = AiActionLog::query()->where('tool', 'search_faq')->count();
        $faqMatches = AiActionLog::query()->where('tool', 'search_faq')->where('status', 'success')->count();
        $allRatings = $tickets->pluck('rating')->filter(fn ($r) => $r !== null);

        return [
            'summary' => [
                'students' => User::query()->where('active', true)->whereHas('roleRelation', fn ($q) => $q->where('name', 'student'))->count(),
                'staff' => count($staffPerformance),
                'departments' => Department::query()->where('active', true)->count(),
                'total' => $tickets->count(),
                'pending' => $active->count(),
                'resolved' => $resolved->count(),
                'escalated' => $tickets->where('status', 'Escalated')->count(),
                'resolution_rate' => $tickets->isNotEmpty() ? (int) round(($resolved->count() / $tickets->count()) * 100) : 0,
                'average_response' => $average($responseHours($tickets)),
                'satisfaction' => $average($allRatings),
                'ai_resolution_rate' => $faqSearches > 0 ? (int) round(($faqMatches / $faqSearches) * 100) : 0,
                'faqs_pending' => Faq::query()->where('status', 'suggested')->count(),
                'faqs_published' => Faq::query()->where('status', 'published')->count(),
            ],
            'categories' => $categories,
            'departments' => $departments,
            'trend' => $trend,
            'staff_performance' => $staffPerformance,
            'critical' => $critical,
            'recent' => $recent,
            'now' => ApiResponse::appNowMs(),
            'time_offset_hours' => ApiResponse::timeOffsetHours(),
        ];
    }
}
