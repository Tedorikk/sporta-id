# Sprint 2 Completion Summary

**Sprint:** 2 - Xendit Client & Checkout Service  
**Status:** ✅ Complete  
**Date:** 2026-10-03

## Overview

Sprint 2 implements the complete Xendit Payment Sessions integration with checkout creation, session management, and safe concurrency control. The Xendit gateway is now fully functional and can create payment sessions, though it's not yet the default provider in production flows.

## What Was Built

### 1. Xendit HTTP Client (`XenditClient.php`)
- **Session creation** - POST /sessions with Payment Sessions API
- **Session retrieval** - GET /sessions/{id} for status checks
- **Session cancellation** - POST /sessions/{id}/cancel
- **Authentication** - Basic auth with secret key
- **Error handling** - Extracts and logs Xendit error codes and messages
- **Timeouts** - Configurable connect (5s) and read (15s) timeouts
- **Logging** - Structured logging for all operations

### 2. Xendit Status Mapper (`XenditStatusMapper.php`)
- **Session status mapping** - Maps ACTIVE/COMPLETED/EXPIRED/CANCELED to application states
- **Webhook event mapping** - Handles payment_session.completed and payment_session.expired
- **Validation** - Validates business_id, currency (IDR), country (ID), session_type (PAY)
- **PaymentOutcome generation** - Converts Xendit responses to normalized outcomes
- **Settlement extraction** - Extracts payment IDs, amounts, and timestamps

### 3. Xendit Gateway (`XenditGateway.php`)
- **Implements PaymentGateway interface** - Full compatibility with payment abstraction
- **Session request builder** - Formats items, customer, amounts from Payable
- **E.164 phone formatting** - Handles Indonesian numbers (0xx → +62xx)
- **Item formatting** - Maps neutral items to Xendit's item schema
- **URL validation** - Ensures checkout URLs are HTTPS from approved Xendit domains
- **Error mapping** - Translates exceptions to CheckoutResult errors
- **Amount validation** - Verifies item totals match payment amounts

### 4. Payment Checkout Service (`PaymentCheckoutService.php`)
- **Checkout orchestration** - Complete flow from eligibility to URL generation
- **Concurrency control** - Creation leases prevent duplicate session creation
- **Active session reuse** - Returns existing URL if still valid
- **Transaction safety** - Locks payable during checkout lookup/creation
- **Remote call isolation** - Gateway calls outside DB transaction
- **Unknown outcome handling** - Marks interrupted creations for manual reconciliation
- **Immutable snapshots** - Stores frozen request data for audit
- **Order ID generation** - Unique ORD-{timestamp}-{random} format

### 5. Payment Resources
- **`PaymentResource.php`** - Public API projection
  - Excludes raw_notification, request_snapshot, PII
  - Shows checkout URL only if active
  - Includes meta flags: can_retry, is_settled, is_pending
- **`AdminPaymentResource.php`** - Internal admin view
  - Full provider metadata and session IDs
  - Reconciliation timestamps
  - Fulfillment state and review reasons
  - Manual verification details

### 6. Service Provider Integration
- **XenditGateway registration** - Both Midtrans and Xendit now available
- **PaymentCheckoutService singleton** - Registered for dependency injection
- **Gateway verification** - Confirmed both providers resolve correctly

### 7. Comprehensive Tests

#### `XenditClientTest.php` - 6 test cases
- ✅ Session creation with HTTP fake
- ✅ Session retrieval
- ✅ Session cancellation
- ✅ API error handling (400, 500)
- ✅ Network timeout handling
- ✅ Basic auth header verification

#### `PaymentCheckoutTest.php` - 8 test cases
- ✅ New checkout creation via Xendit
- ✅ Active checkout reuse (no duplicate HTTP calls)
- ✅ New attempt after expiry
- ✅ "Preparing" response for active creation lease
- ✅ Checkout unavailable when disabled
- ✅ Immutable snapshot storage
- ✅ Unique order ID generation
- ✅ Proper payment state transitions

## Key Implementation Details

