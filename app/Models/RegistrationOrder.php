<?php

namespace App\Models;

use App\Services\Midtrans\Payable;
use App\Services\RegistrationConfirmationNotifier;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

/**
 * One buyer, several {@see Registration} rows, one Midtrans payment for the
 * summed total — how a group of runners checks out together.
 *
 * The order itself carries no form data or price; it only carries status and
 * a payment. Everything a registrant answered lives on their own Registration
 * row, and each keeps its own status column — but that status is driven from
 * here rather than settled individually, since there is only one payment to
 * react to. {@see Registration::applyPaymentStatus()} is reused per child
 * (its $payment argument is unused, so the order's own settled payment is
 * passed straight through), which keeps quota release, bib assignment and
 * every other per-registration side effect on its one existing code path.
 */
class RegistrationOrder extends Model implements Payable
{
    use HasFactory;

    public const STATUS_PENDING_PAYMENT = 'pending_payment';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_EXPIRED = 'expired';

    protected $fillable = ['event_id', 'qr_token', 'status', 'expires_at', 'locale'];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $order) {
            if (empty($order->qr_token)) {
                $order->qr_token = (string) Str::uuid();
            }
            if (empty($order->status)) {
                $order->status = self::STATUS_PENDING_PAYMENT;
            }
        });
    }

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** @return HasMany<Registration, $this> */
    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class);
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

    /**
     * Applies a payment outcome to every registration in the order and then
     * to the order's own status. Only a still-pending order may transition
     * (the same idempotency guard {@see Registration::applyPaymentStatus()}
     * uses), so a replayed or duplicated notification never double-releases
     * quota or double-books a start list.
     */
    public function applyPaymentStatus(Payment $payment, string $paymentStatus): bool
    {
        if ($this->status !== self::STATUS_PENDING_PAYMENT) {
            return false;
        }

        foreach ($this->registrations as $registration) {
            $registration->applyPaymentStatus($payment, $paymentStatus);
        }

        $this->update(['status' => match ($paymentStatus) {
            Payment::STATUS_SETTLEMENT => self::STATUS_CONFIRMED,
            Payment::STATUS_PENDING => self::STATUS_PENDING_PAYMENT,
            Payment::STATUS_EXPIRE => self::STATUS_EXPIRED,
            default => self::STATUS_REJECTED,
        }]);

        return $paymentStatus === Payment::STATUS_SETTLEMENT;
    }

    /** Each newly confirmed runner gets their own confirmation email, exactly as a solo registration would. */
    public function handlePaymentSettled(): void
    {
        $notifier = app(RegistrationConfirmationNotifier::class);

        foreach ($this->registrations as $registration) {
            $notifier->notify($registration);
        }
    }

    /**
     * One Midtrans line per participant, so the Snap page shows the buyer
     * what they're paying for rather than a bare total.
     *
     * @return array<int, array<string, mixed>>
     */
    public function midtransItemDetails(Payment $payment): array
    {
        $this->loadMissing('registrations.registrationCategory');

        return $this->registrations->map(fn (Registration $registration) => [
            'id' => (string) $registration->registration_category_id,
            'name' => Str::limit(trim($registration->name.' — '.$registration->registrationCategory?->name), 50, ''),
            'price' => (int) $registration->registrationCategory?->price,
            'quantity' => 1,
        ])->all();
    }

    /** The first participant stands in as the buyer — Midtrans needs one contact, not a name per runner. */
    public function midtransCustomerDetails(): array
    {
        $first = $this->registrations->first();

        return [
            'first_name' => $first?->name,
            'email' => $first?->email,
            'phone' => $first?->phone,
        ];
    }
}
