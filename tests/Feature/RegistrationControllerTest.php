<?php

use App\Models\CardTemplate;
use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function makeRegistrationCategory(array $overrides = []): RegistrationCategory
{
    $event = Event::factory()->create();

    return RegistrationCategory::create(array_merge([
        'event_id' => $event->id,
        'name' => '5K Run',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => null,
        'quota' => null,
        'registration_open' => true,
        'form_pages' => [
            ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                ['key' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true],
                ['key' => 'shirt_size', 'label' => 'Shirt Size', 'type' => 'select', 'required' => true, 'options' => ['S', 'M', 'L']],
            ]],
        ],
    ], $overrides));
}

// ─── Public form (create) ───────────────────────────────────────────────────

test('the dynamic registration form loads when the category is open', function () {
    $category = makeRegistrationCategory();

    $this->get(route('registrations.create', [$category->event, $category]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('register-dynamic')
            ->where('registrationClosed', false)
        );
});

test('the dynamic registration form reports closed when the category is closed', function () {
    $category = makeRegistrationCategory(['registration_open' => false]);

    $this->get(route('registrations.create', [$category->event, $category]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('registrationClosed', true));
});

test('the dynamic registration form reports closed when quota is full', function () {
    $category = makeRegistrationCategory(['quota' => 1, 'registered_count' => 1]);

    $this->get(route('registrations.create', [$category->event, $category]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('registrationClosed', true));
});

// ─── Public form (store) — dynamic field validation ─────────────────────────

test('a required dynamic field must be present', function () {
    $category = makeRegistrationCategory();

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        // shirt_size missing
    ])->assertSessionHasErrors('form_data.shirt_size');
});

test('a select field rejects a value outside its options', function () {
    $category = makeRegistrationCategory();

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'form_data' => ['shirt_size' => 'XXL'],
    ])->assertSessionHasErrors('form_data.shirt_size');
});

test('a document field must be a valid url', function () {
    $category = makeRegistrationCategory([
        'form_pages' => [
            ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                ['key' => 'id_proof', 'label' => 'ID Proof', 'type' => 'document', 'required' => true],
            ]],
        ],
    ]);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Jane Doe',
        'form_data' => ['id_proof' => 'not-a-url'],
    ])->assertSessionHasErrors('form_data.id_proof');
});

test('a document field accepts an uploaded file url', function () {
    $category = makeRegistrationCategory([
        'form_pages' => [
            ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                ['key' => 'id_proof', 'label' => 'ID Proof', 'type' => 'document', 'required' => true],
            ]],
        ],
    ]);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Jane Doe',
        'form_data' => ['id_proof' => 'http://localhost/storage/uploads/documents/example.pdf'],
    ])->assertOk();

    expect(Registration::where('name', 'Jane Doe')->firstOrFail()->form_data)
        ->toBe(['id_proof' => 'http://localhost/storage/uploads/documents/example.pdf']);
});

test('an email-typed field rejects an invalid email', function () {
    $category = makeRegistrationCategory();

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Jane Doe',
        'email' => 'not-an-email',
        'form_data' => ['shirt_size' => 'M'],
    ])->assertSessionHasErrors('email');
});

test('a valid submission renders the confirmed registration inline with a card template', function () {
    $category = makeRegistrationCategory();

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'form_data' => ['shirt_size' => 'M'],
    ])
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('register-dynamic')
            ->where('confirmedRegistration.name', 'Jane Doe')
            // The `event` relation must be eager-loaded before rendering — the in-place
            // ID card reads registration.event.logo/name, and a missing relation here
            // silently renders those bindings blank instead of erroring.
            ->where('confirmedRegistration.event.name', $category->event->name)
            ->has('cardTemplate')
        );

    $registration = Registration::where('name', 'Jane Doe')->firstOrFail();

    expect($registration->status)->toBe(Registration::STATUS_CONFIRMED)
        ->and($registration->email)->toBe('jane@example.com')
        ->and($registration->form_data)->toBe(['shirt_size' => 'M'])
        ->and($registration->team_id)->toBeNull()
        ->and($category->fresh()->registered_count)->toBe(1);
});

test('the confirmed registration reflects a category-specific card template when one exists', function () {
    $category = makeRegistrationCategory();
    CardTemplate::create([
        'event_id' => $category->event_id,
        'subject_type' => CardTemplate::SUBJECT_REGISTRATION,
        'registration_category_id' => $category->id,
        'name' => 'Category specific',
        'canvas' => ['width' => 200, 'height' => 300, 'background' => '#000000'],
        'elements' => [],
    ]);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'form_data' => ['shirt_size' => 'M'],
    ])
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('cardTemplate.canvas.width', 200));
});

test('a paid category creates a pending-payment registration with a snap token', function () {
    Http::fake([
        'app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'snap-token-abc'], 201),
    ]);

    $category = makeRegistrationCategory(['price' => '150000']);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'form_data' => ['shirt_size' => 'M'],
    ])
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('register-dynamic')
            ->where('confirmedRegistration.status', 'pending_payment')
            ->where('snapToken', 'snap-token-abc')
            ->where('cardTemplate', null)
        );

    $registration = Registration::where('name', 'Jane Doe')->firstOrFail();

    expect($registration->status)->toBe(Registration::STATUS_PENDING_PAYMENT)
        ->and($registration->expires_at)->not->toBeNull()
        // Quota is reserved immediately, same as a free registration.
        ->and($category->fresh()->registered_count)->toBe(1);

    $payment = Payment::where('registration_id', $registration->id)->firstOrFail();

    expect($payment->snap_token)->toBe('snap-token-abc')
        ->and((float) $payment->amount)->toBe(150000.0);

    Http::assertSent(function ($request) use ($payment, $category) {
        $data = $request->data();
        $item = $data['item_details'][0] ?? [];

        return ($data['transaction_details']['order_id'] ?? null) === $payment->order_id
            && ($data['transaction_details']['gross_amount'] ?? null) === 150000
            // Midtrans's own payment page shows item_details, so the payer sees
            // what they're buying and not just an order id.
            && str_contains($item['name'] ?? '', $category->name)
            && ($item['price'] ?? null) === 150000
            && ($item['quantity'] ?? null) === 1;
    });
});

test('a team-subject category also creates a team and returns it inline', function () {
    $category = makeRegistrationCategory([
        'subject_type' => RegistrationCategory::SUBJECT_TEAM,
        'form_pages' => [],
    ]);

    $this->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Team Alpha',
    ])
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('register-dynamic')
            ->where('confirmedRegistration.name', 'Team Alpha')
            ->where('confirmedRegistration.team.name', 'Team Alpha')
            ->where('cardTemplate', null)
        );

    $registration = Registration::where('name', 'Team Alpha')->firstOrFail();

    expect($registration->team_id)->not->toBeNull();
    expect(Team::find($registration->team_id)->name)->toBe('Team Alpha');
});

// ─── Quota enforcement ───────────────────────────────────────────────────────

test('registration is rejected once quota is reached', function () {
    $category = makeRegistrationCategory(['quota' => 1, 'form_pages' => []]);

    $this->post(route('registrations.store', [$category->event, $category]), ['name' => 'First'])
        ->assertOk();

    $this->post(route('registrations.store', [$category->event, $category]), ['name' => 'Second'])
        ->assertForbidden();

    expect(Registration::count())->toBe(1);
});

test('registration is rejected once the category is closed', function () {
    $category = makeRegistrationCategory(['registration_open' => false, 'form_pages' => []]);

    $this->post(route('registrations.store', [$category->event, $category]), ['name' => 'Someone'])
        ->assertForbidden();

    expect(Registration::count())->toBe(0);
});
