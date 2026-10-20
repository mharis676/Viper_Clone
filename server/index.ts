import express, { Request, Response } from 'express';
import cors from 'cors';
import { db } from './db.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
  res.json(db.getProfitAndLoss());
});

app.get('/api/reports/gst', (req: Request, res: Response) => {
  res.json(db.getGstReport());
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

// Export app for test runner
export default app;

if (process.env.NODE_ENV !== 'test') {
  const host = '127.0.0.1';
  const startServer = (port: number) => {
    const serverInstance = app.listen(port, host, () => {
      console.log(`Vyapar Application server running at http://${host}:${port}`);
    });
    serverInstance.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} in use, attempting port ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
  };
  startServer(Number(PORT));
}
