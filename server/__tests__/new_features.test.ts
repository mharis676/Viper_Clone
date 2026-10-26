import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index.js";
import { db } from "../db.js";

describe("New Improvements & Features Test Suite", () => {
  let customerId = "";
  let invoice1Id = "";
  let invoice2Id = "";

  beforeEach(async () => {
    // Seed test customer
    const partyRes = await request(app)
      .post("/api/parties")
      .send({
        name: "Test Trading Co",
        type: "customer",
        phone: "03001234567",
        openingBalance: 5000,
        billingAddress: "Shop 10, Commercial Area",
      });
    customerId = partyRes.body.id;

    // Seed item
    const itemRes = await request(app)
      .post("/api/items")
      .send({
        name: "Test Widget",
        code: `TW-${Date.now().toString().slice(-4)}`,
        barcode: `BAR-${Date.now().toString().slice(-6)}`,
        category: "Hardware",
        unit: "Pcs",
        purchasePrice: 100,
        salesPrice: 200,
        mrp: 250,
        taxRate: 18,
        minStockAlert: 2,
        currentStock: 100,
        godownId: "godown-1",
      });
    const itemId = itemRes.body.id;

    // Create Invoice 1: Jan 10 2029
    const inv1 = await request(app)
      .post("/api/transactions")
      .send({
        type: "sale",
        invoiceNumber: `INV-T1-${Date.now().toString().slice(-6)}`,
        partyId: customerId,
        partyName: "Test Trading Co",
        date: "2029-01-10",
        dueDate: "2029-01-25",
        items: [
          {
            itemId,
            itemName: "Test Widget",
            itemCode: "TW",
            quantity: 5,
            unit: "Pcs",
            price: 200,
            discountPercent: 0,
            discountAmount: 0,
            taxRate: 18,
            taxAmount: 180,
            total: 1180,
          },
        ],
        subtotal: 1000,
        discountTotal: 0,
        taxTotal: 180,
        cgst: 90,
        sgst: 90,
        igst: 0,
        total: 1180,
        paidAmount: 180,
        balanceDue: 1000,
        paymentMode: "cash",
      });
    invoice1Id = inv1.body.id;

    // Create Invoice 2: Feb 15 2029
    const inv2 = await request(app)
      .post("/api/transactions")
      .send({
        type: "sale",
        invoiceNumber: `INV-T2-${Date.now().toString().slice(-6)}`,
        partyId: customerId,
        partyName: "Test Trading Co",
        date: "2029-02-15",
        dueDate: "2029-02-28",
        items: [
          {
            itemId,
            itemName: "Test Widget",
            itemCode: "TW",
            quantity: 2,
            unit: "Pcs",
            price: 200,
            discountPercent: 0,
            discountAmount: 0,
            taxRate: 18,
            taxAmount: 72,
            total: 472,
          },
        ],
        subtotal: 400,
        discountTotal: 0,
        taxTotal: 72,
        cgst: 36,
        sgst: 36,
        igst: 0,
        total: 472,
        paidAmount: 0,
        balanceDue: 472,
        paymentMode: "cash",
      });
    invoice2Id = inv2.body.id;
  });

  // 1. Clear ledger balances with Dr / Cr and To Receive / To Pay
  it("computes party statements with explicit Dr/Cr, To Receive/To Pay, and opening/closing balances", async () => {
    const res = await request(app).get(`/api/parties/${customerId}/statement`);
    expect(res.status).toBe(200);

    const statement = res.body;
    expect(statement.openingBalance).toBe(5000);
    expect(statement.openingBalanceType).toBe("Dr");
    expect(statement.openingBalanceLabel).toBe("To Receive");

    expect(statement.entries.length).toBeGreaterThan(0);
    statement.entries.forEach((e: any) => {
      expect(["Dr", "Cr", "Settled"]).toContain(e.balanceType);
      expect(["To Receive", "To Pay", "Settled"]).toContain(e.balanceLabel);
      expect(typeof e.runningBalance).toBe("number");
    });

    expect(statement.closingBalance).toBeGreaterThan(0);
    expect(statement.closingBalanceType).toBe("Dr");
    expect(statement.closingBalanceLabel).toBe("To Receive");
    expect(statement.totalDebits).toBeGreaterThan(0);
  });

  // 2. Date filters on statements, reports, and GST
  it("filters party statement by date range and computes opening balance as of start date", async () => {
    // Range: Feb 01 2029 to Feb 28 2029 (Invoice 1 is in Jan, Invoice 2 is in Feb)
    const res = await request(app).get(
      `/api/parties/${customerId}/statement?startDate=2029-02-01&endDate=2029-02-28`,
    );
    expect(res.status).toBe(200);

    const statement = res.body;
    expect(statement.openingBalance).toBe(6000); // 5000 + 1180 debit - 180 credit
    expect(statement.openingBalanceType).toBe("Dr");
    expect(statement.openingBalanceLabel).toBe("To Receive");

    const dates = statement.entries.map((e: any) => e.date);
    expect(dates.every((d: string) => d >= "2029-02-01" && d <= "2029-02-28")).toBe(true);
  });

  it("filters Profit & Loss and GST reports by date range", async () => {
    const pnlJan = await request(app).get("/api/reports/pnl?startDate=2029-01-01&endDate=2029-01-31");
    expect(pnlJan.status).toBe(200);
    expect(pnlJan.body.salesRevenue).toBeGreaterThanOrEqual(1000);

    const pnlFeb = await request(app).get("/api/reports/pnl?startDate=2029-02-01&endDate=2029-02-28");
    expect(pnlFeb.status).toBe(200);
    expect(pnlFeb.body.salesRevenue).toBeGreaterThanOrEqual(400);

    const gstJan = await request(app).get("/api/reports/gst?startDate=2029-01-01&endDate=2029-01-31");
    expect(gstJan.status).toBe(200);
    expect(gstJan.body.totalOutputGst).toBeGreaterThanOrEqual(180);

    const gstFeb = await request(app).get("/api/reports/gst?startDate=2029-02-01&endDate=2029-02-28");
    expect(gstFeb.status).toBe(200);
    expect(gstFeb.body.totalOutputGst).toBeGreaterThanOrEqual(72);
  });

  // 6. Payment allocation: Select which invoice a client's payment settles
  it("allocates payment to specifically selected invoices", async () => {
    // Settle Invoice 2 specifically instead of older Invoice 1
    const payRes = await request(app)
      .post("/api/transactions")
      .send({
        type: "payment_in",
        invoiceNumber: `PAY-ALLOC-${Date.now().toString().slice(-4)}`,
        partyId: customerId,
        partyName: "Test Trading Co",
        date: "2029-02-20",
        items: [],
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: 472,
        paidAmount: 472,
        balanceDue: 0,
        paymentMode: "bank",
        status: "paid",
        allocations: [{ invoiceId: invoice2Id, amount: 472 }],
      });
    expect(payRes.status).toBe(201);

    // Verify Invoice 2 is now fully paid
    const inv2After = await request(app).get(`/api/transactions/${invoice2Id}`);
    expect(inv2After.body.balanceDue).toBe(0);
    expect(inv2After.body.status).toBe("paid");

    // Verify Invoice 1 was NOT affected and still has balanceDue 1000
    const inv1After = await request(app).get(`/api/transactions/${invoice1Id}`);
    expect(inv1After.body.balanceDue).toBe(1000);
  });

  // 7. Change history: Record edits to invoices, payments, and opening balances
  it("records audit trail entries when opening balance is updated", async () => {
    // Update party opening balance
    const updateRes = await request(app)
      .put(`/api/parties/${customerId}`)
      .send({
        openingBalance: 12000,
      });
    expect(updateRes.status).toBe(200);

    // Fetch history
    const historyRes = await request(app).get("/api/history?entityType=opening_balance");
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.length).toBeGreaterThan(0);

    const latest = historyRes.body[0];
    expect(latest.entityType).toBe("opening_balance");
    expect(latest.action).toBe("updated");
    expect(latest.changes?.[0].oldValue).toBe(5000);
    expect(latest.changes?.[0].newValue).toBe(12000);
  });

  it("records audit trail entries when invoice details are updated", async () => {
    const updateTxn = await request(app)
      .put(`/api/transactions/${invoice1Id}`)
      .send({
        notes: "Updated delivery instructions: deliver to gate 3",
        dueDate: "2026-02-05",
      });
    expect(updateTxn.status).toBe(200);

    const historyRes = await request(app).get(`/api/history?entityId=${invoice1Id}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.length).toBeGreaterThan(0);
    expect(historyRes.body[0].action).toBe("updated");
  });

  // 8. Backup & restore metadata tracking
  it("stores and retrieves last backup metadata", async () => {
    const postRes = await request(app)
      .post("/api/backup/last")
      .send({
        lastBackupAt: "2026-10-26T12:00:00.000Z",
        lastBackupName: "viper-backup-2026-10-26.json",
      });
    expect(postRes.status).toBe(200);

    const getRes = await request(app).get("/api/backup/last");
    expect(getRes.status).toBe(200);
    expect(getRes.body.lastBackupAt).toBe("2026-10-26T12:00:00.000Z");
    expect(getRes.body.lastBackupName).toBe("viper-backup-2026-10-26.json");
  });
});
