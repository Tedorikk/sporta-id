<?php

use App\Models\Attendee;
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
            ->where('cards.0.data.verificationCode', $registration->verification_code)
        );
});

test('the default card prints the code', function () {
    $default = CardTemplate::fallbackTemplate(CardTemplate::SUBJECT_REGISTRATION);

    expect(collect($default['elements'])->pluck('binding'))->toContain('verificationCode');
});

// --- Attendees: the same code, on passes for people who never registered ---

function codedAttendee(?Event $event = null, string $status = Attendee::STATUS_ACTIVE): Attendee
{
    $event ??= Event::factory()->create();

    return Attendee::create([
        'event_id' => $event->id,
        'attendee_type_id' => $event->attendeeTypes()->where('key', 'guest')->firstOrFail()->id,
        'name' => 'Bianca Ali',
        'status' => $status,
    ]);
}

test('a new attendee is given a verification code too', function () {
    expect(codedAttendee()->verification_code)->toMatch('/^[A-Z2-9]{3}-[A-Z2-9]{3}$/');
});

test('an attendee card page shows the code to check against', function () {
    $attendee = codedAttendee();

    $this->get(route('attendees.id-card', $attendee))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('attendee-id-card')
            ->where('attendee.verification_code', $attendee->verification_code)
            ->where('attendee.status', Attendee::STATUS_ACTIVE)
        );
});

test('a revoked pass still resolves, so the page can say it is not valid', function () {
    $attendee = codedAttendee(status: Attendee::STATUS_REVOKED);

    $this->get(route('attendees.id-card', $attendee))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('attendee.status', Attendee::STATUS_REVOKED));
});

test('an organizer can issue an attendee a new code', function () {
    $attendee = codedAttendee();
    $user = organizerOf($attendee->event);
    $old = $attendee->verification_code;

    $this->actingAs($user)
        ->patch(route('attendees.verification-code', [$attendee->event_id, $attendee]))
        ->assertRedirect();

    expect($attendee->fresh()->verification_code)->not->toBe($old);
});

test('an attendee cannot be re-coded through another event', function () {
    $attendee = codedAttendee();
    $otherEvent = Event::factory()->create();
    $old = $attendee->verification_code;

    $this->actingAs(organizerOf($otherEvent))
        ->patch(route('attendees.verification-code', [$otherEvent, $attendee]))
        ->assertNotFound();

    expect($attendee->fresh()->verification_code)->toBe($old);
});

test('the attendee print sheet carries each pass\'s code', function () {
    $attendee = codedAttendee();
    $user = organizerOf($attendee->event);

    $this->actingAs($user)
        ->get(route('attendee-types.id-cards', [$attendee->event_id, $attendee->attendee_type_id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('cards.0.data.verificationCode', $attendee->verification_code)
        );
});

test('the default attendee card prints the code', function () {
    $default = CardTemplate::fallbackTemplate(CardTemplate::SUBJECT_ATTENDEE);

    expect(collect($default['elements'])->pluck('binding'))->toContain('verificationCode');
});
