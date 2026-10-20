# Viper / Vyapar App QA report

**Historical baseline.** See [current fix verification](FIX-VERIFICATION.md) for changes and remaining release checks.

Reviewed 20 October 2026. **Recommendation: hold release for business accounting use.**

Build and happy-path checks pass, but accounting integrity and recovery paths have release-blocking defects. Found **25 issues: 10 high priority (P1), 15 medium priority (P2)**. P1 means fix before relying on persisted business records; P2 means a materially broken workflow, misleading output, or usability defect.

## Coverage and evidence

- `npm run type-check`: passed.
- `npm test`: 11/11 passed across two suites. These suites mutate the working database and can race; see issue 10. Changes introduced by this run were removed after inspection of the Git diff. The working database has no remaining diff.
- `npm run build`: frontend and backend passed.
- Built production UI opened at `http://localhost:4001` because 4000 was already occupied. Smoke navigation covered dashboard, parties, items, sales, POS, purchases, expenses, accounts, reports, and settings.
- Browser checks covered initial invoice totals, Escape dismissal, product selection/cart arithmetic, navigation away from POS, and a narrow embedded viewport. DOM measurement: viewport 658 × 668, document width 1274 pixels. Screenshot: [dashboard-narrow.png](dashboard-narrow.png).
- Isolated API probes use copied build output and a disposable database, removed in `finally`. Reproduce with `npm run build` then `node qa/probe.mjs`. Structured observations: [probe-results.json](probe-results.json). The probe is a diagnostic script, not an assertion-based regression suite; successful execution means observations were collected, not that the app passed.
- Findings below explicitly distinguish **runtime** verification from **source** inspection. No application fixes were made.

## High priority findings

### 1. P1 — Deleting an invoice does not reverse financial postings

**Runtime:** Create a sale for 118, receive 50, leave 68 due, then delete it. Cash remains 1050 instead of returning to 1000; customer balance remains 68 instead of 0; both ledger entries remain. Stock alone returns to its original value. Purchase/payment deletion shares the incomplete reversal path.

**Impact:** Dashboard totals, customer balances, cash, and invoice list disagree after an ordinary supported action.

**Location:** `server/db.ts:586` (`deleteTransaction`). Reverse all linked postings atomically or create an auditable reversal transaction.

### 2. P1 — Returns update inventory without reversing financial effects

**Runtime + source:** POST a `sale_return`: stock increases from 5 to 6, but party balance, cash, and ledger remain unchanged. Delete that return: stock stays 6. Source also omits return types from financial reports and purchase-return deletion rollback.

**Expected:** Return posting and cancellation reconcile inventory, refund/credit, party ledger, and report totals according to the original transaction.

**Location:** `server/db.ts:534`, `:545`, `:570`, `:586`, `:774`, `:803`.

### 3. P1 — Overselling followed by deletion manufactures stock

**Runtime:** Begin with stock 5; submit a sale quantity of 10. API accepts it (201), clamps stock to 0, then deleting that sale sets stock to 10. Original stock was 5.

**Cause:** `adjustStock` clamps values, while reversal adds the entire original quantity.

**Location:** `server/db.ts:497`, `:526`, `:592`. Validate availability before posting or use a consistent negative-stock policy with reversible arithmetic.

### 4. P1 — Rejected transactions still enter application state

**Runtime:** POST `/api/transactions` with `{ "type": "sale" }`. Response is 400, but transaction count increases from 0 to 1 because insertion precedes `items.forEach`. A subsequent successful persistence can save the malformed transaction.

**Impact:** Failed requests leave invalid records that can break dashboard/table rendering. Partial writes are also possible because each stock adjustment persists during transaction creation.

**Location:** `server/db.ts:523`. Validate first and commit all effects as one operation; rejected requests must leave no state change.

### 5. P1 — Server accepts contradictory financial totals

**Runtime:** Submit a line worth 118 but set `total: 1`, `paidAmount: 50`, `balanceDue: -999`. API returns 201 and changes the customer's balance to -999.

**Source:** No runtime schema or reconciliation protects transaction amounts, quantities, identifiers, types, or totals. TypeScript types do not validate HTTP bodies. Invoice number uniqueness is also unenforced.

**Location:** `server/index.ts` POST `/api/transactions`; `server/db.ts:518`. Validate payloads and derive authoritative totals and statuses server-side.

### 6. P1 — Structurally invalid backups overwrite the database

**Runtime:** Restore `{ "profile": {}, "items": [] }`. API responds 200; dashboard immediately responds 500 (`Cannot read properties of undefined (reading 'forEach')`). Required collections and profile fields are absent.

**Impact:** A successful restore can make the application unusable and replace the previous database.

**Location:** `server/db.ts:825`. Fully validate before replacement and preserve a recoverable pre-restore snapshot.

### 7. P1 — Development and production use different database paths

**Runtime + source:** Source resolves storage beside `server` to root `data/vyapar_db.json`; compiled `dist/server/db.js` resolves to `dist/data/vyapar_db.json`. Production UI displayed the default single invoice, whereas root data contains additional records.

**Reproduce:** Create records during development, build, and run production. Existing development records are absent because production starts a separate store.

