<?php

use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\Registration;
use App\Models\Team;
use App\Services\Basketball\RosterService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/**
 * A confirmed tournament team with one bare member (name/role/jersey only),
 * the way Phase 2's deferred form leaves it. Local to this file — Pest
 * helpers in other files aren't shared.
 */
function selfFillTeam(array $tournament = [], string $teamStatus = Team::STATUS_PENDING): array
{
    $event = Event::factory()->basketball()->create();
    $category = BasketballEventCategory::factory()->forEvent($event)->create(array_merge([
        'min_player_per_team' => 1,
        'max_player_per_team' => 12,
        'roster_closes_at' => now()->addDays(10),
    ], $tournament));
    $category->registrationCategory->update(['form_pages' => [
        ['key' => 'p', 'title' => 'Peserta', 'fields' => [[
            'key' => 'roster', 'label' => 'Roster', 'type' => 'roster', 'required' => true, 'details_on_form' => false,
            'slots' => [['role' => 'player', 'label' => 'Pemain', 'min' => 1, 'max' => 12]],
            'member_fields' => [['key' => 'asal_sekolah', 'label' => 'Asal Sekolah', 'type' => 'text', 'required' => true]],
        ]]],
    ]]);

    $team = Team::factory()->create([
        'event_id' => $event->id,
        'basketball_event_category_id' => $category->id,
        'status' => $teamStatus,
    ]);
    $player = $team->players()->create(['name' => 'Rizky Pratama', 'role' => 'player', 'jersey_number' => '7']);
    $registration = Registration::create([
        'registration_category_id' => $category->registration_category_id,
        'event_id' => $event->id,
        'team_id' => $team->id,
        'name' => $team->name,
        'status' => Registration::STATUS_CONFIRMED,
    ]);

    return [$registration, $team->fresh(), $player];
}

function selfDetails(array $overrides = []): array
{
    return array_merge([
        'photo' => 'https://example.com/rizky.jpg',
        'identity_card' => 'https://example.com/rizky-ktp.jpg',
        'birthplace' => 'Pontianak',
        'dob' => '2010-01-15',
        'phone_number' => '+6281234567890',
        'email' => null,
        'position' => 'PG',
        'extra' => ['asal_sekolah' => 'SMP 1'],
    ], $overrides);
}

// ─── Getting the link ───────────────────────────────────────────────────────

test('the portal hands the manager a self-fill link per member, minted on first view', function () {
    [$registration, $team, $player] = selfFillTeam();

    expect(DB::table('player_team')->where('player_id', $player->id)->value('invite_token'))->toBeNull();

    $this->get(route('team-roster.show', $registration))
        ->assertInertia(fn ($page) => $page
            ->where('members.0.is_complete', false)
            ->where('members.0.invite_url', fn ($url) => str_starts_with($url, url('/roster-members/'))));

    $token = DB::table('player_team')->where('player_id', $player->id)->value('invite_token');
    expect($token)->not->toBeNull();

    // Stable across views — the link the manager already sent keeps working.
    $this->get(route('team-roster.show', $registration));
    expect(DB::table('player_team')->where('player_id', $player->id)->value('invite_token'))->toBe($token);
});

test('the invite token is per membership, not the player’s public qr_token', function () {
    [, $team, $player] = selfFillTeam();
    $token = app(RosterService::class)->inviteTokenFor($team, $player);

    expect($token)->not->toBe($player->qr_token);
    $this->get(route('roster-member.show', $player->qr_token))->assertNotFound();
    $this->get(route('roster-member.show', $token))->assertOk();
});

// ─── The member's own page ──────────────────────────────────────────────────

test('a member opens their page by link and sees who they are, read-only', function () {
    [, $team, $player] = selfFillTeam();
    $token = app(RosterService::class)->inviteTokenFor($team, $player);

    $this->get(route('roster-member.show', $token))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('roster-member-self')
            ->where('token', $token)
            ->where('member.name', 'Rizky Pratama')
            ->where('member.jersey_number', '7')
            ->where('member.is_complete', false)
            ->where('team.name', $team->name)
            ->where('lock', null)
            ->has('memberFields', 1));
});

