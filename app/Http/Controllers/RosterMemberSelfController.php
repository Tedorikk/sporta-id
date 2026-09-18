<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Models\Team;
use App\Services\Basketball\RosterService;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * A roster member's own page: the manager sends them a link (see
 * TeamRosterController) and they upload their own photo and identity
 * document and fill in their birth details — the manager stops retyping
 * fifteen people. Reached only by the per-membership invite token; who
 * they are, their role and jersey are the manager's call and stay read-only.
 */
class RosterMemberSelfController extends Controller
{
    public function __construct(private readonly RosterService $roster) {}

    public function show(string $token)
    {
        ['team' => $team, 'player' => $player] = $this->resolve($token);
        $registration = $team->registration;
        $memberFields = $team->rosterMemberFields();

        $team->load('event', 'registration.registrationCategory');

        return Inertia::render('roster-member-self', [
            'token' => $token,
            'event' => $team->event,
            'team' => $team->only('id', 'name', 'logo', 'status'),
            'member' => [
                ...$player->toArray(),
                'is_complete' => $this->roster->isComplete($player, $memberFields),
            ],
            'memberFields' => $memberFields,
            'closesAt' => $team->registrationCategory()?->rosterClosesAt(),
            'lock' => $this->roster->lockReason($registration, $team),
        ]);
    }

    public function update(Request $request, string $token)
    {
        ['team' => $team, 'player' => $player] = $this->resolve($token);
        $registration = $team->registration;

        abort_if($this->roster->lockReason($registration, $team) !== null, 403, __('This roster can no longer be changed.'));

        // Identity is the manager's to set: whatever the request says, the
        // member keeps their name, role and jersey, and the strict rules run
        // against those.
        $request->merge([
            'name' => $player->name,
            'role' => $player->role,
            'jersey_number' => $player->jersey_number,
        ]);

        $validated = $request->validate(
            $this->roster->rules($request, $team, $player, strict: true),
            $this->roster->messages(),
            $this->roster->attributes($team->rosterMemberFields()),
        );

        $player->update($validated);

        return back()->with(['toast' => [
            'title' => __('Saved'),
            'description' => __('Thanks — your details are complete.'),
        ]]);
    }

    /** @return array{team: Team, player: Player} */
    private function resolve(string $token): array
    {
        $found = $this->roster->memberByInviteToken($token);

        // A team without a registration has nothing to lock against.
        abort_unless($found && $found['team']->registration !== null, 404);

        return $found;
    }
}
