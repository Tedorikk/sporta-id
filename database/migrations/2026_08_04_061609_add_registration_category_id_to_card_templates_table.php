<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('card_templates', function (Blueprint $table) {
            $table->foreignId('registration_category_id')->nullable()->after('attendee_type_id')->constrained()->cascadeOnDelete();

            $table->index(['event_id', 'subject_type', 'registration_category_id']);
        });
    }

    public function down(): void
    {
        Schema::table('card_templates', function (Blueprint $table) {
            $table->dropIndex(['event_id', 'subject_type', 'registration_category_id']);
            $table->dropConstrainedForeignId('registration_category_id');
        });
    }
};
