<?php

use App\Models\Registration;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->string('verification_code', 16)->nullable()->after('qr_token');
        });

        // Registrations that already exist would otherwise print a blank code
        // and verify against nothing.
        DB::table('registrations')->whereNull('verification_code')->orderBy('id')
            ->chunkById(500, function ($registrations) {
                foreach ($registrations as $registration) {
                    DB::table('registrations')
                        ->where('id', $registration->id)
                        ->update(['verification_code' => Registration::generateVerificationCode()]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->dropColumn('verification_code');
        });
    }
};
