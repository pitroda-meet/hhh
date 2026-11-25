<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'sla_hours',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'sla_hours' => 'integer',
            'active' => 'boolean',
        ];
    }

    public function categories(): HasMany
    {
        return $this->hasMany(QueryCategory::class, 'department_id');
    }

    public function staff(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_departments');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }
}
