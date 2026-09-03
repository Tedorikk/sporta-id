<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('photo')->nullable()->after('position');
            $table->string('phone_number')->nullable()->after('photo');
            $table->string('email')->nullable()->after('phone_number');
            $table->date('dob')->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(['photo', 'phone_number', 'email', 'dob']);
        });
    }
};
