<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$r = App\Models\Registration::where('status', 'pending_payment')->first();
if ($r) { $res = app(App\Http\Controllers\RegistrationController::class)->pay($r); echo json_encode($res->getData()); }
