<?php

use App\Models\Event;
use App\Models\RaceParticipant;
use App\Models\RegistrationCategory;
use App\Models\RunningEventCategory;
use App\Services\Midtrans\MidtransGateway;
use App\Services\Payments\PaymentReconciler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function raceEntryCategory(array $distanceOverrides = [], array $categoryOverrides = []): RegistrationCategory
{
    $event = Event::factory()->running()->create();
    $distance = RunningEventCategory::factory()->forEvent($event)->create($distanceOverrides);

    return RegistrationCategory::factory()
        ->forDistance($distance)
        ->withRaceForm()
        ->create($categoryOverrides);
}

/**
 * A race registration payload: `email`/`phone`/`photo` map onto the
 * registration's own columns (RegistrationController::RESERVED_KEYS), so
 * they sit at the top level rather than inside form_data — same as the
 * public form itself submits them.
 */
function raceRegistrationPayload(string $name, array $overrides = []): array
{
    return array_merge([
        'name' => $name,
        'email' => 'runner@example.com',
        'phone' => '+6281234567890',
        'photo' => 'http://localhost/storage/uploads/photo.webp',
        'form_data' => [
            'dob' => '2000-01-01',
            'gender' => 'male',
            'nationality' => 'WNI',
            'jersey_size' => 'M',
            'identity_card' => 'http://localhost/storage/uploads/id.webp',
            'agree_rules' => true,
        ],
    ], $overrides);
}

test('a free race registration is entered on the start list with a bib immediately', function () {
    $category = raceEntryCategory(['bib_start_number' => 101]);

    $this->post(route('registrations.store', [$category->event, $category]), raceRegistrationPayload('Nadia Putri'))
        ->assertOk();

    $participant = RaceParticipant::sole();

    expect($participant->name)->toBe('Nadia Putri')
        ->and($participant->bib_number)->toBe('101')
        ->and($participant->gender)->toBe('male')
        ->and($participant->dob->toDateString())->toBe('2000-01-01');
});

test('a paid race registration only joins the start list once payment settles', function () {
    Http::fake(['app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'tok'], 201)]);
    $category = raceEntryCategory(['bib_start_number' => 1], ['price' => 150000]);

    $this->post(route('registrations.store', [$category->event, $category]), raceRegistrationPayload('Bagus Wicaksono'))
        ->assertOk();

    expect(RaceParticipant::count())->toBe(0);

    $registration = $category->registrations()->sole();
    $payment = $registration->payments()->sole();

    app(PaymentReconciler::class)->reconcile($payment, app(MidtransGateway::class)->mapStatusToOutcome([
        'transaction_status' => 'settlement',
        'transaction_id' => 'mt-1',
    ]));

    $participant = RaceParticipant::sole();
    expect($participant->name)->toBe('Bagus Wicaksono')
        ->and($participant->bib_number)->toBe('1');
});

test('an expired paid registration never appears on the start list', function () {
    Http::fake(['app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'tok'], 201)]);
    $category = raceEntryCategory([], ['price' => 150000]);

    $this->post(route('registrations.store', [$category->event, $category]), raceRegistrationPayload('Unpaid Runner'))
        ->assertOk();

    $registration = $category->registrations()->sole();
    $payment = $registration->payments()->sole();

    app(PaymentReconciler::class)->reconcile($payment, app(MidtransGateway::class)->mapStatusToOutcome(['transaction_status' => 'expire']));

    expect(RaceParticipant::count())->toBe(0)
        ->and($registration->fresh()->status)->toBe('expired')
        ->and($category->fresh()->registered_count)->toBe(0);
});

test('a runner under the minimum age is rejected', function () {
    $category = raceEntryCategory(['minimum_age' => 17, 'start_at' => now()->addMonth()]);

    $this->post(route('registrations.store', [$category->event, $category]), raceRegistrationPayload('Too Young', [
        'form_data' => ['dob' => now()->subYears(10)->toDateString(), 'gender' => 'male'],
    ]))->assertSessionHasErrors('form_data.dob');

    expect(RaceParticipant::count())->toBe(0);
});

test('men and women run independent bib sequences when the distance sets separate starts', function () {
    $category = raceEntryCategory(['bib_start_male' => 1, 'bib_start_female' => 3000]);

    $this->post(route('registrations.store', [$category->event, $category]), raceRegistrationPayload('Man One'))
        ->assertOk();

    $this->post(route('registrations.store', [$category->event, $category]), raceRegistrationPayload('Woman One', [
        'form_data' => [
            'dob' => '2000-01-01',
            'gender' => 'female',
            'nationality' => 'WNI',
            'jersey_size' => 'M',
            'identity_card' => 'http://localhost/storage/uploads/id.webp',
            'agree_rules' => true,
        ],
    ]))->assertOk();

    $this->post(route('registrations.store', [$category->event, $category]), raceRegistrationPayload('Man Two'))
        ->assertOk();

    expect(RaceParticipant::where('name', 'Man One')->value('bib_number'))->toBe('1')
        ->and(RaceParticipant::where('name', 'Man Two')->value('bib_number'))->toBe('2')
        ->and(RaceParticipant::where('name', 'Woman One')->value('bib_number'))->toBe('3000');
});
