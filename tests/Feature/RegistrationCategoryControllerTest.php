<?php

use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\RunningEventCategory;
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

test('a description block can hold a whole rulebook', function () {
    $event = Event::factory()->create();
    $rules = str_repeat('1. Keputusan Panitia tidak dapat diganggu gugat.
', 200); // ~10,000 chars

    $this->actingAs(organizerOf($event))
        ->post(route('registration_categories.store', $event), categoryPayload([
            'form_pages' => [
                ['key' => 'page-1', 'title' => 'Peraturan', 'description' => $rules, 'fields' => [
                    ['key' => 'rules', 'label' => 'Peraturan Umum', 'type' => 'description', 'required' => false, 'help_text' => $rules],
                ]],
            ],
            'form_settings' => ['confirmation_message' => $rules],
        ]))
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('registration_categories.index', $event));

    // TrimStrings takes the trailing newline; the body itself is intact.
    expect(RegistrationCategory::firstOrFail()->allFields()[0]['help_text'])->toBe(trim($rules));
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

test('a file field can carry an image shape, but only a known one', function () {
    $event = Event::factory()->create();
    $this->actingAs(organizerOf($event));

    $this->post(route('registration_categories.store', $event), categoryPayload(['form_pages' => [
        ['key' => 'page-1', 'title' => 'Details', 'fields' => [
            ['key' => 'logo', 'label' => 'Logo', 'type' => 'file', 'required' => true, 'image_ratio' => 'square'],
        ]],
    ]]))->assertRedirect()->assertSessionHasNoErrors();

    expect(RegistrationCategory::sole()->allFields()[0]['image_ratio'])->toBe('square');

    $this->post(route('registration_categories.store', $event), categoryPayload(['name' => 'Bad', 'form_pages' => [
        ['key' => 'page-1', 'title' => 'Details', 'fields' => [
            ['key' => 'logo', 'label' => 'Logo', 'type' => 'file', 'required' => true, 'image_ratio' => 'circle'],
        ]],
    ]]))->assertSessionHasErrors('form_pages.0.fields.0.image_ratio');
});

// ─── Distance linking (running events) ──────────────────────────────────────

test('an individual category on a running event can name a distance', function () {
    $event = Event::factory()->running()->create();
    $distance = RunningEventCategory::factory()->forEvent($event)->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'name' => '5K with jersey',
            'subject_type' => 'individual',
            'price' => '150000',
            'quota' => null,
            'running_event_category_id' => $distance->id,
            'form_pages' => [],
        ]))
        ->assertRedirect(route('registration_categories.index', $event));

    expect(RegistrationCategory::sole()->running_event_category_id)->toBe($distance->id);
});

test('a distance from another event cannot be linked', function () {
    $event = Event::factory()->running()->create();
    $otherEvent = Event::factory()->running()->create();
    $foreignDistance = RunningEventCategory::factory()->forEvent($otherEvent)->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'subject_type' => 'individual',
            'running_event_category_id' => $foreignDistance->id,
            'form_pages' => [],
        ]))
        ->assertInvalid('running_event_category_id');

    expect(RegistrationCategory::count())->toBe(0);
});

test('a team category cannot be linked to a distance', function () {
    $event = Event::factory()->running()->create();
    $distance = RunningEventCategory::factory()->forEvent($event)->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'subject_type' => 'team',
            'running_event_category_id' => $distance->id,
            'form_pages' => [],
        ]))
        ->assertInvalid('running_event_category_id');
});

test('a distance link is rejected on a non-running event', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);

    $this->actingAs($user)
        ->post(route('registration_categories.store', $event), categoryPayload([
            'subject_type' => 'individual',
            'running_event_category_id' => 1,
            'form_pages' => [],
        ]))
        ->assertInvalid('running_event_category_id');
});

test('organizers can create and update race forms with gender fields', function (string $paymentMethod) {
    $event = Event::factory()->running()->create();
    $this->actingAs(organizerOf($event));
    $payload = categoryPayload([
        'name' => '5K Tanpa Jersey',
        'subject_type' => 'individual',
        'price' => '99000',
        'quota' => null,
        'payment_method' => $paymentMethod,
        'form_pages' => RunningEventCategory::defaultFormPages(),
    ]);

    $this->post(route('registration_categories.store', $event), $payload)
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('registration_categories.index', $event));

    $category = RegistrationCategory::sole();
    expect(collect($category->allFields())->firstWhere('key', 'gender')['type'])->toBe('gender');

    $payload['name'] = '5K Updated';
    $this->put(route('registration_categories.update', [$event, $category]), $payload)
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('registration_categories.index', $event));

    expect($category->fresh()->name)->toBe('5K Updated')
        ->and(collect($category->fresh()->allFields())->firstWhere('key', 'gender')['type'])->toBe('gender');
})->with(['midtrans', 'manual_transfer']);
