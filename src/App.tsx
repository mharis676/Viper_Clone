import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';
import {
  BusinessProfile,
  Party,
  Item,
  Transaction,
  Expense,
  ExpenseCategory,
  BankAccount,
  DashboardStats,
  ProfitAndLossReport,
  GstReport,
  PrintSettings,
  TransactionType,
  PartyType,
} from './types.js';

import { Sidebar, ActiveTab } from './components/Sidebar.js';
import { TopHeader } from './components/TopHeader.js';
import { GlobalSearchModal } from './components/GlobalSearchModal.js';
import { InvoiceModal } from './components/InvoiceModal.js';
import { PartyModal } from './components/PartyModal.js';
import { ItemModal } from './components/ItemModal.js';
import { PrintPreviewModal } from './components/PrintPreviewModal.js';
import { WhatsAppModal } from './components/WhatsAppModal.js';

import { DashboardView } from './views/DashboardView.js';
import { PartiesView } from './views/PartiesView.js';
import { ItemsView } from './views/ItemsView.js';
import { SalesView } from './views/SalesView.js';
import { PurchasesView } from './views/PurchasesView.js';
import { PosView } from './views/PosView.js';
import { ExpensesView } from './views/ExpensesView.js';
import { CashBankView } from './views/CashBankView.js';
import { ReportsView } from './views/ReportsView.js';
import { SettingsView } from './views/SettingsView.js';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Application Data States
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pnlReport, setPnlReport] = useState<ProfitAndLossReport | null>(null);
  const [gstReport, setGstReport] = useState<GstReport | null>(null);
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    paperSize: 'laser_a4',
    themeColor: '#C62828',
    companyLogo: true,
    signature: true,
    upiQr: true,
    taxBreakup: true,
    notesAndTerms: true,
  });

  // Modal Visibility States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceType, setInvoiceType] = useState<TransactionType>('sale');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [defaultPartyType, setDefaultPartyType] = useState<PartyType>('customer');

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTargetTxn, setPrintTargetTxn] = useState<Transaction | null>(null);

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppParty, setWhatsAppParty] = useState<Party | null>(null);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Load All Application Data
  const loadData = useCallback(async () => {
    try {
      const [
        prof,
        partiesData,
        itemsData,
        txnsData,
        expData,
        catData,
        accData,
        statsData,
        pnlData,
        gstData,
        printData,
      ] = await Promise.all([
        api.getProfile(),
        api.getParties(),
        api.getItems(),
        api.getTransactions(),
        api.getExpenses(),
        api.getExpenseCategories(),
        api.getAccounts(),
        api.getDashboardStats(),
        api.getProfitAndLoss(),
        api.getGstReport(),
        api.getPrintSettings(),
      ]);

      setProfile(prof);
      setParties(partiesData);
      setItems(itemsData);
      setTransactions(txnsData);
      setExpenses(expData);
      setExpenseCategories(catData);
      setAccounts(accData);
      setStats(statsData);
      setPnlReport(pnlData);
      setGstReport(gstData);
      setPrintSettings(printData);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Invoice Handlers
  const openNewInvoiceModal = (type: TransactionType = 'sale') => {
    setInvoiceType(type);
    setEditingTransaction(null);
    setIsInvoiceModalOpen(true);
  };

  const handleSaveTransaction = async (
    txnPayload: Omit<Transaction, 'id' | 'createdAt'>,
    thenPrint = false
  ) => {
    const createdTxn = await api.createTransaction(txnPayload);
    await loadData();
    if (thenPrint) {
      setPrintTargetTxn(createdTxn);
      setIsPrintModalOpen(true);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    await api.deleteTransaction(id);
    await loadData();
  };

  const handleConvertQuotation = async (quote: Transaction) => {
    // Open Invoice Modal preloaded with quote line items converted to a Sale
    setInvoiceType('sale');
    setEditingTransaction({
      ...quote,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      type: 'sale',
    });
    setIsInvoiceModalOpen(true);
  };

  // Party Handlers
  const openAddPartyModal = (type: PartyType = 'customer') => {
    setEditingParty(null);
    setDefaultPartyType(type);
    setIsPartyModalOpen(true);
  };

  const handleSaveParty = async (partyData: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>) => {
    if (editingParty) {
      await api.updateParty(editingParty.id, partyData);
    } else {
      await api.createParty(partyData);
    }
    await loadData();
  };

  const handleDeleteParty = async (id: string) => {
    await api.deleteParty(id);
    await loadData();
  };

  // Item Handlers
  const openAddItemModal = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (itemData: Omit<Item, 'id' | 'createdAt'>) => {
    if (editingItem) {
      await api.updateItem(editingItem.id, itemData);
    } else {
      await api.createItem(itemData);
    }
    await loadData();
  };

  const handleDeleteItem = async (id: string) => {
    await api.deleteItem(id);
    await loadData();
  };

  const handleAdjustStock = async (id: string, delta: number) => {
    await api.adjustStock(id, delta);
    await loadData();
  };

  // Expense Handlers
  const handleAddExpense = async (expData: Omit<Expense, 'id' | 'createdAt'>) => {
    await api.createExpense(expData);
    await loadData();
  };

  const handleDeleteExpense = async (id: string) => {
    await api.deleteExpense(id);
    await loadData();
  };

  // Cash & Bank Handlers
  const handleAddAccount = async (accData: Omit<BankAccount, 'id'>) => {
    await api.createAccount(accData);
    await loadData();
  };

  const handleTransferFunds = async (
    fromId: string,
    toId: string,
    amount: number,
    notes?: string
  ) => {
    await api.transferFunds(fromId, toId, amount, notes);
    await loadData();
  };

  // Settings Handlers
  const handleUpdateProfile = async (profData: Partial<BusinessProfile>) => {
    const updated = await api.updateProfile(profData);
    setProfile(updated);
  };

  const handleUpdatePrintSettings = async (pSettings: Partial<PrintSettings>) => {
    const updated = await api.updatePrintSettings(pSettings);
    setPrintSettings(updated);
  };

  const handleRestoreBackup = async (backupData: any) => {
    await api.restoreBackup(backupData);
    await loadData();
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main App Container */}
      <div className="main-content">
        <TopHeader
          profile={profile}
          onOpenSaleModal={() => openNewInvoiceModal('sale')}
          onOpenPurchaseModal={() => openNewInvoiceModal('purchase')}
          onOpenPOS={() => setActiveTab('pos')}
          onOpenSearch={() => setIsSearchModalOpen(true)}
          theme={theme}
          setTheme={setTheme}
        />

        {/* Dynamic View Router */}
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            onOpenSale={() => openNewInvoiceModal('sale')}
            onOpenPurchase={() => openNewInvoiceModal('purchase')}
            onOpenPOS={() => setActiveTab('pos')}
            onOpenItemModal={openAddItemModal}
            onViewTransaction={(txn) => {
              setPrintTargetTxn(txn);
              setIsPrintModalOpen(true);
            }}
          />
        )}

        {activeTab === 'parties' && (
          <PartiesView
            parties={parties}
            onOpenAddParty={openAddPartyModal}
            onEditParty={(p) => {
              setEditingParty(p);
              setIsPartyModalOpen(true);
            }}
            onDeleteParty={handleDeleteParty}
            onOpenWhatsApp={(p) => {
              setWhatsAppParty(p);
              setIsWhatsAppModalOpen(true);
            }}
            onViewLedger={(p) => api.getPartyLedger(p.id)}
          />
        )}

        {activeTab === 'items' && (
          <ItemsView
            items={items}
            onOpenAddItem={openAddItemModal}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsItemModalOpen(true);
            }}
            onDeleteItem={handleDeleteItem}
            onAdjustStock={handleAdjustStock}
          />
        )}

        {activeTab === 'sales' && (
          <SalesView
            transactions={transactions}
            onOpenSaleModal={openNewInvoiceModal}
            onViewTransaction={(txn) => {
              setPrintTargetTxn(txn);
              setIsPrintModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
            onConvertQuotation={handleConvertQuotation}
          />
        )}

        {activeTab === 'purchases' && (
          <PurchasesView
            transactions={transactions}
            onOpenPurchaseModal={(type) => openNewInvoiceModal(type)}
            onViewTransaction={(txn) => {
              setPrintTargetTxn(txn);
              setIsPrintModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'pos' && (
          <PosView
            items={items}
            parties={parties}
            onCompleteCheckout={async (txnPayload, thenPrint) => {
              const created = await api.createTransaction(txnPayload);
              await loadData();
              if (thenPrint) {
                setPrintTargetTxn(created);
                setIsPrintModalOpen(true);
              }
            }}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesView
            expenses={expenses}
            categories={expenseCategories}
            accounts={accounts}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'cash-bank' && (
          <CashBankView
            accounts={accounts}
            onAddAccount={handleAddAccount}
            onTransferFunds={handleTransferFunds}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            pnlReport={pnlReport}
            gstReport={gstReport}
            items={items}
            transactions={transactions}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            profile={profile}
            printSettings={printSettings}
            onUpdateProfile={handleUpdateProfile}
            onUpdatePrintSettings={handleUpdatePrintSettings}
            onRestoreBackup={handleRestoreBackup}
            backupDownloadUrl={api.exportBackupUrl()}
          />
        )}
      </div>

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        parties={parties}
        items={items}
        transactions={transactions}
        onSelectParty={(party) => {
          setActiveTab('parties');
        }}
        onSelectItem={(item) => {
          setActiveTab('items');
        }}
        onSelectTransaction={(txn) => {
          setPrintTargetTxn(txn);
          setIsPrintModalOpen(true);
        }}
      />

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSave={handleSaveTransaction}
        type={invoiceType}
        parties={parties}
        items={items}
        initialData={editingTransaction}
      />

      <PartyModal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        onSave={handleSaveParty}
        initialParty={editingParty}
        defaultType={defaultPartyType}
      />

      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleSaveItem}
        initialItem={editingItem}
      />

      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        transaction={printTargetTxn}
        profile={profile}
        printSettings={printSettings}
      />

      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        party={whatsAppParty}
        profile={profile}
      />
    </div>
  );
};

export default App;
