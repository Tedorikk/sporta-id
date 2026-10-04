# Midtrans to Xendit Migration Checklist

**Migration started:** 2026-10-02<br>
**Target completion:** TBD<br>
**Current sprint:** Sprint 4 (in progress)
**Last updated:** 2026-10-04

## Sprint 0: Foundation & Verification ✅

- [x] Migration plan documented (`plan.md`)
- [x] Xendit test account configured
- [x] Test mode API key obtained
- [x] Webhook verification token obtained
- [x] Business/account ID recorded
- [x] Payment Sessions API contract verified
- [x] Test mode payments executed successfully
- [x] Webhook delivery confirmed
- [x] Duplicate reference behavior verified
- [x] Session cancellation tested
- [x] Test matrix documented
- [x] Product selection validated (Payment Sessions confirmed)
- [x] Account channel availability verified (QRIS, VA, e-wallets, cards)

**Completed:** 2026-10-02

## Sprint 1: Contracts, Configuration & Foundation ✅

### Configuration
- [x] Create `config/payments.php`
  - [x] Provider selection (`PAYMENT_GATEWAY`)
  - [x] Feature flags (checkout enabled, legacy enabled)
  - [x] TTL settings (session, reservation, grace)
  - [x] Queue configuration
  - [x] Xendit credentials mapping
- [x] Update `.env.example` with new variables (already present)
- [x] Add Xendit config to `config/services.php`

### Core Services & Contracts
- [x] Create `app/Services/Payments/Payable.php` interface
  - [x] Move and adapt from `app/Services/Midtrans/Payable.php`
  - [x] Rename Midtrans-specific methods to neutral names
  - [x] Define item/customer/amount methods
- [x] Create `app/Services/Payments/PaymentGateway.php` interface
  - [x] Define create/retrieve/cancel operations
  - [x] Define typed return structures
- [x] Create `app/Services/Payments/CheckoutResult.php`
  - [x] Public checkout response DTO
  - [x] URL, expiry, status, error states
- [x] Create `app/Services/Payments/PaymentOutcome.php`
  - [x] Normalized provider outcome
  - [x] Status, timestamps, identifiers, metadata
- [x] Create `app/Services/Payments/PaymentGatewayManager.php`
  - [x] Resolve gateway by stored provider
  - [x] Resolve default gateway from config
  - [x] Provider validation

### Legacy Adapter
- [x] Create `app/Services/Midtrans/MidtransGateway.php`
  - [x] Implement `PaymentGateway` interface
  - [x] Wrap existing `MidtransClient` calls
  - [x] Map Snap responses to `CheckoutResult`
  - [x] Map transaction status to `PaymentOutcome`
  - [x] Preserve signature verification

### Database Schema
- [x] Create migration: `add_gateway_metadata_to_payments_table`
  - [x] Add `provider` varchar nullable (temp)
  - [x] Add `provider_account_id` varchar nullable
  - [x] Add `provider_mode` enum nullable (test/live)
  - [x] Add `provider_session_id` varchar nullable unique
  - [x] Add `provider_payment_id` varchar nullable
  - [x] Add `provider_request_id` varchar nullable
  - [x] Add `checkout_url` text nullable
  - [x] Add `checkout_expires_at` timestamp nullable
  - [x] Add `currency` char(3) default 'IDR'
  - [x] Add `checkout_state` enum nullable
  - [x] Add `creation_lease_expires_at` timestamp nullable
  - [x] Add `request_snapshot` json nullable
  - [x] Add `provider_status` varchar nullable
  - [x] Add `provider_updated_at` timestamp nullable
  - [x] Add `last_reconciled_at` timestamp nullable
  - [x] Add `fulfillment_state` enum nullable
  - [x] Add `review_reason` text nullable
  - [x] Add indexes for unresolved states
  - [x] Add composite unique index for provider session
- [x] Create migration: `create_payment_webhook_receipts_table`
  - [x] Receipt ID, provider, account, mode
  - [x] Event type, session ID, payment link
  - [x] Dedupe key (unique), payload digest
  - [x] Sanitized payload JSON
  - [x] Received/processed timestamps
  - [x] Processing state, attempts, errors
  - [x] Indexes for unprocessed receipts
