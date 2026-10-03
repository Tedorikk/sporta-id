# Payment Gateway Test Matrix

**Last updated:** 2026-10-04<br>
**Sprint 0 verification status:** ✅ Completed 2026-10-02

## Current Local Verification Snapshot

- Focused payment/checkout/Xendit/legacy/manual/status/controller suites: ✅ 106 tests, 455 assertions passing on 2026-10-03.
- TypeScript type-check, targeted ESLint/Prettier, Pint, `git diff --check`, and production Vite build: ✅ passing on 2026-10-03.
- Full Pest suite: ⚠️ not yet verified; the previous full local run exceeded the five-minute harness timeout without a failure report.
- 2026-10-04 isolation run: `tests/Unit` passes; `tests/Feature` completes with five failures/errors isolated to existing category backfill migration tests, outside the payment gateway scope.
- Sprint 3 dedicated webhook/reconciliation/effect-recovery feature tests: ✅ 16 tests, 51 assertions passing on 2026-10-04; included in the expanded focused 125-test payment lifecycle run.
- Sprint 4 browser coverage/manual browser evidence: ⚠️ still required before Sprint 4 exit.

## Xendit Test Mode Verification (Sprint 0)

### Account Setup
- [x] Test mode API key obtained with Money-in permissions
- [x] Webhook verification token obtained
- [x] Business/account ID recorded
- [x] Payment channels enabled: QRIS, Virtual Accounts (BCA, BNI, Mandiri), E-wallets (OVO, DANA, LinkAja), Cards

### API Contract Verification

| Operation | Method | Endpoint | Status | Notes |
|-----------|--------|----------|--------|-------|
| Create Payment Session | POST | `/sessions` | ✅ | Returns `payment_session_id`, `payment_link_url`, `status=ACTIVE` |
| Retrieve Session | GET | `/sessions/{id}` | ✅ | Returns current session state |
| Cancel Session | POST | `/sessions/{id}/cancel` | ✅ | Transitions to `CANCELED` |
| Duplicate Reference | POST | `/sessions` | ⚠️ | Returns 400 with duplicate reference error (no idempotency reuse) |

### Payment Session Creation Tests

```json
{
  "reference_id": "test-sporta-001",
  "session_type": "PAY",
  "mode": "PAYMENT_LINK",
  "capture_method": "AUTOMATIC",
  "amount": 150000,
  "currency": "IDR",
  "country": "ID",
  "expires_at": "2026-10-03T10:00:00Z",
  "customer": {
    "email": "test@example.com",
    "mobile_number": "+628123456789",
    "given_names": "Test User"
  },
  "items": [{
    "reference_id": "reg-cat-001",
    "name": "Marathon Registration",
    "type": "REGISTRATION_FEE",
    "category": "SPORT_EVENT",
    "net_unit_amount": 150000,
    "quantity": 1
  }],
  "success_return_url": "https://sporta.test/registrations/test-001/status",
  "failure_return_url": "https://sporta.test/registrations/test-001/status"
}
```

**Response fields verified:**
- ✅ `payment_session_id` (format: `ps-...`)
- ✅ `payment_link_url` (HTTPS, xendit.co domain)
- ✅ `status` (ACTIVE)
- ✅ `expires_at` (ISO 8601)
- ✅ `business_id` (matches account)
- ⚠️ `payment_id` and `payment_request_id` may be null initially

### Webhook Events Verification

| Event Type | Delivery | Validation | Notes |
|------------|----------|------------|-------|
| `payment_session.completed` | ✅ | Token verified via `x-callback-token` | Contains nested session data |
| `payment_session.expired` | ✅ | Token verified | Session reached expiry without payment |

**Webhook payload structure:**
```json
{
  "event": "payment_session.completed",
  "business_id": "...",
  "created": "2026-10-02T15:30:00.000Z",
  "data": {
    "payment_session_id": "ps-...",
    "reference_id": "test-sporta-001",
    "status": "COMPLETED",
    "amount": 150000,
    "currency": "IDR",
    "country": "ID",
    "session_type": "PAY",
    "payment_id": "pmt-...",
    "payment_request_id": "pr-..."
  }
}
```

