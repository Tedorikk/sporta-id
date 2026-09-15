<?php

use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\Team;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function tournamentCategory(array $overrides = []): BasketballEventCategory
{
    $event = Event::factory()->basketball()->create();
    $tournament = BasketballEventCategory::factory()->forEvent($event)->create();
    $tournament->registrationCategory->update($overrides);

    return $tournament->fresh();
}

function registrationPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Team Alpha',
        'email' => 'captain@example.com',
        'form_data' => [
            'bukti_pembayaran' => 'https://example.com/proof.pdf',
            'nama_rekening_pembayaran' => 'Jane Doe',
        ],
    ], $overrides);
}

// ─── Public registration places the team ────────────────────────────────────

test('a team registering through a tournament category lands in that basketball category', function () {
    $tournament = tournamentCategory();
    $registrationCategory = $tournament->registrationCategory;

    $this->post(route('registrations.store', [$registrationCategory->event, $registrationCategory]), registrationPayload())
        ->assertOk();

    $registration = Registration::sole();

    expect($registration->status)->toBe(Registration::STATUS_CONFIRMED)
        ->and($registration->team)->not->toBeNull()
        ->and($registration->team->status)->toBe(Team::STATUS_PENDING)
        ->and($registration->team->basketball_event_category_id)->toBe($tournament->id)
        ->and($registration->form_data['nama_rekening_pembayaran'])->toBe('Jane Doe');
});

test('a team registering through a plain team category is created without a basketball category', function () {
    $event = Event::factory()->basketball()->create();
    $registrationCategory = RegistrationCategory::factory()->team()->for($event)->create();

    $this->post(route('registrations.store', [$event, $registrationCategory]), registrationPayload(['form_data' => []]))
        ->assertOk();

    expect(Registration::sole()->team->basketball_event_category_id)->toBeNull();
});

// ─── A registration that falls through takes the team with it ───────────────

function pendingTeamRegistration(): Registration
{
    $tournament = tournamentCategory(['price' => 150000]);
    $registrationCategory = $tournament->registrationCategory;

    test()->post(route('registrations.store', [$registrationCategory->event, $registrationCategory]), registrationPayload())
        ->assertOk();

    $registration = Registration::sole();

    expect($registration->status)->toBe(Registration::STATUS_PENDING_PAYMENT)
        ->and($registration->team->status)->toBe(Team::STATUS_PENDING);

    return $registration;
}

function paymentFor(Registration $registration, string $status): Payment
{
    return Payment::create([
        'payable_type' => Registration::class,
        'payable_id' => $registration->id,
        'order_id' => 'REG-'.$registration->id.'-'.strtoupper($status),
        'amount' => 150000,
        'status' => $status,
        'payment_type' => 'bank_transfer',
    ]);
}

test('an expired payment rejects the team', function () {
    $registration = pendingTeamRegistration();

    $registration->applyPaymentStatus(paymentFor($registration, Payment::STATUS_EXPIRE), Payment::STATUS_EXPIRE);

    expect($registration->fresh()->status)->toBe(Registration::STATUS_EXPIRED)
        ->and($registration->team->fresh()->status)->toBe(Team::STATUS_REJECTED);
});

test('a settled payment leaves the team pending review', function () {
    $registration = pendingTeamRegistration();

    $registration->applyPaymentStatus(paymentFor($registration, Payment::STATUS_SETTLEMENT), Payment::STATUS_SETTLEMENT);

    expect($registration->fresh()->status)->toBe(Registration::STATUS_CONFIRMED)
        ->and($registration->team->fresh()->status)->toBe(Team::STATUS_PENDING);
});

test('the unpaid-expiry command rejects the team', function () {
    $registration = pendingTeamRegistration();
    $registration->update(['expires_at' => now()->subHour()]);

    $this->artisan('registrations:expire-unpaid')->assertSuccessful();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_EXPIRED)
        ->and($registration->team->fresh()->status)->toBe(Team::STATUS_REJECTED);
});

test('a refund rejects the team', function () {
    $registration = pendingTeamRegistration();
    $registration->applyPaymentStatus(paymentFor($registration, Payment::STATUS_SETTLEMENT), Payment::STATUS_SETTLEMENT);

    $this->actingAs(organizerOf($registration->event))
        ->post(route('registrations.refund', [$registration->event, $registration]), ['note' => 'Withdrew'])
        ->assertRedirect();

    expect($registration->fresh()->status)->toBe(Registration::STATUS_CANCELLED)
        ->and($registration->team->fresh()->status)->toBe(Team::STATUS_REJECTED);
});

