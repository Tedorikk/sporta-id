# Xendit Payment Gateway Operations Runbook

**Last updated:** 2026-10-04<br>
**Audience:** Development, Operations, Support teams

> **Migration status:** Sprint 4 is in progress. Midtrans remains the default active gateway unless `PAYMENT_GATEWAY=xendit` is explicitly configured. Xendit test credentials that were previously exposed must be rotated before reuse in any shared or persistent environment.

## Overview

Sporta ID uses Xendit Payment Sessions (PAY mode, PAYMENT_LINK) for online payments including:
- Individual and team event registrations
- Group registrations (one payment for multiple participants)
- Paid award voting

This runbook covers operational procedures for the Xendit integration. For the overall migration plan, see `plan.md`. For testing procedures, see `test-matrix.md`. For deployment tracking, see `migration-checklist.md`.

## Architecture Summary

```
User → Registration/Vote → PaymentCheckoutService → XenditGateway → Xendit API
                                ↓
                          Payment (DB)
                                ↓
Xendit Webhook → XenditWebhookController → ProcessPaymentWebhook (Job) → PaymentReconciler
                                                                                ↓
                                                                    ProcessPaymentEffect (Job)
                                                                                ↓
                                                            Confirmation Email, Bib Assignment, etc.
```

### Key Components

| Component | Responsibility |
|-----------|---------------|
| `PaymentCheckoutService` | Checkout creation, snapshot, deduplication, lease management |
| `XenditGateway` | HTTP transport, request/response mapping |
| `XenditWebhookController` | Authentication, validation, receipt persistence |
| `ProcessPaymentWebhook` | Webhook processing, binding, reconciliation dispatch |
| `PaymentReconciler` | State transitions, fulfillment decisions, effect creation |
| `ProcessPaymentEffect` | Idempotent side effects (email, quota, bib, vote count) |
| `ReconcilePendingPayments` | Scheduled retrieval and reconciliation |
| `PaymentWebhookReceipt` | Durable webhook ingress and deduplication |
| `PaymentEffect` | Durable outbox for side effects |

### Current Verification Caveats

- Focused payment/controller suites pass locally, but the full Pest suite has not yet been recorded as passing because the previous full run exceeded the harness timeout.
- Dedicated Sprint 3 lifecycle tests for webhook ingress, reconciliation, and effect recovery pass locally; staging/provider webhook delivery still needs manual verification.
- Xendit dashboard webhook URL/token test succeeded for Payment Session Completed against the configured ngrok `/webhooks/xendit` URL on 2026-10-04.
- The successful dashboard webhook test proves URL reachability and token validation. It does not prove matched settlement for a real app-created checkout; run a sandbox checkout/payment before Sprint 4 exit.
- Hosted-checkout browser tests or equivalent documented manual browser evidence are still pending for Sprint 4 exit.

## Environment Configuration

### Required Variables

| Variable | Purpose | Example | Secret |
|----------|---------|---------|--------|
| `PAYMENT_GATEWAY` | Active provider for new payments | `xendit` or `midtrans` | No |
| `PAYMENT_CHECKOUT_ENABLED` | Kill switch for new checkouts | `true` | No |
| `XENDIT_SECRET_KEY` | API authentication | `xnd_...` | **Yes** |
| `XENDIT_WEBHOOK_TOKEN` | Webhook authentication | Random string | **Yes** |
| `XENDIT_BUSINESS_ID` | Account identifier for validation | `603...` | No |
| `XENDIT_MODE` | Deployment assertion | `test` or `live` | No |
| `XENDIT_API_BASE_URL` | API endpoint | `https://api.xendit.co` | No |
| `XENDIT_CURRENCY` | Fixed currency | `IDR` | No |
| `XENDIT_COUNTRY` | Fixed country | `ID` | No |
| `APP_URL` | External HTTPS origin | `https://sporta.id` | No |

### Configuration Files

- `config/payments.php` - Payment system configuration
- `config/services.php` - Xendit credentials mapping
- `.env` - Environment-specific values

### Verify Configuration

```bash
php artisan config:show payments
php artisan config:show services.xendit
```

## Common Operations

### 1. Check Payment Status

**By registration reference:**
```bash
php artisan payments:check-status <registration-reference>
```

**By order ID:**
```bash
php artisan payments:check-status --order=<order-id>
```

**By payment ID:**
```bash
php artisan payments:check-status --payment=<payment-id>
```

This retrieves the current status from Xendit and reconciles locally.

### 2. Reconcile All Pending Payments

