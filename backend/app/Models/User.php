<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'role_id',
        'name',
        'email',
        'password',
        'phone',
        'institute',
        'trade',
        'year',
        'enrollment_number',
        'designation',
        'language',
        'active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'active' => 'boolean',
        ];
    }

    public function roleRelation(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function departments(): BelongsToMany
    {
        return $this->belongsToMany(Department::class, 'user_departments');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'student_id');
    }

    public function assignedTickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'assigned_to');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function getRoleNameAttribute(): string
    {
        return $this->roleRelation?->name ?? 'student';
    }

    /**
     * Serialize user matching the exact frontend contract (no password).
     *
     * @return array<string, mixed>
     */
    public function toPublicArray(): array
    {
        $this->loadMissing(['roleRelation', 'departments']);

        return [
            'id' => $this->id,
            'role_id' => $this->role_id,
            'role' => $this->role_name,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone ?? '',
            'institute' => $this->institute ?? 'Government ITI, Junagadh',
            'trade' => $this->trade ?? '',
            'year' => $this->year ?? '',
            'enrollment_number' => $this->enrollment_number ?? '',
            'designation' => $this->designation,
            'language' => $this->language ?? 'en',
            'active' => (bool) $this->active,
            'department_ids' => $this->departments->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