test('a verified team is not touched by unrelated registration edits', function () {
    $registration = pendingTeamRegistration();
    $registration->applyPaymentStatus(paymentFor($registration, Payment::STATUS_SETTLEMENT), Payment::STATUS_SETTLEMENT);
    $registration->team->update(['status' => Team::STATUS_VERIFIED]);

    $registration->update(['phone' => '+6281234567890']);

    expect($registration->team->fresh()->status)->toBe(Team::STATUS_VERIFIED);
});

// ─── Organiser-created teams get the same registration ──────────────────────

test('a team added by an organiser gets a confirmed registration that holds a slot', function () {
    $tournament = tournamentCategory(['quota' => 8]);
    $event = $tournament->registrationCategory->event;

    $this->actingAs(organizerOf($event))
        ->post(route('teams.store', $event), [
            'name' => 'Walk-in Warriors',
            'status' => Team::STATUS_PENDING,
            'basketball_event_category_id' => $tournament->id,
        ])
        ->assertRedirect(route('teams.index', $event));

    $team = Team::sole();
    $registration = $team->registration;

    expect($registration)->not->toBeNull()
        ->and($registration->status)->toBe(Registration::STATUS_CONFIRMED)
        ->and($registration->registration_category_id)->toBe($tournament->registration_category_id)
        ->and($registration->name)->toBe('Walk-in Warriors')
        ->and($registration->qr_token)->not->toBeEmpty()
        ->and($tournament->registrationCategory->fresh()->registered_count)->toBe(1);
});

test('a team added without a category has no registration to attach to', function () {
    $event = Event::factory()->basketball()->create();
    BasketballEventCategory::factory()->forEvent($event)->create();

    $this->actingAs(organizerOf($event))
        ->post(route('teams.store', $event), [
            'name' => 'Uncategorised',
            'status' => Team::STATUS_PENDING,
            'basketball_event_category_id' => null,
        ])
        ->assertRedirect();

    expect(Team::sole()->registration)->toBeNull();
});

test('renaming a team renames its registration', function () {
    $tournament = tournamentCategory();
    $event = $tournament->registrationCategory->event;
    $this->actingAs(organizerOf($event))
        ->post(route('teams.store', $event), ['name' => 'Old Name', 'status' => Team::STATUS_PENDING, 'basketball_event_category_id' => $tournament->id]);
    $team = Team::sole();

    $this->put(route('teams.update', [$event, $team]), [
        'name' => 'New Name',
        'status' => Team::STATUS_VERIFIED,
        'basketball_event_category_id' => $tournament->id,
    ])->assertRedirect();

    expect($team->registration->fresh()->name)->toBe('New Name');
});

test('deleting a team cancels its registration and releases the slot', function () {
    $tournament = tournamentCategory(['quota' => 8]);
    $event = $tournament->registrationCategory->event;
    $this->actingAs(organizerOf($event))
        ->post(route('teams.store', $event), ['name' => 'Leaving', 'status' => Team::STATUS_PENDING, 'basketball_event_category_id' => $tournament->id]);
    $team = Team::sole();
    $registration = $team->registration;

    $this->delete(route('teams.destroy', [$event, $team]))->assertRedirect();

    expect(Team::find($team->id))->toBeNull()
        ->and($registration->fresh()->status)->toBe(Registration::STATUS_CANCELLED)
        ->and($registration->fresh()->team_id)->toBeNull()
        ->and($tournament->registrationCategory->fresh()->registered_count)->toBe(0);
});

test('a team from another event cannot be updated or deleted through this event', function () {
    $tournament = tournamentCategory();
    $event = $tournament->registrationCategory->event;
    $otherEvent = Event::factory()->basketball()->create(['organization_id' => $event->organization_id]);
    $foreignTeam = Team::factory()->create(['event_id' => $otherEvent->id]);

    $this->actingAs(organizerOf($event));

    $this->put(route('teams.update', [$event, $foreignTeam]), ['name' => 'Hijacked', 'status' => Team::STATUS_PENDING])
        ->assertNotFound();
    $this->delete(route('teams.destroy', [$event, $foreignTeam]))->assertNotFound();

    expect($foreignTeam->fresh())->not->toBeNull();
});
