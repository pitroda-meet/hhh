<?php

namespace Tests\Unit;

use App\Services\AI\AiGatewayManager;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiGatewayUnitTest extends TestCase
{
    public function test_supports_gemini_openai_anthropic_groq_openrouter_ollama_and_mock_drivers(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => 'Gemini grounded reply']]]]],
            ], 200),
            'api.openai.com/*' => Http::response([
                'choices' => [['message' => ['content' => 'OpenAI grounded reply']]],
            ], 200),
            'api.groq.com/*' => Http::response([
                'choices' => [['message' => ['content' => 'Groq grounded reply']]],
            ], 200),
            'openrouter.ai/*' => Http::response([
                'choices' => [['message' => ['content' => 'OpenRouter grounded reply']]],
            ], 200),
            'api.anthropic.com/*' => Http::response([
                'content' => [['text' => 'Anthropic grounded reply']],
            ], 200),
            'localhost:11434/*' => Http::response([
                'message' => ['content' => 'Ollama grounded reply'],
            ], 200),
        ]);

        config()->set('ai.api_key', 'test-secret-key');
        config()->set('ai.fallback_to_mock', true);

        $gateway = app(AiGatewayManager::class);

        $this->assertSame('Gemini grounded reply', $gateway->generateGroundedAnswer('Q', 'Approved', 'en', 'gemini')['text']);
        $this->assertSame('OpenAI grounded reply', $gateway->generateGroundedAnswer('Q', 'Approved', 'en', 'openai')['text']);
        $this->assertSame('Groq grounded reply', $gateway->generateGroundedAnswer('Q', 'Approved', 'en', 'groq')['text']);
        $this->assertSame('OpenRouter grounded reply', $gateway->generateGroundedAnswer('Q', 'Approved', 'en', 'openrouter')['text']);
        $this->assertSame('Anthropic grounded reply', $gateway->generateGroundedAnswer('Q', 'Approved', 'en', 'anthropic')['text']);
        $this->assertSame('Ollama grounded reply', $gateway->generateGroundedAnswer('Q', 'Approved', 'en', 'ollama')['text']);
        $this->assertSame('Approved', $gateway->generateGroundedAnswer('Q', 'Approved', 'en', 'mock')['text']);
    }

    public function test_falls_back_to_mock_when_external_provider_fails_or_key_missing(): void
    {
        Http::fake([
            'api.openai.com/*' => Http::response(['error' => 'Quota exceeded'], 429),
        ]);

        config()->set('ai.api_key', 'test-key');
        config()->set('ai.fallback_to_mock', true);

        $gateway = app(AiGatewayManager::class);
        $res = $gateway->generateGroundedAnswer('Q', 'Approved FAQ answer', 'en', 'openai');

        $this->assertSame('mock', $res['provider']);
        $this->assertTrue($res['fallback']);
        $this->assertSame('Approved FAQ answer', $res['text']);
        $this->assertNotNull($res['error']);

        config()->set('ai.api_key', '');
        $noKeyRes = $gateway->generateGroundedAnswer('Q', 'Approved FAQ answer', 'en', 'gemini');
        $this->assertSame('mock', $noKeyRes['provider']);
        $this->assertTrue($noKeyRes['fallback']);
    }
}
