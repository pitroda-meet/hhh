<?php

namespace App\Support;

use App\Models\AppSetting;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Schema;

class ApiResponse
{
    public static function success(mixed $data, string $message = 'Success', array $meta = [], int $status = 200): JsonResponse
    {
        return response()->json([
            'data' => $data,
            'message' => $message,
            'meta' => $meta,
        ], $status);
    }

    public static function error(string $message, int $status = 422, array $errors = []): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'errors' => $errors,
        ], $status);
    }

    public static function timeOffsetHours(): int
    {
        if (! Schema::hasTable('app_settings')) {
            return 0;
        }

        return (int) (AppSetting::getValue('time_offset_hours', 0) ?? 0);
    }

    public static function appNow(): CarbonImmutable
    {
        return CarbonImmutable::now('UTC')->addHours(self::timeOffsetHours());
    }

    public static function appNowMs(): int
    {
        return (int) (self::appNow()->getTimestampMs());
    }
}
