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
        $validated = $this->validated($request, $team);

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
        $player->delete();

        return redirect()
            ->route('teams.show', [$event, $team])
            ->with(['toast' => [
                'title' => 'Success',
                'description' => 'Player deleted successfully.',
            ]]);
    }

    private function validated(Request $request, Team $team, ?Player $player = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'jersey_number' => [
                'required',
                'string',
                'max:3',
                Rule::unique('players', 'jersey_number')
                    ->where(fn ($query) => $query->where('team_id', $team->id))
                    ->ignore($player?->id),
            ],
            'position' => ['nullable', 'string', 'max:255'],
            'photo' => ['nullable', 'url', 'max:255'],
            'phone_number' => ['nullable', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
            'email' => ['nullable', 'email', 'max:255'],
            'dob' => ['nullable', 'date', 'before:today'],
        ], [
            'phone_number.regex' => 'Invalid E.164 format',
        ]);
    }
}