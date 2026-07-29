<?php

use App\Models\BasketballEvent;
use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeBasketballEvent(array $overrides = []): Event
{
    $basketballEvent = BasketballEvent::create(array_merge(['pool_drawing_date' => now()], $overrides));

    $event = new Event([
        'name' => 'Registration Test Cup',
        'description' => 'Test Event Description',
        'contact_person' => 'John Doe',
        'category' => 'BASKETBALL',
        'is_published' => true,
        'start_date' => now()->addDays(2)->format('Y-m-d'),
        'end_date' => now()->addDays(5)->format('Y-m-d'),
    ]);
    $event->specific()->associate($basketballEvent);
    $event->save();

    return $event;
}

function playerPayload(array $overrides = []): array
{
    return array_merge([
        'role' => 'player',
        'name' => 'Jane Doe',
        'jersey_number' => '7',
        'photo' => 'https://example.com/photo.jpg',
    ], $overrides);
}

// ─── Registration is open by default ───────────────────────────────────────────

test('a new basketball event has registration open by default', function () {
    $event = makeBasketballEvent();

    expect($event->specific->fresh()->registration_open)->toBeTrue();
});

// ─── Public form (create) ───────────────────────────────────────────────────────

test('the registration form loads with categories when registration is open', function () {
    $event = makeBasketballEvent();
    $category = BasketballEventCategory::create([
        'basketball_event_id' => $event->specific->id,
        'name' => 'Under 18',
        'slug' => 'under-18',
        'min_team' => 2,
        'min_player_per_team' => 5,
        'status' => 'PENDING',
    ]);

    $this->get(route('players.register', $event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('register')
            ->where('registrationClosed', false)
            ->has('categories', 1)
            ->where('categories.0.id', $category->id)
        );
});

test('the registration form reports closed with no categories when registration is closed', function () {
    $event = makeBasketballEvent(['registration_open' => false]);
    BasketballEventCategory::create([
        'basketball_event_id' => $event->specific->id,
        'name' => 'Under 18',
        'slug' => 'under-18',
        'min_team' => 2,
        'min_player_per_team' => 5,
        'status' => 'PENDING',
    ]);

    $this->get(route('players.register', $event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('register')
            ->where('registrationClosed', true)
            ->has('categories', 0)
        );
});

// ─── Public form (store) ────────────────────────────────────────────────────────

test('a player can register while registration is open', function () {
    $event = makeBasketballEvent();
    $category = BasketballEventCategory::create([
        'basketball_event_id' => $event->specific->id,
        'name' => 'Under 18',
        'slug' => 'under-18',
        'min_team' => 2,
        'min_player_per_team' => 5,
        'status' => 'PENDING',
    ]);
    $team = Team::create([
        'event_id' => $event->id,
        'basketball_event_category_id' => $category->id,
        'name' => 'Team Alpha',
        'status' => 'verified',
    ]);

    $this->post(route('players.register.store', $event), playerPayload([
        'basketball_event_category_id' => $category->id,
        'team_id' => $team->id,
    ]))->assertRedirect();

    expect($team->players()->where('name', 'Jane Doe')->exists())->toBeTrue();
});

test('registering is rejected once registration is closed', function () {
    $event = makeBasketballEvent(['registration_open' => false]);
    $category = BasketballEventCategory::create([
        'basketball_event_id' => $event->specific->id,
        'name' => 'Under 18',
        'slug' => 'under-18',
        'min_team' => 2,
        'min_player_per_team' => 5,
        'status' => 'PENDING',
    ]);
    $team = Team::create([
        'event_id' => $event->id,
        'basketball_event_category_id' => $category->id,
        'name' => 'Team Alpha',
        'status' => 'verified',
    ]);

    $this->post(route('players.register.store', $event), playerPayload([
        'basketball_event_category_id' => $category->id,
        'team_id' => $team->id,
    ]))->assertForbidden();

    expect($team->players()->where('name', 'Jane Doe')->exists())->toBeFalse();
});

// ─── Organizer toggle ───────────────────────────────────────────────────────────

test('an organizer can close registration', function () {
    $user = User::factory()->create();
    $event = makeBasketballEvent();

    $this->actingAs($user)
        ->put(route('events.basketball.update', $event), ['registration_open' => false])
        ->assertRedirect()
        ->assertSessionHas('toast', [
            'title' => 'Success',
            'description' => 'Registration is now closed.',
        ]);

    expect($event->specific->fresh()->registration_open)->toBeFalse();
});

test('an organizer can reopen registration', function () {
    $user = User::factory()->create();
    $event = makeBasketballEvent(['registration_open' => false]);

    $this->actingAs($user)
        ->put(route('events.basketball.update', $event), ['registration_open' => true])
        ->assertRedirect()
        ->assertSessionHas('toast', [
            'title' => 'Success',
            'description' => 'Registration is now open to players.',
        ]);

    expect($event->specific->fresh()->registration_open)->toBeTrue();
});

test('guests cannot toggle registration', function () {
    $event = makeBasketballEvent();

    $this->put(route('events.basketball.update', $event), ['registration_open' => false])
        ->assertRedirect(route('login'));

    expect($event->specific->fresh()->registration_open)->toBeTrue();
});

test('toggling registration requires a boolean', function () {
    $user = User::factory()->create();
    $event = makeBasketballEvent();

    $this->actingAs($user)
        ->put(route('events.basketball.update', $event), ['registration_open' => 'not-a-bool'])
        ->assertSessionHasErrors('registration_open');
});

test('toggling registration 404s for an event with no basketball tournament attached', function () {
    $user = User::factory()->create();
    // A BASKETBALL-category event before "Turnamen Basket" has been created for it
    // (see BasketballEventController::store) has no `specific` relation yet.
    $event = Event::factory()->create();

    $this->actingAs($user)
        ->put(route('events.basketball.update', $event), ['registration_open' => false])
        ->assertNotFound();
});
