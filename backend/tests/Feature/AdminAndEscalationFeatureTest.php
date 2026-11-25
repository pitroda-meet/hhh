<?php

namespace Tests\Feature;

use App\Models\Ticket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAndEscalationFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_crud_reference_protection_ai_logs_escalation_simulation_and_demo_reset(): void
    {
        $this->seed();
        $adminToken = $this->postJson('/api/auth/demo-login', ['role' => 'admin'])->json('data.token');

        // Create department and category
        $dept = $this->withToken($adminToken)->postJson('/api/admin/departments', [
            'name' => 'Placement',
            'code' => 'PLAC',
            'description' => 'Apprenticeship support',
            'sla_hours' => 24,
            'active' => true,
        ])->assertStatus(201)->json('data');

        $cat = $this->withToken($adminToken)->postJson('/api/admin/categories', [
            'name' => 'Industry placement',
            'department_id' => $dept['id'],
            'active' => true,
        ])->assertStatus(201)->json('data');

        // Deleting department while linked to category fails
        $this->withToken($adminToken)->deleteJson("/api/admin/departments/{$dept['id']}")->assertStatus(422);

        // Delete category then department succeeds
        $this->withToken($adminToken)->deleteJson("/api/admin/categories/{$cat['id']}")->assertStatus(200);
        $this->withToken($adminToken)->deleteJson("/api/admin/departments/{$dept['id']}")->assertStatus(200);

        // Cannot delete user linked to existing tickets
        $this->withToken($adminToken)->deleteJson('/api/admin/users/5')->assertStatus(422);

        // AI logs filter & AI status check (no API key exposed)
        $aiLogsRes = $this->withToken($adminToken)->getJson('/api/admin/ai-action-logs?tool=search_faq')
            ->assertStatus(200)
            ->assertJsonPath('data.ai_status.provider', 'mock');
        $this->assertArrayNotHasKey('api_key', $aiLogsRes->json('data.ai_status'));

        // Live escalation simulation
        $sim = $this->withToken($adminToken)->postJson('/api/admin/simulate-escalation', ['hours' => 24])
            ->assertStatus(200)
            ->json('data');
        $this->assertGreaterThan(0, $sim['escalated_count']);

        $adminNotes = $this->withToken($adminToken)->getJson('/api/notifications')->json('data.items');
        $this->assertNotEmpty($adminNotes);

        // Demo reset restores clean seeded state
        $this->postJson('/api/demo/reset')->assertStatus(200)->assertJsonPath('data.reset', true);
        $this->assertSame(25, Ticket::query()->count());
    }
}
