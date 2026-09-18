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
        $team = $this->teamFor($registration);

        $team->load(['players' => fn ($query) => $query->orderByRaw(
            "case when role = 'player' then 0 else 1 end"
        )->orderBy('jersey_number')->orderBy('name')]);

        $registration->loadMissing(['event', 'registrationCategory.basketballCategory']);
        $memberFields = $team->rosterMemberFields();

        return Inertia::render('team-roster', [
            'registration' => $registration->only('qr_token', 'status', 'name'),
            'event' => $registration->event,
            'registrationCategory' => $registration->registrationCategory->only('id', 'name'),
            'team' => $team->only('id', 'name', 'logo', 'status'),
            // Flagged per member so the page can point at who still owes
            // a photo or document, rather than just counting them — with the
            // link the manager can send them to fill it in themselves.
            'members' => $team->players->map(fn (Player $player) => [
                ...$player->toArray(),
                'is_complete' => $this->roster->isComplete($player, $memberFields),
                'invite_url' => route('roster-member.show', $this->roster->inviteTokenFor($team, $player)),
            ]),
            // The organiser's extra per-member questions, so the dialog can ask them.
            'memberFields' => $memberFields,
            'limits' => [
                ...$this->roster->summary($team),
                'closes_at' => $registration->registrationCategory->rosterClosesAt(),
            ],
            'lock' => $this->roster->lockReason($registration, $team),
        ]);
    }

    public function store(Request $request, Registration $registration)
    {
        $team = $this->teamFor($registration);
        $this->assertEditable($registration, $team);

        $validated = $request->validate(
            $this->roster->rules($request, $team, strict: true),
            $this->roster->messages(),
            $this->roster->attributes($team->rosterMemberFields()),
        );

        $this->roster->assertHasRoomFor($team, $validated['role']);

        $team->players()->create($validated);

        return back()->with(['toast' => [
            'title' => __('Added'),
            'description' => __(':name is on the roster.', ['name' => $validated['name']]),
        ]]);
    }

    public function update(Request $request, Registration $registration, Player $player)
    {
        $team = $this->teamFor($registration);
        $this->assertEditable($registration, $team);
        $this->assertOnTeam($team, $player);

        $validated = $request->validate(
            $this->roster->rules($request, $team, $player, strict: true),
            $this->roster->messages(),
            $this->roster->attributes($team->rosterMemberFields()),
        );

        // Moving someone into another role needs room in that role's slot.
        if ($validated['role'] !== $player->role) {
            $this->roster->assertHasRoomFor($team, $validated['role']);
        }

        $player->update($validated);

        return back()->with(['toast' => [
            'title' => __('Saved'),
            'description' => __(':name updated.', ['name' => $player->name]),
        ]]);
    }

    /**
     * Issues the member a new self-fill link and voids the old one — for a
     * link sent to the wrong group, or a player who has since left.
     */
    public function regenerateInvite(Registration $registration, Player $player)
    {
        $team = $this->teamFor($registration);
        $this->assertEditable($registration, $team);
        $this->assertOnTeam($team, $player);

        $this->roster->regenerateInviteToken($team, $player);

        return back()->with(['toast' => [
            'title' => __('New link ready'),
            'description' => __('The previous link for :name no longer works.', ['name' => $player->name]),
        ]]);
    }

    public function destroy(Registration $registration, Player $player)
    {
        $team = $this->teamFor($registration);
        $this->assertEditable($registration, $team);
        $this->assertOnTeam($team, $player);

        // Same as the organiser's remove: off this team's sheet, but the
        // person (and any other team they're on) stays.
        $team->players()->detach($player->id);

        return back()->with(['toast' => [
            'title' => __('Removed'),
            'description' => __(':name is off the roster.', ['name' => $player->name]),
        ]]);
    }

    /** The registration's team — any team category, tournament or not. */
    private function teamFor(Registration $registration): Team
    {
        $team = $registration->team;

        abort_unless($team !== null, 404);

        return $team;
    }

    private function assertEditable(Registration $registration, Team $team): void
    {
        abort_if($this->roster->lockReason($registration, $team) !== null, 403, __('This roster can no longer be changed.'));
    }

    private function assertOnTeam(Team $team, Player $player): void
    {
        abort_unless($team->players()->whereKey($player->id)->exists(), 404);
    }
}
