<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payment_effects', function (Blueprint $table) {
            $table->id();

            // Link to payment
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();

            // Link to payable (polymorphic)
            $table->morphs('payable');

            // Effect identification
            $table->string('effect_type')
                ->comment('Type: confirmation_email, quota_update, bib_assignment, vote_count, etc.');
            $table->string('effect_key')->unique()
                ->comment('Unique stable key for idempotency: payment_id|effect_type|payable');

            // Payload for replay
            $table->json('payload')
                ->comment('Data needed to execute/replay this effect');

            // Processing state
            $table->enum('state', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->text('error_message')->nullable();

            // Timestamps
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['state', 'created_at'], 'effects_state_created_index');
            $table->index(['payment_id', 'effect_type'], 'effects_payment_type_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_effects');
    }
};
