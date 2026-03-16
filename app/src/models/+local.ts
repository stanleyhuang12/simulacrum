
const DB_NAME    = "deliberations_db";
const DB_VERSION = 2;
const STORE_NAME = "deliberations";
 
// ---------------------------------------------------------------------------
// Stable per-user key (cookie-based with localStorage fallback)
// ---------------------------------------------------------------------------
 
// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------
 
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
 
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
 
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}
 
// ---------------------------------------------------------------------------
// Public CRUD
// ---------------------------------------------------------------------------
 
/**
 * Serialise and save the Deliberation.
 * Dates survive via JSON → ISO string → Date reviver on load.
 */
export async function saveDeliberation(key: string, d: object): Promise<void> {
  const db  = await openDB();
 
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
 
    // Plain JSON round-trip; Dates become ISO strings, revived on load
    const payload = JSON.parse(JSON.stringify(d));
    const put     = store.put(payload, key);
 
    put.onerror   = () => reject(new Error(`saveDeliberation failed: ${put.error}`));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror    = () => reject(new Error(`Transaction error: ${tx.error}`));
  });
}
 
/**
 * Load the stored snapshot (or null).  ISO date strings are revived to Date.
 */
export async function loadDeliberation(key: string): Promise<Record<string, any> | null> {
  const db  = await openDB();

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req   = store.get(key);
 
    req.onsuccess = () => {
      db.close();
      if (!req.result) { resolve(null); return; }
      resolve(JSON.parse(JSON.stringify(req.result), dateReviver));
    };
    req.onerror = () => reject(new Error("loadDeliberation failed"));
  });
}
 
/** Remove the record for the current user (call at simulation start). */
export async function clearDeliberation(key: string): Promise<void> {
  const db  = await openDB();
 
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const del   = store.delete(key);
 
    del.onerror   = () => reject(new Error(`clearDeliberation failed: ${del.error}`));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror    = () => reject(new Error(`Transaction error: ${tx.error}`));
  });
}
 
// ---------------------------------------------------------------------------
// Date reviver
// ---------------------------------------------------------------------------
 
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
 
function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string" && ISO_DATE_RE.test(value)) {
    return new Date(value);
  }
  return value;
}
 