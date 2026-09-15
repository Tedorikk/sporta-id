<?php

use App\Models\BasketballEvent;
use App\Models\Event;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

const BACKFILL_MIGRATION = '2026_09_15_041918_backfill_registration_categories_for_basketball_categories';

/** How many migrations to roll back to land just before the backfill. */
function stepsBackToBeforeBackfill(): int
{
    return DB::table('migrations')->where('migration', '>=', BACKFILL_MIGRATION)->count();
}

/**
 * Rewinds to the schema the legacy basketball form wrote against, plants the
 * rows it used to produce, and replays the phase-1 migrations over them.
 */
function replayBackfillOver(callable $seedLegacyRows): void
{
    Artisan::call('migrate:rollback', ['--step' => stepsBackToBeforeBackfill(), '--force' => true]);

    expect(Schema::hasColumn('basketball_event_categories', 'price'))->toBeTrue();

    $seedLegacyRows();

    Artisan::call('migrate', ['--force' => true]);
}

test('legacy basketball categories and teams are backfilled into the registration system', function () {
    $event = Event::factory()->basketball()->create();
    $basketballEventId = $event->specific->id;

    replayBackfillOver(function () use ($event, $basketballEventId) {
        $categoryId = DB::table('basketball_event_categories')->insertGetId([
            'basketball_event_id' => $basketballEventId,
            'name' => 'Senior Putra',
            'slug' => 'senior-putra',
            'format' => 'pool_stage',
            'price' => 350000,
            'quota' => 16,
            'status' => 'OPEN',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach (['Alpha' => 'verified', 'Beta' => 'pending', 'Gamma' => 'rejected'] as $name => $status) {
            DB::table('teams')->insert([
                'event_id' => $event->id,
                'basketball_event_category_id' => $categoryId,
                'name' => $name,
                'status' => $status,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    });

    $category = DB::table('basketball_event_categories')->where('slug', 'senior-putra')->first();
    $registrationCategory = DB::table('registration_categories')->find($category->registration_category_id);

    expect($registrationCategory)->not->toBeNull()
        ->and($registrationCategory->event_id)->toBe($event->id)
        ->and($registrationCategory->name)->toBe('Senior Putra')
        ->and($registrationCategory->subject_type)->toBe('team')
        ->and((float) $registrationCategory->price)->toBe(350000.0)
        ->and($registrationCategory->quota)->toBe(16)
        ->and((bool) $registrationCategory->registration_open)->toBeTrue()
        // The rejected team never held a slot.
        ->and($registrationCategory->registered_count)->toBe(2)
        ->and(collect(json_decode($registrationCategory->form_pages, true))->flatMap(fn ($page) => $page['fields'])->pluck('key')->all())
        ->toBe(['bukti_pembayaran', 'nama_rekening_pembayaran']);

    $registrations = DB::table('registrations')
        ->join('teams', 'teams.id', '=', 'registrations.team_id')
        ->where('registrations.registration_category_id', $registrationCategory->id)
        ->pluck('registrations.status', 'teams.name');

    expect($registrations->all())->toBe([
        'Alpha' => 'confirmed',
        'Beta' => 'confirmed',
        'Gamma' => 'rejected',
    ]);

    expect(DB::table('registrations')->whereNull('qr_token')->orWhereNull('verification_code')->exists())->toBeFalse()
        ->and(Schema::hasColumns('basketball_event_categories', ['price', 'quota', 'status', 'max_team']))->toBeFalse()
        ->and(Schema::hasColumn('basketball_event_categories', 'roster_closes_at'))->toBeTrue();
});

test('the backfill reattaches an unlinked registration category instead of minting a duplicate', function () {
    $event = Event::factory()->basketball()->create();
    $basketballEventId = $event->specific->id;

    replayBackfillOver(function () use ($basketballEventId) {
        DB::table('basketball_event_categories')->insert([
            'basketball_event_id' => $basketballEventId,
            'name' => 'U-16',
            'slug' => 'u-16',
            'format' => 'pool_stage',
            'status' => 'OPEN',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    });

    $firstLink = DB::table('basketball_event_categories')->where('slug', 'u-16')->value('registration_category_id');

    // A rollback leaves the minted category in place but unlinked (see the
    // migration's down()); running up() again must pick it back up.
    Artisan::call('migrate:rollback', ['--step' => stepsBackToBeforeBackfill(), '--force' => true]);
    Artisan::call('migrate', ['--force' => true]);

    expect(DB::table('basketball_event_categories')->where('slug', 'u-16')->value('registration_category_id'))->toBe($firstLink)
        ->and(DB::table('registration_categories')->where('event_id', $event->id)->count())->toBe(1);
});

test('a basketball category on an event with no basketball event record is left alone', function () {
    // A BasketballEvent whose Event was deleted has no event_id to hang a
    // registration category on; the FK change would then fail loudly rather
    // than silently attaching it to the wrong event.
    $orphanBasketballEvent = BasketballEvent::factory()->create();

    expect(fn () => replayBackfillOver(function () use ($orphanBasketballEvent) {
        DB::table('basketball_event_categories')->insert([
            'basketball_event_id' => $orphanBasketballEvent->id,
            'name' => 'Orphan',
            'slug' => 'orphan',
            'format' => 'pool_stage',
            'status' => 'OPEN',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }))->toThrow(QueryException::class);
});
