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
        Schema::create('basketball_event_categories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('basketball_event_id')->constrained('basketball_events')->onDelete('cascade');
            $table->string('name');
            $table->string('slug')->unique();
            $table->integer('min_team')->default(2);
            $table->integer('max_team')->nullable();
            $table->integer('min_player_per_team')->default(5);
            $table->integer('max_player_per_team')->nullable();
            $table->integer('max_player_per_coach')->nullable();
            $table->decimal('price', 10, 2)->nullable();
            $table->integer('quota')->nullable();
            $table->string('status')->default('PENDING');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('basketball_event_categories');
    }
};
