<?php

use App\Models\Event;
use App\Models\Meeting;
use App\Models\MeetingCheckIn;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeConfirmedIndividualRegistration(Event $event, string $name = 'Jane Doe'): Registration
{
    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => 'General Admission',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
    ]);

    return Registration::create([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => $name,
        'status' => Registration::STATUS_CONFIRMED,
    ]);
}

test('guests cannot view or mark attendance', function () {
    $event = Event::factory()->create();
    $meeting = Meeting::create(['event_id' => $event->id, 'title' => 'Keynote', 'scheduled_at' => now()]);
    $registration = makeConfirmedIndividualRegistration($event);

    $this->get(route('meetings.attendance.index', [$event, $meeting]))->assertRedirect(route('login'));

    $this->put(route('meetings.attendance.update', [$event, $meeting]), [
        'registration_id' => $registration->id,
        'status' => 'present',
    ])->assertRedirect(route('login'));

    expect(MeetingCheckIn::count())->toBe(0);
});

test('the attendance roster only lists confirmed individual registrations for the event', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();
    $meeting = Meeting::create(['event_id' => $event->id, 'title' => 'Keynote', 'scheduled_at' => now()]);

    $confirmed = makeConfirmedIndividualRegistration($event, 'Confirmed Attendee');

    $teamCategory = RegistrationCategory::create(['event_id' => $event->id, 'name' => 'Team Cat', 'subject_type' => RegistrationCategory::SUBJECT_TEAM]);
    Registration::create(['registration_category_id' => $teamCategory->id, 'event_id' => $event->id, 'name' => 'A Team', 'status' => Registration::STATUS_CONFIRMED]);

    $individualCategory = RegistrationCategory::create(['event_id' => $event->id, 'name' => 'Pending Cat', 'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL]);
    Registration::create(['registration_category_id' => $individualCategory->id, 'event_id' => $event->id, 'name' => 'Pending Person', 'status' => Registration::STATUS_PENDING_PAYMENT]);

    $this->actingAs($user)
        ->get(route('meetings.attendance.index', [$event, $meeting]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/events/meetings/attendance')
            ->has('registrations', 1)
            ->where('registrations.0.id', $confirmed->id)
        );
});

test('an organizer can manually mark a registrant present or absent', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();
    $meeting = Meeting::create(['event_id' => $event->id, 'title' => 'Keynote', 'scheduled_at' => now()]);
    $registration = makeConfirmedIndividualRegistration($event);

    $this->actingAs($user)
        ->put(route('meetings.attendance.update', [$event, $meeting]), [
            'registration_id' => $registration->id,
            'status' => 'present',
        ])->assertRedirect();

    $checkIn = MeetingCheckIn::firstOrFail();
    expect($checkIn->status)->toBe('present')
        ->and($checkIn->method)->toBe('manual')
        ->and($checkIn->checked_in_by)->toBe($user->id);

    // Flipping to absent updates the same row rather than creating a new one.
    $this->actingAs($user)
        ->put(route('meetings.attendance.update', [$event, $meeting]), [
            'registration_id' => $registration->id,
            'status' => 'absent',
        ])->assertRedirect();

    expect(MeetingCheckIn::count())->toBe(1)
        ->and($checkIn->fresh()->status)->toBe('absent');
});

test('marking attendance for a registration from another event is rejected', function () {
    $user = User::factory()->create();
    $event = Event::factory()->create();
    $otherEvent = Event::factory()->create();
    $meeting = Meeting::create(['event_id' => $event->id, 'title' => 'Keynote', 'scheduled_at' => now()]);
    $registration = makeConfirmedIndividualRegistration($otherEvent);

    $this->actingAs($user)
        ->put(route('meetings.attendance.update', [$event, $meeting]), [
            'registration_id' => $registration->id,
            'status' => 'present',
        ])->assertSessionHasErrors('registration_id');
});
