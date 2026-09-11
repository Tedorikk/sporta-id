<?php

use App\Models\Event;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Trades the `category` enum for a plain string so a new kind of event
     * costs one constant in {@see Event::CATEGORIES} instead of a
     * drop-and-recreate migration that throws away every existing value.
     */
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('category')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->enum('category', ['BASKETBALL', 'CONFERENCE'])->nullable()->change();
        });
    }
};
