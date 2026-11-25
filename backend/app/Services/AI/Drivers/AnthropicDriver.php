<?php

namespace App\Services\AI\Drivers;

use App\Services\AI\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class AnthropicDriver implements AiProviderInterface
{
    public function __construct(
        private readonly string $apiKey,
        private readonly string $model,
        private readonly string $baseUrl,
        private readonly float $temperature = 0.2,
        private readonly int $timeout = 15,
    ) {}

    public function name(): string
    {
        return 'anthropic';
    }

    public function model(): string
    {
        return $this->model;
    }

    public function generateGroundedAnswer(string $question, string $approvedAnswer, string $language): string
    {
        if ($this->apiKey === '') {
            throw new RuntimeException('AI_API_KEY is not configured for Anthropic.');
        }

        $languageLabel = match ($language) {
            'gu' => 'Gujarati',
            'hi' => 'Hindi',
            default => 'English',
        };

        $url = rtrim($this->baseUrl, '/').'/messages';

        $response = Http::timeout($this->timeout)
            ->withHeaders([
                'Content-Type' => 'application/json',
                'x-api-key' => $this->apiKey,
                'anthropic-version' => '2023-06-01',
            ])
            ->post($url, [
                'model' => $this->model,
                'max_tokens' => 700,
                'temperature' => $this->temperature,
                'system' => "You are Sahay, an ITI student support assistant. Reply in {$languageLabel}. Rephrase only the provided approved FAQ answer. Preserve all facts, URLs, steps, and uncertainty. Never invent dates, fees, contacts, or eligibility rules. Return plain text.",
                'messages' => [
                    [
                        'role' => 'user',
                        'content' => json_encode([
                            'student_question' => $question,
                            'approved_faq_answer' => $approvedAnswer,
                        ], JSON_UNESCAPED_UNICODE),
                    ],
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException("Anthropic API error ({$response->status()}): ".$response->body());
        }

        $text = trim((string) $response->json('content.0.text', ''));

        if ($text === '') {
            throw new RuntimeException('Anthropic returned an empty response.');
        }

        return $text;
    }
}
