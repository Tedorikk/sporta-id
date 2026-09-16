<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Price, quota and open/closed state now live on the linked registration
     * category (the single thing a visitor buys), so the copies here would
     * only drift. max_team goes too: the registration quota is the cap.
     * What stays is tournament config — format, points, minimum teams to run
     * a bracket, and roster limits — plus a roster deadline that can differ
     * from when sales close.
     */
    public function up(): void
    {
        Schema::table('basketball_event_categories', function (Blueprint $table) {
            $table->timestamp('roster_closes_at')->nullable()->after('max_player_per_coach');
        });

        Schema::table('basketball_event_categories', function (Blueprint $table) {
            $table->dropColumn(['price', 'quota', 'status', 'max_team']);
        });
    }

    public function down(): void
    {
        Schema::table('basketball_event_categories', function (Blueprint $table) {
            $table->integer('max_team')->nullable()->after('min_team');
            $table->decimal('price', 10, 2)->nullable();
            $table->integer('quota')->nullable();
            $table->string('status')->default('PENDING');
        });

        Schema::table('basketball_event_categories', function (Blueprint $table) {
            $table->dropColumn('roster_closes_at');
        });
    }
};
