<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email = strtolower(trim($validated['email']));
        $user = User::query()
            ->with(['roleRelation', 'departments'])
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return ApiResponse::error('The email or password is incorrect.', 401);
        }

        if (! $user->active) {
            return ApiResponse::error('Your account is inactive. Please contact an administrator.', 403);
        }

        $roleName = $user->role_name;
        $token = $user->createToken('auth_token', ["role:{$roleName}"])->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
            'user' => $user->toPublicArray(),
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:30'],
            'institute' => ['nullable', 'string', 'max:255'],
            'trade' => ['nullable', 'string', 'max:255'],
            'enrollment_number' => ['nullable', 'string', 'max:60'],
            'language' => ['nullable', 'in:en,hi,gu'],
        ]);

        $email = strtolower(trim($validated['email']));
        if (User::query()->whereRaw('LOWER(email) = ?', [$email])->exists()) {
            return ApiResponse::error('An account with this email already exists.', 422, [
                'email' => ['An account with this email already exists.'],
            ]);
        }

        $studentRole = Role::query()->where('name', 'student')->firstOrFail();

        $nextNum = (int) (User::query()->max('id') ?? 0) + 201;
        $enrollment = trim((string) ($validated['enrollment_number'] ?? ''));
        if ($enrollment === '') {
            $enrollment = sprintf('GTI-2026-%04d', $nextNum);
        }

        $user = User::query()->create([
            'role_id' => $studentRole->id,
            'name' => trim($validated['name']),
            'email' => $email,
            'password' => Hash::make($validated['password']),
            'phone' => trim((string) ($validated['phone'] ?? '')),
            'institute' => trim((string) ($validated['institute'] ?? 'Government ITI, Junagadh')) ?: 'Government ITI, Junagadh',
            'trade' => trim((string) ($validated['trade'] ?? 'Electrician')) ?: 'Electrician',
            'year' => '1st year',
            'enrollment_number' => $enrollment,
            'language' => $validated['language'] ?? 'en',
            'active' => true,
        ]);

        $user->load(['roleRelation', 'departments']);
        $token = $user->createToken('auth_token', ['role:student'])->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
            'user' => $user->toPublicArray(),
        ], 'Account created', [], 201);
    }

    public function demoLogin(Request $request): JsonResponse
    {
        if (! app()->environment(['local', 'testing']) && ! config('app.debug')) {
            return ApiResponse::error('Demo login is disabled in production.', 403);
        }

        $validated = $request->validate([
            'role' => ['required_without:email', 'in:student,staff,admin,principal'],
            'email' => ['required_without:role', 'email'],
        ]);

        $email = isset($validated['email'])
            ? strtolower(trim($validated['email']))
            : "{$validated['role']}@iti.demo";

        $user = User::query()
            ->with(['roleRelation', 'departments'])
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (! $user) {
            return ApiResponse::error('Demo account not found.', 404);
        }

        if (! $user->active) {
            return ApiResponse::error('Your account is inactive. Please contact an administrator.', 403);
        }

        $roleName = $user->role_name;
        $token = $user->createToken('auth_token', ["role:{$roleName}"])->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
            'user' => $user->toPublicArray(),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::success($request->user()->toPublicArray());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return ApiResponse::success(['logged_out' => true]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'institute' => ['nullable', 'string', 'max:255'],
            'trade' => ['nullable', 'string', 'max:255'],
            'year' => ['nullable', 'string', 'max:40'],
            'language' => ['nullable', 'in:en,hi,gu'],
            'designation' => ['nullable', 'string', 'max:100'],
        ]);

        foreach (['name', 'phone', 'institute', 'trade', 'year', 'language'] as $field) {
            if (array_key_exists($field, $validated) && $validated[$field] !== null) {
                $user->{$field} = trim((string) $validated[$field]);
            }
        }

        if ($user->role_name !== 'student' && array_key_exists('designation', $validated)) {
            $user->designation = mb_substr(trim((string) ($validated['designation'] ?? '')), 0, 100);
        }

        $user->save();

        return ApiResponse::success($user->fresh(['roleRelation', 'departments'])->toPublicArray());
    }
}
