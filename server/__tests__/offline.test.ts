import { describe, expect, it } from 'vitest';
import { createOfflineService, type SnapshotStore } from '../offline-service.js';
import type { DatabaseSchema } from '../schema.js';

function memoryStore() {
  let revision = 0, data: string | undefined, fail = false;
  const snapshots: string[] = [];
  const store: SnapshotStore = {
    async load() { return { revision, data }; },
    async save(next) {
      if (fail) throw new Error('Disk full');
      if (next.expectedRevision !== revision) throw new Error('Revision conflict');
      if (data) snapshots.push(data);
      data = next.data; return {revision:++revision};
    },
  };
  return {store,snapshots,setFail:(value:boolean)=>{fail=value;}};
}
async function prepare(request: ReturnType<typeof createOfflineService>) {
  const post = <T>(endpoint:string, body:unknown) => request<T>(endpoint,{method:'POST',body:JSON.stringify(body)});
  await request('/profile',{method:'PUT',body:JSON.stringify({name:'Offline QA',phone:'1234567890'})});
  const party = await post<{id:string}>('/parties',{name:'Customer QA',type:'customer',phone:'12345',billingAddress:'',openingBalance:0,creditLimit:10000});
  const item = await post<{id:string}>('/items',{name:'Offline item',code:'SKU1',barcode:'123',category:'General',unit:'Pcs',purchasePrice:60,salesPrice:100,mrp:100,taxRate:0,currentStock:5,minStockAlert:1,godownId:'godown-1'});
  return {post,party,item};
}
describe('Offline durable business service',()=>{
  it('starts with empty real records rather than demo balances',async()=>{
    const {store}=memoryStore(),request=createOfflineService(store);
    const result=await request<DatabaseSchema>('/backup');
    expect(result.parties).toEqual([]);expect(result.items).toEqual([]);expect(result.transactions).toEqual([]);expect(result.accounts.every(a=>a.balance===0)).toBe(true);
  });
  it('posts, settles, reverses and reopens without any HTTP transport',async()=>{
    const memory=memoryStore(),request=createOfflineService(memory.store);const {post,party,item}=await prepare(request);
    const sale=await post<{id:string}>('/transactions',{invoiceNumber:'OFF-1',type:'sale',partyId:party.id,date:'2026-10-20',paymentMode:'cash',paidAmount:40,items:[{itemId:item.id,quantity:2,price:100,taxRate:0,discountPercent:0}]});
    const payment=await post<{id:string}>('/transactions',{invoiceNumber:'PAY-1',type:'payment_in',partyId:party.id,date:'2026-10-20',paymentMode:'cash',paidAmount:160,items:[],originalTransactionId:sale.id});
    let reopened=createOfflineService(memory.store);
    expect(await reopened(`/transactions/${sale.id}`)).toMatchObject({balanceDue:0,paidAmount:200});
    expect(await reopened('/reports/pnl')).toMatchObject({salesRevenue:200,purchasesCost:120,grossProfit:80});
    await reopened(`/transactions/${payment.id}`,{method:'DELETE'});await reopened(`/transactions/${sale.id}`,{method:'DELETE'});
    reopened=createOfflineService(memory.store);const state=await reopened<DatabaseSchema>('/backup');
    expect(state.items[0].currentStock).toBe(5);expect(state.parties[0].currentBalance).toBe(0);expect(state.accounts[0].balance).toBe(0);
  });
  it('rolls back memory when a native save fails, and allows retry',async()=>{
    const memory=memoryStore(),request=createOfflineService(memory.store);const {party,item}=await prepare(request);
    const before=await request('/backup');memory.setFail(true);
    await expect(request('/transactions',{method:'POST',body:JSON.stringify({invoiceNumber:'FAIL',type:'sale',partyId:party.id,date:'2026-10-20',paymentMode:'cash',paidAmount:0,items:[{itemId:item.id,quantity:1,price:100,taxRate:0,discountPercent:0}]})})).rejects.toThrow('Disk full');
    expect(await request('/backup')).toEqual(before);memory.setFail(false);await request('/profile',{method:'PUT',body:JSON.stringify({tradeName:'Retry works'})});
  });
  it('serializes concurrent writes and preserves both records after reopening',async()=>{
    const memory=memoryStore(),request=createOfflineService(memory.store);await request('/backup');
    await Promise.all(['A','B'].map(name=>request('/expenses/categories',{method:'POST',body:JSON.stringify({name,type:'indirect'})})));
    const reopened=createOfflineService(memory.store);expect((await reopened<{name:string}[]>('/expenses/categories')).map(c=>c.name)).toContain('B');expect((await reopened<{name:string}[]>('/expenses/categories')).map(c=>c.name)).toContain('A');
  });
  it('rejects malformed storage without replacing it with a new business',async()=>{
    let writes=0;const request=createOfflineService({async load(){return {revision:3,data:'{broken'};},async save(){writes++;return {revision:4};}});
    await expect(request('/backup')).rejects.toThrow();expect(writes).toBe(0);
  });
  it('exports and restores the whole database durably while preserving the old snapshot',async()=>{
    const memory=memoryStore(),request=createOfflineService(memory.store);await prepare(request);const backup=await request<DatabaseSchema>('/backup');
    await request('/profile',{method:'PUT',body:JSON.stringify({name:'Changed'})});await request('/backup/restore',{method:'POST',body:JSON.stringify(backup)});
    expect(await createOfflineService(memory.store)('/backup')).toEqual(backup);expect(memory.snapshots.some(s=>JSON.parse(s).profile.name==='Changed')).toBe(true);
  });
});
