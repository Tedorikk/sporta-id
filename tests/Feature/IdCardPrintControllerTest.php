<?php

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
            ->has('registrations', 2)
            // Alphabetical, so a printed stack is easy to hand out.
            ->where('registrations.0.name', 'Ahmad Zaki')
            ->where('registrations.1.name', 'Bianca Ali')
            ->has('sizes', 1)
            ->where('sizes.0.key', 'b3-a4')
            ->where('sizes.0.per_sheet', 5)
            ->has('sizes.0.slots', 5)
            ->has('template.canvas')
        );
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
            ->has('registrations', 1)
            ->where('registrations.0.id', $wanted->id)
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
