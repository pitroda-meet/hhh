<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrincipalAnalyticsFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_principal_reports_recharts_aggregations_and_critical_ticket_reassignment(): void
    {
        $this->seed();
        $principalToken = $this->postJson('/api/auth/demo-login', ['role' => 'principal'])->json('data.token');

        $report = $this->withToken($principalToken)->getJson('/api/principal/reports')
            ->assertStatus(200)
            ->json('data');

        $this->assertSame(25, $report['summary']['total']);
        $this->assertCount(30, $report['trend']);
        $this->assertCount(6, $report['departments']);
        $this->assertSame(25, collect($report['departments'])->sum('total'));
        $this->assertNotEmpty($report['categories']);
        $this->assertNotEmpty($report['staff_performance']);
        $this->assertNotEmpty($report['critical']);

        // Principal can reassign a critical ticket (#112 is Critical Examination ticket)
        $this->withToken($principalToken)->postJson('/api/principal/queries/112/forward', [
            'department_id' => 4,
            'note' => 'Escalated oversight review by Principal.',
        ])->assertStatus(200)
            ->assertJsonPath('data.department_id', 4);
    }
}
