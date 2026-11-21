/**
 * AksharType — 100% Client-Side Local Authentication (Offline-First & Never Auto-Logout)
 * Uses Web Crypto PBKDF2-HMAC-SHA256 (100,000 iterations + per-user 16-byte random salt).
 * Persists accounts & active session in localStorage AND mirrors to IndexedDB + Persistent Storage API
 * so users stay signed in across reloads, restarts, and offline sessions until they explicitly sign out.
 */

const ACCOUNTS_KEY = 'akshartype_accounts_v1';
const ACTIVE_USER_KEY = 'akshartype_active_user_v1';
const ACTIVE_SNAPSHOT_KEY = 'akshartype_active_snapshot_v1';
const PBKDF2_ITERATIONS = 100000;

const IDB_NAME = 'akshartype_persistent_db';
const IDB_STORE = 'kv';

function openPersistDb() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbSet(key, value) {
  const db = await openPersistDb();
  if (!db) return;
  try {
    await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore IDB write failures gracefully
  }
}

export async function idbGetAll() {
  const db = await openPersistDb();
  if (!db) return {};
  try {
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const result = {};
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          result[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      cursorReq.onerror = () => resolve({});
    });
  } catch {
    return {};
  }
}

export async function idbDelete(key) {
  const db = await openPersistDb();
  if (!db) return;
  try {
    await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

/**
 * Request durable persistent storage from the browser (prevents eviction of localStorage/IDB/PWA caches)
 * and restore any missing localStorage keys from the IndexedDB backup if needed.
 */
export async function hydratePersistentAuthAndStorage() {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      if (!already) {
        await navigator.storage.persist();
      }
    }
  } catch {
    // Safe fallback if browser declines
  }

  let restored = false;
  try {
    const backup = await idbGetAll();
    for (const [k, v] of Object.entries(backup)) {
      if (typeof v === 'string' && !localStorage.getItem(k)) {
        localStorage.setItem(k, v);
        restored = true;
      }
    }
    // Also mirror current localStorage keys into IDB if IDB didn't have them yet
    const keysToMirror = [ACCOUNTS_KEY, ACTIVE_USER_KEY, ACTIVE_SNAPSHOT_KEY];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith('akshartype_vault_')) {
        keysToMirror.push(k);
      }
    }
    for (const k of keysToMirror) {
      const val = localStorage.getItem(k);
      if (val && !backup[k]) {
        idbSet(k, val);
      }
    }
  } catch {
    // Non-fatal
  }

  return restored;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function generateSaltHex() {
  const salt = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(salt);
  } else {
    for (let i = 0; i < salt.length; i += 1) {
      salt[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(salt);
}

/**
 * Constant-time hex string equality check.
 */
function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function derivePasswordHash(password, saltHex) {
  const enc = new TextEncoder();
  const saltBytes = hexToBytes(saltHex);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    return `pbkdf2:${bytesToHex(new Uint8Array(derived))}`;
  }

  let acc = `${saltHex}:${password}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let r = 0; r < 4096; r += 1) {
    for (let i = 0; i < acc.length; i += 1) {
      const c = acc.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ (c + r), 0x85ebca6b) >>> 0;
    }
    acc = `${h1.toString(16)}${h2.toString(16)}`;
  }
  return `fallback:${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

function readAccountsRaw() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccountsRaw(accounts) {
  try {
    const serialized = JSON.stringify(accounts);
    localStorage.setItem(ACCOUNTS_KEY, serialized);
    idbSet(ACCOUNTS_KEY, serialized);
  } catch {
    // Ignore quota errors gracefully
  }
}

function persistActiveSession(user) {
  try {
    const snapshot = JSON.stringify({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    });
    localStorage.setItem(ACTIVE_USER_KEY, user.id);
    localStorage.setItem(ACTIVE_SNAPSHOT_KEY, snapshot);
    idbSet(ACTIVE_USER_KEY, user.id);
    idbSet(ACTIVE_SNAPSHOT_KEY, snapshot);
  } catch {
    // Ignore
  }
}

export function validateCredentials(username, password) {
  const trimmed = String(username || '').trim();
  if (trimmed.length < 3 || trimmed.length > 24) {
    return 'Username must be between 3 and 24 characters.';
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return 'Username may only use letters, numbers, underscores, and hyphens.';
  }
  const pass = String(password || '');
  if (pass.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  if (pass.length > 128) {
    return 'Password is too long.';
  }
  return null;
}

/**
 * Returns the currently signed-in local user.
 * Never logs out automatically unless the user explicitly calls signOut().
 */
export function getActiveUser() {
  try {
    const activeId = localStorage.getItem(ACTIVE_USER_KEY);
    if (activeId) {
      const found = readAccountsRaw().find((a) => a.id === activeId);
      if (found) {
        return {
          id: found.id,
          username: found.username,
          createdAt: found.createdAt,
        };
      }
    }
    // Fallback to durable session snapshot so transient state never causes an unexpected logout
    const snapRaw = localStorage.getItem(ACTIVE_SNAPSHOT_KEY);
    if (snapRaw) {
      const snap = JSON.parse(snapRaw);
      if (snap && snap.id && snap.username) {
        return {
          id: snap.id,
          username: snap.username,
          createdAt: snap.createdAt || Date.now(),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function listAccounts() {
  return readAccountsRaw().map((a) => ({
    id: a.id,
    username: a.username,
    createdAt: a.createdAt,
  }));
}

export function getActiveVaultKey() {
  const user = getActiveUser();
  return user ? `akshartype_vault_${user.id}` : 'akshartype_vault_guest';
}

export async function createAccount({ username, password }) {
  const err = validateCredentials(username, password);
  if (err) return { ok: false, error: err };

  const trimmed = username.trim();
  const normalized = trimmed.toLowerCase();
  const accounts = readAccountsRaw();

  if (accounts.some((a) => a.normalizedUsername === normalized)) {
    return {
      ok: false,
      error: 'That username already exists on this device. Try signing in instead.',
    };
  }

  const saltHex = generateSaltHex();
  const passwordHash = await derivePasswordHash(password, saltHex);
  const id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const record = {
    id,
    username: trimmed,
    normalizedUsername: normalized,
    saltHex,
    passwordHash,
    createdAt: Date.now(),
  };

  accounts.push(record);
  writeAccountsRaw(accounts);

  const userObj = {
    id: record.id,
    username: record.username,
    createdAt: record.createdAt,
  };
  persistActiveSession(userObj);

  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  } catch {
    // Ignore
  }

  return { ok: true, user: userObj };
}

export async function signIn({ username, password }) {
  const trimmed = String(username || '').trim();
  const pass = String(password || '');
  if (!trimmed || !pass) {
    return { ok: false, error: 'Enter both username and password.' };
  }

  const normalized = trimmed.toLowerCase();
  const account = readAccountsRaw().find((a) => a.normalizedUsername === normalized);
  if (!account) {
    return { ok: false, error: 'Invalid username or password.' };
  }

  const candidateHash = await derivePasswordHash(pass, account.saltHex);
  if (!timingSafeEqualHex(candidateHash, account.passwordHash)) {
    return { ok: false, error: 'Invalid username or password.' };
  }

  const userObj = {
    id: account.id,
    username: account.username,
    createdAt: account.createdAt,
  };
  persistActiveSession(userObj);

  return { ok: true, user: userObj };
}

/**
 * Explicit manual sign out only.
 */
export function signOut() {
  try {
    localStorage.removeItem(ACTIVE_USER_KEY);
    localStorage.removeItem(ACTIVE_SNAPSHOT_KEY);
    idbDelete(ACTIVE_USER_KEY);
    idbDelete(ACTIVE_SNAPSHOT_KEY);
  } catch {
    // Ignore
  }
}

export function getUserInitials(username) {
  if (!username) return 'G';
  const clean = String(username).trim();
  if (clean.length <= 2) return clean.toUpperCase();
  const parts = clean.split(/[_-\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}
