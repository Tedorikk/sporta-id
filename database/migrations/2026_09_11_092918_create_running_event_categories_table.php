<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('running_event_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('running_event_id')->constrained()->cascadeOnDelete();
            // The public sign-up form and price live on the registration
            // category, exactly as they do for basketball categories.
            $table->foreignId('registration_category_id')->nullable()
                ->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->unsignedInteger('distance_meters');
            // Wave start. Kept per distance because a 5K and a half marathon
            // rarely start together, and the gun time is what unset finish
            // times are measured from.
            $table->dateTime('start_at')->nullable();
            $table->unsignedInteger('cutoff_minutes')->nullable();
            $table->string('bib_prefix')->nullable();
            $table->unsignedInteger('bib_start_number')->default(1);
            $table->decimal('price', 12, 2)->nullable();
            $table->unsignedInteger('quota')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique(['running_event_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('running_event_categories');
    }
};
