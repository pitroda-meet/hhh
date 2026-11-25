<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\Ticket;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class TicketNumberGenerator
{
    /**
     * Format a ticket number from year and sequence integer.
     */
    public static function format(int $sequence, ?int $year = null): string
    {
        $year ??= (int) gmdate('Y');

        return sprintf('ITI-%d-%05d', $year, $sequence);
    }

    /**
     * Allocate the next unique ITI-YYYY-NNNNN ticket number atomically.
     */
    public function next(?CarbonInterface $now = null): string
    {
        $year = ($now ?? now('UTC'))->year;

        return DB::transaction(function () use ($year) {
            $setting = AppSetting::query()
                ->where('key', 'next_ticket_number')
                ->lockForUpdate()
                ->first();

            $maxExisting = (int) (Ticket::query()
                ->selectRaw("MAX(CAST(SUBSTRING_INDEX(ticket_number, '-', -1) AS UNSIGNED)) as max_seq")
                ->value('max_seq') ?? 99);

            $current = $setting ? (int) $setting->value : max(125, $maxExisting + 1);
            $sequence = max($current, $maxExisting + 1);

            AppSetting::query()->updateOrCreate(
                ['key' => 'next_ticket_number'],
                ['value' => $sequence + 1]
            );

            return self::format($sequence, $year);
        });
    }
}
