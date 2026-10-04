# Sporta ID: Midtrans to Xendit migration plan

## 1. Goal, scope, and implementation decisions

**Goal:** make Xendit the gateway for all new online payments, preserve existing payment history and in-flight transactions, then remove the active Midtrans integration after reconciliation and the rollback window are complete.

This plan is based on inspection of this repository and Xendit's official documentation on **2026-10-02**. Tasks below are proposed implementation work; writing this plan does not implement the migration.

### Scope

- Individual and team registrations, including confirmation, quota, ID cards, team lifecycle, and race entry/bib side effects.
- Group registration: one checkout pays for multiple participants.
- Paid award voting: votes count only after verified payment.
- Manual bank-transfer proof, organizer verification, and free registrations/votes must continue working.
- Retry/resume checkout, asynchronous notifications, expiry, recovery commands, refunds recorded by organizers, customer communications, and historical payment display.
- Production rollout, rollback, observability, and final Midtrans retirement.

### Recommended target

1. Use **Xendit Payment Sessions**, with `session_type=PAY`, `mode=PAYMENT_LINK`, and automatic capture. Create sessions on the server and redirect to Xendit's hosted checkout.
2. Use Laravel's existing `Http` client, matching the current integration. No Xendit PHP SDK or browser SDK is required for this flow.
3. Move shared payment business logic out of `App\Services\Midtrans` into `App\Services\Payments`.
4. Separate the category's collection method (`online` or `manual_transfer`) from the immutable provider on each payment attempt (`midtrans`, `xendit`, or `manual_transfer`).
5. Retain the current internal payment status strings initially, including `settlement` and `expire`. These become application states, not provider payloads. Renaming all statuses would unnecessarily expand this migration.
6. Maintain both providers during transition. A global provider switch selects **new** attempts only; it must never change the provider of an existing attempt.
7. Preserve the existing dashboard-assisted money-refund workflow. Make its instructions and audit trail provider-aware. An automated refund API is a separate enhancement, not a prerequisite for parity.

**Product-selection gate:** Sprint 0 must verify that this merchant account can use Payment Sessions and every required Indonesian payment channel. Do not silently fall back to legacy `/v2/invoices`, or mix its `PAID`/`invoice_url` payloads into Payment Sessions. If account availability forces another product, revise the API contract and test fixtures before implementation. _(Status: Verified in test mode on 2026-10-02; Payment Sessions creation, retrieval, duplicate rejection, and cancellation verified via live sandbox probes in `docs/payments/test-matrix.md`)_.

## 2. Existing architecture and findings

| Area              | Current implementation                                                                                            | Migration consequence                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Stack             | Laravel 13, Inertia 3, React 19, TypeScript, Pest 4; Composer PHP constraint `^8.3`, CI matrix 8.3/8.4/8.5        | Preserve supported runtime matrix; no framework upgrade required                                          |
| Gateway           | `app/Services/Midtrans/MidtransClient.php` calls Snap creation and transaction status through `Http`              | Replace provider-specific transport behind a shared interface                                             |
| SDK dependencies  | No direct Midtrans dependency in `composer.json` or `package.json`                                                | There is no SDK package to uninstall                                                                      |
| Shared contract   | `app/Services/Midtrans/Payable.php`, implemented by `Registration`, `RegistrationOrder`, `Vote`                   | Move contract and rename Midtrans-shaped item/customer methods                                            |
| Payment creation  | `RegistrationController`, `GroupRegistrationController`, `VoteController` create payments and Snap tokens         | Centralize attempt creation, reuse, pricing snapshot, provider selection, and error handling              |
| Notification      | `PaymentNotificationController` verifies SHA-512 and reconciles synchronously                                     | Keep legacy endpoint during drain; add authenticated Xendit ingress and durable processing                |
| State application | `PaymentReconciler` locks payment/payable, updates payment, invokes payable transition                            | Add payment-level transition guards; current payable guards do not stop payment-row status regression     |
| Persistence       | `Payment` has `midtrans_transaction_id`, `snap_token`, `raw_notification`, amount/status; polymorphic payable     | Add provider-neutral identifiers, checkout metadata, receipt tracking, and snapshots                      |
| Collection choice | `RegistrationCategory::PAYMENT_METHOD_ONLINE`, DB default `online`, temporary legacy read support for `midtrans`, React union includes `online` and legacy `midtrans` | Continue separating collection choice from immutable provider identity; remove legacy category value after normalization/drain |
| Expiry            | Registration/order reserves for one day; hourly `registrations:expire-unpaid` releases quota locally              | Separate short-lived checkout expiry from reservation expiry and reconcile before release                 |
| Recovery          | `payments:check-status` reads only latest registration/order payment from Midtrans                                | Support provider routing, exact attempt, paid votes, and older unresolved attempts                        |
| UI                | Five pages load `resources/js/lib/midtrans.ts`; browser globals declare `window.snap`                             | Add neutral checkout response and hosted redirect; retain legacy Snap branch during drain                 |
| Refunds           | `RegistrationRefundController` records refund/cancellation locally; organizer moves money in dashboard            | Preserve scope; show actual provider and handle group partial refunds correctly                           |
| Side effects      | Confirmation notifier sends mail after reconciliation and catches failures                                        | Add durable retryable settlement effects; a replay must recover missed work without repeating fulfillment |
| Tests             | Existing payment, registration, group, vote, manual, race, expiry, mail, and refund feature tests                 | Extend coverage rather than replacing business assertions with API-only tests                             |

### Specific risks to resolve

- Every current “Pay Now” can create another payment. An old checkout can still settle after a newer attempt is created.
- Mutable category prices and award prices are used when constructing some gateway line items. Retries must use the original purchase snapshot, not today's price.
- A later `pending` or `expire` notification can overwrite a settled payment row even though the payable is guarded against regression.
- A Xendit session normally expires after 30 minutes; expiring it must not automatically destroy a registration's existing 24-hour reservation.
- If payment succeeds around local reservation expiry, payment truth and fulfillment capacity must be resolved independently. Never silently ignore money received or overbook quota.
- Existing manual-transfer rows do not carry an explicit provider. A null Snap token alone cannot identify manual payment: online creation may also have failed.
- Public status responses currently serialize payment models. The new design needs an explicit public projection so callback payloads, customer snapshots, and internal recovery metadata are not exposed.
- Existing deletion of pending registrations/payments must be reviewed: a remotely payable checkout must not outlive a deleted local record without a tombstone/audit path.

## 3. Dependency installation, updates, and removals

