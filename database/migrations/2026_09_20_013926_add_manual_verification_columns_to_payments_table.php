<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A manual-transfer payment has no Midtrans transaction to reconcile against —
 * it's settled or denied by an organizer looking at the uploaded proof, so
 * that decision needs somewhere to record itself.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('proof_path')->nullable()->after('raw_notification');
            $table->foreignId('verified_by')->nullable()->after('proof_path')->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable()->after('verified_by');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('verified_by');
            $table->dropColumn(['proof_path', 'verified_at']);
        });
    }
};
