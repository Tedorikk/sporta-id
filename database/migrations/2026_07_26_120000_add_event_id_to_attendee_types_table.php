<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Defaults seeded per event — kept in sync with App\Models\AttendeeType::DEFAULTS.
     * Duplicated here (rather than referencing the model) because migrations must
     * stay correct even if the model changes later.
     */
    private const DEFAULTS = [
        ['key' => 'guest', 'label' => 'Guest', 'icon' => 'UserRound', 'color' => '#0ea5e9'],
        ['key' => 'tenant', 'label' => 'Tenant', 'icon' => 'Store', 'color' => '#16a34a'],
        ['key' => 'photographer', 'label' => 'Photographer', 'icon' => 'Camera', 'color' => '#9333ea'],
    ];

    public function up(): void
    {
        // attendee_types was originally a single global catalog shared by every
        // event. That was a design mistake — different events need different
        // rosters of ID card types. There's no sensible single event to
        // backfill the old global rows onto, and this table has been live for
        // under a day with zero real attendees attached to any of them, so
        // they're cleared and every existing event gets fresh per-event
        // defaults below instead of guessing.
        DB::table('attendee_types')->delete();

        Schema::table('attendee_types', function (Blueprint $table) {
            $table->foreignId('event_id')->after('id')->constrained()->cascadeOnDelete();
            $table->dropUnique(['key']);
            $table->unique(['event_id', 'key']);
        });

        $now = now();

        $rows = DB::table('events')->pluck('id')->flatMap(
            fn ($eventId) => collect(self::DEFAULTS)->map(fn ($type) => [
                ...$type,
                'event_id' => $eventId,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ])
        );

        foreach ($rows->chunk(200) as $chunk) {
            DB::table('attendee_types')->insert($chunk->all());
        }
    }

    public function down(): void
    {
        Schema::table('attendee_types', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'key']);
            $table->dropConstrainedForeignId('event_id');
            $table->unique('key');
        });
    }
};
