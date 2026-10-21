# Fix verification — 20 October 2026

`QA-REPORT.md` describes the original build. Historical probe output is baseline evidence; `server/__tests__/regressions.test.ts` contains the current assertion-based checks.

| Original findings | Changes |
|---|---|
| 1–4: deletion, returns, oversell, failed requests | Atomic rollback and file replacement, aggregate stock checks, original-invoice return limits, reversible account/party/stock postings, linked-deletion protection |
| 5: trusted totals | Server derives amounts, identity, tax and status; input validation and duplicate invoice protection |
| 6: restore | Record/collection validation before replacement, pre-restore copy, corrupt stores fail explicitly |
| 7: production store | Stable root directory and `VYAPAR_DATA_DIR`; no automatic merge |
| 8: initial tax | Shared calculation functions for initial/added/changed lines and API totals |
| 9: P&L | Net revenue minus captured cost of sold quantities; returns reverse cost/revenue; unsold purchases remain inventory |
| 10: tests | Temporary per-worker stores with cleanup |
| 11: ledger | Transaction dates and chronological running balances |
| 12: settlement | Payments allocate to a selected/oldest invoice; reversal restores outstanding amounts |
| 13: transfers | Numeric, positive, sufficient-funds and distinct-account checks; audit records |
| 14: opening balance | Delta applied to current balance and running ledger |
| 15: missing flows | Payment-in/out forms and original-invoice sale/purchase return actions |
| 16–18: POS | Explicit zero tender, credit flow, split payments across accounts, real walk-in identity, preserved drafts and discard confirmation |
| 19: discounts/quotes | Recalculated discounts and selling-price quotation defaults |
| 20: GST export | Dedicated GST CSV, escaped fields, correct routing and Android sharing |
| 21: print | Signature/terms/tax options, PKR currency and no Indian UPI payment QR, document titles, IGST, POS thermal selection, native print bridge |
| 22–23: UI | Responsive drawer/wrapping/stacked POS, safe areas, touch targets, labeled controls and dialog focus/Escape behavior |
| 24: tax | Explicit interstate IGST toggle; return tax treatment follows original; filtered party roles |
| 25: reorder | Inventory opens with low-stock filter active |

## Verification and boundaries

- TypeScript, web/backend build and all **44 automated tests** passed locally.
- Android lint, APK and instrumentation-test compilation passed locally. Dedicated Android 16 emulator acceptance covers empty setup, offline transactions and persistence, and portrait/landscape invoice bounds.
- Browser saved a 750 + 135 tax = 885 invoice, then settled it through the payment form.
- Browser simulation reserves 32px status and 48px navigation areas at 390px width. Document width measured 390px; Save button bottom measured 567px, above the 592px usable bottom edge. Screenshot: [safe modal footer](android-invoice-safe-area.png).
- Actions includes the broader Android 15/16 matrix with a tall cutout and gesture/three-button navigation; remote results remain to be reviewed after push.
- All four native acceptance tests passed on the offline Android 16 emulator, including explicit Android intent resolver and print spooler detection. The final build also passed all four tests with a tall cutout and three-button navigation, checking invoice header/footer bounds in portrait and landscape. An earlier emulator System UI freeze prompted stricter assertions and a clean restart.
- Dependency audit was clean after updates. Android lint has upstream template/dependency suggestions but no errors in the local build.

The APK is mobile-only with app-private SQLite and no backend requirement. New installs contain no demo business. Stable signed distribution needs the secrets in [ANDROID.md](../ANDROID.md). No remote workflow was pushed/run or physical phone installed. Review Actions results and smoke-test the signed artifact on the target phone before distribution.

PKR labels and Pakistan number formatting are applied throughout the UI, invoice output, reminders and CSV exports. Numeric values are preserved; no exchange-rate conversion was performed. Indian UPI QR controls are removed; legacy backup fields are retained. Existing business records were not rewritten. Legacy lines without captured costs use catalog purchase price as a compatibility fallback. Root and old `dist/data` datasets must be reviewed rather than automatically merged. New records capture configured unit cost when sold; this is not FIFO/weighted-average accounting or statutory certification.

Final native polish removes the unwanted Android action/title bar before enabling edge-to-edge. Verified invoice header and actions clear the status bar and three-button navigation area: [portrait](android-final/invoice-portrait-safe-area.png), [landscape](android-final/invoice-landscape-safe-area.png).

Native print verification checks that Android opens its print spooler. The emulator print-preview screenshot did not render reliably, so physical printer/PDF visual output remains a signed-artifact smoke check.

Workflow update: pushes now run only the single Android APK build job, without CI/emulator/test jobs. Full QA remains available by manually running CI / Build & Test. Backup & Restore is directly accessible from the main menu; exports use timestamped names and restore asks before replacement.
