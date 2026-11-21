/**
 * AksharType — Main Application Controller (100% Pure Vanilla ES JavaScript)
 * Real-time inline typing engine for English, Hindi मंगल (Mangal), and कृति देव (Kruti Dev 010),
 * 100% offline PWA, client-side salted local accounts, and mathematical Performance Dashboard.
 */

import { LAYOUTS, tokenizeForLayout, describePhysicalKey } from './keymaps.js';
import { PASSAGES, WORDS_PER_PAGE, getPassagesByLanguage, buildSessionText } from './passages.js';
import { soundEngine } from './sound.js';
import {
  getActiveUser,
  createAccount,
  signIn,
  signOut,
  getUserInitials,
  hydratePersistentAuthAndStorage,
} from './auth.js';
import {
  loadPrefs,
  savePrefs,
  loadHistory,
  loadKeyStats,
  hasGuestSessions,
  importGuestDataIntoActiveVault,
  recordSession,
  deleteSession,
  clearHistory,
  getPersonalBestForLayout,
} from './storage.js';
import {
  computeDashboardMetrics,
  computeWeakKeyReport,
  buildWeakKeysDrill,
  evaluateAchievements,
} from './analytics.js';
import { ResultsChart, TrendChart } from './chart.js';
import { KeyboardGuide, renderWeakKeyHeatmap } from './keyboard-ui.js';
import { initPWA } from './pwa.js';

// ============================================================================
// DOM References
// ============================================================================

