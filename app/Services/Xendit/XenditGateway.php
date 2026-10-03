<?php

namespace App\Services\Xendit;

use App\Models\Payment;
use App\Services\Payments\CheckoutResult;
use App\Services\Payments\Payable;
use App\Services\Payments\PaymentGateway;
use App\Services\Payments\PaymentOutcome;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Xendit Payment Sessions gateway implementation.
 *
 * Creates hosted payment links, retrieves session status, and cancels sessions
 * through Xendit's Payment Sessions API (PAY mode with PAYMENT_LINK).
 */
class XenditGateway implements PaymentGateway
{
    public function __construct(
        private readonly XenditClient $client,
        private readonly XenditStatusMapper $mapper,
    ) {}

    public function createCheckout(
        Payment $payment,
        Payable $payable,
        string $successUrl,
        string $failureUrl
    ): CheckoutResult {
        try {
            $sessionData = $this->buildSessionRequest($payment, $payable, $successUrl, $failureUrl);
            
            $response = $this->client->createSession($sessionData);

            return $this->mapSessionToCheckoutResult($response);
        } catch (RuntimeException $e) {
            Log::error('[XenditGateway] Checkout creation failed', [
                'payment_id' => $payment->id,
                'order_id' => $payment->order_id,
                'error' => $e->getMessage(),
            ]);

            // Check if it's a duplicate reference error
            if (str_contains($e->getMessage(), 'duplicate') || str_contains($e->getMessage(), 'already exists')) {
                return CheckoutResult::error(
                    message: 'A payment session with this reference already exists.',
                    code: 'duplicate_reference',
                    canRetry: false,
                );
            }

            return CheckoutResult::error(
                message: 'Failed to create payment session. Please try again.',
                code: 'xendit_error',
                canRetry: true,
            );
        }
    }

