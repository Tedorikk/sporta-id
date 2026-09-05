<?php

namespace App\Http\Controllers;

use App\Models\Attendee;
use App\Models\Award;
use App\Models\Event;
use App\Models\Registration;
use App\Models\Vote;
use App\Services\Midtrans\MidtransClient;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * The public voting funnel. No authentication: a voter is either anonymous
 * (when the award allows it) or identified by the qr_token from their own ID
 * card.
 *
 * Note that the printed verification code is deliberately *not* accepted as
 * identity here. That code is documented as non-secret, short, and free to
 * collide between holders, because it is only ever eyeballed against its own
 * record. The qr_token is the credential that actually authenticates.
 */
class VoteController extends Controller
{
    public function __construct(private readonly MidtransClient $midtrans) {}

    public function create(Request $request, Event $event, Award $award)
    {
        $this->assertPubliclyVisible($event, $award);

        $voter = $request->filled('token')
            ? $this->resolveVoter($event, $award, (string) $request->query('token'))
            : null;

        return Inertia::render('vote', [
            'event' => $event->only(['id', 'name', 'logo', 'banner', 'accent_color']),
            'award' => [
                ...$award->only([
                    'id', 'title', 'description', 'nominee_kind', 'allowed_voters',
                    'status', 'is_paid', 'price_per_vote', 'max_votes_per_transaction',
                    'max_votes_per_voter', 'opens_at', 'closes_at',
                ]),
                'is_open' => $award->isOpenForVoting(),
                'has_closed' => $award->hasClosed(),
                'results_are_public' => $award->resultsArePublic(),
                'allows_anonymous' => $award->allowsAnonymousVoting(),
            ],
            'nominees' => $this->ballot($award),
            'voter' => $voter === null ? null : [
                'name' => $voter->getAttribute('name'),
                'kind' => $voter instanceof Attendee ? Award::VOTER_ATTENDEE : Award::VOTER_REGISTRANT,
                'token' => $voter->getAttribute('qr_token'),
            ],
        ]);
    }

    public function store(Request $request, Event $event, Award $award)
    {
        $this->assertPubliclyVisible($event, $award);

        if (! $award->isOpenForVoting()) {
            return back()->withErrors(['award_nominee_id' => 'Voting is not open for this award.']);
        }

        $validated = $request->validate([
            'award_nominee_id' => [
                'required', 'integer',
                Rule::exists('award_nominees', 'id')->where('award_id', $award->id),
            ],
            'quantity' => ['required', 'integer', 'min:1', 'max:'.$this->maxQuantity($award)],
            'voter_token' => ['nullable', 'uuid'],
            // A paid vote needs a real payer on the Midtrans transaction.
            'voter_name' => [$award->is_paid ? 'required' : 'nullable', 'string', 'max:255'],
            'voter_email' => [$award->is_paid ? 'required' : 'nullable', 'email', 'max:255'],
            'voter_phone' => ['nullable', 'string', 'max:32'],
            // Hidden honeypot input, same as the registration form: real
            // visitors never see or fill it, so any value is a bot signal.
            'website' => ['prohibited'],
        ], [
            'quantity.max' => 'You can buy at most '.$this->maxQuantity($award).' vote(s) at a time.',
        ]);

        $voter = null;

        if (filled($validated['voter_token'] ?? null)) {
            $voter = $this->resolveVoter($event, $award, $validated['voter_token']);

            if ($voter === null) {
                return back()->withErrors([
                    'voter_token' => 'That ID card is not eligible to vote in this award.',
                ]);
            }
        } elseif (! $award->allowsAnonymousVoting()) {
            return back()->withErrors([
                'voter_token' => 'This award is only open to registered participants. Open it from your ID card to vote.',
            ]);
        }

        $fingerprint = $this->fingerprint($request, $award);

        if ($error = $this->alreadyVotedError($award, $voter, $fingerprint)) {
            return back()->withErrors(['award_nominee_id' => $error]);
        }

        $vote = $award->votes()->create([
            'award_nominee_id' => $validated['award_nominee_id'],
            'quantity' => $award->is_paid ? $validated['quantity'] : 1,
            // A free vote counts immediately; a paid one only once Midtrans
            // settles it, so an abandoned checkout never reaches a tally.
            'status' => $award->is_paid ? Vote::STATUS_PENDING : Vote::STATUS_COUNTED,
            'voter_type' => $voter === null ? null : $voter::class,
            'voter_id' => $voter?->getKey(),
            'voter_name' => $validated['voter_name'] ?? $voter?->getAttribute('name'),
            'voter_email' => $validated['voter_email'] ?? $voter?->getAttribute('email'),
            'voter_phone' => $validated['voter_phone'] ?? $voter?->getAttribute('phone'),
            'voter_fingerprint' => $fingerprint,
            'ip_address' => $request->ip(),
            'amount' => $award->is_paid ? $award->price_per_vote * $validated['quantity'] : null,
        ]);

        if ($award->is_paid) {
            return redirect()->route('votes.status', $vote);
        }

        return back()->with(['toast' => [
            'title' => 'Vote counted',
            'description' => 'Thanks for voting.',
        ]]);
    }

