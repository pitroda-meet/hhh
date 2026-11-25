<?php

namespace App\Services\AI\Drivers;

use App\Services\AI\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiDriver implements AiProviderInterface
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
        return 'gemini';
    }

    public function model(): string
    {
        return $this->model;
    }

    public function generateGroundedAnswer(string $question, string $approvedAnswer, string $language): string
    {
        if ($this->apiKey === '') {
            throw new RuntimeException('AI_API_KEY is not configured for Gemini.');
        }

        $languageLabel = match ($language) {
            'gu' => 'Gujarati',
            'hi' => 'Hindi',
            default => 'English',
        };

        $url = rtrim($this->baseUrl, '/').'/models/'.rawurlencode($this->model).':generateContent';

        $response = Http::timeout($this->timeout)
            ->withHeaders([
                'Content-Type' => 'application/json',
                'x-goog-api-key' => $this->apiKey,
            ])
            ->post($url, [
                'systemInstruction' => [
                    'parts' => [[
                        'text' => "You are Sahay, an ITI student support assistant. Reply in {$languageLabel}. Rephrase only the provided approved FAQ answer. Preserve all facts, URLs, steps, and uncertainty. Never invent dates, fees, contacts, or eligibility rules. Return plain text.",
                    ]],
                ],
                'contents' => [[
                    'role' => 'user',
                    'parts' => [[
                        'text' => json_encode([
                            'student_question' => $question,
                            'approved_faq_answer' => $approvedAnswer,
                        ], JSON_UNESCAPED_UNICODE),
                    ]],
                ]],
                'generationConfig' => [
                    'temperature' => $this->temperature,
                    'maxOutputTokens' => 700,
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException("Gemini API error ({$response->status()}): ".$response->body());
        }

        $parts = $response->json('candidates.0.content.parts', []);
        $text = trim(collect($parts)->map(fn ($part) => (string) ($part['text'] ?? ''))->implode(''));

        if ($text === '') {
            throw new RuntimeException('Gemini returned an empty response.');
        }

        return $text;
    }
}
