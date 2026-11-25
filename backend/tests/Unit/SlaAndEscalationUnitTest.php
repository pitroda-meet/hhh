<?php

namespace Tests\Unit;

use App\Models\Ticket;
use App\Services\EscalationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SlaAndEscalationUnitTest extends TestCase
{
    use RefreshDatabase;

    public function test_escalation_thresholds_escalate_overdue_active_tickets_and_preserve_resolved(): void
    {
        $this->seed();

        $resolvedBefore = Ticket::query()->whereIn('status', ['Resolved', 'Closed'])->pluck('id')->all();
        $service = app(EscalationService::class);

        $firstRun = $service->evaluate(24, 13);
        $this->assertGreaterThan(0, $firstRun['escalated_count']);
        $this->assertSame(24, $firstRun['time_offset_hours']);

        foreach ($resolvedBefore as $resolvedId) {
            $ticket = Ticket::query()->findOrFail($resolvedId);
            $this->assertContains($ticket->status, ['Resolved', 'Closed']);
        }

        $secondRun = $service->evaluate(24, 13);
        $this->assertSame(48, $secondRun['time_offset_hours']);
        $this->assertGreaterThan(0, Ticket::query()->where('escalation_level', 48)->count());
    }
}
