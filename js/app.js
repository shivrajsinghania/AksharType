/**
 * AksharType — Main Application Controller (100% Pure Vanilla ES JavaScript)
 * Real-time inline typing engine for English, Hindi मंगल (Mangal), and कृति देव (Kruti Dev 010).
 * Automatically handles both built-in Hindi key mapping and native OS Hindi keyboard input,
 * and enters full-screen focus mode while typing.
 */

import { LAYOUTS, tokenizeForLayout, describePhysicalKey } from './keymaps.js';
import { PASSAGES, WORDS_PER_PAGE, getPassagesByLanguage, buildSessionText } from './passages.js';
import { soundEngine } from './sound.js';
import {
  loadPrefs,
  savePrefs,
  loadHistory,
  recordSession,
  deleteSession,
  clearHistory,
  getPersonalBestForLayout,
} from './storage.js';
import { ResultsChart } from './chart.js';
import { KeyboardGuide } from './keyboard-ui.js';

// ============================================================================
// DOM References
// ============================================================================

const dom = {
  // Navigation & Views
  brandHome: document.getElementById('brand-home'),
  navButtons: document.querySelectorAll('.nav-link[data-view]'),
  navKeymapToggle: document.getElementById('nav-keymap-toggle'),
  views: {
    practice: document.getElementById('view-practice'),
    passages: document.getElementById('view-passages'),
    history: document.getElementById('view-history'),
  },

  // Config Bar
  layoutSelector: document.getElementById('layout-selector'),
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
  resHistoryBtn: document.getElementById('res-history-btn'),

  // Passages Library
  passageFilter: document.getElementById('passage-filter'),
  passagesGrid: document.getElementById('passages-grid'),

  // History View
  historyFilter: document.getElementById('history-filter'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  pbGrid: document.getElementById('pb-grid'),
  historyTableWrap: document.getElementById('history-table-wrap'),
  historyTbody: document.getElementById('history-tbody'),
  historyEmpty: document.getElementById('history-empty'),
  emptyStartBtn: document.getElementById('empty-start-btn'),

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
};

// ============================================================================
// Application State
// ============================================================================

const prefs = loadPrefs();
const resultsChart = new ResultsChart(dom.resultsChartCanvas, dom.chartTooltip);
const keyboardGuide = new KeyboardGuide(dom.keyboardGrid, dom.keymapTitle);

const state = {
  activeView: 'practice',
  passageFilterLang: 'all',
  historyFilterLayout: 'all',
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

  // Accurate metrics
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

  // Runtime timers & flags
  timerId: null,
  pulseTimeoutId: null,
  nudgeTimeoutId: null,
  caretRafId: null,
  isComposing: false,
  isModalOpen: false,
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

function getEffectiveDurationMinutes() {
  if (prefs.isCustomTime) {
    const val = Number(prefs.customMinutes);
    return Number.isFinite(val) && val >= 1 && val <= 60 ? val : 10;
  }
  return prefs.durationMinutes === 5 ? 5 : 3;
}

function getElapsedMs() {
  if (state.status === 'running' && state.startTimeMs) {
    return state.accumulatedMs + (Date.now() - state.startTimeMs);
  }
  return state.accumulatedMs;
}

function computeCurrentMetrics() {
  const elapsedMs = getElapsedMs();
  if (elapsedMs <= 0 || state.totalKeystrokes === 0) {
    return { netWpm: 0, rawWpm: 0, accuracy: 100 };
  }
  const minutes = Math.max(1000, elapsedMs) / 60000;
  const netWpm = Math.round(state.correctKeystrokes / 5 / minutes);
  const rawWpm = Math.round(state.totalKeystrokes / 5 / minutes);
  const accuracy = Math.round((state.correctKeystrokes / state.totalKeystrokes) * 100);
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

function setSegmentedActive(container, attrName, value) {
  if (!container) return;
  const buttons = container.querySelectorAll('.seg-btn');
  buttons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset[attrName] === String(value));
  });
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
  } else if (viewName === 'history') {
    renderHistoryView();
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
  dom.metaLayoutLabel.textContent = layout.name;

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
    prefs.pageCount
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
  state.isComposing = false;

  dom.typingPanel.classList.remove('is-hidden');
  dom.resultsPanel.classList.add('is-hidden');
  dom.focusScrim.classList.add('is-hidden');
  dom.metaLockLabel.classList.remove('is-nudged');

  dom.metaPassageTitle.textContent = state.currentPassage.title;
  dom.metaLayoutLabel.textContent = layout.name;

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

  // Keep the active line smoothly anchored near line 2 in full focus mode
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
  state.startTimeMs = Date.now();
  enterFocusMode();

  stopTimer();
  state.timerId = window.setInterval(() => {
    if (state.status !== 'running') return;
    state.elapsedSec += 1;

    const { netWpm, rawWpm } = computeCurrentMetrics();
    state.wpmTimeline.push({
      second: state.elapsedSec,
      netWpm,
      rawWpm,
      errors: state.intervalErrors,
    });
    state.intervalErrors = 0;

    updateTelemetryUI();

    if (prefs.testMode === 'time') {
      const targetSec = getEffectiveDurationMinutes() * 60;
      if (state.elapsedSec >= targetSec) {
        finishSession();
      }
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function finishSession() {
  if (state.status === 'finished') return;
  state.accumulatedMs = getElapsedMs();
  state.startTimeMs = 0;
  stopTimer();
  state.status = 'finished';
  document.body.classList.remove('is-typing-active');

  const elapsedSecExact = Math.max(1, Math.round(state.accumulatedMs / 1000));
  const { netWpm, rawWpm, accuracy } = computeCurrentMetrics();

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

  const { isNewPB } = recordSession({
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
    durationSec: elapsedSecExact,
    consistency,
  });

  // Render Results Panel
  dom.resultsSubtitle.innerHTML = '';
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
  dom.resCharsBreakdown.textContent = `${state.correctTokens} correct · ${state.errorTokens} mistakes`;
  dom.resDuration.textContent = formatClock(elapsedSecExact);
  dom.resConsistency.textContent = `Consistency ${consistency}%`;

  dom.typingPanel.classList.add('is-hidden');
  dom.resultsPanel.classList.remove('is-hidden');

  window.requestAnimationFrame(() => {
    resultsChart.render(state.wpmTimeline);
  });
}

// ============================================================================
// Core Typing Input Pipeline (Strict No-Fix / No-Backspace)
// ============================================================================

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
    } else {
      token.state = 'error';
      el.classList.add('is-error');
      state.errorTokens += 1;
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

/**
 * Process a physical keystroke (built-in Hindi & English mapping).
 */
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

/**
 * Process a direct Unicode Devanagari character (when user types with their OS Hindi keyboard).
 */
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
  if (state.activeView !== 'practice' || state.isModalOpen || state.status === 'finished') {
    return;
  }
  dom.focusScrim.classList.add('is-hidden');
  dom.typingStage.classList.add('is-focused');
  dom.typingStage.focus({ preventScroll: true });
}

function isTypingContextBlocked(target) {
  if (state.isModalOpen || state.activeView !== 'practice' || state.status === 'finished') {
    return true;
  }
  if (!target) return false;
  if (target === dom.customMinuteInput) return true;
  if (target === dom.customTextTitle || target === dom.customTextArea) return true;
  return false;
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.isModalOpen) {
      closeCustomTextModal();
      return;
    }
    if (state.activeView === 'practice' && document.body.classList.contains('is-typing-active')) {
      e.preventDefault();
      exitFocusMode(true);
      return;
    }
  }

  if (isTypingContextBlocked(e.target)) return;

  // Tab restarts session cleanly
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

  // Auto-detect: if OS Hindi keyboard sends Devanagari directly, match Unicode cleanly;
  // otherwise run through our built-in layout keystroke engine seamlessly.
  const layout = LAYOUTS[prefs.layout] || LAYOUTS.english;
  if (layout.isHindi && /[\u0900-\u097F]/.test(e.key)) {
    processUnicodeChar(e.key.normalize('NFC'));
  } else {
    processMapperKey(e.key);
  }
});

