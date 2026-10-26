import type { DatabaseSchema } from './schema.js';
import type {
  Party,
  Item,
  Transaction,
  Expense,
  ExpenseCategory,
  BankAccount,
  BusinessProfile,
  PrintSettings,
  LedgerEntry,
  ChangeHistoryEntry,
  PartyStatementResult,
  BackupMetadata,
} from "./types.js";
import { calculateLine, calculateTotals, money } from "./calculations.js";

function fail(message: string): never {
  throw new Error(message);
}
const number = (v: unknown, name: string, min = 0) =>
  typeof v === "number" && Number.isFinite(v) && v >= min
    ? v
    : fail(`${name} must be a finite number ≥ ${min}`);
const text = (v: unknown, name: string) =>
  typeof v === "string" && v.trim() ? v.trim() : fail(`${name} is required`);
const date = (v: unknown) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  new Date(v).toISOString().slice(0, 10) === v
    ? v
    : fail("Valid date is required");
const stockQuantity = (n: number) => Math.round(n * 1e6) / 1e6;
const id = (prefix: string) => `${prefix}-${globalThis.crypto.randomUUID()}`;
type Effects = {
  party: number;
  accountId?: string;
  accountPostings?: { accountId: string; amount: number }[];
  cash: number;
  stock: { itemId: string; delta: number }[];
};

