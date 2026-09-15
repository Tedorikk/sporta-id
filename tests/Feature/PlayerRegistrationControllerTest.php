<?php

use App\Models\BasketballEvent;
use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\Organization;
use App\Models\RegistrationCategory;
use App\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeBasketballEvent(array $overrides = []): Event
{
    $basketballEvent = BasketballEvent::create(array_merge(['pool_drawing_date' => now()], $overrides));

    $event = new Event([
        'organization_id' => Organization::factory()->create()->id,
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
// Every basketball category now sells through a registration category, so the
// legacy /register page is never the destination for an event with categories.

test('a basketball event with one open category sends visitors straight to its registration form', function () {
    $event = makeBasketballEvent();
    $category = BasketballEventCategory::factory()->forEvent($event)->create(['name' => 'Under 18']);

    $this->get(route('players.register', $event))
        ->assertRedirect(route('registrations.create', [$event, $category->registrationCategory]));
});

test('a basketball event whose only category is closed sends visitors to the event page', function () {
    $event = makeBasketballEvent();
    $category = BasketballEventCategory::factory()->forEvent($event)->create(['name' => 'Under 18']);
    $category->registrationCategory->update(['registration_open' => false]);

    $this->get(route('players.register', $event))
        ->assertRedirect(route('events.public.show', $event));
});

// ─── Public form (store) ────────────────────────────────────────────────────────

test('a player can register while registration is open', function () {
    $event = makeBasketballEvent();
    $category = BasketballEventCategory::factory()->forEvent($event)->create(['name' => 'Under 18']);
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
    $category = BasketballEventCategory::factory()->forEvent($event)->create(['name' => 'Under 18']);
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
    $event = makeBasketballEvent();
    $user = organizerOf($event);

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
    $event = makeBasketballEvent(['registration_open' => false]);
    $user = organizerOf($event);

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
    $event = makeBasketballEvent();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->put(route('events.basketball.update', $event), ['registration_open' => 'not-a-bool'])
        ->assertSessionHasErrors('registration_open');
});

test('toggling registration 404s for an event with no basketball tournament attached', function () {
    // A BASKETBALL-category event before "Turnamen Basket" has been created for it
    // (see BasketballEventController::store) has no `specific` relation yet.
    $event = Event::factory()->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->put(route('events.basketball.update', $event), ['registration_open' => false])
        ->assertNotFound();
});

// ─── /events/{event}/register as a generic entry point ─────────────────────
//
// This URL is the one people guess, bookmark, and print. It used to 404 for
// every event that wasn't a basketball tournament — which is how Midtrans's
// reviewer got stuck on the landing page.

test('the register URL redirects straight to the form when an event sells exactly one category', function () {
    $event = Event::factory()->create(['is_published' => true]);

    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => '5K Individual Run',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '150000',
        'registration_open' => true,
        'form_pages' => [],
    ]);

    $this->get(route('players.register', $event))
        ->assertRedirect(route('registrations.create', [$event, $category]));
});

test('the register URL redirects to the event page when several categories are open', function () {
    $event = Event::factory()->create(['is_published' => true]);

    foreach (['5K', '10K'] as $name) {
        RegistrationCategory::create([
            'event_id' => $event->id,
            'name' => $name,
            'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
            'price' => '150000',
            'registration_open' => true,
            'form_pages' => [],
        ]);
    }

    $this->get(route('players.register', $event))
        ->assertRedirect(route('events.public.show', $event));
});

test('the register URL redirects to the event page when every category is closed or full', function () {
    $event = Event::factory()->create(['is_published' => true]);

    RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Sold Out',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '150000',
        'registration_open' => true,
        'quota' => 1,
        'registered_count' => 1,
        'form_pages' => [],
    ]);

    $this->get(route('players.register', $event))
        ->assertRedirect(route('events.public.show', $event));
});

test('the register URL redirects to the event page for an event with no registration at all', function () {
    $event = Event::factory()->create(['is_published' => true]);

    $this->get(route('players.register', $event))
        ->assertRedirect(route('events.public.show', $event));
});

test('the register URL still renders the basketball form when that is what the event uses', function () {
    $event = makeBasketballEvent();

    $this->get(route('players.register', $event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('register'));
});

test('generic registration categories take precedence over the legacy basketball form', function () {
    $event = makeBasketballEvent();

    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Team Entry',
        'subject_type' => RegistrationCategory::SUBJECT_TEAM,
        'price' => '400000',
        'registration_open' => true,
        'form_pages' => [],
    ]);

    $this->get(route('players.register', $event))
        ->assertRedirect(route('registrations.create', [$event, $category]));
});
