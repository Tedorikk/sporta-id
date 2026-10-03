<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Payment extends Model
{
    use HasFactory;

    // Payment statuses (financial state)
    public const STATUS_PENDING = 'pending';

    public const STATUS_SETTLEMENT = 'settlement';

    public const STATUS_EXPIRE = 'expire';

    public const STATUS_CANCEL = 'cancel';

    public const STATUS_DENY = 'deny';

    public const STATUS_FAILURE = 'failure';

    public const STATUS_REFUND = 'refund';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_SETTLEMENT,
        self::STATUS_EXPIRE,
        self::STATUS_CANCEL,
        self::STATUS_DENY,
        self::STATUS_FAILURE,
        self::STATUS_REFUND,
    ];

    // Checkout states (session creation/availability)
    public const CHECKOUT_CREATING = 'creating';

    public const CHECKOUT_READY = 'ready';

    public const CHECKOUT_UNKNOWN = 'unknown';

    public const CHECKOUT_FAILED = 'failed';

    public const CHECKOUT_CLOSED = 'closed';

    // Fulfillment states (settlement outcome)
    public const FULFILLMENT_PENDING = 'pending';

    public const FULFILLMENT_FULFILLED = 'fulfilled';

    public const FULFILLMENT_LATE_PAYMENT = 'late_payment';

    public const FULFILLMENT_EXCESS_PAYMENT = 'excess_payment';

    public const FULFILLMENT_REVIEW_REQUIRED = 'review_required';

    // Supported providers
    public const PROVIDER_MIDTRANS = 'midtrans';

    public const PROVIDER_XENDIT = 'xendit';

    public const PROVIDER_MANUAL = 'manual_transfer';

    protected $fillable = [
        'payable_type', 'payable_id', 'order_id', 'amount', 'currency', 'status',
        'provider', 'provider_account_id', 'provider_mode',
        'provider_session_id', 'provider_payment_id', 'provider_request_id',
        'checkout_url', 'checkout_expires_at', 'checkout_state', 'creation_lease_expires_at',
        'request_snapshot', 'provider_status', 'provider_updated_at', 'last_reconciled_at',
        'fulfillment_state', 'review_reason',
        'midtrans_transaction_id', 'payment_type', 'snap_token', 'raw_notification', 'paid_at',
        'proof_path', 'payer_account_name', 'verified_by', 'verified_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'request_snapshot' => 'array',
        'raw_notification' => 'array',
        'checkout_expires_at' => 'datetime',
        'creation_lease_expires_at' => 'datetime',
        'provider_updated_at' => 'datetime',
        'last_reconciled_at' => 'datetime',
        'paid_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    protected $attributes = [
        'status' => self::STATUS_PENDING,
        'currency' => 'IDR',
    ];

    protected $hidden = [
        'request_snapshot',
        'raw_notification',
    ];

    /**
     * What was paid for — a Registration, or a batch of votes on a paid award.
     *
     * @return MorphTo<Model, $this>
     */
    public function payable(): MorphTo
    {
        return $this->morphTo();
    }

    /** Who approved or rejected a manual-transfer payment, if any. */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * Scope: payments with unresolved checkout state.
     */
    public function scopeUnresolvedCheckout($query)
    {
        return $query->whereIn('checkout_state', [
            self::CHECKOUT_CREATING,
            self::CHECKOUT_UNKNOWN,
        ])->orWhere(function ($q) {
            $q->where('status', self::STATUS_PENDING)
                ->whereNull('checkout_state');
        });
    }

    /**
     * Scope: payments needing reconciliation.
     */
    public function scopeNeedsReconciliation($query)
    {
        return $query->where('status', self::STATUS_PENDING)
            ->where(function ($q) {
                $q->whereNull('last_reconciled_at')
                    ->orWhere('last_reconciled_at', '<', now()->subHour());
            });
    }

    /**
     * Scope: payments by provider.
     */
    public function scopeByProvider($query, string $provider)
    {
        return $query->where('provider', $provider);
    }

    /**
     * Scope: payments that may still have a remote checkout capable of settling.
     */
    public function scopeDeletionBlockingCheckout(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING)
            ->whereIn('provider', [self::PROVIDER_MIDTRANS, self::PROVIDER_XENDIT])
            ->where(function (Builder $query) {
                $query->where(function (Builder $query) {
                    $query->where('checkout_state', self::CHECKOUT_READY)
                        ->where('checkout_expires_at', '>', now());
                })->orWhere(function (Builder $query) {
                    $query->where('checkout_state', self::CHECKOUT_CREATING)
                        ->where('creation_lease_expires_at', '>', now());
                })->orWhere('checkout_state', self::CHECKOUT_UNKNOWN);
            });
    }

    /**
     * Check if payment is settled.
     */
    public function isSettled(): bool
    {
        return $this->status === self::STATUS_SETTLEMENT;
    }

    /**
     * Check if payment is pending.
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if checkout is active.
     */
    public function hasActiveCheckout(): bool
    {
        return $this->checkout_state === self::CHECKOUT_READY
            && $this->checkout_expires_at?->isFuture();
    }

    /**
     * Check if deleting the payable could orphan a remote checkout.
     */
    public function blocksPayableDeletion(): bool
    {
        if ($this->status !== self::STATUS_PENDING || ! $this->isOnlinePayment()) {
            return false;
        }

        if ($this->checkout_state === self::CHECKOUT_UNKNOWN) {
            return true;
        }

        if ($this->checkout_state === self::CHECKOUT_CREATING) {
            return $this->creation_lease_expires_at?->isFuture() ?? false;
        }

        return $this->hasActiveCheckout();
    }

    /**
     * Check if payment is from an online provider (not manual).
     */
    public function isOnlinePayment(): bool
    {
        return in_array($this->provider, [self::PROVIDER_MIDTRANS, self::PROVIDER_XENDIT]);
    }
}
