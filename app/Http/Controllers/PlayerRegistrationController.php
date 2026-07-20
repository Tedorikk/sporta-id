<?php

namespace App\Http\Controllers;

use App\Models\BasketballEvent;
use App\Models\Event;
use App\Models\Team;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PlayerRegistrationController extends Controller
{
    /**
     * Public self-registration form.
     * Player picks a category, then a team (both already created by the admin),
     * then fills in their own details.
     */
    public function create(Event $event)
    {
        $event->loadMissing('specific');

        abort_unless($event->specific instanceof BasketballEvent, 404);

        $categories = $event->specific->categories()
            ->with(['teams' => function ($query) {
                $query->where('status', '!=', 'rejected')
                    ->select('id', 'name', 'status', 'basketball_event_category_id');
            }])
            ->get();

        return Inertia::render('register', [
            'event' => $event,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $event->loadMissing('specific');

        abort_unless($event->specific instanceof BasketballEvent, 404);

        $validated = $request->validate([
            'basketball_event_category_id' => [
                'required',
                Rule::exists('basketball_event_categories', 'id')
                    ->where('basketball_event_id', $event->specific->id),
            ],
            'team_id' => [
                'required',
                Rule::exists('teams', 'id')
                    ->where('basketball_event_category_id', $request->input('basketball_event_category_id')),
            ],
        ]);

        $team = Team::findOrFail($validated['team_id']);

        $playerData = $this->validatedPlayer($request, $team);

        $player = $team->players()->create($playerData);

        return redirect()->route('players.id-card', $player);
    }

    private function validatedPlayer(Request $request, Team $team): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'jersey_number' => [
                'required',
                'string',
                'max:3',
                function (string $attribute, mixed $value, Closure $fail) use ($team) {
                    $exists = $team->players()
                        ->where('jersey_number', $value)
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
