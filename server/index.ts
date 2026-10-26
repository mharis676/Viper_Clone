import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { db } from './db.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost', 'https://localhost', 'http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json({ limit: '10mb' }));
// Remote deployments must configure an access token. Never embed it in the APK.
app.use('/api', (req, res, next) => {
  if (process.env.API_TOKEN && req.headers.authorization !== `Bearer ${process.env.API_TOKEN}`) return res.status(401).json({ error: 'Access token required' });
  next();
});

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'vyapar-api', timestamp: new Date().toISOString() });
});

// Dashboard Stats
app.get('/api/dashboard/stats', (req: Request, res: Response) => {
  try {
    const stats = db.getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Business Profile
app.get('/api/profile', (req: Request, res: Response) => {
  res.json(db.getProfile());
});

app.put('/api/profile', (req: Request, res: Response) => {
  try {
    const updated = db.updateProfile(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Parties
app.get('/api/parties', (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  res.json(db.getParties(type));
});

app.get('/api/parties/:id', (req: Request, res: Response) => {
  const party = db.getPartyById(String(req.params.id));
  if (!party) return res.status(404).json({ error: 'Party not found' });
  res.json(party);
});

app.post('/api/parties', (req: Request, res: Response) => {
  try {
    const party = db.createParty(req.body);
    res.status(201).json(party);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/parties/:id', (req: Request, res: Response) => {
  const updated = db.updateParty(String(req.params.id), req.body);
  if (!updated) return res.status(404).json({ error: 'Party not found' });
  res.json(updated);
});

app.delete('/api/parties/:id', (req: Request, res: Response) => {
  const success = db.deleteParty(String(req.params.id));
  if (!success) return res.status(404).json({ error: 'Party not found' });
  res.json({ success: true });
});

app.get('/api/parties/:id/ledger', (req: Request, res: Response) => {
  const ledger = db.getPartyLedger(String(req.params.id));
  res.json(ledger);
});

app.get('/api/parties/:id/statement', (req: Request, res: Response) => {
  try {
    const statement = db.getPartyStatement(
      String(req.params.id),
      req.query.startDate ? String(req.query.startDate) : undefined,
      req.query.endDate ? String(req.query.endDate) : undefined,
    );
    res.json(statement);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Items & Inventory
app.get('/api/items', (req: Request, res: Response) => {
  res.json(db.getItems());
});

app.get('/api/items/barcode/:barcode', (req: Request, res: Response) => {
  const item = db.getItemByBarcode(String(req.params.barcode));
  if (!item) return res.status(404).json({ error: 'Item not found for barcode' });
  res.json(item);
});

app.get('/api/items/:id', (req: Request, res: Response) => {
  const item = db.getItemById(String(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

app.post('/api/items', (req: Request, res: Response) => {
  try {
    const item = db.createItem(req.body);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/items/:id', (req: Request, res: Response) => {
  const updated = db.updateItem(String(req.params.id), req.body);
  if (!updated) return res.status(404).json({ error: 'Item not found' });
  res.json(updated);
});

app.delete('/api/items/:id', (req: Request, res: Response) => {
  const success = db.deleteItem(String(req.params.id));
  if (!success) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true });
});

app.post('/api/items/:id/adjust', (req: Request, res: Response) => {
  const { delta } = req.body;
  if (typeof delta !== 'number') {
    return res.status(400).json({ error: 'Delta quantity must be a number' });
  }
  const item = db.adjustStock(String(req.params.id), delta);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// Transactions (Sales, Purchases, POS, Returns, Payments)
app.get('/api/transactions', (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  res.json(db.getTransactions(type));
});

app.get('/api/transactions/:id', (req: Request, res: Response) => {
  const txn = db.getTransactionById(String(req.params.id));
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });
  res.json(txn);
});

app.post('/api/transactions', (req: Request, res: Response) => {
  try {
    const txn = db.createTransaction(req.body);
    res.status(201).json(txn);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/transactions/:id', (req: Request, res: Response) => {
  try {
    const updated = db.updateTransaction(String(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'Transaction not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', (req: Request, res: Response) => {
  const success = db.deleteTransaction(String(req.params.id));
  if (!success) return res.status(404).json({ error: 'Transaction not found' });
  res.json({ success: true });
});

// Expenses
app.get('/api/expenses', (req: Request, res: Response) => {
  res.json(db.getExpenses());
});

app.post('/api/expenses', (req: Request, res: Response) => {
  try {
    const exp = db.createExpense(req.body);
    res.status(201).json(exp);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', (req: Request, res: Response) => {
  const success = db.deleteExpense(String(req.params.id));
  if (!success) return res.status(404).json({ error: 'Expense not found' });
  res.json({ success: true });
});

app.get('/api/expenses/categories', (req: Request, res: Response) => {
  res.json(db.getExpenseCategories());
});

app.post('/api/expenses/categories', (req: Request, res: Response) => {
  try {
    const cat = db.createExpenseCategory(req.body);
    res.status(201).json(cat);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Cash & Bank
app.get('/api/accounts', (req: Request, res: Response) => {
  res.json(db.getAccounts());
});

app.post('/api/accounts', (req: Request, res: Response) => {
  try {
    const acc = db.createAccount(req.body);
    res.status(201).json(acc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/accounts/transfer', (req: Request, res: Response) => {
  const { fromAccountId, toAccountId, amount, notes } = req.body;
  const success = db.transferFunds(fromAccountId, toAccountId, amount, notes);
  if (!success) return res.status(400).json({ error: 'Transfer failed. Check account IDs and balance.' });
  res.json({ success: true, message: 'Transfer successful' });
});

// Reports
app.get('/api/reports/pnl', (req: Request, res: Response) => {
  const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
  const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
  res.json(db.getProfitAndLoss(startDate, endDate));
});

app.get('/api/reports/gst', (req: Request, res: Response) => {
  const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
  const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
  res.json(db.getGstReport(startDate, endDate));
});

// Change History (Audit Trail)
app.get('/api/history', (req: Request, res: Response) => {
  const entityType = req.query.entityType ? String(req.query.entityType) : undefined;
  const entityId = req.query.entityId ? String(req.query.entityId) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json(db.getChangeHistory({ entityType, entityId, limit }));
});

// Print Settings
app.get('/api/settings/print', (req: Request, res: Response) => {
  res.json(db.getPrintSettings());
});

app.put('/api/settings/print', (req: Request, res: Response) => {
  res.json(db.updatePrintSettings(req.body));
});

// Backup and Restore
app.get('/api/backup', (req: Request, res: Response) => {
  const backup = db.exportBackup();
  res.setHeader('Content-Disposition', 'attachment; filename=vyapar_backup.json');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(backup, null, 2));
});

app.post('/api/backup/restore', (req: Request, res: Response) => {
  const success = db.restoreBackup(req.body);
  if (!success) return res.status(400).json({ error: 'Invalid backup file structure' });
  res.json({ success: true, message: 'Database restored successfully' });
});

app.get('/api/backup/last', (req: Request, res: Response) => {
  res.json(db.getBackupMetadata());
});

app.post('/api/backup/last', (req: Request, res: Response) => {
  res.json(db.setBackupMetadata(req.body));
});

// Serve client static files if built
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../client');

app.use(express.static(clientDist));

app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('Vyapar API Server Running. Run "npm run client:dev" or "npm run build" to view UI.');
    }
  });
});

// Express 4 forwards synchronous validation errors here, including update/delete routes.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ error: err.message || 'Request could not be completed' });
});

// Export app for test runner
export default app;

// Start on the configured port; silently switching breaks the frontend proxy.
if (process.env.NODE_ENV !== 'test') {
  const host = process.env.HOST || '127.0.0.1';
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !process.env.API_TOKEN) throw new Error('Set API_TOKEN before exposing the business server on the network');
  app.listen(Number(PORT), host, () => {
    console.log(`Vyapar server running on port ${PORT}`);
  }).on('error', (err) => { console.error(err); process.exitCode = 1; });
}
