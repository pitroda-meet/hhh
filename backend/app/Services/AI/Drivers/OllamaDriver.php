<?php

namespace App\Services\AI\Drivers;

use App\Services\AI\Contracts\AiProviderInterface;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OllamaDriver implements AiProviderInterface
{
    public function __construct(
        private readonly string $model,
        private readonly string $baseUrl,
        private readonly float $temperature = 0.2,
        private readonly int $timeout = 15,
    ) {}

    public function name(): string
    {
        return 'ollama';
    }

    public function model(): string
    {
        return $this->model;
    }

    public function generateGroundedAnswer(string $question, string $approvedAnswer, string $language): string
    {
        $languageLabel = match ($language) {
            'gu' => 'Gujarati',
            'hi' => 'Hindi',
            default => 'English',
        };

        $url = rtrim($this->baseUrl, '/').'/api/chat';

        $response = Http::timeout($this->timeout)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post($url, [
                'model' => $this->model,
                'stream' => false,
                'options' => [
                    'temperature' => $this->temperature,
                ],
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => "You are Sahay, an ITI student support assistant. Reply in {$languageLabel}. Rephrase only the provided approved FAQ answer. Preserve all facts, URLs, steps, and uncertainty. Return plain text.",
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
            throw new RuntimeException("Ollama API error ({$response->status()}): ".$response->body());
        }

        $text = trim((string) $response->json('message.content', ''));

        if ($text === '') {
            throw new RuntimeException('Ollama returned an empty response.');
        }

        return $text;
    }
}
