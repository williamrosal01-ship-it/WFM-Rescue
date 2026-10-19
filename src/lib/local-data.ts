// Uploaded interval data lives only in this browser (IndexedDB). Nothing here is sent to a server.
// Demo data is never stored. Clearing site data in the browser deletes it.
import type { IntervalRecord } from "@/lib/types";

const DB_NAME = "wfm-rescue";
const STORE = "datasets";
const KEY = "current";

export interface SavedDataset {
  name: string;
  rows: IntervalRecord[];
  savedAt: string;
}

const hasIdb = () => typeof indexedDB !== "undefined";

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const run = async <T>(mode: IDBTransactionMode, make: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> => {
  if (!hasIdb()) return undefined;
  const db = await openDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = make(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
};

export const saveDataset = (name: string, rows: IntervalRecord[]) =>
  run<IDBValidKey>("readwrite", (s) => s.put({ name, rows, savedAt: new Date().toISOString() } satisfies SavedDataset, KEY));

export const loadDataset = async (): Promise<SavedDataset | null> => {
  const v = await run<SavedDataset | undefined>("readonly", (s) => s.get(KEY));
  return v && Array.isArray(v.rows) ? v : null;
};

export const clearDataset = () => run<undefined>("readwrite", (s) => s.delete(KEY));
