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

test('guests cannot view a registration category\'s registrations', function () {
    $event = Event::factory()->create();
    $category = RegistrationCategory::create(array_merge(['event_id' => $event->id], categoryPayload(['form_schema' => []])));

    $this->get(route('registration_categories.show', [$event, $category]))
        ->assertRedirect(route('login'));
});

test('an organizer can view submitted registrations, including custom field answers', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();
    $category = RegistrationCategory::create(array_merge(['event_id' => $event->id], categoryPayload([
        'subject_type' => 'individual',
        'form_schema' => [
            ['key' => 'shirt_size', 'label' => 'Shirt Size', 'type' => 'text', 'required' => true],
        ],
    ])));
    $registration = Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'status' => Registration::STATUS_CONFIRMED,
        'form_data' => ['shirt_size' => 'M'],
    ]);

    $this->actingAs($user)
        ->get(route('registration_categories.show', [$event, $category]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/events/registration-categories/show')
            ->has('registrations.data', 1)
            ->where('registrations.data.0.id', $registration->id)
            ->where('registrations.data.0.form_data.shirt_size', 'M')
        );
});

test('the registrations list can be filtered by search and status', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();
    $category = RegistrationCategory::create(array_merge(['event_id' => $event->id], categoryPayload(['form_schema' => []])));
    Registration::create(['registration_category_id' => $category->id, 'event_id' => $event->id, 'name' => 'Jane Doe', 'status' => Registration::STATUS_CONFIRMED]);
    Registration::create(['registration_category_id' => $category->id, 'event_id' => $event->id, 'name' => 'John Smith', 'status' => Registration::STATUS_PENDING_PAYMENT]);

    $this->actingAs($user)
        ->get(route('registration_categories.show', [$event, $category]).'?search=Jane')
        ->assertInertia(fn ($page) => $page->has('registrations.data', 1)->where('registrations.data.0.name', 'Jane Doe'));

    $this->actingAs($user)
        ->get(route('registration_categories.show', [$event, $category]).'?status=pending_payment')
        ->assertInertia(fn ($page) => $page->has('registrations.data', 1)->where('registrations.data.0.name', 'John Smith'));
});

test('a registration category from another event 404s', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();
    $otherEvent = Event::factory()->create();
    $category = RegistrationCategory::create(array_merge(['event_id' => $otherEvent->id], categoryPayload(['form_schema' => []])));

    $this->actingAs($user)
        ->get(route('registration_categories.show', [$event, $category]))
        ->assertNotFound();
});

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

test('a custom field cannot reuse the reserved "name" key', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'form_schema' => [
                ['key' => 'name', 'label' => 'Participant Name', 'type' => 'text', 'required' => true],
            ],
        ]))
        ->assertSessionHasErrors('form_schema.0.key');

    expect(RegistrationCategory::count())->toBe(0);
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

test('a document upload field type is accepted', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'form_schema' => [
                ['key' => 'id_proof', 'label' => 'ID Proof', 'type' => 'document', 'required' => true],
            ],
        ]))
        ->assertRedirect(route('registration_categories.index', $event));

    $category = RegistrationCategory::firstOrFail();

    expect($category->form_schema[0]['type'])->toBe('document');
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