Run manually or via cron (recommended: hourly):

```bash
php artisan payments:reconcile-pending
```

This finds all payments in `creating`, `pending`, or `unknown` checkout states and retrieves their current status.

### 3. Replay Unprocessed Webhooks

If webhook processing crashed or queue workers were down:

```bash
php artisan payments:replay-webhooks
```

Re-dispatches jobs for receipts that haven't been processed.

### 4. Dispatch Pending Effects

If effect processing failed or workers crashed:

```bash
php artisan payments:dispatch-effects
```

Re-dispatches jobs for incomplete side effects (emails, quota, bibs).

### 5. Audit Migration Status

Check provider distribution and unresolved payments:

```bash
php artisan payments:audit-migration
```

Shows:
- Payment counts by provider and status
- Money totals by provider
- Unresolved legacy attempts
- Retirement readiness

### 6. Monitor Queue

**Check queue size:**
```bash
php artisan queue:monitor payments
```

**Process queue manually (dev only):**
```bash
php artisan queue:work --queue=payments --once
```

**Production:** Ensure supervised workers are running.

### 7. Disable New Checkouts (Emergency)

```bash
# In .env
PAYMENT_CHECKOUT_ENABLED=false
```

Then:
```bash
php artisan config:cache
```

Existing payments can still be reconciled and completed. New checkout attempts return a maintenance message.

### 8. Switch Payment Provider

To use Midtrans for new payments (rollback scenario):
```bash
# In .env
PAYMENT_GATEWAY=midtrans
```

To use Xendit:
```bash
# In .env
PAYMENT_GATEWAY=xendit
```

Then:
```bash
php artisan config:cache
```

**Important:** This only affects NEW payment attempts. Existing payments continue using their stored provider.

## Monitoring

### Key Metrics

1. **Payment creation success rate**
   - Alert if <95% over 15 minutes
   - Check Xendit API status, credentials, network

2. **Webhook delivery latency**
   - Normal: <10 seconds from payment to webhook
   - Alert if receipts unprocessed >5 minutes

3. **Effect processing latency**
   - Normal: Confirmation email within 1 minute of settlement
   - Alert if effects pending >10 minutes

4. **Reconciliation coverage**
   - Alert if any payment pending >1 hour
   - Check cron scheduler and command errors

5. **Unmatched webhooks**
   - Alert on any webhooks that can't find a payment
   - Indicates reference/session ID mismatch or missing local record

### Log Patterns to Monitor

**Success:**
```
[Xendit] Session created: ps-... for payment <order-id>
[Webhook] Receipt received: <dedupe-key>
[Reconciler] Payment <order-id> settled
[Effect] Confirmation sent: <registration-id>
```

**Errors:**
```
[Xendit] Session creation failed: <error>
[Webhook] Authentication failed: <IP>
[Webhook] Unmatched payment: session <ps-...>
[Reconciler] Amount mismatch: expected <X>, got <Y>
[Effect] Effect failed after <N> attempts: <effect-key>
```

### Database Queries

**Pending payments:**
```sql
SELECT id, order_id, provider, status, checkout_state, created_at
FROM payments
WHERE checkout_state IN ('creating', 'pending', 'unknown')
AND created_at > NOW() - INTERVAL 24 HOUR;
```

**Unprocessed webhooks:**
```sql
SELECT id, event_type, received_at, processing_state
FROM payment_webhook_receipts
WHERE processing_state != 'processed'
ORDER BY received_at DESC
LIMIT 50;
```

**Failed effects:**
```sql
SELECT id, effect_type, effect_key, state, attempts, updated_at
FROM payment_effects
WHERE state = 'failed'
ORDER BY updated_at DESC
LIMIT 50;
```

**Recent settlements:**
```sql
SELECT p.id, p.order_id, p.provider, p.amount, p.paid_at, p.status
FROM payments p
WHERE p.status = 'settlement'
AND p.paid_at > NOW() - INTERVAL 1 HOUR
ORDER BY p.paid_at DESC;
```

## Troubleshooting

### Payment stuck in "creating" state

**Symptoms:** Checkout button shows "preparing payment" indefinitely.

**Causes:**
- API timeout after request sent (unknown outcome)
- Application crash during session creation
- Creation lease not cleared

**Resolution:**
1. Check `creation_lease_expires_at` - if expired, lease is stale
2. Check `provider_session_id` - if present, session was created
3. Manually reconcile:
   ```bash
   php artisan payments:check-status <order-id>
   ```
