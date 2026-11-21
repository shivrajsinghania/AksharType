/**
 * AksharType — Client-Side Persistence (localStorage)
 * Stores user configuration preferences, session history, and personal bests.
 */

const PREFS_KEY = 'akshartype_prefs_v1';
const HISTORY_KEY = 'akshartype_history_v1';
const MAX_HISTORY_ITEMS = 120;

export const DEFAULT_PREFS = {
  layout: 'english', // 'english' | 'mangal' | 'kruti-dev'
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

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const merged = { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    merged.layout = normalizeLayoutId(merged.layout);
    return merged;
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      layout: normalizeLayoutId(item.layout),
    }));
  } catch {
    return [];
  }
}

export function recordSession(session) {
  const history = loadHistory();
  const prevBest = getPersonalBestForLayout(history, session.layout);
  const isNewPB = !prevBest || session.netWpm > prevBest.netWpm;

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    ...session,
  };

  const next = [entry, ...history].slice(0, MAX_HISTORY_ITEMS);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors gracefully
  }

  return { entry, isNewPB, history: next };
}

export function deleteSession(sessionId) {
  const history = loadHistory().filter((item) => item.id !== sessionId);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignore
  }
  return history;
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore
  }
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
