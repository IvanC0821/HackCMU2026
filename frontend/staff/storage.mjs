export const DB_NAME = 'verity-staff-mvp-v1';
export async function openStore(factory = globalThis.indexedDB) {
  if (!factory) throw new Error('Browser storage is unavailable. Changes will only last in this tab.');
  const db = await new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('workspace');
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
  return {
    async load() {
      return new Promise((resolve, reject) => { const tx = db.transaction('workspace'); const req = tx.objectStore('workspace').get('current'); req.onsuccess = () => resolve(req.result || null); req.onerror = () => reject(req.error); });
    },
    async save(state, expectedRevision) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('workspace', 'readwrite'), store = tx.objectStore('workspace'); let conflict = false;
        const req = store.get('current');
        req.onsuccess = () => {
          const current = req.result;
          if ((current?.revision ?? 0) !== expectedRevision) { conflict = true; tx.abort(); return; }
          store.put(state, 'current');
        };
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error(conflict ? 'Another tab changed this workspace. Reload before continuing; its changes have not been overwritten.' : 'Local save failed. Keep this tab open.'));
      });
    },
    close() { db.close(); },
  };
}