**Location:** `server/db.ts:18–21`. Use an explicit stable data directory and a migration strategy.

### 8. P1 — Initial invoice lines have zero calculated tax and total

**Browser + source:** Open New Sale. Default item is 750 × 1 at GST 18%, but row total is 0, tax summary is 0, and grand total is 750. Correct calculation for that displayed input is 885. Saving without touching a line sends the zero tax values. Adding a new line repeats the defect.

**Location:** `src/components/InvoiceModal.tsx:55–68`, `:135–151`. Initialize and recalculate lines through the same calculation path.

### 9. P1 — Profit report equates purchases with cost of goods sold

**Runtime + source:** A sale of one existing-stock item produces revenue 100, purchases cost 0, gross profit 100, even though that item's unit purchase cost is 420. Unsold purchases would reduce profit in full. Revenue also uses subtotal without deducting discounts; returns are omitted.

**Location:** `server/db.ts:768–790`; displayed as COGS in `src/views/ReportsView.tsx`.

**Expected:** Use a defined inventory costing method and net revenue, with returns reconciled. This is a calculation QA finding, not an accounting-policy certification.

### 10. P1 — Automated tests write into the real working database

**Runtime + source:** `npm test` added a sale, an expense, ledger entries, and changed balances in `data/vyapar_db.json`. Both test files import the same persistent database module; no temporary store or teardown exists. They run as separate workers with separate in-memory snapshots and can overwrite each other's file changes.

**Impact:** Routine QA/CI commands alter business data and test results depend on prior runs. A passing suite is not evidence of data consistency.

**Location:** `server/__tests__/api.test.ts`, `server/__tests__/accounting_and_pos.test.ts`, `server/db.ts:367`. Isolate storage per test worker and restore fixtures independently.

## Medium priority findings

### 11. P2 — Ledger dates and running balances are wrong

**Runtime:** A 118 sale dated 1 January with a 50 payment produces two entries dated 20 October. Both show running balance 68; the debit entry should show 118 before the credit brings it to 68 when starting at zero.

**Location:** `server/db.ts:549–559`, `:602–619`. Record the transaction date and calculate each entry's running balance in order, including backdated entries.

### 12. P2 — Full payment leaves the original invoice marked unpaid

**Runtime:** Create an unpaid 118 invoice, then a payment-in of 118. Customer balance becomes 0, but original invoice remains `unpaid` with balance due 118. No invoice allocation model exists.

**Location:** `server/db.ts:561–566`. Allocate payments and update outstanding invoice views consistently, including partial payments and reversal.

### 13. P2 — Transfer input can corrupt numeric balances

**Runtime:** Transfer amount string `"100"` returns 200: source becomes 900, destination becomes string `"148800100"` through concatenation. A numeric 2000 transfer from cash 1000 is also accepted, producing -1000 despite the failure message mentioning balance checks.

**Location:** `server/index.ts` POST `/api/accounts/transfer`; `server/db.ts:696`. Require finite numeric amounts, distinct valid accounts, and an explicit insufficient-funds policy. Transfers also do not record notes or an audit transaction.

### 14. P2 — Editing opening balance does not update current balance

**Runtime:** Edit opening balance from 0 to 500; current balance remains 0.

**Location:** `server/db.ts:437`. Apply the opening-balance delta and reconcile the ledger rather than changing only the descriptive field.

### 15. P2 — Payment and return tabs have no creation workflow

**Browser + source:** Sales provides New Quotation and New Sale only; Payment In and Sales Return only filter tables. Purchases provides Add Purchase Bill only; Payment Out and Purchase Return also only filter. The available modal callbacks are never invoked with those types from these views.

**Location:** `src/views/SalesView.tsx:52–94`, `src/views/PurchasesView.tsx:46–76`.

### 16. P2 — POS cannot represent a zero-payment credit sale

**Source; input automation was inconclusive:** `activeTab.paidAmount || grandTotal` treats explicit 0 as full payment. Clearing or entering zero therefore becomes exact tender, and checkout records a paid sale.

**Location:** `src/views/PosView.tsx:202`. Separate untouched default tender from explicit zero. README-advertised credit mode and split tender are also absent: one payment mode and one amount are stored.

### 17. P2 — Walk-in checkout falls back to the first named party

**Source:** Selecting Walk-in sets an empty party ID but does not reset party name. Checkout substitutes `parties[0].id` for the empty ID. An unpaid/partial walk-in sale can therefore affect the first customer's balance and be printed with a stale party name.

**Location:** `src/views/PosView.tsx:218–219`, party selector handler around `:353`.

### 18. P2 — Navigating away from POS loses unfinished carts

**Browser + source:** Add a product, navigate Dashboard → POS; the cart is empty. Tabs exist only in component state and conditional routing unmounts POS. Closing a populated tab also discards it without a warning.

**Location:** `src/views/PosView.tsx:39`, `:80`; `src/App.tsx` conditional POS rendering. Persist draft bills or preserve mounted state and warn before destructive draft loss.

### 19. P2 — Item changes leave stale discounts; quotes start at cost price

