<?php

use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\Player;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/** A confirmed team registration in a tournament category, ready for roster entry. */
function enteredTeam(array $tournament = [], string $teamStatus = Team::STATUS_PENDING): Registration
{
    $event = Event::factory()->basketball()->create();
    $category = BasketballEventCategory::factory()->forEvent($event)->create(array_merge([
        'min_player_per_team' => 5,
        'max_player_per_team' => 12,
    ], $tournament));
    $team = Team::factory()->create([
        'event_id' => $event->id,
        'basketball_event_category_id' => $category->id,
        'status' => $teamStatus,
    ]);

    return Registration::create([
        'registration_category_id' => $category->registration_category_id,
        'event_id' => $event->id,
        'team_id' => $team->id,
        'name' => $team->name,
        'status' => Registration::STATUS_CONFIRMED,
    ]);
}

function memberPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Budi Santoso',
        'role' => Player::ROLE_PLAYER,
        'jersey_number' => '7',
        'position' => 'PG',
        'photo' => 'https://example.com/budi.jpg',
        'identity_card' => 'https://example.com/budi-ktp.pdf',
        'birthplace' => 'Pontianak',
        'dob' => '2008-05-14',
        'phone_number' => '+6281234567890',
    ], $overrides);
}

// ─── Viewing ────────────────────────────────────────────────────────────────

test('the roster page opens by token and shows limits and members', function () {
    $registration = enteredTeam();
    $registration->team->players()->create(memberPayload());

    $this->get(route('team-roster.show', $registration))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('team-roster')
            ->where('team.name', $registration->team->name)
            ->where('lock', null)
            ->where('limits.players', 1)
            ->where('limits.min_players', 5)
            ->where('limits.max_players', 12)
            ->where('limits.complete', false)
            ->has('members', 1)
            ->where('members.0.name', 'Budi Santoso'));
});

test('the roster page is not reachable by numeric id', function () {
    $registration = enteredTeam();

    $this->get("/registrations/{$registration->id}/roster")->assertNotFound();
});

test('an individual registration has no roster page', function () {
    $event = Event::factory()->create();
    $category = RegistrationCategory::factory()->individual()->for($event)->create();
    $registration = Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => 'Solo Runner',
        'status' => Registration::STATUS_CONFIRMED,
    ]);

    $this->get(route('team-roster.show', $registration))->assertNotFound();
});

test('a team outside any tournament category has no roster page', function () {
    $event = Event::factory()->basketball()->create();
    $category = RegistrationCategory::factory()->team()->for($event)->create();
    $team = Team::factory()->create(['event_id' => $event->id, 'basketball_event_category_id' => null]);
    $registration = Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'team_id' => $team->id,
        'name' => $team->name,
        'status' => Registration::STATUS_CONFIRMED,
    ]);

    $this->get(route('team-roster.show', $registration))->assertNotFound();
});

// ─── Adding members ─────────────────────────────────────────────────────────

test('a captain can add a player with the full identity details', function () {
    $registration = enteredTeam();

    $this->post(route('team-roster.store', $registration), memberPayload())
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $player = $registration->team->players()->sole();

    expect($player->name)->toBe('Budi Santoso')
        ->and($player->birthplace)->toBe('Pontianak')
        ->and($player->identity_card)->toBe('https://example.com/budi-ktp.pdf')
        ->and($player->dob->format('Y-m-d'))->toBe('2008-05-14')
        ->and($player->phone_number)->toBe('+6281234567890')
        ->and($player->qr_token)->not->toBeEmpty();
});

test('the portal requires identity document, birth details, photo and WhatsApp number', function () {
    $registration = enteredTeam();

    $this->post(route('team-roster.store', $registration), [
        'name' => 'Sparse',
        'role' => Player::ROLE_PLAYER,
        'jersey_number' => '9',
        'phone_number' => '0812345',
    ])->assertSessionHasErrors(['photo', 'identity_card', 'birthplace', 'dob', 'phone_number']);

    expect($registration->team->players()->count())->toBe(0);
});

test('jersey numbers must be unique within the team', function () {
    $registration = enteredTeam();
    $registration->team->players()->create(memberPayload(['jersey_number' => '7']));

    $this->post(route('team-roster.store', $registration), memberPayload(['name' => 'Another', 'jersey_number' => '7']))
        ->assertSessionHasErrors('jersey_number');
});

