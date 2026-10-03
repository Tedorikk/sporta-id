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
        Schema::create('payment_refund_records', function (Blueprint $table) {
            $table->id();
            
            // Link to payment
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            
            // Optional link to specific registration (for group partial refunds)
            $table->foreignId('registration_id')->nullable()->constrained()->nullOnDelete();
            
            // Refund details
            $table->decimal('amount', 10, 2);
            $table->char('currency', 3)->default('IDR');
            
            // Provider refund reference
            $table->string('provider')->comment('Provider that processed the refund');
            $table->string('provider_refund_id')->nullable()->comment('Provider refund transaction ID');
            
            // Refund state
            $table->enum('refund_state', ['recorded', 'processing', 'completed', 'failed'])->default('recorded');
            
            // Audit trail
            $table->foreignId('refunded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('refund_note')->nullable();
            $table->timestamp('refunded_at');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['payment_id', 'refund_state'], 'refund_payment_state_index');
            $table->index('refunded_at', 'refund_date_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_refund_records');
    }
};
