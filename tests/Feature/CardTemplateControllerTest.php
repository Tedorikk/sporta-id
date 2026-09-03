<?php

use App\Models\CardTemplate;
use App\Models\Event;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Event::boot() auto-seeds guest/tenant/photographer for every new event —
    // reuse that instead of creating a colliding duplicate key.
    $this->event = Event::factory()->create();
    $this->user = organizerOf($this->event);
    $this->type = $this->event->attendeeTypes()->where('key', 'guest')->firstOrFail();
    $this->category = RegistrationCategory::create([
        'event_id' => $this->event->id,
        'name' => '5K Fun Run',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'form_pages' => [],
    ]);
});

function templatePayload(array $overrides = []): array
{
    return array_merge([
        'subject_type' => 'attendee',
        'attendee_type_id' => null,
        'name' => 'Guest badge',
        'canvas' => ['width' => 336, 'height' => 480, 'background' => '#ffffff'],
        'elements' => [
            [
                'id' => 'name',
                'kind' => 'text',
                'name' => 'Full name',
                'binding' => 'name',
                'x' => 20,
                'y' => 180,
                'width' => 296,
                'height' => 32,
                'rotation' => 0,
                'zIndex' => 1,
                'locked' => false,
                'hidden' => false,
                'style' => ['fontSize' => 22, 'fontWeight' => 700, 'textAlign' => 'center'],
            ],
        ],
    ], $overrides);
}

// ─── Index ────────────────────────────────────────────────────────────────────

test('the index lists templates plus a default layout for every subject type', function () {
    $this->actingAs($this->user)
        ->get(route('id-card-templates.index', $this->event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/events/id-card-templates/index')
            ->has('defaultTemplates.attendee.elements')
            ->has('defaultTemplates.player')
            ->has('defaultTemplates.team')
            ->has('defaultTemplates.registration')
            ->has('attendeeTypes', 3)
            ->where('attendeeTypes.0.attendees_count', 0)
            ->has('registrationCategories', 1)
            ->where('registrationCategories.0.name', '5K Fun Run')
            ->where('registrationCategories.0.registrations_count', 0)
        );
});

test('the index only lists individual-subject registration categories', function () {
    RegistrationCategory::create([
        'event_id' => $this->event->id,
        'name' => 'Team Relay',
        'subject_type' => RegistrationCategory::SUBJECT_TEAM,
        'form_pages' => [],
    ]);

    $this->actingAs($this->user)
        ->get(route('id-card-templates.index', $this->event))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('registrationCategories', 1));
});

test('guests cannot reach the template index', function () {
    $this->get(route('id-card-templates.index', $this->event))
        ->assertRedirect(route('login'));
});

// ─── Builder ──────────────────────────────────────────────────────────────────

