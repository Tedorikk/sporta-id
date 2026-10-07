# Midtrans to Xendit Migration Progress

**Updated:** 2026-10-07

**Current phase:** Sprint 6 (Midtrans Retirement)

## Verified status

- Sprints 1–2 infrastructure is implemented and the focused backfill, Xendit client, checkout, legacy Midtrans, manual-payment, status-check, and controller suites pass.
- Sprint 3 lifecycle code and dedicated webhook, neutral reconciliation, and effect-recovery test files are implemented and passing locally.
- Registration, group registration, and paid voting now create checkout attempts through `PaymentCheckoutService`.
- Registration deletion now blocks active or unresolved online checkout attempts before deleting local records.
- Category payment methods now default to `online`, keep legacy `midtrans` compatibility, and can be normalized with `payments:normalize-methods`.
- Replaced the legacy `App\Services\Midtrans\PaymentReconciler` boundary, migrating `PaymentNotificationController`, `ManualPaymentVerificationController`, and `CheckPaymentStatus` to use the shared generic `App\Services\Payments\PaymentReconciler`.
- Registration refunds are now provider-aware, persist structured `PaymentRefundRecord`s, and correctly handle group-order partial refunds.
- Xendit dashboard webhook URL/token test succeeded for Payment Session Completed against the configured tunnel URL.
- Public payment pages branch by stored provider: Midtrans continues to open Snap, while Xendit uses a full-page hosted checkout redirect.
- New attempts persist a frozen amount, item, customer, and description snapshot; replacement attempts reuse it.
- Midtrans remains the default provider. Xendit is dormant until `PAYMENT_GATEWAY=xendit` is explicitly configured.
- Implemented automated tests for Provider Cutover & Coexistence (`PaymentGatewayCutoverTest`).
- Built audit command `payments:audit-migration` for verifying the drain period prior to Midtrans retirement.

## Verification performed

- 106 focused payment, checkout, Xendit client, legacy Midtrans, manual-payment, status-check, registration, group-registration, and voting tests: **passing** (455 assertions).
- TypeScript type-check: **passing**.
- Targeted ESLint and Prettier checks: **passing**.
- Laravel Pint: **passing**.
- `git diff --check`: **passing**.
- Production Vite build: **passing**.
- Registration deletion-safety and checkout regression suites: **passing** (35 tests, 186 assertions) on 2026-10-04.
- Expanded focused payment lifecycle suites, including Sprint 3 dedicated tests: **passing** (125 tests, 518 assertions) on 2026-10-04.
- Payment-method normalization, registration category, manual payment, and registration controller suites: **passing** (60 tests, 313 assertions) on 2026-10-04.
- Full Pest test suite now fully passing (599 tests, 3079 assertions) on 2026-10-05. Category backfill migration tests failures resolved.

## Next Phase: Sprint 6 Midtrans Retirement
- Execute Midtrans code removal and cleanup once drain period is over.



## Security follow-up

Rotate the Xendit test credentials that were previously displayed during local configuration verification before reuse in any shared or persistent environment.
