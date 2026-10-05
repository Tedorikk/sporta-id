<?php

namespace App\Models;

use App\Concerns\HasVerificationCode;
use App\Services\Payments\Payable;
use App\Services\RegistrationConfirmationNotifier;
use App\Services\Running\RaceEntryService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class Registration extends Model implements Payable
{
    use HasFactory;
    use HasVerificationCode;

    public const STATUS_PENDING_PAYMENT = 'pending_payment';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_EXPIRED = 'expired';

    public const STATUSES = [
        self::STATUS_PENDING_PAYMENT,
        self::STATUS_CONFIRMED,
        self::STATUS_REJECTED,
        self::STATUS_CANCELLED,
        self::STATUS_EXPIRED,
    ];

    /** Terminal states in which the registrant no longer holds a place. */
    public const WITHDRAWN_STATUSES = [
        self::STATUS_REJECTED,
        self::STATUS_CANCELLED,
        self::STATUS_EXPIRED,
    ];

    protected $fillable = [
        'registration_category_id', 'registration_order_id', 'event_id', 'team_id', 'name', 'email',
        'phone', 'photo', 'qr_token', 'verification_code', 'form_data',
        'status', 'expires_at', 'locale',
    ];

    protected $casts = [
        'form_data' => 'array',
        'expires_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function (self $registration) {
            if (empty($registration->qr_token)) {
                $registration->qr_token = (string) Str::uuid();
            }
            if (empty($registration->verification_code)) {
                $registration->verification_code = self::generateVerificationCode();
            }
            if (empty($registration->status)) {
                $registration->status = self::STATUS_PENDING_PAYMENT;
            }
        });

        // A free registration is confirmed from the start, so its start-list
        // entry (if it is a race entry) is created right here.
        static::created(function (self $registration) {
            if ($registration->status === self::STATUS_CONFIRMED) {
                app(RaceEntryService::class)->enter($registration);
            }
        });

        // A team is only in the tournament, and a runner only on the start
        // list, for as long as the registration stands. Every way a
        // registration is confirmed (Midtrans settlement) or falls through —
        // payment expired or rejected, the safety-net expiry command, an
        // organiser's refund — ends here, so the team drops out of pools and
        // the runner off the start list without each of those paths having
        // to remember to do it.
        static::updated(function (self $registration) {
            if (! $registration->wasChanged('status')) {
                return;
            }

            if ($registration->status === self::STATUS_CONFIRMED) {
                app(RaceEntryService::class)->enter($registration);
            }

            if ($registration->isWithdrawn()) {
                app(RaceEntryService::class)->withdraw($registration);

                if ($registration->team_id !== null) {
                    $registration->team()->update(['status' => Team::STATUS_REJECTED]);
                }
            }
        });
    }

    /**
     * Resolves a registration from either its numeric id or its qr_token.
     *
     * Public URLs are keyed on qr_token so registrations can't be enumerated,
     * but ID cards issued before that change encode the numeric id in their QR
     * code. Staff-side lookups (the gate scanner, meeting check-in) accept
     * both so those cards keep working; public routes accept only the token.
     */
    public static function findByIdOrToken(string $identifier): ?self
    {
        return ctype_digit($identifier)
            ? static::find((int) $identifier)
            : static::where('qr_token', $identifier)->first();
    }

    /** @return BelongsTo<RegistrationCategory, $this> */
    public function registrationCategory(): BelongsTo
    {
        return $this->belongsTo(RegistrationCategory::class);
    }

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** The group checkout this registration was bought through, if any. */
    public function registrationOrder(): BelongsTo
    {
        return $this->belongsTo(RegistrationOrder::class);
    }

    /** @return BelongsTo<Team, $this> */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * The start-list entry a confirmed race registration became, carrying
     * the bib number. Null for anything that isn't a race entry (yet).
     *
     * @return HasOne<RaceParticipant, $this>
     */
    public function raceParticipant(): HasOne
    {
        return $this->hasOne(RaceParticipant::class);
    }

    public function isTeamRegistration(): bool
    {
        return $this->team_id !== null;
    }

    public function isWithdrawn(): bool
    {
        return in_array($this->status, self::WITHDRAWN_STATUSES, true);
    }

    /** @return MorphMany<Payment, $this> */
    public function payments(): MorphMany
    {
        return $this->morphMany(Payment::class, 'payable');
    }

    public function latestPayment(): ?Payment
    {
        return $this->payments->sortByDesc('id')->first();
    }

    /** @return HasMany<MeetingCheckIn, $this> */
    public function meetingCheckIns(): HasMany
    {
        return $this->hasMany(MeetingCheckIn::class);
    }

    /**
     * What a payment outcome means for a registration. Only a registration
     * still awaiting this outcome may transition, which keeps a retried or
     * duplicated notification from double-releasing quota.
     */
    public function applyPaymentStatus(Payment $payment, string $paymentStatus): bool
    {
        if ($this->status !== self::STATUS_PENDING_PAYMENT) {
            return false;
        }

        if ($paymentStatus === Payment::STATUS_SETTLEMENT) {
            $this->update(['status' => self::STATUS_CONFIRMED, 'expires_at' => null]);

            return true;
        }

        if ($paymentStatus === Payment::STATUS_PENDING) {
            return false;
        }

        $this->update([
            'status' => $paymentStatus === Payment::STATUS_EXPIRE ? self::STATUS_EXPIRED : self::STATUS_REJECTED,
        ]);
        $this->registrationCategory()->decrement('registered_count');

        return false;
    }

    /**
     * A registration that just went from awaiting payment to confirmed is the
     * paid equivalent of a free registration being created, so it notifies the
     * payer and the organizers.
     */
    public function handlePaymentSettled(): void
    {
        app(RegistrationConfirmationNotifier::class)->notify($this);
    }

    // --- Provider-neutral Payable methods ---

    public function getPaymentItems(Payment $payment): array
    {
        $this->loadMissing(['event', 'registrationCategory']);

        return [[
            'reference_id' => (string) $this->registration_category_id,
            'name' => Str::limit(
                trim(($this->event?->name ? $this->event->name.' — ' : '').$this->registrationCategory?->name),
                50,
                ''
            ),
            'quantity' => 1,
            'unit_amount' => (int) $payment->amount,
        ]];
    }

    public function getPaymentCustomer(): array
    {
        return [
            'email' => $this->email,
            'mobile_number' => $this->phone,
            'given_names' => $this->name,
        ];
    }

    public function getPaymentAmount(): int
    {
        return (int) $this->registrationCategory->price;
    }

    public function getPaymentDescription(): string
    {
        $this->loadMissing(['event', 'registrationCategory']);

        return trim(($this->event?->name ?? 'Event').' — '.($this->registrationCategory?->name ?? 'Registration'));
    }

    // --- Legacy Midtrans methods (deprecated, kept for compatibility) ---

    public function midtransItemDetails(Payment $payment): array
    {
        $items = $this->getPaymentItems($payment);

        // Convert to Midtrans format
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

        // Convert to Midtrans format
        return [
            'first_name' => $customer['given_names'],
            'email' => $customer['email'],
            'phone' => $customer['mobile_number'] ?? null,
        ];
    }
}
