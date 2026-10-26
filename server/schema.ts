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
  ChangeHistoryEntry,
  BackupMetadata,
} from './types.js';

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
  transfers?: { id: string; fromAccountId: string; toAccountId: string; amount: number; notes?: string; createdAt: string }[];
  changeHistory?: ChangeHistoryEntry[];
  backupMetadata?: BackupMetadata;
}

