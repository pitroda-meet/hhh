<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AgentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FaqController;
use App\Http\Controllers\Api\ReferenceController;
use App\Http\Controllers\Api\TicketController;
use Illuminate\Support\Facades\Route;

// Public authentication & demo endpoints
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/demo-login', [AuthController::class, 'demoLogin']);
});

Route::post('/demo/reset', [AdminController::class, 'demoReset']);

// Authenticated endpoints (Sanctum Personal Access Tokens)
Route::middleware('auth:sanctum')->group(function () {
    // Auth profile & logout
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::patch('/auth/profile', [AuthController::class, 'updateProfile']);

    // Shared reference data, notifications, FAQs, attachments
    Route::get('/departments', [ReferenceController::class, 'index']);
    Route::get('/notifications', [ReferenceController::class, 'notifications']);
    Route::patch('/notifications/{id}/read', [ReferenceController::class, 'markNotificationRead']);

    Route::get('/faqs', [FaqController::class, 'index']);
    Route::post('/faqs/{id}/feedback', [FaqController::class, 'feedback']);
    Route::get('/attachments/{attachmentId}/download', [TicketController::class, 'downloadAttachment']);

    // Student routes
    Route::prefix('student')->middleware('role:student')->group(function () {
        Route::get('/dashboard', [TicketController::class, 'dashboard']);
        Route::get('/queries', [TicketController::class, 'index']);
        Route::post('/queries', [TicketController::class, 'store']);
        Route::get('/queries/{id}', [TicketController::class, 'show']);
        Route::post('/queries/{id}/reply', [TicketController::class, 'reply']);
        Route::post('/queries/{id}/feedback', [TicketController::class, 'feedback']);
    });

    // Staff routes
    Route::prefix('staff')->middleware('role:staff')->group(function () {
        Route::get('/dashboard', [TicketController::class, 'dashboard']);
        Route::get('/queries', [TicketController::class, 'index']);
        Route::get('/queries/{id}', [TicketController::class, 'show']);
        Route::post('/queries/{id}/reply', [TicketController::class, 'reply']);
        Route::patch('/queries/{id}/status', [TicketController::class, 'updateStatus']);
        Route::post('/queries/{id}/forward', [TicketController::class, 'forward']);
        Route::post('/queries/{id}/claim', [TicketController::class, 'claim']);
    });

    // Shared Staff + Admin + Principal ticket actions
    Route::middleware('role:staff,admin,principal')->group(function () {
        Route::post('/staff/queries/{id}/internal-notes', [TicketController::class, 'internalNote']);
        Route::patch('/staff/queries/{id}/priority', [TicketController::class, 'updatePriority']);
    });

    Route::post('/staff/queries/{id}/suggest-faq', [FaqController::class, 'suggest'])
        ->middleware('role:staff,admin');

    // Admin routes
    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('/dashboard', [TicketController::class, 'dashboard']);
        Route::get('/queries/{id}', [TicketController::class, 'show']);
        Route::post('/queries/{id}/reply', [TicketController::class, 'reply']);
        Route::patch('/queries/{id}/status', [TicketController::class, 'updateStatus']);
        Route::post('/queries/{id}/forward', [TicketController::class, 'forward']);

        Route::post('/faqs', [FaqController::class, 'store']);
        Route::put('/faqs/{id}', [FaqController::class, 'update']);
        Route::delete('/faqs/{id}', [FaqController::class, 'destroy']);

        Route::get('/ai-action-logs', [AdminController::class, 'aiLogs']);
        Route::get('/ai-status', [AdminController::class, 'aiStatus']);
        Route::put('/routing-rules/strategy', [AdminController::class, 'setRoutingStrategy']);

        Route::get('/{resource}', [AdminController::class, 'index'])
            ->where('resource', 'users|departments|categories|assignments|escalation_rules');
        Route::post('/{resource}', [AdminController::class, 'store'])
            ->where('resource', 'users|departments|categories|assignments|escalation_rules');
        Route::put('/{resource}/{id}', [AdminController::class, 'update'])
            ->where('resource', 'users|departments|categories|assignments|escalation_rules');
        Route::delete('/{resource}/{id}', [AdminController::class, 'destroy'])
            ->where('resource', 'users|departments|categories|assignments|escalation_rules');
    });

    // Shared Admin + Principal reporting, simulation, and all-ticket oversight
    Route::middleware('role:admin,principal')->group(function () {
        Route::get('/admin/queries', [TicketController::class, 'index']);
        Route::get('/admin/reports', [AdminController::class, 'reports']);
        Route::get('/principal/reports', [AdminController::class, 'reports']);
        Route::post('/admin/simulate-escalation', [AdminController::class, 'simulateEscalation']);
    });

    // Principal routes
    Route::prefix('principal')->middleware('role:principal')->group(function () {
        Route::get('/dashboard', [TicketController::class, 'dashboard']);
        Route::get('/queries', [TicketController::class, 'index']);
        Route::get('/queries/{id}', [TicketController::class, 'show']);
        Route::post('/queries/{id}/reply', [TicketController::class, 'reply']);
        Route::patch('/queries/{id}/status', [TicketController::class, 'updateStatus']);
        Route::post('/queries/{id}/forward', [TicketController::class, 'forward']);
    });

    // AI Agent routes (Student + Admin)
    Route::prefix('v1/agent')->middleware('role:student,admin')->group(function () {
        Route::get('/sessions', [AgentController::class, 'sessions']);
        Route::post('/sessions', [AgentController::class, 'createSession']);
        Route::get('/sessions/{id}', [AgentController::class, 'showSession']);
        Route::delete('/sessions/{id}', [AgentController::class, 'deleteSession']);
        Route::post('/chat', [AgentController::class, 'chat']);
        Route::post('/sessions/{id}/confirm-ticket', [AgentController::class, 'confirmTicket']);
        Route::post('/messages/{id}/feedback', [AgentController::class, 'messageFeedback']);
    });
});
