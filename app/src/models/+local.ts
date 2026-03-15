import type { interactionData } from "./+utils";
import type { Memory } from "./+deliberations";

const DB_NAME = "deliberations_db";  // renamed to avoid any cached conflict
const DB_VERSION = 1;
const STORE_NAME = "interactions";
const RECORD_KEY = "allInteractions";

export async function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (db.objectStoreNames.contains(STORE_NAME)) {
                db.deleteObjectStore(STORE_NAME);
            }
            db.createObjectStore(STORE_NAME); // out-of-line keys
        };

        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);

            const check = store.get(RECORD_KEY);
            check.onsuccess = () => {
                if (!check.result) {
                    store.put({ interactions: [] }, RECORD_KEY);
                }
            };

            tx.oncomplete = () => resolve(db);
            tx.onerror = () => reject(tx.error);
        };

        request.onerror = (event) => {
            reject(`Database error: ${(event.target as IDBOpenDBRequest).error}`);
        };
    });
}

function reviveDates(memory: any): Memory {
    if (memory?.time) {
        if (memory.time.responseAwait) memory.time.responseAwait = new Date(memory.time.responseAwait);
        if (memory.time.responseStart) memory.time.responseStart = new Date(memory.time.responseStart);
        if (memory.time.responseEnd)   memory.time.responseEnd   = new Date(memory.time.responseEnd);
    }
    return memory as Memory;
}

export async function readInteraction(index?: number): Promise<Memory[]> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(RECORD_KEY);

        request.onsuccess = () => {
            const raw: any[] = request.result?.interactions ?? [];
            const memories = raw.map(reviveDates);

            if (index !== undefined) {
                if (index >= 0 && index < memories.length) {
                    resolve([memories[index]]);
                } else {
                    reject(new Error(`Index ${index} out of bounds (length: ${memories.length})`));
                }
            } else {
                resolve(memories);
            }
        };

        request.onerror = () => reject(new Error("Failed to read interactions"));
        tx.oncomplete = () => db.close();
    });
}

export async function addInteraction(interaction: interactionData | Memory): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(RECORD_KEY);

        request.onsuccess = () => {
            const existing = request.result ?? { interactions: [] };
            existing.interactions.push(interaction);

            const put = store.put(existing, RECORD_KEY);
            put.onerror = () => reject(`Failed to add interaction: ${put.error}`);
        };

        request.onerror = () => reject(`Failed to read before adding: ${request.error}`);
        tx.oncomplete = () => { db.close(); resolve(); }
        tx.onerror = () => reject(`Transaction error: ${tx.error}`);
    });
}

export async function clearInteractions(): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        const put = store.put({ interactions: [] }, RECORD_KEY);
        put.onerror = () => reject(`Failed to clear: ${put.error}`);

    tx.oncomplete = () => db.close();
  });
}

export async function addRetry(retryLogs: any) {
  const db = await openDatabase();
  if (!db) throw new Error("Failed to open database");

  return new Promise((resolve, reject) => {
    const tx = db.transaction("interaction", "readwrite");
    const store = tx.objectStore("interaction");

    const getRequest = store.get("retryLogs");

    getRequest.onsuccess = () => {
      let data = getRequest.result;
      
      if (data) {
        console.warn("Retry logs already exist in the local database")
      }
      data = { key: "retryLogs", interactions: Array.isArray(retryLogs) ? retryLogs : [retryLogs] };
      
      const putRequest = store.put(data);
      putRequest.onsuccess = () => resolve(putRequest.result);
      putRequest.onerror = () => reject(`Failed to add interaction: ${putRequest.error}`);
    };

    getRequest.onerror = () => reject(`Failed to read interactions: ${getRequest.error}`);

    tx.oncomplete = () => db.close();
  });
}