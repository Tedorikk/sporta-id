<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('awards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();

            // Whether this award's nominees are players or teams. Named
            // "kind" rather than "type" so it is never confused with
            // award_nominees.nominee_type, which holds a morph class name.
            $table->string('nominee_kind', 20)->default('team');

            // Which audiences may cast a vote: any of public / registrant /
            // attendee. A JSON set rather than a single value because an
            // organizer may want registrants but not, say, photographers.
            $table->json('allowed_voters');

            $table->string('status', 20)->default('draft');
            $table->string('results_visibility', 20)->default('after_close');

            $table->boolean('is_paid')->default(false);
            // Whole rupiah: Midtrans gross_amount is an integer, so storing a
            // fractional price here would only ever be rounded away later.
            $table->unsignedInteger('price_per_vote')->nullable();
            $table->unsignedInteger('max_votes_per_transaction')->nullable();
            $table->unsignedInteger('max_votes_per_voter')->nullable();

            $table->timestamp('opens_at')->nullable();
            $table->timestamp('closes_at')->nullable();
            $table->timestamps();

            $table->index(['event_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('awards');
    }
};
