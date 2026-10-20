import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BusinessProfile,
  Party,
  Item,
  Godown,
  Transaction,
  Expense,
  ExpenseCategory,
  BankAccount,
  LedgerEntry,
  PrintSettings,
  DashboardStats,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'vyapar_db.json');

export interface DatabaseSchema {
  profile: BusinessProfile;
  parties: Party[];
  items: Item[];
  godowns: Godown[];
  transactions: Transaction[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  accounts: BankAccount[];
  ledgers: LedgerEntry[];
  printSettings: PrintSettings;
}

const defaultDatabase: DatabaseSchema = {
  profile: {
    id: 'prof-1',
    name: 'Vyapar Enterprises Pvt. Ltd.',
    tradeName: 'Vyapar Mart',
    gstin: '29ABCDE1234F1Z5',
    phone: '+91 98765 43210',
    email: 'contact@vyaparmart.in',
    address: 'Plot 42, Tech Park Avenue, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560034',
    upiId: 'vyapar.mart@okhdfcbank',
    bankName: 'HDFC Bank Ltd.',
    accountNumber: '50200012345678',
    ifsc: 'HDFC0001234',
    termsAndConditions: '1. Goods once sold will not be taken back without original bill.\n2. Interest @ 18% p.a. will be charged if bill is not paid within 30 days.\n3. Subject to Bengaluru jurisdiction only.',
  },
  parties: [
    {
      id: 'party-1',
      name: 'Sharma General Stores',
      type: 'customer',
      phone: '9845012345',
      email: 'sharma.stores@gmail.com',
      gstin: '29AAACH7409R1ZX',
      billingAddress: 'Shop 12, Market Road, Bengaluru',
      openingBalance: 15400,
      currentBalance: 15400,
      creditLimit: 50000,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'party-2',
      name: 'Apex Supermarket & Retail',
      type: 'customer',
      phone: '9876543211',
      email: 'billing@apexretail.in',
      gstin: '29AABCA4567C1Z2',
      billingAddress: '4th Block, Jayanagar, Bengaluru',
      openingBalance: 8250,
      currentBalance: 8250,
      creditLimit: 100000,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'party-3',
      name: 'National Electronics Wholesalers',
      type: 'supplier',
      phone: '9811223344',
      email: 'sales@nationalelec.com',
      gstin: '27AABCN8899M1ZT',
      billingAddress: 'Lamington Road, Mumbai',
      openingBalance: -28500,
      currentBalance: -28500,
      creditLimit: 200000,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'party-4',
      name: 'Supreme Packaging & Stationery',
      type: 'supplier',
      phone: '9788990011',
      email: 'supreme.pack@yahoo.com',
      gstin: '29ABCDE9988P1ZQ',
      billingAddress: 'Peenya Industrial Area, Bengaluru',
      openingBalance: -5200,
      currentBalance: -5200,
      creditLimit: 50000,
      createdAt: new Date().toISOString(),
    },
  ],
  items: [
    {
      id: 'item-1',
      name: 'Wireless Bluetooth Optical Mouse',
      code: 'ITM-101',
      barcode: '890103000101',
      category: 'Computer Peripherals',
      unit: 'Pcs',
      purchasePrice: 420,
      salesPrice: 750,
      mrp: 999,
      taxRate: 18,
      hsnCode: '847160',
      minStockAlert: 10,
      currentStock: 45,
      godownId: 'godown-1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-2',
      name: 'Mechanical RGB Keyboard 104-Keys',
      code: 'ITM-102',
      barcode: '890103000102',
      category: 'Computer Peripherals',
      unit: 'Pcs',
      purchasePrice: 1450,
      salesPrice: 2499,
      mrp: 3499,
      taxRate: 18,
      hsnCode: '847160',
      minStockAlert: 5,
      currentStock: 18,
      godownId: 'godown-1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-3',
      name: 'Fast Charging USB-C Braided Cable 2M',
      code: 'ITM-103',
      barcode: '890103000103',
      category: 'Accessories',
      unit: 'Pcs',
      purchasePrice: 95,
      salesPrice: 299,
      mrp: 499,
      taxRate: 18,
      hsnCode: '854442',
      minStockAlert: 20,
      currentStock: 85,
      godownId: 'godown-1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-4',
      name: 'Thermal Receipt Paper Roll 80mm (Pack of 10)',
      code: 'ITM-104',
      barcode: '890103000104',
      category: 'POS Stationery',
      unit: 'Box',
      purchasePrice: 320,
      salesPrice: 550,
      mrp: 650,
      taxRate: 12,
      hsnCode: '4802',
      minStockAlert: 15,
      currentStock: 8, // Low stock demo!
      godownId: 'godown-1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'item-5',
      name: 'Portable USB 3.0 External SSD 1TB',
      code: 'ITM-105',
      barcode: '890103000105',
      category: 'Storage Devices',
      unit: 'Pcs',
      purchasePrice: 4800,
      salesPrice: 6999,
      mrp: 8999,
      taxRate: 18,
      hsnCode: '847170',
      minStockAlert: 5,
      currentStock: 12,
      godownId: 'godown-1',
      createdAt: new Date().toISOString(),
    },
  ],
  godowns: [
    {
      id: 'godown-1',
      name: 'Main Central Godown',
      location: 'Koramangala Warehouse Complex, Gate 3',
      isDefault: true,
    },
    {
      id: 'godown-2',
      name: 'Retail Storefront Counter',
      location: 'Ground Floor Showroom',
      isDefault: false,
    },
  ],
  transactions: [
    {
      id: 'txn-1',
      invoiceNumber: 'INV-2026-001',
      type: 'sale',
      partyId: 'party-1',
      partyName: 'Sharma General Stores',
      date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 27 * 86400000).toISOString().split('T')[0],
      items: [
        {
          itemId: 'item-1',
          itemName: 'Wireless Bluetooth Optical Mouse',
          itemCode: 'ITM-101',
          hsnCode: '847160',
          quantity: 10,
          unit: 'Pcs',
          price: 750,
          discountPercent: 5,
          discountAmount: 375,
          taxRate: 18,
          taxAmount: 1282.5,
          total: 8407.5,
        },
        {
          itemId: 'item-3',
          itemName: 'Fast Charging USB-C Braided Cable 2M',
          itemCode: 'ITM-103',
          hsnCode: '854442',
          quantity: 25,
          unit: 'Pcs',
          price: 299,
          discountPercent: 0,
          discountAmount: 0,
          taxRate: 18,
          taxAmount: 1345.5,
          total: 8820.5,
        },
      ],
      subtotal: 14975,
      discountTotal: 375,
      taxTotal: 2628,
      cgst: 1314,
      sgst: 1314,
      igst: 0,
      total: 17228,
      paidAmount: 10000,
      balanceDue: 7228,
      paymentMode: 'bank',
      status: 'partial',
      notes: 'Delivered via Express Cargo. Thank you for your business!',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
  ],
  expenses: [
    {
      id: 'exp-1',
      categoryId: 'expcat-1',
      categoryName: 'Shop & Warehouse Rent',
      amount: 25000,
      date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
      paymentMode: 'bank',
      paidTo: 'Sunrise Realty Partners',
      notes: 'Monthly premises rental for October 2026',
      accountId: 'acc-2',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'exp-2',
      categoryId: 'expcat-2',
      categoryName: 'Electricity & Utilities',
      amount: 4250,
      date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      paymentMode: 'bank',
      paidTo: 'BESCOM Power Corp',
      notes: 'Electricity bill payment',
      accountId: 'acc-2',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ],
  expenseCategories: [
    { id: 'expcat-1', name: 'Shop & Warehouse Rent', type: 'indirect' },
    { id: 'expcat-2', name: 'Electricity & Utilities', type: 'indirect' },
    { id: 'expcat-3', name: 'Staff Salaries & Wages', type: 'indirect' },
    { id: 'expcat-4', name: 'Freight & Delivery Charges', type: 'direct' },
    { id: 'expcat-5', name: 'Printing, Tea & Office Supplies', type: 'indirect' },
  ],
  accounts: [
    {
      id: 'acc-1',
      name: 'Cash in Hand (Store Till)',
      type: 'cash',
      balance: 18450,
      isDefault: true,
    },
    {
      id: 'acc-2',
      name: 'HDFC Current Account',
      type: 'bank',
      accountNumber: '50200012345678',
      ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank Ltd.',
      balance: 145800,
      isDefault: true,
    },
    {
      id: 'acc-3',
      name: 'SBI Business Account',
      type: 'bank',
      accountNumber: '332211009988',
      ifsc: 'SBIN0004567',
      bankName: 'State Bank of India',
      balance: 56200,
      isDefault: false,
    },
  ],
  ledgers: [
    {
      id: 'led-1',
      date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      partyId: 'party-1',
      partyName: 'Sharma General Stores',
      transactionId: 'txn-1',
      invoiceNumber: 'INV-2026-001',
      type: 'debit',
      amount: 17228,
      runningBalance: 22628,
      description: 'Sale Invoice #INV-2026-001',
    },
    {
      id: 'led-2',
      date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      partyId: 'party-1',
      partyName: 'Sharma General Stores',
      transactionId: 'txn-1',
      invoiceNumber: 'INV-2026-001',
      type: 'credit',
      amount: 10000,
      runningBalance: 12628,
      description: 'Part Payment received via Bank for INV-2026-001',
    },
  ],
  printSettings: {
    paperSize: 'laser_a4',
    themeColor: '#C62828',
    companyLogo: true,
    signature: true,
    upiQr: true,
    taxBreakup: true,
    notesAndTerms: true,
  },
};

class DatabaseManager {
  private db: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.db = this.load();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error('Failed to parse database file, falling back to defaults:', err);
    }
    this.save(defaultDatabase);
    return JSON.parse(JSON.stringify(defaultDatabase));
  }

