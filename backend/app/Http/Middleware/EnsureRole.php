<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Handle an incoming request.
     *
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Please sign in to continue.',
            ], 401);
        }

        if (! $user->active) {
            return response()->json([
                'message' => 'Your account is inactive. Please contact an administrator.',
            ], 403);
        }

        $roleName = $user->role_name;

        if ($roles !== [] && ! in_array($roleName, $roles, true)) {
            return response()->json([
                'message' => 'You do not have access to this action.',
            ], 403);
        }

        $token = $user->currentAccessToken();
        if ($token && $roles !== []) {
            $hasRoleAbility = collect($roles)->contains(
                fn (string $role) => $user->tokenCan("role:{$role}")
            );
            if (! $hasRoleAbility) {
                return response()->json([
                    'message' => 'Your access token does not permit this role action.',
                ], 403);
            }
        }

        return $next($request);
    }
}
