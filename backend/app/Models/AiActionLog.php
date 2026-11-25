<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiActionLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'session_id',
        'student_id',
        'provider',
        'model',
        'tool',
        'input',
        'result',
        'status',
        'language',
        'duration_ms',
        'knowledge_policy',
        'intent',
        'confidence',
        'faq_id',
        'error_message',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'input' => 'array',
            'duration_ms' => 'integer',
            'confidence' => 'float',
            'created_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ChatSession::class, 'session_id');
    }

    public function faq(): BelongsTo
    {
        return $this->belongsTo(Faq::class);
    }
}
