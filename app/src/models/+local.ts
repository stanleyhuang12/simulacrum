
const DB_NAME    = "deliberations_db";
const DB_VERSION = 1;
const STORE_NAME = "deliberations";
 
// ---------------------------------------------------------------------------
// Stable per-user key (cookie-based with localStorage fallback)
// ---------------------------------------------------------------------------
 
export function getUserKey(): string {
  // Prefer a server-set "uid" cookie
  const match = document.cookie.match(/(?:^|;\s*)uid=([^;]+)/);
  if (match) return match[1];
 
  // Generate once and persist in both localStorage and a cookie
  let key = localStorage.getItem("uid");
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem("uid", key);
    const expires = new Date(Date.now() + 30 * 864e5).toUTCString();
    document.cookie = `uid=${key}; expires=${expires}; path=/; SameSite=Lax`;
  }
  return key;
}
 
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
export async function saveDeliberation(d: object): Promise<void> {
  const db  = await openDB();
  const key = getUserKey();
 
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
export async function loadDeliberation(): Promise<Record<string, any> | null> {
  const db  = await openDB();
  const key = getUserKey();
 
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
export async function clearDeliberation(): Promise<void> {
  const db  = await openDB();
  const key = getUserKey();
 
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
 