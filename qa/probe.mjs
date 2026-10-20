import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import request from 'supertest';

// Exercise the built API against a disposable copy, never the working database.
process.env.NODE_ENV = 'test';
const runtime = fs.mkdtempSync(path.resolve('qa/.runtime-'));
const results = [];
try {
  fs.cpSync('dist/server', path.join(runtime, 'server'), { recursive: true });
  fs.mkdirSync(path.join(runtime, 'data'));
  const original = JSON.parse(fs.readFileSync('data/vyapar_db.json', 'utf8'));
  fs.writeFileSync(path.join(runtime, 'data/vyapar_db.json'), JSON.stringify(original));
  const { default: app } = await import(pathToFileURL(path.join(runtime, 'server/index.js')));
  const { db } = await import(pathToFileURL(path.join(runtime, 'server/db.js')));
  const reset = () => {
    const seed = structuredClone(original);
    seed.transactions = []; seed.expenses = []; seed.ledgers = [];
    seed.parties[0].openingBalance = 0; seed.parties[0].currentBalance = 0;
    seed.items[0].currentStock = 5;
    seed.accounts[0].balance = 1000;
    db.restoreBackup(seed);
  };
  const invoice = (overrides = {}) => ({
    invoiceNumber: 'QA-001', type: 'sale', partyId: original.parties[0].id,
    partyName: original.parties[0].name, date: '2026-01-01',
    items: [{ itemId: original.items[0].id, itemName: 'QA item', itemCode: 'QA',
      quantity: 1, unit: 'Pcs', price: 100, discountPercent: 0,
      discountAmount: 0, taxRate: 18, taxAmount: 18, total: 118 }],
    subtotal: 100, discountTotal: 0, taxTotal: 18, cgst: 9, sgst: 9,
    igst: 0, total: 118, paidAmount: 50, balanceDue: 68,
    paymentMode: 'cash', status: 'partial', ...overrides,
  });
  const snapshot = () => ({ stock: db.getItems()[0].currentStock,
    partyBalance: db.getParties()[0].currentBalance,
    cash: db.getAccounts()[0].balance, ledgers: structuredClone(db.getPartyLedger(original.parties[0].id)) });

  reset();
  const before = snapshot();
  const sale = await request(app).post('/api/transactions').send(invoice());
  const afterSale = snapshot();
  await request(app).delete(`/api/transactions/${sale.body.id}`);
  results.push({ case: 'Delete sale rollback', before, afterSale, afterDelete: snapshot() });

  reset();
  const gstBefore = db.getGstReport();
  const ret = await request(app).post('/api/transactions').send(invoice({ type: 'sale_return' }));
  const afterReturn = snapshot();
  await request(app).delete(`/api/transactions/${ret.body.id}`);
  results.push({ case: 'Return accounting and deletion', status: ret.status, afterReturn, afterDelete: snapshot(), gstBefore, gstAfter: db.getGstReport() });

  reset();
  const over = invoice(); over.items[0].quantity = 10;
  const overRes = await request(app).post('/api/transactions').send(over);
  const afterOversell = snapshot();
  await request(app).delete(`/api/transactions/${overRes.body.id}`);
  results.push({ case: 'Oversell then delete', status: overRes.status, afterOversell, afterDelete: snapshot() });

  reset();
  const malformed = await request(app).post('/api/transactions').send(invoice({ total: 1, balanceDue: -999 }));
  results.push({ case: 'Client totals trusted', status: malformed.status, saved: malformed.body, state: snapshot() });

  reset();
  const incomplete = await request(app).post('/api/transactions').send({ type: 'sale' });
  results.push({ case: 'Failed create atomicity', status: incomplete.status, transactionCount: db.getTransactions().length });

  reset();
  await request(app).post('/api/transactions').send(invoice());
  results.push({ case: 'Ledger dates and balances', entries: snapshot().ledgers, invoiceDate: '2026-01-01' });
  results.push({ case: 'Profit calculation', report: db.getProfitAndLoss(), itemUnitCost: db.getItems()[0].purchasePrice });

  reset();
  await request(app).post('/api/transactions').send(invoice({ type: 'quotation' }));
  results.push({ case: 'Quotation correctly leaves balances unchanged', state: snapshot() });

  reset();
  const creditSale = await request(app).post('/api/transactions').send(invoice({ paidAmount: 0, balanceDue: 118, status: 'unpaid' }));
  await request(app).post('/api/transactions').send(invoice({ type: 'payment_in', items: [], total: 118, paidAmount: 118, balanceDue: 0 }));
  results.push({ case: 'Payment does not settle invoice', partyBalance: snapshot().partyBalance, invoice: db.getTransactionById(creditSale.body.id) });

  reset();
  await request(app).put(`/api/parties/${original.parties[0].id}`).send({ openingBalance: 500 });
  results.push({ case: 'Opening balance edit', party: db.getParties()[0] });

  reset();
  const excess = await request(app).post('/api/accounts/transfer').send({ fromAccountId: original.accounts[0].id, toAccountId: original.accounts[1].id, amount: 2000 });
  results.push({ case: 'Insufficient funds transfer', status: excess.status, cash: snapshot().cash });

  reset();
  const transfer = await request(app).post('/api/accounts/transfer').send({ fromAccountId: original.accounts[0].id, toAccountId: original.accounts[1].id, amount: '100' });
  results.push({ case: 'String transfer amount', status: transfer.status, accounts: db.getAccounts().slice(0, 2).map(a => ({ id: a.id, balance: a.balance })) });

  reset();
  const restore = await request(app).post('/api/backup/restore').send({ profile: {}, items: [] });
  const dashboard = await request(app).get('/api/dashboard/stats');
  results.push({ case: 'Invalid backup accepted', restoreStatus: restore.status, dashboardStatus: dashboard.status, error: dashboard.body });
  fs.writeFileSync('qa/probe-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  fs.rmSync(runtime, { recursive: true, force: true });
}
