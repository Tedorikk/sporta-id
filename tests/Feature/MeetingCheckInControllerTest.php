<?php

use App\Models\Event;
use App\Models\Meeting;
use App\Models\MeetingCheckIn;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeMeetingWithRegistration(array $registrationOverrides = []): array
{
    $event = Event::factory()->create();
    $meeting = Meeting::create(['event_id' => $event->id, 'title' => 'Keynote', 'scheduled_at' => now()]);
    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'General Admission',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
    ]);
    $registration = Registration::create(array_merge([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => 'Jane Doe',
        'status' => Registration::STATUS_CONFIRMED,
    ], $registrationOverrides));

    return [$event, $meeting, $registration];
}

test('guests cannot record a QR check-in', function () {
    [, $meeting, $registration] = makeMeetingWithRegistration();

    $this->postJson(route('meetings.check-ins.store', $meeting), ['registration_id' => $registration->id])
        ->assertUnauthorized();

    expect(MeetingCheckIn::count())->toBe(0);
});

test('scanning a confirmed registration records a present check-in via QR', function () {
    $user = User::factory()->create();
    [, $meeting, $registration] = makeMeetingWithRegistration();

    $this->actingAs($user)
        ->postJson(route('meetings.check-ins.store', $meeting), ['registration_id' => $registration->id])
        ->assertOk()
        ->assertJsonPath('already_checked_in', false)
        ->assertJsonPath('registration.id', $registration->id);

    $checkIn = MeetingCheckIn::firstOrFail();
    expect($checkIn->status)->toBe('present')
        ->and($checkIn->method)->toBe('qr')
        ->and($checkIn->scanned_at)->not->toBeNull();
});

test('scanning the same registration twice reports already checked in without duplicating', function () {
    $user = User::factory()->create();
    [, $meeting, $registration] = makeMeetingWithRegistration();

    $this->actingAs($user)->postJson(route('meetings.check-ins.store', $meeting), ['registration_id' => $registration->id])
        ->assertOk()->assertJsonPath('already_checked_in', false);

    $this->actingAs($user)->postJson(route('meetings.check-ins.store', $meeting), ['registration_id' => $registration->id])
        ->assertOk()->assertJsonPath('already_checked_in', true);

    expect(MeetingCheckIn::count())->toBe(1);
});

test('a registration from a different event is rejected', function () {
    $user = User::factory()->create();
    [, $meeting] = makeMeetingWithRegistration();
    [$otherEvent, , $otherRegistration] = makeMeetingWithRegistration();

    $this->actingAs($user)
        ->postJson(route('meetings.check-ins.store', $meeting), ['registration_id' => $otherRegistration->id])
        ->assertJsonValidationErrors('registration_id');

    expect(MeetingCheckIn::count())->toBe(0);
});

test('a non-confirmed registration is rejected', function () {
    $user = User::factory()->create();
    [, $meeting, $registration] = makeMeetingWithRegistration(['status' => Registration::STATUS_PENDING_PAYMENT]);

    $this->actingAs($user)
        ->postJson(route('meetings.check-ins.store', $meeting), ['registration_id' => $registration->id])
        ->assertForbidden();

    expect(MeetingCheckIn::count())->toBe(0);
});
