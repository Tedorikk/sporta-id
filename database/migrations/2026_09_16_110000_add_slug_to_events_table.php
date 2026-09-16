<?php

use App\Models\Event;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SQLite has no in-place ALTER COLUMN, so both `->change()` below and
     * `dropColumn()` in down() rebuild the whole `events` table (temp
     * table, drop, recreate, copy, rename). `events` is the cascadeOnDelete
     * parent of registration_categories, teams, and everything else hung
     * off an event, and with the foreign_keys pragma stuck on inside a
     * transaction (its toggle is a no-op there), that DROP TABLE cascades
     * and wipes every one of them. Running outside a transaction lets the
     * pragma disable for real around the rebuild.
     */
    public $withinTransaction = false;

    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('name');
        });

        Event::withoutEvents(function () {
            Event::whereNull('slug')->orderBy('id')->each(function (Event $event) {
                $event->forceFill(['slug' => Event::uniqueSlugFor($event->name)])->save();
            });
        });

        Schema::table('events', function (Blueprint $table) {
            $table->string('slug')->nullable(false)->change();
            $table->unique('slug');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            // SQLite refuses to drop a column that's still covered by an
            // explicit index (unlike an inline unique constraint) — the
            // index has to go first.
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};
