# Midtrans to Xendit Migration Progress

**Updated:** 2026-10-03

**Current phase:** Sprint 4 in progress

## Verified status

- Sprints 1–2 infrastructure is implemented and the focused backfill, Xendit client, checkout, legacy Midtrans, and controller suites pass.
- Sprint 3 lifecycle code is implemented, but dedicated webhook, neutral reconciliation, and effect-recovery tests remain outstanding.
- Registration, group registration, and paid voting now create checkout attempts through `PaymentCheckoutService`.
- Public payment pages branch by stored provider: Midtrans continues to open Snap, while Xendit uses a full-page hosted checkout redirect.
- New attempts persist a frozen amount, item, customer, and description snapshot; replacement attempts reuse it.
- Midtrans remains the default provider. Xendit is dormant until `PAYMENT_GATEWAY=xendit` is explicitly configured.

## Verification performed

- 79 focused checkout, Xendit client, registration, group-registration, and voting tests: **passing** (361 assertions).
- Legacy payment notification/status/manual-payment tests: **passing** (21 tests, 73 assertions).
- Provider backfill tests: **passing** (6 tests, 21 assertions).
- TypeScript type-check: **passing**.
- Targeted ESLint and Prettier checks: **passing**.
- Laravel Pint: **passing**.
- Production Vite build: **passing**.
- Full Pest suite: **not yet verified**; the local run exceeded the five-minute harness timeout without producing a failure report.

## Remaining before Sprint 4 completion

- Protect deletion when any remotely payable checkout is active.
- Move legacy Midtrans webhook/manual decisions onto the shared reconciler or document the temporary compatibility boundary.
- Complete provider-aware refund records and group partial-refund behavior.
- Normalize category collection values from `midtrans` to `online` with a tested, resumable command.
- Add the dedicated Sprint 3 tests and browser checkout/return coverage.
- Run the complete Pest suite with a sufficient timeout and perform staging UX verification.

## Security follow-up

Rotate the Xendit test credentials that were previously displayed during local configuration verification before reuse.
