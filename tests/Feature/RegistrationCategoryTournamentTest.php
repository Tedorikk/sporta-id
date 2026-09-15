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
        'format' => BasketballEventCategory::FORMAT_POOL_STAGE,
        'win_points' => 2,
        'loss_points' => 1,
        'min_team' => 4,
        'min_player_per_team' => 5,
        'max_player_per_team' => 12,
        'max_player_per_coach' => null,
        'roster_closes_at' => null,
    ], $overrides);
}

function teamCategoryPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Under 18',
        'subject_type' => RegistrationCategory::SUBJECT_TEAM,
        'price' => null,
        'quota' => 16,
        'registration_open' => true,
        'form_pages' => [['key' => 'page-1', 'title' => 'Details', 'fields' => []]],
    ], $overrides);
}

// ─── Create ─────────────────────────────────────────────────────────────────

test('a team category with tournament settings creates the basketball category alongside it', function () {
    $event = Event::factory()->basketball()->create();
    $this->actingAs(organizerOf($event));

    $this->post(route('registration_categories.store', $event), teamCategoryPayload([
        'tournament' => tournamentPayload(['roster_closes_at' => '2026-12-01T18:00']),
    ]))->assertRedirect(route('registration_categories.index', $event));

    $registrationCategory = RegistrationCategory::sole();
    $tournament = $registrationCategory->basketballCategory;

    expect($registrationCategory->isTeamTournament())->toBeTrue()
        ->and($tournament->basketball_event_id)->toBe($event->specific->id)
        ->and($tournament->name)->toBe('Under 18')
        ->and($tournament->format)->toBe(BasketballEventCategory::FORMAT_POOL_STAGE)
        ->and($tournament->min_team)->toBe(4)
        ->and($tournament->max_player_per_team)->toBe(12)
        ->and($tournament->roster_closes_at?->format('Y-m-d H:i'))->toBe('2026-12-01 18:00');
});

test('the default basketball form carries the roster block, payment evidence and paperwork', function () {
    $event = Event::factory()->basketball()->create();
    $this->actingAs(organizerOf($event));

    $this->post(route('registration_categories.store', $event), teamCategoryPayload([
        'tournament' => tournamentPayload(),
        'form_pages' => BasketballEventCategory::defaultFormPages(),
    ]))->assertRedirect()->assertSessionHasNoErrors();

    $registrationCategory = RegistrationCategory::sole();

    // The roster's members are kept out of form_data — they become the team sheet.
    expect($registrationCategory->rosterField()['slots'])->toHaveCount(4)
        ->and(collect($registrationCategory->rosterMemberFields())->pluck('key')->all())->toBe(['asal_sekolah', 'kelas'])
        ->and(collect($registrationCategory->inputFields())->pluck('key')->all())
        ->toBe(['asal_kabupaten_kota', 'bukti_pembayaran', 'nama_rekening_pembayaran', 'surat_pernyataan', 'lisensi_tim_medis']);
});

test('a team category without tournament settings is just a registration category', function () {
    $event = Event::factory()->basketball()->create();
    $this->actingAs(organizerOf($event));

    $this->post(route('registration_categories.store', $event), teamCategoryPayload())
        ->assertRedirect();

    expect(RegistrationCategory::sole()->basketballCategory)->toBeNull()
        ->and(BasketballEventCategory::count())->toBe(0);
});

test('tournament settings are rejected on an event that is not a basketball event', function () {
    $event = Event::factory()->create(['category' => 'CONFERENCE']);
    $this->actingAs(organizerOf($event));

    $this->from(route('registration_categories.index', $event))
        ->post(route('registration_categories.store', $event), teamCategoryPayload([
            'tournament' => tournamentPayload(),
        ]))
        ->assertRedirect(route('registration_categories.index', $event))
        ->assertSessionHasErrors('tournament');

    expect(RegistrationCategory::count())->toBe(0);
});

test('tournament settings are rejected on an individual category', function () {
    $event = Event::factory()->basketball()->create();
    $this->actingAs(organizerOf($event));

    $this->post(route('registration_categories.store', $event), teamCategoryPayload([
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'tournament' => tournamentPayload(),
    ]))->assertSessionHasErrors('tournament');

    // The transaction rolled everything back.
    expect(RegistrationCategory::count())->toBe(0)
        ->and(BasketballEventCategory::count())->toBe(0);
});

test('tournament settings are validated', function () {
    $event = Event::factory()->basketball()->create();
    $this->actingAs(organizerOf($event));

    $this->post(route('registration_categories.store', $event), teamCategoryPayload([
        'tournament' => tournamentPayload([
            'format' => 'double_elimination',
            'min_team' => 1,
            'min_player_per_team' => 8,
            'max_player_per_team' => 5,
        ]),
    ]))->assertSessionHasErrors([
        'tournament.format',
        'tournament.min_team',
        'tournament.max_player_per_team',
    ]);
});

