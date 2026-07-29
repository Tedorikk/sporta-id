<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('basketball_events', function (Blueprint $table) {
            $table->boolean('registration_open')->default(true)->after('pool_drawing_date');
        });
    }

    public function down(): void
    {
        Schema::table('basketball_events', function (Blueprint $table) {
            $table->dropColumn('registration_open');
        });
    }
};
