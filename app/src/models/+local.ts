

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
                    const userInteractionStore = db.createObjectStore("interaction", {keyPath: "id"});
                }
            }
            request.onsuccess = (event) => {
                const db = (event.target as IDBOpenDBRequest).result as IDBDatabase;
                resolve(db);
            }
            request.onerror = (event) => {
                reject(`Database error: ${(event.target as IDBOpenDBRequest).error}`);
            };  
        })
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

export async function addInteraction(interactionData: interactionData) {
        const db = await openDatabase(); 

        return new Promise((resolve, reject) => {
            if (db) {
                const tx = db.transaction("interaction", "readwrite"); 
                const interactionStore = tx.objectStore("interaction"); 
                
                const request = interactionStore.add(interactionData);
            
                request.onsuccess = () => { resolve(request.result); }
                request.onerror = () => { reject(`Failed to add interaction: ${request.error}`);};
                tx.oncomplete = () => db.close();
           
            } else {
                reject("Failed to open database");
            }
        });
    }