// ─── Update ─────────────────────────────────────────────────────────────────

test('updating a tournament category renames and reconfigures the basketball category', function () {
    $event = Event::factory()->basketball()->create();
    $tournament = BasketballEventCategory::factory()->forEvent($event)->create(['name' => 'Under 18']);
    $this->actingAs(organizerOf($event));

    $this->put(route('registration_categories.update', [$event, $tournament->registrationCategory]), teamCategoryPayload([
        'name' => 'Under 19',
        'tournament' => tournamentPayload([
            'format' => BasketballEventCategory::FORMAT_ROUND_ROBIN,
            'win_points' => 3,
        ]),
    ]))->assertRedirect();

    $tournament->refresh();

    expect($tournament->name)->toBe('Under 19')
        ->and($tournament->registrationCategory->name)->toBe('Under 19')
        ->and($tournament->format)->toBe(BasketballEventCategory::FORMAT_ROUND_ROBIN)
        ->and($tournament->win_points)->toBe(3)
        ->and(BasketballEventCategory::count())->toBe(1);
});

test('a plain team category can gain tournament settings later', function () {
    $event = Event::factory()->basketball()->create();
    $registrationCategory = RegistrationCategory::factory()->team()->for($event)->create();
    $this->actingAs(organizerOf($event));

    $this->put(route('registration_categories.update', [$event, $registrationCategory]), teamCategoryPayload([
        'name' => $registrationCategory->name,
        'tournament' => tournamentPayload(),
    ]))->assertRedirect();

    expect($registrationCategory->fresh()->basketballCategory)->not->toBeNull();
});

test('omitting tournament settings on update keeps the existing tournament and syncs its name', function () {
    $event = Event::factory()->basketball()->create();
    $tournament = BasketballEventCategory::factory()->forEvent($event)->create(['name' => 'Under 18']);
    $this->actingAs(organizerOf($event));

    $this->put(route('registration_categories.update', [$event, $tournament->registrationCategory]), teamCategoryPayload([
        'name' => 'Under 20',
    ]))->assertRedirect();

    expect($tournament->fresh()->name)->toBe('Under 20')
        ->and(BasketballEventCategory::count())->toBe(1);
});

// ─── Delete ─────────────────────────────────────────────────────────────────

test('deleting a tournament category removes its basketball category with it', function () {
    $event = Event::factory()->basketball()->create();
    $tournament = BasketballEventCategory::factory()->forEvent($event)->create();
    $this->actingAs(organizerOf($event));

    $this->delete(route('registration_categories.destroy', [$event, $tournament->registrationCategory]))
        ->assertRedirect();

    expect(BasketballEventCategory::find($tournament->id))->toBeNull()
        ->and(RegistrationCategory::find($tournament->registration_category_id))->toBeNull();
});

test('a tournament category with registrations cannot be deleted', function () {
    $event = Event::factory()->basketball()->create();
    $tournament = BasketballEventCategory::factory()->forEvent($event)->create();
    $team = Team::factory()->create(['event_id' => $event->id, 'basketball_event_category_id' => $tournament->id]);
    Registration::create([
        'registration_category_id' => $tournament->registration_category_id,
        'event_id' => $event->id,
        'team_id' => $team->id,
        'name' => $team->name,
        'status' => Registration::STATUS_CONFIRMED,
    ]);
    $this->actingAs(organizerOf($event));

    $this->delete(route('registration_categories.destroy', [$event, $tournament->registrationCategory]))
        ->assertRedirect()
        ->assertSessionHas('toast.title', 'Error');

    expect(BasketballEventCategory::find($tournament->id))->not->toBeNull();
});

// ─── Pages ──────────────────────────────────────────────────────────────────

test('the category pages tell the builder whether the event runs basketball', function () {
    $event = Event::factory()->basketball()->create();
    $tournament = BasketballEventCategory::factory()->forEvent($event)->create();
    $this->actingAs(organizerOf($event));

    $this->get(route('registration_categories.index', $event))
        ->assertInertia(fn ($page) => $page
            ->where('isBasketballEvent', true)
            ->where('registrationCategories.0.basketball_category.id', $tournament->id));

    $this->get(route('registration_categories.builder', [$event, 'registration_category_id' => $tournament->registration_category_id]))
        ->assertInertia(fn ($page) => $page
            ->where('isBasketballEvent', true)
            ->where('registrationCategory.basketball_category.format', $tournament->format));

    $conference = Event::factory()->create(['organization_id' => $event->organization_id, 'category' => 'CONFERENCE']);

    $this->get(route('registration_categories.index', $conference))
        ->assertInertia(fn ($page) => $page->where('isBasketballEvent', false));
});

// ─── Model invariants ───────────────────────────────────────────────────────

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