test('a member completes their own details, and cannot change who they are', function () {
    [$registration, $team, $player] = selfFillTeam();
    $token = app(RosterService::class)->inviteTokenFor($team, $player);

    // Empty submit: the strict rules name what's missing.
    $this->put(route('roster-member.update', $token), [])
        ->assertSessionHasErrors(['photo', 'identity_card', 'birthplace', 'dob', 'phone_number', 'extra.asal_sekolah']);

    // Sneaking a new name/role/jersey along is ignored, not an error.
    $this->put(route('roster-member.update', $token), selfDetails([
        'name' => 'Somebody Else', 'role' => 'coach', 'jersey_number' => '99',
    ]))->assertSessionHasNoErrors();

    $player->refresh();
    expect($player->name)->toBe('Rizky Pratama')
        ->and($player->role)->toBe('player')
        ->and($player->jersey_number)->toBe('7')
        ->and($player->photo)->toBe('https://example.com/rizky.jpg')
        ->and($player->birthplace)->toBe('Pontianak')
        ->and($player->extra)->toBe(['asal_sekolah' => 'SMP 1'])
        ->and(app(RosterService::class)->isComplete($player, $team->rosterMemberFields()))->toBeTrue();

    // …and the manager's portal now counts them as done.
    $this->get(route('team-roster.show', $registration))
        ->assertInertia(fn ($page) => $page->where('limits.incomplete', 0)->where('members.0.is_complete', true));
});

test('a jersey number is checked against the team even though the member cannot change it', function () {
    [, $team, $player] = selfFillTeam();
    $team->players()->create(['name' => 'Other', 'role' => 'player', 'jersey_number' => '8']);
    $token = app(RosterService::class)->inviteTokenFor($team, $player);

    // Their own number (7) is theirs — no false "taken" error.
    $this->put(route('roster-member.update', $token), selfDetails())->assertSessionHasNoErrors();
});

// ─── Locks and revocation ───────────────────────────────────────────────────

test('the member page follows the same locks as the portal', function () {
    [$registration, $team, $player] = selfFillTeam(teamStatus: Team::STATUS_VERIFIED);
    $token = app(RosterService::class)->inviteTokenFor($team, $player);

    $this->get(route('roster-member.show', $token))
        ->assertInertia(fn ($page) => $page->where('lock', 'verified'));
    $this->put(route('roster-member.update', $token), selfDetails())->assertForbidden();

    $team->update(['status' => Team::STATUS_PENDING]);
    $registration->update(['status' => Registration::STATUS_PENDING_PAYMENT]);
    $this->get(route('roster-member.show', $token))
        ->assertInertia(fn ($page) => $page->where('lock', 'payment_pending'));

    $registration->update(['status' => Registration::STATUS_CONFIRMED]);
    $team->basketballEventCategory->update(['roster_closes_at' => now()->subHour()]);
    $this->put(route('roster-member.update', $token), selfDetails())->assertForbidden();
});

test('a manager can issue a new link, which voids the old one', function () {
    [$registration, $team, $player] = selfFillTeam();
    $old = app(RosterService::class)->inviteTokenFor($team, $player);

    $this->post(route('team-roster.invite', [$registration, $player]))
        ->assertRedirect()
        ->assertSessionHas('toast');

    $new = DB::table('player_team')->where('player_id', $player->id)->value('invite_token');

    expect($new)->not->toBe($old);
    $this->get(route('roster-member.show', $old))->assertNotFound();
    $this->get(route('roster-member.show', $new))->assertOk();
});

test('a link cannot be regenerated for someone else’s member or a locked roster', function () {
    [$registration, $team, $player] = selfFillTeam();
    [$otherRegistration] = selfFillTeam();

    $this->post(route('team-roster.invite', [$otherRegistration, $player]))->assertNotFound();

    $team->update(['status' => Team::STATUS_VERIFIED]);
    $this->post(route('team-roster.invite', [$registration, $player]))->assertForbidden();
});

test('an unknown or revoked token is a 404, and a team without a registration has no member pages', function () {
    $this->get(route('roster-member.show', 'nope'))->assertNotFound();

    [$registration, $team, $player] = selfFillTeam();
    $token = app(RosterService::class)->inviteTokenFor($team, $player);
    $registration->delete();

    $this->get(route('roster-member.show', $token))->assertNotFound();
});

test('a team outside a tournament still has member pages', function () {
    [, $team, $player] = selfFillTeam();
    $team->update(['basketball_event_category_id' => null]);
    $token = app(RosterService::class)->inviteTokenFor($team, $player);

    $this->get(route('roster-member.show', $token))->assertOk();
});