test('staff need no jersey number but a medic needs a certificate', function () {
    $registration = enteredTeam();

    $this->post(route('team-roster.store', $registration), memberPayload([
        'name' => 'Coach K', 'role' => Player::ROLE_COACH, 'jersey_number' => null,
    ]))->assertSessionHasNoErrors();

    $this->post(route('team-roster.store', $registration), memberPayload([
        'name' => 'Dr. Sari', 'role' => Player::ROLE_MEDIC, 'jersey_number' => null,
    ]))->assertSessionHasErrors('certificate');
});

test('the player cap from the category is enforced, staff excluded', function () {
    $registration = enteredTeam(['max_player_per_team' => 2]);
    $team = $registration->team;
    $team->players()->create(memberPayload(['jersey_number' => '1']));
    $team->players()->create(memberPayload(['jersey_number' => '2']));

    $this->post(route('team-roster.store', $registration), memberPayload(['jersey_number' => '3']))
        ->assertSessionHasErrors('role');

    $this->post(route('team-roster.store', $registration), memberPayload([
        'name' => 'Manager', 'role' => Player::ROLE_MANAGER, 'jersey_number' => null,
    ]))->assertSessionHasNoErrors();

    expect($team->players()->count())->toBe(3);
});

// ─── Editing and removing ───────────────────────────────────────────────────

test('a captain can edit and remove their own members only', function () {
    $registration = enteredTeam();
    $player = $registration->team->players()->create(memberPayload());

    $other = enteredTeam();
    $stranger = $other->team->players()->create(memberPayload(['name' => 'Stranger']));

    $this->put(route('team-roster.update', [$registration, $player]), memberPayload(['name' => 'Budi S.', 'jersey_number' => '11']))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($player->fresh()->name)->toBe('Budi S.')
        ->and($player->fresh()->jersey_number)->toBe('11');

    $this->put(route('team-roster.update', [$registration, $stranger]), memberPayload())->assertNotFound();
    $this->delete(route('team-roster.destroy', [$registration, $stranger]))->assertNotFound();
    expect($stranger->fresh()->name)->toBe('Stranger');

    $this->delete(route('team-roster.destroy', [$registration, $player]))->assertRedirect();
    expect($registration->team->players()->count())->toBe(0);
});

// ─── Locking ────────────────────────────────────────────────────────────────

test('the roster locks once the team is verified', function () {
    $registration = enteredTeam(teamStatus: Team::STATUS_VERIFIED);

    $this->get(route('team-roster.show', $registration))
        ->assertInertia(fn ($page) => $page->where('lock', 'verified'));

    $this->post(route('team-roster.store', $registration), memberPayload())->assertForbidden();
});

test('the roster locks after the roster deadline', function () {
    $registration = enteredTeam(['roster_closes_at' => now()->subHour()]);

    $this->get(route('team-roster.show', $registration))
        ->assertInertia(fn ($page) => $page->where('lock', 'closed'));

    $this->post(route('team-roster.store', $registration), memberPayload())->assertForbidden();
});

test('the roster waits for payment and closes when the registration falls through', function () {
    $registration = enteredTeam();

    $registration->update(['status' => Registration::STATUS_PENDING_PAYMENT]);
    $this->get(route('team-roster.show', $registration))
        ->assertInertia(fn ($page) => $page->where('lock', 'payment_pending'));
    $this->post(route('team-roster.store', $registration), memberPayload())->assertForbidden();

    $registration->update(['status' => Registration::STATUS_EXPIRED]);
    $this->get(route('team-roster.show', $registration))
        ->assertInertia(fn ($page) => $page->where('lock', 'withdrawn'));
});

// ─── Organiser side keeps working through the same rules ────────────────────

test('an organiser adding a player is held to the same cap', function () {
    $registration = enteredTeam(['max_player_per_team' => 1]);
    $team = $registration->team;
    $team->players()->create(memberPayload(['jersey_number' => '1']));
    $event = $registration->event;

    $this->actingAs(organizerOf($event))
        ->post(route('players.store', [$event, $team]), ['name' => 'One Too Many', 'role' => Player::ROLE_PLAYER, 'jersey_number' => '2'])
        ->assertSessionHasErrors('role');

    // But is not forced to supply the captain-side identity details.
    $this->actingAs(organizerOf($event))
        ->post(route('players.store', [$event, $team]), ['name' => 'Walk-in Coach', 'role' => Player::ROLE_COACH])
        ->assertSessionHasNoErrors();
});
