<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matches', function (Blueprint $table) {
            $table->id();

            // Scoped to category, not event — rules (round robin vs pool) differ per category
            $table->foreignId('basketball_event_category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pool_id')->nullable()->constrained()->nullOnDelete();

            // 'group' covers both round-robin and pool-stage matches
            $table->enum('round', ['group', 'round_of_16', 'quarterfinal', 'semifinal', 'final'])->default('group');
            $table->unsignedInteger('match_number')->default(1);

            // Nullable + nullOnDelete: bracket slots start empty (filled by winners),
            // and deleting a team shouldn't wipe match history
            $table->foreignId('team_a_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->foreignId('team_b_id')->nullable()->constrained('teams')->nullOnDelete();

            // Links a knockout match to the two matches feeding it, so the winner can auto-advance
            $table->foreignId('team_a_source_match_id')->nullable()->constrained('matches')->nullOnDelete();
            $table->foreignId('team_b_source_match_id')->nullable()->constrained('matches')->nullOnDelete();

            // Nullable, not default(0) — must distinguish "not played" from an actual 0-0 score
            $table->unsignedInteger('team_a_score')->nullable();
            $table->unsignedInteger('team_b_score')->nullable();

            $table->string('venue')->nullable();
            $table->dateTime('scheduled_at')->nullable();
            $table->enum('status', ['scheduled', 'ongoing', 'finished'])->default('scheduled');

            $table->foreignId('winner_team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};