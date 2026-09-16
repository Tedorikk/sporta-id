<?php

use App\Mail\RegistrationConfirmed;
use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\Player;
use App\Models\Registration;
use App\Models\RegistrationCategory;
use App\Models\Team;
use App\Services\Basketball\RosterService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * A tournament category whose roster block defers member details to the
 * portal: the form takes name, role and jersey only. Local to this file —
 * Pest helpers in other files aren't shared.
 */
function deferredCategory(bool $detailsOnForm = false): RegistrationCategory
{
    $event = Event::factory()->basketball()->create();
    $tournament = BasketballEventCategory::factory()->forEvent($event)->create([
        'min_player_per_team' => 2,
        'max_player_per_team' => 12,
        'roster_closes_at' => now()->addDays(10),
    ]);

    $tournament->registrationCategory->update(['form_pages' => [
        ['key' => 'peserta', 'title' => 'Peserta', 'fields' => [[
            'key' => 'roster', 'label' => 'Official & Pemain', 'type' => 'roster', 'required' => true,
            'details_on_form' => $detailsOnForm,
            'slots' => [
                ['role' => 'coach', 'label' => 'Coach', 'min' => 1, 'max' => 1],
                ['role' => 'player', 'label' => 'Pemain', 'min' => 2, 'max' => 3],
            ],
            'member_fields' => [
                ['key' => 'asal_sekolah', 'label' => 'Asal Sekolah', 'type' => 'text', 'required' => true],
            ],
        ]]],
    ]]);

    return $tournament->registrationCategory->fresh();
}

function bareMember(string $role, string $name, ?string $jersey = null): array
{
    return ['role' => $role, 'name' => $name, 'jersey_number' => $jersey];
}

function fullMember(string $role, string $name, ?string $jersey = null): array
{
    return array_merge(bareMember($role, $name, $jersey), [
        'photo' => 'https://example.com/'.str($name)->slug().'.jpg',
        'identity_card' => 'https://example.com/'.str($name)->slug().'-ktp.jpg',
        'birthplace' => 'Pontianak',
        'dob' => '2010-01-15',
        'phone_number' => '+628'.str_pad((string) crc32($name), 10, '0'),
        'extra' => ['asal_sekolah' => 'SMP 1'],
    ]);
}

function submitTeam(RegistrationCategory $category, array $roster)
{
    return test()->post(route('registrations.store', [$category->event, $category]), [
        'name' => 'Pontianak Warriors',
        'roster' => $roster,
    ]);
}

function bareTeam(): array
{
    return [
        bareMember('coach', 'Coach C'),
        bareMember('player', 'A', '4'),
        bareMember('player', 'B', '5'),
    ];
}

// ─── The form ───────────────────────────────────────────────────────────────

test('with details deferred, a roster of names and jerseys is accepted and the members are incomplete', function () {
    $category = deferredCategory();

    submitTeam($category, bareTeam())->assertOk();

    $team = Team::firstOrFail();
    $service = app(RosterService::class);

    expect($team->players)->toHaveCount(3)
        ->and($service->incompleteCount($team))->toBe(3)
        ->and($service->summary($team))->toMatchArray(['players' => 2, 'incomplete' => 3, 'complete' => false]);
});

test('with details deferred, the slots, roles and jersey rules still apply', function () {
    $category = deferredCategory();

    submitTeam($category, [
        bareMember('coach', 'Coach C'),
        bareMember('player', 'A', '9'),
        bareMember('player', 'B', '9'),
    ])->assertSessionHasErrors(['roster.1.jersey_number', 'roster.2.jersey_number']);

    submitTeam($category, [
        bareMember('coach', 'Coach C'),
        bareMember('player', 'A', '1'),
    ])->assertSessionHasErrors('roster');

    submitTeam($category, [
        bareMember('coach', 'Coach C'),
        bareMember('player', 'A'),
        bareMember('player', 'B', '2'),
    ])->assertSessionHasErrors('roster.1.jersey_number');
});

test('with details on the form (the default), the same submission is refused', function () {
    $category = deferredCategory(detailsOnForm: true);

    submitTeam($category, bareTeam())->assertSessionHasErrors([
        'roster.0.photo', 'roster.0.identity_card', 'roster.0.birthplace', 'roster.0.dob',
        'roster.0.phone_number', 'roster.0.extra.asal_sekolah',
    ]);

    // Omitting the key altogether means deferred — the recommended default.
    $legacy = deferredCategory();
    $pages = $legacy->form_pages;
    unset($pages[0]['fields'][0]['details_on_form']);
    $legacy->update(['form_pages' => $pages]);

    expect($legacy->fresh()->rosterDetailsOnForm())->toBeFalse();
});

