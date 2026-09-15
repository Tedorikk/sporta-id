<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Models\Registration;
use App\Models\Team;
use App\Services\Basketball\RosterService;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * The captain's roster portal. Reached only through the registration's
 * qr_token (unguessable, and already what the team's ID-card link carries),
 * so there's no login: whoever holds the confirmation holds the roster.
 */
class TeamRosterController extends Controller
{
    public function __construct(private readonly RosterService $roster) {}

    public function show(Registration $registration)
    {
        $team = $this->tournamentTeam($registration);

        $team->load(['players' => fn ($query) => $query->orderByRaw(
            "case when role = 'player' then 0 else 1 end"
        )->orderBy('jersey_number')->orderBy('name')]);

        $registration->loadMissing(['event', 'registrationCategory']);
        $category = $team->basketballEventCategory;

        return Inertia::render('team-roster', [
            'registration' => $registration->only('qr_token', 'status', 'name'),
            'event' => $registration->event,
            'registrationCategory' => $registration->registrationCategory->only('id', 'name'),
            'team' => $team->only('id', 'name', 'logo', 'status'),
            'members' => $team->players,
            'limits' => [
                ...$this->roster->summary($team),
                'closes_at' => $category->roster_closes_at ?? $registration->registrationCategory->closes_at,
            ],
            'lock' => $this->lockReason($registration, $team),
        ]);
    }

    public function store(Request $request, Registration $registration)
    {
        $team = $this->tournamentTeam($registration);
        $this->assertEditable($registration, $team);

        $validated = $request->validate(
            $this->roster->rules($request, $team, strict: true),
            $this->roster->messages(),
            $this->roster->attributes(),
        );

        $this->roster->assertHasRoomFor($team, $validated['role']);

        $team->players()->create($validated);

        return back()->with(['toast' => [
            'title' => 'Added',
            'description' => "{$validated['name']} is on the roster.",
        ]]);
    }

    public function update(Request $request, Registration $registration, Player $player)
    {
        $team = $this->tournamentTeam($registration);
        $this->assertEditable($registration, $team);
        $this->assertOnTeam($team, $player);

        $validated = $request->validate(
            $this->roster->rules($request, $team, $player, strict: true),
            $this->roster->messages(),
            $this->roster->attributes(),
        );

        // Switching a staff member to a player counts against the cap.
        if ($validated['role'] === Player::ROLE_PLAYER && $player->role !== Player::ROLE_PLAYER) {
            $this->roster->assertHasRoomFor($team, Player::ROLE_PLAYER);
        }

        $player->update($validated);

        return back()->with(['toast' => [
            'title' => 'Saved',
            'description' => "{$player->name} updated.",
        ]]);
    }

    public function destroy(Registration $registration, Player $player)
    {
        $team = $this->tournamentTeam($registration);
        $this->assertEditable($registration, $team);
        $this->assertOnTeam($team, $player);

        // Same as the organiser's remove: off this team's sheet, but the
        // person (and any other team they're on) stays.
        $team->players()->detach($player->id);

        return back()->with(['toast' => [
            'title' => 'Removed',
            'description' => "{$player->name} is off the roster.",
        ]]);
    }

    /** The registration's team, which must be entered in a tournament category. */
    private function tournamentTeam(Registration $registration): Team
    {
        $team = $registration->team;

        abort_unless($team !== null && $team->basketballEventCategory !== null, 404);

        return $team;
    }

    /**
     * Why the roster can't be edited right now, or null when it can. The page
     * shows this instead of the form; writes refuse with it.
     */
    private function lockReason(Registration $registration, Team $team): ?string
    {
        if ($registration->status === Registration::STATUS_PENDING_PAYMENT) {
            return 'payment_pending';
        }

        if ($registration->isWithdrawn()) {
            return 'withdrawn';
        }

        if ($team->status === Team::STATUS_VERIFIED) {
            return 'verified';
        }

        if (! ($team->basketballEventCategory?->rosterIsOpen() ?? true)) {
            return 'closed';
        }

        return null;
    }

    private function assertEditable(Registration $registration, Team $team): void
    {
        abort_if($this->lockReason($registration, $team) !== null, 403, 'This roster can no longer be changed.');
    }

    private function assertOnTeam(Team $team, Player $player): void
    {
        abort_unless($team->players()->whereKey($player->id)->exists(), 404);
    }
}
