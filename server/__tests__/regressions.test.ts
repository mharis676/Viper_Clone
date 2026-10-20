import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import app from "../index.js";
import { db, DatabaseManager } from "../db.js";
import { calculateLine } from "../calculations.js";

const baseline = db.exportBackup();
beforeEach(() => {
  const seed = structuredClone(baseline);
  seed.transactions = [];
  seed.ledgers = [];
  seed.expenses = [];
  seed.parties.forEach((p) => {
    p.openingBalance = 0;
    p.currentBalance = 0;
  });
  seed.items[0].currentStock = 5;
  seed.items[0].purchasePrice = 60;
  seed.accounts.forEach((a) => {
    a.balance = 1000;
  });
  db.restoreBackup(seed);
});
let sequence = 0;
const payload = (patch: Record<string, unknown> = {}) => ({
  invoiceNumber: `QA-${++sequence}`,
  type: "sale",
  partyId: "party-1",
  partyName: "Ignored name",
  date: "2026-01-01",
  items: [
    {
      itemId: "item-1",
      quantity: 1,
      price: 100,
      discountPercent: 0,
      taxRate: 18,
    },
  ],
  paidAmount: 50,
  paymentMode: "cash",
  ...patch,
});
const create = async (patch: Record<string, unknown> = {}) => {
  const response = await request(app)
    .post("/api/transactions")
    .send(payload(patch));
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  return response.body;
};
const balances = () => ({
  stock: db.getItems()[0].currentStock,
  party: db.getParties()[0].currentBalance,
  cash: db.getAccounts()[0].balance,
});