**Source:** After applying a line discount, changing item computes a new `discountAmount` but does not assign it into the updated line. Line total uses the new discount while invoice discount total uses the old one. Separately, a new quotation initializes its first item's purchase price because initialization checks `type === 'sale'`; adding a quotation line uses sales price instead.

**Location:** `src/components/InvoiceModal.tsx:63`, `:91–109`, `:147`. Use centralized calculation and transaction-type pricing rules.

### 20. P2 — GST export downloads the profit-and-loss CSV

**Source:** Export handler selects stock CSV for stock tab and P&L CSV for every other tab, including GST.

**Reproduce:** Reports → GST Tax Report → Export CSV; resulting filename and metrics are for Profit & Loss.

**Location:** `src/views/ReportsView.tsx:78`. Add a GST exporter and test filename, headers, and totals for each report tab.

### 21. P2 — Print preview ignores settings and asks for full invoice payment

**Source:** Settings exposes signature and terms toggles, but print preview always renders those A4 sections. QR amount is `transaction.total`, even for a partly paid or fully paid invoice. POS's Print Bill (Thermal) uses global paper settings, so default A4 can open instead. Transaction types are all labeled TAX INVOICE in A4.

**Location:** `src/components/PrintPreviewModal.tsx:27–31`, `:97`, A4 terms/signature sections; `src/App.tsx` POS checkout handler. Honor settings and transaction type; payment QR should reflect the intended outstanding collection.

### 22. P2 — Narrow layouts hide essential actions

**Browser:** At 658-pixel viewport width, the document is 1274 pixels wide. A fixed 250-pixel sidebar leaves the main area cramped; header buttons and dashboard actions extend beyond the visible pane. Screenshot linked above.

**Source:** No screen-width media queries exist; POS uses fixed-width columns. This affects the desktop app's side-panel usage as well as smaller devices.

**Location:** `src/index.css:90`, `:190`, `:198`, `:592`. Add responsive navigation, wrapping headers, and stacked POS/modal layouts. Desktop-wide and mobile device matrices remain to be tested.

### 23. P2 — Dialog keyboard and accessibility behavior is incomplete

**Browser + source:** Escape leaves Sale Invoice open. Modal markup lacks dialog semantics and focus trapping; close/trash icon buttons in invoice modal have no accessible name, and form labels are not associated with inputs through `htmlFor`/IDs. POS product cards are clickable divs with no keyboard activation.

**Location:** `src/components/InvoiceModal.tsx`, other modal components, `src/views/PosView.tsx:330`. Add semantic dialogs, accessible names, associated labels, focus restoration/trapping, and keyboard support. Full screen-reader testing remains outstanding.

### 24. P2 — Interstate tax path is unimplemented

**Source:** Invoice and POS creation always split tax equally into CGST/SGST and set IGST to zero. There is no place-of-supply control; purchase defaults can select a customer. A4 preview also omits an IGST total.

**Location:** `src/components/InvoiceModal.tsx:197–199`, `src/views/PosView.tsx:226–228`, `src/App.tsx` unfiltered parties passed to invoice modal. Implement and test explicit supported tax scenarios. No claim of statutory compliance can be established from this QA pass.

### 25. P2 — Reorder Stock opens item creation

**Source:** Dashboard low-stock banner's Reorder Stock calls `onOpenItemModal`, wired to create a new item. It neither filters low-stock inventory nor opens a purchase/stock-replenishment flow.

**Location:** `src/views/DashboardView.tsx` low-stock banner; `src/App.tsx` Dashboard props. Route to an actionable replenishment view with the affected items.

## Additional observations and limits

- Positive control: ordinary POS product selection calculated 750 + 135 tax = 885 correctly. A quotation submitted through the isolated API did not move cash or stock.
- Persistence uses synchronous whole-file writes, catches write errors without propagating failure, and falls back to defaults on parse failure. Disk-full, interrupted-write, and concurrent-process fault injection were not performed. These remain material risks in `server/db.ts:377–395`.
- Initial data loading catches errors only in the console, with no retry/error UI (`src/App.tsx` `loadData`). Backend-outage browser testing was not performed against the user's existing server.
- CSV string fields are quoted without escaping embedded quote characters (`ReportsView` stock export). Special-character import/export coverage remains outstanding.
- No real payments, messages, external integrations, or physical print jobs were performed. Actual PDF pagination, printer sizes, scanner hardware, large datasets, cross-browser behavior, and long-running performance were not certified.
- README advertises port 5000; code uses 4000 and silently increments when occupied. Vite proxy remains fixed at 4000, so a development backend that falls back to another port will not match the proxy.

## Suggested remediation order

1. Isolate test storage; stabilize production data path and backup validation.
2. Add server validation and atomic posting/reversal operations; fix invoice calculations.
3. Reconcile inventory costing, returns, invoice settlement, and dated ledger balances.
4. Complete payment/return UI and preserve POS drafts.
5. Correct exports/printing and responsive/accessibility behavior.

Regression acceptance should assert invariants: rejected operations leave state unchanged; creating then reversing restores all balances; returned stock and financial values reconcile; report exports match the active report; development-to-production preserves the intended dataset.
