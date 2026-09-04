<?php

use App\Models\Event;
use App\Models\Organization;

it('publishes a batch of events', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);
    $events = Event::factory()->count(3)->for($organization)->create(['is_published' => false]);

    $this->actingAs($user)
        ->from(route('events.index'))
        ->patch(route('events.bulk.publication'), [
            'ids' => $events->modelKeys(),
            'is_published' => true,
        ])
        ->assertRedirect(route('events.index'));

    expect(Event::where('is_published', true)->count())->toBe(3);
});

it('moves a batch back to draft', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);
    $events = Event::factory()->count(2)->for($organization)->create(['is_published' => true]);

    $this->actingAs($user)
        ->from(route('events.index'))
        ->patch(route('events.bulk.publication'), [
            'ids' => $events->modelKeys(),
            'is_published' => false,
        ])
        ->assertRedirect(route('events.index'));

    expect(Event::where('is_published', false)->count())->toBe(2);
});

it('toggles publication for a single event, as the row switch does', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);
    $event = Event::factory()->for($organization)->create(['is_published' => false]);

    $this->actingAs($user)
        ->from(route('events.index'))
        ->patch(route('events.bulk.publication'), [
            'ids' => [$event->id],
            'is_published' => true,
        ])
        ->assertRedirect(route('events.index'));

    expect($event->fresh()->is_published)->toBeTrue();
});

it('deletes a batch of events', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);
    $events = Event::factory()->count(3)->for($organization)->create();
    $survivor = Event::factory()->for($organization)->create();

    $this->actingAs($user)
        ->from(route('events.index'))
        ->delete(route('events.bulk.destroy'), ['ids' => $events->modelKeys()])
        ->assertRedirect(route('events.index'));

    expect(Event::pluck('id')->all())->toBe([$survivor->id]);
});

it('will not touch an event belonging to another organization', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);
    $own = Event::factory()->for($organization)->create(['is_published' => false]);
    $foreign = Event::factory()->for(Organization::factory())->create(['is_published' => false]);

    $this->actingAs($user)
        ->patch(route('events.bulk.publication'), [
            'ids' => [$own->id, $foreign->id],
            'is_published' => true,
        ])
        ->assertNotFound();

    // The whole batch is rejected, so the caller's own event is untouched too.
    expect($own->fresh()->is_published)->toBeFalse()
        ->and($foreign->fresh()->is_published)->toBeFalse();
});

it('forbids members without a manager role', function () {
    $organization = Organization::factory()->create();
    $member = memberOf($organization, Organization::ROLE_MEMBER);
    $event = Event::factory()->for($organization)->create(['is_published' => false]);

    $this->actingAs($member)
        ->patch(route('events.bulk.publication'), [
            'ids' => [$event->id],
            'is_published' => true,
        ])
        ->assertForbidden();

    $this->actingAs($member)
        ->delete(route('events.bulk.destroy'), ['ids' => [$event->id]])
        ->assertForbidden();

    expect($event->fresh())->not->toBeNull()
        ->and($event->fresh()->is_published)->toBeFalse();
});

it('requires at least one id', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);

    $this->actingAs($user)
        ->from(route('events.index'))
        ->patch(route('events.bulk.publication'), ['ids' => [], 'is_published' => true])
        ->assertSessionHasErrors('ids');

    $this->actingAs($user)
        ->from(route('events.index'))
        ->delete(route('events.bulk.destroy'), ['ids' => []])
        ->assertSessionHasErrors('ids');
});

it('counts duplicate ids once so the batch still resolves', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);
    $event = Event::factory()->for($organization)->create(['is_published' => false]);

    $this->actingAs($user)
        ->from(route('events.index'))
        ->patch(route('events.bulk.publication'), [
            'ids' => [$event->id, $event->id],
            'is_published' => true,
        ])
        ->assertRedirect(route('events.index'));

    expect($event->fresh()->is_published)->toBeTrue();
});
