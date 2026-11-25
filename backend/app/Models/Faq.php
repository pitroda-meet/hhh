<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Faq extends Model
{
    protected $fillable = [
        'category_id',
        'status',
        'suggested_by',
        'approved_by',
        'source_ticket_id',
        'views',
        'helpful',
    ];

    protected function casts(): array
    {
        return [
            'category_id' => 'integer',
            'views' => 'integer',
            'helpful' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(QueryCategory::class, 'category_id');
    }

    public function suggestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'suggested_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function translations(): HasMany
    {
        return $this->hasMany(FaqTranslation::class);
    }

    public function feedbackItems(): HasMany
    {
        return $this->hasMany(FaqFeedback::class);
    }
}
