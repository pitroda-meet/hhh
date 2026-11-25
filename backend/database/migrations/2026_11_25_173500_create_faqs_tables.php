<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('faqs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('query_categories');
            $table->enum('status', ['draft', 'suggested', 'approved', 'published'])->default('draft');
            $table->foreignId('suggested_by')->nullable()->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->foreignId('source_ticket_id')->nullable()->constrained('tickets')->nullOnDelete();
            $table->unsignedInteger('views')->default(0);
            $table->unsignedInteger('helpful')->default(0);
            $table->timestamps();

            $table->index(['status', 'category_id']);
        });

        Schema::create('faq_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('faq_id')->constrained('faqs')->cascadeOnDelete();
            $table->enum('language', ['en', 'hi', 'gu']);
            $table->text('question');
            $table->text('answer');
            $table->text('keywords')->nullable();

            $table->unique(['faq_id', 'language']);
        });

        Schema::create('faq_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('faq_id')->constrained('faqs')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('value', ['up', 'down']);
            $table->timestamps();

            $table->unique(['faq_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('faq_feedback');
        Schema::dropIfExists('faq_translations');
        Schema::dropIfExists('faqs');
    }
};
