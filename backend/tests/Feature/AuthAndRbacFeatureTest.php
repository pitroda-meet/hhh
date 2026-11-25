<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthAndRbacFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_register_me_logout_and_demo_login_with_sanctum_tokens(): void
    {
        $this->seed();

        $this->getJson('/api/student/queries')->assertStatus(401);

        $this->postJson('/api/auth/login', [
            'email' => 'student@iti.demo',
            'password' => 'wrong-password',
        ])->assertStatus(401);

        $loginRes = $this->postJson('/api/auth/login', [
            'email' => 'student@iti.demo',
            'password' => 'Demo@2026',
        ])->assertStatus(200);

        $token = $loginRes->json('data.token');
        $this->assertNotEmpty($token);
        $this->assertSame('student', $loginRes->json('data.user.role'));
        $this->assertArrayNotHasKey('password', $loginRes->json('data.user'));

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertStatus(200)
            ->assertJsonPath('data.email', 'student@iti.demo');

        $this->withToken($token)->postJson('/api/auth/logout')
            ->assertStatus(200)
            ->assertJsonPath('data.logged_out', true);

        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/auth/me')->assertStatus(401);

        $regRes = $this->postJson('/api/auth/register', [
            'name' => 'Hetvi Joshi',
            'email' => 'hetvi@demo.test',
            'password' => 'Welcome@2026',
            'trade' => 'Fitter',
        ])->assertStatus(201);

        $this->assertSame('student', $regRes->json('data.user.role'));
        $this->assertNotEmpty($regRes->json('data.token'));

        $this->postJson('/api/auth/register', [
            'name' => 'Hetvi Joshi',
            'email' => 'hetvi@demo.test',
            'password' => 'Welcome@2026',
        ])->assertStatus(422);

        $demoRes = $this->postJson('/api/auth/demo-login', ['role' => 'principal'])
            ->assertStatus(200);
        $this->assertSame('principal', $demoRes->json('data.user.role'));
    }

    public function test_inactive_user_is_blocked_and_strict_rbac_isolation_across_all_roles(): void
    {
        $this->seed();

        $inactiveStudent = User::query()->findOrFail(4);
        $inactiveStudent->update(['active' => false]);

        $this->postJson('/api/auth/login', [
            'email' => $inactiveStudent->email,
            'password' => 'Demo@2026',
        ])->assertStatus(403);

        $studentToken = $this->postJson('/api/auth/demo-login', ['role' => 'student'])->json('data.token');
        $staffToken = $this->postJson('/api/auth/demo-login', ['role' => 'staff'])->json('data.token');
        $adminToken = $this->postJson('/api/auth/demo-login', ['role' => 'admin'])->json('data.token');
        $principalToken = $this->postJson('/api/auth/demo-login', ['role' => 'principal'])->json('data.token');

        // Student isolation: cannot read other student's ticket (#112 belongs to student 2) or access staff/admin/principal endpoints
        $this->withToken($studentToken)->getJson('/api/student/queries/112')->assertStatus(403);
        $this->withToken($studentToken)->getJson('/api/staff/queries')->assertStatus(403);
        $this->withToken($studentToken)->getJson('/api/admin/users')->assertStatus(403);
        $this->withToken($studentToken)->getJson('/api/principal/reports')->assertStatus(403);

        // Staff isolation: Mehul Joshi (user 5) covers dept 2 & 4, cannot access dept 1/3/5/6 ticket (#100 is dept 3) or admin/principal endpoints
        $this->withToken($staffToken)->getJson('/api/staff/queries/100')->assertStatus(403);
        $this->withToken($staffToken)->getJson('/api/staff/queries/103')->assertStatus(200);
        $this->withToken($staffToken)->getJson('/api/admin/users')->assertStatus(403);
        $this->withToken($staffToken)->getJson('/api/principal/reports')->assertStatus(403);

        // Principal isolation: can read reports and tickets, cannot perform admin user CRUD
        $this->withToken($principalToken)->getJson('/api/principal/reports')->assertStatus(200);
        $this->withToken($principalToken)->getJson('/api/admin/users')->assertStatus(403);

        // Admin access: can read admin users & reports
        $this->withToken($adminToken)->getJson('/api/admin/users')->assertStatus(200);
        $this->withToken($adminToken)->getJson('/api/admin/reports')->assertStatus(200);
    }
}
