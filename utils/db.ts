
import { HistoryItem } from '../types';
import { Logger } from './logger';

const DB_NAME = 'ShuPhotoDB';
const DB_VERSION = 1;
const STORE_NAME = 'history';

// Open Database
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      Logger.error('DB', 'Failed to open database', (event.target as any).error);
      reject('Error opening database');
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Create store with 'id' as keyPath
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Add or Update Item
export const saveHistoryItem = async (item: HistoryItem): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(item);
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
          Logger.error('DB', 'Failed to save item', tx.error);
          reject(tx.error);
      }
    });
  } catch (e) {
    Logger.error('DB', 'Transaction failed', e);
  }
};

// Get All Items
export const getHistory = async (): Promise<HistoryItem[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        // IDB returns items sorted by key (id/timestamp usually ascending).
        // App expects newest first, so we might need to reverse in the UI or here.
        // Returning raw list here.
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    Logger.error('DB', 'Failed to get history', e);
    return [];
  }
};

// Delete Item
export const deleteHistoryItem = async (id: string): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

// Clear All
export const clearHistoryDB = async (): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};
