<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 120)->default('New conversation');
            $table->enum('language', ['en', 'hi', 'gu'])->default('en');
            $table->json('context')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'updated_at']);
        });

        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('chat_sessions')->cascadeOnDelete();
            $table->enum('role', ['user', 'assistant']);
            $table->text('content');
            $table->enum('language', ['en', 'hi', 'gu'])->default('en');
            $table->enum('type', ['welcome', 'text', 'faq', 'confirmation', 'ticket'])->default('text');
            $table->json('actions')->nullable();
            $table->enum('feedback', ['up', 'down'])->nullable();
            $table->foreignId('faq_id')->nullable()->constrained('faqs')->nullOnDelete();
            $table->foreignId('ticket_id')->nullable()->constrained('tickets')->nullOnDelete();
            $table->json('pending_ticket')->nullable();
            $table->enum('decision', ['updated', 'cancelled', 'created'])->nullable();
            $table->text('source_question')->nullable();
            $table->decimal('confidence', 4, 3)->nullable();
            $table->string('provider', 50)->nullable();
            $table->string('intent', 50)->nullable();
            $table->timestamps();

            $table->index(['session_id', 'created_at']);
        });

        Schema::create('ai_action_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->nullable()->constrained('chat_sessions')->nullOnDelete();
            $table->foreignId('student_id')->constrained('users');
            $table->string('provider', 50)->nullable();
            $table->string('model', 100)->nullable();
            $table->string('tool', 60);
            $table->json('input')->nullable();
            $table->text('result')->nullable();
            $table->enum('status', ['success', 'no_match', 'error']);
            $table->string('language', 5)->default('en');
            $table->unsignedInteger('duration_ms')->default(0);
            $table->string('knowledge_policy', 80)->default('published_approved_faq_only');
            $table->string('intent', 60)->nullable();
            $table->decimal('confidence', 4, 3)->nullable();
            $table->foreignId('faq_id')->nullable()->constrained('faqs')->nullOnDelete();
            $table->text('error_message')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index('created_at');
            $table->index(['tool', 'status']);
            $table->index(['student_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_action_logs');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_sessions');
    }
};
