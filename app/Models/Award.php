<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

/**
 * A single thing being voted on at an event — "MVP", "Best Team" — together
 * with who may vote, when, and whether a vote costs money.
 */
class Award extends Model
{
    use HasFactory;

    public const NOMINEE_KIND_PLAYER = 'player';

    public const NOMINEE_KIND_TEAM = 'team';

    public const NOMINEE_KINDS = [
        self::NOMINEE_KIND_PLAYER,
        self::NOMINEE_KIND_TEAM,
    ];

    public const VOTER_PUBLIC = 'public';

    public const VOTER_REGISTRANT = 'registrant';

    public const VOTER_ATTENDEE = 'attendee';

    public const VOTER_TYPES = [
        self::VOTER_PUBLIC,
        self::VOTER_REGISTRANT,
        self::VOTER_ATTENDEE,
    ];

    public const STATUS_DRAFT = 'draft';

    public const STATUS_OPEN = 'open';

    public const STATUS_CLOSED = 'closed';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_OPEN,
        self::STATUS_CLOSED,
    ];

    public const RESULTS_AFTER_CLOSE = 'after_close';

    public const RESULTS_LIVE = 'live';

    public const RESULTS_ADMIN_ONLY = 'admin_only';

    public const RESULTS_VISIBILITIES = [
        self::RESULTS_AFTER_CLOSE,
        self::RESULTS_LIVE,
        self::RESULTS_ADMIN_ONLY,
    ];

    protected $fillable = [
        'event_id', 'title', 'description', 'nominee_kind', 'allowed_voters',
        'status', 'results_visibility', 'is_paid', 'price_per_vote',
        'max_votes_per_transaction', 'max_votes_per_voter', 'opens_at', 'closes_at',
    ];

    protected $casts = [
        'allowed_voters' => 'array',
        'is_paid' => 'boolean',
        'price_per_vote' => 'integer',
        'max_votes_per_transaction' => 'integer',
        'max_votes_per_voter' => 'integer',
        'opens_at' => 'datetime',
        'closes_at' => 'datetime',
    ];

    protected $attributes = [
        'status' => self::STATUS_DRAFT,
        'results_visibility' => self::RESULTS_AFTER_CLOSE,
        'nominee_kind' => self::NOMINEE_KIND_TEAM,
        'is_paid' => false,
    ];

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** @return HasMany<AwardNominee, $this> */
    public function nominees(): HasMany
    {
        return $this->hasMany(AwardNominee::class)->orderBy('sort_order')->orderBy('id');
    }

    /** @return HasMany<Vote, $this> */
    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }

    /** @return HasManyThrough<Payment, Vote, $this> */
    public function payments(): HasManyThrough
    {
        return $this->hasManyThrough(Payment::class, Vote::class, 'award_id', 'payable_id')
            ->where('payments.payable_type', Vote::class);
    }

    public function scopeVisibleToPublic(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_OPEN, self::STATUS_CLOSED]);
    }

    /**
     * The Eloquent model this award's nominees point at.
     *
     * @return class-string<Model>
     */
    public function nomineeModelClass(): string
    {
        return $this->nominee_kind === self::NOMINEE_KIND_PLAYER ? Player::class : Team::class;
    }

    public function allowsVoter(string $voterType): bool
    {
        return in_array($voterType, $this->allowed_voters ?? [], true);
    }

    public function allowsAnonymousVoting(): bool
    {
        return $this->allowsVoter(self::VOTER_PUBLIC);
    }

    /**
     * Whether a vote can be cast right now. Deliberately combines the manual
     * status with the scheduled window, so an organizer can both schedule a
     * ballot and slam it shut early.
     */
    public function isOpenForVoting(): bool
    {
        if ($this->status !== self::STATUS_OPEN) {
            return false;
        }

        if ($this->opens_at !== null && now()->lt($this->opens_at)) {
            return false;
        }

        return ! ($this->closes_at !== null && now()->gt($this->closes_at));
    }

    public function hasClosed(): bool
    {
        return $this->status === self::STATUS_CLOSED
            || ($this->closes_at !== null && now()->gt($this->closes_at));
    }

    /**
     * Whether a voter — as opposed to an organizer, who always sees them — may
     * see the running tallies.
     */
    public function resultsArePublic(): bool
    {
        return match ($this->results_visibility) {
            self::RESULTS_LIVE => true,
            self::RESULTS_AFTER_CLOSE => $this->hasClosed(),
            default => false,
        };
    }

    /**
     * Nominees with their settled vote totals attached. `votes_total` counts
     * bought votes (a paid batch of 10 counts as 10); `voters_count` counts
     * the ballots those came from.
     *
     * @return Collection<int, AwardNominee>
     */
    public function nomineesWithTallies(): Collection
    {
        return $this->nominees()
            ->with('nominee')
            ->withSum(['votes as votes_total' => fn ($query) => $query->counted()], 'quantity')
            ->withCount(['votes as voters_count' => fn ($query) => $query->counted()])
            ->get();
    }
}
