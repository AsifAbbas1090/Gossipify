/**
 * Secure storage for private keys using IndexedDB
 * Private keys are encrypted with user password before storage
 */

const DB_NAME = 'gossipify_secure_storage';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

interface StoredKey {
  encrypted: string;
  salt: string;
  publicKey: string;
}

/**
 * Open IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Store encrypted private key
 */
export async function storeEncryptedKey(
  publicKey: string,
  encrypted: string,
  salt: string
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  await new Promise<void>((resolve, reject) => {
    const request = store.put({
      id: 'private_key',
      publicKey,
      encrypted,
      salt,
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve encrypted private key
 */
export async function getEncryptedKey(): Promise<StoredKey | null> {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.get('private_key');
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear stored keys (for logout)
 */
export async function clearStoredKeys(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  await new Promise<void>((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

