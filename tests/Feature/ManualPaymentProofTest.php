<?php

use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;

beforeEach(function () {
    $this->event = Event::factory()->create();
    $this->category = RegistrationCategory::create([
        'event_id' => $this->event->id,
        'name' => 'Bank transfer',
        'subject_type' => 'individual',
        'payment_method' => 'manual_transfer',
        'price' => 99000,
    ]);
    $this->registration = Registration::create([
        'registration_category_id' => $this->category->id,
        'event_id' => $this->event->id,
        'name' => 'Participant',
        'status' => Registration::STATUS_PENDING_PAYMENT,
    ]);
    $this->payment = $this->registration->payments()->create([
        'order_id' => 'REG-account-name-test',
        'amount' => 99000,
    ]);
});

test('bank transfer proof saves the payer account name for organizer review', function () {
    $this->post(route('registrations.proof', $this->registration->qr_token), [
        'proof_path' => '/storage/uploads/receipt.png',
        'payer_account_name' => '  Tedrik Stepanus  ',
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($this->payment->fresh()->payer_account_name)->toBe('Tedrik Stepanus')
        ->and($this->payment->fresh()->proof_path)->toBe('/storage/uploads/receipt.png')
        ->and($this->payment->fresh()->status)->toBe(Payment::STATUS_PENDING)
        ->and($this->registration->fresh()->status)->toBe(Registration::STATUS_PENDING_PAYMENT);

    $this->actingAs(organizerOf($this->event))
        ->get(route('registration_categories.show', [$this->event, $this->category]))
        ->assertInertia(fn ($page) => $page
            ->where('registrations.data.0.payment.payer_account_name', 'Tedrik Stepanus'));
});

test('bank transfer proof requires a valid account name', function (mixed $name) {
    $this->postJson(route('registrations.proof', $this->registration->qr_token), [
        'proof_path' => '/storage/uploads/receipt.png',
        'payer_account_name' => $name,
    ])->assertUnprocessable()->assertJsonValidationErrors('payer_account_name');

    expect($this->payment->fresh()->proof_path)->toBeNull();
})->with([null, '', '   ', str_repeat('a', 256), [['invalid']]]);

test('gateway registrations cannot submit manual account details', function () {
    $this->category->update(['payment_method' => 'midtrans']);

    $this->postJson(route('registrations.proof', $this->registration->qr_token), [
        'proof_path' => '/storage/uploads/receipt.png',
        'payer_account_name' => 'Tedrik Stepanus',
    ])->assertNotFound();

    expect($this->payment->fresh()->payer_account_name)->toBeNull();
});
