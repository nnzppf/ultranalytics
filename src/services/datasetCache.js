/**
 * Copy of the downloaded datasets in the browser (IndexedDB), so that opening the
 * app again downloads only datasets uploaded since. An uploaded dataset never
 * changes (it is only added or deleted), so a copy is valid as long as its id and
 * stamp (upload time, size, format) match. Cleared on logout.
 * Every call fails soft: without IndexedDB (private mode, blocked storage) the app
 * just downloads everything as before.
 */
const DB_NAME = 'ultranalytics-cache';
const STORE = 'datasets';

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('no IndexedDB')); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch(e => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

function run(mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const result = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(result?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export async function getCachedItems(id, stamp) {
  try {
    const entry = await run('readonly', store => store.get(id));
    return entry && entry.stamp === stamp ? entry.items : null;
  } catch {
    return null;
  }
}

export async function putCachedItems(id, stamp, items) {
  try {
    await run('readwrite', store => store.put({ id, stamp, items }));
  } catch {
    // no cache: next opening downloads again
  }
}

/** Remove copies of datasets that no longer exist. */
export async function keepOnlyCached(ids) {
  try {
    const keys = await run('readonly', store => store.getAllKeys());
    const stale = (keys || []).filter(k => !ids.includes(k));
    if (stale.length) await run('readwrite', store => stale.forEach(k => store.delete(k)));
  } catch {
    // ignore
  }
}

export async function clearDatasetCache() {
  try {
    await run('readwrite', store => store.clear());
  } catch {
    // ignore
  }
}
