<?php

namespace Tests\Feature;

use App\Models\Ticket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TicketWorkflowFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_end_to_end_ticket_creation_unicode_attachment_routing_reply_forward_resolve_and_rating(): void
    {
        $this->seed();
        Storage::fake('local');

        $studentToken = $this->postJson('/api/auth/demo-login', ['role' => 'student'])->json('data.token');
        $staffToken = $this->postJson('/api/auth/demo-login', ['role' => 'staff'])->json('data.token');

        $file = UploadedFile::fake()->create('hall-ticket-error.pdf', 120, 'application/pdf');

        $createRes = $this->withToken($studentToken)->post('/api/student/queries', [
            'subject' => 'પરીક્ષા નોંધણીમાં ભૂલ · Examination error',
            'description' => 'મારો તાલીમાર્થી નંબર GTI-2026-0142 છે અને duplicate record दिखाई देता है।',
            'category_id' => 2,
            'priority' => 'High',
            'files' => [$file],
        ])->assertStatus(201);

        $ticketId = $createRes->json('data.id');
        $ticketNumber = $createRes->json('data.ticket_number');
        $attachmentId = $createRes->json('data.attachments.0.id');

        $this->assertSame('Assigned', $createRes->json('data.status'));
        $this->assertSame('Mehul Joshi', $createRes->json('data.assigned_staff.name'));
        $this->assertNotNull($attachmentId);

        // Verify Gujarati & Hindi Unicode persisted cleanly in MySQL
        $dbTicket = Ticket::query()->findOrFail($ticketId);
        $this->assertStringContainsString('પરીક્ષા નોંધણીમાં ભૂલ', $dbTicket->subject);
        $this->assertStringContainsString('दिखाई देता है', $dbTicket->description);

        // Authorized download succeeds for owning student, blocked for another student
        $this->withToken($studentToken)->get("/api/attachments/{$attachmentId}/download")->assertStatus(200);
        $otherStudentToken = $this->postJson('/api/auth/demo-login', ['email' => 'nidhi.shah@iti.demo'])->json('data.token');
        $this->withToken($otherStudentToken)->get("/api/attachments/{$attachmentId}/download")->assertStatus(403);

        // Resolving without a staff reply fails
        $this->withToken($staffToken)->patchJson("/api/staff/queries/{$ticketId}/status", [
            'status' => 'Resolved',
        ])->assertStatus(422);

        // Staff adds internal note (must NOT be visible to student)
        $this->withToken($staffToken)->postJson("/api/staff/queries/{$ticketId}/internal-notes", [
            'message' => 'Verified NCVT register; duplicate cleared.',
        ])->assertStatus(201);

        // Staff replies and resolves
        $this->withToken($staffToken)->postJson("/api/staff/queries/{$ticketId}/reply", [
            'message' => 'Your duplicate registration has been verified and corrected.',
        ])->assertStatus(201);

        $this->withToken($staffToken)->patchJson("/api/staff/queries/{$ticketId}/status", [
            'status' => 'Resolved',
        ])->assertStatus(200)->assertJsonPath('data.status', 'Resolved');

        // Student sees resolved notification, does NOT see internal_notes, and rates ticket
        $notes = $this->withToken($studentToken)->getJson('/api/notifications')->json('data.items');
        $resolvedNote = collect($notes)->first(fn ($n) => $n['ticket_id'] === $ticketId && $n['type'] === 'resolved');
        $this->assertNotNull($resolvedNote);

        $this->withToken($studentToken)->patchJson("/api/notifications/{$resolvedNote['id']}/read")->assertStatus(200);

        $this->withToken($studentToken)->postJson("/api/student/queries/{$ticketId}/feedback", [
            'rating' => 5,
            'feedback' => 'Clear and helpful support.',
        ])->assertStatus(200)->assertJsonPath('data.rating', 5);

        $studentDetail = $this->withToken($studentToken)->getJson("/api/student/queries/{$ticketNumber}")->assertStatus(200);
        $this->assertArrayNotHasKey('internal_notes', $studentDetail->json('data'));
        $this->assertSame(['Open', 'Assigned', 'In Progress', 'Resolved'], collect($studentDetail->json('data.history'))->pluck('status')->all());
    }

    public function test_forwarding_enforces_department_membership_and_updates_staff_access(): void
    {
        $this->seed();
        $studentToken = $this->postJson('/api/auth/demo-login', ['role' => 'student'])->json('data.token');
        $staffToken = $this->postJson('/api/auth/demo-login', ['role' => 'staff'])->json('data.token');

        $created = $this->withToken($studentToken)->postJson('/api/student/queries', [
            'subject' => 'Help with exam portal login',
            'description' => 'Please check my examination portal credentials.',
            'category_id' => 2,
        ])->assertStatus(201)->json('data');

        // Forwarding to dept 5 with staff 5 (who is NOT in dept 5) must fail
        $this->withToken($staffToken)->postJson("/api/staff/queries/{$created['id']}/forward", [
            'department_id' => 5,
            'staff_id' => 5,
            'note' => 'Wrong staff',
        ])->assertStatus(422);

        // Forwarding to dept 5 auto-routes to Hitesh Makwana (user 7) and removes old staff access
        $this->withToken($staffToken)->postJson("/api/staff/queries/{$created['id']}/forward", [
            'department_id' => 5,
            'note' => 'Requires IT Cell portal review.',
        ])->assertStatus(200)
            ->assertJsonPath('data.department_id', 5)
            ->assertJsonPath('data.assigned_to', 7);

        $this->withToken($staffToken)->getJson("/api/staff/queries/{$created['id']}")->assertStatus(403);
    }

    public function test_server_side_validation_rejects_invalid_ticket_and_attachment_payloads(): void
    {
        $this->seed();
        Storage::fake('local');

        $studentToken = $this->postJson('/api/auth/demo-login', ['role' => 'student'])->json('data.token');

        $this->withToken($studentToken)->postJson('/api/student/queries', [
            'subject' => 'Hi',
            'description' => 'Short',
            'category_id' => 2,
        ])->assertStatus(422)->assertJsonValidationErrors(['subject', 'description']);

        $badFile = UploadedFile::fake()->create('script.exe', 50, 'application/octet-stream');
        $this->withToken($studentToken)->post('/api/student/queries', [
            'subject' => 'Valid subject line',
            'description' => 'Valid description with more than ten characters.',
            'category_id' => 2,
            'files' => [$badFile],
        ])->assertStatus(422);
    }
}
