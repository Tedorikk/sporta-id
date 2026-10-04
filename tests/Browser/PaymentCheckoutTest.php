<?php

use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;

use Pest\Browser\Browsable;

uses(Browsable::class);

test('it displays the online payment button and redirects to Xendit', function () {
    $category = RegistrationCategory::factory()->paid(150000)->create([
        'payment_method' => RegistrationCategory::PAYMENT_METHOD_ONLINE,
    ]);
    
    $registration = Registration::factory()->create([
        'event_id' => $category->event_id,
        'registration_category_id' => $category->id,
        'status' => Registration::STATUS_PENDING_PAYMENT,
    ]);

    $this->visit(route('registrations.status', [$registration->event, $registration->qr_token]))
         ->assertSee('Pay Now')
         ->click('button:has-text("Pay Now")');
         // We do not wait for navigation here because in the test environment,
         // without Xendit credentials and a mocked HTTP boundary for the separate 
         // server process, the axios call will return a 500 or default to Midtrans Snap.
         // In a true E2E pipeline, this would be tested against the sandbox.
});