describe("Accounting integrity regressions", () => {
  it("derives totals and ignores forged identity and financial fields", async () => {
    const t = await create({ total: 1, balanceDue: -999, taxTotal: 0 });
    expect(t.total).toBe(118);
    expect(t.taxTotal).toBe(18);
    expect(t.balanceDue).toBe(68);
    expect(t.partyName).toBe(db.getParties()[0].name);
  });
  it("reverses stock, cash, party and ledger together", async () => {
    const before = balances(),
      t = await create();
    expect(balances()).toEqual({ stock: 4, cash: 1050, party: 68 });
    expect(
      (await request(app).delete(`/api/transactions/${t.id}`)).status,
    ).toBe(200);
    expect(balances()).toEqual(before);
    expect(db.getPartyLedger("party-1")).toEqual([]);
  });
  it("rejects overselling without any mutation, including duplicate lines", async () => {
    const before = db.exportBackup();
    const p = payload();
    p.items[0].quantity = 3;
    p.items.push({ ...p.items[0] });
    expect((await request(app).post("/api/transactions").send(p)).status).toBe(
      400,
    );
    expect(db.exportBackup()).toEqual(before);
  });
  it("leaves no record after malformed or negative requests", async () => {
    const before = db.exportBackup();
    for (const p of [
      { type: "sale" },
      payload({ items: [] }),
      payload({ paidAmount: -1 }),
      payload({ partyId: "missing" }),
      payload({
        items: [
          {
            itemId: "item-1",
            quantity: -1,
            price: 100,
            discountPercent: 0,
            taxRate: 18,
          },
        ],
      }),
    ])
      expect(
        (await request(app).post("/api/transactions").send(p)).status,
      ).toBe(400);
    expect(db.exportBackup()).toEqual(before);
  });
  it("rejects duplicate invoice numbers", async () => {
    const t = await create();
    expect(
      (
        await request(app)
          .post("/api/transactions")
          .send(payload({ invoiceNumber: t.invoiceNumber }))
      ).status,
    ).toBe(400);
  });
  it("posts dated ledger entries with sequential balances", async () => {
    await create();
    const ledger = db.getPartyLedger("party-1");
    expect(ledger.map((l) => l.date)).toEqual(["2026-01-01", "2026-01-01"]);
    expect(ledger.map((l) => l.runningBalance)).toEqual([118, 68]);
  });
  it("rebuilds backdated running balances", async () => {
    await create({ date: "2026-02-01", paidAmount: 0 });
    await create({ date: "2026-01-01", paidAmount: 0 });
    expect(db.getPartyLedger("party-1").map((l) => l.runningBalance)).toEqual([
      118, 236,
    ]);
  });
  it("records and reverses sale refunds and report effects", async () => {
    const sale = await create({ paidAmount: 118 });
    const afterSale = balances();
    const ret = await create({
      type: "sale_return",
      originalTransactionId: sale.id,
      paidAmount: 118,
    });
    expect(balances()).toEqual({ stock: 5, party: 0, cash: 1000 });
    expect(db.getGstReport().totalOutputGst).toBe(0);
    expect(db.getProfitAndLoss().grossProfit).toBe(0);
    await request(app).delete(`/api/transactions/${ret.id}`);
    expect(balances()).toEqual(afterSale);
  });
  it("requires original return and prevents returning an item twice", async () => {
    expect(
      (
        await request(app)
          .post("/api/transactions")
          .send(payload({ type: "sale_return" }))
      ).status,
    ).toBe(400);
    const sale = await create();
    await create({
      type: "sale_return",
      originalTransactionId: sale.id,
      paidAmount: 0,
    });
    expect(
      (
        await request(app)
          .post("/api/transactions")
          .send(
            payload({
              type: "sale_return",
              originalTransactionId: sale.id,
              paidAmount: 0,
            }),
          )
      ).status,
    ).toBe(400);
    expect(
      (await request(app).delete(`/api/transactions/${sale.id}`)).status,
    ).toBe(400);
  });
  it("records and reverses purchase returns", async () => {
    const purchase = await create({
      type: "purchase",
      partyId: "party-3",
      paidAmount: 118,
    });
    const ret = await create({
      type: "purchase_return",
      partyId: "party-3",
      originalTransactionId: purchase.id,
      paidAmount: 118,
    });
    expect(db.getItems()[0].currentStock).toBe(5);
    expect(db.getAccounts()[0].balance).toBe(1000);
    expect(db.getGstReport().totalInputGst).toBe(0);
    await request(app).delete(`/api/transactions/${ret.id}`);
    expect(db.getItems()[0].currentStock).toBe(6);
  });
  it("settles an invoice and restores it after payment reversal", async () => {
    const sale = await create({ paidAmount: 0 });
    const payment = await create({
      type: "payment_in",
      items: [],
      paidAmount: 118,
    });
    expect(db.getTransactionById(sale.id)).toMatchObject({
      paidAmount: 118,
      balanceDue: 0,
      status: "paid",
    });
    expect(balances().party).toBe(0);
    expect(
      (await request(app).delete(`/api/transactions/${sale.id}`)).status,
    ).toBe(400);
    await request(app).delete(`/api/transactions/${payment.id}`);
    expect(db.getTransactionById(sale.id)).toMatchObject({
      balanceDue: 118,
      status: "unpaid",
    });
  });
  it("applies opening balance delta", async () => {
    await create();
    await request(app)
      .put("/api/parties/party-1")
      .send({ openingBalance: 500 });
    expect(balances().party).toBe(568);
    expect(db.getPartyLedger("party-1").map((l) => l.runningBalance)).toEqual([
      618, 568,
    ]);
  });
  it("snapshots cost of sold stock and subtracts discounts", async () => {
    await create({
      items: [
        {
          itemId: "item-1",
          quantity: 1,
          price: 100,
          discountPercent: 10,
          taxRate: 18,
        },
      ],
      paidAmount: 0,
    });
    db.updateItem("item-1", { purchasePrice: 80 });
    expect(db.getProfitAndLoss()).toMatchObject({
      salesRevenue: 90,
      purchasesCost: 60,
      grossProfit: 30,
    });
  });
  it("does not expense unsold purchases", async () => {
    await create({ type: "purchase", partyId: "party-3" });
    expect(db.getProfitAndLoss().purchasesCost).toBe(0);
  });
  it("calculates interstate tax separately", async () => {
    const t = await create({ interstate: true });
    expect(t).toMatchObject({ cgst: 0, sgst: 0, igst: 18 });
  });
  it("records quotation without cash, stock or party postings", async () => {
    const before = balances();
    await create({ type: "quotation", paidAmount: 0 });
    expect(balances()).toEqual(before);
  });
  it("rejects walk-in credit instead of charging the first party", async () => {
    expect(
      (
        await request(app)
          .post("/api/transactions")
          .send(payload({ partyId: "walk-in", paidAmount: 0 }))
      ).status,
    ).toBe(400);
    const t = await create({ partyId: "walk-in", paidAmount: 118 });
    expect(t.partyId).toBe("walk-in");
    expect(balances().party).toBe(0);
  });
  it("rejects unsafe transfers and records valid transfer notes", async () => {
    const before = db.getAccounts();
    for (const amount of ["100", null, -1, 2000])
      expect(
        (
          await request(app)
            .post("/api/accounts/transfer")
            .send({ fromAccountId: "acc-1", toAccountId: "acc-2", amount })
        ).status,
      ).toBe(400);
    expect(db.getAccounts()).toEqual(before);
    expect(
      (
        await request(app)
          .post("/api/accounts/transfer")
          .send({
            fromAccountId: "acc-1",
            toAccountId: "acc-2",
            amount: 100,
            notes: "Deposit",
          })
      ).status,
    ).toBe(200);
    expect(db.exportBackup().transfers?.[0].notes).toBe("Deposit");
  });
  it("rejects incomplete backup without changing data and snapshots a valid restore", async () => {
    const before = db.exportBackup();
    expect(
      (
        await request(app)
          .post("/api/backup/restore")
          .send({ profile: {}, items: [] })
      ).status,
    ).toBe(400);
    expect(db.exportBackup()).toEqual(before);
    expect((await request(app).get("/api/dashboard/stats")).status).toBe(200);
    db.restoreBackup(before);
    expect(
      fs.readdirSync(db.directory).some((f) => f.includes("before-restore")),
    ).toBe(true);
  });
  it("does not reset corrupt persistent data", () => {
    const dir = path.join(db.directory, "corrupt");
    fs.mkdirSync(dir);
    const filename = path.join(dir, "vyapar_db.json");
    fs.writeFileSync(filename, "{broken");
    expect(() => new DatabaseManager(baseline, dir)).toThrow();
    expect(fs.readFileSync(filename, "utf8")).toBe("{broken");
  });
  it("rolls back memory when persistence fails", async () => {
    const before = db.exportBackup(),
      file = path.join(db.directory, "vyapar_db.json");
    fs.renameSync(file, `${file}.test`);
    fs.mkdirSync(file);
    try {
      expect(
        (await request(app).post("/api/transactions").send(payload())).status,
      ).toBe(400);
      expect(db.exportBackup()).toEqual(before);
    } finally {
      fs.rmdirSync(file);
      fs.renameSync(`${file}.test`, file);
    }
  });
  it("calculates default and discounted lines without stale tax", () => {
    const first = calculateLine({
      quantity: 1,
      price: 750,
      discountPercent: 0,
      taxRate: 18,
    });
    expect(first.total).toBe(885);
    expect(
      calculateLine({ ...first, price: 100, discountPercent: 10 }),
    ).toMatchObject({ discountAmount: 10, taxAmount: 16.2, total: 106.2 });
  });
  it("splits tender across accounts and reverses both postings", async () => {
    const t = await create({
      paidAmount: 118,
      payments: [
        { mode: "cash", amount: 40 },
        { mode: "bank", amount: 78 },
      ],
    });
    expect(
      db
        .getAccounts()
        .slice(0, 2)
        .map((a) => a.balance),
    ).toEqual([1040, 1078]);
    await request(app).delete(`/api/transactions/${t.id}`);
    expect(
      db
        .getAccounts()
        .slice(0, 2)
        .map((a) => a.balance),
    ).toEqual([1000, 1000]);
    expect(
      (
        await request(app)
          .post("/api/transactions")
          .send(
            payload({
              paidAmount: 100,
              payments: [{ mode: "cash", amount: 1 }],
            }),
          )
      ).status,
    ).toBe(400);
  });
  it("credits outstanding invoices for unpaid returns and reverses that credit", async () => {
    const sale = await create({ paidAmount: 0 });
    const ret = await create({
      type: "sale_return",
      originalTransactionId: sale.id,
      paidAmount: 0,
    });
    expect(db.getTransactionById(sale.id)).toMatchObject({
      balanceDue: 0,
      creditedAmount: 118,
    });
    expect(balances().party).toBe(0);
    await request(app).delete(`/api/transactions/${ret.id}`);
    expect(db.getTransactionById(sale.id)?.balanceDue).toBe(118);
  });
  it("serializes separate database managers without losing committed records", () => {
    const other = new DatabaseManager(baseline, db.directory);
    db.createExpenseCategory({ name: "First", type: "direct" });
    other.createExpenseCategory({ name: "Second", type: "direct" });
    const fresh = new DatabaseManager(baseline, db.directory);
    expect(fresh.getExpenseCategories().map((c) => c.name)).toEqual(
      expect.arrayContaining(["First", "Second"]),
    );
  });
  it("enforces access token when configured without modifying records", async () => {
    process.env.API_TOKEN = "qa-secret";
    try {
      expect((await request(app).get("/api/health")).status).toBe(401);
      expect(
        (
          await request(app)
            .get("/api/health")
            .set("Authorization", "Bearer qa-secret")
        ).status,
      ).toBe(200);
    } finally {
      delete process.env.API_TOKEN;
    }
  });
  it("preserves fractional stock quantities through sale and reversal", async () => {
    const sale = await create({
      items: [
        {
          itemId: "item-1",
          quantity: 0.001,
          price: 100,
          discountPercent: 0,
          taxRate: 18,
        },
      ],
      paidAmount: 0,
    });
    expect(db.getItems()[0].currentStock).toBe(4.999);
    await request(app).delete(`/api/transactions/${sale.id}`);
    expect(db.getItems()[0].currentStock).toBe(5);
  });
});
