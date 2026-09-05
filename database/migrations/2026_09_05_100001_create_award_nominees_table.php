<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('award_nominees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('award_id')->constrained()->cascadeOnDelete();

            // Player or Team. Kept polymorphic so a future award over some
            // other subject does not need a second nominee table.
            $table->morphs('nominee');

            // Both optional overrides: by default a nominee renders with the
            // underlying player's or team's own name and photo.
            $table->string('display_name')->nullable();
            $table->string('photo')->nullable();

            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['award_id', 'nominee_type', 'nominee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('award_nominees');
    }
};
