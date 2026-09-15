<?php

use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\Team;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function tournamentPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Under 18',
        'format' => BasketballEventCategory::FORMAT_POOL_STAGE,
        'min_team' => 4,
        'min_player_per_team' => 5,
        'max_player_per_team' => 12,
        'max_player_per_coach' => null,
        'roster_closes_at' => null,
    ], $overrides);
}

test('creating a basketball category mints a team registration category on the same event', function () {
    $event = Event::factory()->basketball()->create();
    $this->actingAs(organizerOf($event));

    $this->post(route('basketball_categories.store', $event), tournamentPayload())
        ->assertRedirect()
        ->assertSessionHas('toast.title', 'Success');

    $category = BasketballEventCategory::sole();
    $registrationCategory = $category->registrationCategory;

    expect($category->basketball_event_id)->toBe($event->specific->id)
        ->and($registrationCategory)->not->toBeNull()
        ->and($registrationCategory->event_id)->toBe($event->id)
        ->and($registrationCategory->name)->toBe('Under 18')
        ->and($registrationCategory->subject_type)->toBe(RegistrationCategory::SUBJECT_TEAM)
        ->and($registrationCategory->isTeamTournament())->toBeTrue()
        // Bank-transfer evidence is on the form from the start.
        ->and(collect($registrationCategory->inputFields())->pluck('key')->all())
        ->toBe(['bukti_pembayaran', 'nama_rekening_pembayaran']);
});

test('the dropped sales fields are ignored on create', function () {
    $event = Event::factory()->basketball()->create();
    $this->actingAs(organizerOf($event));

    $this->post(route('basketball_categories.store', $event), tournamentPayload([
        'price' => 250000,
        'quota' => 16,
        'status' => 'OPEN',
        'max_team' => 16,
    ]))->assertRedirect()->assertSessionHas('toast.title', 'Success');

    // Price and quota are only set through the registration category.
    expect(BasketballEventCategory::sole()->registrationCategory->price)->toBeNull();
});

test('renaming a basketball category renames its registration category too', function () {
    $event = Event::factory()->basketball()->create();
    $category = BasketballEventCategory::factory()->forEvent($event)->create(['name' => 'Under 18']);
    $this->actingAs(organizerOf($event));

    $this->put(route('basketball_categories.update', [$event, $category]), tournamentPayload([
        'name' => 'Under 19',
        'roster_closes_at' => '2026-12-01T18:00',
    ]))->assertRedirect()->assertSessionHas('toast.title', 'Success');

    $category->refresh();

    expect($category->name)->toBe('Under 19')
        ->and($category->registrationCategory->name)->toBe('Under 19')
        ->and($category->roster_closes_at?->format('Y-m-d H:i'))->toBe('2026-12-01 18:00');
});

test('deleting a basketball category removes the registration category with it', function () {
    $event = Event::factory()->basketball()->create();
    $category = BasketballEventCategory::factory()->forEvent($event)->create();
    $registrationCategoryId = $category->registration_category_id;
    $this->actingAs(organizerOf($event));

    $this->delete(route('basketball_categories.destroy', [$event, $category]))
        ->assertRedirect()
        ->assertSessionHas('toast.title', 'Success');

    expect(BasketballEventCategory::find($category->id))->toBeNull()
        ->and(RegistrationCategory::find($registrationCategoryId))->toBeNull();
});

test('a basketball category with registrations cannot be deleted', function () {
    $event = Event::factory()->basketball()->create();
    $category = BasketballEventCategory::factory()->forEvent($event)->create();
    $team = Team::factory()->create(['event_id' => $event->id, 'basketball_event_category_id' => $category->id]);
    Registration::create([
        'registration_category_id' => $category->registration_category_id,
        'event_id' => $event->id,
        'team_id' => $team->id,
        'name' => $team->name,
        'status' => Registration::STATUS_CONFIRMED,
    ]);
    $this->actingAs(organizerOf($event));

    $this->delete(route('basketball_categories.destroy', [$event, $category]))
        ->assertRedirect()
        ->assertSessionHas('toast.title', 'Error');

    expect(BasketballEventCategory::find($category->id))->not->toBeNull();
});

test('a team can be entered by only one registration', function () {
    $event = Event::factory()->basketball()->create();
    $category = BasketballEventCategory::factory()->forEvent($event)->create();
    $team = Team::factory()->create(['event_id' => $event->id, 'basketball_event_category_id' => $category->id]);

    $make = fn () => Registration::create([
        'registration_category_id' => $category->registration_category_id,
        'event_id' => $event->id,
        'team_id' => $team->id,
        'name' => $team->name,
    ]);

    $make();

    expect($make)->toThrow(UniqueConstraintViolationException::class);
});

test('roster edits lock on verification or after the roster deadline', function () {
    $event = Event::factory()->basketball()->create();
    $category = BasketballEventCategory::factory()->forEvent($event)->create();
    $team = Team::factory()->pending()->create(['event_id' => $event->id, 'basketball_event_category_id' => $category->id]);

    expect($team->rosterLocked())->toBeFalse();

    $category->update(['roster_closes_at' => now()->subMinute()]);
    expect($team->fresh()->rosterLocked())->toBeTrue();

    $category->update(['roster_closes_at' => null]);
    $category->registrationCategory->update(['closes_at' => now()->subMinute()]);
    expect($team->fresh()->rosterLocked())->toBeTrue();

    $category->registrationCategory->update(['closes_at' => null]);
    $team->update(['status' => 'verified']);
    expect($team->fresh()->rosterLocked())->toBeTrue();
});
