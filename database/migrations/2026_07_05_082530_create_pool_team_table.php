<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pool_team', function (Blueprint $table) {
            $table->foreignId('pool_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->primary(['pool_id', 'team_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pool_team');
    }
};
