<?php

namespace App\Http\Controllers;

use App\Models\Award;
use App\Models\AwardNominee;
use App\Models\Event;
use App\Models\Player;
use App\Models\Vote;
use Illuminate\Http\Request;

/**
 * Puts players or teams on an award's ballot, and takes them off again.
 */
class AwardNomineeController extends Controller
{
    public function store(Request $request, Event $event, Award $award)
    {
        abort_unless($award->event_id === $event->id, 404);

        $validated = $request->validate([
            'nominee_id' => ['required', 'integer'],
            'display_name' => ['nullable', 'string', 'max:255'],
            'photo' => ['nullable', 'string', 'max:2048'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:65535'],
        ]);

        // Adding a nominee after voting has started changes the ballot people
        // already voted on, and for a paid award people have already paid on.
        if ($award->votes()->counted()->exists()) {
            return back()->with(['toast' => [
                'title' => 'Error',
                'description' => 'Votes have already been cast, so the ballot can no longer be changed.',
            ]]);
        }

        if (! $this->belongsToEvent($event, $award, (int) $validated['nominee_id'])) {
            return back()->withErrors([
                'nominee_id' => 'That nominee does not belong to this event.',
            ]);
        }

        $award->nominees()->firstOrCreate(
            [
                'nominee_type' => $award->nomineeModelClass(),
                'nominee_id' => $validated['nominee_id'],
            ],
            [
                'display_name' => $validated['display_name'] ?? null,
                'photo' => $validated['photo'] ?? null,
                'sort_order' => $validated['sort_order'] ?? 0,
            ]
        );

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Nominee added to the ballot.',
        ]]);
    }

    public function destroy(Event $event, Award $award, AwardNominee $nominee)
    {
        abort_unless($award->event_id === $event->id && $nominee->award_id === $award->id, 404);

        // Removing a nominee cascades their votes away — including paid ones.
        if ($nominee->votes()->whereIn('status', [Vote::STATUS_COUNTED, Vote::STATUS_PENDING])->exists()) {
            return back()->with(['toast' => [
                'title' => 'Error',
                'description' => 'This nominee already has votes and cannot be removed from the ballot.',
            ]]);
        }

        $nominee->delete();

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Nominee removed from the ballot.',
        ]]);
    }

    /**
     * Guards against nominating a player or team from somebody else's event by
     * posting a foreign id straight at this endpoint.
     */
    private function belongsToEvent(Event $event, Award $award, int $nomineeId): bool
    {
        if ($award->nominee_kind === Award::NOMINEE_KIND_PLAYER) {
            return Player::query()
                ->whereKey($nomineeId)
                ->whereHas('teams', fn ($query) => $query->where('teams.event_id', $event->id))
                ->exists();
        }

        return $event->teams()->whereKey($nomineeId)->exists();
    }
}
