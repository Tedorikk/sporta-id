<?php

use App\Models\Attendee;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendees', function (Blueprint $table) {
            $table->string('verification_code', 16)->nullable()->after('qr_token');
        });

        // Attendees that already exist would otherwise print a blank code and
        // verify against nothing.
        DB::table('attendees')->whereNull('verification_code')->orderBy('id')
            ->chunkById(500, function ($attendees) {
                foreach ($attendees as $attendee) {
                    DB::table('attendees')
                        ->where('id', $attendee->id)
                        ->update(['verification_code' => Attendee::generateVerificationCode()]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('attendees', function (Blueprint $table) {
            $table->dropColumn('verification_code');
        });
    }
};