| Dependency/file                                                | Action                                                                                                                  | Timing and reason                                                                                                                                                                           |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Laravel HTTP client, database transactions, queue, cache locks | Reuse existing framework facilities                                                                                     | All sprints; already available                                                                                                                                                              |
| `xendit/xendit-php`                                            | **Do not install for this design**                                                                                      | REST client is sufficient and directly fakeable with `Http::fake()`                                                                                                                         |
| Xendit browser SDK                                             | **Do not install**                                                                                                      | Hosted Payment Link is a full-page redirect                                                                                                                                                 |
| Midtrans PHP/npm SDK                                           | No removal command needed                                                                                               | Neither is declared; confirm lockfile inventory in Sprint 0                                                                                                                                 |
| `resources/js/lib/midtrans.ts` and Snap script                 | Retain temporarily, delete in retirement sprint                                                                         | This is the actual frontend Midtrans dependency                                                                                                                                             |
| Pest and Laravel Pest plugin                                   | Reuse existing versions                                                                                                 | Unit/feature/integration coverage                                                                                                                                                           |
| `pestphp/pest-plugin-browser`                                  | Proposed dev dependency: `composer require --dev pestphp/pest-plugin-browser:^4.0`                                      | Sprint 4, after dependency approval and compatibility check                                                                                                                                 |
| Playwright browser runtime                                     | Proposed dev dependency: `npm install --save-dev playwright`; `npx playwright install --with-deps chromium` in Linux CI | Sprint 4; confirm the chosen Pest Browser release's exact setup first; commit resolved versions                                                                                             |
| `composer.json`, `composer.lock`                               | Update only for the approved browser-test dependency                                                                    | No blanket `composer update`                                                                                                                                                                |
| `package.json`, `package-lock.json`                            | Add approved browser dependency and focused test script if useful                                                       | No blanket frontend upgrade                                                                                                                                                                 |
| `pnpm-lock.yaml`, `pnpm-workspace.yaml`                        | Resolve package-manager policy in Sprint 0                                                                              | CI currently uses npm, while pnpm files also exist. Prefer npm to match CI; retire pnpm files only after confirming they are unused, otherwise maintain the supported workflow deliberately |
| Axios                                                          | Keep unless an independent usage audit proves it unused                                                                 | Its presence is not evidence of a Midtrans dependency                                                                                                                                       |
| ESLint, Prettier, TypeScript, Larastan, Pint, Wayfinder        | Reuse existing tools                                                                                                    | Regenerate Wayfinder output; do not hand-edit generated routes                                                                                                                              |

Use locked installs in CI (`composer install`, and `npm ci` once the lockfile is confirmed synchronized). If browser dependency approval is deferred, execute the same browser scenarios manually with recorded evidence; Sprint 4 is not complete without browser verification.

## 4. Xendit account setup and environment variables

### Credentials to obtain

1. In Xendit's **Test mode**, open **Settings > API Keys > Generate Secret Key**. Grant the Money-in/payment permissions required to create, read, and cancel Payment Sessions. Verify actual permission labels against this account's dashboard.
2. Obtain the **webhook verification token** from **Settings > Webhooks**. This is compared with the request's `x-callback-token`; it is not the API secret and not a Midtrans-style payload hash.
3. Record the merchant **business/account ID**, as returned in sessions/webhooks, for account binding checks. It is an identifier, not a secret.
4. Repeat configuration for **Live mode**. Store live values only in the production secret store. Test and live API calls use `https://api.xendit.co`; credentials determine the mode.
5. Configure Payment Session completed/expired webhooks to the public HTTPS route named `webhooks.xendit` (`/webhooks/xendit`). Register the endpoint separately for the applicable environments.
6. Confirm QRIS, desired virtual accounts, e-wallets, and cards are enabled and testable for this merchant. Advertise only the enabled channels.

No Xendit public/client key is needed for hosted Payment Sessions. Do not add `VITE_XENDIT_SECRET_KEY`, expose keys in Inertia props, or put callback tokens in frontend code.

### Proposed `.env.example` additions

These names are application configuration proposed by this plan, not variables automatically interpreted by Xendit. Implement and test every mapping in `config/payments.php` or `config/services.php`.

```dotenv
# New-attempt selection; start with midtrans during migration.
PAYMENT_GATEWAY=midtrans
PAYMENT_CHECKOUT_ENABLED=true
PAYMENT_LEGACY_MIDTRANS_ENABLED=true
PAYMENT_SESSION_TTL_MINUTES=30
PAYMENT_RESERVATION_TTL_MINUTES=1440
PAYMENT_RECONCILIATION_GRACE_MINUTES=10
PAYMENT_WEBHOOK_QUEUE=payments

# Xendit: fill independently in test and production secret stores.
XENDIT_SECRET_KEY=
XENDIT_WEBHOOK_TOKEN=
XENDIT_BUSINESS_ID=
XENDIT_MODE=test
XENDIT_API_BASE_URL=https://api.xendit.co
XENDIT_CURRENCY=IDR
XENDIT_COUNTRY=ID
XENDIT_CONNECT_TIMEOUT_SECONDS=5
XENDIT_TIMEOUT_SECONDS=15

# Existing settings: use actual deployment values.
# APP_URL must be the externally reachable HTTPS application origin.
QUEUE_CONNECTION=database
CACHE_STORE=database
```

| Variable                          | Meaning and validation                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `PAYMENT_GATEWAY`                 | Allowlisted `midtrans`/`xendit` during transition; only controls new online attempts                                                    |
| `PAYMENT_CHECKOUT_ENABLED`        | Operational kill switch for new online session creation; does not disable status reads or webhooks                                      |
| `PAYMENT_LEGACY_MIDTRANS_ENABLED` | Temporary availability of legacy adapter/ingress; cannot be disabled before drain                                                       |
| Session/reservation TTL and grace | Positive integers; session expiry capped by remaining reservation/voting eligibility; confirm defaults in Sprint 0                      |
| `XENDIT_SECRET_KEY`               | Server-only API Basic Auth username, empty password; required when Xendit is enabled                                                    |
| `XENDIT_WEBHOOK_TOKEN`            | Server-only callback token; missing/empty configuration must fail closed                                                                |
| `XENDIT_BUSINESS_ID`              | Expected account for callbacks and status responses                                                                                     |
| `XENDIT_MODE`                     | Application deployment assertion (`test`/`live`); does not switch API hosts. Verify account/response mode during deployment smoke tests |
| Base URL/currency/country         | Explicitly allowed API origin and fixed initial `IDR`/`ID` integration                                                                  |
| Timeouts                          | Bounded external calls; GET retries can use jitter/backoff, POST retries need separately proven safety                                  |

