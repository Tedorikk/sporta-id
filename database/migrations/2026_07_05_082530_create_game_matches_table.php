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
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pool_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('round', ['pool', 'quarterfinal', 'semifinal', 'final'])->default('pool');

            $table->foreignId('team_a_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('team_b_id')->constrained('teams')->cascadeOnDelete();

            $table->unsignedInteger('team_a_score')->default(0);
            $table->unsignedInteger('team_b_score')->default(0);

            $table->string('venue')->nullable();
            $table->dateTime('scheduled_at');
            $table->enum('status', ['scheduled', 'ongoing', 'finished'])->default('scheduled');

            $table->foreignId('winner_team_id')->nullable()->constrained('teams');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};
