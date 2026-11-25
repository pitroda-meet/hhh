<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Department;
use App\Models\Notification;
use App\Models\QueryCategory;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferenceController extends Controller
{
    public function index(): JsonResponse
    {
        $departments = Department::query()->orderBy('id')->get();
        $categories = QueryCategory::query()->orderBy('id')->get();
        $roles = Role::query()->orderBy('id')->get(['id', 'name']);
        $staff = User::query()
            ->with(['roleRelation', 'departments'])
            ->whereHas('roleRelation', fn ($q) => $q->where('name', 'staff'))
            ->orderBy('id')
            ->get()
            ->map(fn (User $u) => $u->toPublicArray())
            ->values();

        return ApiResponse::success([
            'departments' => $departments,
            'categories' => $categories,
            'roles' => $roles,
            'staff' => $staff,
            'routing_strategy' => AppSetting::getValue('routing_strategy', 'least_open') ?? 'least_open',
            'now' => ApiResponse::appNowMs(),
        ]);
    }

    public function notifications(Request $request): JsonResponse
    {
        $items = Notification::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Notification $n) => [
                'id' => $n->id,
                'user_id' => $n->user_id,
                'ticket_id' => $n->ticket_id,
                'type' => $n->type,
                'title' => $n->title,
                'message' => $n->message,
                'read_at' => $n->read_at?->toISOString(),
                'created_at' => $n->created_at?->toISOString(),
            ])
            ->values();

        return ApiResponse::success([
            'items' => $items,
            'now' => ApiResponse::appNowMs(),
        ]);
    }

    public function markNotificationRead(Request $request, string $id): JsonResponse
    {
        $now = ApiResponse::appNow();
        $query = Notification::query()->where('user_id', $request->user()->id);

        if ($id !== 'all') {
            $query->where('id', (int) $id);
        } else {
            $query->whereNull('read_at');
        }

        $query->update(['read_at' => $now]);

        return ApiResponse::success(['read' => true]);
    }
}
