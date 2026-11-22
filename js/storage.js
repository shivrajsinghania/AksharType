/**
 * AksharType — Per-User Persistent Vault Storage (localStorage)
 * Isolates preferences, session history, and per-key hit/miss telemetry per account (or guest).
 */

import { getActiveVaultKey, idbSet } from './auth.js';

const LEGACY_PREFS_KEY = 'akshartype_prefs_v1';
const LEGACY_HISTORY_KEY = 'akshartype_history_v1';
const GUEST_VAULT_KEY = 'akshartype_vault_guest';
const MAX_HISTORY_ITEMS = 250;

export const DEFAULT_PREFS = {
  layout: 'english', // 'english' | 'mangal' | 'kruti-dev'
  textMode: 'standard', // 'standard' (Capitals, Numbers & Symbols) | 'easy' (small letters only)
  testMode: 'time', // 'time' | 'pages'
  durationMinutes: 3,
  isCustomTime: false,
  customMinutes: 10,
  pageCount: 1,
  soundProfile: 'mechanical', // 'mechanical' | 'soft' | 'off'
  showKeymap: false,
};

function normalizeLayoutId(id) {
  if (id === 'mangal-inscript' || id === 'mangal-remington' || id === 'mangal') {
    return 'mangal';
  }
  if (id === 'kruti-dev') return 'kruti-dev';
  return 'english';
}

function emptyBuddyState() {
  return {
    preferredName: '',
    goal: '',
    memories: [],
    cachedBrief: null,
    cachedFingerprint: '',
  };
}

function normalizeBuddyState(raw) {
  const base = emptyBuddyState();
  if (!raw || typeof raw !== 'object') return base;
  base.preferredName = typeof raw.preferredName === 'string' ? raw.preferredName.trim().slice(0, 32) : '';
  base.goal = typeof raw.goal === 'string' ? raw.goal.trim().slice(0, 90) : '';
  if (Array.isArray(raw.memories)) {
    base.memories = raw.memories
      .filter((m) => typeof m === 'string' && m.trim())
      .map((m) => m.trim().slice(0, 110))
      .slice(-16);
  }
  if (raw.cachedBrief && typeof raw.cachedBrief === 'object') {
    base.cachedBrief = raw.cachedBrief;
  }
  if (typeof raw.cachedFingerprint === 'string') {
    base.cachedFingerprint = raw.cachedFingerprint;
  }
  return base;
}

function emptyVault() {
  return {
    prefs: { ...DEFAULT_PREFS },
    sessions: [],
    keyStats: {
      english: {},
      mangal: {},
      'kruti-dev': {},
    },
    buddy: emptyBuddyState(),
  };
}

/**
 * Migrate any v1 non-vault data into guest vault once on first load.
 */
function migrateLegacyGuestIfNeeded() {
  try {
    if (localStorage.getItem(GUEST_VAULT_KEY)) return;
    const legacyPrefsRaw = localStorage.getItem(LEGACY_PREFS_KEY);
    const legacyHistoryRaw = localStorage.getItem(LEGACY_HISTORY_KEY);
    if (!legacyPrefsRaw && !legacyHistoryRaw) return;

    const vault = emptyVault();
    if (legacyPrefsRaw) {
      const parsedPrefs = JSON.parse(legacyPrefsRaw);
      vault.prefs = { ...DEFAULT_PREFS, ...parsedPrefs };
      vault.prefs.layout = normalizeLayoutId(vault.prefs.layout);
    }
    if (legacyHistoryRaw) {
      const parsedHist = JSON.parse(legacyHistoryRaw);
      if (Array.isArray(parsedHist)) {
        vault.sessions = parsedHist.map((item) => ({
          ...item,
          layout: normalizeLayoutId(item.layout),
        }));
      }
    }
    const serialized = JSON.stringify(vault);
    localStorage.setItem(GUEST_VAULT_KEY, serialized);
    idbSet(GUEST_VAULT_KEY, serialized);
  } catch {
    // Ignore malformed legacy state
  }
}

function readVaultByKey(key) {
  migrateLegacyGuestIfNeeded();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return emptyVault();
    const parsed = JSON.parse(raw);
    const vault = emptyVault();
    if (parsed && typeof parsed === 'object') {
      vault.prefs = { ...DEFAULT_PREFS, ...(parsed.prefs || {}) };
      vault.prefs.layout = normalizeLayoutId(vault.prefs.layout);
      vault.prefs.textMode = vault.prefs.textMode === 'easy' ? 'easy' : 'standard';
      if (Array.isArray(parsed.sessions)) {
        vault.sessions = parsed.sessions.map((item) => ({
          ...item,
          layout: normalizeLayoutId(item.layout),
        }));
      }
      if (parsed.keyStats && typeof parsed.keyStats === 'object') {
        vault.keyStats = {
          english: parsed.keyStats.english || {},
          mangal: parsed.keyStats.mangal || {},
          'kruti-dev': parsed.keyStats['kruti-dev'] || {},
        };
      }
      vault.buddy = normalizeBuddyState(parsed.buddy);
    }
    return vault;
  } catch {
    return emptyVault();
  }
}