export class BusinessEngine {
  protected db: DatabaseSchema;
  constructor(initial: DatabaseSchema) {
    this.db = this.validateBackup(initial);
    this.db.changeHistory = this.db.changeHistory || [];
  }
  logChange(entry: Omit<ChangeHistoryEntry, "id" | "timestamp">) {
    this.db.changeHistory = this.db.changeHistory || [];
    this.db.changeHistory.unshift({
      ...entry,
      id: id("hist"),
      timestamp: new Date().toISOString(),
    });
  }
  getChangeHistory(filter?: { entityType?: string; entityId?: string; limit?: number }) {
    let list = this.db.changeHistory || [];
    if (filter?.entityType) list = list.filter((h) => h.entityType === filter.entityType);
    if (filter?.entityId) list = list.filter((h) => h.entityId === filter.entityId);
    if (filter?.limit && filter.limit > 0) list = list.slice(0, filter.limit);
    return structuredClone(list);
  }
  protected commit<T>(change: () => T, _preservePrevious = false): T {
    const before = structuredClone(this.db);
    try { const result = change(); return structuredClone(result); }
    catch (error) { this.db = before; throw error; }
  }
  getProfile() {
    return structuredClone(this.db.profile);
  }
  updateProfile(p: Partial<BusinessProfile>) {
    return this.commit(() => {
      const next = { ...this.db.profile, ...p, id: this.db.profile.id };
      text(next.name, "Business name");
      text(next.phone, "Phone");
      for (const k of [
        "name",
        "tradeName",
        "gstin",
        "phone",
        "email",
        "address",
        "city",
        "state",
        "pincode",
        "logoUrl",
        "signatureUrl",
        "upiId",
        "bankName",
        "accountNumber",
        "ifsc",
        "termsAndConditions",
      ] as const)
        if (next[k] !== undefined && typeof next[k] !== "string")
          fail(`Invalid profile ${k}`);
      this.db.profile = next;
      return next;
    });
  }
  getParties(type?: string) {
    return structuredClone(
      this.db.parties.filter((p) => !type || p.type === type),
    );
  }
  getPartyById(key: string) {
    return this.getParties().find((p) => p.id === key);
  }
  private partyInput(p: Partial<Party>) {
    text(p.name, "Party name");
    text(p.phone, "Phone");
    if (!["customer", "supplier"].includes(p.type!)) fail("Invalid party type");
    number(p.openingBalance, "Opening balance", -Number.MAX_SAFE_INTEGER);
    if (p.creditLimit !== undefined) number(p.creditLimit, "Credit limit");
  }
  createParty(p: Omit<Party, "id" | "createdAt" | "currentBalance">) {
    return this.commit(() => {
      this.partyInput(p);
      const created = {
        ...p,
        id: id("party"),
        createdAt: new Date().toISOString(),
        currentBalance: p.openingBalance,
      };
      this.db.parties.push(created);
      return created;
    });
  }
  updateParty(key: string, updates: Partial<Party>) {
    return this.commit(() => {
      const p = this.db.parties.find((p) => p.id === key);
      if (!p) return undefined;
      const prevOpening = p.openingBalance;
      const next = {
        ...p,
        ...updates,
        id: p.id,
        createdAt: p.createdAt,
        currentBalance: money(
          p.currentBalance +
            (updates.openingBalance ?? p.openingBalance) -
            p.openingBalance,
        ),
      };
      this.partyInput(next);
      Object.assign(p, next);
      this.rebuildLedger(key);
      if (updates.openingBalance !== undefined && updates.openingBalance !== prevOpening) {
        this.logChange({
          entityType: "opening_balance",
          entityId: p.id,
          entityNumber: p.name,
          action: "updated",
          summary: `Opening balance for ${p.name} updated from PKR ${prevOpening} to PKR ${updates.openingBalance}`,
          changes: [{ field: "openingBalance", oldValue: prevOpening, newValue: updates.openingBalance }],
        });
      } else {
        this.logChange({
          entityType: "party",
          entityId: p.id,
          entityNumber: p.name,
          action: "updated",
          summary: `Party ${p.name} details updated`,
        });
      }
      return p;
    });
  }
  deleteParty(key: string) {
    return this.commit(() => {
      if (
        this.db.transactions.some((t) => t.partyId === key) ||
        this.db.ledgers.some((l) => l.partyId === key)
      )
        fail("Party has transactions; reverse them before deleting");
      const count = this.db.parties.length;
      this.db.parties = this.db.parties.filter((p) => p.id !== key);
      return count !== this.db.parties.length;
    });
  }
  getItems() {
    return structuredClone(this.db.items);
  }
  getItemById(key: string) {
    return this.getItems().find((i) => i.id === key);
  }
  getItemByBarcode(code: string) {
    return this.getItems().find((i) => i.barcode === code || i.code === code);
  }
  private itemInput(i: Item | Omit<Item, "id" | "createdAt">, key?: string) {
    text(i.name, "Item name");
    text(i.code, "Item code");
    text(i.unit, "Unit");
    for (const field of [
      "purchasePrice",
      "salesPrice",
      "mrp",
      "taxRate",
      "currentStock",
      "minStockAlert",
    ] as const)
      number(i[field], field);
    if (i.taxRate > 100) fail("Invalid tax rate");
    if (
      this.db.items.some(
        (x) =>
          x.id !== key &&
          (x.code === i.code || (i.barcode && x.barcode === i.barcode)),
      )
    )
      fail("Item code or barcode already exists");
  }
  createItem(i: Omit<Item, "id" | "createdAt">) {
    return this.commit(() => {
      this.itemInput(i);
      const created = {
        ...i,
        id: id("item"),
        createdAt: new Date().toISOString(),
      };
      this.db.items.push(created);
      return created;
    });
  }
  updateItem(key: string, updates: Partial<Item>) {
    return this.commit(() => {
      const i = this.db.items.find((i) => i.id === key);
      if (!i) return undefined;
      const next = { ...i, ...updates, id: i.id, createdAt: i.createdAt };
      this.itemInput(next, key);
      Object.assign(i, next);
      return i;
    });
  }
  deleteItem(key: string) {
    return this.commit(() => {
      if (
        this.db.transactions.some((t) => t.items.some((i) => i.itemId === key))
      )
        fail("Item has transaction history and cannot be deleted");
      const count = this.db.items.length;
      this.db.items = this.db.items.filter((i) => i.id !== key);
      return count !== this.db.items.length;
    });
  }
  adjustStock(key: string, delta: number) {
    return this.commit(() => {
      number(delta, "Stock change", -Number.MAX_SAFE_INTEGER);
      const i = this.db.items.find((i) => i.id === key);
      if (!i) return undefined;
      if (i.currentStock + delta < 0) fail("Insufficient stock");
      i.currentStock = stockQuantity(i.currentStock + delta);
      return i;
    });
  }
  getTransactions(type?: string) {
    return structuredClone(
      this.db.transactions.filter((t) => !type || t.type === type),
    );
  }
  getTransactionById(key: string) {
    return this.getTransactions().find((t) => t.id === key);
  }
  private effects(t: Transaction): Effects {
    if (t.effects) return t.effects;
    const paid = t.initialPaidAmount ?? t.paidAmount;
    const stockSign =
      t.type === "sale" || t.type === "purchase_return"
        ? -1
        : t.type === "purchase" || t.type === "sale_return"
          ? 1
          : 0;
    const party =
      t.type === "sale" || t.type === "purchase_return"
        ? t.total - paid
        : t.type === "purchase" || t.type === "sale_return"
          ? -(t.total - paid)
          : t.type === "payment_in"
            ? -paid
            : t.type === "payment_out"
              ? paid
              : 0;
    const cashSign = ["sale", "payment_in", "purchase_return"].includes(t.type)
      ? 1
      : ["purchase", "payment_out", "sale_return"].includes(t.type)
        ? -1
        : 0;
    const account =
      this.db.accounts.find(
        (a) =>
          a.type === (t.paymentMode === "cash" ? "cash" : "bank") &&
          a.isDefault,
      ) ||
      this.db.accounts.find(
        (a) => a.type === (t.paymentMode === "cash" ? "cash" : "bank"),
      );
    const accountPostings = t.payments?.map((payment) => {
      const a =
        this.db.accounts.find(
          (a) =>
            a.type === (payment.mode === "cash" ? "cash" : "bank") &&
            a.isDefault,
        ) ||
        this.db.accounts.find(
          (a) => a.type === (payment.mode === "cash" ? "cash" : "bank"),
        );
      if (!a) fail("Payment account not found");
      return { accountId: a.id, amount: money(payment.amount * cashSign) };
    });
    return {
      accountPostings,
      party: money(party),
      cash: money(paid * cashSign),
      accountId: account?.id,
      stock: stockSign
        ? t.items.map((i) => ({
            itemId: i.itemId,
            delta: stockSign * i.quantity,
          }))
        : [],
    };
  }
  private applyEffects(t: Transaction, effects: Effects, sign = 1) {
    // Aggregate repeated item lines before checking availability.
    const deltas = new Map<string, number>();
    effects.stock.forEach((s) =>
      deltas.set(s.itemId, (deltas.get(s.itemId) || 0) + s.delta * sign),
    );
    deltas.forEach((delta, key) => {
      const item = this.db.items.find((i) => i.id === key);
      if (!item || stockQuantity(item.currentStock + delta) < 0)
        fail("Insufficient stock to post or reverse transaction");
    });
    deltas.forEach((delta, key) => {
      const item = this.db.items.find((i) => i.id === key)!;
      item.currentStock = stockQuantity(item.currentStock + delta);
    });
    const party = this.db.parties.find((p) => p.id === t.partyId);
    if (party)
      party.currentBalance = money(party.currentBalance + effects.party * sign);
    if (effects.accountPostings) {
      for (const posting of effects.accountPostings) {
        const account = this.db.accounts.find(
          (a) => a.id === posting.accountId,
        );
        if (!account) fail("Payment account not found");
        account.balance = money(account.balance + posting.amount * sign);
      }
    } else if (effects.cash) {
      const account = this.db.accounts.find((a) => a.id === effects.accountId);
      if (!account) fail("Payment account not found");
      account.balance = money(account.balance + effects.cash * sign);
    }
  }
  private rebuildLedger(partyId: string) {
    const p = this.db.parties.find((p) => p.id === partyId);
    if (!p) return;
    let balance = p.openingBalance;
    this.db.ledgers
      .filter((l) => l.partyId === partyId)
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((l) => {
        balance = money(balance + (l.type === "debit" ? l.amount : -l.amount));
        l.runningBalance = balance;
      });
  }
  private postLedger(t: Transaction) {
    if (
      !this.db.parties.some((p) => p.id === t.partyId) ||
      t.type === "quotation"
    )
      return;
    const add = (
      kind: "debit" | "credit",
      amount: number,
      description: string,
    ) => {
      if (amount > 0)
        this.db.ledgers.push({
          id: id("led"),
          date: t.date,
          partyId: t.partyId,
          partyName: t.partyName,
          transactionId: t.id,
          invoiceNumber: t.invoiceNumber,
          type: kind,
          amount,
          runningBalance: 0,
          description,
        });
    };
    const paid = t.initialPaidAmount ?? t.paidAmount;
    if (t.type === "payment_in" || t.type === "payment_out")
      add(t.type === "payment_in" ? "credit" : "debit", paid, t.type);
    else {
      const debit = t.type === "sale" || t.type === "purchase_return";
      add(debit ? "debit" : "credit", t.total, t.type);
      add(debit ? "credit" : "debit", paid, "Payment / refund");
    }
    this.rebuildLedger(t.partyId);
  }
  private settleInvoices() {
    const invoices = this.db.transactions.filter(
      (t) => t.type === "sale" || t.type === "purchase",
    );
    invoices.forEach((t) => {
      t.initialPaidAmount ??= t.paidAmount;
      t.paidAmount = t.initialPaidAmount;
      t.creditedAmount = money(
        this.db.transactions
          .filter(
            (r) =>
              r.originalTransactionId === t.id &&
              (r.type === "sale_return" || r.type === "purchase_return"),
          )
          .reduce(
            (s, r) => s + r.total - (r.initialPaidAmount ?? r.paidAmount),
            0,
          ),
      );
      t.balanceDue = money(
        Math.max(0, t.total - t.paidAmount - t.creditedAmount),
      );
    });
    const ordered = [...this.db.transactions].sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
    );
    for (const payment of ordered.filter(
      (t) => t.type === "payment_in" || t.type === "payment_out",
    )) {
      let available = payment.initialPaidAmount ?? payment.paidAmount;
      const targetType = payment.type === "payment_in" ? "sale" : "purchase";

      // If explicit allocations were designated by user:
      if (payment.allocations && payment.allocations.length > 0) {
        const designated = [...payment.allocations];
        payment.allocations = [];
        for (const alloc of designated) {
          const inv = ordered.find(
            (t) =>
              t.id === alloc.invoiceId &&
              t.partyId === payment.partyId &&
              t.type === targetType,
          );
          if (inv && inv.balanceDue > 0 && available > 0) {
            const amount = money(
              Math.min(available, Math.min(alloc.amount, inv.balanceDue)),
            );
            if (amount > 0) {
              inv.paidAmount = money(inv.paidAmount + amount);
              inv.balanceDue = money(inv.balanceDue - amount);
              available = money(available - amount);
              payment.allocations.push({
                invoiceId: inv.id,
                invoiceNumber: inv.invoiceNumber,
                amount,
              });
            }
          }
        }
      } else {
        payment.allocations = [];
      }

      // If available balance remains, allocate by originalTransactionId or FIFO
      if (available > 0) {
        for (const invoice of ordered.filter(
          (t) =>
            t.partyId === payment.partyId &&
            t.type === targetType &&
            (!payment.originalTransactionId ||
              t.id === payment.originalTransactionId),
        )) {
          const amount = money(Math.min(available, invoice.balanceDue));
          if (amount > 0) {
            invoice.paidAmount = money(invoice.paidAmount + amount);
            invoice.balanceDue = money(invoice.balanceDue - amount);
            available = money(available - amount);
            payment.allocations.push({
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              amount,
            });
          }
        }
      }
    }
    invoices.forEach((t) => {
      t.status =
        t.balanceDue === 0 ? "paid" : t.paidAmount > 0 ? "partial" : "unpaid";
    });
  }
  createTransaction(input: Omit<Transaction, "id" | "createdAt">) {
    return this.commit(() => {
      if (
        ![
          "sale",
          "purchase",
          "quotation",
          "payment_in",
          "payment_out",
          "sale_return",
          "purchase_return",
        ].includes(input.type)
      )
        fail("Invalid transaction type");
      const invoiceNumber = text(input.invoiceNumber, "Invoice number");
      if (this.db.transactions.some((t) => t.invoiceNumber === invoiceNumber))
        fail("Invoice number already exists");
      date(input.date);
      if (input.dueDate) {
        date(input.dueDate);
        if (input.dueDate < input.date)
          fail("Due date cannot precede invoice date");
      }
      const payment =
        input.type === "payment_in" || input.type === "payment_out";
      const isReturn =
        input.type === "sale_return" || input.type === "purchase_return";
      const party = this.db.parties.find((p) => p.id === input.partyId);
      const walkIn = input.partyId === "walk-in" && input.type === "sale";
      if (!party && !walkIn) fail("Valid party is required");
      const expectedType = [
        "purchase",
        "purchase_return",
        "payment_out",
      ].includes(input.type)
        ? "supplier"
        : "customer";
      if (party && party.type !== expectedType)
        fail(`Select a ${expectedType}`);
      if (!["cash", "bank", "upi", "cheque"].includes(input.paymentMode))
        fail("Invalid payment mode");
      const paid = number(input.paidAmount, "Paid amount");
      const payments = input.payments?.map((p) => {
        if (!["cash", "bank", "upi", "cheque"].includes(p.mode))
          fail("Invalid split payment mode");
        return {
          mode: p.mode,
          amount: money(number(p.amount, "Split payment amount")),
        };
      });
      if (
        payments &&
        money(payments.reduce((s, p) => s + p.amount, 0)) !== money(paid)
      )
        fail("Split payments must equal paid amount");
      if (
        !Array.isArray(input.items) ||
        (!payment && !input.items.length) ||
        (payment && input.items.length)
      )
        fail("Invalid transaction items");
      let original: Transaction | undefined;
      if (isReturn || input.originalTransactionId) {
        original = this.db.transactions.find(
          (t) => t.id === input.originalTransactionId,
        );
        if (
          !original ||
          original.partyId !== input.partyId ||
          original.type !== (expectedType === "supplier" ? "purchase" : "sale")
        )
          fail("Select the original invoice for this party");
      }
      const items = input.items.map((line) => {
        const item = this.db.items.find((i) => i.id === line.itemId);
        if (!item) return fail("Item not found");
        number(line.quantity, "Quantity", 0.001);
        number(line.price, "Price");
        number(line.discountPercent, "Discount");
        number(line.taxRate, "Tax rate");
        if (line.discountPercent > 100 || line.taxRate > 100)
          fail("Discount and tax percentages must be between 0 and 100");
        const originLine = original?.items.find((l) => l.itemId === item.id);
        if (
          isReturn &&
          (!originLine ||
            line.price !== originLine.price ||
            line.taxRate !== originLine.taxRate ||
            line.discountPercent !== originLine.discountPercent)
        )
          fail(
            "Return prices, tax and discounts must match the original invoice",
          );
        return calculateLine({
          ...line,
          itemName: item.name,
          itemCode: item.code,
          unit: item.unit,
          hsnCode: item.hsnCode,
          costPrice: originLine?.costPrice ?? item.purchasePrice,
        });
      });
      if (isReturn && original) {
        for (const itemId of new Set(items.map((l) => l.itemId))) {
          const ordered = original.items
            .filter((l) => l.itemId === itemId)
            .reduce((s, l) => s + l.quantity, 0);
          const returned = this.db.transactions
            .filter(
              (t) =>
                t.originalTransactionId === original!.id &&
                t.type === input.type,
            )
            .flatMap((t) => t.items)
            .filter((l) => l.itemId === itemId)
            .reduce((s, l) => s + l.quantity, 0);
          const requested = items
            .filter((l) => l.itemId === itemId)
            .reduce((s, l) => s + l.quantity, 0);
          if (requested + returned > ordered)
            fail("Return quantity exceeds original invoice quantity");
        }
      }
      const totals = calculateTotals(items, !!input.interstate);
      if (payment) {
        if (paid <= 0) fail("Payment must be positive");
        totals.total = money(paid);
      }
      if (input.type === "quotation" && paid !== 0)
        fail("Quotations cannot receive payments");
      if (paid > totals.total)
        fail(
          "Paid amount exceeds invoice total; enter the amount kept after change",
        );
      if (walkIn && paid < totals.total)
        fail("Choose a customer for a credit sale");
      const balanceDue = payment ? 0 : money(totals.total - paid);
      const t: Transaction = {
        payments,
        allocations: input.allocations,
        invoiceNumber,
        type: input.type,
        partyId: walkIn ? "walk-in" : party!.id,
        partyName: walkIn ? "Walk-in Cash Customer" : party!.name,
        date: input.date,
        dueDate: input.dueDate,
        notes: input.notes,
        originalTransactionId: input.originalTransactionId,
        interstate: !!input.interstate,
        items,
        ...totals,
        paidAmount: money(paid),
        initialPaidAmount: money(paid),
        balanceDue,
        paymentMode: input.paymentMode,
        status: balanceDue === 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
        id: id("txn"),
        createdAt: new Date().toISOString(),
      };
      t.effects = this.effects(t);
      if (
        party &&
        party.creditLimit &&
        t.type === "sale" &&
        party.currentBalance + balanceDue > party.creditLimit
      )
        fail("Customer credit limit exceeded");
      this.applyEffects(t, t.effects);
      this.db.transactions.unshift(t);
      this.postLedger(t);
      this.settleInvoices();
      const isPay = t.type === "payment_in" || t.type === "payment_out";
      this.logChange({
        entityType: isPay ? "payment" : "invoice",
        entityId: t.id,
        entityNumber: t.invoiceNumber,
        action: "created",
        summary: `${isPay ? (t.type === "payment_in" ? "Payment received" : "Payment sent") : "Invoice"} ${t.invoiceNumber} recorded for PKR ${t.total} (${t.partyName})`,
      });
      return t;
    });
  }
  updateTransaction(key: string, updates: Partial<Transaction>) {
    return this.commit(() => {
      const t = this.db.transactions.find((t) => t.id === key);
      if (!t) return undefined;
      const changes: { field: string; oldValue: any; newValue: any }[] = [];
      if (updates.notes !== undefined && updates.notes !== t.notes) {
        changes.push({ field: "notes", oldValue: t.notes, newValue: updates.notes });
        t.notes = updates.notes;
      }
      if (updates.dueDate !== undefined && updates.dueDate !== t.dueDate) {
        changes.push({ field: "dueDate", oldValue: t.dueDate, newValue: updates.dueDate });
        t.dueDate = updates.dueDate;
      }
      if (updates.allocations !== undefined) {
        changes.push({ field: "allocations", oldValue: t.allocations, newValue: updates.allocations });
        t.allocations = updates.allocations;
        this.settleInvoices();
      }
      const isPay = t.type === "payment_in" || t.type === "payment_out";
      this.logChange({
        entityType: isPay ? "payment" : "invoice",
        entityId: t.id,
        entityNumber: t.invoiceNumber,
        action: "updated",
        summary: `${t.type.replace("_", " ")} ${t.invoiceNumber} updated`,
        changes,
      });
      return t;
    });
  }
  deleteTransaction(key: string) {
    return this.commit(() => {
      const t = this.db.transactions.find((t) => t.id === key);
      if (!t) return false;
      if (
        this.db.transactions.some(
          (x) =>
            x.originalTransactionId === key ||
            x.allocations?.some((a) => a.invoiceId === key),
        )
      )
        fail("Reverse linked payments and returns first");
      this.applyEffects(t, this.effects(t), -1);
      this.db.transactions = this.db.transactions.filter((t) => t.id !== key);
      this.db.ledgers = this.db.ledgers.filter((l) => l.transactionId !== key);
      this.rebuildLedger(t.partyId);
      this.settleInvoices();
      const isPay = t.type === "payment_in" || t.type === "payment_out";
      this.logChange({
        entityType: isPay ? "payment" : "invoice",
        entityId: t.id,
        entityNumber: t.invoiceNumber,
        action: "deleted",
        summary: `${t.type.replace("_", " ")} ${t.invoiceNumber} deleted`,
      });
      return true;
    });
  }
  getPartyLedger(key: string): LedgerEntry[] {
    return structuredClone(
      this.db.ledgers
        .filter((l) => l.partyId === key)
        .sort((a, b) => a.date.localeCompare(b.date)),
    );
  }
  getPartyStatement(
    key: string,
    startDate?: string,
    endDate?: string,
  ): PartyStatementResult {
    const party = this.db.parties.find((p) => p.id === key);
    if (!party) fail("Party not found");

    const allEntries = this.db.ledgers
      .filter((l) => l.partyId === key)
      .sort((a, b) => a.date.localeCompare(b.date));

    let opening = party.openingBalance;
    if (startDate) {
      for (const e of allEntries) {
        if (e.date < startDate) {
          opening = money(opening + (e.type === "debit" ? e.amount : -e.amount));
        }
      }
    }

    const openingBalanceType: "Dr" | "Cr" | "Settled" =
      opening > 0 ? "Dr" : opening < 0 ? "Cr" : "Settled";
    const openingBalanceLabel: "To Receive" | "To Pay" | "Settled" =
      opening > 0 ? "To Receive" : opening < 0 ? "To Pay" : "Settled";

    const filtered = allEntries.filter((e) => {
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      return true;
    });

    let running = opening;
    let totalDebits = 0;
    let totalCredits = 0;

    const entries = filtered.map((e) => {
      if (e.type === "debit") totalDebits = money(totalDebits + e.amount);
      else totalCredits = money(totalCredits + e.amount);
      running = money(running + (e.type === "debit" ? e.amount : -e.amount));
      const balanceType: "Dr" | "Cr" | "Settled" =
        running > 0 ? "Dr" : running < 0 ? "Cr" : "Settled";
      const balanceLabel: "To Receive" | "To Pay" | "Settled" =
        running > 0 ? "To Receive" : running < 0 ? "To Pay" : "Settled";
      return {
        ...structuredClone(e),
        runningBalance: running,
        balanceType,
        balanceLabel,
      };
    });

    const closingBalance = running;
    const closingBalanceType: "Dr" | "Cr" | "Settled" =
      closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : "Settled";
    const closingBalanceLabel: "To Receive" | "To Pay" | "Settled" =
      closingBalance > 0 ? "To Receive" : closingBalance < 0 ? "To Pay" : "Settled";

    return {
      party: structuredClone(party),
      startDate,
      endDate,
      openingBalance: opening,
      openingBalanceType,
      openingBalanceLabel,
      entries,
      totalDebits,
      totalCredits,
      closingBalance,
      closingBalanceType,
      closingBalanceLabel,
    };
  }
  getExpenses() {
    return structuredClone(this.db.expenses);
  }
  createExpense(e: Omit<Expense, "id" | "createdAt">) {
    return this.commit(() => {
      number(e.amount, "Expense", 0.01);
      date(e.date);
      const account = this.db.accounts.find((a) => a.id === e.accountId);
      if (!account) fail("Account not found");
      const category = this.db.expenseCategories.find(
        (c) => c.id === e.categoryId,
      );
      if (!category) fail("Category not found");
      if (!["cash", "bank", "upi", "cheque"].includes(e.paymentMode))
        fail("Invalid expense payment mode");
      const paymentMode =
        account.type === "cash"
          ? "cash"
          : e.paymentMode === "cash"
            ? "bank"
            : e.paymentMode;
      const created = {
        ...e,
        paymentMode: paymentMode as Expense["paymentMode"],
        categoryName: category.name,
        id: id("exp"),
        createdAt: new Date().toISOString(),
      };
      account.balance = money(account.balance - e.amount);
      this.db.expenses.unshift(created);
      return created;
    });
  }
  deleteExpense(key: string) {
    return this.commit(() => {
      const e = this.db.expenses.find((e) => e.id === key);
      if (!e) return false;
      const account = this.db.accounts.find((a) => a.id === e.accountId);
      if (!account) fail("Account not found");
      account.balance = money(account.balance + e.amount);
      this.db.expenses = this.db.expenses.filter((e) => e.id !== key);
      return true;
    });
  }
  getExpenseCategories() {
    return structuredClone(this.db.expenseCategories);
  }
  createExpenseCategory(c: Omit<ExpenseCategory, "id">) {
    return this.commit(() => {
      text(c.name, "Category name");
      if (!["direct", "indirect"].includes(c.type))
        fail("Invalid category type");
      const created = { ...c, id: id("expcat") };
      this.db.expenseCategories.push(created);
      return created;
    });
  }
  getAccounts() {
    return structuredClone(this.db.accounts);
  }
  createAccount(a: Omit<BankAccount, "id">) {
    return this.commit(() => {
      text(a.name, "Account name");
      number(a.balance, "Opening balance");
      if (!["cash", "bank"].includes(a.type)) fail("Invalid account type");
      const created = { ...a, id: id("acc") };
      this.db.accounts.push(created);
      return created;
    });
  }
  transferFunds(from: string, to: string, amount: number, notes?: string) {
    return this.commit(() => {
      number(amount, "Transfer amount", 0.01);
      if (from === to) fail("Choose different accounts");
      const source = this.db.accounts.find((a) => a.id === from),
        target = this.db.accounts.find((a) => a.id === to);
      if (!source || !target) fail("Account not found");
      if (source.balance < amount) fail("Insufficient funds");
      source.balance = money(source.balance - amount);
      target.balance = money(target.balance + amount);
      this.db.transfers ??= [];
      this.db.transfers.push({
        id: id("transfer"),
        fromAccountId: from,
        toAccountId: to,
        amount: money(amount),
        notes,
        createdAt: new Date().toISOString(),
      });
      return true;
    });
  }
  getPrintSettings() {
    return structuredClone(this.db.printSettings);
  }
  updatePrintSettings(p: Partial<PrintSettings>) {
    return this.commit(() => {
      const next = { ...this.db.printSettings, ...p };
      if (
        !["laser_a4", "laser_a5", "thermal_80mm", "thermal_58mm"].includes(
          next.paperSize,
        )
      )
        fail("Invalid paper format");
      for (const k of [
        "companyLogo",
        "signature",
        "upiQr",
        "taxBreakup",
        "notesAndTerms",
      ] as const)
        if (typeof next[k] !== "boolean") fail("Invalid print option");
      if (!/^#[0-9a-f]{6}$/i.test(next.themeColor)) fail("Invalid theme color");
      this.db.printSettings = next;
      return next;
    });
  }
  getDashboardStats() {
    const sum = (type: string) =>
      money(
        this.db.transactions
          .filter((t) => t.type === type)
          .reduce((s, t) => s + t.total, 0),
      );
    return {
      totalSales: money(sum("sale") - sum("sale_return")),
      totalPurchases: money(sum("purchase") - sum("purchase_return")),
      toCollect: money(
        this.db.parties.reduce((s, p) => s + Math.max(0, p.currentBalance), 0),
      ),
      toPay: money(
        this.db.parties.reduce((s, p) => s + Math.max(0, -p.currentBalance), 0),
      ),
      cashInHand: money(
        this.db.accounts
          .filter((a) => a.type === "cash")
          .reduce((s, a) => s + a.balance, 0),
      ),
      bankBalance: money(
        this.db.accounts
          .filter((a) => a.type === "bank")
          .reduce((s, a) => s + a.balance, 0),
      ),
      stockValue: money(
        this.db.items.reduce((s, i) => s + i.currentStock * i.purchasePrice, 0),
      ),
      lowStockItemsCount: this.db.items.filter(
        (i) => i.currentStock <= i.minStockAlert,
      ).length,
      recentTransactions: this.getTransactions().slice(0, 8),
    };
  }
  getProfitAndLoss(startDate?: string, endDate?: string) {
    let salesRevenue = 0,
      purchasesCost = 0;
    for (const t of this.db.transactions) {
      if (startDate && t.date < startDate) continue;
      if (endDate && t.date > endDate) continue;
      if (t.type === "sale" || t.type === "sale_return") {
        const sign = t.type === "sale" ? 1 : -1;
        salesRevenue += sign * (t.subtotal - t.discountTotal);
        purchasesCost +=
          sign *
          t.items.reduce(
            (s, l) =>
              s +
              l.quantity *
                (l.costPrice ??
                  this.db.items.find((i) => i.id === l.itemId)?.purchasePrice ??
                  0),
            0,
          );
      }
    }
    const filteredExpenses = this.db.expenses.filter((e) => {
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      return true;
    });
    const totalExpenses = money(
      filteredExpenses.reduce((s, e) => s + e.amount, 0),
    );
    return {
      salesRevenue: money(salesRevenue),
      purchasesCost: money(purchasesCost),
      grossProfit: money(salesRevenue - purchasesCost),
      totalExpenses,
      netProfit: money(salesRevenue - purchasesCost - totalExpenses),
      expenseBreakdown: structuredClone(filteredExpenses),
    };
  }
  getGstReport(startDate?: string, endDate?: string) {
    let totalTaxableSale = 0,
      totalOutputGst = 0,
      totalTaxablePurchase = 0,
      totalInputGst = 0;
    for (const t of this.db.transactions) {
      if (startDate && t.date < startDate) continue;
      if (endDate && t.date > endDate) continue;
      const sign = t.type.endsWith("_return") ? -1 : 1;
      if (t.type === "sale" || t.type === "sale_return") {
        totalTaxableSale += sign * (t.subtotal - t.discountTotal);
        totalOutputGst += sign * t.taxTotal;
      } else if (t.type === "purchase" || t.type === "purchase_return") {
        totalTaxablePurchase += sign * (t.subtotal - t.discountTotal);
        totalInputGst += sign * t.taxTotal;
      }
    }
    return {
      totalTaxableSale: money(totalTaxableSale),
      totalOutputGst: money(totalOutputGst),
      totalTaxablePurchase: money(totalTaxablePurchase),
      totalInputGst: money(totalInputGst),
      netGstPayable: money(Math.max(0, totalOutputGst - totalInputGst)),
    };
  }
  getBackupMetadata(): BackupMetadata {
    return structuredClone(this.db.backupMetadata || {});
  }
  setBackupMetadata(meta: BackupMetadata) {
    return this.commit(() => {
      this.db.backupMetadata = structuredClone(meta);
      return this.db.backupMetadata;
    });
  }
  exportBackup() {
    return structuredClone(this.db);
  }
  protected validateBackup(value: any): DatabaseSchema {
    if (!value || typeof value !== "object") fail("Invalid backup");
    for (const k of [
      "parties",
      "items",
      "godowns",
      "transactions",
      "expenses",
      "expenseCategories",
      "accounts",
      "ledgers",
    ])
      if (!Array.isArray(value[k])) fail(`Backup missing ${k}`);
    for (const k of [
      "name",
      "gstin",
      "phone",
      "email",
      "address",
      "city",
      "state",
      "pincode",
      "upiId",
      "bankName",
      "accountNumber",
      "ifsc",
      "termsAndConditions",
    ])
      if (typeof value.profile?.[k] !== "string")
        fail(`Backup has invalid profile ${k}`);
    text(value.profile.id, "Profile ID");
    if (
      !value.printSettings ||
      !["laser_a4", "laser_a5", "thermal_80mm", "thermal_58mm"].includes(
        value.printSettings.paperSize,
      )
    )
      fail("Backup has invalid print settings");
    if (!/^#[0-9a-f]{6}$/i.test(value.printSettings.themeColor))
      fail("Backup has invalid print color");
    for (const k of [
      "companyLogo",
      "signature",
      "upiQr",
      "taxBreakup",
      "notesAndTerms",
    ])
      if (typeof value.printSettings[k] !== "boolean")
        fail("Backup has invalid print settings");
    for (const collection of [
      "parties",
      "items",
      "godowns",
      "transactions",
      "expenses",
      "expenseCategories",
      "accounts",
      "ledgers",
    ]) {
      const keys = new Set();
      for (const entry of value[collection]) {
        text(entry?.id, `${collection} ID`);
        if (keys.has(entry.id)) fail("Duplicate record ID in backup");
        keys.add(entry.id);
      }
    }
    for (const p of value.parties) {
      this.partyInput(p);
      number(p.currentBalance, "Party balance", -Number.MAX_SAFE_INTEGER);
    }
    for (const i of value.items) {
      for (const k of [
        "purchasePrice",
        "salesPrice",
        "mrp",
        "taxRate",
        "currentStock",
        "minStockAlert",
      ])
        number(i[k], k);
      text(i.name, "Item name");
      text(i.code, "Item code");
      if (typeof i.barcode !== "string") fail("Invalid barcode");
      text(i.category, "Category");
      text(i.unit, "Unit");
    }
    for (const a of value.accounts) {
      number(a.balance, "Account balance", -Number.MAX_SAFE_INTEGER);
      text(a.name, "Account name");
      if (!["cash", "bank"].includes(a.type)) fail("Invalid account type");
    }
    for (const t of value.transactions) {
      text(t.invoiceNumber, "Invoice number");
      text(t.partyName, "Party name");
      date(t.date);
      if (
        !Array.isArray(t.items) ||
        ![
          "sale",
          "purchase",
          "quotation",
          "payment_in",
          "payment_out",
          "sale_return",
          "purchase_return",
        ].includes(t.type)
      )
        fail("Invalid backup transaction");
      for (const k of [
        "total",
        "paidAmount",
        "balanceDue",
        "subtotal",
        "discountTotal",
        "taxTotal",
        "cgst",
        "sgst",
        "igst",
      ])
        number(t[k], k);
      for (const l of t.items) {
        text(l.itemId, "Item ID");
        number(l.quantity, "Quantity", 0.001);
        for (const k of [
          "price",
          "discountPercent",
          "discountAmount",
          "taxRate",
          "taxAmount",
          "total",
        ])
          number(l[k], k);
      }
      if (t.effects) {
        number(t.effects.party, "Posting", -Number.MAX_SAFE_INTEGER);
        number(t.effects.cash, "Cash posting", -Number.MAX_SAFE_INTEGER);
        if (!Array.isArray(t.effects.stock)) fail("Invalid stock posting");
        t.effects.stock.forEach((s: any) => {
          text(s.itemId, "Stock item");
          number(s.delta, "Stock delta", -Number.MAX_SAFE_INTEGER);
        });
      }
    }
    for (const e of value.expenses) {
      number(e.amount, "Expense", 0.01);
      date(e.date);
      if (!value.accounts.some((a: BankAccount) => a.id === e.accountId))
        fail("Expense account missing");
    }
    for (const l of value.ledgers) {
      date(l.date);
      number(l.amount, "Ledger amount");
      number(l.runningBalance, "Ledger balance", -Number.MAX_SAFE_INTEGER);
      if (!["debit", "credit"].includes(l.type)) fail("Invalid ledger type");
    }
    for (const t of value.transactions) {
      text(t.partyId, "Party ID");
      text(t.createdAt, "Created time");
      if (
        !Number.isFinite(Date.parse(t.createdAt)) ||
        !["cash", "bank", "upi", "cheque"].includes(t.paymentMode) ||
        !["paid", "unpaid", "partial"].includes(t.status)
      )
        fail("Invalid transaction metadata");
      if (t.initialPaidAmount !== undefined)
        number(t.initialPaidAmount, "Initial payment");
      if (t.creditedAmount !== undefined) number(t.creditedAmount, "Credit");
      for (const l of t.items) {
        text(l.itemName, "Line item name");
        text(l.itemCode, "Line item code");
        text(l.unit, "Line unit");
        if (l.costPrice !== undefined) number(l.costPrice, "Cost");
      }
      if (t.payments !== undefined) {
        if (!Array.isArray(t.payments)) fail("Invalid split payments");
        for (const p of t.payments) {
          number(p.amount, "Split amount");
          if (!["cash", "bank", "upi", "cheque"].includes(p.mode))
            fail("Invalid split mode");
        }
      }
      if (t.allocations !== undefined) {
        if (!Array.isArray(t.allocations)) fail("Invalid allocations");
        for (const a of t.allocations) {
          text(a.invoiceId, "Allocated invoice");
          number(a.amount, "Allocation");
        }
      }
      if (t.effects?.accountPostings !== undefined) {
        if (!Array.isArray(t.effects.accountPostings))
          fail("Invalid account postings");
        for (const a of t.effects.accountPostings) {
          text(a.accountId, "Posting account");
          number(a.amount, "Posting amount", -Number.MAX_SAFE_INTEGER);
        }
      }
    }
    for (const p of value.parties) {
      text(p.createdAt, "Party created time");
      if (typeof p.billingAddress !== "string") fail("Invalid address");
    }
    for (const c of value.expenseCategories) {
      text(c.name, "Category name");
      if (!["direct", "indirect"].includes(c.type)) fail("Invalid category");
    }
    for (const g of value.godowns) {
      text(g.name, "Godown name");
      if (typeof g.isDefault !== "boolean") fail("Invalid default godown");
    }
    for (const a of value.accounts)
      if (typeof a.isDefault !== "boolean") fail("Invalid default account");
    for (const e of value.expenses) {
      text(e.categoryName, "Expense category");
      text(e.accountId, "Expense account");
    }
    if (value.transfers !== undefined) {
      if (!Array.isArray(value.transfers)) fail("Invalid transfers");
      for (const t of value.transfers) {
        text(t.id, "Transfer ID");
        text(t.fromAccountId, "Source account");
        text(t.toAccountId, "Destination account");
      }
    }
    value.changeHistory = Array.isArray(value.changeHistory) ? value.changeHistory : [];
    return structuredClone(value);
  }
  restoreBackup(value: DatabaseSchema) {
    const valid = this.validateBackup(value);
    return this.commit(() => { this.db = valid; return true; }, true);
  }
}
