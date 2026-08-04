<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Guarded: on MySQL, the very first run of this migration added the
        // column successfully but then failed on the (too-long) index name
        // below, so the column can already exist when this is retried.
        if (! Schema::hasColumn('card_templates', 'registration_category_id')) {
            Schema::table('card_templates', function (Blueprint $table) {
                $table->foreignId('registration_category_id')->nullable()->after('attendee_type_id')->constrained()->cascadeOnDelete();
            });
        }

        Schema::table('card_templates', function (Blueprint $table) {
            // Explicit, short name — the auto-generated one for this column
            // combo exceeds MySQL's 64-character identifier limit.
            $table->index(['event_id', 'subject_type', 'registration_category_id'], 'card_templates_scope_index');
        });
    }

    public function down(): void
    {
        Schema::table('card_templates', function (Blueprint $table) {
            $table->dropIndex('card_templates_scope_index');
            $table->dropConstrainedForeignId('registration_category_id');
        });
    }
};