    /**
     * Hands the browser a Snap token for a pending vote. Separate from store()
     * so an abandoned checkout can be resumed from the status page rather than
     * stranding the voter with an unpayable vote.
     */
    public function pay(Vote $vote)
    {
        $vote->loadMissing(['award', 'awardNominee']);

        abort_unless($vote->status === Vote::STATUS_PENDING, 403, 'This vote is not awaiting payment.');

        $payment = $vote->payments()->create([
            'order_id' => 'VOTE-'.$vote->id.'-'.Str::random(6),
            'amount' => $vote->amount,
        ]);

        $payment->setRelation('payable', $vote);

        $payment->snap_token = $this->midtrans->createSnapTransaction($payment);
        $payment->save();

        return response()->json([
            'snap_token' => $payment->snap_token,
            'midtrans_client_key' => config('services.midtrans.client_key'),
            'midtrans_is_production' => (bool) config('services.midtrans.is_production'),
        ]);
    }

    public function status(Vote $vote)
    {
        $vote->loadMissing(['award.event', 'awardNominee']);

        return Inertia::render('vote-status', [
            'vote' => [
                ...$vote->only(['reference', 'quantity', 'status', 'amount', 'voter_name']),
                'nominee_name' => $vote->awardNominee?->name,
            ],
            'award' => $vote->award?->only(['id', 'title', 'is_paid', 'price_per_vote']),
            'event' => $vote->award?->event?->only(['id', 'name', 'accent_color']),
        ]);
    }

    /**
     * A draft award, or one on an unpublished event, does not exist as far as
     * the public is concerned.
     */
    private function assertPubliclyVisible(Event $event, Award $award): void
    {
        abort_unless($award->event_id === $event->id, 404);
        abort_unless($event->is_published, 404);
        abort_if($award->status === Award::STATUS_DRAFT, 404);
    }

    /**
     * The ballot as a voter sees it — tallies attached only when this award is
     * configured to show them.
     *
     * @return array<int, array<string, mixed>>
     */
    private function ballot(Award $award): array
    {
        $showResults = $award->resultsArePublic();

        return $award->nomineesWithTallies()
            ->map(fn ($nominee) => [
                'id' => $nominee->id,
                'name' => $nominee->name,
                'photo' => $nominee->photo_url,
                'votes_total' => $showResults ? (int) ($nominee->votes_total ?? 0) : null,
            ])
            ->values()
            ->all();
    }

    /**
     * Resolves an ID card token to a voter this award actually accepts.
     * Returns null for an unknown token, a revoked or unconfirmed holder, a
     * holder from another event, or a holder of a kind this award excludes.
     */
    private function resolveVoter(Event $event, Award $award, string $token): ?Model
    {
        if ($award->allowsVoter(Award::VOTER_REGISTRANT)) {
            $registration = Registration::query()
                ->where('event_id', $event->id)
                ->where('qr_token', $token)
                ->where('status', Registration::STATUS_CONFIRMED)
                ->first();

            if ($registration !== null) {
                return $registration;
            }
        }

        if ($award->allowsVoter(Award::VOTER_ATTENDEE)) {
            return Attendee::query()
                ->where('event_id', $event->id)
                ->where('qr_token', $token)
                ->where('status', Attendee::STATUS_ACTIVE)
                ->first();
        }

        return null;
    }

    /**
     * Enforces the one-person-one-vote cap on a free award.
     *
     * Paid awards are exempt by design: buying more votes is the point, and
     * the payment itself is the scarce resource.
     */
    private function alreadyVotedError(Award $award, ?Model $voter, string $fingerprint): ?string
    {
        if ($award->is_paid) {
            return null;
        }

        $cap = $award->max_votes_per_voter ?? 1;

        $cast = $award->votes()
            ->counted()
            ->when(
                $voter !== null,
                fn ($query) => $query->where('voter_type', $voter::class)->where('voter_id', $voter->getKey()),
                // Anonymous voting has no real identity to key on, so this is
                // a deterrent against casual repeat voting, not a guarantee.
                fn ($query) => $query->whereNull('voter_id')->where('voter_fingerprint', $fingerprint),
            )
            ->sum('quantity');

        if ($cast >= $cap) {
            return $cap === 1
                ? 'You have already voted in this award.'
                : "You have already used all {$cap} of your votes in this award.";
        }

        return null;
    }

    /**
     * Best-effort identity for anonymous voting. Weak on purpose — it stops
     * the same browser voting twice, nothing more.
     */
    private function fingerprint(Request $request, Award $award): string
    {
        return hash('sha256', implode('|', [
            $request->ip(),
            (string) $request->userAgent(),
            $award->id,
        ]));
    }

    private function maxQuantity(Award $award): int
    {
        if (! $award->is_paid) {
            return 1;
        }

        return $award->max_votes_per_transaction ?? 100;
    }
}
