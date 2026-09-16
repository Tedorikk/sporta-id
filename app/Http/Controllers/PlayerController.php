<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Player;
use App\Models\Team;
use App\Services\Basketball\RosterService;
use Illuminate\Http\Request;

class PlayerController extends Controller
{
    public function __construct(private readonly RosterService $roster) {}

    public function store(Request $request, Event $event, Team $team)
    {
        $validated = $this->validated($request, $team);

        $this->roster->assertHasRoomFor($team, $validated['role']);

        // create() on a BelongsToMany relationship automatically creates the
        // Player record AND inserts the pivot record connecting them to the team.
        $team->players()->create($validated);

        return redirect()
            ->route('teams.show', [$event, $team])
            ->with(['toast' => [
                'title' => 'Success',
                'description' => 'Player added successfully.',
            ]]);
    }

    public function update(Request $request, Event $event, Team $team, Player $player)
    {
        $validated = $this->validated($request, $team, $player);

        $player->update($validated);

        return redirect()
            ->route('teams.show', [$event, $team])
            ->with(['toast' => [
                'title' => 'Success',
                'description' => 'Player updated successfully.',
            ]]);
    }

    public function destroy(Event $event, Team $team, Player $player)
    {
        // Detach removes the player from THIS team, but keeps the player in the DB.
        // If you actually want to delete the player entirely, revert to $player->delete();
        $team->players()->detach($player->id);

        return redirect()
            ->route('teams.show', [$event, $team])
            ->with(['toast' => [
                'title' => 'Success',
                'description' => 'Player removed from team successfully.',
            ]]);
    }

    public function attach(Request $request, Event $event, Team $team)
    {
        $validated = $request->validate([
            'player_id' => ['required', 'exists:players,id'],
        ]);

        // Prevent attaching the same player twice
        if (! $team->players()->where('players.id', $validated['player_id'])->exists()) {
            $team->players()->attach($validated['player_id']);
        }

        return redirect()
            ->route('teams.show', [$event, $team])
            ->with(['toast' => [
                'title' => 'Success',
                'description' => 'Existing player added to team successfully.',
            ]]);
    }

    private function validated(Request $request, Team $team, ?Player $player = null): array
    {
        return $request->validate([
            ...$this->roster->rules($request, $team, $player),
            // Only an organiser vouches for a medic's certificate.
            'is_certificate_validated' => ['nullable', 'boolean'],
        ], $this->roster->messages(), $this->roster->attributes($team->rosterMemberFields()));
    }
}
