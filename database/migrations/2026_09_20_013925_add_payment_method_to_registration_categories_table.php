<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Whether a paid category collects money through Midtrans (unchanged
 * default) or by asking the registrant to transfer manually and upload
 * proof, which an organizer then verifies by hand.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('registration_categories', function (Blueprint $table) {
            $table->string('payment_method')->default('midtrans')->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('registration_categories', function (Blueprint $table) {
            $table->dropColumn('payment_method');
        });
    }
};
