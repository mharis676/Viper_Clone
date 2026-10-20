import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('Vyapar App Accounting, Double-Entry Ledger, POS & Taxes', () => {
  it('should support creating an expense and debiting it from the specified account', async () => {
    // 1. Get initial account balance
    const accountsRes = await request(app).get('/api/accounts');
    const acc = accountsRes.body[0];
    const initialBalance = acc.balance;

    // 2. Create an expense
    const expenseData = {
      categoryId: 'expcat-5',
      categoryName: 'Printing, Tea & Office Supplies',
      amount: 450,
      date: '2026-10-20',
      paymentMode: 'cash',
      paidTo: 'Local Stationery Store',
      notes: 'POS Thermal rolls',
      accountId: acc.id,
    };

    const expRes = await request(app).post('/api/expenses').send(expenseData);
    expect(expRes.status).toBe(201);
    expect(expRes.body.amount).toBe(450);

    // 3. Verify account balance was deducted
    const updatedAccountsRes = await request(app).get('/api/accounts');
    const updatedAcc = updatedAccountsRes.body.find((a: any) => a.id === acc.id);
    expect(updatedAcc.balance).toBe(initialBalance - 450);
  });

  it('should execute Contra inter-account funds transfer reliably', async () => {
    const accountsRes = await request(app).get('/api/accounts');
    const accFrom = accountsRes.body[0];
    const accTo = accountsRes.body[1];

    const initialFromBal = accFrom.balance;
    const initialToBal = accTo.balance;
    const transferAmount = 2500;

    const res = await request(app).post('/api/accounts/transfer').send({
      fromAccountId: accFrom.id,
      toAccountId: accTo.id,
      amount: transferAmount,
      notes: 'Till cash transfer to current bank account',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify balances
    const updatedRes = await request(app).get('/api/accounts');
    const updatedFrom = updatedRes.body.find((a: any) => a.id === accFrom.id);
    const updatedTo = updatedRes.body.find((a: any) => a.id === accTo.id);

    expect(updatedFrom.balance).toBe(initialFromBal - transferAmount);
    expect(updatedTo.balance).toBe(initialToBal + transferAmount);
  });

  it('should record double-entry ledger entries upon sale invoice generation', async () => {
    const partiesRes = await request(app).get('/api/parties?type=customer');
    const customer = partiesRes.body[0];

    const invoiceData = {
      invoiceNumber: `INV-LEDGER-${Date.now()}`,
      type: 'sale',
      partyId: customer.id,
      partyName: customer.name,
      date: '2026-10-20',
      items: [
        {
          itemId: 'item-3',
          itemName: 'Fast Charging USB-C Braided Cable 2M',
          itemCode: 'ITM-103',
          quantity: 4,
          unit: 'Pcs',
          price: 299,
          discountPercent: 0,
          discountAmount: 0,
          taxRate: 18,
          taxAmount: 215.28,
          total: 1411.28,
        },
      ],
      subtotal: 1196,
      discountTotal: 0,
      taxTotal: 215.28,
      cgst: 107.64,
      sgst: 107.64,
      igst: 0,
      total: 1411,
      paidAmount: 500,
      balanceDue: 911,
      paymentMode: 'upi',
      status: 'partial',
      notes: 'Partial payment test',
    };

    const res = await request(app).post('/api/transactions').send(invoiceData);
    expect(res.status).toBe(201);

    // Verify ledger has debit and credit entries
    const ledgerRes = await request(app).get(`/api/parties/${customer.id}/ledger`);
    expect(ledgerRes.status).toBe(200);
    const txnEntries = ledgerRes.body.filter((l: any) => l.invoiceNumber === invoiceData.invoiceNumber);
    expect(txnEntries.length).toBeGreaterThanOrEqual(1);
  });

  it('should generate accurate GST report with Net GST Liability', async () => {
    const gstRes = await request(app).get('/api/reports/gst');
    expect(gstRes.status).toBe(200);
    expect(gstRes.body).toHaveProperty('totalTaxableSale');
    expect(gstRes.body).toHaveProperty('totalOutputGst');
    expect(gstRes.body).toHaveProperty('totalTaxablePurchase');
    expect(gstRes.body).toHaveProperty('totalInputGst');
    expect(gstRes.body).toHaveProperty('netGstPayable');
    expect(gstRes.body.netGstPayable).toBe(
      Math.max(0, gstRes.body.totalOutputGst - gstRes.body.totalInputGst)
    );
  });
});
