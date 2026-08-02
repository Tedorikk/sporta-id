<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('basketball_event_categories', function (Blueprint $table) {
            $table->foreignId('registration_category_id')->nullable()->after('basketball_event_id')
                ->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('basketball_event_categories', function (Blueprint $table) {
            $table->dropConstrainedForeignId('registration_category_id');
        });
    }
};
