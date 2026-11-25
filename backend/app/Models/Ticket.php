<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    public const STATUSES = [
        'Open',
        'Assigned',
        'In Progress',
        'Waiting for Student',
        'Escalated',
        'Resolved',
        'Closed',
    ];

    public const ACTIVE_STATUSES = [
        'Open',
        'Assigned',
        'In Progress',
        'Waiting for Student',
        'Escalated',
    ];

    public const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

    protected $fillable = [
        'ticket_number',
        'student_id',
        'category_id',
        'department_id',
        'assigned_to',
        'claimed_by',
        'claimed_at',
        'subject',
        'description',
        'priority',
        'status',
        'source',
        'routing_method',
        'attachments',
        'rating',
        'feedback',
        'idempotency_key',
        'escalation_level',
        'due_at',
        'first_response_at',
        'resolved_at',
        'closed_at',
        'reopened_at',
    ];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
            'rating' => 'integer',
            'escalation_level' => 'integer',
            'claimed_at' => 'datetime',
            'due_at' => 'datetime',
            'first_response_at' => 'datetime',
            'resolved_at' => 'datetime',
            'closed_at' => 'datetime',
            'reopened_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(QueryCategory::class, 'category_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function assignedStaff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(TicketReply::class)->orderBy('created_at');
    }

    public function internalNotes(): HasMany
    {
        return $this->hasMany(TicketInternalNote::class)->orderBy('created_at');
    }

    public function history(): HasMany
    {
        return $this->hasMany(TicketStatusHistory::class)->orderBy('created_at')->orderBy('id');
    }

    public function storedAttachments(): HasMany
    {
        return $this->hasMany(TicketAttachment::class);
    }
}
