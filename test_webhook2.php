<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Jobs\ProcessPaymentWebhook;
use App\Models\Payment;
use App\Models\PaymentWebhookReceipt;
use App\Services\Payments\PaymentReconciler;
use App\Services\Xendit\XenditStatusMapper;
use Illuminate\Contracts\Console\Kernel;

$payload = json_decode(<<<'EOT'
{
    "created": "2026-10-07T05:39:10.389Z",
    "business_id": "6aa92866479c15de3cf34d33",
    "event": "payment_session.completed",
    "data": {
        "mode": "PAYMENT_LINK",
        "items": [
            {
                "name": "Sporta Fun Run 2027 — AAA",
                "type": "FEE",
                "category": "EVENT",
                "quantity": 1,
                "reference_id": "47",
                "net_unit_amount": 100000
            }
        ],
        "amount": 100000,
        "locale": "en",
        "status": "COMPLETED",
        "country": "ID",
        "created": "2026-10-07T05:38:39.862Z",
        "updated": "2026-10-07T05:39:10.297Z",
        "currency": "IDR",
        "metadata": {
            "payment_id": "9",
            "description": "Sporta Fun Run 2027 — AAA"
        },
        "expires_at": "2026-10-07T06:08:39.000Z",
        "payment_id": "py-078491da-3a57-420a-8ff9-5fd00f7a0d52",
        "business_id": "6aa92866479c15de3cf34d33",
        "customer_id": "cust-d3f48b7b-168f-46ce-a8a5-6d17a799d5c4",
        "reference_id": "ORD-20261007053839-340EAB",
        "session_type": "PAY",
        "capture_method": "AUTOMATIC",
        "payment_link_url": "https://dev.xen.to/WYgv9zPf",
        "payment_request_id": "pr-e2927b73-226e-46ae-9b1a-1420600ad982",
        "payment_session_id": "ps-6ac5dadf2ab524f46f87135d",
        "success_return_url": "https://sporta.web.id/registrations/7e1cead4-3df3-4edb-ace2-8995e8e44081/status",
        "latest_payment_request_id": "pr-e2927b73-226e-46ae-9b1a-1420600ad982"
    },
    "api_version": "v1"
}
EOT, true);

// Create a dummy payment in DB to match
$payment = Payment::create([
    'payable_type' => 'App\Models\Registration',
    'payable_id' => 1,
    'order_id' => 'ORD-20261007053839-340EAB',
    'amount' => '100000.00',
    'currency' => 'IDR',
    'status' => 'pending',
    'provider' => 'xendit',
    'provider_account_id' => '6aa92866479c15de3cf34d33',
    'provider_mode' => 'test',
    'provider_session_id' => 'ps-6ac5dadf2ab524f46f87135d',
]);

// Create receipt
$receipt = PaymentWebhookReceipt::create([
    'provider' => 'xendit',
    'provider_account_id' => '6aa92866479c15de3cf34d33',
    'provider_mode' => 'test',
    'event_type' => 'payment_session.completed',
    'session_id' => 'ps-6ac5dadf2ab524f46f87135d',
    'reference_id' => 'ORD-20261007053839-340EAB',
    'dedupe_key' => 'dedupe123',
    'payload_digest' => 'digest123',
    'sanitized_payload' => $payload,
    'processing_state' => 'received',
    'received_at' => now(),
]);

echo 'Payment created: '.$payment->id."\n";
echo 'Receipt created: '.$receipt->id."\n";

$job = new ProcessPaymentWebhook($receipt);
$job->handle(
    app(XenditStatusMapper::class),
    app(PaymentReconciler::class)
);

$receipt->refresh();
echo 'Receipt state: '.$receipt->processing_state."\n";
if ($receipt->processing_state === 'failed') {
    echo 'Failure reason: '.$receipt->failure_reason."\n";
}