- [x] Create migration: `create_payment_effects_table`
  - [x] Effect ID, payment/payable polymorphic
  - [x] Effect type, unique effect key
  - [x] Payload for replay
  - [x] State, attempts, completion/error
  - [x] Timestamps
- [x] Update `app/Models/Payment.php`
  - [x] Add new field casts
  - [x] Add status/state constants
  - [x] Add scopes for unresolved states
  - [x] Add helper methods (isSettled, isPending, hasActiveCheckout)
  - [x] Add safe serialization (hide snapshots/PII)

### Models
- [x] Create `app/Models/PaymentWebhookReceipt.php`
- [x] Create `app/Models/PaymentEffect.php`
- [x] Create factory: `PaymentWebhookReceiptFactory.php`
- [x] Create factory: `PaymentEffectFactory.php`

### Backfill Command
- [x] Create `app/Console/Commands/BackfillPaymentProviders.php`
  - [x] Dry-run mode
  - [x] Chunked processing
  - [x] Classify from Snap token presence
  - [x] Classify from `midtrans_transaction_id`
  - [x] Classify from manual proof patterns
  - [x] Report ambiguous cases
  - [x] Resumable after interruption
  - [x] Idempotent (rerun safe)
  - [x] Preserve historical timestamps
  - [x] Copy transaction IDs to neutral fields
  - [x] Backfill currency to IDR

### Service Provider Registration
- [x] Update `app/Providers/AppServiceProvider.php`
  - [x] Register `PaymentGatewayManager` singleton
  - [x] Bind gateway implementations
  - [x] Register manager in container

### Tests
- [x] Create `tests/Feature/PaymentProviderBackfillTest.php`
  - [x] Historical Midtrans classification
  - [x] Manual transfer classification
  - [x] Ambiguous row detection
  - [x] Idempotency verification
  - [x] Count/total preservation
- [ ] Update existing payment tests for new schema compatibility (deferred to Sprint 2)

### Documentation
- [x] Review and update migration plan if discoveries made
- [x] Document any deviations from original plan

### Deployment Checklist (Sprint 1)
- [x] Schema migrations tested locally
- [x] Backfill command dry-run verified
- [x] No breaking changes to existing payment flows (legacy still works)
- [ ] Full existing test suite passes (full local run exceeded the 5-minute harness limit; focused payment/controller suites pass)
- [ ] Code review completed
- [ ] Deploy schema changes to staging
- [ ] Run backfill in staging (dry-run first)
- [ ] Verify backfill accuracy
- [ ] Monitor for errors

**Sprint 1 Completed:** 2026-10-03  
**Status:** Ready for staging deployment. All core contracts, schema, and backfill logic complete.
- [ ] Verify backfill accuracy
- [ ] Monitor for errors

## Sprint 2: Xendit Client & Checkout Service ✅

### Xendit Implementation
- [x] Create `app/Services/Xendit/XenditClient.php`
  - [x] HTTP transport with Laravel Http client
  - [x] Basic auth with secret key
  - [x] POST /sessions (create)
  - [x] GET /sessions/{id} (retrieve)
  - [x] POST /sessions/{id}/cancel (cancel)
  - [x] Request/response logging
  - [x] Timeout configuration
  - [x] Error handling (network, auth, validation, server)
- [x] Create `app/Services/Xendit/XenditStatusMapper.php`
  - [x] Map session status to application status
  - [x] Map webhook events to outcomes
  - [x] Validate business_id, amount, currency
  - [x] Extract payment/request IDs
- [x] Create `app/Services/Xendit/XenditGateway.php`
  - [x] Implement `PaymentGateway` interface
  - [x] Build session request from Payable
  - [x] Format items, customer (E.164, name handling)
  - [x] Generate return URLs
  - [x] Validate checkout URL security
  - [x] Map responses to CheckoutResult/PaymentOutcome

