import type { WebPersistedState } from "../types";

export const WEB_STORAGE_KEY = "doc-assistant-store-v1";
export const WEB_STORAGE_DB = "doc-assistant-db";
export const WEB_STORAGE_STORE = "state";
export const WEB_STORAGE_STATE_ID = "current";

export const openWebStoreDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(WEB_STORAGE_DB, 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(WEB_STORAGE_STORE);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error("IndexedDB upgrade blocked"));
});

export const readWebState = async (): Promise<WebPersistedState | null> => {
  const db = await openWebStoreDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(WEB_STORAGE_STORE, "readonly").objectStore(WEB_STORAGE_STORE).get(WEB_STORAGE_STATE_ID);
    request.onsuccess = () => resolve((request.result as WebPersistedState | undefined) ?? null);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close()) as Promise<WebPersistedState | null>;
};

export const writeWebState = async (state: WebPersistedState) => {
  const db = await openWebStoreDb();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(WEB_STORAGE_STORE, "readwrite").objectStore(WEB_STORAGE_STORE).put(state, WEB_STORAGE_STATE_ID);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
};