### Key Findings for Implementation

1. **No built-in idempotency:** Duplicate `reference_id` returns 400 error, does not return existing session. Must implement local deduplication.
2. **Session expiry:** Default 30 minutes if not specified; can be extended up to 24 hours.
3. **Payment IDs:** May not be available immediately at session creation; captured at completion.
4. **Amount format:** Integer IDR, no decimal places, no multiplication by 100.
5. **Customer fields:** `given_names` required (single name acceptable), `mobile_number` must be E.164 format.
6. **Reference length:** Maximum 64 characters for `reference_id`.

## Sprint 1+ Test Coverage Plan

### Unit Tests
- [ ] XenditClient HTTP request formation
- [ ] XenditStatusMapper event/status mapping
- [ ] PaymentGatewayManager provider resolution
- [ ] CheckoutResult/PaymentOutcome data structures
- [ ] Payment model immutability guards

### Feature Tests
- [ ] Payment creation with Xendit provider
- [ ] Concurrent checkout attempt deduplication
- [ ] Webhook authentication and validation
- [ ] Payment reconciliation with various states
- [ ] Provider backfill accuracy
- [ ] Payment method normalization

### Integration Tests
- [ ] End-to-end registration with Xendit (HTTP faked)
- [ ] Group registration checkout
- [ ] Vote payment flow
- [ ] Webhook processing with queue
- [ ] Effect replay after failure
- [ ] Expiry with reconciliation

### Browser Tests (Sprint 4)
- [ ] Hosted checkout redirect
- [ ] Return URL handling (success/cancel)
- [ ] Multiple payment attempt scenarios
- [ ] Error state presentation
- [ ] Legacy Midtrans Snap coexistence flow
- [ ] Forged return/success URL does not mark payment paid without trusted server confirmation

## Test Data Fixtures

### Valid Scenarios
- Individual registration: IDR 150,000
- Group registration (3 participants): IDR 450,000
- Vote payment: IDR 5,000
- Manual transfer registration
- Mixed provider history

### Edge Cases
- Session creation timeout (unknown state)
- Late payment after reservation expiry
- Duplicate webhook delivery
- Payment during local expiry window
- Excess payment (two sessions both paid)
- Mismatched amount callback
- Unknown business_id in webhook

### Error Scenarios
- Invalid webhook token
- Malformed webhook payload
- Network timeout on retrieval
- Provider 5xx error
- Canceled then completed delivery order
- Settled then expired replay

## Manual Verification Checklist (Pre-Production)

- [ ] Test mode end-to-end payment with real Xendit hosted page
- [ ] All enabled payment methods accessible
- [ ] Webhook delivery to staging environment
- [ ] Email confirmation after payment
- [ ] Admin dashboard displays provider correctly
- [ ] Historical Midtrans data preserved
- [ ] Refund recording UI shows provider
- [ ] Recovery commands work for both providers

## Production Smoke Tests (Post-Deployment)

- [ ] Configuration loaded (mode, keys, business ID)
- [ ] New registration creates Xendit session (monitor logs)
- [ ] Webhook endpoint returns 403 for invalid token
- [ ] Queue workers consuming `payments` queue
- [ ] Scheduler running reconciliation commands
- [ ] Metrics/alerts configured for payment failures
- [ ] Existing Midtrans payments still retrievable

## Rollback Criteria

Revert to Midtrans-only if:
- Payment session creation failure rate >5%
- Webhook authentication failures
- Settlement reconciliation errors
- Duplicate charge incidents
- Data loss or corruption detected

During rollback:
1. Set `PAYMENT_GATEWAY=midtrans`
2. Verify no active Xendit sessions abandoned
3. Continue reconciliation for in-flight Xendit payments
4. Do not disable webhook endpoint until all resolved
