<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pools', function (Blueprint $table) {
            $table->id();

            // Scoped to category (not event) — a category is either "pool" or "round_robin" format,
            // and beda kategori bisa punya pool set yang beda meski dalam satu event
            $table->foreignId('basketball_event_category_id')->constrained()->cascadeOnDelete();

            $table->string('name');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pools');
    }
};