<?php

namespace Tests\Feature;

use App\Models\AiActionLog;
use App\Models\Ticket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiAgentChatFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_mode_a_gujarati_faq_hit_with_tool_trace_and_feedback(): void
    {
        $this->seed();
        $studentToken = $this->postJson('/api/auth/demo-login', ['role' => 'student'])->json('data.token');

        $session = $this->withToken($studentToken)->postJson('/api/v1/agent/sessions', [
            'language' => 'gu',
        ])->assertStatus(201)->json('data');

        $chat = $this->withToken($studentToken)->postJson('/api/v1/agent/chat', [
            'session_id' => $session['id'],
            'message' => 'શિષ્યવૃત્તિ માટે કેવી રીતે અરજી કરવી?',
        ])->assertStatus(200)->json('data');

        $assistant = $chat['assistant_message'];
        $this->assertSame('faq', $assistant['type']);
        $this->assertSame('gu', $assistant['language']);
        $this->assertStringContainsString('digitalgujarat.gov.in', $assistant['content']);
        $this->assertSame('search_faq', $assistant['actions'][0]['tool']);
        $this->assertSame(25, Ticket::query()->count());

        $this->assertDatabaseHas('ai_action_logs', [
            'session_id' => $session['id'],
            'tool' => 'search_faq',
            'status' => 'success',
            'language' => 'gu',
        ]);

        $this->withToken($studentToken)->postJson("/api/v1/agent/messages/{$assistant['id']}/feedback", [
            'feedback' => 'up',
        ])->assertStatus(200);
    }

    public function test_mode_b_hindi_followup_consent_idempotent_ticket_creation_and_tracking(): void
    {
        $this->seed();
        $studentToken = $this->postJson('/api/auth/demo-login', ['role' => 'student'])->json('data.token');

        $session = $this->withToken($studentToken)->postJson('/api/v1/agent/sessions', ['language' => 'hi'])->json('data');

        $initial = $this->withToken($studentToken)->postJson('/api/v1/agent/chat', [
            'session_id' => $session['id'],
            'message' => 'मेरे परीक्षा पंजीकरण में त्रुटि आ रही है',
        ])->assertStatus(200)->json('data');

        $this->assertSame('confirmation', $initial['assistant_message']['type']);
        $this->assertSame(25, Ticket::query()->count());

        $followup = $this->withToken($studentToken)->postJson('/api/v1/agent/chat', [
            'session_id' => $session['id'],
            'message' => 'मेरा प्रशिक्षु नंबर GTI-2026-0142 है और Duplicate record दिखाई देता है।',
        ])->assertStatus(200)->json('data');

        $this->assertSame(2, $followup['session']['context']['pending_ticket']['category_id']);

        // Old confirmation card is expired
        $this->withToken($studentToken)->postJson("/api/v1/agent/sessions/{$session['id']}/confirm-ticket", [
            'message_id' => $initial['assistant_message']['id'],
            'confirmed' => true,
        ])->assertStatus(422);

        $confirmed = $this->withToken($studentToken)->postJson("/api/v1/agent/sessions/{$session['id']}/confirm-ticket", [
            'message_id' => $followup['assistant_message']['id'],
            'confirmed' => true,
        ])->assertStatus(200)->json('data');

        $this->assertSame('ITI-2026-00125', $confirmed['ticket']['ticket_number']);
        $this->assertSame(26, Ticket::query()->count());

        // Repeated confirmation is idempotent
        $this->withToken($studentToken)->postJson("/api/v1/agent/sessions/{$session['id']}/confirm-ticket", [
            'message_id' => $followup['assistant_message']['id'],
            'confirmed' => true,
        ])->assertStatus(200);
        $this->assertSame(26, Ticket::query()->count());

        // Ticket tracking in chat
        $track = $this->withToken($studentToken)->postJson('/api/v1/agent/chat', [
            'session_id' => $session['id'],
            'message' => 'status of ITI-2026-00125',
        ])->assertStatus(200)->json('data');

        $this->assertSame('ticket', $track['assistant_message']['type']);
        $this->assertSame('get_ticket_status', $track['assistant_message']['actions'][0]['tool']);
    }

    public function test_external_ai_provider_integration_via_http_fake_and_human_support_handoff(): void
    {
        $this->seed();
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => 'Live Gemini grounded scholarship answer with digitalgujarat.gov.in']]]]],
            ], 200),
        ]);
        config()->set('ai.provider', 'gemini');
        config()->set('ai.api_key', 'fake-gemini-key');
        config()->set('ai.model', 'gemini-2.0-flash');

        $studentToken = $this->postJson('/api/auth/demo-login', ['role' => 'student'])->json('data.token');
        $session = $this->withToken($studentToken)->postJson('/api/v1/agent/sessions', ['language' => 'en'])->json('data');

        $faqHit = $this->withToken($studentToken)->postJson('/api/v1/agent/chat', [
            'session_id' => $session['id'],
            'message' => 'How do I apply for an ITI scholarship?',
        ])->assertStatus(200)->json('data');

        $this->assertSame('gemini', $faqHit['assistant_message']['provider']);
        $this->assertStringContainsString('Live Gemini grounded', $faqHit['assistant_message']['content']);
        $this->assertGreaterThan(0, AiActionLog::query()->where('tool', 'generate_response')->where('provider', 'gemini')->count());

        $human = $this->withToken($studentToken)->postJson('/api/v1/agent/chat', [
            'session_id' => $session['id'],
            'message' => 'Talk to a human',
            'action' => 'request_human_support',
        ])->assertStatus(200)->json('data');

        $this->assertSame('confirmation', $human['assistant_message']['type']);
        $this->assertSame('request_human_support', $human['assistant_message']['actions'][0]['tool']);
    }
}
