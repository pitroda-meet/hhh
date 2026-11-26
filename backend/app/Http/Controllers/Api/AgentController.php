<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\Faq;
use App\Services\AgentChatService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AgentController extends Controller
{
    public function __construct(
        private readonly AgentChatService $chatService,
    ) {}

    public function sessions(Request $request): JsonResponse
    {
        return ApiResponse::success($this->chatService->listSessions($request->user()));
    }

    public function createSession(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'language' => ['nullable', 'in:en,hi,gu'],
        ]);

        $language = (string) ($validated['language'] ?? 'en');

        return ApiResponse::success($this->chatService->createSession($request->user(), $language), 'Session created', [], 201);
    }

    public function showSession(Request $request, int $id): JsonResponse
    {
        $session = $this->chatService->findSession($id, $request->user());

        return ApiResponse::success($this->chatService->sessionDetail($session));
    }

    public function deleteSession(Request $request, int $id): JsonResponse
    {
        $session = $this->chatService->findSession($id, $request->user());
        $session->delete();

        return ApiResponse::success(['deleted' => true]);
    }

    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => ['required', 'integer'],
            'message' => ['required', 'string', 'max:3000'],
            'action' => ['nullable', 'string', 'max:60'],
        ]);

        $result = $this->chatService->handleChat(
            $request->user(),
            (int) $validated['session_id'],
            $validated['message'],
            $validated['action'] ?? null
        );

        return ApiResponse::success($result);
    }

    public function confirmTicket(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'message_id' => ['required', 'integer'],
            'confirmed' => ['required', 'boolean'],
        ]);

        $result = $this->chatService->confirmTicket(
            $request->user(),
            $id,
            (int) $validated['message_id'],
            (bool) $validated['confirmed']
        );

        return ApiResponse::success($result);
    }

    public function messageFeedback(Request $request, int $id): JsonResponse
    {
        $feedback = (string) $request->input('feedback', '');
        if (! in_array($feedback, ['up', 'down'], true)) {
            throw ValidationException::withMessages(['feedback' => ['Choose helpful or not helpful.']]);
        }

        $message = ChatMessage::query()->where('id', $id)->where('type', 'faq')->first();
        if (! $message) {
            return ApiResponse::error('FAQ message not found.', 404);
        }

        $this->chatService->findSession($message->session_id, $request->user());

        DB::transaction(function () use ($message, $feedback) {
            $faq = $message->faq_id ? Faq::query()->find($message->faq_id) : null;
            if ($faq) {
                $delta = ($feedback === 'up' ? 1 : 0) - ($message->feedback === 'up' ? 1 : 0);
                $faq->helpful = max(0, $faq->helpful + $delta);
                $faq->save();
            }
            $message->feedback = $feedback;
            $message->save();
        });

        return ApiResponse::success(['feedback' => $feedback]);
    }
}
