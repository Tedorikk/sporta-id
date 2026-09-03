<?php

use App\Models\Event;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function eventPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Test Tournament Cup',
        'description' => 'A test event',
        'contact_person' => '+6281234567890',
        'category' => 'CONFERENCE',
        'is_published' => true,
        'start_date' => now()->addDays(2)->format('Y-m-d'),
        'end_date' => now()->addDays(5)->format('Y-m-d'),
    ], $overrides);
}

test('an organizer can set a valid hex accent color on an event', function () {
    $user = memberOf(Organization::factory()->create());

    $this->actingAs($user)
        ->post(route('events.store'), eventPayload(['accent_color' => '#1d4ed8']))
        ->assertRedirect();

    $event = Event::firstOrFail();
    expect($event->accent_color)->toBe('#1d4ed8');
});

test('an invalid accent color is rejected', function () {
    $user = memberOf(Organization::factory()->create());

    $this->actingAs($user)
        ->post(route('events.store'), eventPayload(['accent_color' => 'not-a-color']))
        ->assertSessionHasErrors('accent_color');

    expect(Event::count())->toBe(0);
});

test('accent color is optional', function () {
    $user = memberOf(Organization::factory()->create());

    $this->actingAs($user)
        ->post(route('events.store'), eventPayload(['accent_color' => '']))
        ->assertRedirect();

    $event = Event::firstOrFail();
    expect($event->accent_color)->toBeNull();
});

test('an organizer can update an event\'s accent color', function () {
    $event = Event::factory()->create(['accent_color' => '#dc2626']);
    $user = organizerOf($event);

    $this->actingAs($user)
        ->put(route('events.update', $event), eventPayload(['accent_color' => '#059669']))
        ->assertRedirect();

    expect($event->fresh()->accent_color)->toBe('#059669');
});
