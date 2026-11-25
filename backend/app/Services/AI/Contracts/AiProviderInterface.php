<?php

namespace App\Services\AI\Contracts;

interface AiProviderInterface
{
    public function name(): string;

    public function model(): string;

    /**
     * Rephrase or present an approved FAQ answer strictly grounded in provided facts.
     */
    public function generateGroundedAnswer(string $question, string $approvedAnswer, string $language): string;
}
