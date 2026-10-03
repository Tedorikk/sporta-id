<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Payment Gateway Selection
    |--------------------------------------------------------------------------
    |
    | The active payment gateway for new online payment attempts.
    | Supported: 'midtrans', 'xendit'
    |
    | This only affects NEW payment creation. Existing payments continue
    | using their stored provider value.
    |
    */

    'gateway' => env('PAYMENT_GATEWAY', 'midtrans'),

    /*
    |--------------------------------------------------------------------------
    | Payment System Feature Flags
    |--------------------------------------------------------------------------
    */

    'checkout_enabled' => env('PAYMENT_CHECKOUT_ENABLED', true),
    'legacy_midtrans_enabled' => env('PAYMENT_LEGACY_MIDTRANS_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Payment Session Time-to-Live
    |--------------------------------------------------------------------------
    |
    | Session TTL: Maximum duration for a payment checkout session at the
    | provider (in minutes). Capped by remaining reservation time.
    |
    | Reservation TTL: How long a registration/order reserves quota while
    | awaiting payment (in minutes).
    |
    | Grace period: Additional time after reservation deadline to reconcile
    | in-flight payments before releasing quota (in minutes).
    |
    */

    'session_ttl_minutes' => (int) env('PAYMENT_SESSION_TTL_MINUTES', 30),
    'reservation_ttl_minutes' => (int) env('PAYMENT_RESERVATION_TTL_MINUTES', 1440), // 24 hours
    'reconciliation_grace_minutes' => (int) env('PAYMENT_RECONCILIATION_GRACE_MINUTES', 10),

    /*
    |--------------------------------------------------------------------------
    | Queue Configuration
    |--------------------------------------------------------------------------
    |
    | Queue name for webhook processing and payment effect jobs.
    |
    */

    'webhook_queue' => env('PAYMENT_WEBHOOK_QUEUE', 'payments'),

    /*
    |--------------------------------------------------------------------------
    | Provider Allowlist
    |--------------------------------------------------------------------------
    |
    | Valid payment provider identifiers. Used for validation and routing.
    |
    */

    'providers' => [
        'midtrans',
        'xendit',
        'manual_transfer',
    ],

    /*
    |--------------------------------------------------------------------------
    | Currency and Country
    |--------------------------------------------------------------------------
    |
    | Default currency and country for payment transactions.
    |
    */

    'currency' => env('PAYMENT_CURRENCY', 'IDR'),
    'country' => env('PAYMENT_COUNTRY', 'ID'),

];
