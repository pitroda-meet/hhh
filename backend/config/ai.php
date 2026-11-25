<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Active AI Provider
    |--------------------------------------------------------------------------
    | Supported: "gemini", "openai", "anthropic", "groq", "openrouter", "ollama", "mock"
    */
    'provider' => env('AI_PROVIDER', 'mock'),

    'api_key' => env('AI_API_KEY', ''),

    'model' => env('AI_MODEL', ''),

    'base_url' => env('AI_BASE_URL', ''),

    'temperature' => (float) env('AI_TEMPERATURE', 0.2),

    'timeout' => (int) env('AI_TIMEOUT', 15),

    'fallback_to_mock' => filter_var(env('AI_FALLBACK_TO_MOCK', true), FILTER_VALIDATE_BOOL),

    'providers' => [
        'gemini' => [
            'label' => 'Google Gemini',
            'default_model' => 'gemini-2.0-flash',
            'base_url' => 'https://generativelanguage.googleapis.com/v1beta',
        ],
        'openai' => [
            'label' => 'OpenAI',
            'default_model' => 'gpt-4o-mini',
            'base_url' => 'https://api.openai.com/v1',
        ],
        'anthropic' => [
            'label' => 'Anthropic Claude',
            'default_model' => 'claude-3-5-haiku-latest',
            'base_url' => 'https://api.anthropic.com/v1',
        ],
        'groq' => [
            'label' => 'Groq (OpenAI-Compatible)',
            'default_model' => 'llama-3.3-70b-versatile',
            'base_url' => 'https://api.groq.com/openai/v1',
        ],
        'openrouter' => [
            'label' => 'OpenRouter',
            'default_model' => 'google/gemini-2.0-flash-001',
            'base_url' => 'https://openrouter.ai/api/v1',
        ],
        'ollama' => [
            'label' => 'Ollama (Local LLM)',
            'default_model' => 'llama3.2',
            'base_url' => 'http://localhost:11434',
        ],
        'mock' => [
            'label' => 'Built-in Multilingual FAQ Engine',
            'default_model' => 'sahay-faq-v1',
            'base_url' => '',
        ],
    ],
];