4. If session exists at Xendit, will update to `ready` state
5. If no session, checkout can be retried safely

### Payment stuck in "pending" state

**Symptoms:** User paid via Xendit, but confirmation not sent.

**Causes:**
- Webhook not delivered
- Webhook processing failed
- Queue worker down
- Effect processing failed

**Resolution:**
1. Check if webhook received:
   ```sql
   SELECT * FROM payment_webhook_receipts
   WHERE session_id = '<ps-...>' OR reference_id = '<order-id>';
   ```
2. If no receipt, webhook not delivered:
   - Check Xendit webhook configuration
   - Check webhook URL accessibility
   - Manually reconcile payment:
     ```bash
     php artisan payments:check-status <order-id>
     ```
3. If receipt exists but unprocessed:
   ```bash
   php artisan payments:replay-webhooks
   ```
4. If receipt processed but payment still pending:
   - Check failed jobs table
   - Check payment amount/account binding
   - Review application logs for reconciliation errors
5. If payment settled but effect pending:
   ```bash
   php artisan payments:dispatch-effects
   ```

### Webhook authentication failures

**Symptoms:** Xendit dashboard shows webhook delivery failures (403).

**Causes:**
- Incorrect `XENDIT_WEBHOOK_TOKEN`
- Configuration not reloaded after change
- Token mismatch between Xendit dashboard and application

**Resolution:**
1. Verify token in Xendit dashboard matches `.env`
2. Reload configuration:
   ```bash
   php artisan config:cache
   ```
3. Test webhook delivery from Xendit dashboard
4. Check application logs for token comparison

### Amount or account mismatch

**Symptoms:** Payment quarantined, not settling.

**Causes:**
- Webhook from different Xendit account
- Payment amount changed between creation and callback
- Currency mismatch
- Test/live mode mismatch

**Resolution:**
1. Find quarantined payment:
   ```sql
   SELECT * FROM payments
   WHERE review_reason LIKE '%mismatch%' OR review_reason LIKE '%amount%';
   ```
2. Check webhook receipt payload:
   ```sql
   SELECT payload FROM payment_webhook_receipts WHERE session_id = '<ps-...>';
   ```
3. Compare:
   - `business_id` in webhook vs `XENDIT_BUSINESS_ID`
   - `amount` in webhook vs payment.amount
   - `currency` in webhook vs payment.currency
   - `provider_mode` in webhook vs payment record
4. If legitimate payment but wrong account, manual reconciliation required
5. If test payment in production, ignore and mark resolved
6. If amount genuinely different, investigate snapshot vs actual charge

### Duplicate charges

**Symptoms:** User reports double charge for single registration.

**Causes:**
- User completed checkout twice from different sessions
- Retry after timeout resulted in second successful payment
- Both sessions settled before either was reconciled

**Prevention:**
- PaymentCheckoutService reuses active sessions
- Reconciler detects duplicate settlement
- Second settlement recorded as `excess_payment` with `review_required`

**Resolution:**
1. Find both payments:
   ```sql
   SELECT * FROM payments
   WHERE payable_type = '<type>' AND payable_id = <id>
   ORDER BY paid_at;
   ```
2. First settlement should have fulfilled registration/vote
3. Second settlement should be marked `fulfillment_state = 'excess_payment'`
4. Issue refund for second payment:
   - Record in `payment_refund_records`
   - Process refund via Xendit dashboard (manual workflow)
   - Update payment status to `refund`

### Late payment after reservation expired

**Symptoms:** Payment succeeded but registration/vote not counted.

**Causes:**
- User paid near reservation deadline
- Payment succeeded after local expiry released quota
- Voting window closed before payment completed

**Resolution:**
1. Payment should be marked `fulfillment_state = 'late_payment'`, `review_reason = 'reservation_expired'` or `'voting_closed'`
2. Check if quota/vote can be restored:
   - For registrations: Check current quota availability
   - For votes: Check if voting period still active
3. If capacity available, manually fulfill:
   - Update payment `fulfillment_state = 'fulfilled_manually'`
   - Confirm registration or count vote
   - Send confirmation email
4. If no capacity, issue refund (see duplicate charges)

### Unknown payment session from webhook

**Symptoms:** Webhook received for session not in database.

**Causes:**
- Race condition: webhook faster than creation commit
- Database write failed after Xendit session created
- Payment record deleted before webhook arrived
- Webhook from wrong environment (test vs live)

**Resolution:**
1. Check receipt:
   ```sql
   SELECT * FROM payment_webhook_receipts
   WHERE processing_state = 'unmatched';
   ```
