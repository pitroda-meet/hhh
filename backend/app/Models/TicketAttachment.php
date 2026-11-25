<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketAttachment extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'ticket_id',
        'reply_id',
        'uploaded_by',
        'original_name',
        'stored_path',
        'mime_type',
        'size',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }
}
