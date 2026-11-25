<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 30)->unique();
            $table->foreignId('student_id')->constrained('users');
            $table->foreignId('category_id')->constrained('query_categories');
            $table->foreignId('department_id')->constrained('departments');
            $table->foreignId('assigned_to')->nullable()->constrained('users');
            $table->foreignId('claimed_by')->nullable()->constrained('users');
            $table->timestamp('claimed_at')->nullable();
            $table->string('subject', 150);
            $table->text('description');
            $table->enum('priority', ['Low', 'Medium', 'High', 'Critical'])->default('Medium');
            $table->enum('status', ['Open', 'Assigned', 'In Progress', 'Waiting for Student', 'Escalated', 'Resolved', 'Closed'])->default('Open');
            $table->enum('source', ['manual', 'ai'])->default('manual');
            $table->string('routing_method', 30)->default('least_open');
            $table->json('attachments')->nullable();
            $table->unsignedTinyInteger('rating')->nullable();
            $table->text('feedback')->nullable();
            $table->string('idempotency_key', 100)->nullable();
            $table->unsignedSmallInteger('escalation_level')->default(0);
            $table->timestamp('due_at')->nullable();
            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('reopened_at')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'idempotency_key']);
            $table->index(['student_id', 'created_at']);
            $table->index(['department_id', 'status']);
            $table->index(['assigned_to', 'status']);
            $table->index(['status', 'priority']);
            $table->index('due_at');
        });

        Schema::create('ticket_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->text('message');
            $table->json('attachments')->nullable();
            $table->timestamps();

            $table->index(['ticket_id', 'created_at']);
        });

        Schema::create('ticket_internal_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->text('message');
            $table->timestamps();

            $table->index(['ticket_id', 'created_at']);
        });

        Schema::create('ticket_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users');
            $table->string('previous_status', 30)->nullable();
            $table->string('status', 30);
            $table->text('note')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['ticket_id', 'created_at']);
        });

        Schema::create('ticket_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->foreignId('reply_id')->nullable()->constrained('ticket_replies')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->string('original_name');
            $table->string('stored_path');
            $table->string('mime_type', 120)->default('application/octet-stream');
            $table->unsignedBigInteger('size')->default(0);
            $table->timestamp('created_at')->nullable();

            $table->index('ticket_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_attachments');
        Schema::dropIfExists('ticket_status_history');
        Schema::dropIfExists('ticket_internal_notes');
        Schema::dropIfExists('ticket_replies');
        Schema::dropIfExists('tickets');
    }
};
