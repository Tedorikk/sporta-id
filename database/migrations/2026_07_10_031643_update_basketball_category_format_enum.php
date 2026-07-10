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
        Schema::table('basketball_event_categories', function (Blueprint $table) {
            $table->dropColumn('format');
            $table->enum('format', [
                'round_robin',
                'pool_stage',
            ])->default('pool_stage')->after('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
