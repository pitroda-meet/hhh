<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EscalationRule extends Model
{
    protected $fillable = [
        'name',
        'threshold_hours',
        'target_role',
        'priority',
        'enabled',
    ];

    protected function casts(): array
    {
        return [
            'threshold_hours' => 'integer',
            'enabled' => 'boolean',
        ];
    }
}
