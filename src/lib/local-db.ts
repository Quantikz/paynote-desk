import type { PersistStorage, StorageValue } from "zustand/middleware";

const DB_NAME = "paynote-local";
const KV = "kv";
const IMAGES = "images";
const LEGACY_KEY = "paynote-ng-v1";

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(KV)) {
        req.result.createObjectStore(KV);
      }
      if (!req.result.objectStoreNames.contains(IMAGES)) {
        req.result.createObjectStore(IMAGES);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function idbGet<T>(store: string, key: string): Promise<T | null> {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(store)) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function idbPut(store: string, key: string, value: unknown) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(store)) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function idbDel(store: string, key: string) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(store)) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function saveProductImage(id: string, dataUrl?: string) {
  if (!id) return;
  if (!dataUrl) {
    await idbDel(IMAGES, id);
    return;
  }
  await idbPut(IMAGES, id, dataUrl);
}

export async function loadProductImages(): Promise<Record<string, string>> {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(IMAGES)) return {};
  return new Promise((resolve) => {
    const tx = db.transaction(IMAGES, "readonly");
    const req = tx.objectStore(IMAGES).openCursor();
    const out: Record<string, string> = {};
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(out);
        return;
      }
      if (typeof cursor.key === "string" && typeof cursor.value === "string") {
        out[cursor.key] = cursor.value;
      }
      cursor.continue();
    };
    req.onerror = () => resolve(out);
  });
}

export const localPersistStorage: PersistStorage<unknown> = {
  getItem: async (name) => {
    const fromDb = await idbGet<StorageValue<unknown>>(KV, name);
    if (fromDb) return fromDb;
    if (typeof localStorage === "undefined") return null;
    const legacy = localStorage.getItem(name) ?? localStorage.getItem(LEGACY_KEY);
    if (!legacy) return null;
    try {
      const parsed = JSON.parse(legacy) as StorageValue<unknown>;
      await idbPut(KV, name, parsed);
      return parsed;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    await idbPut(KV, name, value);
  },
  removeItem: async (name) => {
    await idbDel(KV, name);
  },
};
