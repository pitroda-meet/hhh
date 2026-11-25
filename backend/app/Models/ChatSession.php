<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatSession extends Model
{
    protected $fillable = [
        'student_id',
        'title',
        'language',
        'context',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'session_id')->orderBy('created_at')->orderBy('id');
    }
}