### Checkout Service
- [x] Create `app/Services/Payments/PaymentCheckoutService.php`
  - [x] Check payable eligibility
  - [x] Lock payable within transaction
  - [x] Find existing active/creating attempt
  - [x] Reuse existing checkout URL if valid
  - [x] Create immutable local attempt record
  - [x] Acquire creation lease
  - [x] Call gateway outside locks
  - [x] Persist remote result
  - [x] Clear lease
  - [x] Handle unknown outcomes (timeout after send)
  - [x] Return CheckoutResult with URL or error
  - [x] Freeze snapshot (amount, items, customer)

### Payment Resource
- [x] Create `app/Http/Resources/PaymentResource.php`
  - [x] Public projection (no PII, no callback payloads)
  - [x] Include status, amount, provider (neutral)
  - [x] Exclude raw notifications, snapshots
  - [x] Admin projection for internal use
- [x] Create `app/Http/Resources/AdminPaymentResource.php`
  - [x] Full payment details for admin
  - [x] Provider metadata and reconciliation status

### Tests
- [x] Create `tests/Feature/XenditClientTest.php`
  - [x] Session creation request format
  - [x] Session retrieval
  - [x] Session cancellation
  - [x] HTTP error handling
  - [x] Timeout handling
  - [x] Response validation
- [x] Create `tests/Feature/PaymentCheckoutTest.php`
  - [x] New attempt creation
  - [x] Concurrent attempt deduplication
  - [x] Existing URL reuse
  - [x] Creation lease behavior
  - [x] Unknown outcome handling
  - [x] Snapshot immutability
  - [x] Checkout unavailable handling

### Environment Setup
- [x] Add Xendit test credentials to `.env` (already present)
- [x] Configure webhook URL (local tunnel for dev - Sprint 3)
- [x] Verify configuration loading
- [x] Test Xendit client registration

### Service Provider Updates
- [x] Register XenditGateway in AppServiceProvider
- [x] Register PaymentCheckoutService as singleton

