<?php

use App\Models\CardTemplate;
use App\Models\Event;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function verifiableRegistration(?Event $event = null): Registration
{
    $event ??= Event::factory()->create();

    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Peserta',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'form_pages' => [],
    ]);

    return Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => 'Ahmad Zaki',
        'status' => Registration::STATUS_CONFIRMED,
    ]);
}

test('a new registration is given a verification code', function () {
    $registration = verifiableRegistration();

    expect($registration->verification_code)
        ->toMatch('/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{3}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{3}$/');
});

test('codes leave out the characters people misread off a badge', function () {
    $codes = collect(range(1, 200))->map(fn () => Registration::generateVerificationCode())->implode('');

    expect($codes)->not->toContain('0')
        ->and($codes)->not->toContain('O')
        ->and($codes)->not->toContain('1')
        ->and($codes)->not->toContain('I')
        ->and($codes)->not->toContain('L');
});

test('codes differ between registrations', function () {
    $codes = collect(range(1, 50))->map(fn () => Registration::generateVerificationCode())->unique();

    // Not a uniqueness guarantee — just proof the generator isn't constant.
    expect($codes)->toHaveCount(50);
});

test('an explicit code survives creation', function () {
    $event = Event::factory()->create();
    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'Peserta',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'form_pages' => [],
    ]);

    $registration = Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => 'Ahmad Zaki',
        'verification_code' => 'ABC-DEF',
    ]);

    expect($registration->verification_code)->toBe('ABC-DEF');
});

test('the card page a QR opens shows the code to check against', function () {
    $registration = verifiableRegistration();

    $this->get(route('registrations.id-card', $registration->qr_token))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('registration-id-card')
            ->where('registration.verification_code', $registration->verification_code)
        );
});

test('an organizer can issue a new code, retiring cards already printed', function () {
    $registration = verifiableRegistration();
    $user = organizerOf($registration->event);
    $old = $registration->verification_code;

    $this->actingAs($user)
        ->patch(route('registrations.verification-code', [$registration->event_id, $registration]))
        ->assertRedirect();

    expect($registration->fresh()->verification_code)
        ->not->toBe($old)
        ->toMatch('/^[A-Z2-9]{3}-[A-Z2-9]{3}$/');
});

test('guests cannot issue a new code', function () {
    $registration = verifiableRegistration();
    $old = $registration->verification_code;

    $this->patch(route('registrations.verification-code', [$registration->event_id, $registration]))
        ->assertRedirect(route('login'));

    expect($registration->fresh()->verification_code)->toBe($old);
});

test('a registration cannot be re-coded through another event', function () {
    $registration = verifiableRegistration();
    $otherEvent = Event::factory()->create();
    $user = organizerOf($otherEvent);
    $old = $registration->verification_code;

    $this->actingAs($user)
        ->patch(route('registrations.verification-code', [$otherEvent, $registration]))
        ->assertNotFound();

    expect($registration->fresh()->verification_code)->toBe($old);
});

test('the print sheet carries each card\'s code', function () {
    $registration = verifiableRegistration();
    $user = organizerOf($registration->event);

    $this->actingAs($user)
        ->get(route('registration_categories.id-cards', [
            $registration->event_id,
            $registration->registration_category_id,
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('registrations.0.verification_code', $registration->verification_code)
        );
});

test('the default card prints the code', function () {
    $default = CardTemplate::fallbackTemplate(CardTemplate::SUBJECT_REGISTRATION);

    expect(collect($default['elements'])->pluck('binding'))->toContain('verificationCode');
});
