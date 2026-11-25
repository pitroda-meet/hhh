<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TicketAttachment;
use App\Services\TicketService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TicketController extends Controller
{
    public function __construct(
        private readonly TicketService $ticketService,
    ) {}

    public function dashboard(Request $request): JsonResponse
    {
        return ApiResponse::success($this->ticketService->getDashboard($request->user()));
    }

    public function index(Request $request): JsonResponse
    {
        return ApiResponse::success($this->ticketService->listForUser($request->user(), $request->query()));
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return ApiResponse::success($this->ticketService->getTicketDetail($id, $request->user()));
    }

    public function store(Request $request): JsonResponse
    {
        $files = $request->file('files', []);
        if (! is_array($files)) {
            $files = $files ? [$files] : [];
        }

        $ticket = $this->ticketService->createTicket($request->user(), $request->all(), $files);

        return ApiResponse::success($this->ticketService->enrichTicket($ticket), 'Ticket created', [], 201);
    }

    public function reply(Request $request, string $id): JsonResponse
    {
        $files = $request->file('files', []);
        if (! is_array($files)) {
            $files = $files ? [$files] : [];
        }

        $reply = $this->ticketService->replyToTicket($id, $request->user(), $request->all(), $files);

        return ApiResponse::success($reply, 'Reply sent', [], 201);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $ticket = $this->ticketService->updateStatus(
            $id,
            $request->user(),
            $validated['status'],
            (string) ($validated['note'] ?? '')
        );

        return ApiResponse::success($this->ticketService->enrichTicket($ticket));
    }

    public function forward(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'department_id' => ['required', 'integer'],
            'staff_id' => ['nullable', 'integer'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $ticket = $this->ticketService->forwardTicket($id, $request->user(), $validated);

        return ApiResponse::success($this->ticketService->enrichTicket($ticket));
    }

    public function claim(Request $request, string $id): JsonResponse
    {
        $ticket = $this->ticketService->claimTicket($id, $request->user());

        return ApiResponse::success($this->ticketService->enrichTicket($ticket));
    }

    public function internalNote(Request $request, string $id): JsonResponse
    {
        $note = $this->ticketService->addInternalNote($id, $request->user(), (string) $request->input('message', ''));

        return ApiResponse::success($note, 'Internal note saved', [], 201);
    }

    public function updatePriority(Request $request, string $id): JsonResponse
    {
        $ticket = $this->ticketService->updatePriority($id, $request->user(), (string) $request->input('priority', ''));

        return ApiResponse::success($this->ticketService->enrichTicket($ticket));
    }

    public function feedback(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'feedback' => ['nullable', 'string', 'max:1000'],
        ]);

        $ticket = $this->ticketService->rateTicket(
            $id,
            $request->user(),
            (int) $validated['rating'],
            (string) ($validated['feedback'] ?? '')
        );

        return ApiResponse::success($this->ticketService->enrichTicket($ticket));
    }

    public function downloadAttachment(Request $request, int $attachmentId): StreamedResponse|JsonResponse
    {
        $attachment = TicketAttachment::query()->with('ticket')->find($attachmentId);
        if (! $attachment || ! $attachment->ticket) {
            return ApiResponse::error('Attachment not found.', 404);
        }

        if (! $this->ticketService->canAccessTicket($request->user(), $attachment->ticket)) {
            return ApiResponse::error('You do not have access to this attachment.', 403);
        }

        if (! Storage::disk('local')->exists($attachment->stored_path)) {
            return ApiResponse::error('Attachment file is missing from storage.', 404);
        }

        return Storage::disk('local')->download($attachment->stored_path, $attachment->original_name);
    }
}
