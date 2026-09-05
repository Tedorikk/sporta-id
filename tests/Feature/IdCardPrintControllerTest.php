<?php

use App\Models\Attendee;
use App\Models\AttendeeType;
use App\Models\CardTemplate;
use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function individualCategory(Event $event, array $overrides = []): RegistrationCategory
{
    return RegistrationCategory::create(array_merge([
        'event_id' => $event->id,
        'name' => 'Tenant',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'form_pages' => [],
    ], $overrides));
}

function registrant(RegistrationCategory $category, string $name, string $status = Registration::STATUS_CONFIRMED): Registration
{
    return Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $category->event_id,
        'name' => $name,
        'email' => strtolower(str_replace(' ', '.', $name)).'@example.com',
        'status' => $status,
    ]);
}

function guestPass(Event $event, string $name, string $status = Attendee::STATUS_ACTIVE): Attendee
{
    /** @var AttendeeType $type */
    $type = $event->attendeeTypes()->where('key', 'guest')->firstOrFail();

    return Attendee::create([
        'event_id' => $event->id,
        'attendee_type_id' => $type->id,
        'name' => $name,
        'organization' => 'Acme Corp',
        'status' => $status,
    ]);
}

test('guests cannot open the print sheet', function () {
    $event = Event::factory()->create();
    $category = individualCategory($event);

    $this->get(route('registration_categories.id-cards', [$event, $category]))
        ->assertRedirect(route('login'));
});

test('an organizer gets every confirmed registrant plus the sheet layouts', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $category = individualCategory($event);

    registrant($category, 'Bianca Ali');
    registrant($category, 'Ahmad Zaki');
    registrant($category, 'Unpaid Person', Registration::STATUS_PENDING_PAYMENT);

    $this->actingAs($user)
        ->get(route('registration_categories.id-cards', [$event, $category]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('id-card-print')
            ->has('cards', 2)
            // Alphabetical, so a printed stack is easy to hand out.
            ->where('cards.0.data.name', 'Ahmad Zaki')
            ->where('cards.1.data.name', 'Bianca Ali')
            ->where('cards.0.data.typeLabel', 'Tenant')
            ->where('subject.title', 'Tenant')
            ->has('sizes', 1)
            ->where('sizes.0.key', 'b3-a4')
            ->where('sizes.0.per_sheet', 5)
            ->has('sizes.0.slots', 5)
            ->has('template.canvas')
        );
});

test('a registrant card points its QR at the token URL, never the id', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $category = individualCategory($event);
    $registration = registrant($category, 'Ahmad Zaki');

    $this->actingAs($user)
        ->get(route('registration_categories.id-cards', [$event, $category]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('cards.0.url', "/registrations/{$registration->qr_token}/id-card")
        );
});

test('custom form answers reach the card as bindings', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $category = individualCategory($event);

    Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => 'Ahmad Zaki',
        'status' => Registration::STATUS_CONFIRMED,
        // An array answer used to be cast to string, which is a fatal.
        'form_data' => ['shirt_size' => 'M', 'sessions' => ['pagi', 'sore']],
    ]);

    $response = $this->actingAs($user)
        ->get(route('registration_categories.id-cards', [$event, $category]))
        ->assertOk();

    // Read the props directly: the binding keys contain dots, which Inertia's
    // fluent assertions treat as path separators.
    $data = $response->viewData('page')['props']['cards'][0]['data'];

    expect($data['form_data.shirt_size'])->toBe('M')
        ->and($data['form_data.sessions'])->toBe('pagi, sore');
});

test('the ids filter narrows the sheet to a single card', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $category = individualCategory($event);

    registrant($category, 'Bianca Ali');
    $wanted = registrant($category, 'Ahmad Zaki');

    $this->actingAs($user)
        ->get(route('registration_categories.id-cards', [$event, $category]).'?ids='.$wanted->id)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('cards', 1)
            ->where('cards.0.id', $wanted->id)
        );
});

test('the sheet uses the category-specific card template when one exists', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $category = individualCategory($event);
    registrant($category, 'Ahmad Zaki');

    CardTemplate::create([
        'event_id' => $event->id,
        'subject_type' => CardTemplate::SUBJECT_REGISTRATION,
        'registration_category_id' => $category->id,
        'name' => 'Tenant badge',
        'canvas' => ['width' => 344, 'height' => 427, 'background' => '#ffffff'],
        'elements' => [],
    ]);

    $this->actingAs($user)
        ->get(route('registration_categories.id-cards', [$event, $category]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('template.canvas.width', 344)
            ->where('template.canvas.height', 427)
        );
});

test('team categories have no printable sheet', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $category = individualCategory($event, ['subject_type' => RegistrationCategory::SUBJECT_TEAM]);

    $this->actingAs($user)
        ->get(route('registration_categories.id-cards', [$event, $category]))
        ->assertNotFound();
});

test('a category belonging to another event is not reachable through this one', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $otherCategory = individualCategory(Event::factory()->create());

    $this->actingAs($user)
        ->get(route('registration_categories.id-cards', [$event, $otherCategory]))
        ->assertNotFound();
});

// --- Attendees: people who were never registered but still need a card -----

test('guests cannot open an attendee type sheet', function () {
    $event = Event::factory()->create();
    $type = $event->attendeeTypes()->where('key', 'guest')->firstOrFail();

    $this->get(route('attendee-types.id-cards', [$event, $type]))
        ->assertRedirect(route('login'));
});

test('an attendee type sheet gathers only that type, and only active passes', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);

    guestPass($event, 'Bianca Ali');
    guestPass($event, 'Ahmad Zaki');
    guestPass($event, 'Revoked Person', Attendee::STATUS_REVOKED);

    // A different type on the same event must not bleed into this sheet.
    $photographer = $event->attendeeTypes()->where('key', 'photographer')->firstOrFail();
    Attendee::create([
        'event_id' => $event->id,
        'attendee_type_id' => $photographer->id,
        'name' => 'Camera Person',
    ]);

    $guest = $event->attendeeTypes()->where('key', 'guest')->firstOrFail();

    $this->actingAs($user)
        ->get(route('attendee-types.id-cards', [$event, $guest]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('id-card-print')
            ->has('cards', 2)
            ->where('cards.0.data.name', 'Ahmad Zaki')
            ->where('cards.1.data.name', 'Bianca Ali')
            ->where('cards.0.data.typeLabel', 'Guest')
            ->where('cards.0.data.organization', 'Acme Corp')
            ->where('subject.title', 'Guest')
            ->has('sizes.0.slots', 5)
        );
});

test('an attendee sheet resolves the attendee card template', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $type = $event->attendeeTypes()->where('key', 'guest')->firstOrFail();
    guestPass($event, 'Ahmad Zaki');

    CardTemplate::create([
        'event_id' => $event->id,
        'subject_type' => CardTemplate::SUBJECT_ATTENDEE,
        'attendee_type_id' => $type->id,
        'name' => 'Guest badge',
        'canvas' => ['width' => 300, 'height' => 400, 'background' => '#ffffff'],
        'elements' => [],
    ]);

    $this->actingAs($user)
        ->get(route('attendee-types.id-cards', [$event, $type]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('template.canvas.width', 300));
});

test('an attendee type belonging to another event is not reachable through this one', function () {
    $event = Event::factory()->create();
    $user = organizerOf($event);
    $otherType = Event::factory()->create()->attendeeTypes()->where('key', 'guest')->firstOrFail();

    $this->actingAs($user)
        ->get(route('attendee-types.id-cards', [$event, $otherType]))
        ->assertNotFound();
});
