<?php

namespace App\Http\Controllers;

use App\Http\Requests\XenditWebhookRequest;
use App\Jobs\ProcessPaymentWebhook;
use App\Models\PaymentWebhookReceipt;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * Handles incoming Xendit webhook notifications.
 *
 * Authenticates requests, persists receipts for durability, and queues
 * processing jobs. Returns 200 quickly to avoid Xendit retries.
 */
class XenditWebhookController extends Controller
{
    /**
     * Handle incoming Xendit webhook.
     */
    public function handle(XenditWebhookRequest $request): JsonResponse
    {
        // Authenticate webhook token
        if (!$this->authenticateWebhook($request)) {
            Log::warning('[XenditWebhook] Authentication failed', [
                'ip' => $request->ip(),
                'event' => $request->input('event'),
            ]);

            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Check if event type is supported
        if (!$request->isSupportedEvent()) {
            Log::info('[XenditWebhook] Unsupported event type', [
                'event' => $request->getEventType(),
                'reference_id' => $request->getReferenceId(),
            ]);

            // Acknowledge but don't process
            return response()->json(['message' => 'Event acknowledged but not processed'], 200);
        }

        try {
            // Persist receipt for durability
            $receipt = $this->persistReceipt($request);

            // Queue processing job
            ProcessPaymentWebhook::dispatch($receipt)
                ->onQueue(config('payments.webhook_queue', 'payments'));

            Log::info('[XenditWebhook] Receipt persisted and queued', [
                'receipt_id' => $receipt->id,
                'event' => $request->getEventType(),
                'session_id' => $request->getSessionId(),
                'reference_id' => $request->getReferenceId(),
            ]);

            return response()->json(['message' => 'Webhook received'], 200);
        } catch (\Exception $e) {
            Log::error('[XenditWebhook] Failed to persist receipt', [
                'event' => $request->getEventType(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Return 500 so Xendit will retry
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    /**
     * Authenticate webhook via x-callback-token header.
     */
    private function authenticateWebhook(XenditWebhookRequest $request): bool
    {
        $expectedToken = config('services.xendit.webhook_token');

        if (empty($expectedToken)) {
            Log::error('[XenditWebhook] Webhook token not configured');
            return false;
        }

        $receivedToken = $request->header('x-callback-token');

        if (empty($receivedToken)) {
            return false;
        }

        // Use constant-time comparison to prevent timing attacks
        return hash_equals($expectedToken, $receivedToken);
    }

    /**
     * Persist webhook receipt to database.
     */
    private function persistReceipt(XenditWebhookRequest $request): PaymentWebhookReceipt
    {
        $payload = $request->validated();
        $data = $payload['data'];

        // Generate deduplication key
        $dedupeKey = $this->generateDedupeKey(
            provider: 'xendit',
            businessId: $request->getBusinessId(),
            sessionId: $request->getSessionId(),
            event: $request->getEventType(),
            status: $data['status'] ?? null
        );

        // Generate payload digest for conflict detection
        $payloadDigest = hash('sha256', json_encode($this->sanitizePayload($payload)));

        // Check for existing receipt
        $existing = PaymentWebhookReceipt::where('dedupe_key', $dedupeKey)->first();

        if ($existing) {
            // Check if payload is identical
            if ($existing->payload_digest === $payloadDigest) {
                Log::info('[XenditWebhook] Duplicate delivery detected', [
                    'dedupe_key' => $dedupeKey,
                    'receipt_id' => $existing->id,
                ]);

                return $existing;
            }

            // Payload differs - potential conflict
            Log::warning('[XenditWebhook] Conflicting duplicate detected', [
                'dedupe_key' => $dedupeKey,
                'existing_receipt_id' => $existing->id,
                'existing_digest' => $existing->payload_digest,
                'new_digest' => $payloadDigest,
            ]);
        }

        // Create new receipt
        return PaymentWebhookReceipt::create([
            'provider' => 'xendit',
            'provider_account_id' => $request->getBusinessId(),
            'provider_mode' => config('services.xendit.mode', 'test'),
            'event_type' => $request->getEventType(),
            'session_id' => $request->getSessionId(),
            'reference_id' => $request->getReferenceId(),
            'dedupe_key' => $dedupeKey,
            'payload_digest' => $payloadDigest,
            'sanitized_payload' => $this->sanitizePayload($payload),
            'processing_state' => 'received',
            'received_at' => now(),
        ]);
    }

    /**
     * Generate semantic deduplication key.
     */
    private function generateDedupeKey(
        string $provider,
        string $businessId,
        ?string $sessionId,
        string $event,
        ?string $status
    ): string {
        return implode('|', array_filter([
            $provider,
            $businessId,
            $sessionId,
            $event,
            $status,
        ]));
    }

    /**
     * Sanitize payload by removing or minimizing sensitive data.
     */
    private function sanitizePayload(array $payload): array
    {
        // For now, keep the full payload for debugging
        // In production, consider removing PII fields if present
        
        // Remove any sensitive customer data if present
        if (isset($payload['data']['customer'])) {
            $customer = &$payload['data']['customer'];
            
            // Keep only essential fields, mask email/phone
            if (isset($customer['email'])) {
                $customer['email'] = $this->maskEmail($customer['email']);
            }
            
            if (isset($customer['mobile_number'])) {
                $customer['mobile_number'] = $this->maskPhone($customer['mobile_number']);
            }
        }

        return $payload;
    }

    /**
     * Mask email address for privacy.
     */
    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return '***@***.***';
        }

        $local = $parts[0];
        $domain = $parts[1];

        if (strlen($local) > 3) {
            $local = substr($local, 0, 2) . '***' . substr($local, -1);
        } else {
            $local = '***';
        }

        return $local . '@' . $domain;
    }

    /**
     * Mask phone number for privacy.
     */
    private function maskPhone(string $phone): string
    {
        if (strlen($phone) > 6) {
            return substr($phone, 0, 3) . '****' . substr($phone, -2);
        }

        return '****';
    }
}
