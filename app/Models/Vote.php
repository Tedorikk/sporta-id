<?php

namespace App\Models;

use App\Services\Payments\Payable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Str;

/**
 * One ballot cast for a nominee. A free vote is counted the moment it is cast;
 * a paid one carries a quantity, starts pending, and is only counted once
 * payment settles it — so an abandoned checkout never shows up in a tally.
 */
class Vote extends Model implements Payable
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_COUNTED = 'counted';

    public const STATUS_VOID = 'void';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_COUNTED,
        self::STATUS_VOID,
    ];

    protected $fillable = [
        'award_id', 'award_nominee_id', 'reference', 'quantity', 'status',
        'voter_type', 'voter_id', 'voter_name', 'voter_email', 'voter_phone',
        'voter_fingerprint', 'ip_address', 'amount',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'amount' => 'integer',
    ];

    protected $attributes = [
        'quantity' => 1,
        'status' => self::STATUS_COUNTED,
    ];

    protected $hidden = ['voter_fingerprint', 'ip_address'];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $vote) {
            if (empty($vote->reference)) {
                $vote->reference = (string) Str::uuid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'reference';
    }

    /** @return BelongsTo<Award, $this> */
    public function award(): BelongsTo
    {
        return $this->belongsTo(Award::class);
    }

    /** @return BelongsTo<AwardNominee, $this> */
    public function awardNominee(): BelongsTo
    {
        return $this->belongsTo(AwardNominee::class);
    }

    /**
     * The Registration or Attendee behind this vote. Null when the award
     * allows anonymous public voting.
     *
     * @return MorphTo<Model, $this>
     */
    public function voter(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return MorphMany<Payment, $this> */
    public function payments(): MorphMany
    {
        return $this->morphMany(Payment::class, 'payable');
    }

    public function latestPayment(): ?Payment
    {
        return $this->payments()->latest('id')->first();
    }

    public function scopeCounted(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_COUNTED);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function applyPaymentStatus(Payment $payment, string $paymentStatus): bool
    {
        // Only a vote still awaiting its outcome may transition, so a retried
        // webhook cannot count the same batch of votes twice.
        if ($this->status !== self::STATUS_PENDING) {
            return false;
        }

        if ($paymentStatus === Payment::STATUS_SETTLEMENT) {
            $this->update(['status' => self::STATUS_COUNTED]);

            return true;
        }

        if ($paymentStatus === Payment::STATUS_PENDING) {
            return false;
        }

        // Expired, cancelled, denied, failed or refunded: the votes were never
        // paid for, so they must never reach a tally.
        $this->update(['status' => self::STATUS_VOID]);

        return false;
    }

    public function handlePaymentSettled(): void
    {
        // Nothing to do — a counted vote needs no confirmation mail. The voter
        // is redirected to the vote's own status page by the payment flow.
    }

    // --- Provider-neutral Payable methods ---

    public function getPaymentItems(Payment $payment): array
    {
        $this->loadMissing(['award', 'awardNominee']);

        return [[
            'reference_id' => (string) $this->award_nominee_id,
            'name' => Str::limit(
                trim(($this->award?->title ? $this->award->title.' — ' : '').$this->awardNominee?->name),
                50,
                ''
            ),
            'quantity' => $this->quantity,
            'unit_amount' => (int) ($this->award?->price_per_vote ?? 0),
        ]];
    }

    public function getPaymentCustomer(): array
    {
        return [
            'email' => $this->voter_email,
            'mobile_number' => $this->voter_phone,
            'given_names' => $this->voter_name,
        ];
    }

    public function getPaymentAmount(): int
    {
        return (int) (($this->award?->price_per_vote ?? 0) * $this->quantity);
    }

    public function getPaymentDescription(): string
    {
        $this->loadMissing(['award', 'awardNominee']);

        return trim(($this->award?->title ?? 'Award').' — '.($this->awardNominee?->name ?? 'Nominee').' (×'.$this->quantity.')');
    }

    // --- Legacy Midtrans methods (deprecated, kept for compatibility) ---

    public function midtransItemDetails(Payment $payment): array
    {
        $items = $this->getPaymentItems($payment);

        return array_map(fn ($item) => [
            'id' => $item['reference_id'],
            'name' => $item['name'],
            'price' => $item['unit_amount'],
            'quantity' => $item['quantity'],
        ], $items);
    }

    public function midtransCustomerDetails(): array
    {
        $customer = $this->getPaymentCustomer();

        return [
            'first_name' => $customer['given_names'],
            'email' => $customer['email'],
            'phone' => $customer['mobile_number'] ?? null,
        ];
    }
}
