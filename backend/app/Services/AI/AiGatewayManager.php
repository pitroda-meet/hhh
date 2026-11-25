<?php

namespace App\Services\AI;

use App\Services\AI\Contracts\AiProviderInterface;
use App\Services\AI\Drivers\AnthropicDriver;
use App\Services\AI\Drivers\GeminiDriver;
use App\Services\AI\Drivers\MockDriver;
use App\Services\AI\Drivers\OllamaDriver;
use App\Services\AI\Drivers\OpenAiCompatibleDriver;
use InvalidArgumentException;
use Throwable;

class AiGatewayManager
{
    public function driver(?string $provider = null): AiProviderInterface
    {
        $name = strtolower(trim($provider ?: (string) config('ai.provider', 'mock')));
        $providers = config('ai.providers', []);
        $meta = $providers[$name] ?? null;

        if (! $meta) {
            throw new InvalidArgumentException("Unsupported AI provider [{$name}].");
        }

        $apiKey = (string) config('ai.api_key', '');
        $model = trim((string) config('ai.model', '')) ?: $meta['default_model'];
        $baseUrl = trim((string) config('ai.base_url', '')) ?: $meta['base_url'];
        $temperature = (float) config('ai.temperature', 0.2);
        $timeout = (int) config('ai.timeout', 15);

        return match ($name) {
            'gemini' => new GeminiDriver($apiKey, $model, $baseUrl, $temperature, $timeout),
            'openai', 'groq', 'openrouter' => new OpenAiCompatibleDriver($name, $apiKey, $model, $baseUrl, $temperature, $timeout),
            'anthropic' => new AnthropicDriver($apiKey, $model, $baseUrl, $temperature, $timeout),
            'ollama' => new OllamaDriver($model, $baseUrl, $temperature, $timeout),
            'mock' => new MockDriver($model),
            default => throw new InvalidArgumentException("Unsupported AI provider [{$name}]."),
        };
    }

    /**
     * Generate a grounded response using the configured AI provider with safe fallback to mock.
     *
     * @return array{text: string, provider: string, model: string, fallback: bool, error: ?string}
     */
    public function generateGroundedAnswer(string $question, string $approvedAnswer, string $language, ?string $providerOverride = null): array
    {
        $driver = $this->driver($providerOverride);

        if ($driver->name() === 'mock') {
            return [
                'text' => $driver->generateGroundedAnswer($question, $approvedAnswer, $language),
                'provider' => 'mock',
                'model' => $driver->model(),
                'fallback' => false,
                'error' => null,
            ];
        }

        $requiresKey = in_array($driver->name(), ['gemini', 'openai', 'anthropic', 'groq', 'openrouter'], true);
        if ($requiresKey && trim((string) config('ai.api_key', '')) === '') {
            if (config('ai.fallback_to_mock', true)) {
                return [
                    'text' => trim($approvedAnswer),
                    'provider' => 'mock',
                    'model' => 'sahay-faq-v1',
                    'fallback' => true,
                    'error' => null,
                ];
            }
        }

        try {
            $text = $driver->generateGroundedAnswer($question, $approvedAnswer, $language);

            return [
                'text' => $text,
                'provider' => $driver->name(),
                'model' => $driver->model(),
                'fallback' => false,
                'error' => null,
            ];
        } catch (Throwable $exception) {
            if (! config('ai.fallback_to_mock', true)) {
                throw $exception;
            }

            return [
                'text' => trim($approvedAnswer),
                'provider' => 'mock',
                'model' => 'sahay-faq-v1',
                'fallback' => true,
                'error' => $exception->getMessage(),
            ];
        }
    }

    /**
     * Public configuration status for Admin AI Monitoring (never exposes API keys).
     *
     * @return array<string, mixed>
     */
    public function status(): array
    {
        $activeProvider = strtolower((string) config('ai.provider', 'mock'));
        $meta = config("ai.providers.{$activeProvider}", config('ai.providers.mock'));
        $configuredKey = trim((string) config('ai.api_key', '')) !== '';
        $model = trim((string) config('ai.model', '')) ?: ($meta['default_model'] ?? 'sahay-faq-v1');

        return [
            'provider' => $activeProvider,
            'provider_label' => $meta['label'] ?? ucfirst($activeProvider),
            'model' => $model,
            'api_key_configured' => $configuredKey,
            'fallback_to_mock' => (bool) config('ai.fallback_to_mock', true),
            'available_providers' => collect(config('ai.providers', []))->map(fn ($item, $key) => [
                'key' => $key,
                'label' => $item['label'],
                'default_model' => $item['default_model'],
            ])->values()->all(),
        ];
    }
}
