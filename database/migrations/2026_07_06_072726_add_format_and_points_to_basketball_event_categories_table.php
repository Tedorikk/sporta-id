<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('basketball_event_categories', function (Blueprint $table) {
            // Drives which generator runs: RoundRobinService::generateForCategory() vs PoolService
            $table->enum('format', ['round_robin', 'pool'])->default('pool')->after('name');

            // Configurable per category since win/loss scoring wasn't confirmed
            // (Bang Bryan handles klasemen manually — see notes)
            $table->unsignedTinyInteger('win_points')->default(2)->after('format');
            $table->unsignedTinyInteger('loss_points')->default(1)->after('win_points');
        });
    }

    public function down(): void
    {
        Schema::table('basketball_event_categories', function (Blueprint $table) {
            $table->dropColumn(['format', 'win_points', 'loss_points']);
        });
    }
};
