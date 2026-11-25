<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatMessage extends Model
{
    protected $fillable = [
        'session_id',
        'role',
        'content',
        'language',
        'type',
        'actions',
        'feedback',
        'faq_id',
        'ticket_id',
        'pending_ticket',
        'decision',
        'source_question',
        'confidence',
        'provider',
        'intent',
    ];

    protected function casts(): array
    {
        return [
            'actions' => 'array',
            'pending_ticket' => 'array',
            'confidence' => 'float',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ChatSession::class, 'session_id');
    }

    public function faq(): BelongsTo
    {
        return $this->belongsTo(Faq::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }
}
