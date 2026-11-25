<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FaqAndSuggestionFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_multilingual_faq_search_staff_suggestion_and_admin_three_language_publish_gate(): void
    {
        $this->seed();

        $studentToken = $this->postJson('/api/auth/demo-login', ['role' => 'student'])->json('data.token');
        $staffToken = $this->postJson('/api/auth/demo-login', ['role' => 'staff'])->json('data.token');
        $adminToken = $this->postJson('/api/auth/demo-login', ['role' => 'admin'])->json('data.token');

        // Student sees only 30 published FAQs (even if manage=true is passed!)
        $studentFaqs = $this->withToken($studentToken)->getJson('/api/faqs?manage=true')->assertStatus(200)->json('data');
        $this->assertCount(30, $studentFaqs);

        // Gujarati search works
        $guSearch = $this->withToken($studentToken)->getJson('/api/faqs?search='.urlencode('શિષ્યવૃત્તિ'))->assertStatus(200)->json('data');
        $this->assertNotEmpty($guSearch);

        // Staff suggests an FAQ from ticket #103 (Examination)
        $suggested = $this->withToken($staffToken)->postJson('/api/staff/queries/103/suggest-faq', [
            'question' => 'How can I verify my examination registration record?',
            'answer' => 'Ask the Examination Cell to verify your trainee record and share the acknowledgement.',
        ])->assertStatus(201)->json('data');

        $this->assertSame('suggested', $suggested['status']);

        // Publishing without HI and GU translations fails
        $this->withToken($adminToken)->putJson("/api/admin/faqs/{$suggested['id']}", [
            ...$suggested,
            'status' => 'published',
        ])->assertStatus(422);

        // Admin completes HI & GU translations and publishes
        $suggested['translations']['hi'] = [
            'question' => 'मैं अपना परीक्षा पंजीकरण रिकॉर्ड कैसे सत्यापित करूँ?',
            'answer' => 'परीक्षा विभाग से अपना प्रशिक्षु रिकॉर्ड सत्यापित करने को कहें।',
            'keywords' => 'परीक्षा पंजीकरण सत्यापन',
        ];
        $suggested['translations']['gu'] = [
            'question' => 'હું મારો પરીક્ષા નોંધણી રેકોર્ડ કેવી રીતે ચકાસું?',
            'answer' => 'પરીક્ષા વિભાગને તમારો તાલીમાર્થી રેકોર્ડ ચકાસવા કહો.',
            'keywords' => 'પરીક્ષા નોંધણી ચકાસણી',
        ];

        $this->withToken($adminToken)->putJson("/api/admin/faqs/{$suggested['id']}", [
            ...$suggested,
            'status' => 'published',
        ])->assertStatus(200)->assertJsonPath('data.status', 'published');

        $this->assertCount(31, $this->withToken($studentToken)->getJson('/api/faqs')->json('data'));
    }
}