### Phone Number Formatting
Indonesian mobile numbers are automatically converted to E.164:
- `0812345678` → `+62812345678`
- `62812345678` → `+62812345678`

### Checkout URL Security
Only approved Xendit domains are accepted:
- `checkout.xendit.co`
- `checkout-staging.xendit.co`
- `checkout-sandbox.xendit.co`

### Concurrency Protection
```
Request 1: Locks payable → Creates payment → Acquires lease → Calls Xendit
Request 2: Locks payable → Finds creating payment with lease → Returns "preparing"
Request 3: After lease expires → Creates new attempt
```

### Unknown Outcome Handling
If Xendit call times out after sending:
1. Mark payment as `CHECKOUT_UNKNOWN`
2. Don't retry automatically (could create duplicate sessions)
3. Require manual reconciliation or explicit retry

## Integration Points

### How to Use (Example)
```php
$service = app(PaymentCheckoutService::class);

$result = $service->getOrCreateCheckout(
    payable: $registration,
    successUrl: route('registrations.payment.success', $registration),
    failureUrl: route('registrations.payment.cancel', $registration)
);

if ($result->success) {
    return redirect($result->checkoutUrl);
} else {
    return back()->withErrors(['payment' => $result->error]);
}
```

### Provider Selection
Default provider is still `midtrans` in `config/payments.php`:
```php
'gateway' => env('PAYMENT_GATEWAY', 'midtrans'),
```

To switch to Xendit:
```bash
PAYMENT_GATEWAY=xendit
```

## Files Created/Modified

### Created (8 files)
```
app/Services/Xendit/XenditClient.php
app/Services/Xendit/XenditStatusMapper.php
app/Services/Xendit/XenditGateway.php
app/Services/Payments/PaymentCheckoutService.php
app/Http/Resources/PaymentResource.php
app/Http/Resources/AdminPaymentResource.php
tests/Feature/XenditClientTest.php
tests/Feature/PaymentCheckoutTest.php
```

### Modified (1 file)
```
app/Providers/AppServiceProvider.php (registered Xendit gateway and checkout service)
```

## Verification

✅ **Gateway Registration**: Both midtrans and xendit available  
✅ **Configuration**: All Xendit settings loaded correctly  
✅ **HTTP Client**: Creates proper request format with auth  
✅ **Status Mapper**: Validates sessions and maps to outcomes  
✅ **Checkout Service**: Creates sessions, reuses active, handles concurrency  
✅ **Tests**: 14 test cases passing (6 + 8)  

## What's NOT Done Yet

❌ **Webhook handling** - Sprint 3  
❌ **Reconciliation** - Sprint 3  
❌ **Side effects (emails, quota)** - Sprint 3  
❌ **Controller integration** - Sprint 4  
❌ **Frontend updates** - Sprint 4  
❌ **Production cutover** - Sprint 5  

## Production Readiness

**Current state**: Xendit integration is complete but NOT active in production flows

- Xendit gateway is registered but `PAYMENT_GATEWAY=midtrans` by default
- Checkout service works but no controllers use it yet
- Webhook endpoint not created yet (Sprint 3)
- No payment reconciliation for Xendit yet (Sprint 3)

**Safe to deploy**: Yes, with no impact to existing flows. Xendit code is dormant until:
1. Controllers are updated to use PaymentCheckoutService (Sprint 4)
2. Webhook endpoint is deployed (Sprint 3)
3. PAYMENT_GATEWAY is changed to 'xendit' (Sprint 5)

## Next: Sprint 3

Sprint 3 will complete the payment lifecycle with:
- XenditWebhookController - Authenticate and persist webhook receipts
- ProcessPaymentWebhook job - Queue-based webhook processing
- PaymentReconciler - Apply verified outcomes to payments/payables
- ProcessPaymentEffect job - Idempotent side effects
- Recovery commands - Reconcile pending payments, replay webhooks/effects
- RefundRecord model and migration

After Sprint 3, the complete flow will work: checkout → payment → webhook → reconciliation → fulfillment.
