<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiActionLog;
use App\Models\AppSetting;
use App\Models\Department;
use App\Models\EscalationRule;
use App\Models\Faq;
use App\Models\QueryCategory;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\TicketReply;
use App\Models\User;
use App\Services\AI\AiGatewayManager;
use App\Services\AnalyticsService;
use App\Services\EscalationService;
use App\Support\ApiResponse;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    public function __construct(
        private readonly AnalyticsService $analyticsService,
        private readonly EscalationService $escalationService,
        private readonly AiGatewayManager $aiGateway,
    ) {}

    public function index(string $resource): JsonResponse
    {
        return match ($resource) {
            'users' => ApiResponse::success(
                User::query()->with(['roleRelation', 'departments'])->orderBy('id')->get()->map->toPublicArray()->values()
            ),
            'assignments' => ApiResponse::success($this->getAssignments()),
            'departments' => ApiResponse::success(Department::query()->orderBy('id')->get()),
            'categories' => ApiResponse::success(QueryCategory::query()->orderBy('id')->get()),
            'escalation_rules' => ApiResponse::success(EscalationRule::query()->orderBy('id')->get()),
            default => ApiResponse::error('Unknown management resource.', 404),
        };
    }

    public function store(Request $request, string $resource): JsonResponse
    {
        return $this->save($request, $resource, null);
    }

    public function update(Request $request, string $resource, int $id): JsonResponse
    {
        return $this->save($request, $resource, $id);
    }

    public function destroy(Request $request, string $resource, int $id): JsonResponse
    {
        if (! in_array($resource, ['users', 'departments', 'categories', 'escalation_rules'], true)) {
            return ApiResponse::error('This resource cannot be deleted.', 422);
        }

        $actor = $request->user();

        if ($resource === 'users') {
            $record = User::query()->find($id);
            if (! $record) {
                return ApiResponse::error('The record no longer exists.', 404);
            }
            $used = $id === $actor->id
                || Ticket::query()->where('student_id', $id)->orWhere('assigned_to', $id)->exists()
                || TicketReply::query()->where('user_id', $id)->exists()
                || Faq::query()->where('suggested_by', $id)->orWhere('approved_by', $id)->exists();

            if ($used) {
                return ApiResponse::error('This record is linked to existing activity. Update or deactivate it instead to preserve history.', 422);
            }
            $record->delete();
        } elseif ($resource === 'departments') {
            $record = Department::query()->find($id);
            if (! $record) {
                return ApiResponse::error('The record no longer exists.', 404);
            }
            $used = Ticket::query()->where('department_id', $id)->exists()
                || QueryCategory::query()->where('department_id', $id)->exists()
                || DB::table('user_departments')->where('department_id', $id)->exists();

            if ($used) {
                return ApiResponse::error('This record is linked to existing activity. Update or deactivate it instead to preserve history.', 422);
            }
            $record->delete();
        } elseif ($resource === 'categories') {
            $record = QueryCategory::query()->find($id);
            if (! $record) {
                return ApiResponse::error('The record no longer exists.', 404);
            }
            $used = Ticket::query()->where('category_id', $id)->exists()
                || Faq::query()->where('category_id', $id)->exists();

            if ($used) {
                return ApiResponse::error('This record is linked to existing activity. Update or deactivate it instead to preserve history.', 422);
            }
            $record->delete();
        } else {
            $record = EscalationRule::query()->find($id);
            if (! $record) {
                return ApiResponse::error('The record no longer exists.', 404);
            }
            $record->delete();
        }

        return ApiResponse::success(['deleted' => true]);
    }

    public function reports(): JsonResponse
    {
        return ApiResponse::success($this->analyticsService->getReports());
    }

    public function aiLogs(Request $request): JsonResponse
    {
        $query = AiActionLog::query()
            ->with('student')
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        $tool = $request->query('tool');
        if ($tool && $tool !== 'All') {
            $query->where('tool', $tool);
        }

        $status = $request->query('status');
        if ($status && $status !== 'All') {
            $query->where('status', $status);
        }

        if ($request->filled('search') && trim((string) $request->query('search')) !== '') {
            $term = '%'.trim((string) $request->query('search')).'%';
            $query->where(function ($q) use ($term) {
                $q->where('tool', 'like', $term)
                    ->orWhere('result', 'like', $term)
                    ->orWhereHas('student', fn ($sq) => $sq->where('name', 'like', $term));
            });
        }

        $pageSize = min(100, max(1, (int) $request->query('page_size', 10)));
        $paginator = $query->paginate($pageSize, ['*'], 'page', max(1, (int) $request->query('page', 1)));

        $items = collect($paginator->items())->map(fn (AiActionLog $log) => [
            'id' => $log->id,
            'session_id' => $log->session_id,
            'student_id' => $log->student_id,
            'student_name' => $log->student?->name ?? 'Student',
            'provider' => $log->provider ?? 'mock',
            'model' => $log->model,
            'tool' => $log->tool,
            'input' => $log->input ?? (object) [],
            'result' => $log->result,
            'status' => $log->status,
            'language' => $log->language,
            'duration_ms' => $log->duration_ms,
            'knowledge_policy' => $log->knowledge_policy,
            'intent' => $log->intent,
            'confidence' => $log->confidence,
            'faq_id' => $log->faq_id,
            'error_message' => $log->error_message,
            'created_at' => $log->created_at?->toISOString(),
        ])->values()->all();

        $total = AiActionLog::query()->count();
        $success = AiActionLog::query()->where('status', 'success')->count();
        $noMatch = AiActionLog::query()->where('status', 'no_match')->count();
        $errors = AiActionLog::query()->where('status', 'error')->count();
        $searches = AiActionLog::query()->where('tool', 'search_faq')->count();
        $searchHits = AiActionLog::query()->where('tool', 'search_faq')->where('status', 'success')->count();
        $sessions = AiActionLog::query()->whereNotNull('session_id')->distinct('session_id')->count('session_id');
        $handoffs = AiActionLog::query()->where('tool', 'create_ticket')->whereNotNull('session_id')->distinct('session_id')->count('session_id');
        $tools = AiActionLog::query()->distinct()->pluck('tool')->values()->all();

        return ApiResponse::success([
            'items' => $items,
            'total' => $paginator->total(),
            'page' => $paginator->currentPage(),
            'page_size' => $paginator->perPage(),
            'last_page' => max(1, $paginator->lastPage()),
            'summary' => [
                'total' => $total,
                'success' => $success,
                'no_match' => $noMatch,
                'errors' => $errors,
                'faq_match_rate' => $searches > 0 ? (int) round(($searchHits / $searches) * 100) : 0,
                'handoff_rate' => $sessions > 0 ? (int) round(($handoffs / $sessions) * 100) : 0,
            ],
            'tools' => $tools,
            'ai_status' => $this->aiGateway->status(),
        ]);
    }

    public function aiStatus(): JsonResponse
    {
        return ApiResponse::success($this->aiGateway->status());
    }

    public function setRoutingStrategy(Request $request): JsonResponse
    {
        $strategy = (string) $request->input('routing_strategy', $request->input('strategy', ''));
        if (! in_array($strategy, ['least_open', 'round_robin'], true)) {
            throw ValidationException::withMessages(['routing_strategy' => ['Choose a supported routing strategy.']]);
        }

        AppSetting::setValue('routing_strategy', $strategy);

        return ApiResponse::success(['routing_strategy' => $strategy]);
    }

    public function simulateEscalation(Request $request): JsonResponse
    {
        $hours = max(1, min(168, (int) $request->input('hours', 24)));
        $result = $this->escalationService->evaluate($hours, $request->user()->id);

        return ApiResponse::success($result);
    }

    public function demoReset(DatabaseSeeder $seeder): JsonResponse
    {
        if (! app()->environment(['local', 'testing']) && ! config('app.debug')) {
            return ApiResponse::error('Demo reset is disabled in production.', 403);
        }

        $seeder->run();

        return ApiResponse::success([
            'reset' => true,
            'next_ticket_number' => 125,
            'now' => ApiResponse::appNowMs(),
        ], 'Demo database restored to clean seeded state.');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getAssignments(): array
    {
        $staffUsers = User::query()
            ->with(['roleRelation', 'departments'])
            ->whereHas('roleRelation', fn ($q) => $q->where('name', 'staff'))
            ->orderBy('id')
            ->get();

        $activeCounts = Ticket::query()
            ->selectRaw('assigned_to, COUNT(*) as aggregate_count')
            ->whereIn('assigned_to', $staffUsers->pluck('id'))
            ->whereIn('status', Ticket::ACTIVE_STATUSES)
            ->groupBy('assigned_to')
            ->pluck('aggregate_count', 'assigned_to');

        return $staffUsers->map(fn (User $u) => [
            ...$u->toPublicArray(),
            'workload' => (int) ($activeCounts[$u->id] ?? 0),
        ])->values()->all();
    }

    private function save(Request $request, string $resource, ?int $id): JsonResponse
    {
        if (! in_array($resource, ['users', 'departments', 'categories', 'assignments', 'escalation_rules'], true)) {
            return ApiResponse::error('Unknown management resource.', 404);
        }

        $actor = $request->user();
        $input = $request->all();
        $statusCode = $id ? 200 : 201;

        if ($resource === 'users') {
            $name = trim((string) ($input['name'] ?? ''));
            $email = strtolower(trim((string) ($input['email'] ?? '')));
            $roleName = (string) ($input['role'] ?? '');
            $active = array_key_exists('active', $input) ? (bool) $input['active'] : true;

            if ($name === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw ValidationException::withMessages(['email' => ['A name and valid email address are required.']]);
            }

            $role = Role::query()->where('name', $roleName)->first();
            if (! $role) {
                throw ValidationException::withMessages(['role' => ['Choose a valid role.']]);
            }

            $record = $id ? User::query()->with('roleRelation', 'departments')->find($id) : null;
            if ($id && ! $record) {
                return ApiResponse::error('The record no longer exists.', 404);
            }

            if (User::query()->where('id', '!=', $id ?? 0)->whereRaw('LOWER(email) = ?', [$email])->exists()) {
                throw ValidationException::withMessages(['email' => ['This email address is already in use.']]);
            }

            if ($record && $record->id === $actor->id && ($roleName !== 'admin' || ! $active)) {
                throw ValidationException::withMessages(['active' => ['Keep your current administrator account active.']]);
            }

            if ($record && $roleName !== $record->role_name && Ticket::query()->where('student_id', $record->id)->orWhere('assigned_to', $record->id)->exists()) {
                throw ValidationException::withMessages(['role' => ['This user has ticket history. Keep their role and create a separate account for a different role.']]);
            }

            $deptIds = $roleName === 'staff' ? array_values(array_unique(array_map('intval', (array) ($input['department_ids'] ?? [])))) : [];
            if ($deptIds !== [] && Department::query()->whereIn('id', $deptIds)->where('active', true)->count() !== count($deptIds)) {
                throw ValidationException::withMessages(['department_ids' => ['Choose active departments for this staff member.']]);
            }

            if ($record && ! $active && Ticket::query()->where('assigned_to', $record->id)->whereIn('status', Ticket::ACTIVE_STATUSES)->exists()) {
                throw ValidationException::withMessages(['active' => ['Reassign this staff member’s active tickets before deactivating them.']]);
            }

            if ($record && $record->role_name === 'staff') {
                $blocked = Ticket::query()
                    ->where('assigned_to', $record->id)
                    ->whereIn('status', Ticket::ACTIVE_STATUSES)
                    ->whereNotIn('department_id', $deptIds ?: [0])
                    ->exists();
                if ($blocked) {
                    throw ValidationException::withMessages(['department_ids' => ['Reassign active tickets before removing their department from this staff member.']]);
                }
            }

            if (! empty($input['password']) && mb_strlen((string) $input['password']) < 8) {
                throw ValidationException::withMessages(['password' => ['Password must contain at least 8 characters.']]);
            }

            $nextSeq = (int) (User::query()->max('id') ?? 0) + 201;
            $attributes = [
                'name' => $name,
                'email' => $email,
                'role_id' => $role->id,
                'active' => $active,
                'institute' => $input['institute'] ?? 'Government ITI, Junagadh',
                'phone' => (string) ($input['phone'] ?? ''),
                'language' => $record?->language ?? 'en',
                'trade' => $input['trade'] ?? $record?->trade ?? 'Electrician',
                'year' => $record?->year ?? '1st year',
                'enrollment_number' => $record?->enrollment_number ?? sprintf('GTI-2026-%04d', $nextSeq),
            ];

            if (! empty($input['password'])) {
                $attributes['password'] = Hash::make((string) $input['password']);
            } elseif (! $record) {
                $attributes['password'] = Hash::make('Demo@2026');
            }

            $saved = DB::transaction(function () use ($record, $attributes, $deptIds) {
                if ($record) {
                    $record->update($attributes);
                } else {
                    $record = User::query()->create($attributes);
                }
                $record->departments()->sync($deptIds);

                return $record->fresh(['roleRelation', 'departments']);
            });

            return ApiResponse::success($saved->toPublicArray(), 'Saved', [], $statusCode);
        }

        if ($resource === 'assignments') {
            $staff = $id ? User::query()->with('roleRelation', 'departments')->find($id) : null;
            if (! $staff || $staff->role_name !== 'staff') {
                return ApiResponse::error('Choose an existing staff member.', 422);
            }

            $deptIds = array_values(array_unique(array_map('intval', (array) ($input['department_ids'] ?? []))));
            if ($deptIds !== [] && Department::query()->whereIn('id', $deptIds)->where('active', true)->count() !== count($deptIds)) {
                throw ValidationException::withMessages(['department_ids' => ['Choose active departments.']]);
            }

            $blocked = Ticket::query()
                ->where('assigned_to', $staff->id)
                ->whereIn('status', Ticket::ACTIVE_STATUSES)
                ->whereNotIn('department_id', $deptIds ?: [0])
                ->exists();
            if ($blocked) {
                throw ValidationException::withMessages(['department_ids' => ['Reassign active tickets before removing their department from this staff member.']]);
            }

            $staff->departments()->sync($deptIds);

            return ApiResponse::success($staff->fresh(['roleRelation', 'departments'])->toPublicArray());
        }

        if ($resource === 'departments') {
            $name = trim((string) ($input['name'] ?? ''));
            $code = strtoupper(trim((string) ($input['code'] ?? '')));
            $slaHours = (int) ($input['sla_hours'] ?? 24);
            $active = array_key_exists('active', $input) ? (bool) $input['active'] : true;

            if ($name === '' || $code === '') {
                throw ValidationException::withMessages(['name' => ['Department name and code are required.']]);
            }
            if ($slaHours < 1 || $slaHours > 168) {
                throw ValidationException::withMessages(['sla_hours' => ['SLA must be between 1 and 168 hours.']]);
            }

            $record = $id ? Department::query()->find($id) : null;
            if ($id && ! $record) {
                return ApiResponse::error('The record no longer exists.', 404);
            }
            if (Department::query()->where('id', '!=', $id ?? 0)->whereRaw('LOWER(code) = ?', [strtolower($code)])->exists()) {
                throw ValidationException::withMessages(['code' => ['Department codes must be unique.']]);
            }
            if ($record && ! $active && QueryCategory::query()->where('department_id', $record->id)->where('active', true)->exists()) {
                throw ValidationException::withMessages(['active' => ['Remap active categories before deactivating this department.']]);
            }

            $data = [
                'name' => $name,
                'code' => $code,
                'description' => (string) ($input['description'] ?? ''),
                'sla_hours' => $slaHours,
                'active' => $active,
            ];
            $saved = $record ? tap($record)->update($data) : Department::query()->create($data);

            return ApiResponse::success($saved->fresh(), 'Saved', [], $statusCode);
        }

        if ($resource === 'categories') {
            $name = trim((string) ($input['name'] ?? ''));
            $departmentId = (int) ($input['department_id'] ?? 0);
            $active = array_key_exists('active', $input) ? (bool) $input['active'] : true;

            if ($name === '') {
                throw ValidationException::withMessages(['name' => ['A category name is required.']]);
            }
            if (! Department::query()->where('id', $departmentId)->where('active', true)->exists()) {
                throw ValidationException::withMessages(['department_id' => ['Map this category to an active department.']]);
            }

            $record = $id ? QueryCategory::query()->find($id) : null;
            if ($id && ! $record) {
                return ApiResponse::error('The record no longer exists.', 404);
            }

            $data = [
                'name' => $name,
                'description' => (string) ($input['description'] ?? ''),
                'department_id' => $departmentId,
                'active' => $active,
            ];
            $saved = $record ? tap($record)->update($data) : QueryCategory::query()->create($data);

            return ApiResponse::success($saved->fresh(), 'Saved', [], $statusCode);
        }

        $name = trim((string) ($input['name'] ?? ''));
        $threshold = (int) ($input['threshold_hours'] ?? 24);
        $targetRole = (string) ($input['target_role'] ?? '');
        $priority = (string) ($input['priority'] ?? 'All');
        $enabled = array_key_exists('enabled', $input) ? (bool) $input['enabled'] : true;

        if ($name === '') {
            throw ValidationException::withMessages(['name' => ['Give the escalation rule a name.']]);
        }
        if ($threshold < 1 || $threshold > 720) {
            throw ValidationException::withMessages(['threshold_hours' => ['Threshold must be between 1 and 720 hours.']]);
        }
        if (! in_array($targetRole, ['supervisor', 'principal_admin'], true)) {
            throw ValidationException::withMessages(['target_role' => ['Choose a valid escalation target.']]);
        }
        if (! in_array($priority, ['All', ...Ticket::PRIORITIES], true)) {
            throw ValidationException::withMessages(['priority' => ['Choose a valid priority filter.']]);
        }

        $record = $id ? EscalationRule::query()->find($id) : null;
        if ($id && ! $record) {
            return ApiResponse::error('The record no longer exists.', 404);
        }

        $data = [
            'name' => $name,
            'threshold_hours' => $threshold,
            'target_role' => $targetRole,
            'priority' => $priority,
            'enabled' => $enabled,
        ];
        $saved = $record ? tap($record)->update($data) : EscalationRule::query()->create($data);

        return ApiResponse::success($saved->fresh(), 'Saved', [], $statusCode);
    }
}
