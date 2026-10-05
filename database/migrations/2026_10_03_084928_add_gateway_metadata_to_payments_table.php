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
        Schema::table('payments', function (Blueprint $table) {
            // Provider identification
            $table->string('provider')->nullable()->after('id')
                ->comment('Payment provider: midtrans, xendit, manual_transfer');
            $table->string('provider_account_id')->nullable()->after('provider')
                ->comment('Provider business/merchant account ID for validation');
            $table->enum('provider_mode', ['test', 'live'])->nullable()->after('provider_account_id')
                ->comment('Provider environment mode');

            // Provider session/transaction identifiers
            $table->string('provider_session_id')->nullable()->after('provider_mode')
                ->comment('Provider session ID (e.g., Xendit ps-...)');
            $table->string('provider_payment_id')->nullable()->after('provider_session_id')
                ->comment('Provider payment transaction ID');
            $table->string('provider_request_id')->nullable()->after('provider_payment_id')
                ->comment('Provider payment request ID');

            // Checkout session metadata
            $table->text('checkout_url')->nullable()->after('provider_request_id')
                ->comment('Hosted checkout URL for customer');
            $table->timestamp('checkout_expires_at')->nullable()->after('checkout_url')
                ->comment('When the checkout session expires');

            // Currency (explicit, backfill to IDR)
            $table->char('currency', 3)->default('IDR')->after('amount');

            // Checkout state (separate from payment status)
            $table->enum('checkout_state', ['creating', 'ready', 'unknown', 'failed', 'closed'])
                ->nullable()->after('checkout_expires_at')
                ->comment('Checkout creation/session state');
            $table->timestamp('creation_lease_expires_at')->nullable()->after('checkout_state')
                ->comment('Lease expiry for concurrent creation protection');

            // Immutable request snapshot (for retries and audit)
            $table->json('request_snapshot')->nullable()->after('creation_lease_expires_at')
                ->comment('Frozen items, customer, amount at checkout creation');

            // Provider status tracking
            $table->string('provider_status')->nullable()->after('request_snapshot')
                ->comment('Raw provider status value');
            $table->timestamp('provider_updated_at')->nullable()->after('provider_status')
                ->comment('When provider last updated the payment');
            $table->timestamp('last_reconciled_at')->nullable()->after('provider_updated_at')
                ->comment('When we last reconciled with provider');

            // Fulfillment state (separate from financial status)
            $table->enum('fulfillment_state', ['pending', 'fulfilled', 'late_payment', 'excess_payment', 'review_required'])
                ->nullable()->after('last_reconciled_at')
                ->comment('Whether settlement resulted in fulfillment');
            $table->text('review_reason')->nullable()->after('fulfillment_state')
                ->comment('Why this payment requires manual review');

            // Indexes for operational queries
            $table->index(['checkout_state', 'created_at'], 'payments_checkout_state_created_at_index');
            $table->index(['status', 'last_reconciled_at'], 'payments_status_reconciled_index');
            $table->index(['provider', 'provider_status'], 'payments_provider_status_index');

            // Unique composite index for provider session (nullable unique)
            // Note: Multiple NULL values are allowed, uniqueness only enforced when non-null
            $table->unique(['provider', 'provider_account_id', 'provider_mode', 'provider_session_id'], 'payments_provider_session_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('payments_checkout_state_created_at_index');
            $table->dropIndex('payments_status_reconciled_index');
            $table->dropIndex('payments_provider_status_index');
            $table->dropUnique('payments_provider_session_unique');

            $table->dropColumn([
                'provider',
                'provider_account_id',
                'provider_mode',
                'provider_session_id',
                'provider_payment_id',
                'provider_request_id',
                'checkout_url',
                'checkout_expires_at',
                'currency',
                'checkout_state',
                'creation_lease_expires_at',
                'request_snapshot',
                'provider_status',
                'provider_updated_at',
                'last_reconciled_at',
                'fulfillment_state',
                'review_reason',
            ]);
        });
    }
};
