<?php

namespace App\Http\Controllers;

use App\Models\BasketballEvent;
use App\Models\Event;
use App\Models\Player;
use App\Models\RegistrationCategory;
use App\Models\Team;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PlayerRegistrationController extends Controller
{
    /**
     * The generic "register for this event" entry point — the URL people
     * actually guess, bookmark, and print on posters.
     *
     * Historically this rendered the basketball-only self-registration form and
     * 404'd for everything else, which dead-ended every non-basketball event.
     * It now routes the visitor to wherever that event actually takes
     * registrations, and only falls through to the basketball form when that
     * is genuinely what the event uses.
     */
    public function create(Event $event)
    {
        $event->loadMissing('specific');

        // The generic registration_categories system supersedes the basketball
        // form below, so it wins whenever the event sells through it.
        $categories = $event->registrationCategories()->orderBy('name')->get();

        if ($categories->isNotEmpty()) {
            $available = $categories->filter(
                fn (RegistrationCategory $category) => $category->isOpen() && $category->hasAvailableQuota()
            );

            // Exactly one thing to buy — send them straight to its form rather
            // than through a page whose only content is a single link.
            if ($available->count() === 1) {
                return redirect()->route('registrations.create', [$event, $available->first()]);
            }

            // Several categories to choose between, or nothing open right now:
            // the event page lists them all with prices and availability.
            return redirect()->route('events.public.show', $event);
        }

        if (! $event->specific instanceof BasketballEvent) {
            // No registration wired up at all. The event page still answers
            // "what is this event and how do I take part" better than a 404.
            return redirect()->route('events.public.show', $event);
        }

        $registrationOpen = $event->specific->registration_open;

        $categories = $registrationOpen
            ? $event->specific->categories()
                ->with(['teams' => function ($query) {
                    $query->where('status', '!=', 'rejected')
                        ->select('id', 'name', 'status', 'basketball_event_category_id');
                }])
                ->get()
            : [];

        return Inertia::render('register', [
            'event' => $event,
            'categories' => $categories,
            'registrationClosed' => ! $registrationOpen,
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $event->loadMissing('specific');

        abort_unless($event->specific instanceof BasketballEvent, 404);
        abort_unless($event->specific->registration_open, 403, 'Registration is closed for this event.');

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
            'role' => ['required', Rule::in(Player::ROLES)],
            'jersey_number' => [
                Rule::requiredIf(fn () => $request->input('role', Player::ROLE_PLAYER) === Player::ROLE_PLAYER),
                'nullable',
                'string',
                'max:3',
                function (string $attribute, mixed $value, Closure $fail) use ($team) {
                    if ($value === null) {
                        return;
                    }

                    $exists = $team->players()
                        ->where('jersey_number', $value)
                        ->exists();

                    if ($exists) {
                        $fail('The jersey number has already been taken for this team.');
                    }
                },
            ],
            'position' => ['nullable', 'string', 'max:255'],
            'photo' => ['required', 'url', 'max:255'],
            'certificate' => [
                Rule::requiredIf(fn () => $request->input('role') === Player::ROLE_MEDIC),
                'nullable',
                'url',
                'max:255',
            ],
            'phone_number' => ['nullable', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
            'email' => ['nullable', 'email', 'max:255'],
            'dob' => ['nullable', 'date', 'before:today'],
        ], [
            'phone_number.regex' => 'Invalid E.164 format',
        ]);
    }
}