const dom = {
  // Navigation & Top Bar
  brandHome: document.getElementById('brand-home'),
  navButtons: document.querySelectorAll('.nav-link[data-view]'),
  navKeymapToggle: document.getElementById('nav-keymap-toggle'),
  pwaInstallBtn: document.getElementById('pwa-install-btn'),
  accountTriggerBtn: document.getElementById('account-trigger-btn'),
  views: {
    practice: document.getElementById('view-practice'),
    passages: document.getElementById('view-passages'),
    performance: document.getElementById('view-performance'),
  },

  // Config Bar
  layoutSelector: document.getElementById('layout-selector'),
  textModeSelector: document.getElementById('text-mode-selector'),
  modeTypeSelector: document.getElementById('mode-type-selector'),
  timeOptions: document.getElementById('time-options'),
  customMinuteWrap: document.getElementById('custom-minute-wrap'),
  customMinuteInput: document.getElementById('custom-minute-input'),
  pageOptions: document.getElementById('page-options'),
  soundSelector: document.getElementById('sound-selector'),

  // Practice Stage & Telemetry
  typingPanel: document.getElementById('typing-panel'),
  resultsPanel: document.getElementById('results-panel'),
  metaPassageTitle: document.getElementById('meta-passage-title'),
  metaLayoutLabel: document.getElementById('meta-layout-label'),
  metaLockLabel: document.getElementById('meta-lock-label'),
  liveWpm: document.getElementById('live-wpm'),
  liveAccuracy: document.getElementById('live-accuracy'),
  liveMistakes: document.getElementById('live-mistakes'),
  liveProgressLabel: document.getElementById('live-progress-label'),
  liveProgress: document.getElementById('live-progress'),
  progressFill: document.getElementById('progress-fill'),
  typingStage: document.getElementById('typing-stage'),
  imeCapture: document.getElementById('ime-capture'),
  streamViewport: document.getElementById('stream-viewport'),
  streamContent: document.getElementById('stream-content'),
  streamCaret: document.getElementById('stream-caret'),
  focusScrim: document.getElementById('focus-scrim'),
  focusNextKey: document.getElementById('focus-next-key'),
  btnExitFocus: document.getElementById('btn-exit-focus'),
  btnFocusRestart: document.getElementById('btn-focus-restart'),
  stageHint: document.getElementById('stage-hint'),
  nextKeyReadout: document.getElementById('next-key-readout'),
  btnNextPassage: document.getElementById('btn-next-passage'),
  btnRestart: document.getElementById('btn-restart'),

  // Keymap Drawer
  keymapDrawer: document.getElementById('keymap-drawer'),
  keymapTitle: document.getElementById('keymap-title'),
  keyboardGrid: document.getElementById('keyboard-grid'),
  closeKeymapBtn: document.getElementById('close-keymap-btn'),

  // Results Screen
  resultsSubtitle: document.getElementById('results-subtitle'),
  resultsPbCallout: document.getElementById('results-pb-callout'),
  resNetWpm: document.getElementById('res-net-wpm'),
  resRawWpm: document.getElementById('res-raw-wpm'),
  resAccuracy: document.getElementById('res-accuracy'),
  resAccStatus: document.getElementById('res-acc-status'),
  resCharsTotal: document.getElementById('res-chars-total'),
  resCharsBreakdown: document.getElementById('res-chars-breakdown'),
  resDuration: document.getElementById('res-duration'),
  resConsistency: document.getElementById('res-consistency'),
  resultsChartCanvas: document.getElementById('results-chart'),
  chartTooltip: document.getElementById('chart-tooltip'),
  resRetryBtn: document.getElementById('res-retry-btn'),
  resNextBtn: document.getElementById('res-next-btn'),
  resPerformanceBtn: document.getElementById('res-performance-btn'),

  // Passages Library
  passageFilter: document.getElementById('passage-filter'),
  passagesGrid: document.getElementById('passages-grid'),
  passagesCustomBtn: document.getElementById('passages-custom-btn'),

  // Performance Dashboard
  profileAvatar: document.getElementById('profile-avatar'),
  profileUsername: document.getElementById('profile-username'),
  profileMemberMeta: document.getElementById('profile-member-meta'),
  profileSummaryLine: document.getElementById('profile-summary-line'),
  profileAccountBtn: document.getElementById('profile-account-btn'),
  perfLayoutFilter: document.getElementById('perf-layout-filter'),
  perfAvgWpm: document.getElementById('perf-avg-wpm'),
  perfWpmDelta: document.getElementById('perf-wpm-delta'),
  perfAvgAcc: document.getElementById('perf-avg-acc'),
  perfAccSub: document.getElementById('perf-acc-sub'),
  perfRightWrong: document.getElementById('perf-right-wrong'),
  perfRatioRight: document.getElementById('perf-ratio-right'),
  perfRatioWrong: document.getElementById('perf-ratio-wrong'),
  perfRwSub: document.getElementById('perf-rw-sub'),
  perfTestsCount: document.getElementById('perf-tests-count'),
  perfStreakSub: document.getElementById('perf-streak-sub'),
  trendChartCanvas: document.getElementById('trend-chart'),
  trendTooltip: document.getElementById('trend-tooltip'),
  heatmapLayoutSelector: document.getElementById('heatmap-layout-selector'),
  heatmapKeyboardGrid: document.getElementById('heatmap-keyboard-grid'),
  heatmapHoverDetail: document.getElementById('heatmap-hover-detail'),
  weakKeysList: document.getElementById('weak-keys-list'),
  practiceWeakKeysBtn: document.getElementById('practice-weak-keys-btn'),
  achievementsSummary: document.getElementById('achievements-summary'),
  achievementsGrid: document.getElementById('achievements-grid'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  pbGrid: document.getElementById('pb-grid'),
  historyTableWrap: document.getElementById('history-table-wrap'),
  historyTbody: document.getElementById('history-tbody'),
  historyEmpty: document.getElementById('history-empty'),
  emptyStartBtn: document.getElementById('empty-start-btn'),

  // Account Modal
  accountModal: document.getElementById('account-modal'),
  accountModalTitle: document.getElementById('account-modal-title'),
  closeAccountModalBtn: document.getElementById('close-account-modal-btn'),
  authFormsView: document.getElementById('auth-forms-view'),
  authSignedInView: document.getElementById('auth-signedin-view'),
  authModeTabs: document.getElementById('auth-mode-tabs'),
  authForm: document.getElementById('auth-form'),
  authUsername: document.getElementById('auth-username'),
  authPassword: document.getElementById('auth-password'),
  authConfirmWrap: document.getElementById('auth-confirm-wrap'),
  authConfirmPassword: document.getElementById('auth-confirm-password'),
  importGuestWrap: document.getElementById('import-guest-wrap'),
  importGuestCheckbox: document.getElementById('import-guest-checkbox'),
  authError: document.getElementById('auth-error'),
  authSubmitBtn: document.getElementById('auth-submit-btn'),
  modalAvatar: document.getElementById('modal-avatar'),
  modalUsername: document.getElementById('modal-username'),
  modalMemberSince: document.getElementById('modal-member-since'),
  modalGoPerformanceBtn: document.getElementById('modal-go-performance-btn'),
  modalSwitchAccountBtn: document.getElementById('modal-switch-account-btn'),
  modalSignOutBtn: document.getElementById('modal-signout-btn'),

  // Custom Text Modal
  openCustomTextBtn: document.getElementById('open-custom-text-btn'),
  customTextModal: document.getElementById('custom-text-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  cancelModalBtn: document.getElementById('cancel-modal-btn'),
  applyCustomTextBtn: document.getElementById('apply-custom-text-btn'),
  customTextTitle: document.getElementById('custom-text-title'),
  customTextArea: document.getElementById('custom-text-area'),
  customTextStats: document.getElementById('custom-text-stats'),
  customTextError: document.getElementById('custom-text-error'),

  // PWA UI
  iosInstallModal: document.getElementById('ios-install-modal'),
  closeIosModalBtn: document.getElementById('close-ios-modal-btn'),
  offlineBanner: document.getElementById('offline-banner'),
};

// ============================================================================
// Application State
// ============================================================================

let prefs = loadPrefs();
const resultsChart = new ResultsChart(dom.resultsChartCanvas, dom.chartTooltip);
const trendChart = new TrendChart(dom.trendChartCanvas, dom.trendTooltip);
const keyboardGuide = new KeyboardGuide(dom.keyboardGrid, dom.keymapTitle);

const state = {
  activeView: 'practice',
  passageFilterLang: 'all',
  perfLayoutFilter: 'all',
  heatmapLayout: 'english',
  authTab: 'signup', // 'signup' | 'signin'
  passageIndexByLang: {
    english: 0,
    hindi: 0,
  },
  currentPassage: null,

  // Live typing session state
  status: 'idle', // 'idle' | 'running' | 'paused' | 'finished'
  tokens: [],
  tokenEls: [],
  cursorIndex: 0,
  activeStepIndex: 0,
  activeCandidates: null,
  scrollOffsetY: 0,

  // Accurate metrics & per-key hit/miss telemetry
  startTimeMs: 0,
  accumulatedMs: 0,
  elapsedSec: 0,
  totalKeystrokes: 0,
  correctKeystrokes: 0,
  errorKeystrokes: 0,
  correctTokens: 0,
  errorTokens: 0,
  intervalErrors: 0,
  wpmTimeline: [],
  sessionKeyStats: {},

  // Runtime timers & flags
  timerId: null,
  pulseTimeoutId: null,
  nudgeTimeoutId: null,
  caretRafId: null,
  isComposing: false,
  isCustomModalOpen: false,
  isAccountModalOpen: false,
};

// ============================================================================
// Formatting & Metric Helpers
// ============================================================================

function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatPracticeDuration(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  if (safe < 60) return `${safe}s`;
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function getEffectiveDurationMinutes() {
  if (prefs.isCustomTime) {
    const val = Number(prefs.customMinutes);
    return Number.isFinite(val) && val >= 1 && val <= 60 ? val : 10;
  }
  return prefs.durationMinutes === 5 ? 5 : 3;
}

function nowHighRes() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function getElapsedMs() {
  if (state.status === 'running' && state.startTimeMs) {
    return state.accumulatedMs + Math.max(0, nowHighRes() - state.startTimeMs);
  }
  return state.accumulatedMs;
}

/**
 * Real-world standard WPM & Accuracy calculation:
 * - 1 standard word = 5 keystrokes
 * - Raw WPM = (totalKeystrokes / 5) / elapsedMinutes
 * - Net WPM = (correctKeystrokes / 5) / elapsedMinutes
 * - Accuracy = (correctKeystrokes / totalKeystrokes) * 100
 *   (100% ONLY when zero mistakes; otherwise exact to 1 decimal, capped at 99.9%)
 */
function computeCurrentMetrics(overrideElapsedMs = null) {
  const rawElapsedMs = overrideElapsedMs !== null ? overrideElapsedMs : getElapsedMs();
  if (state.totalKeystrokes === 0) {
    return { netWpm: 0, rawWpm: 0, accuracy: 100 };
  }

  let accuracy;
  if (state.correctKeystrokes >= state.totalKeystrokes && state.errorTokens === 0) {
    accuracy = 100;
  } else {
    const exactAcc = (state.correctKeystrokes / state.totalKeystrokes) * 100;
    accuracy = Math.min(99.9, Number(exactAcc.toFixed(1)));
  }

  // Avoid artificial WPM spikes on the very first keystroke (t < 250ms)
  if (rawElapsedMs < 250 && state.totalKeystrokes <= 1) {
    return { netWpm: 0, rawWpm: 0, accuracy };
  }

  const minutes = Math.max(500, rawElapsedMs) / 60000;
  const netWpm = Math.round(state.correctKeystrokes / 5 / minutes);
  const rawWpm = Math.round(state.totalKeystrokes / 5 / minutes);
  return { netWpm, rawWpm, accuracy };
}

function computeConsistency(samples) {
  if (!samples || samples.length < 2) return 100;
  const vals = samples.map((s) => s.netWpm);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean <= 0) return 0;
  const variance =
    vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / vals.length;
  const cv = (Math.sqrt(variance) / mean) * 100;
  return Math.max(0, Math.min(100, Math.round(100 - cv)));
}

function formatDateShort(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateOnly(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function setSegmentedActive(container, attrName, value) {
  if (!container) return;
  const buttons = container.querySelectorAll('.seg-btn');
  buttons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset[attrName] === String(value));
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================================
// Account UI Sync
// ============================================================================

function syncAccountHeaderUI() {
  const user = getActiveUser();
  if (user) {
    dom.accountTriggerBtn.textContent = `@${user.username}`;
    dom.accountTriggerBtn.classList.remove('btn-primary');
    dom.accountTriggerBtn.classList.add('btn-secondary');
  } else {
    dom.accountTriggerBtn.textContent = 'Create Account';
    dom.accountTriggerBtn.classList.remove('btn-secondary');
    dom.accountTriggerBtn.classList.add('btn-primary');
  }
}

function reloadActiveVaultAndUI() {
  prefs = loadPrefs();
  state.heatmapLayout = prefs.layout;
  syncAccountHeaderUI();
  syncConfigUI();
  if (state.activeView === 'performance') {
    renderPerformanceDashboard();
  }
  resetSession();
}

function openAccountModal(forceAuthForm = false) {
  state.isAccountModalOpen = true;
  exitFocusMode(true);
  dom.authError.classList.add('is-hidden');

  const user = getActiveUser();
  if (user && !forceAuthForm) {
    dom.accountModalTitle.textContent = 'Account';
    dom.authFormsView.classList.add('is-hidden');
    dom.authSignedInView.classList.remove('is-hidden');
    dom.modalAvatar.textContent = getUserInitials(user.username);
    dom.modalUsername.textContent = `@${user.username}`;
    dom.modalMemberSince.textContent = `Local profile since ${formatDateOnly(user.createdAt)}`;
  } else {
    dom.accountModalTitle.textContent =
      state.authTab === 'signup' ? 'Create Local Account' : 'Sign In';
    dom.authFormsView.classList.remove('is-hidden');
    dom.authSignedInView.classList.add('is-hidden');
    syncAuthTabUI();
    window.requestAnimationFrame(() => {
      dom.authUsername.focus();
    });
  }

  dom.accountModal.classList.remove('is-hidden');
}

function syncAuthTabUI() {
  const isSignup = state.authTab === 'signup';
  setSegmentedActive(dom.authModeTabs, 'authTab', state.authTab);
  dom.accountModalTitle.textContent = isSignup ? 'Create Local Account' : 'Sign In';
  dom.authConfirmWrap.classList.toggle('is-hidden', !isSignup);
  dom.authSubmitBtn.textContent = isSignup ? 'Create Account' : 'Sign In';
  dom.authPassword.setAttribute('autocomplete', isSignup ? 'new-password' : 'current-password');
  dom.authError.classList.add('is-hidden');

  const showImport = isSignup && !getActiveUser() && hasGuestSessions();
  dom.importGuestWrap.classList.toggle('is-hidden', !showImport);
}

function closeAccountModal() {
  state.isAccountModalOpen = false;
  dom.accountModal.classList.add('is-hidden');
  dom.authPassword.value = '';
  dom.authConfirmPassword.value = '';
  if (state.activeView === 'practice' && state.status !== 'finished') {
    focusTypingStage();
  }
}

// ============================================================================
// Focus Mode & View Navigation
// ============================================================================

function enterFocusMode() {
  document.body.classList.add('is-typing-active');
  document.body.classList.toggle('has-keymap-open', prefs.showKeymap);
  scheduleCaretUpdate();
}

function exitFocusMode(pauseSession = true) {
  if (pauseSession && state.status === 'running') {
    state.accumulatedMs = getElapsedMs();
    state.startTimeMs = 0;
    state.status = 'paused';
    stopTimer();
  }
  document.body.classList.remove('is-typing-active');
  dom.focusScrim.classList.add('is-hidden');
  updateTelemetryUI();
  scheduleCaretUpdate();
}

function switchView(viewName) {
  if (!dom.views[viewName]) return;
  if (viewName !== 'practice') {
    exitFocusMode(true);
  }

  state.activeView = viewName;
  Object.entries(dom.views).forEach(([key, el]) => {
    el.classList.toggle('is-active', key === viewName);
  });
  dom.navButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.view === viewName);
  });

  if (viewName === 'passages') {
    renderPassagesLibrary();
  } else if (viewName === 'performance') {
    renderPerformanceDashboard();
  } else if (viewName === 'practice') {
    scheduleCaretUpdate();
    if (state.status !== 'finished') {
      focusTypingStage();
    }
  }
}

function syncConfigUI() {
  const layout = LAYOUTS[prefs.layout] || LAYOUTS.english;

  setSegmentedActive(dom.layoutSelector, 'layout', prefs.layout);
  setSegmentedActive(dom.textModeSelector, 'textMode', prefs.textMode || 'standard');
  setSegmentedActive(dom.modeTypeSelector, 'mode', prefs.testMode);
  setSegmentedActive(dom.soundSelector, 'sound', prefs.soundProfile);

  const isTime = prefs.testMode === 'time';
  dom.timeOptions.classList.toggle('is-hidden', !isTime);
  dom.pageOptions.classList.toggle('is-hidden', isTime);
  dom.customMinuteWrap.classList.toggle('is-hidden', !(isTime && prefs.isCustomTime));

  if (isTime) {
    setSegmentedActive(
      dom.timeOptions,
      'minutes',
      prefs.isCustomTime ? 'custom' : String(prefs.durationMinutes)
    );
    dom.customMinuteInput.value = String(prefs.customMinutes);
  } else {
    setSegmentedActive(dom.pageOptions, 'pages', String(prefs.pageCount));
  }

  dom.typingStage.classList.toggle('is-hindi', layout.isHindi);
  const modeSuffix = prefs.textMode === 'easy' ? ' · Easy' : '';
  dom.metaLayoutLabel.textContent = `${layout.name}${modeSuffix}`;

  soundEngine.setProfile(prefs.soundProfile);

  dom.keymapDrawer.classList.toggle('is-hidden', !prefs.showKeymap);
  document.body.classList.toggle('has-keymap-open', prefs.showKeymap);
  dom.navKeymapToggle.classList.toggle('is-active', prefs.showKeymap);
  dom.navKeymapToggle.setAttribute('aria-pressed', String(prefs.showKeymap));
  keyboardGuide.render(prefs.layout);
}

// ============================================================================
// Session Initialization & Stream Rendering
// ============================================================================

function ensurePassageForActiveLayout() {
  const layout = LAYOUTS[prefs.layout] || LAYOUTS.english;
  const targetLang = layout.language;

  if (state.currentPassage && state.currentPassage.language === targetLang) {
    return;
  }

  const list = getPassagesByLanguage(targetLang);
  const idx = state.passageIndexByLang[targetLang] % list.length;
  state.currentPassage = list[idx];
}

function resetSession() {
  stopTimer();
  document.body.classList.remove('is-typing-active');

  ensurePassageForActiveLayout();
  const layout = LAYOUTS[prefs.layout] || LAYOUTS.english;

  const composedText = buildSessionText(
    state.currentPassage,
    prefs.testMode,
    getEffectiveDurationMinutes(),
    prefs.pageCount,
    prefs.textMode || 'standard'
  );

  state.status = 'idle';
  state.tokens = tokenizeForLayout(composedText, prefs.layout);
  state.cursorIndex = 0;
  state.activeStepIndex = 0;
  state.activeCandidates = null;
  state.scrollOffsetY = 0;
  state.startTimeMs = 0;
  state.accumulatedMs = 0;
  state.elapsedSec = 0;
  state.totalKeystrokes = 0;
  state.correctKeystrokes = 0;
  state.errorKeystrokes = 0;
  state.correctTokens = 0;
  state.errorTokens = 0;
  state.intervalErrors = 0;
  state.wpmTimeline = [];
  state.sessionKeyStats = {};
  state.isComposing = false;

  dom.typingPanel.classList.remove('is-hidden');
  dom.resultsPanel.classList.add('is-hidden');
  dom.focusScrim.classList.add('is-hidden');
  dom.metaLockLabel.classList.remove('is-nudged');

  dom.metaPassageTitle.textContent = state.currentPassage.title;
  const modeSuffix = prefs.textMode === 'easy' && !state.currentPassage.isCustom ? ' · Easy' : '';
  dom.metaLayoutLabel.textContent = `${layout.name}${modeSuffix}`;

  renderTokenStream();
  updateTelemetryUI();
  updateNextKeyHints();
  scheduleCaretUpdate();
  focusTypingStage();
}

function renderTokenStream() {
  const frag = document.createDocumentFragment();
  state.tokenEls = new Array(state.tokens.length);

  let currentWordEl = document.createElement('span');
  currentWordEl.className = 'word-unit';

  state.tokens.forEach((tok, idx) => {
    const span = document.createElement('span');
    span.className = tok.isSpace ? 'char-token is-space' : 'char-token';
    span.textContent = tok.display;
    state.tokenEls[idx] = span;

    if (tok.isSpace) {
      if (currentWordEl.childNodes.length > 0) {
        frag.appendChild(currentWordEl);
        currentWordEl = document.createElement('span');
        currentWordEl.className = 'word-unit';
      }
      frag.appendChild(span);
    } else {
      currentWordEl.appendChild(span);
    }
  });

  if (currentWordEl.childNodes.length > 0) {
    frag.appendChild(currentWordEl);
  }

  dom.streamContent.innerHTML = '';
  dom.streamContent.style.transform = 'translate3d(0, 0, 0)';
  dom.streamContent.appendChild(frag);

  if (state.tokenEls[0]) {
    state.tokenEls[0].classList.add('is-active');
  }
}

function scheduleCaretUpdate() {
  if (state.caretRafId) window.cancelAnimationFrame(state.caretRafId);
  state.caretRafId = window.requestAnimationFrame(() => {
    state.caretRafId = null;
    updateCaret();
  });
}

function updateCaret() {
  if (state.activeView !== 'practice' || state.status === 'finished') return;
  const activeEl = state.tokenEls[state.cursorIndex];
  if (!activeEl) return;

  const contentRect = dom.streamContent.getBoundingClientRect();
  const tokenRect = activeEl.getBoundingClientRect();
  if (contentRect.width === 0) return;

  const computedLineHeight = parseFloat(getComputedStyle(dom.streamContent).lineHeight) || 54;
  const relLeft = tokenRect.left - contentRect.left;
  const relTop = tokenRect.top - contentRect.top;

  const anchorLines = document.body.classList.contains('is-typing-active') ? 1.5 : 1.05;
  if (relTop > computedLineHeight * anchorLines) {
    const desiredScroll = Math.max(0, relTop - computedLineHeight);
    if (Math.abs(desiredScroll - state.scrollOffsetY) > 4) {
      state.scrollOffsetY = desiredScroll;
      dom.streamContent.style.transform = `translate3d(0, -${state.scrollOffsetY}px, 0)`;
    }
  } else if (state.scrollOffsetY !== 0) {
    state.scrollOffsetY = 0;
    dom.streamContent.style.transform = 'translate3d(0, 0, 0)';
  }

  const caretH = Math.max(24, Math.min(40, tokenRect.height * 0.86));
  const caretY = relTop - state.scrollOffsetY + (tokenRect.height - caretH) / 2;

  dom.streamCaret.style.height = `${caretH}px`;
  dom.streamCaret.style.transform = `translate3d(${Math.max(0, relLeft - 1)}px, ${Math.max(
    0,
    caretY
  )}px, 0)`;
}

function pulseCaret() {
  dom.typingStage.classList.add('is-typing-pulse');
  if (state.pulseTimeoutId) window.clearTimeout(state.pulseTimeoutId);
  state.pulseTimeoutId = window.setTimeout(() => {
    dom.typingStage.classList.remove('is-typing-pulse');
  }, 420);
}

function updateNextKeyHints() {
  const token = state.tokens[state.cursorIndex];
  if (!token) {
    keyboardGuide.highlightTarget(null);
    dom.nextKeyReadout.textContent = 'Finished';
    dom.focusNextKey.textContent = '';
    return;
  }

  const layout = LAYOUTS[prefs.layout] || LAYOUTS.english;
  const candidate =
    state.activeCandidates && state.activeCandidates.length > 0
      ? state.activeCandidates[0]
      : token.keySeq;
  const expectedKey = candidate[state.activeStepIndex] || token.keySeq[0];
  const info = describePhysicalKey(expectedKey, prefs.layout);

  let hintText;
  if (layout.isHindi) {
    hintText =
      info.glyph === 'Space'
        ? 'अगली कुंजी: Space'
        : `अगली कुंजी: ${info.label} (${info.glyph})`;
  } else {
    hintText = `Next key: ${info.label}`;
  }

  dom.nextKeyReadout.textContent = hintText;
  dom.focusNextKey.textContent = layout.isHindi ? `${layout.shortName} · ${hintText}` : '';
  keyboardGuide.highlightTarget(info);
}

function updateTelemetryUI() {
  const { netWpm, accuracy } = computeCurrentMetrics();

  dom.liveWpm.textContent = String(netWpm);
  dom.liveAccuracy.textContent = `${accuracy}%`;
  dom.liveMistakes.textContent = String(state.errorTokens);
  dom.liveMistakes.classList.toggle('has-errors', state.errorTokens > 0);

  if (prefs.testMode === 'time') {
    const totalSec = getEffectiveDurationMinutes() * 60;
    const remaining = Math.max(0, totalSec - state.elapsedSec);
    dom.liveProgressLabel.textContent = 'Time Left';
    dom.liveProgress.textContent = formatClock(remaining);
    const pct = totalSec > 0 ? Math.min(100, (state.elapsedSec / totalSec) * 100) : 0;
    dom.progressFill.style.width = `${pct.toFixed(1)}%`;
  } else {
    const totalTokens = Math.max(1, state.tokens.length);
    const pct = Math.min(100, (state.cursorIndex / totalTokens) * 100);
    const currentPage = Math.min(
      prefs.pageCount,
      Math.floor((state.cursorIndex / totalTokens) * prefs.pageCount) + 1
    );
    dom.liveProgressLabel.textContent = `Page ${currentPage} / ${prefs.pageCount}`;
    dom.liveProgress.textContent = `${Math.round(pct)}%`;
    dom.progressFill.style.width = `${pct.toFixed(1)}%`;
  }

  const statusSpan = dom.stageHint.querySelector('span');
  if (statusSpan) {
    if (state.status === 'paused') {
      statusSpan.textContent = 'Paused — type to resume focus mode';
    } else if (state.status === 'idle') {
      statusSpan.textContent = 'Start typing to enter focus mode';
    } else if (state.status === 'running') {
      const completedWords = Math.floor(state.correctKeystrokes / 5);
      statusSpan.textContent =
        prefs.testMode === 'pages'
          ? `${completedWords} / ${prefs.pageCount * WORDS_PER_PAGE} words`
          : `Elapsed ${formatClock(state.elapsedSec)}`;
    }
  }
}

// ============================================================================
// Timer & Session Completion
// ============================================================================

function startOrResumeSession() {
  if (state.status === 'running') return;
  state.status = 'running';
  state.startTimeMs = nowHighRes();
  enterFocusMode();

  stopTimer();
  state.timerId = window.setInterval(() => {
    if (state.status !== 'running') return;

    const elapsedMs = getElapsedMs();
    const wholeSec = Math.floor(elapsedMs / 1000);

    // Record exact 1-second timeline samples without drift
    while (state.elapsedSec < wholeSec) {
      state.elapsedSec += 1;
      const sampleMs = state.elapsedSec * 1000;
      const { netWpm, rawWpm } = computeCurrentMetrics(sampleMs);
      state.wpmTimeline.push({
        second: state.elapsedSec,
        netWpm,
        rawWpm,
        errors: state.intervalErrors,
      });
      state.intervalErrors = 0;
    }

    updateTelemetryUI();

    if (prefs.testMode === 'time') {
      const targetSec = getEffectiveDurationMinutes() * 60;
      if (elapsedMs >= targetSec * 1000) {
        finishSession(targetSec * 1000);
      }
    }
  }, 250);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function finishSession(exactTargetMs = null) {
  if (state.status === 'finished') return;
  const rawElapsedMs = getElapsedMs();
  state.accumulatedMs = exactTargetMs !== null ? exactTargetMs : rawElapsedMs;
  state.startTimeMs = 0;
  stopTimer();
  state.status = 'finished';
  document.body.classList.remove('is-typing-active');

  const elapsedSecExact = Math.max(1, Math.round(state.accumulatedMs / 1000));
  const { netWpm, rawWpm, accuracy } = computeCurrentMetrics(state.accumulatedMs);

  if (
    state.wpmTimeline.length === 0 ||
    state.wpmTimeline[state.wpmTimeline.length - 1].second < elapsedSecExact
  ) {
    state.wpmTimeline.push({
      second: elapsedSecExact,
      netWpm,
      rawWpm,
      errors: state.intervalErrors,
    });
    state.intervalErrors = 0;
  }

  const consistency = computeConsistency(state.wpmTimeline);
  const layout = LAYOUTS[prefs.layout] || LAYOUTS.english;
  const modeLabel =
    prefs.testMode === 'time'
      ? `${getEffectiveDurationMinutes()} min`
      : `${prefs.pageCount} ${prefs.pageCount === 1 ? 'Page' : 'Pages'}`;

  const { isNewPB } = recordSession(
    {
      layout: prefs.layout,
      layoutName: layout.shortName,
      testMode: prefs.testMode,
      targetLabel: modeLabel,
      passageTitle: state.currentPassage.title,
      netWpm,
      rawWpm,
      accuracy,
      correctChars: state.correctTokens,
      errorChars: state.errorTokens,
      totalChars: state.correctTokens + state.errorTokens,
      correctKeystrokes: state.correctKeystrokes,
      totalKeystrokes: state.totalKeystrokes,
      durationSec: elapsedSecExact,
      consistency,
    },
    state.sessionKeyStats
  );

  // Render Results Panel safely using textContent
  dom.resultsSubtitle.textContent = '';
  const parts = [layout.name, modeLabel, state.currentPassage.title];
  parts.forEach((part, idx) => {
    const sp = document.createElement('span');
    sp.textContent = part;
    dom.resultsSubtitle.appendChild(sp);
    if (idx < parts.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'meta-sep';
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = '·';
      dom.resultsSubtitle.appendChild(sep);
    }
  });

  dom.resultsPbCallout.classList.toggle('is-hidden', !isNewPB || netWpm <= 0);
  dom.resNetWpm.textContent = String(netWpm);
  dom.resRawWpm.textContent = `Raw ${rawWpm} WPM`;
  dom.resAccuracy.textContent = `${accuracy}%`;
  dom.resAccStatus.textContent =
    accuracy >= 96 ? 'High precision' : accuracy >= 90 ? 'Steady accuracy' : 'Focus on accuracy';
  dom.resCharsTotal.textContent = String(state.correctTokens + state.errorTokens);
  dom.resCharsBreakdown.textContent = `${state.correctTokens} right · ${state.errorTokens} wrong`;
  dom.resDuration.textContent = formatClock(elapsedSecExact);
  dom.resConsistency.textContent = `Consistency ${consistency}%`;

  dom.typingPanel.classList.add('is-hidden');
  dom.resultsPanel.classList.remove('is-hidden');

  window.requestAnimationFrame(() => {
    resultsChart.render(state.wpmTimeline);
  });
}

// ============================================================================
// Core Typing Input Pipeline & Per-Key Telemetry
// ============================================================================

function recordTokenKeyTelemetry(token, isCorrect) {
  if (!token || !token.display) return;
  const layout = LAYOUTS[prefs.layout] || LAYOUTS.english;
  const charKey = layout.isHindi ? token.display : token.display.toLowerCase();
  if (!state.sessionKeyStats[charKey]) {
    state.sessionKeyStats[charKey] = { hits: 0, misses: 0 };
  }
  if (isCorrect) {
    state.sessionKeyStats[charKey].hits += 1;
  } else {
    state.sessionKeyStats[charKey].misses += 1;
  }
}

function nudgeNoBackspaceNotice() {
  soundEngine.play('locked');
  dom.metaLockLabel.classList.remove('is-nudged');
  void dom.metaLockLabel.offsetWidth;
  dom.metaLockLabel.classList.add('is-nudged');
  if (state.nudgeTimeoutId) window.clearTimeout(state.nudgeTimeoutId);
  state.nudgeTimeoutId = window.setTimeout(() => {
    dom.metaLockLabel.classList.remove('is-nudged');
  }, 650);
}

function advanceToken(outcome) {
  const el = state.tokenEls[state.cursorIndex];
  const token = state.tokens[state.cursorIndex];
  if (el && token) {
    el.classList.remove('is-active', 'is-partial');
    if (outcome === 'correct') {
      token.state = 'correct';
      el.classList.add('is-correct');
      state.correctTokens += 1;
      recordTokenKeyTelemetry(token, true);
    } else {
      token.state = 'error';
      el.classList.add('is-error');
      state.errorTokens += 1;
      recordTokenKeyTelemetry(token, false);
    }
  }

  state.cursorIndex += 1;
  state.activeStepIndex = 0;
  state.activeCandidates = null;

  if (state.cursorIndex >= state.tokens.length) {
    updateTelemetryUI();
    finishSession();
    return;
  }

  const nextEl = state.tokenEls[state.cursorIndex];
  if (nextEl) nextEl.classList.add('is-active');

  scheduleCaretUpdate();
  updateNextKeyHints();
  updateTelemetryUI();
}

function processMapperKey(eventKey) {
  if (state.status === 'finished' || state.cursorIndex >= state.tokens.length) return;

  startOrResumeSession();
  pulseCaret();
  keyboardGuide.flashKey(eventKey);

  const token = state.tokens[state.cursorIndex];
  const candidates =
    state.activeCandidates || [token.keySeq, ...(token.altKeySeqs || [])];

  const matching = candidates.filter(
    (seq) => seq[state.activeStepIndex] === eventKey
  );

  state.totalKeystrokes += 1;

  if (matching.length > 0) {
    state.correctKeystrokes += 1;
    soundEngine.play(token.isSpace ? 'space' : 'normal');

    const completed = matching.some(
      (seq) => seq.length === state.activeStepIndex + 1
    );

    if (completed) {
      advanceToken('correct');
    } else {
      state.activeCandidates = matching;
      state.activeStepIndex += 1;
      const el = state.tokenEls[state.cursorIndex];
      if (el) el.classList.add('is-partial');
      updateNextKeyHints();
      updateTelemetryUI();
    }
  } else {
    state.errorKeystrokes += 1;
    state.intervalErrors += 1;
    soundEngine.play('error');
    advanceToken('error');
  }
}

function processUnicodeChar(ch) {
  if (state.status === 'finished' || state.cursorIndex >= state.tokens.length) return;

  startOrResumeSession();
  pulseCaret();

  const token = state.tokens[state.cursorIndex];
  const expected = token.unicodeSeq[state.activeStepIndex];

  state.totalKeystrokes += 1;

  if (ch === expected) {
    state.correctKeystrokes += 1;
    soundEngine.play(token.isSpace ? 'space' : 'normal');

    if (state.activeStepIndex + 1 >= token.unicodeSeq.length) {
      advanceToken('correct');
    } else {
      state.activeStepIndex += 1;
      const el = state.tokenEls[state.cursorIndex];
      if (el) el.classList.add('is-partial');
      updateNextKeyHints();
      updateTelemetryUI();
    }
  } else {
    state.errorKeystrokes += 1;
    state.intervalErrors += 1;
    soundEngine.play('error');
    advanceToken('error');
  }
}

// ============================================================================
// Focus Management & Seamless Hybrid Input Listeners
// ============================================================================

function focusTypingStage() {
  if (
    state.activeView !== 'practice' ||
    state.isCustomModalOpen ||
    state.isAccountModalOpen ||
    state.status === 'finished'
  ) {
    return;
  }
  dom.focusScrim.classList.add('is-hidden');
  dom.typingStage.classList.add('is-focused');
  dom.typingStage.focus({ preventScroll: true });
}

function isTypingContextBlocked(target) {
  if (
    state.isCustomModalOpen ||
    state.isAccountModalOpen ||
    state.activeView !== 'practice' ||
    state.status === 'finished'
  ) {
    return true;
  }
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  return false;
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.isAccountModalOpen) {
      closeAccountModal();
      return;
    }
    if (state.isCustomModalOpen) {
      closeCustomTextModal();
      return;
    }
    if (!dom.iosInstallModal.classList.contains('is-hidden')) {
      dom.iosInstallModal.classList.add('is-hidden');
      return;
    }
    if (state.activeView === 'practice' && document.body.classList.contains('is-typing-active')) {
      e.preventDefault();
      exitFocusMode(true);
      return;
    }
  }

  if (isTypingContextBlocked(e.target)) return;

  if (e.key === 'Tab') {
    e.preventDefault();
    resetSession();
    return;
  }

  // Strictly block Backspace, Delete, and Arrow navigation (no fixing mistakes!)
  if (
    e.key === 'Backspace' ||
    e.key === 'Delete' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight' ||
    e.key === 'ArrowUp' ||
    e.key === 'ArrowDown'
  ) {
    e.preventDefault();
    if (state.status === 'running') {
      nudgeNoBackspaceNotice();
    }
    return;
  }

  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.isComposing || e.key === 'Process') return;
  if (e.key.length !== 1) return;

  if (e.key === ' ') {
    e.preventDefault();
  }

  dom.focusScrim.classList.add('is-hidden');

  const layout = LAYOUTS[prefs.layout] || LAYOUTS.english;
  if (layout.isHindi && /[\u0900-\u097F]/.test(e.key)) {
    processUnicodeChar(e.key.normalize('NFC'));
  } else {
    processMapperKey(e.key);
  }
});