2. Search by reference_id:
   ```sql
   SELECT * FROM payments WHERE order_id = '<reference>';
   ```
3. If payment exists but no session ID:
   - Bind session ID to payment (one-time update)
   - Reprocess webhook
4. If payment truly missing:
   - Check deleted_at if soft-deletes enabled
   - Review creation logs around webhook time
   - If legitimate payment, restore payment record or issue refund
5. If test webhook in production:
   - Verify `XENDIT_MODE` and `XENDIT_BUSINESS_ID`
   - Ignore and mark receipt processed

### Queue workers not processing jobs

**Symptoms:** Receipts/effects piling up, no processing.

**Causes:**
- Supervisor not running
- Workers crashed
- Database connection lost
- Queue configuration incorrect

**Resolution:**
1. Check supervisor status:
   ```bash
   sudo supervisorctl status
   ```
2. Restart workers:
   ```bash
   sudo supervisorctl restart laravel-worker:*
   ```
3. Check worker logs for errors
4. Verify queue connection:
   ```bash
   php artisan queue:monitor payments
   ```
5. Manually process one job to test:
   ```bash
   php artisan queue:work --queue=payments --once
   ```
6. After recovery, replay missed work:
   ```bash
   php artisan payments:replay-webhooks
   php artisan payments:dispatch-effects
   ```

### Xendit API errors

**HTTP 401 Unauthorized:**
- Check `XENDIT_SECRET_KEY` is correct
- Verify key is for correct mode (test vs live)
- Reload config: `php artisan config:cache`

**HTTP 400 Bad Request:**
- Review request payload in logs
- Common issues: invalid currency, amount format, reference length, customer data format
- Check API version compatibility

**HTTP 403 Forbidden:**
- API key lacks required permissions
- Check key permissions in Xendit dashboard

**HTTP 404 Not Found:**
- Session ID doesn't exist or expired
- Check mode (test vs live)
- Check business ID

**HTTP 429 Rate Limited:**
- Too many requests
- Implement backoff in retries
- Check for runaway loops

**HTTP 500/502/503 Server Error:**
- Xendit service issue
- Check Xendit status page
- Retry with exponential backoff
- If persistent, contact Xendit support

**Connection timeout:**
- Network issue or Xendit slow
- Check `XENDIT_CONNECT_TIMEOUT_SECONDS` and `XENDIT_TIMEOUT_SECONDS`
- Payment state becomes `unknown` if request was sent
- Reconcile manually after timeout

## Refund Procedures

Refunds are currently a manual workflow assisted by structured audit records.

### Recording a Refund

1. **Process refund in Xendit dashboard:**
   - Navigate to payment in Xendit dashboard
   - Initiate refund through Xendit UI
   - Record Xendit refund ID

2. **Record in application:**
   - Navigate to registration/order details in admin
   - Click "Record Refund"
   - Enter:
     - Amount (partial or full)
     - Xendit refund ID
     - Reason/note
   - Submit

3. **Verify:**
   - Payment status updated to `refund` (full) or amount decremented (partial)
   - Record created in `payment_refund_records`
   - Cumulative refund amount doesn't exceed original payment
   - For group registrations, only selected participant refunded

### Group Registration Partial Refund

For group registrations (one payment, multiple participants):

1. Identify participant to refund
2. Calculate participant's amount (check original snapshot)
3. Process refund in Xendit for that amount
4. Record refund and link to specific registration in group
5. That participant's registration marked refunded
6. Other participants in group remain active

**Do not mark entire order as refunded unless all participants refunded.**

## Scheduled Tasks

Ensure these are configured in cron/scheduler:

```bash
# Reconcile pending payments
0 * * * * php artisan payments:reconcile-pending

# Dispatch pending effects (recovery)
*/15 * * * * php artisan payments:dispatch-effects

# Replay unprocessed webhooks (recovery)
*/15 * * * * php artisan payments:replay-webhooks

# Expire unpaid registrations
0 * * * * php artisan registrations:expire-unpaid
```

## Security Checklist

- [ ] `XENDIT_SECRET_KEY` stored in secret manager, not committed
- [ ] `XENDIT_WEBHOOK_TOKEN` stored in secret manager, not committed
- [ ] Webhook route exempt from CSRF (intended, not session-based)
- [ ] Webhook token validated using constant-time comparison
- [ ] Missing/invalid token returns 403 before processing
- [ ] Webhook URL is HTTPS only
- [ ] `APP_URL` configured correctly for return URLs
- [ ] Request snapshots contain PII, access restricted
- [ ] Payment API responses use explicit resource, not full model serialization
- [ ] Raw webhook payloads logged/stored in minimized form

