import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import { native } from "./connection.js";
import { UIAccessibility } from "./components/UIAccessibility.js";
import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
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
} from "./types.js";

import { Sidebar, ActiveTab } from "./components/Sidebar.js";
import { TopHeader } from "./components/TopHeader.js";
import { GlobalSearchModal } from "./components/GlobalSearchModal.js";
import { PaymentModal } from "./components/PaymentModal.js";
import { InvoiceModal } from "./components/InvoiceModal.js";
import { PartyModal } from "./components/PartyModal.js";
import { ItemModal } from "./components/ItemModal.js";
import { PrintPreviewModal } from "./components/PrintPreviewModal.js";
import { WhatsAppModal } from "./components/WhatsAppModal.js";

import { DashboardView } from "./views/DashboardView.js";
import { PartiesView } from "./views/PartiesView.js";
import { ItemsView } from "./views/ItemsView.js";
import { SalesView } from "./views/SalesView.js";
import { PurchasesView } from "./views/PurchasesView.js";
import { PosView } from "./views/PosView.js";
import { ExpensesView } from "./views/ExpensesView.js";
import { CashBankView } from "./views/CashBankView.js";
import { ReportsView } from "./views/ReportsView.js";
import { SettingsView } from "./views/SettingsView.js";

export const App: React.FC = () => {
  const [dataError, setDataError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Application Data States
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
    [],
  );
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pnlReport, setPnlReport] = useState<ProfitAndLossReport | null>(null);
  const [gstReport, setGstReport] = useState<GstReport | null>(null);
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    paperSize: "laser_a4",
    themeColor: "#C62828",
    companyLogo: true,
    signature: true,
    upiQr: true,
    taxBreakup: true,
    notesAndTerms: true,
  });

  // Modal Visibility States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceType, setInvoiceType] = useState<TransactionType>("sale");
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [defaultPartyType, setDefaultPartyType] =
    useState<PartyType>("customer");

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [thermalPrint, setThermalPrint] = useState(false);
  const [printTargetTxn, setPrintTargetTxn] = useState<Transaction | null>(
    null,
  );

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppParty, setWhatsAppParty] = useState<Party | null>(null);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Load All Application Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setDataError("");
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
      if (native && !prof.phone) setActiveTab("settings");
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
      setDataError(
        err instanceof Error ? err.message : "Could not load business data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (Capacitor.isNativePlatform())
      SystemBars.setStyle({
        style: theme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
      }).catch(console.error);
  }, [theme]);
  useEffect(() => {
    if (!native) return;
    const listener = NativeApp.addListener("backButton", () => {
      const close = document.querySelector<HTMLButtonElement>(
        ".modal-overlay:last-of-type .modal-header .btn-icon",
      );
      if (close) close.click();
      else if (menuOpen) setMenuOpen(false);
      else if (activeTab !== "dashboard") setActiveTab("dashboard");
      else NativeApp.minimizeApp();
    });
    return () => {
      listener.then((l) => l.remove());
    };
  }, [activeTab, menuOpen]);
  // Invoice Handlers
  const openNewInvoiceModal = (type: TransactionType = "sale") => {
    setInvoiceType(type);
    setEditingTransaction(null);
    setIsInvoiceModalOpen(true);
  };

  const handleSaveTransaction = async (
    txnPayload: Omit<Transaction, "id" | "createdAt">,
    thenPrint = false,
  ) => {
    const createdTxn = await api.createTransaction(txnPayload);
    await loadData();
    if (thenPrint) {
      setThermalPrint(false);
      setPrintTargetTxn(createdTxn);
      setIsPrintModalOpen(true);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await api.deleteTransaction(id);
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleConvertQuotation = async (quote: Transaction) => {
    // Open Invoice Modal preloaded with quote line items converted to a Sale
    setInvoiceType("sale");
    setEditingTransaction({
      ...quote,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      type: "sale",
    });
    setIsInvoiceModalOpen(true);
  };

  // Party Handlers
  const openAddPartyModal = (type: PartyType = "customer") => {
    setEditingParty(null);
    setDefaultPartyType(type);
    setIsPartyModalOpen(true);
  };

  const handleSaveParty = async (
    partyData: Omit<Party, "id" | "createdAt" | "currentBalance">,
  ) => {
    if (editingParty) {
      await api.updateParty(editingParty.id, partyData);
    } else {
      await api.createParty(partyData);
    }
    await loadData();
  };

  const handleDeleteParty = async (id: string) => {
    try {
      await api.deleteParty(id);
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Item Handlers
  const openAddItemModal = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (itemData: Omit<Item, "id" | "createdAt">) => {
    if (editingItem) {
      await api.updateItem(editingItem.id, itemData);
    } else {
      await api.createItem(itemData);
    }
    await loadData();
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await api.deleteItem(id);
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAdjustStock = async (id: string, delta: number) => {
    await api.adjustStock(id, delta);
    await loadData();
  };

  // Expense Handlers
  const handleAddExpense = async (
    expData: Omit<Expense, "id" | "createdAt">,
  ) => {
    await api.createExpense(expData);
    await loadData();
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await api.deleteExpense(id);
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Cash & Bank Handlers
  const handleAddAccount = async (accData: Omit<BankAccount, "id">) => {
    await api.createAccount(accData);
    await loadData();
  };

  const handleTransferFunds = async (
    fromId: string,
    toId: string,
    amount: number,
    notes?: string,
  ) => {
    await api.transferFunds(fromId, toId, amount, notes);
    await loadData();
  };

  // Settings Handlers
  const handleUpdateProfile = async (profData: Partial<BusinessProfile>) => {
    const updated = await api.updateProfile(profData);
    setProfile(updated);
  };

  const handleUpdatePrintSettings = async (
    pSettings: Partial<PrintSettings>,
  ) => {
    const updated = await api.updatePrintSettings(pSettings);
    setPrintSettings(updated);
  };

  const handleRestoreBackup = async (backupData: any) => {
    await api.restoreBackup(backupData);
    await loadData();
  };

  return (
    <div className="app-container">
      <UIAccessibility />
      {/* Sidebar Navigation */}
      <button
        className="mobile-menu no-print"
        aria-label="Open navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰ <span>Viper</span>
      </button>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div
        className={menuOpen ? "navigation-shell is-open" : "navigation-shell"}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setLowStockOnly(false);
            setMenuOpen(false);
          }}
        />
      </div>

      {/* Main App Container */}
      <div className="main-content">
        <TopHeader
          profile={profile}
          onOpenSaleModal={() => openNewInvoiceModal("sale")}
          onOpenPurchaseModal={() => openNewInvoiceModal("purchase")}
          onOpenPOS={() => setActiveTab("pos")}
          onOpenSearch={() => setIsSearchModalOpen(true)}
          theme={theme}
          setTheme={setTheme}
        />

        {dataError && (
          <div role="alert" className="error-banner load-error">
            Could not load data: {dataError}
            <div className="action-row">
              <button className="btn btn-secondary" onClick={loadData}>
                Retry
              </button>
            </div>
          </div>
        )}
        {loading && (
          <div role="status" className="loading-banner">
            Loading business data…
          </div>
        )}
        {native && profile && !profile.phone && <div className="loading-banner" role="status">Welcome to Viper. Set your business name and phone number below. All records stay on this device.</div>}
        {/* Dynamic View Router */}
        {activeTab === "dashboard" && (
          <DashboardView
            stats={stats}
            onOpenSale={() => openNewInvoiceModal("sale")}
            onOpenPurchase={() => openNewInvoiceModal("purchase")}
            onOpenPOS={() => setActiveTab("pos")}
            onOpenItemModal={() => {
              setLowStockOnly(true);
              setActiveTab("items");
            }}
            onViewTransaction={(txn) => {
              setThermalPrint(false);
              setPrintTargetTxn(txn);
              setIsPrintModalOpen(true);
            }}
          />
        )}

        {activeTab === "parties" && (
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

        {activeTab === "items" && (
          <ItemsView
            initiallyLowStock={lowStockOnly}
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

        {activeTab === "sales" && (
          <SalesView
            transactions={transactions}
            onOpenSaleModal={openNewInvoiceModal}
            onViewTransaction={(txn) => {
              setThermalPrint(false);
              setPrintTargetTxn(txn);
              setIsPrintModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
            onConvertQuotation={handleConvertQuotation}
          />
        )}

        {activeTab === "purchases" && (
          <PurchasesView
            transactions={transactions}
            onOpenPurchaseModal={(type) => openNewInvoiceModal(type)}
            onViewTransaction={(txn) => {
              setThermalPrint(false);
              setPrintTargetTxn(txn);
              setIsPrintModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {
          <div hidden={activeTab !== "pos"}>
            <PosView
              items={items}
              parties={parties}
              onCompleteCheckout={async (txnPayload, thenPrint) => {
                const created = await api.createTransaction(txnPayload);
                await loadData();
                if (thenPrint) {
                  setThermalPrint(true);
                  setPrintTargetTxn(created);
                  setIsPrintModalOpen(true);
                }
              }}
            />
          </div>
        }

        {activeTab === "expenses" && (
          <ExpensesView
            expenses={expenses}
            categories={expenseCategories}
            accounts={accounts}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === "cash-bank" && (
          <CashBankView
            accounts={accounts}
            onAddAccount={handleAddAccount}
            onTransferFunds={handleTransferFunds}
          />
        )}

        {activeTab === "reports" && (
          <ReportsView
            pnlReport={pnlReport}
            gstReport={gstReport}
            items={items}
            transactions={transactions}
          />
        )}

        {activeTab === "settings" && (
          <div>
            <SettingsView
              profile={profile}
              printSettings={printSettings}
              onUpdateProfile={handleUpdateProfile}
              onUpdatePrintSettings={handleUpdatePrintSettings}
              onRestoreBackup={handleRestoreBackup}
              backupDownloadUrl={api.exportBackupUrl()}
            />
          </div>
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
          setActiveTab("parties");
        }}
        onSelectItem={(item) => {
          setActiveTab("items");
        }}
        onSelectTransaction={(txn) => {
          setThermalPrint(false);
          setPrintTargetTxn(txn);
          setIsPrintModalOpen(true);
        }}
      />

      {(invoiceType === "payment_in" || invoiceType === "payment_out") &&
      isInvoiceModalOpen ? (
        <PaymentModal
          type={invoiceType}
          parties={parties}
          transactions={transactions}
          onSave={handleSaveTransaction}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      ) : (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSave={handleSaveTransaction}
          type={invoiceType}
          parties={parties}
          items={items}
          initialData={editingTransaction}
          transactions={transactions}
        />
      )}

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
        printSettings={
          thermalPrint
            ? { ...printSettings, paperSize: "thermal_80mm" }
            : printSettings
        }
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