dom.imeCapture.addEventListener('compositionstart', () => {
  state.isComposing = true;
});

dom.imeCapture.addEventListener('compositionend', (e) => {
  state.isComposing = false;
  const text = (e.data || dom.imeCapture.value || '').normalize('NFC');
  dom.imeCapture.value = '';
  if (!text) return;
  for (const ch of Array.from(text)) {
    processUnicodeChar(ch);
  }
});

dom.typingStage.addEventListener('click', () => {
  focusTypingStage();
});

dom.focusScrim.addEventListener('click', (e) => {
  e.stopPropagation();
  focusTypingStage();
});

window.addEventListener('blur', () => {
  if (
    state.status === 'running' &&
    state.activeView === 'practice' &&
    !state.isCustomModalOpen &&
    !state.isAccountModalOpen
  ) {
    dom.focusScrim.classList.remove('is-hidden');
    dom.typingStage.classList.remove('is-focused');
  }
});

window.addEventListener('resize', () => {
  if (state.activeView === 'practice' && state.status !== 'finished') {
    scheduleCaretUpdate();
  }
});

// ============================================================================
// Passages Library View
// ============================================================================

function renderPassagesLibrary() {
  const filter = state.passageFilterLang;
  const list =
    filter === 'all' ? PASSAGES : PASSAGES.filter((p) => p.language === filter);

  dom.passagesGrid.innerHTML = '';

  for (const passage of list) {
    const wordCount = passage.text.trim().split(/\s+/).length;
    const isHindi = passage.language === 'hindi';

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'passage-card';

    card.innerHTML = `
      <div>
        <div class="passage-card-title">${escapeHtml(passage.title)}</div>
        <div class="passage-card-meta">
          <span>${isHindi ? 'हिन्दी (मंगल / कृति देव)' : 'English'}</span>
          <span aria-hidden="true">&middot;</span>
          <span>${escapeHtml(passage.category)}</span>
          <span aria-hidden="true">&middot;</span>
          <span class="tabular-nums">${wordCount} words</span>
        </div>
      </div>
      <p class="passage-card-preview${isHindi ? ' is-hindi' : ''}">${escapeHtml(passage.text)}</p>
      <div class="passage-card-footer">
        <span>Auto-scales to selected minutes or pages</span>
        <span class="passage-card-cta">Load Passage</span>
      </div>
    `;

    card.addEventListener('click', () => {
      state.currentPassage = passage;
      const currentLayout = LAYOUTS[prefs.layout] || LAYOUTS.english;
      if (passage.language === 'hindi' && !currentLayout.isHindi) {
        prefs.layout = 'mangal';
        savePrefs(prefs);
        syncConfigUI();
      } else if (passage.language === 'english' && currentLayout.isHindi) {
        prefs.layout = 'english';
        savePrefs(prefs);
        syncConfigUI();
      }
      switchView('practice');
      resetSession();
    });

    dom.passagesGrid.appendChild(card);
  }
}

