

/** This module contains scripts to manage local caching and reading of interaction data. 
 *  
 * 
 */ 

import type { interactionData } from "./+utils";
export async function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("interaction", 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result as IDBDatabase;
      if (!db.objectStoreNames.contains("interaction")) {
        db.createObjectStore("interaction", { keyPath: "key" });
      }
    };
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result as IDBDatabase;

      const tx = db.transaction("interaction", "readwrite");
      const store = tx.objectStore("interaction");
      const getRequest = store.get("allInteractions");

      getRequest.onsuccess = () => {
        if (!getRequest.result) {
          store.put({ key: "allInteractions", interactions: [] });
        }
      };
      resolve(db);
    };
    request.onerror = (event) => {
      reject(`Database error: ${(event.target as IDBOpenDBRequest).error}`);
    };
  });
}
export async function readInteraction(
  episodeNumber: number,
  profile: "user" | "agent" | "both"
): Promise<interactionData | { user?: interactionData; agent?: interactionData }> {
  const db = await openDatabase();
  if (!db) throw new Error("Failed to open local IndexedDB.");

  return new Promise((resolve, reject) => {
    const tx = db.transaction("interaction", "readonly");
    const store = tx.objectStore("interaction");

    if (profile === "both") {
      const userReq = store.get(`${episodeNumber}-user`);
      const agentReq = store.get(`${episodeNumber}-agent`);

      let result: {
        user?: interactionData;
        agent?: interactionData;
      } = {};

      userReq.onsuccess = () => {
        if (userReq.result) {
          result.user = userReq.result as interactionData;
        }
      };

      agentReq.onsuccess = () => {
        if (agentReq.result) {
          result.agent = agentReq.result as interactionData;
        }
      };

      userReq.onerror = agentReq.onerror = () =>
        reject(new Error("Failed to retrieve interactions"));

      tx.oncomplete = () => {
        db.close();
        resolve(result); // returns whatever exists
      };

      tx.onerror = () => reject(new Error("Transaction failed"));
    } else {
      const request = store.get(`${episodeNumber}-${profile}`);

      request.onerror = () =>
        reject(new Error("Failed to retrieve interaction"));

      request.onsuccess = () => {
        resolve(request.result as interactionData);
      };

      tx.oncomplete = () => db.close();
    }
  });
}

export async function addInteraction(interaction: interactionData) {
  const db = await openDatabase();
  if (!db) throw new Error("Failed to open database");

  return new Promise((resolve, reject) => {
    const tx = db.transaction("interaction", "readwrite");
    const store = tx.objectStore("interaction");

    const getRequest = store.get("allInteractions");

    getRequest.onsuccess = () => {
      let data = getRequest.result;

      if (!data) {
        // Shouldn't happen if initialized, but just in case; 
        data = { key: "allInteractions", interactions: [interaction] };
      } else {
        data.interactions.push(interaction);
      }

      const putRequest = store.put(data);
      putRequest.onsuccess = () => resolve(putRequest.result);
      putRequest.onerror = () => reject(`Failed to add interaction: ${putRequest.error}`);
    };

    getRequest.onerror = () => reject(`Failed to read interactions: ${getRequest.error}`);

    tx.oncomplete = () => db.close();
  });
}