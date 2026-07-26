<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('card_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('subject_type');
            $table->foreignId('attendee_type_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->json('canvas');
            $table->json('elements');
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['event_id', 'subject_type', 'attendee_type_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('card_templates');
    }
};
