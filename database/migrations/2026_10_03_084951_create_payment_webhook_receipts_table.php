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
        Schema::create('payment_webhook_receipts', function (Blueprint $table) {
            $table->id();

            // Provider identification
            $table->string('provider')->index();
            $table->string('provider_account_id')->nullable();
            $table->enum('provider_mode', ['test', 'live'])->nullable();

            // Event identification
            $table->string('event_type')->index();
            $table->string('session_id')->nullable()->index();
            $table->string('reference_id')->nullable()->index();

            // Optional payment link (may not exist yet when receipt arrives)
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();

            // Deduplication
            $table->string('dedupe_key')->unique()
                ->comment('Semantic deduplication key: provider|account|session|event|status');
            $table->string('payload_digest', 64)
                ->comment('SHA-256 of sanitized payload for conflict detection');

            // Payload (minimized and redacted)
            $table->json('sanitized_payload')
                ->comment('Webhook payload with PII minimized');

            // Processing state
            $table->enum('processing_state', ['received', 'processing', 'processed', 'failed', 'unmatched'])
                ->default('received')->index();
            $table->unsignedTinyInteger('processing_attempts')->default(0);
            $table->text('processing_error')->nullable();

            // Timestamps
            $table->timestamp('received_at')->useCurrent();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            // Indexes for operational queries
            $table->index(['processing_state', 'received_at'], 'receipts_processing_state_received_index');
            $table->index(['provider', 'session_id'], 'receipts_provider_session_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_webhook_receipts');
    }
};
