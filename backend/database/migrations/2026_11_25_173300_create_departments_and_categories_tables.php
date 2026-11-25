<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 20)->unique();
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('sla_hours')->default(24);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index('active');
        });

        Schema::create('user_departments', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->primary(['user_id', 'department_id']);
        });

        Schema::create('query_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('department_id')->constrained('departments');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['department_id', 'active']);
        });

        Schema::create('app_settings', function (Blueprint $table) {
            $table->string('key', 80)->primary();
            $table->json('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
        Schema::dropIfExists('query_categories');
        Schema::dropIfExists('user_departments');
        Schema::dropIfExists('departments');
    }
};
