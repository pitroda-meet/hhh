<?php

namespace App\Services\AI\Drivers;

use App\Services\AI\Contracts\AiProviderInterface;

class MockDriver implements AiProviderInterface
{
    public function __construct(
        private readonly string $model = 'sahay-faq-v1',
    ) {}

    public function name(): string
    {
        return 'mock';
    }

    public function model(): string
    {
        return $this->model;
    }

    public function generateGroundedAnswer(string $question, string $approvedAnswer, string $language): string
    {
        return trim($approvedAnswer);
    }
}
