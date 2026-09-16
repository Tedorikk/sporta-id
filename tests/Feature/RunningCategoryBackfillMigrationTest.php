<?php

use App\Models\Event;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

const RUNNING_BACKFILL_MIGRATION = '2026_09_16_090000_backfill_registration_categories_for_running_categories';

function stepsBackToBeforeRunningBackfill(): int
{
    return DB::table('migrations')->where('migration', '>=', RUNNING_BACKFILL_MIGRATION)->count();
}

/**
 * Rewinds to the schema where a distance carried its own price and pointed
 * at a form, plants rows in that shape, and replays the migration over them.
 */
function replayRunningBackfillOver(callable $seedLegacyRows): void
{
    Artisan::call('migrate:rollback', ['--step' => stepsBackToBeforeRunningBackfill(), '--force' => true]);

    expect(Schema::hasColumn('running_event_categories', 'price'))->toBeTrue()
        ->and(Schema::hasColumn('registration_categories', 'running_event_category_id'))->toBeFalse();

    $seedLegacyRows();

    Artisan::call('migrate', ['--force' => true]);
}

function legacyDistance(int $runningEventId, string $name, array $overrides = []): int
{
    return DB::table('running_event_categories')->insertGetId([
        'running_event_id' => $runningEventId,
        'name' => $name,
        'slug' => str($name)->slug().'-x',
        'distance_meters' => 10000,
        'bib_start_number' => 1,
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
        ...$overrides,
    ]);
}

test('a distance that pointed at a form is flipped so the form points at the distance', function () {
    $event = Event::factory()->running()->create();
    $runningEventId = $event->specific->id;

    replayRunningBackfillOver(function () use ($event, $runningEventId) {
        $formId = DB::table('registration_categories')->insertGetId([
            'event_id' => $event->id,
            'name' => '10K Entry',
            'slug' => '10k-entry',
            'subject_type' => 'individual',
            'price' => 150000,
            'form_pages' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        legacyDistance($runningEventId, '10K', ['registration_category_id' => $formId, 'price' => 150000, 'quota' => 500]);
    });

    $distance = DB::table('running_event_categories')->where('name', '10K')->first();
    $form = DB::table('registration_categories')->where('name', '10K Entry')->first();

    expect($form->running_event_category_id)->toBe($distance->id)
        ->and(DB::table('registration_categories')->where('event_id', $event->id)->count())->toBe(1)
        ->and(Schema::hasColumns('running_event_categories', ['price', 'quota', 'status', 'registration_category_id']))->toBeFalse()
        ->and(Schema::hasColumns('running_event_categories', ['bib_start_male', 'bib_start_female', 'minimum_age']))->toBeTrue()
        ->and(Schema::hasColumns('race_participants', ['gender', 'dob']))->toBeTrue();
});

test('a distance selling on its own gets a registration category carrying its price and quota', function () {
    $event = Event::factory()->running()->create();
    $runningEventId = $event->specific->id;

    replayRunningBackfillOver(function () use ($runningEventId) {
        legacyDistance($runningEventId, 'Half Marathon', ['price' => 250000, 'quota' => 300]);
        legacyDistance($runningEventId, 'Kids Dash', ['status' => 'closed']);
    });

    $half = DB::table('registration_categories')->where('name', 'Half Marathon')->first();
    $kids = DB::table('registration_categories')->where('name', 'Kids Dash')->first();

    expect($half->running_event_category_id)->toBe(DB::table('running_event_categories')->where('name', 'Half Marathon')->value('id'))
        ->and($half->subject_type)->toBe('individual')
        ->and((float) $half->price)->toBe(250000.0)
        ->and($half->quota)->toBe(300)
        ->and((bool) $half->registration_open)->toBeTrue()
        ->and(collect(json_decode($half->form_pages, true))->flatMap(fn ($page) => $page['fields'])->pluck('key')->all())
        ->toContain('gender', 'dob', 'photo')
        ->and((bool) $kids->registration_open)->toBeFalse();
});

test('the backfill reattaches an unlinked registration category instead of minting a duplicate', function () {
    $event = Event::factory()->running()->create();
    $runningEventId = $event->specific->id;

    replayRunningBackfillOver(fn () => legacyDistance($runningEventId, '5K'));

    $firstId = DB::table('registration_categories')->where('name', '5K')->value('id');

    Artisan::call('migrate:rollback', ['--step' => stepsBackToBeforeRunningBackfill(), '--force' => true]);
    Artisan::call('migrate', ['--force' => true]);

    $distanceId = DB::table('running_event_categories')->where('name', '5K')->value('id');

    expect(DB::table('registration_categories')->where('name', '5K')->value('id'))->toBe($firstId)
        ->and(DB::table('registration_categories')->where('name', '5K')->value('running_event_category_id'))->toBe($distanceId)
        ->and(DB::table('registration_categories')->where('event_id', $event->id)->count())->toBe(1);
});
