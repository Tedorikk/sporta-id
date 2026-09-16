<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** A team is entered by exactly one registration; individuals leave team_id null. */
    public function up(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->unique('team_id');
        });
    }

    public function down(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->dropUnique(['team_id']);
        });
    }
};
