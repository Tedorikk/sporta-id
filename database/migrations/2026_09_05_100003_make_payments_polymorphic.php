<?php

use App\Models\Registration;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Registrations were the only thing anyone could pay for, so payments pointed
 * straight at one. Paid voting adds a second payable, and rather than give it
 * a parallel table plus a parallel webhook and reconciler, payments become
 * polymorphic and both share the single money path.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->nullableMorphs('payable');
        });

        DB::table('payments')->update([
            'payable_type' => Registration::class,
            'payable_id' => DB::raw('registration_id'),
        ]);

        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('registration_id');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('registration_id')->nullable()->constrained()->cascadeOnDelete();
        });

        DB::table('payments')
            ->where('payable_type', Registration::class)
            ->update(['registration_id' => DB::raw('payable_id')]);

        Schema::table('payments', function (Blueprint $table) {
            $table->dropMorphs('payable');
        });
    }
};
