<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The language the registrant used on the form. A paid registration's
     * confirmation goes out from the Midtrans webhook, with no request (and so
     * no locale) to hand — the mail has to read it from the record.
     */
    public function up(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->string('locale', 5)->default('id')->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->dropColumn('locale');
        });
    }
};