Keep `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, and `MIDTRANS_IS_PRODUCTION` until Sprint 6 finishes. `APP_KEY` remains the existing Laravel application key; never regenerate it as part of gateway migration.

Return URLs are generated per payable through existing named status routes and HTTPS `APP_URL`, not stored as one global success URL. Browser cancellation returns to status without changing payment truth. Local webhook testing needs a publicly reachable HTTPS development endpoint/tunnel; the tunnel is operational tooling, not an application dependency.

After configuration changes, rebuild configuration cache and restart long-lived workers using the deployment procedure. Production needs an active scheduler and supervised queue workers consuming the `payments` queue and the existing default queue.

## 5. Target payment contract and lifecycle

### 5.1 Shared services

- `Payable`: neutral item/customer data and existing domain transition methods.
- `PaymentGateway`: create/retrieve/cancel checkout operations, returning typed provider-neutral results.
- `PaymentGatewayManager`: resolve by **stored payment provider**, or configured default for a genuinely new attempt.
- `PaymentCheckoutService`: reservation eligibility, immutable amount/items/customer snapshot, one in-progress creation lease, active session reuse, retry policy, and public checkout result.
- `PaymentReconciler`: common validated outcome application, payment/payable locking, legal state transitions, fulfillment decisions, and durable side-effect scheduling.
- `XenditClient` and `XenditStatusMapper`: HTTP/auth/schema concerns and Xendit-to-application mapping.
- Temporary `MidtransGateway`: translates existing Snap/status payloads into the shared contract while preserving legacy signature verification.

### 5.2 Xendit HTTP contract

| Operation       | Contract                                                                                                                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create          | `POST /sessions`, Basic Auth, `reference_id=payment.order_id`, `session_type=PAY`, `mode=PAYMENT_LINK`, `capture_method=AUTOMATIC`, integer IDR amount, country/currency, expiry, customer/items, and named-route return URLs |
| Create response | Persist `payment_session_id`, `payment_link_url`, `status`, `expires_at`, `business_id`; capture optional `payment_id`/`payment_request_id` when present                                                                      |
| Retrieve        | `GET /sessions/{payment_session_id}`; feed validated result into the same mapper/reconciler used by webhooks                                                                                                                  |
| Cancel          | Implement the official Cancel Session endpoint after confirming its method/path and behavior in Sprint 0; do not infer cancellation from a browser return                                                                     |
| Webhook         | Handle `payment_session.completed` and `payment_session.expired`; validate `event`, nested `data`, `business_id`, reference, session ID, amount, currency, country, session type, and status consistency                      |

Important schema details:

- Use unique references no longer than the documented 64-character session reference limit.
- Xendit item fields include `reference_id`, `name`, `type`, `category`, `net_unit_amount`, and `quantity`; the existing Midtrans item array is not directly reusable as the wire payload.
- Normalize Indonesian mobile numbers to E.164, preserve original contact data, and handle legitimate single-part names. Validate provider limits without silently truncating email addresses or inventing customer data.
- Freeze item totals and assert they sum exactly to the stored amount. Use integer rupiah arithmetic; do not use floating-point comparisons or multiply IDR by 100.
- Use provider-returned checkout URLs only after validating HTTPS and exact approved test/live hostnames from the documented response contract. Never accept arbitrary checkout or return URLs from the browser.
- The create-session reference reviewed does not document a general idempotency header. Do **not** assume an `Idempotency-Key` header works, or that a repeated `reference_id` returns the original session. Establish exact duplicate and recovery semantics in Sprint 0.

### 5.3 Creation, retries, and concurrency

1. Authorize/bind the payable through existing QR/reference token routes and verify it is still eligible to pay.
2. Within a short transaction, lock the payable, find an existing active/creating/unknown attempt, and either reuse it or create one immutable local attempt and creation lease. Commit before the network call.
3. Perform the remote create outside DB locks. Concurrent callers receive the existing URL, or a bounded “preparing payment” response; they must not each call Xendit.
4. Persist the remote result and clear the lease. A callback arriving before this write may bind the remote session only to the matching provider/reference/account/amount and an unbound attempt, using a lock.
5. On a definitive validation error, keep an actionable failure record. On timeout/connection loss after sending the request, mark creation as **unknown**, not safely failed.
6. Recover unknown attempts from authenticated callbacks or a documented provider lookup/operator recovery path. Until the outcome is resolved or the remotely payable period is conclusively over, do not blindly retry creation or switch providers for the same purchase.
7. Create a replacement only after the previous attempt is proven non-payable and the reservation remains valid. Never charge both providers as an automatic fallback after a timeout.
8. At settlement, check all attempts under a common payable lock. Fulfill once. A second real payment is recorded as money received and flagged for an excess-payment refund, not discarded or counted as a second registration/vote.

### 5.4 State mapping and fulfillment rules

| Verified provider observation                                                                                     | Payment result                                              | Payable result                                                                             |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Session `ACTIVE`                                                                                                  | `pending`                                                   | Remains pending                                                                            |
| `payment_session.completed`, status `COMPLETED`, expected `PAY`/automatic-capture flow and matching value/account | `settlement`; stable paid timestamp and payment identifiers | Confirm/count once if still eligible; otherwise hold fulfillment for exception resolution  |
| Session `EXPIRED`                                                                                                 | That attempt becomes `expire`                               | Reservation can remain pending until its own deadline; a new session may be offered safely |
| Session `CANCELED` from authenticated retrieval/cancel result                                                     | That attempt becomes `cancel`                               | Same reservation policy; browser cancellation alone is not this state                      |
| Transport failure/unknown event/new provider status                                                               | Record and retry/quarantine as appropriate                  | No invented failure, no quota release                                                      |
| Settled then pending/expired/canceled delivery                                                                    | Retain settlement                                           | No regression or duplicate side effects                                                    |
| Refunded then old completed replay                                                                                | Retain refund                                               | No resurrection                                                                            |

Do not create a fictitious `payment_session.failed` handler. Failed channel attempts inside an active session do not necessarily terminate the session. Optional payment-detail events may enrich records, but must not independently fulfill again.

Payment-session completion is distinct from Xendit's later settlement/payout to the merchant bank. The application's legacy `settlement` means “customer payment confirmed,” not “funds arrived in our bank account.”

### 5.5 Webhook processing protocol

1. Require a nonempty configured callback token and use constant-time comparison against `x-callback-token`. Reject missing/invalid credentials with 403 before accepting an event.
2. Validate event envelope and required fields. Persist a redacted/deliberately minimized receipt before returning 2xx; database failure must return a retryable error.
3. Deduplicate semantically by provider, account, session ID, and event/status. The documented session envelope has no universal event ID; delivery `created` timestamps are not reliable deduplication IDs. Store a payload digest separately to detect conflicting duplicates.
4. Queue work after commit. Persist processing state so a scheduler can redispatch unprocessed receipts if enqueueing or the worker crashes. A unique receipt is not proof that processing finished.
5. Lock payment and payable in a consistent order, enforce provider/reference/amount/currency/account binding, and apply legal transitions transactionally.
6. Persist fulfillment/notification work in the same transaction. Jobs retry after commit; use stable effect keys so duplicate deliveries do not create duplicate bibs, confirmations, quota changes, or vote increments.
7. Unknown payment/reference is stored as unmatched for retry/investigation, not treated as paid. Mismatched money/account values are quarantined and alerted. Authenticated unsupported events can be acknowledged and ignored explicitly.
8. Define bounded tries/backoff, failed-job alerts, and replay commands. Job timeout must be lower than queue `retry_after`. Test the ingress without CSRF but keep CSRF on browser POST routes.

Email transport itself may be at-least-once if a worker dies after send but before acknowledgement. Guarantee durable retry and idempotent domain fulfillment; do not claim exactly-once email delivery unless the mail provider supplies an idempotency mechanism.

### 5.6 Expiry, late settlement, and refunds

- Cap session lifetime at the remaining registration/order reservation time or allowed voting window. Use UTC timestamps and time-travel tests.
- At reservation deadline, retrieve/reconcile all unresolved attempts before releasing inventory. Apply a bounded grace period for in-flight callbacks; unknown remote outcomes go to an alertable exception state.
- When the deadline is conclusively unpaid, cancel/expire remotely payable attempts as supported, then release quota once. Manual payments keep their explicitly documented review/expiry policy.
- Late successful payment must still be recorded financially. If inventory has been released or voting closed, do not automatically reactivate/count. Put it into `review_required` fulfillment state for an operator to restore capacity under lock or issue a refund.
- Freeze this late-payment policy in Sprint 0 and document who resolves exceptions and expected response time.
- Manual refund recording continues to distinguish actual money movement from local cancellation. Record provider, provider transaction reference, amount, actor, timestamp, and note in durable audit data.
- A group refund affects the selected participant and that participant's quota only; do not mark the shared order wholly refunded while other participants remain paid. Track cumulative refunded amounts to prevent over-refunds.
- Preserve historical Midtrans refund/dispute information after the live adapter is retired. The operator runbook must explain how to resolve historical transactions through archived references and the original provider dashboard/support.

## 6. Database changes and migration strategy

Use **expand -> backfill -> switch -> contract**. Inspect the deployed database schema with Laravel Boost's schema tools before writing migrations; repository migrations alone do not prove production state. Never rewrite migrations already applied in production.

### Payments: proposed additive fields

| Field                                                          | Purpose                                                                                        |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `provider`                                                     | Immutable `midtrans`, `xendit`, or `manual_transfer`; nullable during backfill only            |
| `provider_account_id`, `provider_mode`                         | Scope remote identifiers/account validation and distinguish test/live records                  |
| `provider_session_id`                                          | Xendit `ps-...`; nullable for manual and historical Midtrans                                   |
| `provider_payment_id`, `provider_request_id`                   | Xendit payment/request IDs; copy historical Midtrans transaction ID into payment ID            |
| `checkout_url`, `checkout_expires_at`                          | Hosted redirect and remote session deadline                                                    |
| `currency`                                                     | Explicit `IDR`; backfill historical records                                                    |
| `checkout_state`                                               | `creating`, `ready`, `unknown`, `failed`, `closed`; separate from financial status             |
| `creation_lease_expires_at`                                    | Recovery coordination for interrupted creator; expiry alone never authorizes unsafe POST retry |
| `request_snapshot`                                             | Immutable total/items/customer/reference/return metadata; minimize and restrict access to PII  |
| `provider_status`, `provider_updated_at`, `last_reconciled_at` | Diagnosis and reconciliation scheduling; not a substitute for legal transition rules           |
| `fulfillment_state`, `review_reason`                           | Distinguish settled-and-fulfilled from late/excess/mismatched payments needing review          |

Keep `order_id` as the stable local/provider reference and preserve its uniqueness. Add a unique nullable composite remote-session identity scoped by provider/account/mode, plus indexes for unresolved checkout state, pending provider reconciliation, and receipt processing. Validate exact index sizes and nullable uniqueness on the production DB engine. Preserve amount precision in storage; validate whole IDR values at the gateway boundary.

### New durable tables

- `payment_webhook_receipts`: provider/account/mode, dedupe key, optional payment link, event/session identifiers, sanitized payload, digest, received/processed timestamps, processing state, retry/error metadata; unique dedupe index.
- `payment_effects`: payable/payment, effect type, stable effect key, payload needed for replay, state, attempts, completion/error timestamps; unique effect key. Reuse an existing outbox if discovered during implementation rather than adding a parallel one.
- `payment_refund_records`: payment, optional participant registration, amount/currency, provider refund/reference, actual/refund-recorded state, actor/note/timestamps; protect cumulative amount. This replaces unstructured audit-only entries in `raw_notification` without discarding old data.

### Backfill rules

1. Back up and rehearse on an anonymized production snapshot; record counts and money totals by status/payable type before changes.
2. Add nullable columns/tables first; deploy code that can read both schemas' representations.
3. Backfill historical provider from positive evidence: Snap token, Midtrans transaction ID/notification, manual proof/verification, and verified historical collection context. Votes/group restrictions can inform classification but require inspection.
4. Classify ambiguous rows separately for operator review. Do not classify every null Snap token as manual, or every row as Midtrans.
5. Copy `midtrans_transaction_id` into provider-neutral history, `currency=IDR`, and preserve original `paid_at`, financial status, and references. Historical snapshots that cannot be reconstructed reliably must be marked incomplete, not fabricated from changed prices.
6. Backfill providers **before** normalizing category `payment_method=midtrans` to `online`, so old context remains available for classification.
7. Deploy compatibility reads for both `midtrans` and `online`, run a resumable category backfill, then update DB/model/frontend defaults to `online` in a later release.
8. Verify row counts, per-provider/status sums, audit samples, and orphan links; rerun backfill to prove idempotency. Enforce provider constraints after zero unresolved classifications remain.
9. Drop `snap_token` and `midtrans_transaction_id` only in Sprint 6 after export/verification, no code references, and the rollback boundary has explicitly changed to forward-only recovery.

## 7. Exact file work inventory

Paths are relative to the project root. Migration timestamps are generated at implementation time; descriptive suffixes below are the planned filenames.

### 7.1 Create

| New file(s)                                                                                                         | Responsibility                                                            | Sprint |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------ |
| `config/payments.php`                                                                                               | Provider selection, kill switch, TTLs, recovery grace, queue, legacy gate | 1      |
| `app/Services/Payments/Payable.php`                                                                                 | Relocated neutral payable contract                                        | 1      |
| `app/Services/Payments/PaymentGateway.php`                                                                          | Shared gateway interface                                                  | 1      |
| `app/Services/Payments/PaymentGatewayManager.php`                                                                   | Resolve stored provider/default                                           | 1      |
| `app/Services/Payments/CheckoutResult.php`, `PaymentOutcome.php`                                                    | Typed public checkout and normalized trusted outcome                      | 1      |
| `app/Services/Payments/PaymentCheckoutService.php`                                                                  | Attempt locking, reuse, snapshots, unknown outcomes                       | 2      |
| `app/Services/Payments/PaymentReconciler.php`                                                                       | Relocated and strengthened reconciliation                                 | 1–3    |
| `app/Services/Midtrans/MidtransGateway.php`                                                                         | Temporary adapter for existing transport and mapper                       | 1      |
| `app/Services/Xendit/XenditClient.php`, `XenditGateway.php`, `XenditStatusMapper.php`                               | Sessions API, neutral adapter, event/status mapping                       | 2–3    |
| `app/Http/Controllers/XenditWebhookController.php`                                                                  | Authenticate, validate, persist receipt, acknowledge                      | 3      |
| `app/Http/Requests/XenditWebhookRequest.php`                                                                        | Validate envelope and accepted event schemas                              | 3      |
| `app/Http/Resources/PaymentResource.php`                                                                            | Explicit public projection and restricted admin projection as appropriate | 2      |
| `app/Models/PaymentWebhookReceipt.php`, `PaymentEffect.php`, `PaymentRefundRecord.php`                              | Durable ingress, effects, refund audit                                    | 1–3    |
| `database/factories/PaymentWebhookReceiptFactory.php`, `PaymentEffectFactory.php`, `PaymentRefundRecordFactory.php` | Meaningful replay/failure/refund test data                                | 1–3    |
| `app/Jobs/ProcessPaymentWebhook.php`, `ProcessPaymentEffect.php`                                                    | Retryable reconciliation and settlement effects                           | 3      |
| `app/Console/Commands/BackfillPaymentProviders.php`                                                                 | Dry-run, chunked/resumable provider backfill and ambiguity report         | 1      |
| `app/Console/Commands/NormalizePaymentMethods.php`                                                                  | Resumable category normalization after compatibility release              | 4      |
| `app/Console/Commands/ReconcilePendingPayments.php`                                                                 | Batch reconciliation across every unresolved attempt, including votes     | 3      |
| `app/Console/Commands/ReplayPaymentWebhooks.php`, `DispatchPendingPaymentEffects.php`                               | Recover inbox/queue crash gaps and effects                                | 3      |
| `app/Console/Commands/AuditPaymentMigration.php`                                                                    | Read-only totals, unresolved legacy inventory, retirement report          | 5      |
| `database/migrations/*_add_gateway_metadata_to_payments_table.php`                                                  | Additive payment fields/indexes                                           | 1      |
| `database/migrations/*_create_payment_webhook_receipts_table.php`                                                   | Durable webhook ingress                                                   | 1      |
| `database/migrations/*_create_payment_effects_table.php`                                                            | Durable side-effect outbox                                                | 1      |
| `database/migrations/*_create_payment_refund_records_table.php`                                                     | Refund audit                                                              | 3      |
| `database/migrations/*_change_registration_category_payment_method_default.php`                                     | Change default after compatibility deployment                             | 4      |
| `database/migrations/*_drop_legacy_midtrans_columns_from_payments_table.php`                                        | Final destructive contraction                                             | 6      |
| `resources/js/lib/payment-checkout.ts`                                                                              | Hosted URL navigation plus temporary legacy Snap branch                   | 4      |
| `resources/js/components/public/payment-checkout-button.tsx`                                                        | Shared loading/retry/unavailable/resume behavior                          | 4      |
| `tests/Feature/PaymentProviderBackfillTest.php`, `PaymentMethodNormalizationTest.php`                               | Historical conversion and repeatability                                   | 1/4    |
| `tests/Feature/XenditClientTest.php`, `PaymentCheckoutTest.php`                                                     | HTTP contract and attempt creation concurrency                            | 2      |
| `tests/Feature/XenditWebhookTest.php`, `PaymentReconciliationTest.php`, `PaymentEffectRecoveryTest.php`             | Trusted money state, replays, crash recovery                              | 3      |
| `tests/Feature/PaymentGatewayCutoverTest.php`, `PaymentGatewayRetirementTest.php`                                   | Coexistence, routing, drain and final removal                             | 5/6    |
| `tests/Browser/PaymentCheckoutTest.php`, `PaymentReturnTest.php`                                                    | Hosted redirect and return UX with controlled provider doubles            | 4      |
| `docs/payments/xendit-runbook.md`, `migration-checklist.md`, `test-matrix.md`                                       | Operational instructions, rollout evidence, reproducible QA               | 0–6    |

Use Artisan generators with `--no-interaction` for PHP artifacts; follow repository conventions and relevant skills. Avoid redundant layers if an existing equivalent is found during implementation.

### 7.2 Rewrite/update backend, configuration, and persistence

| Existing path                                                                             | Required changes                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/Http/Controllers/RegistrationController.php`                                         | Replace direct client/new token code with checkout service; neutral response; explicit payment projection; safely handle deletion with active remote checkout |
| `app/Http/Controllers/GroupRegistrationController.php`                                    | Same service, immutable group total and per-participant items, preserve all-or-nothing group reservation and one-payment behavior                             |
| `app/Http/Controllers/VoteController.php`                                                 | Same service; freeze amount/quantity; handle voting cutoff and prevent duplicate count                                                                        |
| `app/Http/Controllers/PaymentNotificationController.php`                                  | Legacy-only provider guard; translate to neutral reconciliation; preserve signature check until retirement                                                    |
| `app/Http/Controllers/ManualPaymentVerificationController.php`                            | Import shared reconciler, explicitly require manual provider, preserve organization authorization                                                             |
| `app/Http/Controllers/RegistrationRefundController.php`                                   | Provider-aware instructions and structured refund audit; correct locking/partial amounts; preserve manual workflow                                            |
| `app/Http/Controllers/RegistrationCategoryController.php`                                 | Accept neutral collection method with temporary legacy compatibility; expose provider-aware admin payment/refund details                                      |
| `app/Http/Controllers/AwardController.php`, `LandingController.php`                       | Remove provider-coupled copy/comments and retain whole-IDR validation                                                                                         |
| `app/Models/Payment.php`                                                                  | New fields/casts/constants/scopes, safe serialization, immutable provider/reference/amount guards                                                             |
| `app/Models/Registration.php`, `RegistrationOrder.php`, `Vote.php`                        | Neutral contract and items/customer methods; explicit attempt vs payable expiry; idempotent fulfillment and late-payment policy                               |
| `app/Models/RegistrationCategory.php`                                                     | `online` default/constant plus `manual_transfer`; legacy read bridge during backfill                                                                          |
| `app/Models/BasketballEventCategory.php`                                                  | Provider-neutral descriptive comments                                                                                                                         |
| `app/Providers/AppServiceProvider.php`                                                    | Gateway bindings/manager registration following current container conventions                                                                                 |
| `app/Console/Commands/CheckPaymentStatus.php`                                             | Preserve current positional/`--order` behavior; add exact payment and vote selection; route by provider; include old unresolved attempts                      |
| `app/Console/Commands/ExpireUnpaidRegistrations.php`                                      | Reconcile/cancel before quota release; handle no-payment creation failures; preserve manual policy and race safety                                            |
| `app/Services/RegistrationConfirmationNotifier.php`, `app/Mail/RegistrationConfirmed.php` | Provider-neutral presentation and durable retryable delivery integration                                                                                      |
| `app/Services/Running/RaceEntryService.php`                                               | Provider-neutral language; verify idempotent bib/start-list effects                                                                                           |
| `config/services.php`                                                                     | Add Xendit config; keep temporary Midtrans config; remove it only at retirement                                                                               |
| `config/queue.php`                                                                        | Confirm worker timeout/retry/backoff/after-commit configuration; update only where required                                                                   |
| `routes/web.php`                                                                          | New named Xendit webhook route; retain existing token-based pay/status routes and legacy webhook temporarily                                                  |
| `bootstrap/app.php`                                                                       | Exact Xendit CSRF exception and reconciliation/receipt/effect schedules; remove legacy exception last                                                         |
| `.env.example`                                                                            | Document new fields and temporary legacy requirements, then remove retired values                                                                             |
| `database/factories/PaymentFactory.php`, `RegistrationCategoryFactory.php`                | Provider/attempt/manual/historical states and neutral collection defaults                                                                                     |
| `database/seeders/PaidEventRegistrationSeeder.php`                                        | Xendit/neutral scenario fixtures; no real remote calls                                                                                                        |
| `.github/workflows/tests.yml`, `lint.yml`                                                 | Fake Xendit values, browser installation/job, production-engine concurrency coverage; retain existing checks                                                  |
| `phpunit.xml`, `tests/Pest.php`                                                           | Isolated test settings/shared fixture helpers only as needed; no live credentials                                                                             |

### 7.3 Rewrite/update frontend, translations, and customer communication

- `resources/js/pages/register-dynamic.tsx`: replace `snapToken`/Midtrans props and popup controls with checkout object/shared button; preserve confirmed ID-card view and failed-initial-create recovery.
- `resources/js/pages/group-registration.tsx`: replace local Snap state and popup calls; preserve pending group status, participant details, and retry.
- `resources/js/pages/registration-status.tsx`, `registration-order-status.tsx`, `vote-status.tsx`: render local authoritative status, resume checkout, bounded polling, and delayed-confirmation messaging.
- `resources/js/types/payment.ts`: neutral identifiers and checkout result discriminated union; remove legacy fields only after the compatibility UI retires.
- `resources/js/types/registration-category.ts`: moved to include `online`, `manual_transfer`, and temporary legacy `midtrans` read support.
- `resources/js/types/global.d.ts`: remove Snap globals after the final legacy branch is removed.
- `resources/js/types/award.ts`: retain whole-IDR requirement with provider-neutral explanation.
- `resources/js/pages/dashboard/events/registration-categories/builder.tsx` and `components/builder/settings-panel.tsx`: neutral default and “Online payment” choice; manual-transfer choice remains explicit.
- `resources/js/pages/dashboard/events/registration-categories/show.tsx`: correct provider/refund instructions and review-required payment visibility.
- `resources/js/pages/dashboard/events/registration-categories/components/builder/templates.ts` and `resources/js/components/public/manual-payment-panel.tsx`: provider-neutral descriptions.
- `resources/js/pages/dashboard/events/awards/components/award-form-dialog.tsx`: describe paid votes without hardcoding Midtrans.
- `resources/js/components/landing/site-footer.tsx`, `events-section.tsx`, `resources/js/pages/events/show.tsx`, `registration-categories.tsx`: online-payment copy, enabled channels, and current provider display where relevant.
- `resources/js/pages/terms.tsx`, `privacy.tsx`, `refund-policy.tsx`: accurate Xendit processing and historical-provider refund language.
- `resources/views/emails/registration-confirmed.blade.php`: actual historical provider or neutral payment wording; never label an old Midtrans payment Xendit.
- `lang/app/id.json`: update/add translation keys for all modified English source strings, including timeout/retry/review messaging; verify no stale keys used by active screens.
- Regenerate `resources/js/actions/` and `resources/js/routes/` using the project's Wayfinder workflow where generated output is present.

### 7.4 Existing tests to update and preserve

Update fixtures, neutral response expectations, and provider-parametrized cases in:

- `tests/Feature/PaymentNotificationControllerTest.php` — keep legacy verification coverage through the drain; later preserve equivalent neutral/Xendit behavior tests.
- `tests/Feature/CheckPaymentStatusTest.php`.
- `tests/Feature/RegistrationControllerTest.php`.
- `tests/Feature/GroupRegistrationControllerTest.php`.
- `tests/Feature/VoteControllerTest.php`.
- `tests/Feature/RegistrationCategoryControllerTest.php`.
- `tests/Feature/ManualPaymentProofTest.php`.
- `tests/Feature/RaceRegistrationEntryTest.php`.
- `tests/Feature/RegistrationConfirmationMailTest.php`.
- `tests/Feature/RegistrationRefundTest.php`.
- `tests/Feature/ExpireUnpaidRegistrationsTest.php`.
- `tests/Feature/TeamRegistrationLifecycleTest.php`, `RegistrationPublicUrlTest.php`, `LegalPagesTest.php` where affected.

Preserve existing business coverage. Do not remove test files without approval; obsolete legacy assertions can be rewritten to verify retirement behavior and historical display.

### 7.5 Delete/retire only after completion

- Relocated `app/Services/Midtrans/Payable.php` and `PaymentReconciler.php`: remove old paths once all imports are migrated; temporary compatibility shims must have an explicit removal sprint.
- `app/Services/Midtrans/MidtransClient.php` and temporary `MidtransGateway.php`: delete in Sprint 6 after the drain and rollback gate.
- `app/Http/Controllers/PaymentNotificationController.php`: delete or retire with the legacy route; retain/rewrite its tests appropriately.
- `resources/js/lib/midtrans.ts`, `window.snap`/`MidtransSnapResult` declarations, legacy checkout branch, Midtrans-only props, old client key exposure.
- Midtrans service config, route, CSRF exemption, creation/provider-toggle branches, deployment secrets, and dashboard notification URL.
- `snap_token` and `midtrans_transaction_id` columns after audited copy/export and separate destructive migration.
- `docs/midtrans/README.md` and `docs/midtrans/build-pdf.js`: archive historical onboarding documentation or replace current instructions under `docs/payments/`. Inventory generated artifacts before deciding whether to archive/delete them; keep transaction evidence required for refunds/disputes.
- Do not erase historical `provider=midtrans`, migration history, archived financial references, or historical-provider UI labels merely to obtain zero text search results.

## 8. Sprint plan and test protocols

Suggested delivery: seven ordered sprints, roughly 1–2 weeks each depending on team capacity. Sprint 6 timing is governed by actual transaction drain and financial obligations, not the calendar. Assign named owners to the roles below before starting.

### Sprint 0 — Baseline, API contract, and merchant readiness

**Status:** Completed (2026-10-02).
**Owners:** backend lead, QA, merchant/finance owner, operations. **Dependencies:** none.

#### Tasks

- [x] Capture current payment flow and test baseline for solo/team/group/vote/free/manual paths (158 feature tests, 681 assertions passed).
- [x] Inventory local schema, migration state, and define production DBA/operations inventory procedure in `docs/payments/migration-checklist.md`.
- [x] Verify merchant Payment Sessions access, test key, callback token, account business ID (`6aa92866479c15de3cf34d33`) via live sandbox probes.
- [x] Verify official Create/Get/Cancel Session contract, duplicate-reference handling (409 without session ID), GET /sessions 405 (timeout-after-send requires `unknown` state), allowed checkout domains (`dev.xen.to` / `checkout-staging.xendit.co`).
- [x] Freeze 30-minute session / 24-hour reservation defaults; specify voting deadline and late-payment resolution (`review_required`).
- [x] Confirm one merchant account remains the architecture (audited `Organization`, `Event`, `Payment`, and `config/services.php`).
- [x] Decide package-manager policy (npm is canonical to match CI) and vet browser-test dependencies (Pest Browser 4.3.1 / Playwright 1.63 scheduled for Sprint 4).
- [x] Create `docs/payments/test-matrix.md`, `migration-checklist.md`, and initial runbook `docs/payments/xendit-runbook.md` with sanitized contract fixtures.
- [x] Record acceptance thresholds and rollback triggers from Sprint 5 in checklist and matrix.
- [x] Update `.env.example` with gateway selection, TTL configuration, and Xendit settings.

#### Test protocol

1. Run current affected feature suites listed in section 7.4 against the isolated test DB; record failures before modification rather than attributing them to migration.
2. Run existing `composer types:check`, `npm run types:check`, `npm run lint:check`, and `npm run build` once for baseline.
3. In Xendit test mode, create a PAY session for a small valid IDR amount; complete one enabled channel; capture sanitized create/get/completed/expired examples.
4. Confirm webhook delivery reaches the development HTTPS receiver and validate the callback token without recording its value.
5. Probe duplicate-reference and timeout recovery behavior using disposable test transactions; do not infer idempotency from a single successful request.

**Exit criteria:** product/API contract frozen, merchant prerequisites available, baseline issues recorded, backfill classification understood, and recovery/expiry decisions documented.

### Sprint 1 — Provider-neutral foundation and additive schema

**Owners:** backend, DBA/operations, QA. **Depends on:** Sprint 0.

#### Tasks

- [ ] Add payment metadata, receipt/effect tables and indexes through additive migrations.
- [ ] Move `Payable` and `PaymentReconciler`; implement neutral DTOs/interface/manager and temporary Midtrans adapter.
- [ ] Separate collection method from provider with compatibility reads; keep Midtrans selected for new attempts.
- [ ] Add configuration and validate required values without exposing secrets.
- [ ] Implement provider backfill dry-run/resume and ambiguity reports; rehearse on snapshot.
- [ ] Make status transitions and stable paid timestamps explicit; preserve manual verification through shared reconciliation.
- [ ] Add factory states and tests; review all old namespace imports.

#### Test protocol

1. Run `PaymentProviderBackfillTest` and fresh-install/upgrade migration tests on SQLite and the production DB engine.
2. Seed historical settled/pending/failed-create/manual/group/vote/refund records; verify provider classification, amount totals, identifiers, and idempotent backfill reruns.
3. Run existing webhook, manual proof, group, vote, race, and confirmation suites with Midtrans still selected.
4. Replay settlement twice and then pending/expiry; verify stable payment status and `paid_at`, unchanged vote count/quota, and one fulfillment effect.
5. Verify both old `midtrans` and new `online` category values are readable during compatibility deployment.

**Exit criteria:** compatibility release can serve existing production traffic, all classifications are accounted for, migration rehearsal passes, and baseline payment behavior is preserved.

### Sprint 2 — Xendit checkout creation and recovery

**Owners:** backend, QA. **Depends on:** Sprint 1.

#### Tasks

- [ ] Implement Xendit transport, mapper skeleton, and create/get/cancel operations using verified API contract.
- [ ] Implement checkout coordinator with immutable amount/item/customer snapshots and stored provider routing.
- [ ] Update registration, group, and vote controllers to emit one neutral checkout object.
- [ ] Add public payment resource projection and safe error codes/messages.
- [ ] Implement active-session reuse, creator leases, unknown outcomes, and guarded replacement.
- [ ] Reject stale paid/expired/withdrawn/cutoff purchases and preserve free/manual paths.
- [ ] Introduce exact checkout URL validation and server-generated return URLs.

#### Test protocol

1. `Http::preventStrayRequests()` plus exact `Http::fake()` fixtures: verify Basic Auth, API origin, fields, integer IDR amount, grouped totals, vote quantity, normalized contact data, TTL, and return URLs.
2. Test 201, 400/401/403, duplicate response, 429, 5xx, malformed successful response, connect timeout, and read timeout after remote acceptance.
3. Simulate simultaneous pay calls with real independent DB connections/processes on the production engine; assert at most one remote create and stable local attempt. Sequential SQLite tests alone do not prove concurrency safety.
4. Change category/award pricing after creation; ensure retries reuse the original snapshot.
5. Prove API failure still leaves a recoverable registration/order/vote, and manual/free flows perform no remote call.
6. Verify public JSON/Inertia props contain no keys, callback payloads, snapshots, or internal lease/recovery data.

**Exit criteria:** all three paid flows can create/reuse test sessions; ambiguous failures cannot cause automatic duplicate creation or cross-provider charging.

### Sprint 3 — Webhooks, reconciliation, expiry, and durable effects

**Owners:** backend, operations, QA. **Depends on:** Sprint 2.

#### Tasks

- [ ] Add Xendit ingress, exact CSRF exemption, durable receipt model, and asynchronous processing.
- [ ] Implement validation/binding, deduplication, legal transitions, and review-required exceptions.
- [ ] Implement settlement effect outbox/recovery for registration notification and associated domain work.
- [ ] Generalize `payments:check-status`; add scheduled reconciliation for every unresolved attempt and paid vote.
- [ ] Rewrite expiry around provider status and separate reservation deadlines; prevent quota races.
- [ ] Implement structured refund records and provider-aware manual refund workflow.
- [ ] Add failed-job/receipt/effect alerts, safe logging, and operational replay commands.

#### Test protocol

1. Verify missing/wrong/empty-config callback token -> 403; authentic completed/expired -> durable receipt and quick 2xx; DB failure -> non-2xx.
2. Test unknown reference, wrong provider/account/session ID/amount/currency/country/session type, invalid event-status pair, and malicious metadata; no fulfillment occurs.
3. Deliver completed twice, expired then completed, completed then expired, callback before create-response persistence, and callbacks for an older attempt. Assert financial history remains accurate and fulfillment occurs at most once.
4. Crash between receipt commit and queue dispatch, during processing, and after financial commit before effects finish. Redispatch/replay must converge without double quota/votes/bibs.
5. Stop mail service and workers, recover them, and prove pending effects are eventually processed without rerunning financial transitions.
6. Time-travel through session expiry, reservation deadline, grace period, provider outage, and late settlement. Check exact quota and `review_required` outcome.
7. Simulate scheduler/webhook/refund races with production-engine locking; verify no negative quota, double refunds, or resurrected cancelled entries.
8. Run manual-proof, race-entry, team lifecycle, confirmation, refund, and expiry regression suites.

**Exit criteria:** delayed/replayed/out-of-order events, worker crashes, and expiry races are recoverable; manual and free paths remain covered.

### Sprint 4 — Hosted checkout UI and end-to-end staging acceptance

**Owners:** frontend, backend, QA, merchant owner. **Depends on:** Sprints 2–3.

**Current status (2026-10-04):** in progress. The dual-provider controller/page integration, deletion safety, category payment-method normalization, Xendit dashboard webhook URL/token test, Sprint 3 dedicated lifecycle tests, shared legacy/manual reconciliation boundaries, and provider-aware refund workflow are implemented/verified locally. Browser acceptance, matched sandbox settlement, staging operations checks, and full-suite verification remain open.

#### Tasks

- [ ] Implement neutral checkout button/helper across all five payment pages. _(Page-level provider-aware behavior exists; shared extraction remains optional/pending.)_
- [x] Use full-page navigation for external hosted checkout, not an Inertia SPA request to Xendit; handle JSON pay endpoints consistently.
- [ ] Implement pending/preparing/retry/expired/review states, bounded status polling, and restore the original status page on success/cancel return. _(Core retry/status pages are updated; browser verification remains pending.)_
- [x] Keep legacy Snap presentation for existing Midtrans attempts during coexistence.
- [x] Update category builder/defaults and add a tested stored category collection-method normalization command.
- [ ] Update frontend types, emails, translations, legal/help copy, provider display, and Wayfinder output.
- [ ] Install approved browser-test tools and add controlled provider doubles to browser tests.
- [ ] Execute actual Xendit sandbox channel acceptance separately from deterministic CI tests.

#### Test protocol

1. Browser-test individual/team registration, multi-participant group, and paid vote: create -> hosted redirect -> return pending -> verified completion -> confirmed/count reflected.
2. Return before webhook, browser cancel/back/refresh, popup blockers irrelevant to redirect flow, mobile wallet return, slow network, duplicate clicks, expired session, and failed initial create.
3. Forge success query parameters and directly open a success-return page; payment remains pending without trusted server confirmation.
4. Run legacy Midtrans active checkout, manual proof/approval/rejection, free registration, and free vote browser regressions.
5. Verify Indonesian/English labels, keyboard operation, focus/loading feedback, mobile widths, and no browser console errors.
6. Sandbox UAT for every enabled channel family: successful payment, unavailable/failed channel attempt, abandonment/expiry, delayed notification, and supported refund/dashboard procedure. Use provider-supported test controls; document unavailable simulations.
7. Run `npm run types:check`, `npm run lint:check`, `npm run format:check`, `npm run build`; run affected PHP suites and browser tests.

**Exit criteria:** complete customer journeys and finance/support procedures pass in staging, with a signed test matrix and no blocker defects.

### Sprint 5 — Production canary, cutover, and rollback rehearsal

**Owners:** operations, backend lead, QA, finance/support. **Depends on:** Sprint 4.

#### Tasks

- [ ] Deploy additive/compatible application with both adapters, migrations/backfill complete, and queue/scheduler healthy.
- [ ] Configure live Xendit secret, callback token/business ID, webhook URL, channel activation, HTTPS returns, and operational dashboards.
- [ ] Run a controlled low-value live purchase and dashboard reconciliation/refund exercise where supported; record local/provider IDs and outcomes.
- [ ] Enable Xendit for a server-controlled canary event/cohort or controlled rollout period. Persist provider at attempt creation; keep a stable cohort across requests.
- [ ] Increase new-payment traffic to Xendit only after metrics and money totals meet thresholds.
- [ ] Rehearse rollback to the compatible dual-provider release; verify existing Xendit sessions still receive webhooks and reconciliation.
- [ ] Disable new Midtrans creation after full cutover; continue legacy callbacks/status checks and necessary existing checkout support.
- [ ] Run daily per-provider reconciliation including fees/settlement reports separately from customer-paid amounts.

#### Test protocol

1. `PaymentGatewayCutoverTest`: switch defaults between providers; old attempts keep their provider and new attempts follow the selected default.
2. Run compatible-release rollback in staging with pending/paid transactions from both providers; no status loss, checkout duplication, or dropped callback.
3. Production smoke: one authorized low-value live journey, webhook, local payment, registration/vote effects, email, and finance report. Verify no test-mode checkout URL/account appears.
4. Check dashboard totals against local gross paid/refunded amounts; investigate every discrepancy rather than accepting net settlement as gross paid value.
5. Inject controlled staging failures: Xendit unavailable, queue down, scheduler delayed, invalid config. Confirm alerts and the checkout kill switch while callbacks remain enabled.

**Initial operational gates (confirm against baseline in Sprint 0):**

- Zero unresolved duplicate charges, amount/account mismatches, incorrect confirmations, or unexplained money-total differences.
- Webhook ingress p95 below 2 seconds and processing normally within 60 seconds; alert when oldest unprocessed receipt/effect exceeds 5 minutes.
- Pause expansion if checkout creation errors exceed 2% over 15 minutes with at least 50 attempts, or if a material deterioration against the baseline occurs at lower volume. Distinguish user declines from integration errors.
- Observe each canary stage through a representative traffic period and expiry cycle. Require at least seven stable days after full cutover as an initial observation floor, extended for low volume and pending provider obligations.

**Rollback:** disable new online checkout creation first for a money-integrity defect. Investigate unknown attempts; switch only genuinely new attempts back to Midtrans if safe. Keep the dual-provider application/schema, Xendit credentials, and Xendit webhook processing active. Never restore a pre-migration database over new financial events or roll back to a Midtrans-only binary.

**Exit criteria:** all new online payments use Xendit, stable metrics and daily reconciliation, rollback rehearsal passed, and Midtrans creation is disabled.

### Sprint 6 — Drain and remove Midtrans

**Owners:** backend, operations, finance, QA. **Depends on:** Sprint 5 plus actual drain gates.

#### Mandatory drain gates

- [ ] Zero unresolved pending/creating/unknown Midtrans attempts, including older attempts hidden by a latest-payment query.
- [ ] All legacy remotely payable checkouts are completed, expired, or canceled according to authoritative provider status.
- [ ] Late settlements, refunds, disputes, and receipt/effect backlogs reconciled or assigned to a documented historical-provider process.
- [ ] Latest possible payment lifetime, provider callback retry horizon, and agreed observation margin have elapsed; record the account-specific values instead of assuming a fixed 24 hours is sufficient.
- [ ] No new Midtrans creation observed since cutover; compatible-release rollback window formally closed.
- [ ] Historical provider IDs/amounts/statuses/refund records exported and backup restore verified; key-retirement timing does not block required historical operations.

#### Tasks

- [ ] Run read-only retirement audit and finance sign-off against drain gates.
- [ ] Remove legacy client/adapter, old namespace shims, controller/route/CSRF exception, Snap loader/globals/UI branches, and provider toggles.
- [ ] Remove Midtrans env entries/config/deployment secrets; disable provider notification URL, then revoke unused keys when no other integration or historical operation needs them.
- [ ] Deploy code that no longer reads legacy columns; observe it before the separate destructive schema migration.
- [ ] Drop legacy columns after copy/archive verification and tested backup recovery; retain neutral historical provider metadata.
- [ ] Archive onboarding documentation/artifacts and publish final Xendit-only runbook.
- [ ] Rewrite obsolete legacy test expectations into retirement/historical-data tests; preserve business assertions.
- [ ] Remove stale generated routes/assets/caches using the normal build/deploy process and restart workers.

#### Test protocol

1. `PaymentGatewayRetirementTest`: new checkout is Xendit-only, old provider history remains readable, retired webhook route cannot mutate state, and no runtime Midtrans credentials are required.
2. Run upgrade migrations against representative historical data and `migrate:fresh` on an isolated test DB. Compare per-status/provider totals and refund references before/after contraction.
3. Search active application/config/frontend/route code for `Midtrans`, `midtrans`, `snap_token`, `snapToken`, `window.snap`, and `MIDTRANS_`; review every result. Allow historical provider labels, historical migrations/tests, and archived docs, but no active calls/imports/secrets.
4. Build assets and inspect browser network activity: no Snap download or Midtrans request on Xendit journeys.
5. Run the complete PHP suite, PHP static analysis, frontend checks/build, browser checkout suite, and targeted post-deployment Xendit/manual/free smoke tests.
6. Restore backup in an isolated environment and verify historical transaction lookups; document forward-fix recovery after destructive cleanup.

**Exit criteria:** active Midtrans integration and credentials retired, historical financial evidence intact, Xendit operations documented, all final checks pass.

## 9. Verification commands and evidence standards

Run commands from the project root against isolated test configuration. Examples are commands for implementation sprints, not checks already executed for this document.

```powershell
# Existing focused tests: run the relevant files for each change.
php artisan test --compact tests/Feature/PaymentNotificationControllerTest.php
php artisan test --compact tests/Feature/CheckPaymentStatusTest.php
php artisan test --compact tests/Feature/RegistrationControllerTest.php
php artisan test --compact tests/Feature/GroupRegistrationControllerTest.php
php artisan test --compact tests/Feature/VoteControllerTest.php
php artisan test --compact tests/Feature/ManualPaymentProofTest.php

# New focused suites, after creating them.
php artisan test --compact tests/Feature/XenditClientTest.php
php artisan test --compact tests/Feature/PaymentCheckoutTest.php
php artisan test --compact tests/Feature/XenditWebhookTest.php
php artisan test --compact tests/Feature/PaymentReconciliationTest.php
php artisan test --compact tests/Feature/PaymentEffectRecoveryTest.php
php artisan test --compact tests/Browser/PaymentCheckoutTest.php
php artisan test --compact tests/Browser/PaymentReturnTest.php

# Formatting after PHP edits, then quality checks.
vendor/bin/pint --dirty --format agent
composer types:check
npm run types:check
npm run lint:check
npm run format:check
npm run build

# Release gates.
php artisan test --compact
php artisan route:list --path=webhooks
php artisan schedule:list
```

Implementation must consult Laravel Boost `search-docs` for installed-version APIs before code changes, and `database-schema` before migrations when available. Those tools were not exposed in the planning session; schema inspection remains an explicit Sprint 0 task.

For each test scenario, record: sprint/task ID, build/commit, environment/provider mode, sanitized local and remote IDs, fixture/channel, expected result, actual result, timestamps, evidence link, tester, and follow-up defect. Do not put secrets or full customer data in evidence.

Deterministic CI uses faked HTTP and no real keys. Real sandbox UAT and limited live smoke tests are separate. A green SQLite suite does not substitute for production-engine locking tests; a green fake API suite does not prove merchant channel activation.

## 10. Definition of done

- [ ] Xendit is the only provider for newly created online payments across registration, group checkout, and paid voting.
- [ ] Provider-neutral services and public response types are implemented; manual/free behavior and organization authorization pass regression tests.
- [ ] Correct immutable amounts and original references survive retries, price edits, and cutover.
- [ ] Authenticated notifications, durable processing, legal transitions, duplicate-charge handling, and late-payment exceptions are verified.
- [ ] Confirmation, quota, bib/start-list, and vote effects are idempotent and recoverable after worker failure.
- [ ] Every enabled payment channel has UAT evidence, and each sprint's exit criteria are met.
- [ ] Support can reconcile, replay, investigate, and record provider-correct refunds without editing the database manually.
- [ ] Cutover and rollback are rehearsed; monitoring and daily finance reconciliation are operational.
- [ ] Midtrans is drained and removed from active code/config/assets/secrets, with historical financial data retained.
- [ ] Documentation, translations, email/legal copy, generated routes, and deployment configuration reflect the completed architecture.

## 11. Official Xendit references

Reviewed on 2026-10-02; recheck endpoint schemas and account availability in Sprint 0.

- Documentation index: <https://docs.xendit.co/llms.txt>
- One-time hosted Payment Sessions: <https://docs.xendit.co/docs/payment-1.md>
- Create Session API and schema: <https://docs.xendit.co/apidocs/create-session.md>
- Session webhook schema: <https://docs.xendit.co/apidocs/webhook-notification-sent-defined-webhook-url-updates-payment-session.md>
- Webhook authentication, duplicate delivery, and ordering: <https://docs.xendit.co/docs/handling-webhooks.md>
- API key creation, permissions, and test/live separation: <https://docs.xendit.co/docs/api-keys.md>
- Get Session / Cancel Session references to verify during implementation: <https://docs.xendit.co/apidocs/get-session.md> and <https://docs.xendit.co/apidocs/cancel-session.md>
- Product migration context to review before choosing legacy Invoice APIs: <https://docs.xendit.co/docs/migrate-to-payment-session.md>
