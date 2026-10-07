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
        Schema::table('registrations', function (Blueprint $table) {
            $table->timestamp('confirmation_email_sent_at')->nullable()->after('locale');
            $table->timestamp('confirmation_email_failed_at')->nullable()->after('confirmation_email_sent_at');
            $table->text('confirmation_email_failure')->nullable()->after('confirmation_email_failed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->dropColumn([
                'confirmation_email_sent_at',
                'confirmation_email_failed_at',
                'confirmation_email_failure',
            ]);
        });
    }
};
