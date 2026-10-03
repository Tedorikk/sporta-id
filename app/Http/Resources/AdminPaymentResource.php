<?php

namespace App\Http\Resources;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin payment resource with additional internal fields.
 *
 * Includes provider details, reconciliation status, and fulfillment state
 * for admin/operator views. Still excludes raw sensitive data.
 *
 * @mixin Payment
 */
class AdminPaymentResource extends JsonResource
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
            
            // Provider details
            'provider' => $this->provider,
            'provider_mode' => $this->provider_mode,
            'provider_session_id' => $this->provider_session_id,
            'provider_payment_id' => $this->provider_payment_id,
            'provider_status' => $this->provider_status,
            
            // Checkout state
            'checkout_state' => $this->checkout_state,
            'checkout_url' => $this->checkout_url,
            'checkout_expires_at' => $this->checkout_expires_at?->toISOString(),
            
            // Fulfillment state
            'fulfillment_state' => $this->fulfillment_state,
            'review_reason' => $this->review_reason,
            
            // Reconciliation tracking
            'provider_updated_at' => $this->provider_updated_at?->toISOString(),
            'last_reconciled_at' => $this->last_reconciled_at?->toISOString(),
            
            // Manual payment fields
            'proof_path' => $this->proof_path,
            'payer_account_name' => $this->payer_account_name,
            'verified_by' => $this->verified_by,
            'verified_at' => $this->verified_at?->toISOString(),
            
            // Timestamps
            'paid_at' => $this->paid_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
            
            // Relations
            'payable_type' => $this->payable_type,
            'payable_id' => $this->payable_id,
            'verifier' => $this->whenLoaded('verifier', fn() => [
                'id' => $this->verifier->id,
                'name' => $this->verifier->name,
            ]),
        ];
    }
}
