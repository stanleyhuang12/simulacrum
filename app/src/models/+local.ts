/*This module contains scripts to manage local caching and reading of interaction data. */

import type { interactionData } from "./+utils";
import type { Memory, timeMetadata } from "./+deliberations";


export async function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("interaction", 1);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains("interaction")) {
                db.createObjectStore("interaction", { keyPath: "key" });
            }
        };

        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Ensure the allInteractions record exists
            const tx = db.transaction("interaction", "readwrite");
            const store = tx.objectStore("interaction");
            const getRequest = store.get("allInteractions");

            getRequest.onsuccess = () => {
                if (!getRequest.result) {
                    store.put({ key: "allInteractions", interactions: [] });
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
    if (memory.time) {
        if (memory.time.responseAwait) memory.time.responseAwait = new Date(memory.time.responseAwait);
        if (memory.time.responseStart)  memory.time.responseStart  = new Date(memory.time.responseStart);
        if (memory.time.responseEnd)    memory.time.responseEnd    = new Date(memory.time.responseEnd);
    }
    return memory as Memory;
}

export async function readInteraction(index?: number): Promise<Memory[]> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("interaction", "readonly");
        const store = tx.objectStore("interaction");
        const getRequest = store.get("allInteractions");

        getRequest.onsuccess = () => {
            const raw: any[] = getRequest.result?.interactions || [];
            const memories: Memory[] = raw.map(reviveDates);

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

        getRequest.onerror = () => reject(new Error("Failed to retrieve interactions"));
        tx.oncomplete = () => db.close();
    });
}

// ─────────────────────────────────────────────
// ADD
// Accepts a Memory directly — both user and agent interactions
// interactionData is kept as the param type for call-site compatibility
// but we store it as-is since it already matches Memory shape
// ─────────────────────────────────────────────

export async function addInteraction(interaction: interactionData | Memory): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("interaction", "readwrite");
        const store = tx.objectStore("interaction");
        const getRequest = store.get("allInteractions");

        getRequest.onsuccess = () => {
            const existing = getRequest.result ?? { key: "allInteractions", interactions: [] };
            existing.interactions.push(interaction);

            const putRequest = store.put(existing);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(`Failed to add interaction: ${putRequest.error}`);
        };

        getRequest.onerror = () => reject(`Failed to read interactions: ${getRequest.error}`);
        tx.oncomplete = () => db.close();
    });
}

// ─────────────────────────────────────────────
// CLEAR (useful for testing / session reset)
// ─────────────────────────────────────────────

export async function clearInteractions(): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("interaction", "readwrite");
        const store = tx.objectStore("interaction");
        const putRequest = store.put({ key: "allInteractions", interactions: [] });

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(`Failed to clear interactions: ${putRequest.error}`);
        tx.oncomplete = () => db.close();
    });
}