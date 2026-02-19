/**
 * Invio — persistence: IndexedDB primary, localStorage fallback
 * Auto-save draft; load last draft on start
 */

const INVIO_DB_NAME = 'InvioDB';
const INVIO_DB_VERSION = 1;
const INVIO_STORE = 'drafts';
const INVIO_LAST_KEY = 'invio_last_draft';
const INVIO_LOCAL_KEY = 'invio_draft_fallback';

/**
 * Open IndexedDB
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(INVIO_DB_NAME, INVIO_DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(INVIO_STORE)) {
        db.createObjectStore(INVIO_STORE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Save draft to IndexedDB (primary)
 */
async function saveDraftToIDB(draft) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INVIO_STORE, 'readwrite');
    const store = tx.objectStore(INVIO_STORE);
    const record = { id: INVIO_LAST_KEY, draft, updated: Date.now() };
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Load draft from IndexedDB
 */
async function loadDraftFromIDB() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(INVIO_STORE, 'readonly');
      const store = tx.objectStore(INVIO_STORE);
      const req = store.get(INVIO_LAST_KEY);
      req.onsuccess = () => {
        const row = req.result;
        resolve(row && row.draft ? row.draft : null);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (_) {
    return null;
  }
}

/**
 * Save to localStorage (fallback). Returns { ok: true } or { ok: false, error: string }.
 */
function saveDraftToLocal(draft) {
  try {
    localStorage.setItem(INVIO_LOCAL_KEY, JSON.stringify(draft));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : 'localStorage failed' };
  }
}

/**
 * Load from localStorage (fallback)
 */
function loadDraftFromLocal() {
  try {
    const raw = localStorage.getItem(INVIO_LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/**
 * Save draft: try IndexedDB first, then localStorage.
 * Returns { ok: true } or { ok: false, error: string }.
 */
async function saveDraft(draft) {
  try {
    await saveDraftToIDB(draft);
    return { ok: true };
  } catch (_) {
    const local = saveDraftToLocal(draft);
    return local;
  }
}

/**
 * Load draft: try IndexedDB first, then localStorage; otherwise null
 */
async function loadDraft() {
  let draft = await loadDraftFromIDB();
  if (draft) return draft;
  draft = loadDraftFromLocal();
  return draft || null;
}

if (typeof window !== 'undefined') {
  window.InvioStorage = {
    saveDraft,
    loadDraft,
    loadDraftFromIDB,
    loadDraftFromLocal
  };
}
