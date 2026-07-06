<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Player;
use App\Models\Team;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PlayerController extends Controller
{
    public function store(Request $request, Event $event, Team $team)
    {
        $validated = $this->validated($request, $team);

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

    private function validated(Request $request, Team $team, ?Player $player = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'jersey_number' => [
                'required',
                'string',
                'max:3',
                // Custom closure to check uniqueness within the Many-to-Many relationship
                function (string $attribute, mixed $value, Closure $fail) use ($team, $player) {
                    $exists = $team->players()
                        ->where('jersey_number', $value)
                        ->when($player, fn ($q) => $q->where('players.id', '!=', $player->id))
                        ->exists();

                    if ($exists) {
                        $fail('The jersey number has already been taken for this team.');
                    }
                },
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