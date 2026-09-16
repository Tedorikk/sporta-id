<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('running_events', function (Blueprint $table) {
            $table->id();
            $table->boolean('registration_open')->default(true);
            // Results stay private while times are still being entered or
            // corrected; publishing is what puts the leaderboard on the
            // public event page.
            $table->boolean('results_published')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('running_events');
    }
};
