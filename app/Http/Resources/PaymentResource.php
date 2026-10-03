<?php

namespace App\Http\Resources;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Payment resource for public API responses.
 *
 * Excludes sensitive data like raw notifications, request snapshots,
 * and full PII. Use AdminPaymentResource for internal admin views.
 *
 * @mixin Payment
 */
class PaymentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'status' => $this->status,
            'provider' => $this->provider,
            
            // Checkout state (for UI feedback)
            'checkout_state' => $this->checkout_state,
            'checkout_url' => $this->when(
                $this->hasActiveCheckout(),
                $this->checkout_url
            ),
            'checkout_expires_at' => $this->when(
                $this->hasActiveCheckout(),
                $this->checkout_expires_at?->toISOString()
            ),
            
            // Payment timestamps
            'paid_at' => $this->paid_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
            
            // Relations
            'payable_type' => $this->payable_type,
            'payable_id' => $this->payable_id,
        ];
    }

    /**
     * Get additional data that should be returned with the resource array.
     *
     * @return array<string, mixed>
     */
    public function with(Request $request): array
    {
        return [
            'meta' => [
                'can_retry' => $this->canRetryPayment(),
                'is_settled' => $this->isSettled(),
                'is_pending' => $this->isPending(),
            ],
        ];
    }

    /**
     * Determine if payment can be retried.
     */
    private function canRetryPayment(): bool
    {
        if ($this->isSettled()) {
            return false;
        }

        if (in_array($this->status, [Payment::STATUS_REFUND])) {
            return false;
        }

        // Can retry if expired, failed, or canceled
        return in_array($this->status, [
            Payment::STATUS_PENDING,
            Payment::STATUS_EXPIRE,
            Payment::STATUS_CANCEL,
            Payment::STATUS_FAILURE,
        ]);
    }
}
