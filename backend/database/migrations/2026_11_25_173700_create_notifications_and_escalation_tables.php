<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('ticket_id')->nullable()->constrained('tickets')->nullOnDelete();
            $table->string('type', 40);
            $table->string('title', 200);
            $table->text('message');
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['user_id', 'read_at', 'created_at']);
        });

        Schema::create('escalation_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->unsignedSmallInteger('threshold_hours');
            $table->enum('target_role', ['supervisor', 'principal_admin']);
            $table->enum('priority', ['All', 'Low', 'Medium', 'High', 'Critical'])->default('All');
            $table->boolean('enabled')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escalation_rules');
        Schema::dropIfExists('notifications');
    }
};
