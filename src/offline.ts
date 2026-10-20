import { Capacitor, registerPlugin } from '@capacitor/core';
import { createOfflineService, type SnapshotStore } from '../server/offline-service.js';
const SQLite = registerPlugin<SnapshotStore>('ViperStorage');

// Browser preview uses IndexedDB, not quota-limited localStorage. Android always
// uses the native SQLite plugin; a native failure never falls back to empty data.
const browserStore: SnapshotStore = {
  async load() { return transaction('readonly', store => store.get('state')); },
  async save(next) {
    return transaction('readwrite', store => {
      const request = store.get('state');
      request.onsuccess = () => {
        const current = request.result || {revision:0};
        if (current.revision !== next.expectedRevision) { store.transaction.abort(); return; }
        store.put({revision:current.revision + 1, data:next.data}, 'state');
      };
      return request;
    }, next.expectedRevision + 1);
  },
};
let open: Promise<IDBDatabase> | undefined;
function database() {
  return open ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('viper-offline',1);
    request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transaction(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest, revision?: number): Promise<{revision:number;data?:string}> {
  const db = await database();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('snapshots',mode), request = action(tx.objectStore('snapshots'));
    tx.oncomplete = () => resolve(revision === undefined ? request.result || {revision:0} : {revision});
    tx.onerror = () => reject(tx.error || new Error('Could not save offline data'));
    tx.onabort = () => reject(new Error('Offline data changed in another session. Reload and retry.'));
  });
}
export const offlineRequest = createOfflineService(Capacitor.isNativePlatform() ? SQLite : browserStore);
