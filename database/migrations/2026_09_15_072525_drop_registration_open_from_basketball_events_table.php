<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The event-wide switch only gated the legacy basketball form. Each
     * registration category now carries its own open flag and window.
     */
    public function up(): void
    {
        Schema::table('basketball_events', function (Blueprint $table) {
            $table->dropColumn('registration_open');
        });
    }

    public function down(): void
    {
        Schema::table('basketball_events', function (Blueprint $table) {
            $table->boolean('registration_open')->default(true)->after('pool_drawing_date');
        });
    }
};
