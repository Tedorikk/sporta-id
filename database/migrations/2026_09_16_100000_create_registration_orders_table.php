<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One buyer registering several individuals (runners, most often) in a
 * single Midtrans transaction. Each participant still gets their own
 * {@see Registration} row — its own status, its own ID card, its own
 * category and price — but they share one order and one payment for the
 * summed total, the same shape Pontianak City Run's registration used.
 *
 * A registration outside a group order (the existing single-participant
 * flow, and every team registration) simply has no order: `payments` is
 * polymorphic either way, so nothing about that path changes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('qr_token')->unique();
            $table->string('status')->default('pending_payment');
            $table->timestamp('expires_at')->nullable();
            $table->string('locale')->nullable();
            $table->timestamps();
        });

        Schema::table('registrations', function (Blueprint $table) {
            $table->foreignId('registration_order_id')->nullable()->after('registration_category_id')
                ->constrained()->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('registration_order_id');
        });

        Schema::dropIfExists('registration_orders');
    }
};
