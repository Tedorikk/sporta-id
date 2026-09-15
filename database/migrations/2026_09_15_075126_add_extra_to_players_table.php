<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Answers to the organiser-defined per-member questions on a category's
     * roster block (school, class, ...), keyed by field key. Kept as JSON so
     * the next tournament can ask different questions without a migration.
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->json('extra')->nullable()->after('identity_card');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('extra');
        });
    }
};
