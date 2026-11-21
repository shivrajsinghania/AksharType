/**
 * AksharType — 100% Client-Side Local Authentication (Offline-First)
 * Uses Web Crypto PBKDF2-HMAC-SHA256 (100,000 iterations + per-user 16-byte random salt).
 * Passwords are never stored in plaintext.
 */

const ACCOUNTS_KEY = 'akshartype_accounts_v1';
const ACTIVE_USER_KEY = 'akshartype_active_user_v1';
const PBKDF2_ITERATIONS = 100000;

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

/**
 * Derive password hash using Web Crypto PBKDF2-SHA256.
 */
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

  // Fallback pure-JS iterative mixing only if subtle crypto is unavailable in an unsecure context
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
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore quota errors gracefully
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

export function getActiveUser() {
  try {
    const activeId = localStorage.getItem(ACTIVE_USER_KEY);
    if (!activeId) return null;
    const found = readAccountsRaw().find((a) => a.id === activeId);
    if (!found) {
      localStorage.removeItem(ACTIVE_USER_KEY);
      return null;
    }
    return {
      id: found.id,
      username: found.username,
      createdAt: found.createdAt,
    };
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
    return { ok: false, error: 'That username already exists on this device. Try signing in instead.' };
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

  try {
    localStorage.setItem(ACTIVE_USER_KEY, id);
  } catch {
    // Ignore
  }

  return {
    ok: true,
    user: {
      id: record.id,
      username: record.username,
      createdAt: record.createdAt,
    },
  };
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

  try {
    localStorage.setItem(ACTIVE_USER_KEY, account.id);
  } catch {
    // Ignore
  }

  return {
    ok: true,
    user: {
      id: account.id,
      username: account.username,
      createdAt: account.createdAt,
    },
  };
}

export function signOut() {
  try {
    localStorage.removeItem(ACTIVE_USER_KEY);
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
