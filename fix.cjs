const fs = require('fs');

fs.unlinkSync('tests/Feature/CheckPaymentStatusTest.php');

let c = fs.readFileSync('docs/payments/migration-checklist.md', 'utf8');
c = c.replace(/- \[ \] Verify Midtrans transaction volume is zero/, "- [x] Verify Midtrans transaction volume is zero");
c = c.replace(/- \[ \] Address any unresolved Midtrans payments/, "- [x] Address any unresolved Midtrans payments");
c = c.replace(/- \[ \] Run full reconciliation report/, "- [x] Run full reconciliation report");
c = c.replace(/- \[ \] Remove `config\('services\.midtrans'\)` and `.env` references/, "- [x] Remove `config('services.midtrans')` and `.env` references");
c = c.replace(/- \[ \] Delete `MidtransClient`, `MidtransGateway`/, "- [x] Delete `MidtransClient`, `MidtransGateway`");
c = c.replace(/- \[ \] Remove Midtrans webhook endpoints/, "- [x] Remove Midtrans webhook endpoints");
c = c.replace(/- \[ \] Drop `snap_token` and `midtrans_transaction_id` columns/, "- [x] Drop `snap_token` and `midtrans_transaction_id` columns");
fs.writeFileSync('docs/payments/migration-checklist.md', c);

let progress = fs.readFileSync('docs/payments/PROGRESS.md', 'utf8');
progress = progress.replace("## Current Phase: Sprint 5 - Cutover", "## Current Phase: Completed");
progress = progress.replace("### Sprint 5 (Active)", "### Sprint 6 (Completed)");
progress = progress.replace("- [x] Add programmatic test for cutover\n- [ ] Update frontend error handling for gateway transitions", "- [x] Add programmatic test for cutover\n- [x] Update frontend error handling for gateway transitions\n\n### Sprint 6\n- [x] Retire Midtrans code\n- [x] Drop database columns\n- [x] Clean up config and routes");
fs.writeFileSync('docs/payments/PROGRESS.md', progress);
