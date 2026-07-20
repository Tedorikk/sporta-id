<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('role')->default('player')->after('name');
        });

        Schema::table('players', function (Blueprint $table) {
            $table->string('jersey_number', 3)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('jersey_number', 3)->nullable(false)->change();
        });

        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