// ============================================================================
// Unified Performance Dashboard View
// ============================================================================

function renderPerformanceDashboard() {
  const user = getActiveUser();
  const allHistory = loadHistory();
  const allKeyStats = loadKeyStats();

  // 1. Profile Header
  if (user) {
    dom.profileAvatar.textContent = getUserInitials(user.username);
    dom.profileUsername.textContent = `@${user.username}`;
    dom.profileMemberMeta.textContent = `Local profile since ${formatDateOnly(user.createdAt)}`;
    dom.profileAccountBtn.textContent = 'Manage Account';
  } else {
    dom.profileAvatar.textContent = 'G';
    dom.profileUsername.textContent = 'Guest Profile';
    dom.profileMemberMeta.textContent = 'Sign in or create a local account to isolate your progress';
    dom.profileAccountBtn.textContent = 'Create Account';
  }

  const allMetrics = computeDashboardMetrics(allHistory, 'all');
  dom.profileSummaryLine.textContent =
    `${allMetrics.totalTests} ${allMetrics.totalTests === 1 ? 'test' : 'tests'} · ` +
    `${formatPracticeDuration(allMetrics.totalDurationSec)} practiced · ` +
    `${allMetrics.streakDays}-day streak`;

  // 2. Scoped Mathematical Averages
  setSegmentedActive(dom.perfLayoutFilter, 'perfLayout', state.perfLayoutFilter);
  const metrics = computeDashboardMetrics(allHistory, state.perfLayoutFilter);

  dom.perfAvgWpm.textContent = metrics.weightedAvgWpm.toFixed(1);
  dom.perfWpmDelta.classList.remove('is-positive', 'is-negative');
  if (metrics.recentDeltaWpm !== null) {
    const sign = metrics.recentDeltaWpm >= 0 ? '+' : '';
    dom.perfWpmDelta.textContent = `Best ${metrics.bestWpm} · Recent ${sign}${metrics.recentDeltaWpm} vs avg`;
    if (metrics.recentDeltaWpm > 0) dom.perfWpmDelta.classList.add('is-positive');
    if (metrics.recentDeltaWpm < 0) dom.perfWpmDelta.classList.add('is-negative');
  } else {
    dom.perfWpmDelta.textContent = `Best ${metrics.bestWpm} WPM`;
  }

  dom.perfAvgAcc.textContent = `${metrics.weightedAccuracy.toFixed(1)}%`;
  const totalEvaluated = metrics.totalRightChars + metrics.totalWrongChars;
  dom.perfAccSub.textContent =
    totalEvaluated > 0
      ? `Weighted across ${totalEvaluated.toLocaleString()} chars`
      : 'Complete a test to calculate';

  dom.perfRightWrong.textContent = `${metrics.totalRightChars.toLocaleString()} / ${metrics.totalWrongChars.toLocaleString()}`;
  const rightPct =
    totalEvaluated > 0 ? Math.round((metrics.totalRightChars / totalEvaluated) * 100) : 0;
  const wrongPct = totalEvaluated > 0 ? 100 - rightPct : 0;
  dom.perfRatioRight.style.width = `${rightPct}%`;
  dom.perfRatioWrong.style.width = `${wrongPct}%`;
  dom.perfRwSub.textContent = `${rightPct}% right · ${wrongPct}% wrong`;

  dom.perfTestsCount.textContent = String(metrics.totalTests);
  dom.perfStreakSub.textContent = `${metrics.streakDays}-day streak · ${metrics.totalWordsTyped.toLocaleString()} words`;

  // 3. All-Time WPM & Accuracy Trend Chart
  window.requestAnimationFrame(() => {
    trendChart.render(metrics.trendSeries);
  });

  // 4. Weak Keys Heatmap & Ranked Weak List
  if (state.perfLayoutFilter !== 'all') {
    state.heatmapLayout = state.perfLayoutFilter;
  }
  renderWeakKeysSection(allKeyStats);

  // 5. Achievements Grid
  const achievements = evaluateAchievements(allHistory);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  dom.achievementsSummary.textContent = `${unlockedCount} of ${achievements.length} unlocked`;
  dom.achievementsGrid.innerHTML = '';

  for (const ach of achievements) {
    const card = document.createElement('div');
    card.className = `ach-card${ach.unlocked ? ' is-unlocked' : ''}`;
    card.innerHTML = `
      <div class="ach-top">
        <span class="ach-title">${escapeHtml(ach.title)}</span>
        <span class="ach-status">${escapeHtml(ach.progressLabel)}</span>
      </div>
      <div class="ach-desc">${escapeHtml(ach.description)}</div>
      <div class="ach-bar" aria-hidden="true">
        <div class="ach-bar-fill" style="width: ${ach.progressPct}%"></div>
      </div>
    `;
    dom.achievementsGrid.appendChild(card);
  }

  // 6. Personal Bests Strip
  dom.pbGrid.innerHTML = '';
  for (const layout of Object.values(LAYOUTS)) {
    const best = getPersonalBestForLayout(allHistory, layout.id);
    const cell = document.createElement('div');
    cell.className = 'pb-cell';
    cell.innerHTML = `
      <span class="pb-layout">${escapeHtml(layout.name)}</span>
      <span class="pb-score tabular-nums">${best ? `${best.netWpm} WPM` : '—'}</span>
      <span class="pb-meta">${
        best
          ? `${best.accuracy}% accuracy &middot; ${escapeHtml(best.targetLabel)}`
          : 'No sessions yet'
      }</span>
    `;
    dom.pbGrid.appendChild(cell);
  }

  // 7. Complete Session History Table
  const filtered =
    state.perfLayoutFilter === 'all'
      ? allHistory
      : allHistory.filter((s) => s.layout === state.perfLayoutFilter);

  const hasRows = filtered.length > 0;
  dom.historyTableWrap.classList.toggle('is-hidden', !hasRows);
  dom.historyEmpty.classList.toggle('is-hidden', hasRows);
  dom.clearHistoryBtn.classList.toggle('is-hidden', allHistory.length === 0);

  if (!hasRows) return;

  dom.historyTbody.innerHTML = '';
  for (const item of filtered) {
    const layoutObj = LAYOUTS[item.layout];
    const layoutLabel = layoutObj ? layoutObj.shortName : item.layoutName || item.layout;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="tabular-nums">${escapeHtml(formatDateShort(item.timestamp))}</td>
      <td>${escapeHtml(layoutLabel)}</td>
      <td>${escapeHtml(item.targetLabel || '')}</td>
      <td class="cell-truncate" title="${escapeHtml(item.passageTitle || '')}">${escapeHtml(
        item.passageTitle || 'Custom Passage'
      )}</td>
      <td class="num-col cell-strong">${item.netWpm}</td>
      <td class="num-col">${item.accuracy}%</td>
      <td class="num-col"><span class="cell-right">${item.correctChars ?? 0}</span> / <span class="${
        item.errorChars > 0 ? 'cell-error' : ''
      }">${item.errorChars ?? 0}</span></td>
      <td class="action-col">
        <button type="button" class="row-delete-btn" data-delete-id="${escapeHtml(
          item.id
        )}" aria-label="Delete session">Remove</button>
      </td>
    `;
    dom.historyTbody.appendChild(tr);
  }
}

function renderWeakKeysSection(allKeyStats) {
  const layoutId = state.heatmapLayout;
  const layout = LAYOUTS[layoutId] || LAYOUTS.english;
  setSegmentedActive(dom.heatmapLayoutSelector, 'heatLayout', layoutId);

  const report = computeWeakKeyReport(allKeyStats, layoutId);

  dom.heatmapHoverDetail.textContent = report.hasData
    ? `Showing ${layout.name} mistake rates. Hover any key for exact counts.`
    : `Complete a ${layout.name} typing test to populate your weak-key heatmap.`;

  renderWeakKeyHeatmap(
    dom.heatmapKeyboardGrid,
    layoutId,
    report.byPhysicalKey,
    dom.heatmapHoverDetail
  );

  dom.weakKeysList.innerHTML = '';
  if (report.weakestChars.length === 0) {
    const note = document.createElement('p');
    note.className = 'weak-empty-note';
    note.textContent = report.hasData
      ? 'Zero mistakes recorded on this layout so far. Keep pushing your speed!'
      : 'No mistake data yet for this layout. Finish a session to see exactly which keys slow you down.';
    dom.weakKeysList.appendChild(note);
    return;
  }

  for (const item of report.weakestChars) {
    const row = document.createElement('div');
    row.className = 'weak-row';
    row.innerHTML = `
      <div class="weak-row-left">
        <span class="weak-glyph">${escapeHtml(item.displayChar)}</span>
        <div class="weak-key-meta">
          <span class="weak-key-name">Key: ${escapeHtml(item.keyLabel)}</span>
          <span class="weak-key-counts tabular-nums">${item.misses} wrong / ${item.total} total</span>
        </div>
      </div>
      <span class="weak-err-rate tabular-nums">${item.errorRate}% err</span>
    `;
    dom.weakKeysList.appendChild(row);
  }
}

function launchWeakKeysDrill() {
  const layoutId = state.heatmapLayout;
  const allKeyStats = loadKeyStats();
  const report = computeWeakKeyReport(allKeyStats, layoutId);
  const drillPassage = buildWeakKeysDrill(report.weakestChars, layoutId);

  prefs.layout = layoutId;
  savePrefs(prefs);
  syncConfigUI();

  state.currentPassage = drillPassage;
  switchView('practice');
  resetSession();
}

// ============================================================================
// Custom Text Modal
// ============================================================================

function openCustomTextModal() {
  state.isCustomModalOpen = true;
  exitFocusMode(true);
  dom.customTextError.classList.add('is-hidden');
  dom.customTextModal.classList.remove('is-hidden');
  updateCustomTextStats();
  window.requestAnimationFrame(() => {
    dom.customTextArea.focus();
  });
}

function closeCustomTextModal() {
  state.isCustomModalOpen = false;
  dom.customTextModal.classList.add('is-hidden');
  if (state.activeView === 'practice' && state.status !== 'finished') {
    focusTypingStage();
  }
}

function updateCustomTextStats() {
  const raw = dom.customTextArea.value.trim();
  const words = raw ? raw.split(/\s+/).length : 0;
  const chars = raw.length;
  dom.customTextStats.textContent = `${words} words · ${chars} chars`;
}

function applyCustomText() {
  const raw = dom.customTextArea.value.replace(/\s+/g, ' ').trim();
  if (raw.length < 15) {
    dom.customTextError.classList.remove('is-hidden');
    return;
  }

  const hasDevanagari = /[\u0900-\u097F]/.test(raw);
  const detectedLang = hasDevanagari ? 'hindi' : 'english';
  const title = dom.customTextTitle.value.trim() || 'Custom Practice Text';

  state.currentPassage = {
    id: `custom-${Date.now()}`,
    language: detectedLang,
    category: 'Custom',
    title,
    text: raw,
    isCustom: true,
  };

  const currentLayout = LAYOUTS[prefs.layout] || LAYOUTS.english;
  if (detectedLang === 'hindi' && !currentLayout.isHindi) {
    prefs.layout = 'mangal';
    savePrefs(prefs);
    syncConfigUI();
  } else if (detectedLang === 'english' && currentLayout.isHindi) {
    prefs.layout = 'english';
    savePrefs(prefs);
    syncConfigUI();
  }

  closeCustomTextModal();
  switchView('practice');
  resetSession();
}

// ============================================================================
// Wire UI Event Handlers
// ============================================================================

function bindEvents() {
  dom.brandHome.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('practice');
  });

  dom.navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  dom.navKeymapToggle.addEventListener('click', () => {
    prefs.showKeymap = !prefs.showKeymap;
    savePrefs(prefs);
    syncConfigUI();
    updateNextKeyHints();
    scheduleCaretUpdate();
    if (state.activeView !== 'practice') {
      switchView('practice');
    } else {
      focusTypingStage();
    }
  });

  dom.closeKeymapBtn.addEventListener('click', () => {
    prefs.showKeymap = false;
    savePrefs(prefs);
    syncConfigUI();
    scheduleCaretUpdate();
    focusTypingStage();
  });

  // Account Modal Controls
  dom.accountTriggerBtn.addEventListener('click', () => openAccountModal(false));
  dom.profileAccountBtn.addEventListener('click', () => openAccountModal(false));
  dom.closeAccountModalBtn.addEventListener('click', closeAccountModal);
  dom.accountModal.addEventListener('click', (e) => {
    if (e.target === dom.accountModal) closeAccountModal();
  });

  dom.authModeTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || !btn.dataset.authTab) return;
    state.authTab = btn.dataset.authTab;
    syncAuthTabUI();
  });

  dom.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    dom.authError.classList.add('is-hidden');

    const username = dom.authUsername.value.trim();
    const password = dom.authPassword.value;

    dom.authSubmitBtn.disabled = true;
    try {
      if (state.authTab === 'signup') {
        const confirmPass = dom.authConfirmPassword.value;
        if (password !== confirmPass) {
          dom.authError.textContent = 'Passwords do not match.';
          dom.authError.classList.remove('is-hidden');
          return;
        }
        const shouldImportGuest =
          !dom.importGuestWrap.classList.contains('is-hidden') &&
          dom.importGuestCheckbox.checked;

        const res = await createAccount({ username, password });
        if (!res.ok) {
          dom.authError.textContent = res.error;
          dom.authError.classList.remove('is-hidden');
          return;
        }
        if (shouldImportGuest) {
          importGuestDataIntoActiveVault();
        }
        dom.authUsername.value = '';
        dom.authPassword.value = '';
        dom.authConfirmPassword.value = '';
        closeAccountModal();
        reloadActiveVaultAndUI();
      } else {
        const res = await signIn({ username, password });
        if (!res.ok) {
          dom.authError.textContent = res.error;
          dom.authError.classList.remove('is-hidden');
          return;
        }
        dom.authUsername.value = '';
        dom.authPassword.value = '';
        closeAccountModal();
        reloadActiveVaultAndUI();
      }
    } finally {
      dom.authSubmitBtn.disabled = false;
    }
  });

  dom.modalGoPerformanceBtn.addEventListener('click', () => {
    closeAccountModal();
    switchView('performance');
  });

  dom.modalSwitchAccountBtn.addEventListener('click', () => {
    state.authTab = 'signin';
    openAccountModal(true);
  });

  dom.modalSignOutBtn.addEventListener('click', () => {
    signOut();
    closeAccountModal();
    reloadActiveVaultAndUI();
  });

  // Layout Selector (English, मंगल, कृति देव)
  dom.layoutSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || !btn.dataset.layout) return;
    prefs.layout = btn.dataset.layout;
    state.heatmapLayout = prefs.layout;
    savePrefs(prefs);
    syncConfigUI();
    resetSession();
  });

  // Text Difficulty Selector (Standard: Capitals/Numbers/Symbols vs Easy: Small letters only)
  if (dom.textModeSelector) {
    dom.textModeSelector.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn || !btn.dataset.textMode) return;
      prefs.textMode = btn.dataset.textMode === 'easy' ? 'easy' : 'standard';
      savePrefs(prefs);
      syncConfigUI();
      resetSession();
    });
  }

  // Mode Type Selector (Time vs Pages)
  dom.modeTypeSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || !btn.dataset.mode) return;
    prefs.testMode = btn.dataset.mode;
    savePrefs(prefs);
    syncConfigUI();
    resetSession();
  });

  // Time Options (3m, 5m, Custom)
  dom.timeOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || !btn.dataset.minutes) return;
    const val = btn.dataset.minutes;
    if (val === 'custom') {
      prefs.isCustomTime = true;
      savePrefs(prefs);
      syncConfigUI();
      resetSession();
      dom.customMinuteInput.focus();
      dom.customMinuteInput.select();
    } else {
      prefs.isCustomTime = false;
      prefs.durationMinutes = Number(val);
      savePrefs(prefs);
      syncConfigUI();
      resetSession();
    }
  });

  dom.customMinuteInput.addEventListener('change', () => {
    const parsed = Math.max(1, Math.min(60, Math.round(Number(dom.customMinuteInput.value) || 10)));
    prefs.customMinutes = parsed;
    dom.customMinuteInput.value = String(parsed);
    savePrefs(prefs);
    resetSession();
  });

  dom.customMinuteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      dom.customMinuteInput.blur();
      focusTypingStage();
    }
  });

  // Page Options (1, 2, 3 Pages)
  dom.pageOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || !btn.dataset.pages) return;
    prefs.pageCount = Number(btn.dataset.pages);
    savePrefs(prefs);
    syncConfigUI();
    resetSession();
  });

  // Sound Profile (Mech, Soft, Off)
  dom.soundSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || !btn.dataset.sound) return;
    prefs.soundProfile = btn.dataset.sound;
    savePrefs(prefs);
    syncConfigUI();
    soundEngine.play('normal');
    focusTypingStage();
  });

  // Stage & Focus Controls
  dom.btnRestart.addEventListener('click', resetSession);
  dom.btnFocusRestart.addEventListener('click', resetSession);
  dom.btnExitFocus.addEventListener('click', () => {
    exitFocusMode(true);
    focusTypingStage();
  });
  dom.btnNextPassage.addEventListener('click', loadNextPassage);

  // Results Actions
  dom.resRetryBtn.addEventListener('click', resetSession);
  dom.resNextBtn.addEventListener('click', loadNextPassage);
  dom.resPerformanceBtn.addEventListener('click', () => switchView('performance'));

  // Passages Filter & Custom Text
  dom.passageFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || !btn.dataset.langFilter) return;
    state.passageFilterLang = btn.dataset.langFilter;
    setSegmentedActive(dom.passageFilter, 'langFilter', state.passageFilterLang);
    renderPassagesLibrary();
  });

  dom.passagesCustomBtn.addEventListener('click', openCustomTextModal);

  // Performance Dashboard Controls
  dom.perfLayoutFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || !btn.dataset.perfLayout) return;
    state.perfLayoutFilter = btn.dataset.perfLayout;
    renderPerformanceDashboard();
  });

  dom.heatmapLayoutSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || !btn.dataset.heatLayout) return;
    state.heatmapLayout = btn.dataset.heatLayout;
    renderWeakKeysSection(loadKeyStats());
  });

  dom.practiceWeakKeysBtn.addEventListener('click', launchWeakKeysDrill);

  dom.historyTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.row-delete-btn');
    if (!btn || !btn.dataset.deleteId) return;
    deleteSession(btn.dataset.deleteId);
    renderPerformanceDashboard();
  });

  dom.clearHistoryBtn.addEventListener('click', () => {
    clearHistory();
    renderPerformanceDashboard();
  });

  dom.emptyStartBtn.addEventListener('click', () => {
    switchView('practice');
    resetSession();
  });

  // Custom Text Modal
  dom.openCustomTextBtn.addEventListener('click', openCustomTextModal);
  dom.closeModalBtn.addEventListener('click', closeCustomTextModal);
  dom.cancelModalBtn.addEventListener('click', closeCustomTextModal);
  dom.applyCustomTextBtn.addEventListener('click', applyCustomText);
  dom.customTextArea.addEventListener('input', () => {
    dom.customTextError.classList.add('is-hidden');
    updateCustomTextStats();
  });
  dom.customTextModal.addEventListener('click', (e) => {
    if (e.target === dom.customTextModal) {
      closeCustomTextModal();
    }
  });
}

function loadNextPassage() {
  const layout = LAYOUTS[prefs.layout] || LAYOUTS.english;
  const list = getPassagesByLanguage(layout.language);
  state.passageIndexByLang[layout.language] =
    (state.passageIndexByLang[layout.language] + 1) % list.length;
  state.currentPassage = list[state.passageIndexByLang[layout.language]];
  resetSession();
}

// ============================================================================
// Bootstrap
// ============================================================================

function init() {
  bindEvents();
  syncAccountHeaderUI();
  state.heatmapLayout = prefs.layout;
  syncConfigUI();
  resetSession();

  // Request durable browser storage & restore from IndexedDB backup if localStorage was ever empty
  hydratePersistentAuthAndStorage().then((restored) => {
    if (restored) {
      reloadActiveUserVault();
    }
  });

  initPWA({
    installBtn: dom.pwaInstallBtn,
    iosModal: dom.iosInstallModal,
    iosCloseBtn: dom.closeIosModalBtn,
    offlineBanner: dom.offlineBanner,
  });
}

init();
