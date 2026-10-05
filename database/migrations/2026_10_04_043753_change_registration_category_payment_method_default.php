<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }
        Schema::table('registration_categories', function (Blueprint $table) {
            $table->string('payment_method')->default('online')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('registration_categories')
            ->where('payment_method', 'online')
            ->update(['payment_method' => 'midtrans']);

        if (DB::getDriverName() === 'sqlite') {
            return;
        }
        Schema::table('registration_categories', function (Blueprint $table) {
            $table->string('payment_method')->default('midtrans')->change();
        });
    }
};
