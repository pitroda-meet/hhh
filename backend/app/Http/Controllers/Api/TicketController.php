<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TicketAttachment;
use App\Services\TicketService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
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

        Validator::make(
            [...$request->all(), 'files' => $files],
            [
                'subject' => ['required', 'string', 'min:5', 'max:150'],
                'description' => ['required', 'string', 'min:10', 'max:5000'],
                'category_id' => ['required', 'integer', 'min:1'],
                'priority' => ['nullable', 'in:Low,Medium,High,Critical'],
                'files' => ['nullable', 'array', 'max:5'],
                'files.*' => ['file', 'max:5120', 'mimes:jpg,jpeg,png,webp,gif,pdf,doc,docx,txt'],
            ],
            [
                'files.max' => 'You can upload up to 5 files at a time.',
                'files.*.max' => 'Each attachment must be 5 MB or smaller.',
                'files.*.mimes' => 'Allowed attachment formats: JPG, PNG, WEBP, GIF, PDF, DOC, DOCX, TXT.',
            ]
        )->validate();

        $ticket = $this->ticketService->createTicket($request->user(), $request->all(), $files);

        return ApiResponse::success($this->ticketService->enrichTicket($ticket), 'Ticket created', [], 201);
    }

    public function reply(Request $request, string $id): JsonResponse
    {
        $files = $request->file('files', []);
        if (! is_array($files)) {
            $files = $files ? [$files] : [];
        }

        Validator::make(
            [...$request->all(), 'files' => $files],
            [
                'message' => ['nullable', 'string', 'max:5000'],
                'files' => ['nullable', 'array', 'max:5'],
                'files.*' => ['file', 'max:5120', 'mimes:jpg,jpeg,png,webp,gif,pdf,doc,docx,txt'],
            ],
            [
                'files.max' => 'You can upload up to 5 files at a time.',
                'files.*.max' => 'Each attachment must be 5 MB or smaller.',
                'files.*.mimes' => 'Allowed attachment formats: JPG, PNG, WEBP, GIF, PDF, DOC, DOCX, TXT.',
            ]
        )->validate();

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
        $validated = $request->validate([
            'message' => ['required', 'string', 'min:2', 'max:5000'],
        ]);

        $note = $this->ticketService->addInternalNote($id, $request->user(), (string) $validated['message']);

        return ApiResponse::success($note, 'Internal note saved', [], 201);
    }

    public function updatePriority(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'priority' => ['required', 'in:Low,Medium,High,Critical'],
        ]);

        $ticket = $this->ticketService->updatePriority($id, $request->user(), (string) $validated['priority']);

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
