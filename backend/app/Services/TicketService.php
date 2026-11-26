<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketInternalNote;
use App\Models\TicketReply;
use App\Models\TicketStatusHistory;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class TicketService
{
    public function __construct(
        private readonly TicketNumberGenerator $numberGenerator,
        private readonly TicketRoutingService $routingService,
    ) {}

    public function canAccessTicket(User $user, Ticket $ticket): bool
    {
        return match ($user->role_name) {
            'student' => (int) $ticket->student_id === (int) $user->id,
            'staff' => (int) $ticket->assigned_to === (int) $user->id
                || $user->departments()->where('departments.id', $ticket->department_id)->exists(),
            'admin', 'principal' => true,
            default => false,
        };
    }

    public function findAccessibleTicket(string|int $idOrNumber, User $user): Ticket
    {
        $query = Ticket::query()->with(['student.roleRelation', 'student.departments', 'assignedStaff.roleRelation', 'assignedStaff.departments', 'department', 'category']);

        $ticket = is_numeric($idOrNumber)
            ? $query->find((int) $idOrNumber)
            : $query->whereRaw('LOWER(ticket_number) = ?', [strtolower((string) $idOrNumber)])->first();

        if (! $ticket && ! is_numeric($idOrNumber)) {
            $ticket = null;
        }

        if (! $ticket) {
            throw new HttpException(404, 'This ticket was not found.');
        }

        if (! $this->canAccessTicket($user, $ticket)) {
            throw new HttpException(403, 'This ticket is not accessible to your account.');
        }

        return $ticket;
    }

    /**
     * @return array<string, mixed>
     */
    public function enrichTicket(Ticket $ticket): array
    {
        $ticket->loadMissing([
            'student.roleRelation',
            'student.departments',
            'assignedStaff.roleRelation',
            'assignedStaff.departments',
            'department',
            'category',
        ]);

        $replyCount = $ticket->replies_count ?? $ticket->replies()->count();

        return [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'student_id' => $ticket->student_id,
            'category_id' => $ticket->category_id,
            'department_id' => $ticket->department_id,
            'assigned_to' => $ticket->assigned_to,
            'claimed_by' => $ticket->claimed_by,
            'claimed_at' => $ticket->claimed_at?->toISOString(),
            'subject' => $ticket->subject,
            'description' => $ticket->description,
            'priority' => $ticket->priority,
            'status' => $ticket->status,
            'source' => $ticket->source,
            'routing_method' => $ticket->routing_method,
            'attachments' => $ticket->attachments ?? [],
            'rating' => $ticket->rating,
            'feedback' => $ticket->feedback ?? '',
            'idempotency_key' => $ticket->idempotency_key,
            'escalation_level' => (int) $ticket->escalation_level,
            'created_at' => $ticket->created_at?->toISOString(),
            'updated_at' => $ticket->updated_at?->toISOString(),
            'due_at' => $ticket->due_at?->toISOString(),
            'first_response_at' => $ticket->first_response_at?->toISOString(),
            'resolved_at' => $ticket->resolved_at?->toISOString(),
            'closed_at' => $ticket->closed_at?->toISOString(),
            'reopened_at' => $ticket->reopened_at?->toISOString(),
            'student' => $ticket->student?->toPublicArray(),
            'assigned_staff' => $ticket->assignedStaff?->toPublicArray(),
            'department' => $ticket->department?->toArray(),
            'category' => $ticket->category?->toArray(),
            'reply_count' => (int) $replyCount,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getTicketDetail(string|int $idOrNumber, User $actor): array
    {
        $ticket = $this->findAccessibleTicket($idOrNumber, $actor);
        $ticket->load([
            'replies.user.roleRelation',
            'replies.user.departments',
            'history.actor.roleRelation',
            'history.actor.departments',
        ]);

        $data = $this->enrichTicket($ticket);
        $data['replies'] = $ticket->replies->map(fn (TicketReply $reply) => [
            'id' => $reply->id,
            'ticket_id' => $reply->ticket_id,
            'user_id' => $reply->user_id,
            'message' => $reply->message,
            'attachments' => $reply->attachments ?? [],
            'created_at' => $reply->created_at?->toISOString(),
            'user' => $reply->user?->toPublicArray(),
        ])->values()->all();

        $data['history'] = $ticket->history->map(fn (TicketStatusHistory $event) => [
            'id' => $event->id,
            'ticket_id' => $event->ticket_id,
            'actor_id' => $event->actor_id,
            'previous_status' => $event->previous_status,
            'status' => $event->status,
            'note' => $event->note,
            'created_at' => $event->created_at?->toISOString(),
            'actor' => $event->actor?->toPublicArray(),
        ])->values()->all();

        if ($actor->role_name !== 'student') {
            $ticket->load('internalNotes.user.roleRelation', 'internalNotes.user.departments');
            $data['internal_notes'] = $ticket->internalNotes->map(fn (TicketInternalNote $note) => [
                'id' => $note->id,
                'ticket_id' => $note->ticket_id,
                'user_id' => $note->user_id,
                'message' => $note->message,
                'created_at' => $note->created_at?->toISOString(),
                'user' => $note->user?->toPublicArray(),
            ])->values()->all();
        }

        $data['now'] = ApiResponse::appNowMs();

        return $data;
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function listForUser(User $user, array $params = []): array
    {
        $query = Ticket::query()
            ->with(['student.roleRelation', 'student.departments', 'assignedStaff.roleRelation', 'assignedStaff.departments', 'department', 'category'])
            ->withCount('replies');

        if ($user->role_name === 'student') {
            $query->where('student_id', $user->id);
        } elseif ($user->role_name === 'staff') {
            $deptIds = $user->departments()->pluck('departments.id')->all();
            $query->where(function ($q) use ($user, $deptIds) {
                $q->where('assigned_to', $user->id);
                if ($deptIds !== []) {
                    $q->orWhereIn('department_id', $deptIds);
                }
            });
        }

        if (($params['assigned_to'] ?? null) === 'me') {
            $query->where('assigned_to', $user->id);
        } elseif (($params['assigned_to'] ?? null) === 'unassigned') {
            $query->whereNull('assigned_to');
        }

        if (! empty($params['critical_only']) && filter_var($params['critical_only'], FILTER_VALIDATE_BOOL)) {
            $query->whereIn('status', Ticket::ACTIVE_STATUSES)
                ->where(fn ($q) => $q->where('priority', 'Critical')->orWhere('status', 'Escalated'));
        }

        $status = $params['status'] ?? null;
        if ($status && $status !== 'All') {
            if ($status === 'Active') {
                $query->whereIn('status', Ticket::ACTIVE_STATUSES);
            } else {
                $query->where('status', $status);
            }
        }

        if (! empty($params['category_id'])) {
            $query->where('category_id', (int) $params['category_id']);
        }

        if (! empty($params['department_id'])) {
            $query->where('department_id', (int) $params['department_id']);
        }

        if (! empty($params['priority']) && $params['priority'] !== 'All') {
            $query->where('priority', $params['priority']);
        }

        if (! empty($params['search']) && trim((string) $params['search']) !== '') {
            $term = '%'.trim((string) $params['search']).'%';
            $query->where(function ($q) use ($term) {
                $q->where('ticket_number', 'like', $term)
                    ->orWhere('subject', 'like', $term)
                    ->orWhere('description', 'like', $term)
                    ->orWhereHas('student', fn ($sq) => $sq->where('name', 'like', $term));
            });
        }

        if (($params['sort'] ?? null) === 'priority') {
            $query->orderByRaw("CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END")
                ->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at')->orderByDesc('id');
        }

        $pageSize = min(100, max(1, (int) ($params['page_size'] ?? 10)));
        $paginator = $query->paginate($pageSize, ['*'], 'page', max(1, (int) ($params['page'] ?? 1)));

        return [
            'items' => collect($paginator->items())->map(fn (Ticket $t) => $this->enrichTicket($t))->values()->all(),
            'total' => $paginator->total(),
            'page' => $paginator->currentPage(),
            'page_size' => $paginator->perPage(),
            'last_page' => max(1, $paginator->lastPage()),
            'now' => ApiResponse::appNowMs(),
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<int, UploadedFile>  $uploadedFiles
     */
    public function createTicket(User $student, array $input, array $uploadedFiles = []): Ticket
    {
        $subject = trim((string) ($input['subject'] ?? ''));
        $description = trim((string) ($input['description'] ?? ''));
        $priority = (string) ($input['priority'] ?? 'Medium');
        $idempotencyKey = isset($input['idempotency_key']) && $input['idempotency_key'] !== ''
            ? (string) $input['idempotency_key']
            : null;

        if (mb_strlen($subject) < 5 || mb_strlen($subject) > 150) {
            throw ValidationException::withMessages(['subject' => ['Enter a subject between 5 and 150 characters.']]);
        }

        if (mb_strlen($description) < 10 || mb_strlen($description) > 5000) {
            throw ValidationException::withMessages(['description' => ['Please describe your query in 10–5,000 characters.']]);
        }

        if (! in_array($priority, Ticket::PRIORITIES, true)) {
            throw ValidationException::withMessages(['priority' => ['Choose a valid priority.']]);
        }

        return DB::transaction(function () use ($student, $input, $subject, $description, $priority, $idempotencyKey, $uploadedFiles) {
            if ($idempotencyKey !== null) {
                $existing = Ticket::query()
                    ->where('student_id', $student->id)
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();

                if ($existing) {
                    return $existing;
                }
            }

            $routed = $this->routingService->routeCategory((int) ($input['category_id'] ?? 0));
            $category = $routed['category'];
            $department = $routed['department'];
            $staff = $routed['staff'];
            $strategy = $routed['strategy'];

            $now = ApiResponse::appNow();
            $ticketNumber = $this->numberGenerator->next($now);
            $source = ($input['source'] ?? 'manual') === 'ai' ? 'ai' : 'manual';

            $metadataAttachments = collect($input['attachments'] ?? [])
                ->filter(fn ($item) => is_array($item) && ! empty($item['name']))
                ->take(5)
                ->map(fn ($item) => [
                    'name' => (string) $item['name'],
                    'size' => (int) ($item['size'] ?? 0),
                    'type' => (string) ($item['type'] ?? 'application/octet-stream'),
                    'mock' => (bool) ($item['mock'] ?? true),
                ])
                ->values()
                ->all();

            $ticket = Ticket::query()->create([
                'ticket_number' => $ticketNumber,
                'student_id' => $student->id,
                'category_id' => $category->id,
                'department_id' => $department->id,
                'assigned_to' => $staff?->id,
                'subject' => $subject,
                'description' => $description,
                'priority' => $priority,
                'source' => $source,
                'routing_method' => $strategy,
                'status' => 'Open',
                'attachments' => $metadataAttachments,
                'feedback' => '',
                'idempotency_key' => $idempotencyKey,
                'escalation_level' => 0,
                'due_at' => $now->addHours($department->sla_hours),
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            if ($uploadedFiles !== []) {
                $stored = $this->storeUploadedFiles($ticket, null, $student, $uploadedFiles);
                $ticket->attachments = array_slice(array_merge($metadataAttachments, $stored), 0, 5);
                $ticket->save();
            }

            TicketStatusHistory::query()->create([
                'ticket_id' => $ticket->id,
                'actor_id' => $student->id,
                'previous_status' => null,
                'status' => 'Open',
                'note' => $source === 'ai'
                    ? 'Created by the AI assistant after student confirmation.'
                    : 'Student submitted a support query.',
                'created_at' => $now,
            ]);

            if ($staff) {
                $strategyLabel = $strategy === 'round_robin' ? 'round-robin' : 'least active tickets';
                $this->routingService->addStatusHistory(
                    $ticket,
                    'Assigned',
                    null,
                    "Auto-routed: {$category->name} → {$department->name} → {$staff->name} ({$strategyLabel})."
                );
            }

            $recipients = $staff
                ? [$staff->id, $student->id]
                : array_merge(
                    [$student->id],
                    User::query()->where('active', true)->whereHas('roleRelation', fn ($q) => $q->where('name', 'admin'))->pluck('id')->all()
                );

            $this->routingService->notifyUsers($recipients, [
                'ticket_id' => $ticket->id,
                'type' => 'assigned',
                'title' => "{$ticket->ticket_number} ".($staff ? 'assigned' : 'created'),
                'message' => "{$subject} — ".($staff ? "{$staff->name}, {$department->name}" : "{$department->name}; awaiting staff assignment").'.',
            ]);

            return $ticket->fresh();
        });
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<int, UploadedFile>  $uploadedFiles
     * @return array<string, mixed>
     */
    public function replyToTicket(string|int $idOrNumber, User $actor, array $input, array $uploadedFiles = []): array
    {
        $message = trim((string) ($input['message'] ?? ''));
        $metaAttachments = $input['attachments'] ?? [];

        if ($message === '' && empty($metaAttachments) && $uploadedFiles === []) {
            throw ValidationException::withMessages(['message' => ['Write a reply or add an attachment.']]);
        }

        if (mb_strlen($message) > 5000) {
            throw ValidationException::withMessages(['message' => ['Keep your reply within 5,000 characters.']]);
        }

        return DB::transaction(function () use ($idOrNumber, $actor, $message, $metaAttachments, $uploadedFiles) {
            $ticket = $this->findAccessibleTicket($idOrNumber, $actor);

            if ($ticket->status === 'Closed') {
                throw ValidationException::withMessages(['status' => ['This ticket is closed. Please create a new query for further help.']]);
            }

            $now = ApiResponse::appNow();
            $attachments = collect($metaAttachments)
                ->filter(fn ($item) => is_array($item) && ! empty($item['name']))
                ->take(5)
                ->map(fn ($item) => [
                    'name' => (string) $item['name'],
                    'size' => (int) ($item['size'] ?? 0),
                    'type' => (string) ($item['type'] ?? 'application/octet-stream'),
                    'mock' => (bool) ($item['mock'] ?? true),
                ])
                ->values()
                ->all();

            $reply = TicketReply::query()->create([
                'ticket_id' => $ticket->id,
                'user_id' => $actor->id,
                'message' => $message !== '' ? $message : 'Attachment shared.',
                'attachments' => $attachments,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            if ($uploadedFiles !== []) {
                $stored = $this->storeUploadedFiles($ticket, $reply->id, $actor, $uploadedFiles);
                $reply->attachments = array_slice(array_merge($attachments, $stored), 0, 5);
                $reply->save();
            }

            $ticket->updated_at = $now;
            if ($actor->role_name !== 'student' && $ticket->first_response_at === null) {
                $ticket->first_response_at = $now;
            }
            $ticket->save();

            if (in_array($ticket->status, ['Open', 'Assigned', 'Waiting for Student', 'Resolved'], true)) {
                $note = $ticket->status === 'Resolved'
                    ? 'Reopened with a new reply.'
                    : 'A reply was added to the conversation.';
                $this->routingService->addStatusHistory($ticket, 'In Progress', $actor->id, $note);
            }

            $recipients = $actor->role_name === 'student'
                ? [$ticket->assigned_to]
                : [$ticket->student_id];

            $this->routingService->notifyUsers($recipients, [
                'ticket_id' => $ticket->id,
                'type' => 'reply',
                'title' => "New reply on {$ticket->ticket_number}",
                'message' => "{$actor->name}: ".mb_substr($reply->message, 0, 140),
            ]);

            $reply->load('user.roleRelation', 'user.departments');

            return [
                'id' => $reply->id,
                'ticket_id' => $reply->ticket_id,
                'user_id' => $reply->user_id,
                'message' => $reply->message,
                'attachments' => $reply->attachments ?? [],
                'created_at' => $reply->created_at?->toISOString(),
                'user' => $reply->user?->toPublicArray(),
            ];
        });
    }

    public function updateStatus(string|int $idOrNumber, User $actor, string $status, string $note = ''): Ticket
    {
        if (! in_array($status, Ticket::STATUSES, true)) {
            throw ValidationException::withMessages(['status' => ['Choose a valid ticket status.']]);
        }

        return DB::transaction(function () use ($idOrNumber, $actor, $status, $note) {
            $ticket = $this->findAccessibleTicket($idOrNumber, $actor);

            if ($ticket->status === $status) {
                return $ticket;
            }

            if ($status === 'Assigned' && ! $ticket->assigned_to) {
                throw ValidationException::withMessages(['status' => ['Assign a staff member before setting this ticket to Assigned.']]);
            }

            if ($status === 'Resolved') {
                $hasStaffReply = $ticket->replies()->where('user_id', '!=', $ticket->student_id)->exists();
                if (! $hasStaffReply) {
                    throw ValidationException::withMessages(['status' => ['Please send the student a resolution reply before marking the ticket resolved.']]);
                }
            }

            $trimmedNote = trim($note);
            $this->routingService->addStatusHistory(
                $ticket,
                $status,
                $actor->id,
                $trimmedNote !== '' ? $trimmedNote : "Status updated to {$status} by {$actor->name}."
            );

            $supervisors = $status === 'Escalated'
                ? User::query()->where('active', true)->whereHas('roleRelation', fn ($q) => $q->whereIn('name', ['admin', 'principal']))->pluck('id')->all()
                : [];

            $this->routingService->notifyUsers(array_merge([$ticket->student_id], $supervisors), [
                'ticket_id' => $ticket->id,
                'type' => $status === 'Resolved' ? 'resolved' : ($status === 'Escalated' ? 'escalated' : 'status'),
                'title' => "{$ticket->ticket_number} · {$status}",
                'message' => $status === 'Resolved'
                    ? 'Your query has been resolved. Please share your feedback.'
                    : "{$ticket->subject}: ".($trimmedNote !== '' ? $trimmedNote : "The status is now {$status}."),
            ]);

            return $ticket->fresh();
        });
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function forwardTicket(string|int $idOrNumber, User $actor, array $input): Ticket
    {
        return DB::transaction(function () use ($idOrNumber, $actor, $input) {
            $ticket = $this->findAccessibleTicket($idOrNumber, $actor);

            $department = Department::query()
                ->where('id', (int) ($input['department_id'] ?? 0))
                ->where('active', true)
                ->first();

            if (! $department) {
                throw ValidationException::withMessages(['department_id' => ['Choose an active department.']]);
            }

            if (in_array($ticket->status, ['Resolved', 'Closed'], true)) {
                throw ValidationException::withMessages(['status' => ['Reopen this ticket before reassigning it.']]);
            }

            $preferredStaffId = ! empty($input['staff_id']) ? (int) $input['staff_id'] : null;
            $staff = $this->routingService->findAssignee($department->id, $preferredStaffId);

            if ($preferredStaffId !== null && ! $staff) {
                throw ValidationException::withMessages(['staff_id' => ['The selected staff member is not assigned to this department.']]);
            }

            $ticket->department_id = $department->id;
            $ticket->assigned_to = $staff?->id;
            $ticket->save();

            $newStatus = $ticket->status === 'Escalated' ? 'Escalated' : ($staff ? 'Assigned' : 'Open');
            $noteText = trim((string) ($input['note'] ?? ''));
            $this->routingService->addStatusHistory(
                $ticket,
                $newStatus,
                $actor->id,
                "Forwarded to {$department->name}".($staff ? " / {$staff->name}" : '').'. '.($noteText !== '' ? $noteText : 'Routed to the responsible department.')
            );

            $this->routingService->notifyUsers([$ticket->student_id, $staff?->id], [
                'ticket_id' => $ticket->id,
                'type' => 'assigned',
                'title' => "{$ticket->ticket_number} reassigned",
                'message' => ($staff?->name ?? $department->name)." will handle your query. {$noteText}",
            ]);

            return $ticket->fresh();
        });
    }

    public function claimTicket(string|int $idOrNumber, User $staff): Ticket
    {
        return DB::transaction(function () use ($idOrNumber, $staff) {
            $ticket = $this->findAccessibleTicket($idOrNumber, $staff);

            if (! in_array($ticket->status, Ticket::ACTIVE_STATUSES, true)) {
                throw ValidationException::withMessages(['status' => ['Only active tickets can be claimed.']]);
            }

            if ($ticket->assigned_to && (int) $ticket->assigned_to !== (int) $staff->id) {
                throw new HttpException(409, 'This ticket belongs to another staff member. Ask an administrator to reassign it.');
            }

            if ((int) $ticket->claimed_by === (int) $staff->id) {
                return $ticket;
            }

            $now = ApiResponse::appNow();
            $ticket->assigned_to = $staff->id;
            $ticket->claimed_by = $staff->id;
            $ticket->claimed_at = $now;
            $ticket->save();

            $this->routingService->addStatusHistory(
                $ticket,
                $ticket->status === 'Escalated' ? 'Escalated' : 'In Progress',
                $staff->id,
                "{$staff->name} accepted ownership of the query."
            );

            $this->routingService->notifyUsers([$ticket->student_id], [
                'ticket_id' => $ticket->id,
                'type' => 'assigned',
                'title' => "{$ticket->ticket_number} accepted",
                'message' => "{$staff->name} is now reviewing your query.",
            ]);

            return $ticket->fresh();
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function addInternalNote(string|int $idOrNumber, User $actor, string $message): array
    {
        $trimmed = trim($message);
        if ($trimmed === '' || mb_strlen($trimmed) > 5000) {
            throw ValidationException::withMessages(['message' => ['Write an internal note of up to 5,000 characters.']]);
        }

        $ticket = $this->findAccessibleTicket($idOrNumber, $actor);
        $now = ApiResponse::appNow();

        $note = TicketInternalNote::query()->create([
            'ticket_id' => $ticket->id,
            'user_id' => $actor->id,
            'message' => $trimmed,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $note->load('user.roleRelation', 'user.departments');

        return [
            'id' => $note->id,
            'ticket_id' => $note->ticket_id,
            'user_id' => $note->user_id,
            'message' => $note->message,
            'created_at' => $note->created_at?->toISOString(),
            'user' => $note->user?->toPublicArray(),
        ];
    }

    public function updatePriority(string|int $idOrNumber, User $actor, string $priority): Ticket
    {
        if (! in_array($priority, Ticket::PRIORITIES, true)) {
            throw ValidationException::withMessages(['priority' => ['Choose a valid priority.']]);
        }

        $ticket = $this->findAccessibleTicket($idOrNumber, $actor);
        if ($ticket->priority === $priority) {
            return $ticket;
        }

        $previous = $ticket->priority;
        $ticket->priority = $priority;
        $ticket->save();

        $this->routingService->addStatusHistory(
            $ticket,
            $ticket->status,
            $actor->id,
            "Priority changed from {$previous} to {$priority}."
        );

        return $ticket->fresh();
    }

    public function rateTicket(string|int $idOrNumber, User $student, int $rating, string $feedback = ''): Ticket
    {
        if ($rating < 1 || $rating > 5) {
            throw ValidationException::withMessages(['rating' => ['Choose a rating from 1 to 5 stars.']]);
        }

        $ticket = $this->findAccessibleTicket($idOrNumber, $student);

        if (! in_array($ticket->status, ['Resolved', 'Closed'], true)) {
            throw ValidationException::withMessages(['status' => ['Feedback is available once your ticket is resolved.']]);
        }

        $ticket->rating = $rating;
        $ticket->feedback = mb_substr(trim($feedback), 0, 1000);
        $ticket->save();

        $this->routingService->notifyUsers([$ticket->assigned_to], [
            'ticket_id' => $ticket->id,
            'type' => 'feedback',
            'title' => 'A student shared their feedback',
            'message' => "{$student->name} rated {$ticket->ticket_number} {$rating}/5 stars.",
        ]);

        return $ticket->fresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function getDashboard(User $user): array
    {
        $query = Ticket::query()
            ->with(['student.roleRelation', 'student.departments', 'assignedStaff.roleRelation', 'assignedStaff.departments', 'department', 'category'])
            ->withCount('replies');

        if ($user->role_name === 'student') {
            $query->where('student_id', $user->id);
        } elseif ($user->role_name === 'staff') {
            $deptIds = $user->departments()->pluck('departments.id')->all();
            $query->where(function ($q) use ($user, $deptIds) {
                $q->where('assigned_to', $user->id);
                if ($deptIds !== []) {
                    $q->orWhereIn('department_id', $deptIds);
                }
            });
        }

        $tickets = $query->get();
        $counts = [];
        foreach (Ticket::STATUSES as $status) {
            $counts[$status] = $tickets->where('status', $status)->count();
        }

        $ticketIds = $tickets->pluck('id')->all();
        $ticketMap = $tickets->keyBy('id');

        $activity = TicketStatusHistory::query()
            ->whereIn('ticket_id', $ticketIds ?: [0])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(function (TicketStatusHistory $event) use ($ticketMap) {
                $t = $ticketMap->get($event->ticket_id);

                return [
                    'id' => $event->id,
                    'ticket_id' => $event->ticket_id,
                    'actor_id' => $event->actor_id,
                    'previous_status' => $event->previous_status,
                    'status' => $event->status,
                    'note' => $event->note,
                    'created_at' => $event->created_at?->toISOString(),
                    'ticket' => $t ? $this->enrichTicket($t) : null,
                ];
            })
            ->values()
            ->all();

        $priorityRank = array_flip(Ticket::PRIORITIES);

        $queue = $tickets
            ->filter(fn (Ticket $t) => in_array($t->status, Ticket::ACTIVE_STATUSES, true))
            ->sort(function (Ticket $a, Ticket $b) use ($priorityRank) {
                $pCmp = ($priorityRank[$b->priority] ?? 0) <=> ($priorityRank[$a->priority] ?? 0);

                return $pCmp !== 0 ? $pCmp : ($b->created_at?->timestamp <=> $a->created_at?->timestamp);
            })
            ->take(5)
            ->map(fn (Ticket $t) => $this->enrichTicket($t))
            ->values()
            ->all();

        $recent = $tickets
            ->sortByDesc('updated_at')
            ->take(5)
            ->map(fn (Ticket $t) => $this->enrichTicket($t))
            ->values()
            ->all();

        return [
            'total' => $tickets->count(),
            'counts' => $counts,
            'active' => $tickets->filter(fn (Ticket $t) => in_array($t->status, Ticket::ACTIVE_STATUSES, true))->count(),
            'assigned_to_me' => $tickets->where('assigned_to', $user->id)->count(),
            'recent' => $recent,
            'activity' => $activity,
            'queue' => $queue,
            'now' => ApiResponse::appNowMs(),
        ];
    }

    /**
     * @param  array<int, UploadedFile>  $files
     * @return array<int, array<string, mixed>>
     */
    private function storeUploadedFiles(Ticket $ticket, ?int $replyId, User $user, array $files): array
    {
        $stored = [];
        foreach (array_slice($files, 0, 5) as $file) {
            if (! $file instanceof UploadedFile || ! $file->isValid()) {
                continue;
            }
            $path = $file->store("attachments/tickets/{$ticket->id}", 'local');
            $record = TicketAttachment::query()->create([
                'ticket_id' => $ticket->id,
                'reply_id' => $replyId,
                'uploaded_by' => $user->id,
                'original_name' => $file->getClientOriginalName(),
                'stored_path' => $path,
                'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
                'size' => (int) $file->getSize(),
                'created_at' => ApiResponse::appNow(),
            ]);

            $stored[] = [
                'id' => $record->id,
                'name' => $record->original_name,
                'size' => $record->size,
                'type' => $record->mime_type,
                'mock' => false,
            ];
        }

        return $stored;
    }
}
