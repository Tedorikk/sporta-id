<?php

use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function categoryPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Men\'s Division A',
        'subject_type' => 'team',
        'price' => '150000',
        'quota' => 16,
        'registration_open' => true,
        'form_schema' => [
            ['key' => 'coach_name', 'label' => 'Coach Name', 'type' => 'text', 'required' => true],
        ],
    ], $overrides);
}

test('guests cannot manage registration categories', function () {
    $event = Event::factory()->create();

    $this->post(route('registration_categories.store', $event), categoryPayload())
        ->assertRedirect(route('login'));

    expect(RegistrationCategory::count())->toBe(0);
});

test('an organizer can create a registration category with a dynamic form schema', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload())
        ->assertRedirect(route('registration_categories.index', $event));

    $category = RegistrationCategory::firstOrFail();

    expect($category->name)->toBe("Men's Division A")
        ->and($category->subject_type)->toBe('team')
        ->and((float) $category->price)->toBe(150000.0)
        ->and($category->form_schema)->toHaveCount(1)
        ->and($category->form_schema[0]['key'])->toBe('coach_name')
        ->and($category->slug)->not->toBeEmpty();
});

test('field keys must be unique within a form schema', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'form_schema' => [
                ['key' => 'dup', 'label' => 'One', 'type' => 'text', 'required' => false],
                ['key' => 'dup', 'label' => 'Two', 'type' => 'text', 'required' => false],
            ],
        ]))
        ->assertStatus(422);

    expect(RegistrationCategory::count())->toBe(0);
});

test('field type must be one of the supported types', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'form_schema' => [
                ['key' => 'x', 'label' => 'X', 'type' => 'not-a-type', 'required' => false],
            ],
        ]))
        ->assertSessionHasErrors('form_schema.0.type');
});

test('an organizer can update a registration category', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();
    $category = RegistrationCategory::create(array_merge(['event_id' => $event->id], categoryPayload()));

    $this->actingAs($user)
        ->put(route('registration_categories.update', [$event, $category]), categoryPayload(['name' => 'Renamed', 'registration_open' => false]))
        ->assertRedirect(route('registration_categories.index', $event));

    expect($category->fresh()->name)->toBe('Renamed')
        ->and($category->fresh()->registration_open)->toBeFalse();
});

test('an organizer cannot update a registration category belonging to another event', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();
    $otherEvent = Event::factory()->create();
    $category = RegistrationCategory::create(array_merge(['event_id' => $otherEvent->id], categoryPayload()));

    $this->actingAs($user)
        ->put(route('registration_categories.update', [$event, $category]), categoryPayload())
        ->assertNotFound();
});

test('a registration category with existing registrations cannot be deleted', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();
    $category = RegistrationCategory::create(array_merge(['event_id' => $event->id], categoryPayload(['form_schema' => []])));
    Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => 'Existing Registrant',
    ]);

    $this->actingAs($user)
        ->delete(route('registration_categories.destroy', [$event, $category]))
        ->assertRedirect(route('registration_categories.index', $event));

    expect(RegistrationCategory::find($category->id))->not->toBeNull();
});

test('a registration category with no registrations can be deleted', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();
    $category = RegistrationCategory::create(array_merge(['event_id' => $event->id], categoryPayload()));

    $this->actingAs($user)
        ->delete(route('registration_categories.destroy', [$event, $category]))
        ->assertRedirect(route('registration_categories.index', $event));

    expect(RegistrationCategory::find($category->id))->toBeNull();
});
