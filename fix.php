<?php
$content = file_get_contents('resources/js/pages/group-registration.tsx');
$content = preg_replace("/\s*midtransClientKey: data\.midtransClientKey,\r?\n\s*midtransIsProduction: data\.midtransIsProduction,/", "", $content);
$content = preg_replace("/\s*snapToken: data\.snapToken,/", "", $content);
$content = str_replace("{payment.snapToken || payment.checkoutUrl ?", "{payment.checkoutUrl ?", $content);
file_put_contents('resources/js/pages/group-registration.tsx', $content);

$content = file_get_contents('resources/js/pages/register-dynamic.tsx');
$content = str_replace("import { loadSnapScript } from '@/lib/midtrans';\r\n", "", $content);
$content = str_replace("import { loadSnapScript } from '@/lib/midtrans';\n", "", $content);
$content = preg_replace("/midtransClientKey\?: string \| null;\r?\n\s*midtransIsProduction\?: boolean;/", "", $content);
$content = preg_replace("/\s*snapToken: string \| null;/", "", $content);
$content = preg_replace("/\s*midtransClientKey: string \| null;\r?\n\s*midtransIsProduction: boolean;/", "", $content);
$content = preg_replace("/\s*if \(!snapToken \|\| !midtransClientKey\).*?\}\);\r?\n\s*\}\);\r?\n\s*\}\)/s", "", $content);
$content = str_replace("{snapToken || checkoutUrl ?", "{checkoutUrl ?", $content);
$content = preg_replace("/snapToken=\{snapToken \?\? null\}\r?\n\s*midtransClientKey=\{midtransClientKey \?\? null\}\r?\n\s*midtransIsProduction=\{midtransIsProduction\}/", "", $content);
file_put_contents('resources/js/pages/register-dynamic.tsx', $content);

$content = file_get_contents('resources/js/pages/vote-status.tsx');
$content = preg_replace("/if \(!payload\.snapToken.*?\}\);\r?\n\s*\}\)/s", "throw new Error('Payment checkout is unavailable.');\n            })", $content);
file_put_contents('resources/js/pages/vote-status.tsx', $content);
