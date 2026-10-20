import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('Vyapar App Backend API Suite', () => {
  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('vyapar-api');
  });

  it('GET /api/dashboard/stats should return aggregated metrics', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalSales');
    expect(res.body).toHaveProperty('toCollect');
    expect(res.body).toHaveProperty('toPay');
    expect(res.body).toHaveProperty('cashInHand');
    expect(res.body).toHaveProperty('bankBalance');
    expect(res.body).toHaveProperty('stockValue');
    expect(res.body).toHaveProperty('recentTransactions');
  });

  it('POST /api/parties should create a new party', async () => {
    const newParty = {
      name: 'Test Retail Customer',
      type: 'customer',
      phone: '9988776655',
      email: 'test@customer.com',
      gstin: '29ABCDE1234F1Z9',
      billingAddress: 'MG Road, Bengaluru',
      openingBalance: 1200,
      creditLimit: 25000,
    };
    const res = await request(app).post('/api/parties').send(newParty);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(newParty.name);
    expect(res.body.currentBalance).toBe(1200);
  });

  it('POST /api/items should create an item and support barcode query', async () => {
    const testBarcode = `890${Date.now()}`;
    const newItem = {
      name: 'Wireless Ergonomic Keyboard',
      code: 'TEST-KB-01',
      barcode: testBarcode,
      category: 'Electronics',
      unit: 'Pcs',
      purchasePrice: 1200,
      salesPrice: 1999,
      mrp: 2499,
      taxRate: 18,
      minStockAlert: 5,
      currentStock: 20,
      godownId: 'godown-1',
    };
    const res = await request(app).post('/api/items').send(newItem);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe(newItem.name);

    // Query item by barcode
    const barcodeRes = await request(app).get(`/api/items/barcode/${testBarcode}`);
    expect(barcodeRes.status).toBe(200);
    expect(barcodeRes.body.barcode).toBe(testBarcode);
  });

  it('POST /api/transactions should create a sale invoice and deduct inventory stock', async () => {
    // Fetch an item to get its initial stock
    const itemsRes = await request(app).get('/api/items');
    const item = itemsRes.body[0];
    const initialStock = item.currentStock;

    // Fetch a party
    const partiesRes = await request(app).get('/api/parties');
    const party = partiesRes.body[0];

    const saleTxn = {
      invoiceNumber: `INV-TEST-${Date.now()}`,
      type: 'sale',
      partyId: party.id,
      partyName: party.name,
      date: '2026-10-20',
      items: [
        {
          itemId: item.id,
          itemName: item.name,
          itemCode: item.code,
          quantity: 2,
          unit: item.unit,
          price: item.salesPrice,
          discountPercent: 0,
          discountAmount: 0,
          taxRate: item.taxRate,
          taxAmount: (item.salesPrice * 2 * item.taxRate) / 100,
          total: item.salesPrice * 2 * (1 + item.taxRate / 100),
        },
      ],
      subtotal: item.salesPrice * 2,
      discountTotal: 0,
      taxTotal: (item.salesPrice * 2 * item.taxRate) / 100,
      cgst: (item.salesPrice * item.taxRate) / 100,
      sgst: (item.salesPrice * item.taxRate) / 100,
      igst: 0,
      total: item.salesPrice * 2 * (1 + item.taxRate / 100),
      paidAmount: 0,
      balanceDue: item.salesPrice * 2 * (1 + item.taxRate / 100),
      paymentMode: 'bank',
      status: 'unpaid',
      notes: 'Automated test invoice',
    };

    const txnRes = await request(app).post('/api/transactions').send(saleTxn);
    expect(txnRes.status).toBe(201);
    expect(txnRes.body).toHaveProperty('id');

    // Verify stock was reduced by 2
    const updatedItemRes = await request(app).get(`/api/items/${item.id}`);
    expect(updatedItemRes.body.currentStock).toBe(initialStock - 2);
  });

  it('GET /api/reports/pnl should calculate profit and loss report accurately', async () => {
    const res = await request(app).get('/api/reports/pnl');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('salesRevenue');
    expect(res.body).toHaveProperty('purchasesCost');
    expect(res.body).toHaveProperty('grossProfit');
    expect(res.body).toHaveProperty('totalExpenses');
    expect(res.body).toHaveProperty('netProfit');
    expect(res.body.grossProfit).toBe(res.body.salesRevenue - res.body.purchasesCost);
    expect(res.body.netProfit).toBe(res.body.grossProfit - res.body.totalExpenses);
  });

  it('GET /api/backup should export database snapshot', async () => {
    const res = await request(app).get('/api/backup');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('profile');
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('parties');
  });
});
