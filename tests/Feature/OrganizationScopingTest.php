<?php

use App\Models\Event;
use App\Models\Organization;
use App\Models\Speaker;

test('the events list only shows events from the current organization', function () {
    $mine = Event::factory()->create(['name' => 'My Own Event']);
    $theirs = Event::factory()->create(['name' => 'Somebody Elses Event']);

    $user = organizerOf($mine);

    $this->actingAs($user)
        ->get(route('events.index'))
        ->assertOk()
        ->assertSee('My Own Event')
        ->assertDontSee('Somebody Elses Event');

    expect($theirs->organization_id)->not->toBe($mine->organization_id);
});

test('a user cannot view an event belonging to another organization', function () {
    $theirs = Event::factory()->create();
    $outsider = memberOf(Organization::factory()->create());

    $this->actingAs($outsider)
        ->get(route('events.show', $theirs))
        ->assertNotFound();
});

test('a user cannot reach nested resources of another organizations event', function () {
    $theirs = Event::factory()->create();
    $outsider = memberOf(Organization::factory()->create());

    // Proves the route-group middleware covers every nested controller.
    $this->actingAs($outsider)
        ->get(route('meetings.index', $theirs))
        ->assertNotFound();

    $this->actingAs($outsider)
        ->post(route('speakers.store', $theirs), ['name' => 'Intruder'])
        ->assertNotFound();

    expect(Speaker::count())->toBe(0);
});

test('a user cannot update or delete another organizations event', function () {
    $theirs = Event::factory()->create(['name' => 'Untouched']);
    $outsider = memberOf(Organization::factory()->create());

    $this->actingAs($outsider)
        ->delete(route('events.destroy', $theirs))
        ->assertNotFound();

    expect(Event::whereKey($theirs->id)->exists())->toBeTrue();
});

test('a member can view an event but cannot delete it', function () {
    $event = Event::factory()->create();
    $member = organizerOf($event, Organization::ROLE_MEMBER);

    $this->actingAs($member)
        ->get(route('events.show', $event))
        ->assertOk();

    $this->actingAs($member)
        ->delete(route('events.destroy', $event))
        ->assertForbidden();

    expect(Event::whereKey($event->id)->exists())->toBeTrue();
});

test('an admin can delete an event in their organization', function () {
    $event = Event::factory()->create();
    $admin = organizerOf($event, Organization::ROLE_ADMIN);

    $this->actingAs($admin)
        ->delete(route('events.destroy', $event))
        ->assertRedirect(route('events.index'));

    expect(Event::whereKey($event->id)->exists())->toBeFalse();
});

test('a created event is assigned to the creators current organization', function () {
    $organization = Organization::factory()->create();
    $user = memberOf($organization);

    $this->actingAs($user)->post(route('events.store'), [
        'name' => 'Brand New Event',
        'contact_person' => '+6281234567890',
        'category' => 'BASKETBALL',
        'is_published' => true,
        'start_date' => now()->addWeek()->format('Y-m-d'),
        'end_date' => now()->addWeeks(2)->format('Y-m-d'),
    ])->assertRedirect(route('events.index'));

    expect(Event::firstOrFail()->organization_id)->toBe($organization->id);
});

test('an organization_id in the request payload is ignored', function () {
    $organization = Organization::factory()->create();
    $attackerTarget = Organization::factory()->create();
    $user = memberOf($organization);

    $this->actingAs($user)->post(route('events.store'), [
        'organization_id' => $attackerTarget->id,
        'name' => 'Payload Injection Attempt',
        'contact_person' => '+6281234567890',
        'category' => 'BASKETBALL',
        'is_published' => true,
        'start_date' => now()->addWeek()->format('Y-m-d'),
        'end_date' => now()->addWeeks(2)->format('Y-m-d'),
    ]);

    expect(Event::firstOrFail()->organization_id)->toBe($organization->id);
});

test('public event pages stay visible across organizations to guests', function () {
    $first = Event::factory()->create(['name' => 'Public Alpha', 'is_published' => true]);
    $second = Event::factory()->create(['name' => 'Public Beta', 'is_published' => true]);

    // Guards against anyone reintroducing a global scope on Event, which would
    // silently break the public marketing and registration funnel.
    $this->get(route('events.public.index'))
        ->assertOk()
        ->assertSee('Public Alpha')
        ->assertSee('Public Beta');

    $this->get(route('events.public.show', $first))->assertOk();
    $this->get(route('events.public.show', $second))->assertOk();
});
