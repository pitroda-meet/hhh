<?php

namespace App\Services\AI\Drivers;

use App\Services\AI\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenAiCompatibleDriver implements AiProviderInterface
{
    public function __construct(
        private readonly string $providerName,
        private readonly string $apiKey,
        private readonly string $model,
        private readonly string $baseUrl,
        private readonly float $temperature = 0.2,
        private readonly int $timeout = 15,
    ) {}

    public function name(): string
    {
        return $this->providerName;
    }

    public function model(): string
    {
        return $this->model;
    }

    public function generateGroundedAnswer(string $question, string $approvedAnswer, string $language): string
    {
        if ($this->apiKey === '') {
            throw new RuntimeException("AI_API_KEY is not configured for {$this->providerName}.");
        }

        $languageLabel = match ($language) {
            'gu' => 'Gujarati',
            'hi' => 'Hindi',
            default => 'English',
        };

        $url = rtrim($this->baseUrl, '/').'/chat/completions';

        $headers = [
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer '.$this->apiKey,
        ];

        if ($this->providerName === 'openrouter') {
            $headers['HTTP-Referer'] = config('app.url', 'http://localhost:8000');
            $headers['X-Title'] = 'Sahay Student Support';
        }

        $response = Http::timeout($this->timeout)
            ->withHeaders($headers)
            ->post($url, [
                'model' => $this->model,
                'temperature' => $this->temperature,
                'max_tokens' => 700,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => "You are Sahay, an ITI student support assistant. Reply in {$languageLabel}. Rephrase only the provided approved FAQ answer. Preserve all facts, URLs, steps, and uncertainty. Never invent dates, fees, contacts, or eligibility rules. Return plain text.",
                    ],
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
            throw new RuntimeException("{$this->providerName} API error ({$response->status()}): ".$response->body());
        }

        $text = trim((string) $response->json('choices.0.message.content', ''));

        if ($text === '') {
            throw new RuntimeException("{$this->providerName} returned an empty response.");
        }

        return $text;
    }
}
