<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FaqFeedback extends Model
{
    protected $table = 'faq_feedback';

    protected $fillable = [
        'faq_id',
        'user_id',
        'value',
    ];

    public function faq(): BelongsTo
    {
        return $this->belongsTo(Faq::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
