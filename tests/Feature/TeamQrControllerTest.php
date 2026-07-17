<?php

use App\Models\Event;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

// ─── QR Scanner Page ──────────────────────────────────────────────────────────

test('authenticated users can access the QR scanner page', function () {
    $this->actingAs($this->user)
        ->get(route('qr-scanner'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('dashboard/qr-scanner'));
});

test('guests are redirected from the QR scanner page', function () {
    $this->get(route('qr-scanner'))
        ->assertRedirect(route('login'));
});

// ─── Team ID Card (Public) ────────────────────────────────────────────────────

test('anyone can view a team id card without authentication', function () {
    $event = Event::factory()->create();
    $team = Team::factory()->for($event)->create();

    $this->get(route('teams.id-card', $team))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('team-id-card')
            ->where('team.id', $team->id)
            ->where('team.name', $team->name)
        );
});

test('id card returns 404 for a non-existent team', function () {
    $this->get(route('teams.id-card', 99999))
        ->assertNotFound();
});

// ─── QR Data API (Auth-protected JSON) ───────────────────────────────────────

test('authenticated users can fetch team qr data', function () {
    $event = Event::factory()->create();
    $team = Team::factory()->for($event)->create();

    $this->actingAs($this->user)
        ->getJson(route('teams.qr-data', $team))
        ->assertOk()
        ->assertJsonPath('id', $team->id)
        ->assertJsonPath('name', $team->name);
});

test('guests cannot fetch team qr data', function () {
    $event = Event::factory()->create();
    $team = Team::factory()->for($event)->create();

    $this->getJson(route('teams.qr-data', $team))
        ->assertUnauthorized();
});
