<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Player;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PlayerController extends Controller
{
    public function store(Request $request, Event $event, Team $team)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'jersey_number' => [
                'required',
                'string',
                'max:3',
                Rule::unique('players', 'jersey_number')
                    ->where(fn ($query) => $query->where('team_id', $team->id)),
            ],
            'position' => ['nullable', 'string', 'max:255'],
        ]);

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
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'jersey_number' => [
                'required',
                'string',
                'max:3',
                Rule::unique('players', 'jersey_number')
                    ->where(fn ($query) => $query->where('team_id', $team->id))
                    ->ignore($player->id),
            ],
            'position' => ['nullable', 'string', 'max:255'],
        ]);

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
        $player->delete();

        return redirect()
            ->route('teams.show', [$event, $team])
            ->with(['toast' => [
                'title' => 'Success',
                'description' => 'Player deleted successfully.',
            ]]);
    }
}