<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('race_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('running_event_category_id')->constrained()->cascadeOnDelete();
            // Null for a walk-in entered by staff on race day; the name,
            // email and phone below are a snapshot either way, so a deleted
            // registration never erases someone from the start list.
            $table->foreignId('registration_id')->nullable()->constrained()->nullOnDelete();
            $table->string('bib_number');
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('finished_at')->nullable();
            // Held separately from the two timestamps so a chip time from the
            // timing provider can be stored without inventing wall-clock times.
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->string('status')->default('registered');
            $table->timestamps();

            $table->unique(['running_event_category_id', 'bib_number']);
            $table->unique(['running_event_category_id', 'registration_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('race_participants');
    }
};
