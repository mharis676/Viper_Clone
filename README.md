# Vyapar App — Full-Stack Business Accounting, GST Invoicing, Inventory & POS

A production-ready full-stack clone of the **Vyapar App**, engineered for MSMEs, retailers, wholesalers, and accountants. Built with **React 18, TypeScript, Vite, Node.js, Express, and SQLite/JSON Relational Persistence**.

Includes seamless automated CI/CD builds via **GitHub Actions**.

---

## 🚀 Key Modules & Capabilities

### 1. 📊 Real-Time Business Dashboard
- **Financial Status KPI Cards**: Cash in Hand, Bank Accounts, Accounts Receivable (To Collect), Accounts Payable (To Pay), Total Sales, Total Purchases, and Stock Valuation.
- **Low Stock Alarms**: Real-time alert banner identifying products that have reached reorder thresholds.
- **Recent Invoices**: Quick view and instant thermal/laser reprint for latest billing activities.

### 2. 🧾 Tax Invoicing & Inbound Purchases
- **GST Invoices**: Automatic calculation of CGST, SGST, IGST, discounts, and line-item totals.
- **Estimates / Quotations**: Fast quote generation with **1-Click Conversion to Sale Invoice**.
- **Payment In & Payment Out**: Settle invoices with automatic party balance adjustments.
- **Sales & Purchase Returns**: Credit and debit notes with automatic inventory reconciliation.

### 3. ⚡ High-Speed Point of Sale (POS) Counter
- **Multi-Tab Billing**: Hold bills (Bill 1, Bill 2, Bill 3...) to serve multiple counter customers simultaneously without losing cart progress.
- **Barcode Scanner Integration**: Instant barcode / SKU reader support with auto-addition to active cart.
- **Product Fast-Grid**: One-click quick billing product catalog with category navigation.
- **Split Tender & Change Calculation**: Cash, UPI QR, Card, and Credit modes with automatic return change calculation.
- **Instant Thermal Receipt**: 1-click checkout generating 80mm/58mm thermal receipts with dynamic UPI QR codes and barcodes.

### 4. 📦 Inventory & Stock Management
- **Catalog**: Item SKU code, EAN-13/Code128 barcode generator, HSN/SAC codes, and unit types (Pcs, Box, Kg, Ltr, Mtr).
- **Stock Adjustments**: Quick `+ Add` or `- Reduce / Waste` stock modal.
- **Low Stock Filter**: Filter products below minimum stock thresholds in a single click.

### 5. 👥 Parties (Customers & Suppliers) & Double-Entry Ledger
- **Directory**: Track customer and supplier credit limits, GST numbers, addresses, and phone numbers.
- **Account Statements**: Complete date-wise double-entry debit/credit ledger statement with running balance.
- **WhatsApp Payment Reminders**: Generate personalized payment collection reminder links with UPI payment details.

### 6. 💸 Expenses & Cash/Bank Accounts
- **Operating Expenses**: Track rent, salaries, utilities, and logistics by category with automatic account debiting.
- **Cash & Bank Registers**: Monitor till cash and multiple bank accounts.
- **Contra Funds Transfer**: Inter-account transfers (e.g. daily counter till cash deposits into bank).

### 7. 📈 Comprehensive Financial Reports & GSTR Suite
- **Profit & Loss Statement**: Real-time Gross Profit and Net Profit calculation factoring in sales, inventory cost, and operational expenses.
- **GST Tax Report**: GSTR-1 (Output GST on sales) and GSTR-2 (Input Tax Credit on purchases) reconciliation with Net GST Liability payable.
- **Stock Valuation Summary**: Audit purchase cost valuation vs. retail selling valuation and projected margins.
- **CSV / Excel Exporter**: One-click CSV download for all reports.

### 8. 🖨️ Settings & Print Customizer
- **Company Profile**: Customize business name, trade name, GSTIN, bank details, and UPI ID.
- **Print Layouts**: Switch between **Thermal 80mm roll** and **Laser A4 Tax Invoice**.
- **Backup & Disaster Recovery**: Instant JSON database download and 1-click restore.

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt + S` | Open New Sale Invoice |
| `Alt + P` | Open New Purchase Bill |
| `F2` | Open Point of Sale (POS) Counter |
| `Ctrl + K` | Global Spotlight Search (Parties, Items, Invoices) |
| `Esc` | Close Active Modal / Dialog |
| `Ctrl + P` | Print Current Receipt / Invoice |

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Lucide Icons, JsBarcode, QRCode
- **Backend**: Node.js, Express, TypeScript
- **Database**: Relational embedded transactional store (`data/vyapar_db.json`)
- **Testing**: Vitest, Supertest
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml`)

---

## 📦 Setup & Installation

### Prerequisites
- Node.js (v18.x, v20.x, or v22.x)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
Starts both backend API (`http://localhost:5000`) and Vite frontend (`http://localhost:3000`):
```bash
npm run dev
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Run TypeScript Validation
```bash
npm run type-check
```

### 5. Build for Production
```bash
npm run build
```

### 6. Start Production Server
Serves the unified full-stack application on port 5000:
```bash
npm start
```
Visit `http://localhost:5000` in your browser.

---

## 🤖 GitHub Actions Workflow

The repository includes `.github/workflows/ci.yml` that automatically:
1. Runs on every `push` and `pull_request` to `main` / `master`.
2. Tests against a multi-Node matrix (`18.x`, `20.x`, `22.x`).
3. Runs `npm ci`, `npm run type-check`, `npm test`, and `npm run build`.

Zero external database services or native compiler tools are required, ensuring 100% reliable GitHub Actions builds.
