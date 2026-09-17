<?php

namespace App\Services\Midtrans;

use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin wrapper around Midtrans's Snap REST API — deliberately not the
 * official SDK, since this only needs one endpoint plus a signature check,
 * and building it on Http:: keeps it trivially fakeable in tests.
 */
class MidtransClient
{
    public function createSnapTransaction(Payment $payment): string
    {
        $payable = $payment->payable;

        if (! $payable instanceof Payable) {
            throw new RuntimeException("Payment {$payment->order_id} has no payable to charge for.");
        }

        $response = Http::withBasicAuth(config('services.midtrans.server_key'), '')
            ->acceptJson()
            ->connectTimeout(5)
            ->timeout(15)
            ->post($this->baseUrl().'/snap/v1/transactions', [
                'transaction_details' => [
                    'order_id' => $payment->order_id,
                    'gross_amount' => (int) $payment->amount,
                ],
                // Names the thing being bought on Midtrans's own payment page
                // and in the merchant dashboard — without it a payer only ever
                // sees an order id and a total.
                'item_details' => $payable->midtransItemDetails($payment),
                'customer_details' => $payable->midtransCustomerDetails(),
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Midtrans Snap transaction creation failed: '.$response->body());
        }

        return $response->json('token');
    }

    /**
     * Verifies a payment notification really came from Midtrans, per their
     * documented signature: sha512(order_id + status_code + gross_amount + server_key).
     */
    public static function isValidSignature(array $notification): bool
    {
        $orderId = $notification['order_id'] ?? '';
        $statusCode = $notification['status_code'] ?? '';
        $grossAmount = $notification['gross_amount'] ?? '';
        $signatureKey = $notification['signature_key'] ?? '';

        $expected = hash('sha512', $orderId.$statusCode.$grossAmount.config('services.midtrans.server_key'));

        return hash_equals($expected, $signatureKey);
    }

    /**
     * Actively pulls a transaction's current status from Midtrans — the same
     * shape as a webhook notification, but pulled on demand instead of
     * waiting for one to arrive. Used to reconcile a registration when the
     * notification URL was never configured (or a webhook was missed).
     */
    public function getStatus(string $orderId): array
    {
        $response = Http::withBasicAuth(config('services.midtrans.server_key'), '')
            ->acceptJson()
            ->connectTimeout(5)
            ->timeout(15)
            ->get($this->coreApiBaseUrl()."/v2/{$orderId}/status");

        if ($response->failed()) {
            throw new RuntimeException("Midtrans status check failed for order {$orderId}: ".$response->body());
        }

        return $response->json();
    }

    private function baseUrl(): string
    {
        return config('services.midtrans.is_production')
            ? 'https://app.midtrans.com'
            : 'https://app.sandbox.midtrans.com';
    }

    /**
     * The Core/Transaction API (status checks, etc.) lives on a different
     * domain than Snap's transaction-creation endpoint.
     */
    private function coreApiBaseUrl(): string
    {
        return config('services.midtrans.is_production')
            ? 'https://api.midtrans.com'
            : 'https://api.sandbox.midtrans.com';
    }
}
