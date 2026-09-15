<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A per-membership secret the team manager can hand to a player so they
     * fill in their own photo, document and birth details. On the pivot, not
     * on players: the same person can be on several teams across events, and
     * the link must resolve to one sheet. Kept apart from players.qr_token,
     * which is printed on ID cards and scanned at check-in — a public
     * identifier must never double as a write credential. Minted lazily the
     * first time a manager asks for a link (RosterService::inviteTokenFor).
     */
    public function up(): void
    {
        Schema::table('player_team', function (Blueprint $table) {
            $table->string('invite_token', 64)->nullable()->unique()->after('team_id');
        });
    }

    public function down(): void
    {
        Schema::table('player_team', function (Blueprint $table) {
            $table->dropUnique(['invite_token']);
            $table->dropColumn('invite_token');
        });
    }
};
