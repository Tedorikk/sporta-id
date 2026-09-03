<?php

use App\Models\Event;
use App\Models\Meeting;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function confirmedRegistration(array $overrides = []): Registration
{
    $event = Event::factory()->create(['is_published' => true]);

    $category = RegistrationCategory::create([
        'event_id' => $event->id,
        'name' => '5K Run',
        'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
        'price' => '150000',
        'form_pages' => [],
    ]);

    return Registration::create(array_merge([
        'registration_category_id' => $category->id,
        'event_id' => $event->id,
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'status' => Registration::STATUS_CONFIRMED,
        'form_data' => [],
    ], $overrides));
}

// ─── Public URLs are keyed on qr_token, not the sequential id ───────────────

test('the public id card is reachable by qr_token', function () {
    $registration = confirmedRegistration();

    $this->get("/registrations/{$registration->qr_token}/id-card")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('registration-id-card'));
});

test('the public id card cannot be reached by walking the numeric id', function () {
    $registration = confirmedRegistration();

    // The whole point: knowing a registration exists at id 1, 2, 3... must not
    // be enough to read the participant's details.
    $this->get("/registrations/{$registration->id}/id-card")->assertNotFound();
});

test('the status page is reachable by qr_token but not by numeric id', function () {
    $registration = confirmedRegistration(['status' => Registration::STATUS_PENDING_PAYMENT]);

    $this->get("/registrations/{$registration->qr_token}/status")->assertOk();
    $this->get("/registrations/{$registration->id}/status")->assertNotFound();
});

test('paying is keyed on qr_token so tokens cannot be minted by guessing ids', function () {
    $registration = confirmedRegistration(['status' => Registration::STATUS_PENDING_PAYMENT]);

    $this->post("/registrations/{$registration->id}/pay")->assertNotFound();
});

// ─── Staff-side lookups still accept the id printed on older cards ──────────

test('the scanner endpoint resolves a registration by qr_token', function () {
    $registration = confirmedRegistration();
    $user = organizerOf($registration->event);

    $this->actingAs($user)
        ->get("/dashboard/registrations/{$registration->qr_token}/qr-data")
        ->assertOk()
        ->assertJsonPath('id', $registration->id);
});

test('the scanner endpoint still resolves cards printed with the numeric id', function () {
    $registration = confirmedRegistration();
    $user = organizerOf($registration->event);

    $this->actingAs($user)
        ->get("/dashboard/registrations/{$registration->id}/qr-data")
        ->assertOk()
        ->assertJsonPath('id', $registration->id);
});

test('the scanner endpoint 404s on an unknown identifier', function () {
    $registration = confirmedRegistration();
    $user = organizerOf($registration->event);

    $this->actingAs($user)
        ->get('/dashboard/registrations/not-a-real-token/qr-data')
        ->assertNotFound();
});

test('meeting check-in accepts both a qr_token and a legacy numeric id', function () {
    $registration = confirmedRegistration();
    $user = organizerOf($registration->event);

    $meeting = Meeting::create([
        'event_id' => $registration->event_id,
        'title' => 'Race Briefing',
        'scheduled_at' => now(),
    ]);

    $this->actingAs($user)
        ->postJson("/dashboard/meetings/{$meeting->id}/check-ins", ['registration_id' => $registration->qr_token])
        ->assertOk()
        ->assertJsonPath('registration.id', $registration->id);

    $this->actingAs($user)
        ->postJson("/dashboard/meetings/{$meeting->id}/check-ins", ['registration_id' => (string) $registration->id])
        ->assertOk()
        ->assertJsonPath('already_checked_in', true);
});

test('meeting check-in rejects a registration from another event', function () {
    $registration = confirmedRegistration();
    $other = confirmedRegistration();
    $user = organizerOf($other->event);

    $meeting = Meeting::create([
        'event_id' => $other->event_id,
        'title' => 'Race Briefing',
        'scheduled_at' => now(),
    ]);

    $this->actingAs($user)
        ->postJson("/dashboard/meetings/{$meeting->id}/check-ins", ['registration_id' => $registration->qr_token])
        ->assertNotFound();
});
