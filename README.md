# Viper Business App

React/TypeScript online-order invoicing, inventory, parties, cash/bank, expenses and reports, with mobile-only Android storage in app-private SQLite. Currency is PKR across screens, invoices and exports. An optional Express/JSON backend supports web development. Includes a Capacitor Android project and GitHub Actions APK workflow.

## Local development

Requires Node **22.12+** (Node 22/24 in CI).

```powershell
npm ci
npm run dev
```

Frontend: `http://localhost:3000`. Backend: `http://127.0.0.1:4000`. An occupied API port fails explicitly instead of silently switching away from the Vite proxy.

```powershell
npm run type-check
npm test
npm run build
npm start
```

Production serves UI/API on port 4000. `VYAPAR_DATA_DIR` overrides the root `data` directory consistently in development and production. Tests use isolated temporary stores.

## Android

See [ANDROID.md](ANDROID.md) for GitHub Actions APK artifacts, optional signed releases, offline storage, status/navigation bar handling and local compilation without installation.

Android works without a server or internet. A new install starts empty and opens Business Profile setup. Saved invoices, payments, stock and reports persist locally; no demo business is installed. Browser offline preview is available at `http://localhost:3000/?offline=1` using IndexedDB. WhatsApp and external sharing require their respective apps/services.

## Accounting behavior

- The shared accounting engine calculates discounts, amounts, CGST/SGST or explicit interstate IGST. Client totals are previews.
- Stock and financial updates commit together with reversible effects. Returns reference an original invoice and cannot exceed its quantities.
- Payments allocate to a selected invoice or oldest outstanding invoices. Remove linked payments/returns before deleting the original invoice.
- Create online sales bills from New Invoice: select the customer and products, enter quantities and payment details, and include the order reference or delivery instructions. Existing sales records remain available.
- Reports use net sales and configured unit purchase cost captured at sale time; returns reverse that cost. This method is not FIFO or weighted average.
- Valid restores preserve a pre-restore copy. Invalid/unreadable stores fail instead of being replaced with demo data. Keep independent backups and review legacy records before upgrading.

## QA

[Fix verification](qa/FIX-VERIFICATION.md) records changes and validation limits. [Original QA report](qa/QA-REPORT.md) and its probe output preserve pre-fix findings; they are historical evidence rather than current pass/fail results.

Amounts are denominated in PKR; existing numeric amounts are preserved without foreign-exchange conversion. Legacy tax fields remain available; this is not a Pakistan tax-filing integration.

Pushes trigger only the Android APK build. Full CI/emulator checks are manual-only in Actions. Open **Backup & Restore** from the main menu to export a timestamped JSON backup or restore a saved one.
