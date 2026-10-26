import { BusinessEngine } from './engine.js';
import { emptyDatabase } from './empty-database.js';

export interface SnapshotStore {
  load(): Promise<{ revision: number; data?: string }>;
  save(options: { expectedRevision: number; data: string }): Promise<{ revision: number }>;
}
/** Serializes UI requests and acknowledges a write only after durable storage. */
export function createOfflineService(store: SnapshotStore) {
  let engine: BusinessEngine | undefined, revision = 0;
  let queue = Promise.resolve<unknown>(undefined);
  async function run(endpoint: string, method: string, body: any) {
    if (!engine) {
      const current = await store.load(); revision = current.revision;
      engine = new BusinessEngine(current.data === undefined ? emptyDatabase() : JSON.parse(current.data));
      if (current.data === undefined) revision = (await store.save({ expectedRevision: revision, data: JSON.stringify(engine.exportBackup()) })).revision;
    }
    const before = engine.exportBackup();
    try {
      const result = dispatch(engine, endpoint, method, body);
      if (method !== 'GET') revision = (await store.save({ expectedRevision: revision, data: JSON.stringify(engine.exportBackup()) })).revision;
      return result;
    } catch (error) { engine = new BusinessEngine(before); throw error; }
  }
  return <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    const task = () => run(endpoint, options?.method || 'GET', options?.body ? JSON.parse(String(options.body)) : undefined);
    const result = queue.then(task, task); queue = result.catch(() => undefined); return result as Promise<T>;
  };
}
function dispatch(db: BusinessEngine, endpoint: string, method: string, body: any): unknown {
  const url = new URL(endpoint, 'https://offline.local'), segments = url.pathname.split('/').filter(Boolean);
  const [resource, key, action] = segments;
  const found = <T>(value: T | undefined) => { if (value === undefined) throw new Error('Record not found'); return value; };
  const deleted = (success: boolean) => { if (!success) throw new Error('Record not found'); return { success }; };
  if (method === 'GET') {
    if (resource === 'health') return { status:'ok', service:'vyapar-api', storage:'offline-sqlite' };
    if (resource === 'dashboard') return db.getDashboardStats();
    if (resource === 'profile') return db.getProfile();
    if (resource === 'parties') return action === 'statement' ? db.getPartyStatement(key, url.searchParams.get('startDate') || undefined, url.searchParams.get('endDate') || undefined) : action === 'ledger' ? db.getPartyLedger(key) : key ? found(db.getPartyById(key)) : db.getParties(url.searchParams.get('type') || undefined);
    if (resource === 'items') return key === 'barcode' ? found(db.getItemByBarcode(decodeURIComponent(action))) : key ? found(db.getItemById(key)) : db.getItems();
    if (resource === 'transactions') return key ? found(db.getTransactionById(key)) : db.getTransactions(url.searchParams.get('type') || undefined);
    if (resource === 'expenses') return key === 'categories' ? db.getExpenseCategories() : db.getExpenses();
    if (resource === 'accounts') return db.getAccounts();
    if (resource === 'reports') return key === 'pnl' ? db.getProfitAndLoss(url.searchParams.get('startDate') || undefined, url.searchParams.get('endDate') || undefined) : db.getGstReport(url.searchParams.get('startDate') || undefined, url.searchParams.get('endDate') || undefined);
    if (resource === 'history') return db.getChangeHistory({ entityType: url.searchParams.get('entityType') || undefined, entityId: url.searchParams.get('entityId') || undefined, limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined });
    if (resource === 'settings') return db.getPrintSettings();
    if (resource === 'backup' && key === 'last') return db.getBackupMetadata();
    if (resource === 'backup') return db.exportBackup();
  }
  if (method === 'POST') {
    if (resource === 'parties') return db.createParty(body);
    if (resource === 'items') return action === 'adjust' ? found(db.adjustStock(key, body.delta)) : db.createItem(body);
    if (resource === 'transactions') { if (!db.getProfile().phone.trim()) throw new Error('Complete your business name and phone in Settings before posting invoices'); return db.createTransaction(body); }
    if (resource === 'expenses') return key === 'categories' ? db.createExpenseCategory(body) : db.createExpense(body);
    if (resource === 'accounts') return key === 'transfer' ? {success:db.transferFunds(body.fromAccountId,body.toAccountId,body.amount,body.notes)} : db.createAccount(body);
    if (resource === 'backup' && key === 'restore') return {success:db.restoreBackup(body)};
    if (resource === 'backup' && key === 'last') return db.setBackupMetadata(body);
  }
  if (method === 'PUT') {
    if (resource === 'profile') return db.updateProfile(body);
    if (resource === 'parties') return found(db.updateParty(key,body));
    if (resource === 'items') return found(db.updateItem(key,body));
    if (resource === 'transactions') return found(db.updateTransaction(key,body));
    if (resource === 'settings') return db.updatePrintSettings(body);
  }
  if (method === 'DELETE') {
    if (resource === 'parties') return deleted(db.deleteParty(key));
    if (resource === 'items') return deleted(db.deleteItem(key));
    if (resource === 'transactions') return deleted(db.deleteTransaction(key));
    if (resource === 'expenses') return deleted(db.deleteExpense(key));
  }
  throw new Error('Unsupported offline operation');
}
