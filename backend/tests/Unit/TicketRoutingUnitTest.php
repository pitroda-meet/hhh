<?php

namespace Tests\Unit;

use App\Models\AppSetting;
use App\Models\Role;
use App\Models\User;
use App\Services\TicketRoutingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TicketRoutingUnitTest extends TestCase
{
    use RefreshDatabase;

    public function test_routes_category_to_department_and_least_workload_staff(): void
    {
        $this->seed();
        $routing = app(TicketRoutingService::class);

        $staffRoleId = Role::query()->where('name', 'staff')->firstOrFail()->id;
        $newStaff = User::query()->create([
            'role_id' => $staffRoleId,
            'name' => 'Ravi Vyas',
            'email' => 'ravi.unit@iti.demo',
            'password' => Hash::make('Demo@2026'),
            'active' => true,
        ]);
        $newStaff->departments()->sync([2]);

        $routed = $routing->routeCategory(2);

        $this->assertSame('Examination', $routed['department']->name);
        $this->assertSame($newStaff->id, $routed['staff']->id);
        $this->assertSame('least_open', $routed['strategy']);
    }

    public function test_round_robin_rotates_between_department_staff(): void
    {
        $this->seed();
        AppSetting::setValue('routing_strategy', 'round_robin');
        AppSetting::setValue('routing_cursors', []);

        $staffRoleId = Role::query()->where('name', 'staff')->firstOrFail()->id;
        $secondStaff = User::query()->create([
            'role_id' => $staffRoleId,
            'name' => 'Kiran Patel',
            'email' => 'kiran.unit@iti.demo',
            'password' => Hash::make('Demo@2026'),
            'active' => true,
        ]);
        $secondStaff->departments()->sync([2]);

        $routing = app(TicketRoutingService::class);
        $firstPick = $routing->findAssignee(2, null, 'round_robin');
        $secondPick = $routing->findAssignee(2, null, 'round_robin');
        $thirdPick = $routing->findAssignee(2, null, 'round_robin');

        $this->assertNotNull($firstPick);
        $this->assertNotNull($secondPick);
        $this->assertNotSame($firstPick->id, $secondPick->id);
        $this->assertSame($firstPick->id, $thirdPick->id);
    }
}
