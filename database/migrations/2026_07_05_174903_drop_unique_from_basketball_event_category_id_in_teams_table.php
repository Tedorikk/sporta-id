<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            // MySQL won't drop the unique index while it's the only index backing the FK,
            // so add a plain index to take over that role first.
            $table->index('basketball_event_category_id');
            $table->dropUnique(['basketball_event_category_id']);
        });
    }

    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->unique('basketball_event_category_id');
            $table->dropIndex(['basketball_event_category_id']);
        });
    }
};