// Support OS IME composition transparently if triggered
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
  if (state.status === 'running' && state.activeView === 'practice' && !state.isModalOpen) {
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
// History & Personal Bests View
// ============================================================================

function renderHistoryView() {
  const allHistory = loadHistory();

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

  const filtered =
    state.historyFilterLayout === 'all'
      ? allHistory
      : allHistory.filter((s) => s.layout === state.historyFilterLayout);

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
      <td class="num-col${item.errorChars > 0 ? ' cell-error' : ''}">${item.errorChars}</td>
      <td class="action-col">
        <button type="button" class="row-delete-btn" data-delete-id="${escapeHtml(
          item.id
        )}" aria-label="Delete session">Remove</button>
      </td>
    `;
    dom.historyTbody.appendChild(tr);
  }
}

// ============================================================================
// Custom Text Modal
// ============================================================================

function openCustomTextModal() {
  state.isModalOpen = true;
  exitFocusMode(true);
  dom.customTextError.classList.add('is-hidden');
  dom.customTextModal.classList.remove('is-hidden');
  updateCustomTextStats();
  window.requestAnimationFrame(() => {
    dom.customTextArea.focus();
  });
}

function closeCustomTextModal() {
  state.isModalOpen = false;
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

  // Layout Selector (English, मंगल, कृति देव)
  dom.layoutSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || !btn.dataset.layout) return;
    prefs.layout = btn.dataset.layout;
    savePrefs(prefs);
    syncConfigUI();
    resetSession();
  });

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
  dom.resHistoryBtn.addEventListener('click', () => switchView('history'));

  // Passages Filter
  dom.passageFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || !btn.dataset.langFilter) return;
    state.passageFilterLang = btn.dataset.langFilter;
    setSegmentedActive(dom.passageFilter, 'langFilter', state.passageFilterLang);
    renderPassagesLibrary();
  });

  // History Filter & Clear
  dom.historyFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || !btn.dataset.historyLayout) return;
    state.historyFilterLayout = btn.dataset.historyLayout;
    setSegmentedActive(dom.historyFilter, 'historyLayout', state.historyFilterLayout);
    renderHistoryView();
  });

  dom.historyTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.row-delete-btn');
    if (!btn || !btn.dataset.deleteId) return;
    deleteSession(btn.dataset.deleteId);
    renderHistoryView();
  });

  dom.clearHistoryBtn.addEventListener('click', () => {
    clearHistory();
    renderHistoryView();
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
  syncConfigUI();
  resetSession();
}

init();
