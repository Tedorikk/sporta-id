<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * What a basketball entry collects per roster member, beyond what the
     * players table already holds (name, WhatsApp as phone_number, dob):
     * place of birth and an identity document.
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('birthplace')->nullable()->after('dob');
            $table->string('identity_card')->nullable()->after('birthplace');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(['birthplace', 'identity_card']);
        });
    }
};