test('the builder seeds the fallback layout when nothing is customized yet', function () {
    $this->actingAs($this->user)
        ->get(route('id-card-templates.builder', [$this->event, 'subject_type' => 'attendee']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/events/id-card-templates/edit')
            ->where('template.id', null)
            ->has('template.elements')
            ->has('defaultTemplate.elements')
            ->where('subjectType', 'attendee')
        );
});

test('the builder loads the existing template for a specific attendee type', function () {
    $template = CardTemplate::create(templatePayload([
        'event_id' => $this->event->id,
        'attendee_type_id' => $this->type->id,
        'name' => 'VIP layout',
    ]));

    $this->actingAs($this->user)
        ->get(route('id-card-templates.builder', [
            $this->event,
            'subject_type' => 'attendee',
            'attendee_type_id' => $this->type->id,
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('template.id', $template->id)
            ->where('template.name', 'VIP layout')
            ->where('attendeeTypeId', $this->type->id)
        );
});

test('the builder loads the existing template for a specific registration category', function () {
    $template = CardTemplate::create(templatePayload([
        'event_id' => $this->event->id,
        'subject_type' => 'registration',
        'attendee_type_id' => null,
        'registration_category_id' => $this->category->id,
        'name' => 'Fun Run layout',
    ]));

    $this->actingAs($this->user)
        ->get(route('id-card-templates.builder', [
            $this->event,
            'subject_type' => 'registration',
            'registration_category_id' => $this->category->id,
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('template.id', $template->id)
            ->where('template.name', 'Fun Run layout')
            ->where('registrationCategoryId', $this->category->id)
            ->has('registrationCategories', 1)
        );
});

test('the builder rejects an unknown subject type', function () {
    $this->actingAs($this->user)
        ->get(route('id-card-templates.builder', [$this->event, 'subject_type' => 'dragon']))
        ->assertNotFound();
});

// ─── Store & update ───────────────────────────────────────────────────────────

test('a template can be created', function () {
    $this->actingAs($this->user)
        ->post(route('id-card-templates.store', $this->event), templatePayload())
        ->assertRedirect();

    $template = CardTemplate::first();

    expect($template->event_id)->toBe($this->event->id)
        ->and($template->canvas['width'])->toBe(336)
        ->and($template->elements[0]['binding'])->toBe('name')
        ->and($template->elements[0]['style']['fontSize'])->toBe(22);
});

test('storing twice for the same subject updates instead of duplicating', function () {
    $this->actingAs($this->user)->post(route('id-card-templates.store', $this->event), templatePayload());
    $this->actingAs($this->user)->post(route('id-card-templates.store', $this->event), templatePayload(['name' => 'Renamed']));

    expect(CardTemplate::count())->toBe(1)
        ->and(CardTemplate::first()->name)->toBe('Renamed');
});

test('templates for different attendee types coexist', function () {
    $this->actingAs($this->user)->post(route('id-card-templates.store', $this->event), templatePayload());
    $this->actingAs($this->user)->post(
        route('id-card-templates.store', $this->event),
        templatePayload(['attendee_type_id' => $this->type->id, 'name' => 'Guest only'])
    );

    expect(CardTemplate::count())->toBe(2);
});

test('templates for different registration categories coexist', function () {
    $other = RegistrationCategory::create([
        'event_id' => $this->event->id,
        'name' => 'VIP Pass',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'form_pages' => [],
    ]);

    $this->actingAs($this->user)->post(route('id-card-templates.store', $this->event), templatePayload([
        'subject_type' => 'registration',
        'attendee_type_id' => null,
        'registration_category_id' => $this->category->id,
        'name' => 'Fun Run layout',
    ]));
    $this->actingAs($this->user)->post(route('id-card-templates.store', $this->event), templatePayload([
        'subject_type' => 'registration',
        'attendee_type_id' => null,
        'registration_category_id' => $other->id,
        'name' => 'VIP layout',
    ]));

    expect(CardTemplate::where('subject_type', 'registration')->count())->toBe(2);
});

test('a template can be updated', function () {
    $template = CardTemplate::create(templatePayload(['event_id' => $this->event->id]));

    $this->actingAs($this->user)
        ->put(route('id-card-templates.update', [$this->event, $template]), templatePayload(['name' => 'Updated']))
        ->assertRedirect();

    expect($template->fresh()->name)->toBe('Updated');
});

test('a template belonging to another event cannot be updated', function () {
    $other = Event::factory()->create();
    $template = CardTemplate::create(templatePayload(['event_id' => $other->id]));

    $this->actingAs($this->user)
        ->put(route('id-card-templates.update', [$this->event, $template]), templatePayload())
        ->assertNotFound();
});

test('an empty layout is a valid save', function () {
    $this->actingAs($this->user)
        ->post(route('id-card-templates.store', $this->event), templatePayload(['elements' => []]))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(CardTemplate::first()->elements)->toBe([]);
});

test('invalid layouts are rejected', function (array $payload, string $field) {
    $this->actingAs($this->user)
        ->post(route('id-card-templates.store', $this->event), templatePayload($payload))
        ->assertSessionHasErrors($field);

    expect(CardTemplate::count())->toBe(0);
})->with([
    'unknown subject' => [['subject_type' => 'dragon'], 'subject_type'],
    'missing name' => [['name' => ''], 'name'],
    'oversized canvas' => [['canvas' => ['width' => 9000, 'height' => 480]], 'canvas.width'],
    'unknown element kind' => [
        [['elements' => [['id' => 'a', 'kind' => 'video', 'x' => 0, 'y' => 0, 'width' => 10, 'height' => 10]]]][0],
        'elements.0.kind',
    ],
]);

// ─── Destroy ──────────────────────────────────────────────────────────────────

test('deleting a template falls the subject back to the built-in layout', function () {
    $template = CardTemplate::create(templatePayload(['event_id' => $this->event->id]));

    $this->actingAs($this->user)
        ->delete(route('id-card-templates.destroy', [$this->event, $template]))
        ->assertRedirect(route('id-card-templates.index', $this->event));

    expect(CardTemplate::count())->toBe(0)
        ->and(CardTemplate::resolveFor($this->event, 'attendee'))
        ->toBe(CardTemplate::fallbackTemplate('attendee'));
});

// ─── Preview endpoint ───────────────────────────────────────────────────────────

test('the preview endpoint returns the category-specific template when one exists', function () {
    CardTemplate::create(templatePayload([
        'event_id' => $this->event->id,
        'subject_type' => 'registration',
        'attendee_type_id' => null,
        'registration_category_id' => $this->category->id,
        'name' => 'Category specific',
        'canvas' => ['width' => 200, 'height' => 300, 'background' => '#000000'],
    ]));

    $this->actingAs($this->user)
        ->get(route('id-card-templates.preview', $this->event).'?'.http_build_query([
            'subject_type' => 'individual',
            'registration_category_id' => $this->category->id,
        ]))
        ->assertOk()
        ->assertJsonPath('canvas.width', 200);
});

test('the preview endpoint falls back to the generic template for a category with no design', function () {
    $this->actingAs($this->user)
        ->get(route('id-card-templates.preview', $this->event).'?'.http_build_query([
            'subject_type' => 'individual',
            'registration_category_id' => $this->category->id,
        ]))
        ->assertOk()
        ->assertJsonPath('canvas.width', 380);
});

test('the preview endpoint returns nothing for team-subject categories', function () {
    $this->actingAs($this->user)
        ->get(route('id-card-templates.preview', $this->event).'?subject_type=team')
        ->assertOk()
        ->assertJson([]);
});

// ─── Resolution precedence ────────────────────────────────────────────────────

test('a type-specific template wins over the event-wide one', function () {
    CardTemplate::create(templatePayload(['event_id' => $this->event->id, 'name' => 'Generic']));
    CardTemplate::create(templatePayload([
        'event_id' => $this->event->id,
        'attendee_type_id' => $this->type->id,
        'name' => 'Type specific',
        'canvas' => ['width' => 200, 'height' => 300, 'background' => '#000000'],
    ]));

    $resolved = CardTemplate::resolveFor($this->event, 'attendee', $this->type->id);

    expect($resolved['canvas']['width'])->toBe(200);
});

test('a type without its own template falls back to the event-wide one', function () {
    CardTemplate::create(templatePayload(['event_id' => $this->event->id, 'name' => 'Generic']));

    $resolved = CardTemplate::resolveFor($this->event, 'attendee', $this->type->id);

    expect($resolved['canvas']['width'])->toBe(336);
});

test('a category-specific registration template wins over the event-wide one', function () {
    CardTemplate::create(templatePayload([
        'event_id' => $this->event->id,
        'subject_type' => 'registration',
        'attendee_type_id' => null,
        'name' => 'Generic',
    ]));
    CardTemplate::create(templatePayload([
        'event_id' => $this->event->id,
        'subject_type' => 'registration',
        'attendee_type_id' => null,
        'registration_category_id' => $this->category->id,
        'name' => 'Category specific',
        'canvas' => ['width' => 200, 'height' => 300, 'background' => '#000000'],
    ]));

    $resolved = CardTemplate::resolveFor($this->event, 'registration', registrationCategoryId: $this->category->id);

    expect($resolved['canvas']['width'])->toBe(200);
});

test('a registration category without its own template falls back to the event-wide one', function () {
    CardTemplate::create(templatePayload([
        'event_id' => $this->event->id,
        'subject_type' => 'registration',
        'attendee_type_id' => null,
        'name' => 'Generic',
    ]));

    $resolved = CardTemplate::resolveFor($this->event, 'registration', registrationCategoryId: $this->category->id);

    expect($resolved['canvas']['width'])->toBe(336);
});

test('a registration category with no template at all falls back to the hardcoded default', function () {
    $resolved = CardTemplate::resolveFor($this->event, 'registration', registrationCategoryId: $this->category->id);

    expect($resolved)->toBe(CardTemplate::fallbackTemplate('registration'));
});
