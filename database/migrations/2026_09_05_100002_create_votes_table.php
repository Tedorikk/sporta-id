<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('award_id')->constrained()->cascadeOnDelete();
            $table->foreignId('award_nominee_id')->constrained()->cascadeOnDelete();

            // Public lookup token, so a paid voter can be sent back to a
            // status page without exposing sequential vote ids.
            $table->uuid('reference')->unique();

            // One row can carry many votes: a paid voter buys a batch in a
            // single Midtrans transaction rather than paying N times.
            $table->unsignedInteger('quantity')->default(1);

            // Free votes are counted on creation; paid votes start pending and
            // are only counted once Midtrans settles them.
            $table->string('status', 20)->default('counted');

            // Registration or Attendee. Null for an award that allows
            // anonymous public voting.
            $table->nullableMorphs('voter');

            $table->string('voter_name')->nullable();
            $table->string('voter_email')->nullable();
            $table->string('voter_phone')->nullable();

            // Weak best-effort identity for anonymous public voting. Enough to
            // stop casual repeat voting; not proof of anything.
            $table->string('voter_fingerprint')->nullable();
            $table->string('ip_address', 45)->nullable();

            // Total charged for the batch. Null for a free vote.
            $table->unsignedInteger('amount')->nullable();

            $table->timestamps();

            $table->index(['award_id', 'status']);
            $table->index(['award_nominee_id', 'status']);
            $table->index(['award_id', 'voter_fingerprint']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('votes');
    }
};
