<?php

namespace App\Services\Xendit;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * HTTP client for Xendit Payment Sessions API.
 *
 * Handles authentication, request formation, and response parsing for
 * Xendit's REST API. Built on Laravel's Http client for easy testing.
 */
class XenditClient
{
    private ?string $secretKey;

    private string $baseUrl;

    private int $connectTimeout;

    private int $timeout;

    public function __construct()
    {
        $this->secretKey = config('services.xendit.secret_key');
        $this->baseUrl = config('services.xendit.api_base_url', 'https://api.xendit.co');
        $this->connectTimeout = config('services.xendit.connect_timeout_seconds', 5);
        $this->timeout = config('services.xendit.timeout_seconds', 15);

    }

    /**
     * Create a new payment session.
     *
     * @param  array  $data  Session creation payload
     * @return array Session response with payment_session_id, payment_link_url, etc.
     *
     * @throws RuntimeException on API errors
     */
    public function createSession(array $data): array
    {
        Log::info('[Xendit] Creating payment session', [
            'reference_id' => $data['reference_id'] ?? null,
            'amount' => $data['amount'] ?? null,
        ]);

        $response = $this->request('POST', '/sessions', $data);

        if ($response->failed()) {
            $error = $this->extractError($response);
            Log::error('[Xendit] Session creation failed', [
                'reference_id' => $data['reference_id'] ?? null,
                'status' => $response->status(),
                'error' => $error,
            ]);
            throw new RuntimeException("Xendit session creation failed: {$error}");
        }

        $session = $response->json();

        Log::info('[Xendit] Session created successfully', [
            'payment_session_id' => $session['payment_session_id'] ?? null,
            'reference_id' => $data['reference_id'] ?? null,
        ]);

        return $session;
    }

    /**
     * Retrieve a payment session by ID.
     *
     * @param  string  $sessionId  Payment session ID (ps-...)
     * @return array Session data with current status
     *
     * @throws RuntimeException on API errors
     */
    public function retrieveSession(string $sessionId): array
    {
        Log::info('[Xendit] Retrieving session', ['session_id' => $sessionId]);

        $response = $this->request('GET', "/sessions/{$sessionId}");

        if ($response->failed()) {
            $error = $this->extractError($response);
            Log::error('[Xendit] Session retrieval failed', [
                'session_id' => $sessionId,
                'status' => $response->status(),
                'error' => $error,
            ]);
            throw new RuntimeException("Xendit session retrieval failed: {$error}");
        }

        return $response->json();
    }

    /**
     * Cancel a payment session.
     *
     * @param  string  $sessionId  Payment session ID (ps-...)
     * @return array Canceled session data
     *
     * @throws RuntimeException on API errors
     */
    public function cancelSession(string $sessionId): array
    {
        Log::info('[Xendit] Canceling session', ['session_id' => $sessionId]);

        $response = $this->request('POST', "/sessions/{$sessionId}/cancel");

        if ($response->failed()) {
            $error = $this->extractError($response);
            Log::error('[Xendit] Session cancellation failed', [
                'session_id' => $sessionId,
                'status' => $response->status(),
                'error' => $error,
            ]);
            throw new RuntimeException("Xendit session cancellation failed: {$error}");
        }

        return $response->json();
    }

    /**
     * Make an HTTP request to Xendit API.
     */
    private function request(string $method, string $path, ?array $data = null)
    {
        if (empty($this->secretKey)) {
            throw new RuntimeException('Xendit secret key is not configured');
        }

        $url = $this->baseUrl.$path;

        try {
            return Http::withBasicAuth($this->secretKey, '')
                ->acceptJson()
                ->contentType('application/json')
                ->connectTimeout($this->connectTimeout)
                ->timeout($this->timeout)
                ->send($method, $url, $data ? ['json' => $data] : []);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('Xendit connection failed: '.$exception->getMessage(), previous: $exception);
        }
    }

    /**
     * Extract error message from response.
     */
    private function extractError($response): string
    {
        $body = $response->json();

        if (isset($body['error_code']) && isset($body['message'])) {
            return "{$body['error_code']}: {$body['message']}";
        }

        if (isset($body['message'])) {
            return $body['message'];
        }

        return $response->body() ?: "HTTP {$response->status()}";
    }
}
