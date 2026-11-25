<?php

namespace Tests\Unit;

use App\Services\TicketNumberGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketNumberGeneratorUnitTest extends TestCase
{
    use RefreshDatabase;

    public function test_formats_and_increments_unique_iti_ticket_numbers(): void
    {
        $this->seed();
        $generator = app(TicketNumberGenerator::class);

        $first = $generator->next();
        $second = $generator->next();

        $this->assertMatchesRegularExpression('/^ITI-\d{4}-00125$/', $first);
        $this->assertMatchesRegularExpression('/^ITI-\d{4}-00126$/', $second);
        $this->assertNotSame($first, $second);
    }
}
