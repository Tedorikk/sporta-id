<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Models\Registration;
use App\Models\Team;
use App\Services\TeamMembers\TeamMemberService;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * The manager's "Organize Members" portal for a team category outside
 * basketball — reached only through the registration's qr_token, same as
 * the roster portal, but with no jersey number, identity document or
 * tournament concept at all: just a name, role (whatever the organiser
 * defined), photo and phone per member.
 */
class TeamMembersController extends Controller
{
    public function __construct(private readonly TeamMemberService $service) {}

    public function show(Registration $registration)
    {
        $team = $this->teamFor($registration);
        $block = $this->blockFor($registration);

        $team->load('players');

        return Inertia::render('organize-member', [
            'registration' => $registration->only('qr_token', 'status', 'name'),
            'event' => $registration->event,
            'registrationCategory' => $registration->registrationCategory->only('id', 'name'),
            'team' => $team->only('id', 'name', 'logo', 'status'),
            'members' => $team->players->map(fn (Player $player) => [
                ...$player->toArray(),
                'is_complete' => $this->service->isComplete($player, $block['member_fields'] ?? []),
            ]),
            'memberFields' => $block['member_fields'] ?? [],
            'limits' => [
                ...$this->service->summary($team, $block),
                'closes_at' => $registration->registrationCategory->rosterClosesAt(),
            ],
            'lock' => $this->service->lockReason($registration, $team),
        ]);
    }

    public function store(Request $request, Registration $registration)
    {
        $team = $this->teamFor($registration);
        $block = $this->blockFor($registration);
        $this->assertEditable($registration, $team);

        $validated = $request->validate(
            $this->service->rules($block),
            $this->service->messages(),
            $this->service->attributes($block['member_fields'] ?? []),
        );

        $this->service->assertHasRoomFor($team, $block, $validated['role']);

        $team->players()->create($validated);

        return back()->with(['toast' => [
            'title' => __('Added'),
            'description' => __(':name is on the list.', ['name' => $validated['name']]),
        ]]);
    }

    public function update(Request $request, Registration $registration, Player $player)
    {
        $team = $this->teamFor($registration);
        $block = $this->blockFor($registration);
        $this->assertEditable($registration, $team);
        $this->assertOnTeam($team, $player);

        $validated = $request->validate(
            $this->service->rules($block),
            $this->service->messages(),
            $this->service->attributes($block['member_fields'] ?? []),
        );

        if ($validated['role'] !== $player->role) {
            $this->service->assertHasRoomFor($team, $block, $validated['role']);
        }

        $player->update($validated);

        return back()->with(['toast' => [
            'title' => __('Saved'),
            'description' => __(':name updated.', ['name' => $player->name]),
        ]]);
    }

    public function destroy(Registration $registration, Player $player)
    {
        $team = $this->teamFor($registration);
        $this->assertEditable($registration, $team);
        $this->assertOnTeam($team, $player);

        $team->players()->detach($player->id);

        return back()->with(['toast' => [
            'title' => __('Removed'),
            'description' => __(':name is off the list.', ['name' => $player->name]),
        ]]);
    }

    private function teamFor(Registration $registration): Team
    {
        $team = $registration->team;

        abort_unless($team !== null, 404);

        return $team;
    }

    /** @return array<string, mixed> */
    private function blockFor(Registration $registration): array
    {
        $registration->loadMissing('registrationCategory');
        $block = $registration->registrationCategory->teamMembersField();

        abort_unless($block !== null, 404);

        return $block;
    }

    private function assertEditable(Registration $registration, Team $team): void
    {
        abort_if($this->service->lockReason($registration, $team) !== null, 403, __('This list can no longer be changed.'));
    }

    private function assertOnTeam(Team $team, Player $player): void
    {
        abort_unless($team->players()->whereKey($player->id)->exists(), 404);
    }
}
