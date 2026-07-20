<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Backfill: one role=manager Player per team that has a manager_name,
        // attached via the pivot, so the contact info isn't silently lost.
        DB::table('teams')->whereNotNull('manager_name')->orderBy('id')->each(function ($team) {
            $playerId = DB::table('players')->insertGetId([
                'name' => $team->manager_name,
                'role' => 'manager',
                'phone_number' => $team->manager_phone,
                'qr_token' => (string) Str::uuid(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('player_team')->insert([
                'player_id' => $playerId,
                'team_id' => $team->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn(['manager_name', 'manager_phone']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->string('manager_name')->nullable();
            $table->string('manager_phone')->nullable();
        });
    }
};
