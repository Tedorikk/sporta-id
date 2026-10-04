<?php

use App\Models\Event;
use App\Models\Payment;
use App\Models\Registration;
use App\Models\RegistrationCategory;

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
         ->assertSee('Pay')
         ->click('button:has-text("Pay")')
         // The controller will create a real Xendit test session (if configured)
         // and redirect the browser to the Xendit checkout URL.
         ->waitForNavigation()
         ->assertUrlIs('https://checkout-staging.xendit.co/*');
});