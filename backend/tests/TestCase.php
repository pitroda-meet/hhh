<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function withToken(string $token, string $type = 'Bearer'): static
    {
        $this->app['auth']->forgetGuards();

        return parent::withToken($token, $type);
    }
}