function writeVaultByKey(key, vault) {
  try {
    const serialized = JSON.stringify(vault);
    localStorage.setItem(key, serialized);
    idbSet(key, serialized);
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadPrefs() {
  return readVaultByKey(getActiveVaultKey()).prefs;
}

export function savePrefs(prefs) {
  const key = getActiveVaultKey();
  const vault = readVaultByKey(key);
  vault.prefs = { ...DEFAULT_PREFS, ...prefs };
  vault.prefs.layout = normalizeLayoutId(vault.prefs.layout);
  writeVaultByKey(key, vault);
}

export function loadHistory() {
  return readVaultByKey(getActiveVaultKey()).sessions;
}

export function loadKeyStats() {
  return readVaultByKey(getActiveVaultKey()).keyStats;
}

export function loadBuddyState() {
  return readVaultByKey(getActiveVaultKey()).buddy;
}

export function saveBuddyState(partial) {
  const key = getActiveVaultKey();
  const vault = readVaultByKey(key);
  vault.buddy = normalizeBuddyState({ ...vault.buddy, ...partial });
  writeVaultByKey(key, vault);
  return vault.buddy;
}

export function appendBuddyMemory(note) {
  const clean = typeof note === 'string' ? note.trim().slice(0, 110) : '';
  if (!clean) return { buddy: loadBuddyState(), added: false };
  const key = getActiveVaultKey();
  const vault = readVaultByKey(key);
  const existing = vault.buddy.memories || [];
  const norm = clean.toLowerCase();
  if (existing.some((m) => m.toLowerCase() === norm)) {
    return { buddy: vault.buddy, added: false };
  }
  vault.buddy.memories = [...existing, clean].slice(-16);
  writeVaultByKey(key, vault);
  return { buddy: vault.buddy, added: true };
}

export function clearBuddyMemories() {
  return saveBuddyState({ memories: [], goal: '' });
}

export function hasGuestSessions() {
  return readVaultByKey(GUEST_VAULT_KEY).sessions.length > 0;
}

/**
 * Copy guest sessions, keyStats, buddy long-term memory, and prefs into the newly created active user vault.
 */
export function importGuestDataIntoActiveVault() {
  const targetKey = getActiveVaultKey();
  if (targetKey === GUEST_VAULT_KEY) return;

  const guest = readVaultByKey(GUEST_VAULT_KEY);
  const target = readVaultByKey(targetKey);

  target.prefs = { ...target.prefs, ...guest.prefs };
  target.sessions = [...guest.sessions, ...target.sessions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_HISTORY_ITEMS);

  for (const layoutId of ['english', 'mangal', 'kruti-dev']) {
    const srcMap = guest.keyStats[layoutId] || {};
    const dstMap = target.keyStats[layoutId] || {};
    for (const [ch, counts] of Object.entries(srcMap)) {
      if (!dstMap[ch]) {
        dstMap[ch] = { hits: 0, misses: 0 };
      }
      dstMap[ch].hits += Number(counts.hits || 0);
      dstMap[ch].misses += Number(counts.misses || 0);
    }
    target.keyStats[layoutId] = dstMap;
  }

  const mergedMem = Array.from(
    new Set([...(guest.buddy?.memories || []), ...(target.buddy?.memories || [])])
  ).slice(-16);
  target.buddy = normalizeBuddyState({
    ...guest.buddy,
    ...target.buddy,
    memories: mergedMem,
  });

  writeVaultByKey(targetKey, target);
}

/**
 * Persist a completed typing session AND merge per-key hit/miss stats into active user's vault.
 */
export function recordSession(session, sessionKeyStats = null) {
  const key = getActiveVaultKey();
  const vault = readVaultByKey(key);

  const layoutId = normalizeLayoutId(session.layout);
  const prevBest = getPersonalBestForLayout(vault.sessions, layoutId);
  const isNewPB = !prevBest || session.netWpm > prevBest.netWpm;

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    ...session,
    layout: layoutId,
  };

  vault.sessions = [entry, ...vault.sessions].slice(0, MAX_HISTORY_ITEMS);

  if (sessionKeyStats && typeof sessionKeyStats === 'object') {
    const bucket = vault.keyStats[layoutId] || {};
    for (const [charKey, counts] of Object.entries(sessionKeyStats)) {
      if (!bucket[charKey]) {
        bucket[charKey] = { hits: 0, misses: 0 };
      }
      bucket[charKey].hits += Number(counts.hits || 0);
      bucket[charKey].misses += Number(counts.misses || 0);
    }
    vault.keyStats[layoutId] = bucket;
  }

  // Invalidate cached buddy brief so Performance tab gets fresh insights next visit
  vault.buddy.cachedFingerprint = '';

  writeVaultByKey(key, vault);
  return { entry, isNewPB, history: vault.sessions };
}

export function deleteSession(sessionId) {
  const key = getActiveVaultKey();
  const vault = readVaultByKey(key);
  vault.sessions = vault.sessions.filter((item) => item.id !== sessionId);
  vault.buddy.cachedFingerprint = '';
  writeVaultByKey(key, vault);
  return vault.sessions;
}

export function clearHistory() {
  const key = getActiveVaultKey();
  const vault = readVaultByKey(key);
  vault.sessions = [];
  vault.keyStats = {
    english: {},
    mangal: {},
    'kruti-dev': {},
  };
  vault.buddy.cachedFingerprint = '';
  vault.buddy.cachedBrief = null;
  writeVaultByKey(key, vault);
  return [];
}

export function getPersonalBestForLayout(history, layoutId) {
  let best = null;
  for (const item of history) {
    if (item.layout !== layoutId) continue;
    if (!best || item.netWpm > best.netWpm) {
      best = item;
    }
  }
  return best;
}
