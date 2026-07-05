<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('basketball_events', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('max_players_per_team')->default(15);
            $table->dateTime('pool_drawing_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('basketball_events');
    }
};
