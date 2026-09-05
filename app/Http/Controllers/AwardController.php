<?php

namespace App\Http\Controllers;

use App\Models\Award;
use App\Models\Event;
use App\Models\Payment;
use App\Models\Player;
use App\Models\Team;
use App\Models\Vote;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Organizer-side management of an event's awards. Authorization comes from the
 * `event.org` middleware on the route group, which resolves {event} against
 * the current organization before any of this runs.
 */
class AwardController extends Controller
{
    public function index(Event $event)
    {
        return Inertia::render('dashboard/events/awards/index', [
            'event' => $event,
            'awards' => $event->awards()
                ->withCount('nominees')
                ->withSum(['votes as votes_total' => fn ($query) => $query->counted()], 'quantity')
                ->withSum(['votes as revenue_total' => fn ($query) => $query->counted()], 'amount')
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function store(Request $request, Event $event)
    {
        $award = $event->awards()->create($this->validated($request));

        return redirect()->route('awards.show', [$event, $award])->with(['toast' => [
            'title' => 'Success',
            'description' => 'Award created. Add nominees before opening it for voting.',
        ]]);
    }

    public function show(Event $event, Award $award)
    {
        abort_unless($award->event_id === $event->id, 404);

        return Inertia::render('dashboard/events/awards/show', [
            'event' => $event,
            'award' => $award,
            // Organizers always see tallies, whatever results_visibility says —
            // that setting governs what voters see, not what the owner sees.
            'nominees' => $award->nomineesWithTallies(),
            'candidates' => $this->candidates($event, $award),
            'stats' => $this->stats($award),
        ]);
    }

    public function update(Request $request, Event $event, Award $award)
    {
        abort_unless($award->event_id === $event->id, 404);

        $validated = $this->validated($request, $award);

        // Repricing a ballot midway would mean two voters paid different
        // amounts for the same thing, and flipping a counted free ballot to
        // paid would retroactively devalue every vote already cast.
        if ($award->votes()->counted()->exists()) {
            $repriced = (bool) $validated['is_paid'] !== $award->is_paid
                || ($validated['price_per_vote'] ?? null) !== $award->price_per_vote;

            if ($repriced) {
                return back()->with(['toast' => [
                    'title' => 'Error',
                    'description' => 'Votes have already been cast, so the pricing for this award can no longer be changed.',
                ]]);
            }
        }

        // Switching what is nominated once nominees exist would orphan them.
        if ($validated['nominee_kind'] !== $award->nominee_kind && $award->nominees()->exists()) {
            return back()->with(['toast' => [
                'title' => 'Error',
                'description' => 'Remove the existing nominees before switching between player and team voting.',
            ]]);
        }

        $award->update($validated);

        return back()->with(['toast' => [
            'title' => 'Success',
            'description' => 'Award updated.',
        ]]);
    }

    public function destroy(Event $event, Award $award)
    {
        abort_unless($award->event_id === $event->id, 404);

        // Deleting the award cascades its votes away, and paid votes are money
        // that has to stay reconcilable against Midtrans.
        if ($award->votes()->whereIn('status', [Vote::STATUS_COUNTED, Vote::STATUS_PENDING])->exists()) {
            return back()->with(['toast' => [
                'title' => 'Error',
                'description' => 'This award already has votes and cannot be deleted. Close it instead.',
            ]]);
        }

        $award->delete();

        return redirect()->route('awards.index', $event)->with(['toast' => [
            'title' => 'Success',
            'description' => 'Award deleted.',
        ]]);
    }

    /**
     * Players or teams at this event that are not on the ballot yet.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function candidates(Event $event, Award $award): Collection
    {
        $taken = $award->nominees()
            ->where('nominee_type', $award->nomineeModelClass())
            ->pluck('nominee_id');

        if ($award->nominee_kind === Award::NOMINEE_KIND_PLAYER) {
            return Player::query()
                ->whereHas('teams', fn ($query) => $query->where('teams.event_id', $event->id))
                ->whereNotIn('id', $taken)
                ->orderBy('name')
                ->get(['id', 'name', 'photo'])
                ->map(fn (Player $player) => [
                    'id' => $player->id,
                    'name' => $player->name,
                    'photo' => $player->photo,
                ])
                ->values();
        }

        return $event->teams()
            ->whereNotIn('id', $taken)
            ->orderBy('name')
            ->get(['id', 'name', 'logo'])
            ->map(fn (Team $team) => [
                'id' => $team->id,
                'name' => $team->name,
                'photo' => $team->logo,
            ])
            ->values();
    }

    /**
     * @return array<string, mixed>
     */
    private function stats(Award $award): array
    {
        return [
            'votes_counted' => (int) $award->votes()->counted()->sum('quantity'),
            'votes_pending' => (int) $award->votes()->pending()->sum('quantity'),
            'ballots_counted' => $award->votes()->counted()->count(),
            'revenue_settled' => (int) $award->payments()
                ->where('payments.status', Payment::STATUS_SETTLEMENT)
                ->sum('payments.amount'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Award $award = null): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'nominee_kind' => ['required', Rule::in(Award::NOMINEE_KINDS)],
            'allowed_voters' => ['required', 'array', 'min:1'],
            'allowed_voters.*' => [Rule::in(Award::VOTER_TYPES)],
            'status' => ['required', Rule::in(Award::STATUSES)],
            'results_visibility' => ['required', Rule::in(Award::RESULTS_VISIBILITIES)],
            'is_paid' => ['required', 'boolean'],
            // Whole rupiah only: Midtrans gross_amount is an integer, so a
            // fractional price here would silently disagree with what is
            // actually charged.
            'price_per_vote' => ['nullable', 'required_if:is_paid,true', 'integer', 'min:1000', 'max:10000000'],
            'max_votes_per_transaction' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'max_votes_per_voter' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'opens_at' => ['nullable', 'date'],
            'closes_at' => ['nullable', 'date', 'after:opens_at'],
        ], [
            'price_per_vote.required_if' => 'A paid award needs a price per vote.',
            'closes_at.after' => 'Voting must close after it opens.',
        ]);
    }
}
