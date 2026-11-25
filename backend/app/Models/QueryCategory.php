<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QueryCategory extends Model
{
    protected $table = 'query_categories';

    protected $fillable = [
        'name',
        'description',
        'department_id',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'department_id' => 'integer',
            'active' => 'boolean',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'category_id');
    }

    public function faqs(): HasMany
    {
        return $this->hasMany(Faq::class, 'category_id');
    }
}