    public function retrieveStatus(Payment $payment): PaymentOutcome
    {
        if (!$payment->provider_session_id) {
            throw new RuntimeException("Payment {$payment->order_id} has no Xendit session ID");
        }

        try {
            $session = $this->client->retrieveSession($payment->provider_session_id);
            
            return $this->mapper->mapSessionToOutcome($session);
        } catch (RuntimeException $e) {
            Log::error('[XenditGateway] Status retrieval failed', [
                'payment_id' => $payment->id,
                'session_id' => $payment->provider_session_id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    public function cancelCheckout(Payment $payment): PaymentOutcome
    {
        if (!$payment->provider_session_id) {
            throw new RuntimeException("Payment {$payment->order_id} has no Xendit session ID");
        }

        try {
            $session = $this->client->cancelSession($payment->provider_session_id);
            
            return $this->mapper->mapSessionToOutcome($session);
        } catch (RuntimeException $e) {
            Log::error('[XenditGateway] Session cancellation failed', [
                'payment_id' => $payment->id,
                'session_id' => $payment->provider_session_id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    public function getProvider(): string
    {
        return 'xendit';
    }

    /**
     * Build the Xendit Payment Session creation request.
     */
    private function buildSessionRequest(
        Payment $payment,
        Payable $payable,
        string $successUrl,
        string $failureUrl
    ): array {
        $items = $this->formatItems($payable->getPaymentItems($payment));
        $customer = $this->formatCustomer($payable->getPaymentCustomer());
        $amount = $payable->getPaymentAmount();

        // Validate total matches items
        $itemsTotal = array_sum(array_map(
            fn($item) => $item['net_unit_amount'] * $item['quantity'],
            $items
        ));

        if ($itemsTotal !== $amount) {
            throw new RuntimeException(
                "Amount mismatch: total {$amount} does not match items sum {$itemsTotal}"
            );
        }

        // Calculate session expiry based on remaining reservation time
        $expiresAt = $this->calculateSessionExpiry();

        return [
            'reference_id' => $payment->order_id,
            'session_type' => 'PAY',
            'mode' => 'PAYMENT_LINK',
            'capture_method' => 'AUTOMATIC',
            'amount' => $amount,
            'currency' => config('services.xendit.currency', 'IDR'),
            'country' => config('services.xendit.country', 'ID'),
            'expires_at' => $expiresAt->format('c'), // ISO 8601
            'customer' => $customer,
            'items' => $items,
            'success_return_url' => $successUrl,
            'failure_return_url' => $failureUrl,
            'metadata' => [
                'payment_id' => $payment->id,
                'description' => $payable->getPaymentDescription(),
            ],
        ];
    }

    /**
     * Format items for Xendit API.
     */
    private function formatItems(array $items): array
    {
        return array_map(function ($item, $index) {
            return [
                'reference_id' => $item['reference_id'] ?? "item-{$index}",
                'name' => $item['name'],
                'type' => 'REGISTRATION_FEE', // Could be made dynamic per item type
                'category' => 'EVENT',
                'net_unit_amount' => (int) $item['unit_amount'],
                'quantity' => (int) $item['quantity'],
            ];
        }, $items, array_keys($items));
    }

    /**
     * Format customer for Xendit API.
     */
    private function formatCustomer(array $customer): array
    {
        $formatted = [
            'email' => $customer['email'],
            'given_names' => $customer['given_names'],
        ];

        // Add optional surname if provided
        if (!empty($customer['surname'])) {
            $formatted['surname'] = $customer['surname'];
        }

        // Add mobile number if provided and format to E.164
        if (!empty($customer['mobile_number'])) {
            $formatted['mobile_number'] = $this->formatPhoneNumber($customer['mobile_number']);
        }

        return $formatted;
    }

    /**
     * Format phone number to E.164 format.
     * Handles Indonesian numbers starting with 0 or 62.
     */
    private function formatPhoneNumber(string $phone): string
    {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // Handle Indonesian numbers
        if (str_starts_with($phone, '0')) {
            // Replace leading 0 with +62
            return '+62' . substr($phone, 1);
        } elseif (str_starts_with($phone, '62')) {
            // Add + prefix
            return '+' . $phone;
        } elseif (strlen($phone) >= 10) {
            // Assume Indonesian number without prefix
            return '+62' . $phone;
        }

        // Return as-is if we can't determine format (will fail validation at Xendit)
        return '+' . $phone;
    }

    /**
     * Calculate when the session should expire.
     */
    private function calculateSessionExpiry(): \DateTimeImmutable
    {
        $sessionTtlMinutes = config('payments.session_ttl_minutes', 30);
        
        return now()->addMinutes($sessionTtlMinutes)->toDateTimeImmutable();
    }

    /**
     * Map Xendit session response to CheckoutResult.
     */
    private function mapSessionToCheckoutResult(array $session): CheckoutResult
    {
        $sessionId = $session['payment_session_id'] ?? null;
        $checkoutUrl = $session['payment_link_url'] ?? null;
        $expiresAt = isset($session['expires_at']) 
            ? new \DateTimeImmutable($session['expires_at']) 
            : null;

        if (!$sessionId || !$checkoutUrl) {
            throw new RuntimeException('Xendit session missing required fields');
        }

        // Validate checkout URL is HTTPS and from Xendit
        if (!$this->isValidCheckoutUrl($checkoutUrl)) {
            throw new RuntimeException('Invalid checkout URL from Xendit');
        }

        return CheckoutResult::success(
            checkoutUrl: $checkoutUrl,
            sessionId: $sessionId,
            expiresAt: $expiresAt ?? now()->addMinutes(30),
        );
    }

    /**
     * Validate that checkout URL is from an approved Xendit domain.
     */
    private function isValidCheckoutUrl(string $url): bool
    {
        $parsed = parse_url($url);

        if (!$parsed || ($parsed['scheme'] ?? '') !== 'https') {
            return false;
        }

        $host = $parsed['host'] ?? '';

        // Allow Xendit checkout domains
        $allowedHosts = [
            'checkout.xendit.co',
            'checkout-staging.xendit.co',
            'checkout-sandbox.xendit.co',
        ];

        return in_array($host, $allowedHosts);
    }
}
