export type PartyType = 'customer' | 'supplier';

export interface BusinessProfile {
  id: string;
  name: string;
  tradeName?: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  logoUrl?: string;
  signatureUrl?: string;
  upiId: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  termsAndConditions: string;
}

export interface Party {
  id: string;
  name: string;
  type: PartyType;
  phone: string;
  email?: string;
  gstin?: string;
  billingAddress: string;
  shippingAddress?: string;
  openingBalance: number;
  currentBalance: number;
  creditLimit?: number;
  createdAt: string;
}

export interface Item {
  id: string;
  name: string;
  code: string;
  barcode: string;
  category: string;
  unit: string;
  purchasePrice: number;
  salesPrice: number;
  mrp: number;
  taxRate: number;
  hsnCode?: string;
  minStockAlert: number;
  currentStock: number;
  godownId: string;
  createdAt: string;
}

export interface Godown {
  id: string;
  name: string;
  location: string;
  isDefault: boolean;
}

export type TransactionType =
  | 'sale'
  | 'purchase'
  | 'quotation'
  | 'payment_in'
  | 'payment_out'
  | 'sale_return'
  | 'purchase_return';

export type PaymentMode = 'cash' | 'bank' | 'upi' | 'cheque';
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

export interface TransactionItem {
  costPrice?: number;
  itemId: string;
  itemName: string;
  itemCode: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  price: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface Transaction {
  payments?: { mode: PaymentMode; amount: number }[];
  interstate?: boolean;
  originalTransactionId?: string;
  initialPaidAmount?: number;
  creditedAmount?: number;
  allocations?: { invoiceId: string; amount: number }[];
  effects?: { party: number; accountId?: string; accountPostings?: { accountId: string; amount: number }[]; cash: number; stock: { itemId: string; delta: number }[] };
  id: string;
  invoiceNumber: string;
  type: TransactionType;
  partyId: string;
  partyName: string;
  date: string;
  dueDate?: string;
  items: TransactionItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  paymentMode: PaymentMode;
  status: PaymentStatus;
  notes?: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  type: 'direct' | 'indirect';
}

export interface Expense {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  date: string;
  paymentMode: PaymentMode;
  paidTo?: string;
  notes?: string;
  accountId: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  name: string;
  type: 'cash' | 'bank';
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  balance: number;
  isDefault: boolean;
}

export interface LedgerEntry {
  id: string;
  date: string;
  partyId: string;
  partyName: string;
  transactionId: string;
  invoiceNumber: string;
  type: 'debit' | 'credit';
  amount: number;
  runningBalance: number;
  description: string;
}

export interface PrintSettings {
  paperSize: 'thermal_80mm' | 'thermal_58mm' | 'laser_a4' | 'laser_a5';
  themeColor: string;
  companyLogo: boolean;
  signature: boolean;
  upiQr: boolean;
  taxBreakup: boolean;
  notesAndTerms: boolean;
}

export interface DashboardStats {
  totalSales: number;
  totalPurchases: number;
  toCollect: number;
  toPay: number;
  cashInHand: number;
  bankBalance: number;
  stockValue: number;
  lowStockItemsCount: number;
  recentTransactions: Transaction[];
}

export interface ProfitAndLossReport {
  salesRevenue: number;
  purchasesCost: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  expenseBreakdown: Expense[];
}

export interface GstReport {
  totalTaxableSale: number;
  totalOutputGst: number;
  totalTaxablePurchase: number;
  totalInputGst: number;
  netGstPayable: number;
}
