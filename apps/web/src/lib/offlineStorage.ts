/**
 * IndexedDB storage for offline downloads.
 * Stores metadata (title, poster, etc.) and video blobs keyed by contentId or contentId_episodeId.
 */

const DB_NAME = 'movihive-offline';
const DB_VERSION = 1;
const META_STORE = 'downloads_meta';
const BLOB_STORE = 'downloads_blobs';

export interface OfflineDownloadMeta {
  contentId: string;
  episodeId: string | null;
  title: string;
  posterUrl: string | null;
  type: string;
  duration: number | null;
  season?: number;
  episode?: number;
  episodeTitle?: string | null;
  downloadedAt: number;
}

function getDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not available'));
  }
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: 'key' });
      }
    };
  });
}

function storageKey(contentId: string, episodeId: string | null): string {
  return episodeId ? `${contentId}_${episodeId}` : contentId;
}

export async function listDownloads(): Promise<OfflineDownloadMeta[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const store = tx.objectStore(META_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = (req.result as Array<{ key: string; meta: OfflineDownloadMeta }>) ?? [];
      resolve(rows.map((r) => r.meta).sort((a, b) => b.downloadedAt - a.downloadedAt));
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getDownloadMeta(contentId: string, episodeId: string | null): Promise<OfflineDownloadMeta | null> {
  const db = await getDb();
  const key = storageKey(contentId, episodeId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const req = tx.objectStore(META_STORE).get(key);
    req.onsuccess = () => {
      const row = req.result as { key: string; meta: OfflineDownloadMeta } | undefined;
      resolve(row?.meta ?? null);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function isDownloaded(contentId: string, episodeId?: string | null): Promise<boolean> {
  const meta = await getDownloadMeta(contentId, episodeId ?? null);
  return !!meta;
}

export async function saveDownload(
  contentId: string,
  episodeId: string | null,
  meta: Omit<OfflineDownloadMeta, 'contentId' | 'episodeId' | 'downloadedAt'>,
  blob: Blob
): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {});
  }
  const db = await getDb();
  const key = storageKey(contentId, episodeId);
  const fullMeta: OfflineDownloadMeta = {
    ...meta,
    contentId,
    episodeId,
    downloadedAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
    tx.objectStore(META_STORE).put({ key, meta: fullMeta });
    tx.objectStore(BLOB_STORE).put({ key, blob });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDownloadBlob(contentId: string, episodeId: string | null): Promise<Blob | null> {
  const db = await getDb();
  const key = storageKey(contentId, episodeId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readonly');
    const req = tx.objectStore(BLOB_STORE).get(key);
    req.onsuccess = () => {
      const row = req.result as { key: string; blob: Blob } | undefined;
      resolve(row?.blob ?? null);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function removeDownload(contentId: string, episodeId: string | null): Promise<void> {
  const db = await getDb();
  const key = storageKey(contentId, episodeId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
    tx.objectStore(META_STORE).delete(key);
    tx.objectStore(BLOB_STORE).delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
  }
  return { usage: 0, quota: 0 };
}
