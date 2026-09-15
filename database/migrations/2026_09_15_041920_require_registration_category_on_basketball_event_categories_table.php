<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A basketball category is now the tournament config of exactly one
     * registration category: required, one-to-one, and gone when the
     * registration category is deleted (which already cascades to its
     * registrations, and from there teams/pools/matches follow the existing
     * category cascade).
     */
    public function up(): void
    {
        Schema::table('basketball_event_categories', function (Blueprint $table) {
            $table->dropForeign(['registration_category_id']);
        });

        Schema::table('basketball_event_categories', function (Blueprint $table) {
            $table->foreignId('registration_category_id')->nullable(false)->change();
            $table->unique('registration_category_id');
            $table->foreign('registration_category_id')
                ->references('id')->on('registration_categories')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('basketball_event_categories', function (Blueprint $table) {
            $table->dropForeign(['registration_category_id']);
            $table->dropUnique(['registration_category_id']);
        });

        Schema::table('basketball_event_categories', function (Blueprint $table) {
            $table->foreignId('registration_category_id')->nullable()->change();
            $table->foreign('registration_category_id')
                ->references('id')->on('registration_categories')
                ->nullOnDelete();
        });
    }
};