test('the form page carries the roster deadline for the requirements card', function () {
    $category = deferredCategory();

    $this->get(route('registrations.create', [$category->event, $category]))
        ->assertInertia(fn ($page) => $page
            ->where('rosterDeadline', $category->basketballCategory->roster_closes_at->toJSON()));
});

// ─── Completeness ───────────────────────────────────────────────────────────

test('a member is complete once every detail the portal demands is there', function () {
    $category = deferredCategory();
    $service = app(RosterService::class);
    $memberFields = $category->rosterMemberFields();

    expect($service->isComplete(new Player(fullMember('player', 'A', '4')), $memberFields))->toBeTrue();

    foreach (['photo', 'identity_card', 'birthplace', 'dob', 'phone_number', 'jersey_number'] as $missing) {
        $copy = new Player(array_merge(fullMember('player', 'A', '4'), [$missing => null]));
        expect($service->isComplete($copy, $memberFields))->toBeFalse($missing);
    }

    // A required extra question counts; without member fields it wouldn't.
    $noExtra = new Player(array_merge(fullMember('player', 'A', '4'), ['extra' => []]));
    expect($service->isComplete($noExtra, $memberFields))->toBeFalse()
        ->and($service->isComplete($noExtra, []))->toBeTrue();

    // Staff need no jersey; a medic is complete with or without a certificate.
    expect($service->isComplete(new Player(fullMember('coach', 'C')), $memberFields))->toBeTrue()
        ->and($service->isComplete(new Player(fullMember('medic', 'M')), $memberFields))->toBeTrue();
});

test('the portal flags each incomplete member and counts them, and completing one in the portal clears it', function () {
    $category = deferredCategory();
    submitTeam($category, bareTeam())->assertOk();

    $registration = Registration::firstOrFail();
    $player = $registration->team->players()->where('name', 'A')->firstOrFail();

    $this->get(route('team-roster.show', $registration))
        ->assertInertia(fn ($page) => $page
            ->where('limits.incomplete', 3)
            ->where('limits.complete', false)
            ->where('limits.closes_at', $category->basketballCategory->roster_closes_at->toJSON())
            ->where('members.0.is_complete', false));

    // The portal's strict rules mean "complete" is the only way to save.
    $this->put(route('team-roster.update', [$registration, $player]), bareMember('player', 'A', '4'))
        ->assertSessionHasErrors(['photo', 'identity_card']);

    $this->put(route('team-roster.update', [$registration, $player]), fullMember('player', 'A', '4'))
        ->assertSessionHasNoErrors();

    $this->get(route('team-roster.show', $registration))
        ->assertInertia(fn ($page) => $page->where('limits.incomplete', 2));
});

test('the dashboard team pages carry the incomplete count', function () {
    $category = deferredCategory();
    submitTeam($category, bareTeam())->assertOk();

    $event = $category->event;
    $team = Team::firstOrFail();

    $this->actingAs(organizerOf($event))
        ->get(route('teams.index', $event))
        ->assertInertia(fn ($page) => $page->where('teams.data.0.roster_incomplete', 3));

    $this->actingAs(organizerOf($event))
        ->get(route('teams.show', [$event, $team]))
        ->assertInertia(fn ($page) => $page->where('team.roster_incomplete', 3));
});

// ─── The confirmation mail ──────────────────────────────────────────────────

test('the confirmation mail names the roster deadline while the roster is incomplete', function () {
    $category = deferredCategory();
    submitTeam($category, bareTeam())->assertOk();

    $registration = Registration::firstOrFail()->load('team.basketballEventCategory', 'registrationCategory', 'event');
    $deadline = $category->basketballCategory->roster_closes_at;

    (new RegistrationConfirmed($registration))->locale('en')
        ->assertSeeInHtml('finish it before '.$deadline->format('j M Y, H:i'));

    // Once everyone is complete, no nagging.
    foreach ($registration->team->players as $player) {
        $player->update(fullMember($player->role, $player->name, $player->jersey_number));
    }

    (new RegistrationConfirmed($registration->fresh()->load('team.players')))->locale('en')
        ->assertDontSeeInHtml('not complete yet');
});
