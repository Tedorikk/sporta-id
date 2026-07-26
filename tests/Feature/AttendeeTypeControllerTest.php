<?php

use App\Models\AttendeeType;
use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->event = Event::factory()->create();
});

// ─── Auto-seeding ─────────────────────────────────────────────────────────────

test('creating an event automatically seeds guest, tenant and photographer types', function () {
    $keys = $this->event->attendeeTypes()->pluck('key')->sort()->values();

    expect($keys->all())->toBe(['guest', 'photographer', 'tenant']);
});

test('each event gets its own independent set of defaults', function () {
    $other = Event::factory()->create();

    expect($this->event->attendeeTypes()->count())->toBe(3)
        ->and($other->attendeeTypes()->count())->toBe(3);

    $this->event->attendeeTypes()->where('key', 'guest')->first()->update(['label' => 'VIP Guest']);

    expect($other->attendeeTypes()->where('key', 'guest')->first()->label)->toBe('Guest');
});

// ─── Index ────────────────────────────────────────────────────────────────────

test('the index lists only this event\'s attendee types', function () {
    $other = Event::factory()->create();

    $this->actingAs($this->user)
        ->get(route('attendee-types.index', $this->event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/events/attendee-types/index')
            ->where('event.id', $this->event->id)
            ->has('attendeeTypes', 3)
        );

    expect($other->attendeeTypes()->count())->toBe(3);
});

test('guests cannot reach the attendee types index', function () {
    $this->get(route('attendee-types.index', $this->event))
        ->assertRedirect(route('login'));
});

// ─── Store ────────────────────────────────────────────────────────────────────

test('an attendee type can be created for an event', function () {
    $this->actingAs($this->user)
        ->post(route('attendee-types.store', $this->event), [
            'key' => 'vendor',
            'label' => 'Vendor',
            'color' => '#123456',
            'is_active' => true,
        ])
        ->assertRedirect(route('attendee-types.index', $this->event));

    $type = AttendeeType::where('key', 'vendor')->first();

    expect($type)->not->toBeNull()
        ->and($type->event_id)->toBe($this->event->id);
});

test('the same key can be reused across different events', function () {
    $other = Event::factory()->create();

    $this->actingAs($this->user)->post(route('attendee-types.store', $this->event), [
        'key' => 'vendor', 'label' => 'Vendor', 'is_active' => true,
    ])->assertSessionHasNoErrors();

    $this->actingAs($this->user)->post(route('attendee-types.store', $other), [
        'key' => 'vendor', 'label' => 'Vendor', 'is_active' => true,
    ])->assertSessionHasNoErrors();

    expect(AttendeeType::where('key', 'vendor')->count())->toBe(2);
});

test('the same key cannot be reused within the same event', function () {
    $this->actingAs($this->user)
        ->post(route('attendee-types.store', $this->event), ['key' => 'guest', 'label' => 'Guest Again', 'is_active' => true])
        ->assertSessionHasErrors('key');
});

// ─── Update ───────────────────────────────────────────────────────────────────

test('an attendee type can be updated', function () {
    $type = $this->event->attendeeTypes()->where('key', 'guest')->first();

    $this->actingAs($this->user)
        ->put(route('attendee-types.update', [$this->event, $type]), [
            'key' => 'guest', 'label' => 'VIP Guest', 'is_active' => true,
        ])
        ->assertRedirect();

    expect($type->fresh()->label)->toBe('VIP Guest');
});

test('an attendee type belonging to another event cannot be updated', function () {
    $other = Event::factory()->create();
    $type = $other->attendeeTypes()->where('key', 'guest')->first();

    $this->actingAs($this->user)
        ->put(route('attendee-types.update', [$this->event, $type]), [
            'key' => 'guest', 'label' => 'Hijacked', 'is_active' => true,
        ])
        ->assertNotFound();

    expect($type->fresh()->label)->toBe('Guest');
});

// ─── Destroy ──────────────────────────────────────────────────────────────────

test('an unused attendee type can be deleted', function () {
    $type = $this->event->attendeeTypes()->where('key', 'photographer')->first();

    $this->actingAs($this->user)
        ->delete(route('attendee-types.destroy', [$this->event, $type]))
        ->assertRedirect(route('attendee-types.index', $this->event));

    expect(AttendeeType::find($type->id))->toBeNull();
});

test('an attendee type with attendees cannot be deleted', function () {
    $type = $this->event->attendeeTypes()->where('key', 'guest')->first();
    $this->event->attendees()->create([
        'attendee_type_id' => $type->id,
        'name' => 'Jane Doe',
    ]);

    $this->actingAs($this->user)
        ->delete(route('attendee-types.destroy', [$this->event, $type]))
        ->assertRedirect(route('attendee-types.index', $this->event));

    expect(AttendeeType::find($type->id))->not->toBeNull();
});

test('an attendee type belonging to another event cannot be deleted', function () {
    $other = Event::factory()->create();
    $type = $other->attendeeTypes()->where('key', 'guest')->first();

    $this->actingAs($this->user)
        ->delete(route('attendee-types.destroy', [$this->event, $type]))
        ->assertNotFound();

    expect(AttendeeType::find($type->id))->not->toBeNull();
});
