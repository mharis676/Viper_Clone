import {
  BusinessProfile,
  Party,
  Item,
  Transaction,
  Expense,
  ExpenseCategory,
  BankAccount,
  LedgerEntry,
  PrintSettings,
  DashboardStats,
  ProfitAndLossReport,
  GstReport,
} from "./types.js";

import { Capacitor } from "@capacitor/core";
import { fetchWithTimeout } from "./network.js";
import { exportFile } from "./export.js";
import { authHeaders, getBackendUrl } from "./connection.js";
const apiBase = () => `${getBackendUrl()}/api`;

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (Capacitor.isNativePlatform() || new URLSearchParams(location.search).get('offline') === '1') {
    const { offlineRequest } = await import('./offline.js');
    return offlineRequest<T>(endpoint, options);
  }
  const res = await fetchWithTimeout(`${apiBase()}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody.error || `Request failed with status ${res.status}`,
    );
  }

  return res.json();
}

export const api = {
  // Health
  getHealth: () => request<{ status: string }>("/health"),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>("/dashboard/stats"),

  // Profile
  getProfile: () => request<BusinessProfile>("/profile"),
  updateProfile: (profile: Partial<BusinessProfile>) =>
    request<BusinessProfile>("/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    }),

  // Parties
  getParties: (type?: string) =>
    request<Party[]>(type ? `/parties?type=${type}` : "/parties"),
  getPartyById: (id: string) => request<Party>(`/parties/${id}`),
  createParty: (party: Omit<Party, "id" | "createdAt" | "currentBalance">) =>
    request<Party>("/parties", { method: "POST", body: JSON.stringify(party) }),
  updateParty: (id: string, updates: Partial<Party>) =>
    request<Party>(`/parties/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  deleteParty: (id: string) =>
    request<{ success: boolean }>(`/parties/${id}`, { method: "DELETE" }),
  getPartyLedger: (id: string) =>
    request<LedgerEntry[]>(`/parties/${id}/ledger`),

  // Items
  getItems: () => request<Item[]>("/items"),
  getItemById: (id: string) => request<Item>(`/items/${id}`),
  getItemByBarcode: (barcode: string) =>
    request<Item>(`/items/barcode/${encodeURIComponent(barcode)}`),
  createItem: (item: Omit<Item, "id" | "createdAt">) =>
    request<Item>("/items", { method: "POST", body: JSON.stringify(item) }),
  updateItem: (id: string, updates: Partial<Item>) =>
    request<Item>(`/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  deleteItem: (id: string) =>
    request<{ success: boolean }>(`/items/${id}`, { method: "DELETE" }),
  adjustStock: (id: string, delta: number) =>
    request<Item>(`/items/${id}/adjust`, {
      method: "POST",
      body: JSON.stringify({ delta }),
    }),

  // Transactions
  getTransactions: (type?: string) =>
    request<Transaction[]>(
      type ? `/transactions?type=${type}` : "/transactions",
    ),
  getTransactionById: (id: string) =>
    request<Transaction>(`/transactions/${id}`),
  createTransaction: (txn: Omit<Transaction, "id" | "createdAt">) =>
    request<Transaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(txn),
    }),
  deleteTransaction: (id: string) =>
    request<{ success: boolean }>(`/transactions/${id}`, { method: "DELETE" }),

  // Expenses
  getExpenses: () => request<Expense[]>("/expenses"),
  createExpense: (expense: Omit<Expense, "id" | "createdAt">) =>
    request<Expense>("/expenses", {
      method: "POST",
      body: JSON.stringify(expense),
    }),
  deleteExpense: (id: string) =>
    request<{ success: boolean }>(`/expenses/${id}`, { method: "DELETE" }),
  getExpenseCategories: () =>
    request<ExpenseCategory[]>("/expenses/categories"),
  createExpenseCategory: (cat: Omit<ExpenseCategory, "id">) =>
    request<ExpenseCategory>("/expenses/categories", {
      method: "POST",
      body: JSON.stringify(cat),
    }),

  // Accounts
  getAccounts: () => request<BankAccount[]>("/accounts"),
  createAccount: (acc: Omit<BankAccount, "id">) =>
    request<BankAccount>("/accounts", {
      method: "POST",
      body: JSON.stringify(acc),
    }),
  transferFunds: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    notes?: string,
  ) =>
    request<{ success: boolean }>("/accounts/transfer", {
      method: "POST",
      body: JSON.stringify({ fromAccountId, toAccountId, amount, notes }),
    }),

  // Reports
  getProfitAndLoss: () => request<ProfitAndLossReport>("/reports/pnl"),
  getGstReport: () => request<GstReport>("/reports/gst"),

  // Settings
  getPrintSettings: () => request<PrintSettings>("/settings/print"),
  updatePrintSettings: (settings: Partial<PrintSettings>) =>
    request<PrintSettings>("/settings/print", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  // Backup & Restore
  exportBackupUrl: () => `${apiBase()}/backup`,
  downloadBackup: async () => {
    const backup = await request<unknown>("/backup");
    await exportFile(
      "viper-backup.json",
      JSON.stringify(backup, null, 2),
      "application/json",
    );
  },
  restoreBackup: (backupData: any) =>
    request<{ success: boolean }>("/backup/restore", {
      method: "POST",
      body: JSON.stringify(backupData),
    }),
};