## Rollback Procedure

If critical issues with Xendit after cutover:

1. **Set gateway back to Midtrans:**
   ```bash
   # In .env
   PAYMENT_GATEWAY=midtrans
   php artisan config:cache
   ```

2. **Verify Midtrans still functional:**
   - Test registration payment flow
   - Check Midtrans credentials still valid
   - Verify Midtrans webhook still receiving

3. **Continue reconciling Xendit payments:**
   - Do NOT disable `PAYMENT_LEGACY_XENDIT_ENABLED`
   - Webhooks continue processing
   - Cron continues reconciliation
   - In-flight Xendit payments must settle

4. **Identify and resolve issue:**
   - Review error logs
   - Check configuration
   - Verify credentials/permissions
   - Test in staging

5. **Re-cutover when ready:**
   ```bash
   PAYMENT_GATEWAY=xendit
   php artisan config:cache
   ```

## Disaster Recovery

### Lost webhook deliveries

If webhooks weren't delivered due to downtime:

1. Identify time window of outage
2. Run reconciliation for that period:
   ```bash
   php artisan payments:reconcile-pending
   ```
3. Check for any payments created during outage still pending
4. Manually reconcile specific payments if needed

### Database backup restore

If database restored from backup:

1. Recent webhook receipts may be lost
2. Recent effects may be lost
3. Run recovery commands:
   ```bash
   php artisan payments:reconcile-pending
   php artisan payments:dispatch-effects
   ```
4. Check for duplicate confirmation emails (idempotency should prevent, but verify)

### Provider account compromised

If Xendit API key or webhook token compromised:

1. **Immediately rotate credentials in Xendit dashboard**
2. **Update application secrets:**
   ```bash
   # Update .env or secret manager
   XENDIT_SECRET_KEY=<new-key>
   XENDIT_WEBHOOK_TOKEN=<new-token>
   php artisan config:cache
   ```
3. **Restart all workers:**
   ```bash
   sudo supervisorctl restart laravel-worker:*
   ```
4. **Audit recent payments:**
   - Check for unauthorized transactions
   - Review webhook logs for suspicious IPs
5. **Contact Xendit support if unauthorized transactions found**

## Support Escalation

### User Issues
- User didn't receive confirmation → Check pending payments and effects
- User paid but not registered → Check payment status and fulfillment state
- User wants refund → Follow refund procedure

### Technical Issues
- Payment gateway down → Check Xendit status page, enable maintenance mode if needed
- High error rate → Check logs, credentials, network connectivity
- Data inconsistency → Run audit command, review reconciliation logs

### Xendit Support Contact
- Dashboard: https://dashboard.xendit.co
- Support: support@xendit.co
- Status page: status.xendit.co (check for known issues)
- Provide: business_id, payment_session_id, timestamp, error details

## Historical Midtrans Payments (Post-Retirement)

After Midtrans retirement, historical Midtrans payments remain in database with `provider = 'midtrans'`.

**For refunds/disputes on old Midtrans payments:**
1. Find payment record (has `provider_payment_id` from old `midtrans_transaction_id`)
2. Access archived Midtrans credentials (from secret manager archive)
3. Log into Midtrans dashboard directly
4. Process refund/dispute in Midtrans
5. Record outcome in `payment_refund_records` with `provider = 'midtrans'`

**Do not attempt to process Midtrans refunds through Xendit or vice versa.**

## Appendix: Payment State Machine

```
[New Payable]
      ↓
  (checkout initiation)
      ↓
[creating] → (timeout/error) → [unknown/failed]
      ↓
   (success)
      ↓
   [ready] → (redirect to Xendit)
      ↓
  (pending payment)
      ↓
   [pending]
      ↓
      ├─ (user pays) → [settlement] → (fulfill) → [fulfilled]
      ├─ (expires) → [expire]
      ├─ (cancels) → [cancel]
      └─ (late after reservation expired) → [settlement] → [late_payment] (manual review)
      
[fulfilled] → (refund) → [refund] (partial or full)
[settlement] → (duplicate) → [excess_payment] (needs refund)
[unknown] → (reconcile) → [resolved to actual state]
```

**Terminal states:** `settlement`, `expire`, `cancel`, `refund`  
**Requires action:** `unknown`, `failed`, `late_payment`, `excess_payment`, `review_required`
