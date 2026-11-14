const DB_NAME = 'dsp_audio_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'audio_blobs';

function openAudioDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveTrackBlob(trackId: string, blob: Blob): Promise<boolean> {
  const db = await openAudioDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(blob, trackId);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

export async function loadAllTrackBlobs(): Promise<Record<string, string>> {
  const db = await openAudioDb();
  if (!db) return {};

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const urls: Record<string, string> = {};
      const cursorReq = store.openCursor();

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          const val = cursor.value;
          if (val instanceof Blob && typeof cursor.key === 'string') {
            urls[cursor.key] = URL.createObjectURL(val);
          }
          cursor.continue();
        }
      };

      tx.oncomplete = () => {
        db.close();
        resolve(urls);
      };
      tx.onerror = () => {
        db.close();
        resolve(urls);
      };
    } catch {
      db.close();
      resolve({});
    }
  });
}

export async function deleteTrackBlob(trackId: string): Promise<void> {
  const db = await openAudioDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(trackId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}
