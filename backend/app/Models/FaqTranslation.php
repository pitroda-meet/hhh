<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FaqTranslation extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'faq_id',
        'language',
        'question',
        'answer',
        'keywords',
    ];

    public function faq(): BelongsTo
    {
        return $this->belongsTo(Faq::class);
    }
}
