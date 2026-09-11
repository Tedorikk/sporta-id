<?php

use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
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
        'form_pages' => [
            ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                ['key' => 'coach_name', 'label' => 'Coach Name', 'type' => 'text', 'required' => true],
            ]],
        ],
    ], $overrides);
}

test('guests cannot view a registration category\'s registrations', function () {
    $event = Event::factory()->create();
    $category = RegistrationCategory::create(array_merge(['event_id' => $event->id], categoryPayload(['form_pages' => []])));

    $this->get(route('registration_categories.show', [$event, $category]))
        ->assertRedirect(route('login'));
});

test('an organizer can view submitted registrations, including custom field answers', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $category = RegistrationCategory::create(array_merge(['event_id' => $event->id], categoryPayload([
        'subject_type' => 'individual',
        'form_pages' => [
            ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                ['key' => 'shirt_size', 'label' => 'Shirt Size', 'type' => 'text', 'required' => true],
            ]],
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
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $category = RegistrationCategory::create(array_merge(['event_id' => $event->id], categoryPayload(['form_pages' => []])));
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
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $otherEvent = Event::factory()->create();
    $category = RegistrationCategory::create(array_merge(['event_id' => $otherEvent->id], categoryPayload(['form_pages' => []])));

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
    $event = Event::factory()->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload())
        ->assertRedirect(route('registration_categories.index', $event));

    $category = RegistrationCategory::firstOrFail();

    expect($category->name)->toBe("Men's Division A")
        ->and($category->subject_type)->toBe('team')
        ->and((float) $category->price)->toBe(150000.0)
        ->and($category->allFields())->toHaveCount(1)
        ->and($category->allFields()[0]['key'])->toBe('coach_name')
        ->and($category->slug)->not->toBeEmpty();
});

test('a custom field cannot reuse the reserved "name" key', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'form_pages' => [
                ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                    ['key' => 'name', 'label' => 'Participant Name', 'type' => 'text', 'required' => true],
                ]],
            ],
        ]))
        ->assertSessionHasErrors('form_pages.0.fields.0.key');

    expect(RegistrationCategory::count())->toBe(0);
});

test('field keys must be unique within a form schema', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'form_pages' => [
                ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                    ['key' => 'dup', 'label' => 'One', 'type' => 'text', 'required' => false],
                    ['key' => 'dup', 'label' => 'Two', 'type' => 'text', 'required' => false],
                ]],
            ],
        ]))
        ->assertStatus(422);

    expect(RegistrationCategory::count())->toBe(0);
});

test('field type must be one of the supported types', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'form_pages' => [
                ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                    ['key' => 'x', 'label' => 'X', 'type' => 'not-a-type', 'required' => false],
                ]],
            ],
        ]))
        ->assertSessionHasErrors('form_pages.0.fields.0.type');
});

test('a document upload field type is accepted', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'form_pages' => [
                ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                    ['key' => 'id_proof', 'label' => 'ID Proof', 'type' => 'document', 'required' => true],
                ]],
            ],
        ]))
        ->assertRedirect(route('registration_categories.index', $event));

    $category = RegistrationCategory::firstOrFail();

    expect($category->allFields()[0]['type'])->toBe('document');
});

test('a description block field type is accepted and excluded from input fields', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'form_pages' => [
                ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                    ['key' => 'intro', 'label' => 'Before you start', 'type' => 'description', 'required' => false, 'help_text' => 'Have your ID ready.'],
                    ['key' => 'coach_name', 'label' => 'Coach', 'type' => 'text', 'required' => true],
                ]],
            ],
        ]))
        ->assertRedirect(route('registration_categories.index', $event));

    $category = RegistrationCategory::firstOrFail();

    expect($category->allFields())->toHaveCount(2)
        ->and($category->inputFields())->toHaveCount(1)
        ->and($category->inputFields()[0]['key'])->toBe('coach_name');
});

test('an organizer can update a registration category', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $category = RegistrationCategory::create(array_merge(['event_id' => $event->id], categoryPayload()));

    $this->actingAs($user)
        ->put(route('registration_categories.update', [$event, $category]), categoryPayload(['name' => 'Renamed', 'registration_open' => false]))
        ->assertRedirect(route('registration_categories.index', $event));

    expect($category->fresh()->name)->toBe('Renamed')
        ->and($category->fresh()->registration_open)->toBeFalse();
});

test('an organizer cannot update a registration category belonging to another event', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $otherEvent = Event::factory()->create();
    $category = RegistrationCategory::create(array_merge(['event_id' => $otherEvent->id], categoryPayload()));

    $this->actingAs($user)
        ->put(route('registration_categories.update', [$event, $category]), categoryPayload())
        ->assertNotFound();
});

test('a registration category with existing registrations cannot be deleted', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $category = RegistrationCategory::create(array_merge(['event_id' => $event->id], categoryPayload(['form_pages' => []])));
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
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $category = RegistrationCategory::create(array_merge(['event_id' => $event->id], categoryPayload()));

    $this->actingAs($user)
        ->delete(route('registration_categories.destroy', [$event, $category]))
        ->assertRedirect(route('registration_categories.index', $event));

    expect(RegistrationCategory::find($category->id))->toBeNull();
});
