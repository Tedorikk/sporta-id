<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->renameColumn('team_a_id', 'home_team_id');
            $table->renameColumn('team_b_id', 'away_team_id');

            $table->renameColumn('team_a_score', 'home_score');
            $table->renameColumn('team_b_score', 'away_score');
        });
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->renameColumn('home_team_id', 'team_a_id');
            $table->renameColumn('away_team_id', 'team_b_id');

            $table->renameColumn('home_score', 'team_a_score');
            $table->renameColumn('away_score', 'team_b_score');
        });
    }
};