  private save(data: DatabaseSchema): void {
    try {
      this.ensureDirectory();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  private persist() {
    this.save(this.db);
  }

  // --- Profile ---
  getProfile(): BusinessProfile {
    return this.db.profile;
  }

  updateProfile(profile: Partial<BusinessProfile>): BusinessProfile {
    this.db.profile = { ...this.db.profile, ...profile };
    this.persist();
    return this.db.profile;
  }

  // --- Parties ---
  getParties(type?: string): Party[] {
    if (type) {
      return this.db.parties.filter((p) => p.type === type);
    }
    return this.db.parties;
  }

  getPartyById(id: string): Party | undefined {
    return this.db.parties.find((p) => p.id === id);
  }

  createParty(partyData: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>): Party {
    const newParty: Party = {
      ...partyData,
      id: `party-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      currentBalance: partyData.openingBalance || 0,
      createdAt: new Date().toISOString(),
    };
    this.db.parties.push(newParty);
    this.persist();
    return newParty;
  }

  updateParty(id: string, updates: Partial<Party>): Party | undefined {
    const idx = this.db.parties.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.db.parties[idx] = { ...this.db.parties[idx], ...updates };
    this.persist();
    return this.db.parties[idx];
  }

  deleteParty(id: string): boolean {
    const initialLen = this.db.parties.length;
    this.db.parties = this.db.parties.filter((p) => p.id !== id);
    if (this.db.parties.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Items ---
  getItems(): Item[] {
    return this.db.items;
  }

  getItemById(id: string): Item | undefined {
    return this.db.items.find((i) => i.id === id);
  }

  getItemByBarcode(barcode: string): Item | undefined {
    return this.db.items.find((i) => i.barcode === barcode || i.code === barcode);
  }

  createItem(itemData: Omit<Item, 'id' | 'createdAt'>): Item {
    const newItem: Item = {
      ...itemData,
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.db.items.push(newItem);
    this.persist();
    return newItem;
  }

  updateItem(id: string, updates: Partial<Item>): Item | undefined {
    const idx = this.db.items.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    this.db.items[idx] = { ...this.db.items[idx], ...updates };
    this.persist();
    return this.db.items[idx];
  }

  deleteItem(id: string): boolean {
    const initialLen = this.db.items.length;
    this.db.items = this.db.items.filter((i) => i.id !== id);
    if (this.db.items.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  adjustStock(id: string, delta: number): Item | undefined {
    const item = this.getItemById(id);
    if (!item) return undefined;
    item.currentStock = Math.max(0, item.currentStock + delta);
    this.persist();
    return item;
  }

  // --- Transactions ---
  getTransactions(type?: string): Transaction[] {
    if (type) {
      return this.db.transactions.filter((t) => t.type === type);
    }
    return this.db.transactions;
  }

  getTransactionById(id: string): Transaction | undefined {
    return this.db.transactions.find((t) => t.id === id);
  }

  createTransaction(txnData: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const newTxn: Transaction = {
      ...txnData,
      id: `txn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.db.transactions.unshift(newTxn);

    // Auto-adjust inventory stock
    if (newTxn.type === 'sale') {
      newTxn.items.forEach((item) => {
        this.adjustStock(item.itemId, -item.quantity);
      });
    } else if (newTxn.type === 'purchase') {
      newTxn.items.forEach((item) => {
        this.adjustStock(item.itemId, item.quantity);
      });
    } else if (newTxn.type === 'sale_return') {
      newTxn.items.forEach((item) => {
        this.adjustStock(item.itemId, item.quantity);
      });
    } else if (newTxn.type === 'purchase_return') {
      newTxn.items.forEach((item) => {
        this.adjustStock(item.itemId, -item.quantity);
      });
    }

    // Auto-update Party balance
    const party = this.getPartyById(newTxn.partyId);
    if (party) {
      if (newTxn.type === 'sale') {
        // Customer balance increases by unpaid amount
        party.currentBalance += newTxn.balanceDue;
        this.recordLedger(party, newTxn.id, newTxn.invoiceNumber, 'debit', newTxn.total, `Sale Invoice #${newTxn.invoiceNumber}`);
        if (newTxn.paidAmount > 0) {
          this.recordLedger(party, newTxn.id, newTxn.invoiceNumber, 'credit', newTxn.paidAmount, `Payment received for #${newTxn.invoiceNumber}`);
        }
      } else if (newTxn.type === 'purchase') {
        // Supplier balance increases (more negative / to pay)
        party.currentBalance -= newTxn.balanceDue;
        this.recordLedger(party, newTxn.id, newTxn.invoiceNumber, 'credit', newTxn.total, `Purchase Bill #${newTxn.invoiceNumber}`);
        if (newTxn.paidAmount > 0) {
          this.recordLedger(party, newTxn.id, newTxn.invoiceNumber, 'debit', newTxn.paidAmount, `Payment made for #${newTxn.invoiceNumber}`);
        }
      } else if (newTxn.type === 'payment_in') {
        party.currentBalance -= newTxn.paidAmount;
        this.recordLedger(party, newTxn.id, newTxn.invoiceNumber, 'credit', newTxn.paidAmount, `Payment In Received #${newTxn.invoiceNumber}`);
      } else if (newTxn.type === 'payment_out') {
        party.currentBalance += newTxn.paidAmount;
        this.recordLedger(party, newTxn.id, newTxn.invoiceNumber, 'debit', newTxn.paidAmount, `Payment Out to Supplier #${newTxn.invoiceNumber}`);
      }
    }

    // Auto-update Bank/Cash balance for payments
    if (newTxn.paidAmount > 0) {
      const defaultAcc = this.db.accounts.find((a) => (newTxn.paymentMode === 'cash' ? a.type === 'cash' : a.type === 'bank')) || this.db.accounts[0];
      if (defaultAcc) {
        if (newTxn.type === 'sale' || newTxn.type === 'payment_in') {
          defaultAcc.balance += newTxn.paidAmount;
        } else if (newTxn.type === 'purchase' || newTxn.type === 'payment_out') {
          defaultAcc.balance -= newTxn.paidAmount;
        }
      }
    }

    this.persist();
    return newTxn;
  }

  deleteTransaction(id: string): boolean {
    const txn = this.getTransactionById(id);
    if (!txn) return false;

    // Rollback stock
    if (txn.type === 'sale') {
      txn.items.forEach((item) => this.adjustStock(item.itemId, item.quantity));
    } else if (txn.type === 'purchase') {
      txn.items.forEach((item) => this.adjustStock(item.itemId, -item.quantity));
    }

    this.db.transactions = this.db.transactions.filter((t) => t.id !== id);
    this.persist();
    return true;
  }

  private recordLedger(
    party: Party,
    transactionId: string,
    invoiceNumber: string,
    type: 'debit' | 'credit',
    amount: number,
    description: string
  ) {
    const entry: LedgerEntry = {
      id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString().split('T')[0],
      partyId: party.id,
      partyName: party.name,
      transactionId,
      invoiceNumber,
      type,
      amount,
      runningBalance: party.currentBalance,
      description,
    };
    this.db.ledgers.push(entry);
  }

  getPartyLedger(partyId: string): LedgerEntry[] {
    return this.db.ledgers.filter((l) => l.partyId === partyId);
  }

  // --- Expenses ---
  getExpenses(): Expense[] {
    return this.db.expenses;
  }

  createExpense(expenseData: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const newExp: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.db.expenses.unshift(newExp);

    // Deduct from account
    const acc = this.db.accounts.find((a) => a.id === newExp.accountId);
    if (acc) {
      acc.balance -= newExp.amount;
    }

    this.persist();
    return newExp;
  }

  deleteExpense(id: string): boolean {
    const exp = this.db.expenses.find((e) => e.id === id);
    if (!exp) return false;

    // Refund account
    const acc = this.db.accounts.find((a) => a.id === exp.accountId);
    if (acc) {
      acc.balance += exp.amount;
    }

    this.db.expenses = this.db.expenses.filter((e) => e.id !== id);
    this.persist();
    return true;
  }

  getExpenseCategories(): ExpenseCategory[] {
    return this.db.expenseCategories;
  }

  createExpenseCategory(cat: Omit<ExpenseCategory, 'id'>): ExpenseCategory {
    const newCat: ExpenseCategory = {
      ...cat,
      id: `expcat-${Date.now()}`,
    };
    this.db.expenseCategories.push(newCat);
    this.persist();
    return newCat;
  }

  // --- Cash & Bank Accounts ---
  getAccounts(): BankAccount[] {
    return this.db.accounts;
  }

  createAccount(accData: Omit<BankAccount, 'id'>): BankAccount {
    const newAcc: BankAccount = {
      ...accData,
      id: `acc-${Date.now()}`,
    };
    this.db.accounts.push(newAcc);
    this.persist();
    return newAcc;
  }

  transferFunds(fromAccountId: string, toAccountId: string, amount: number, notes?: string): boolean {
    const fromAcc = this.db.accounts.find((a) => a.id === fromAccountId);
    const toAcc = this.db.accounts.find((a) => a.id === toAccountId);
    if (!fromAcc || !toAcc || amount <= 0) return false;

    fromAcc.balance -= amount;
    toAcc.balance += amount;
    this.persist();
    return true;
  }

  // --- Print Settings ---
  getPrintSettings(): PrintSettings {
    return this.db.printSettings;
  }

  updatePrintSettings(settings: Partial<PrintSettings>): PrintSettings {
    this.db.printSettings = { ...this.db.printSettings, ...settings };
    this.persist();
    return this.db.printSettings;
  }

  // --- Dashboard Aggregations ---
  getDashboardStats(): DashboardStats {
    let totalSales = 0;
    let totalPurchases = 0;
    let toCollect = 0;
    let toPay = 0;

    this.db.parties.forEach((p) => {
      if (p.currentBalance > 0) {
        toCollect += p.currentBalance;
      } else if (p.currentBalance < 0) {
        toPay += Math.abs(p.currentBalance);
      }
    });

    this.db.transactions.forEach((t) => {
      if (t.type === 'sale') totalSales += t.total;
      if (t.type === 'purchase') totalPurchases += t.total;
    });

    let cashInHand = 0;
    let bankBalance = 0;
    this.db.accounts.forEach((a) => {
      if (a.type === 'cash') cashInHand += a.balance;
      else bankBalance += a.balance;
    });

    let stockValue = 0;
    let lowStockItemsCount = 0;
    this.db.items.forEach((i) => {
      stockValue += i.currentStock * i.purchasePrice;
      if (i.currentStock <= i.minStockAlert) {
        lowStockItemsCount++;
      }
    });

    return {
      totalSales,
      totalPurchases,
      toCollect,
      toPay,
      cashInHand,
      bankBalance,
      stockValue,
      lowStockItemsCount,
      recentTransactions: this.db.transactions.slice(0, 8),
    };
  }

  // --- Financial Reports ---
  getProfitAndLoss() {
    let salesRevenue = 0;
    let purchasesCost = 0;
    let totalExpenses = 0;

    this.db.transactions.forEach((t) => {
      if (t.type === 'sale') salesRevenue += t.subtotal;
      if (t.type === 'purchase') purchasesCost += t.subtotal;
    });

    this.db.expenses.forEach((e) => {
      totalExpenses += e.amount;
    });

    const grossProfit = salesRevenue - purchasesCost;
    const netProfit = grossProfit - totalExpenses;

    return {
      salesRevenue,
      purchasesCost,
      grossProfit,
      totalExpenses,
      netProfit,
      expenseBreakdown: this.db.expenses,
    };
  }

  getGstReport() {
    let totalTaxableSale = 0;
    let totalOutputGst = 0;
    let totalTaxablePurchase = 0;
    let totalInputGst = 0;

    this.db.transactions.forEach((t) => {
      if (t.type === 'sale') {
        totalTaxableSale += t.subtotal - t.discountTotal;
        totalOutputGst += t.taxTotal;
      } else if (t.type === 'purchase') {
        totalTaxablePurchase += t.subtotal - t.discountTotal;
        totalInputGst += t.taxTotal;
      }
    });

    return {
      totalTaxableSale,
      totalOutputGst,
      totalTaxablePurchase,
      totalInputGst,
      netGstPayable: Math.max(0, totalOutputGst - totalInputGst),
    };
  }

  // --- Backup and Restore ---
  exportBackup(): DatabaseSchema {
    return this.db;
  }

  restoreBackup(backupData: DatabaseSchema): boolean {
    if (!backupData || !backupData.profile || !backupData.items) {
      return false;
    }
    this.db = backupData;
    this.persist();
    return true;
  }
}

export const db = new DatabaseManager();