### Deployment Checklist (Sprint 2)
- [x] Xendit gateway registered and accessible
- [x] Checkout service tested with HTTP fakes
- [x] No automatic switch to Xendit yet (still creating with Midtrans by default)
- [x] Focused Xendit client and checkout tests passing
- [ ] Code review completed
- [ ] Deploy to staging
- [ ] Smoke test checkout service manually (don't activate in production flows yet)
- [ ] Verify both gateways resolve correctly in staging

**Sprint 2 Completed:** 2026-10-03  
**Status:** Xendit integration complete. Dormant until controllers updated and webhooks deployed. Safe to deploy with no production impact.

## Sprint 3: Webhooks, Reconciliation & Effects (implementation complete; verification pending)

### Webhook Handling
- [x] Create `app/Http/Requests/XenditWebhookRequest.php`
  - [x] Validate event envelope structure
  - [x] Validate required fields
  - [x] Accept only known event types
- [x] Create `app/Http/Controllers/XenditWebhookController.php`
  - [x] Authenticate via x-callback-token (constant-time)
  - [x] Return 403 for invalid/missing token
  - [x] Validate request structure
  - [x] Persist receipt (minimized/redacted payload)
  - [x] Generate dedupe key
  - [x] Store payload digest
  - [x] Return 200 after persistence
  - [x] Queue processing job
  - [x] Handle duplicate deliveries
- [x] Create `app/Jobs/ProcessPaymentWebhook.php`
  - [x] Load receipt
  - [x] Parse and validate event data
  - [x] Find payment by provider/session/reference
  - [x] Lock payment and payable
  - [x] Validate account/amount binding
  - [x] Call reconciliation service
  - [x] Mark receipt processed
  - [x] Handle retries with exponential backoff
  - [x] Alert on unknown payments
  - [x] Quarantine mismatched data

### Reconciliation Service
- [x] Create `app/Services/Payments/PaymentReconciler.php`
  - [x] Accept provider-neutral PaymentOutcome
  - [x] Lock payment and payable consistently
  - [x] Enforce legal state transitions
  - [x] Prevent status regression
  - [x] Update payment status/timestamps
  - [x] Call payable transition methods
  - [x] Create fulfillment effects transactionally
  - [x] Handle settlement (first paid attempt wins)
  - [x] Handle expired/canceled attempts
  - [x] Detect and record excess payments
  - [x] Handle late payments (after reservation expired)
  - [x] Record review_required states

### Effect Processing
- [x] Create `app/Jobs/ProcessPaymentEffect.php`
  - [x] Load effect by stable key
  - [x] Execute effect action (confirmation, quota, bib, vote count)
  - [x] Ensure idempotency (check before acting)
  - [x] Retry on failure
  - [x] Mark complete
  - [x] Record errors
- [ ] Update `app/Services/RegistrationConfirmationNotifier.php` (deferred - existing works)
  - [ ] Accept payment-agnostic inputs
  - [ ] Durable retry support
  - [ ] Record delivery attempts

### Recovery Commands
- [x] Create `app/Console/Commands/ReconcilePendingPayments.php`
  - [x] Find all unresolved payments (pending/creating/unknown)
  - [x] Route by stored provider
  - [x] Retrieve current status from provider
  - [x] Feed into reconciliation
  - [x] Include old attempts, votes
  - [x] Batch processing
  - [x] Error reporting
- [x] Create `app/Console/Commands/ReplayPaymentWebhooks.php`
  - [x] Find unprocessed receipts
  - [x] Re-dispatch jobs
  - [x] Handle orphaned receipts
- [x] Create `app/Console/Commands/DispatchPendingPaymentEffects.php`
  - [x] Find incomplete effects
  - [x] Re-dispatch jobs
  - [x] Handle stuck effects

### Refund Records
- [x] Create migration: `create_payment_refund_records_table`
  - [x] Payment/participant references
  - [x] Amount, currency
  - [x] Provider, provider refund ID
  - [x] Actual vs recorded state
  - [x] Actor, note, timestamps
  - [x] Cumulative amount guard
- [x] Create `app/Models/PaymentRefundRecord.php`
- [x] Create factory: `PaymentRefundRecordFactory.php`

### Routes & Middleware
- [x] Add webhook route to `routes/web.php`
  - [x] Named route: `webhooks.xendit`
  - [x] Path: `/webhooks/xendit`
  - [x] POST only
  - [x] No auth/session middleware
- [x] Update `bootstrap/app.php`
  - [x] Exempt webhook route from CSRF
  - [x] Register scheduled reconciliation tasks
  - [x] Register webhook replay schedule
  - [x] Register effect dispatch schedule

### Tests
- [x] Create `tests/Feature/XenditWebhookTest.php`
  - [x] Valid webhook delivery
  - [x] Authentication rejection
  - [x] Duplicate delivery handling
  - [x] Malformed payload rejection
  - [x] Unknown payment handling
  - [x] Mismatched amount/account quarantine
- [x] Create `tests/Feature/PaymentReconciliationTest.php`
  - [x] Settlement from completed event
  - [x] Expiry handling
  - [x] State transition enforcement
  - [x] Duplicate settlement prevention
  - [x] Late payment after reservation expired
  - [x] Excess payment detection
- [x] Create `tests/Feature/PaymentEffectRecoveryTest.php`
  - [x] Effect replay after crash
  - [x] Idempotent fulfillment
  - [x] Receipt replay
  - [x] Pending payment reconciliation

### Deployment Checklist (Sprint 3)
- [x] Webhook endpoint deployed and routed
- [x] Webhook CSRF exemption added
- [x] Queue workers configured for `payments` queue
- [x] Scheduled tasks configured (reconcile, replay, dispatch)
- [x] Refund records migration created
- [x] Webhook token verified in test environment
- [x] Test webhook delivery from Xendit
- [x] Reconciliation command tested locally with automated coverage
- [x] Effect replay tested locally with automated coverage
- [ ] Monitor error rates
- [ ] Still using Midtrans for production (Xendit infrastructure complete, not active)

**Sprint 3 Implementation Completed:** 2026-10-03

**Status:** Lifecycle code and dedicated automated webhook, reconciliation, and effect-recovery tests are implemented. Staging/provider webhook delivery and operational monitoring checks are still required before Sprint 3 is fully verified.

## Sprint 4: Frontend, Category Normalization & Browser Tests

### Frontend Updates
- [ ] Create `resources/js/lib/payment-checkout.ts`
  - [x] Hosted URL navigation (implemented directly in current pages)
  - [x] Temporary legacy Snap branch (implemented directly in current pages)
  - [x] Provider-aware flow selection (implemented directly in current pages)
- [ ] Create `resources/js/components/public/payment-checkout-button.tsx`
  - [ ] Loading states
  - [ ] Retry button
  - [ ] Unavailable state
  - [ ] Resume existing checkout
  - [ ] Error display
- [x] Update public payment-related pages to use the dual-provider checkout flow
  - [x] Registration payment page
  - [x] Group registration payment page
  - [x] Vote payment page
  - [x] Registration/order payment status pages
  - [ ] Payment history page (show provider)
- [ ] Extract repeated page-level payment code into a shared helper/component only if it reduces duplication without changing verified behavior

### Controller Updates
- [x] Update `app/Http/Controllers/RegistrationController.php`
  - [x] Use `PaymentCheckoutService` for new payments
  - [x] Return provider-aware checkout payload
  - [x] Use `PaymentResource` on the status page
  - [x] Handle deletion with active remote checkout safely
- [x] Update `app/Http/Controllers/GroupRegistrationController.php`
  - [x] Use checkout service
  - [x] Immutable group total
  - [x] Per-participant items in snapshot
- [x] Update `app/Http/Controllers/VoteController.php`
  - [x] Use checkout service
  - [x] Freeze amount/quantity in the payment snapshot
  - [ ] Voting cutoff handling
- [x] Update `app/Http/Controllers/PaymentNotificationController.php`
  - [x] Add legacy-only guard
  - [x] Route to shared reconciliation
  - [x] Preserve Midtrans signature check
- [x] Update `app/Http/Controllers/ManualPaymentVerificationController.php`
  - [x] Use shared reconciler
  - [x] Require manual provider explicitly
- [x] Update `app/Http/Controllers/RegistrationRefundController.php`
  - [x] Provider-aware refund instructions
  - [x] Create `PaymentRefundRecord`
  - [x] Correct group partial refund logic
  - [x] Cumulative amount validation

### Category Normalization
- [x] Create migration: `change_registration_category_payment_method_default`
  - [x] Change default from 'midtrans' to 'online'
  - [x] Add 'online' to accepted values
  - [x] Keep 'midtrans' for backward compatibility temporarily
- [x] Update `app/Models/RegistrationCategory.php`
  - [x] Add `PAYMENT_METHOD_ONLINE` constant
  - [x] Update default
  - [x] Bridge reads (accept both 'midtrans' and 'online' as online)
- [x] Create `app/Console/Commands/NormalizePaymentMethods.php`
  - [x] Dry-run mode
  - [x] Update 'midtrans' → 'online' in categories
  - [x] Chunked/resumable
  - [x] Idempotent
  - [x] Report changes

### Browser Tests (Pest Browser + Playwright)
- [ ] Add `pestphp/pest-plugin-browser` to dev dependencies
- [ ] Add `playwright` to dev dependencies
- [ ] Install Playwright browsers in CI
- [ ] Create `tests/Browser/PaymentCheckoutTest.php`
  - [ ] Navigate to registration payment
  - [ ] Initiate checkout
  - [ ] Verify redirect to Xendit hosted page (mock/local double)
  - [ ] Return to success URL
  - [ ] Verify payment status updated
- [ ] Create `tests/Browser/PaymentReturnTest.php`
  - [ ] Return from successful payment
  - [ ] Return from canceled payment
  - [ ] Multiple attempt scenarios

### Tests
- [x] Create `tests/Feature/PaymentMethodNormalizationTest.php`
  - [x] Category normalization
  - [x] Backward compatibility
  - [x] Idempotency
- [x] Update existing feature tests for the dual-provider controller flow
- [ ] Browser test coverage for checkout UX
- [x] Add focused coverage for deletion safety with active remote checkout attempts
- [x] Add/finish Sprint 3 dedicated lifecycle tests (`XenditWebhookTest`, `PaymentReconciliationTest`, `PaymentEffectRecoveryTest`)

### Deployment Checklist (Sprint 4)
- [ ] Deploy frontend changes
- [ ] Deploy controller updates (still defaulting to Midtrans)
- [ ] Category compatibility deployed first
- [ ] Run normalization command (dry-run first)
- [ ] Verify categories updated correctly
- [ ] Browser tests passing
- [ ] Manual UX verification in staging
- [ ] Ready for cutover

**Verified locally on 2026-10-03:** 106 focused payment/checkout/Xendit/legacy/manual/status/controller tests (455 assertions), TypeScript type-check, targeted ESLint/Prettier, Pint, `git diff --check`, and production Vite build. The full Pest suite exceeded the 5-minute harness limit and is not recorded as passing.

**Verified locally on 2026-10-04:** Registration deletion-safety and checkout regression suites: 35 tests, 186 assertions passing; Pint and `git diff --check` passing.

**Verified locally on 2026-10-04:** Expanded focused payment lifecycle suites, including the dedicated Sprint 3 webhook/reconciliation/effect recovery tests: 125 tests, 518 assertions passing after Pint.

**Verified locally on 2026-10-04:** Xendit dashboard Payment Session Completed webhook test succeeded against the ngrok `/webhooks/xendit` URL; category payment-method normalization suites passed: 60 tests, 313 assertions, plus TypeScript type-check.

**Sprint 4 remaining:** shared legacy/manual reconciliation boundary, provider-aware refund workflow, browser checkout/return coverage, staging UX verification, and non-payment full-suite failures in the category backfill migration tests.

## Sprint 5: Production Cutover & Coexistence Testing

### Pre-Cutover Verification
- [ ] All previous sprints complete
- [ ] Historical provider backfill 100% complete
- [ ] Category normalization complete
- [ ] Xendit live mode credentials configured in production secrets
- [ ] Live mode webhook endpoint registered in Xendit dashboard
- [ ] Webhook token validated in production
- [ ] Queue workers running
- [ ] Scheduler running
- [ ] Monitoring and alerts configured
- [ ] Rollback plan documented and rehearsed

### Cutover Execution
- [ ] Deploy all payment infrastructure code
- [ ] Keep `PAYMENT_GATEWAY=midtrans` initially
- [ ] Verify existing payments still work
- [ ] Switch `PAYMENT_GATEWAY=xendit` (single environment variable change)
- [ ] Monitor new registration payments
- [ ] Verify Xendit session creation succeeds
- [ ] Verify webhook delivery and processing
- [ ] Verify payment settlement and confirmation
- [ ] Test multiple payment methods (QRIS, VA, e-wallet)
- [ ] Verify emails sent after payment

### Coexistence Period
- [ ] Both Midtrans and Xendit payments active
- [ ] Monitor error rates for both providers
- [ ] Verify reconciliation works for both
- [ ] Recovery commands support both
- [ ] Admin dashboard displays both correctly
- [ ] Historical data accessible
- [ ] New payments via Xendit only
- [ ] Old in-flight Midtrans payments still reconcilable

### Tests
- [ ] Create `tests/Feature/PaymentGatewayCutoverTest.php`
  - [ ] Provider selection based on config
  - [ ] Both providers coexist
  - [ ] Routing by stored provider
  - [ ] No cross-provider errors
  - [ ] Historical access preserved

### Audit Command
- [ ] Create `app/Console/Commands/AuditPaymentMigration.php`
  - [ ] Count payments by provider
  - [ ] Sum amounts by provider and status
  - [ ] Report unresolved legacy attempts
  - [ ] Report ambiguous classifications
  - [ ] Retirement readiness report

### Deployment Checklist (Sprint 5)
- [ ] Production deployment completed
- [ ] Variable switch executed
- [ ] First Xendit payment confirmed successful
- [ ] Webhook processing verified
- [ ] Monitoring showing healthy metrics
- [ ] No rollback needed
- [ ] Communication sent to stakeholders
- [ ] Support team briefed

### Rollback Procedure (If Needed)
- [ ] Set `PAYMENT_GATEWAY=midtrans`
- [ ] Verify no active Xendit sessions abandoned
- [ ] Continue reconciling in-flight Xendit payments via webhook/cron
- [ ] Investigation and fix required before re-attempting cutover

## Sprint 6: Midtrans Retirement

### Drain Period
- [ ] Minimum 30 days after cutover
- [ ] All Midtrans payments resolved (settled/expired/canceled)
- [ ] Run audit command to verify no pending Midtrans payments
- [ ] Reconciliation command shows zero unresolved Midtrans attempts
- [ ] Financial reconciliation completed
- [ ] Export Midtrans historical data for archival

### Code Removal
- [ ] Set `PAYMENT_LEGACY_MIDTRANS_ENABLED=false`
- [ ] Verify no errors from disabled legacy adapter
- [ ] Remove Midtrans-specific code:
  - [ ] Delete `app/Services/Midtrans/MidtransClient.php`
  - [ ] Delete `app/Services/Midtrans/MidtransGateway.php`
  - [ ] Delete `app/Services/Midtrans/Payable.php` (already moved)
  - [ ] Delete `app/Http/Controllers/PaymentNotificationController.php`
  - [ ] Delete `resources/js/lib/midtrans.ts`
  - [ ] Remove Snap script loading from templates
  - [ ] Remove `MIDTRANS_*` from `.env.example`
  - [ ] Remove Midtrans config from `config/services.php`
  - [ ] Remove legacy webhook route
  - [ ] Remove CSRF exception for legacy webhook
- [ ] Create migration: `drop_legacy_midtrans_columns_from_payments_table`
  - [ ] Export data first (backup)
  - [ ] Drop `snap_token`
  - [ ] Drop `midtrans_transaction_id`
  - [ ] Keep `provider` and neutral fields forever
- [ ] Remove 'midtrans' from category payment_method enum
- [ ] Remove legacy compatibility bridges

### Tests
- [ ] Create `tests/Feature/PaymentGatewayRetirementTest.php`
  - [ ] Verify Midtrans code removed
  - [ ] Verify Xendit-only operation
  - [ ] Verify historical data preserved
- [ ] Remove or update tests referencing Midtrans directly
- [ ] Update test fixtures to Xendit only

### Documentation
- [ ] Update runbook to remove Midtrans procedures
- [ ] Document historical data access for refunds/disputes
- [ ] Archive Midtrans credentials securely (for historical dispute resolution)
- [ ] Update README and setup documentation
- [ ] Mark migration complete

### Deployment Checklist (Sprint 6)
- [ ] Drain period confirmed complete
- [ ] Audit shows zero pending Midtrans payments
- [ ] Export backup completed
- [ ] Code removal deployed
- [ ] Schema migration executed
- [ ] Tests passing without Midtrans
- [ ] Monitoring updated (remove Midtrans metrics)
- [ ] Documentation updated
- [ ] Migration marked complete
- [ ] Retrospective held

## Post-Migration

### Monitoring & Maintenance
- [ ] Regular reconciliation via cron
- [ ] Monitor payment success rates
- [ ] Monitor webhook delivery reliability
- [ ] Alert on quarantined/unmatched payments
- [ ] Regular audit command execution
- [ ] Performance metrics collection

### Future Enhancements (Not in Scope)
- Automated refund API
- Additional payment providers
- Subscription/recurring payments
- Multi-currency support
- Alternative Payment Sessions modes

---

**Notes:**
- Each sprint should be deployed and verified before proceeding
- Rollback capability preserved until Sprint 6
- Historical data never deleted, only new columns added
- Provider field remains forever for audit/analysis
- Backward compatibility maintained during transition
