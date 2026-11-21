/**
 * AksharType — Kibo AI Buddy UI Controller (Powered by Groq)
 * 1. Performance Tab Coaching Hub (everyday Hindi default, root-cause diagnosis, action plan, 1-click drill)
 * 2. Floating Draggable Live-Animated Robot Avatar (startup time greeting, cute question popup, offline alert)
 * 3. Interactive Friend Chat Drawer (sleek dark UI, zero white scrollbars, evolving memory & custom drills)
 */

import {
  loadBuddyState,
  saveBuddyState,
  appendBuddyMemory,
  clearBuddyMemories,
} from './storage.js';
import {
  buildBuddyContext,
  buildLocalFallbackBrief,
  buildLocalFallbackReply,
  buildStartupGreeting,
  resolveUserFriendlyName,
} from './buddy-context.js';
import { LAYOUTS } from './keymaps.js';

const WIDGET_POS_KEY = 'akshartype_buddy_widget_pos_v1';

/**
 * Create a live-animated SVG robot avatar element (Kibo).
 */
function buildRobotSvgMarkup(idPrefix) {
  return `
    <svg class="kibo-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="${idPrefix}-shell" x1="12" y1="12" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#27272f"/>
          <stop offset="100%" stop-color="#141418"/>
        </linearGradient>
        <linearGradient id="${idPrefix}-visor" x1="16" y1="22" x2="48" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#0d1117"/>
          <stop offset="100%" stop-color="#09090b"/>
        </linearGradient>
      </defs>

      <!-- Animated Antenna -->
      <g class="kibo-antenna">
        <line x1="32" y1="15" x2="32" y2="8" stroke="#52525b" stroke-width="2.2" stroke-linecap="round"/>
        <circle class="kibo-antenna-tip" cx="32" cy="6.5" r="3.2" fill="currentColor"/>
      </g>

      <!-- Side Ear Pods -->
      <rect x="6.5" y="27" width="4.5" height="12" rx="2.25" fill="#27272f" stroke="#3f3f46" stroke-width="1"/>
      <rect x="53" y="27" width="4.5" height="12" rx="2.25" fill="#27272f" stroke="#3f3f46" stroke-width="1"/>

      <!-- Main Robot Head Shell -->
      <rect x="11" y="15" width="42" height="36" rx="13" fill="url(#${idPrefix}-shell)" stroke="#3f3f46" stroke-width="1.4"/>
      <path d="M21 16.5 H43" stroke="rgba(255,255,255,0.16)" stroke-width="1.2" stroke-linecap="round"/>

      <!-- Dark Visor Screen -->
      <rect x="16" y="22" width="32" height="21" rx="8" fill="url(#${idPrefix}-visor)" stroke="#27272a" stroke-width="1"/>

      <!-- Eyes (Normal / Blinking) -->
      <g class="kibo-eyes-normal">
        <rect class="kibo-eye kibo-eye-l" x="22" y="28" width="5.5" height="7" rx="2.75" fill="currentColor"/>
        <rect class="kibo-eye kibo-eye-r" x="36.5" y="28" width="5.5" height="7" rx="2.75" fill="currentColor"/>
        <circle cx="23.8" cy="30" r="1" fill="#fafafa" opacity="0.85"/>
        <circle cx="38.3" cy="30" r="1" fill="#fafafa" opacity="0.85"/>
      </g>

      <!-- Eyes (Happy / Celebrate Curved Arcs) -->
      <g class="kibo-eyes-happy">
        <path d="M21 32.5 Q24.75 27.5 28.5 32.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/>
        <path d="M35.5 32.5 Q39.25 27.5 43 32.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      </g>

      <!-- Cute Mouth / Voice Wave -->
      <path class="kibo-mouth-smile" d="M28.5 38.5 Q32 41 35.5 38.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.85"/>
      <g class="kibo-voice-bars">
        <rect class="kibo-bar b1" x="26.5" y="36.5" width="2" height="4" rx="1" fill="currentColor"/>
        <rect class="kibo-bar b2" x="31" y="35.5" width="2" height="6" rx="1" fill="currentColor"/>
        <rect class="kibo-bar b3" x="35.5" y="36.5" width="2" height="4" rx="1" fill="currentColor"/>
      </g>

      <!-- Subtle Chin Badge -->
      <rect x="27" y="46.5" width="10" height="2" rx="1" fill="#3f3f46"/>
    </svg>
  `;
}

/**
 * Safely render plain text with lightweight **bold**, `code`, and bullet formatting
 * strictly via DOM nodes & textContent (zero innerHTML XSS risk).
 */
function renderSafeRichText(container, text) {
  container.textContent = '';
  const lines = String(text || '').split('\n');

  lines.forEach((rawLine, lineIdx) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (lineIdx > 0 && lineIdx < lines.length - 1) {
        const spacer = document.createElement('div');
        spacer.className = 'chat-line-gap';
        container.appendChild(spacer);
      }
      return;
    }

    const isBullet = /^([•\-*])\s+/.test(trimmed);
    const lineEl = document.createElement('div');
    lineEl.className = isBullet ? 'chat-bullet-line' : 'chat-text-line';
    const contentText = isBullet ? trimmed.replace(/^([•\-*])\s+/, '') : trimmed;

    if (isBullet) {
      const marker = document.createElement('span');
      marker.className = 'chat-bullet-dot';
      marker.textContent = '•';
      lineEl.appendChild(marker);
    }

    const bodySpan = document.createElement('span');
    const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match;
    while ((match = tokenRegex.exec(contentText)) !== null) {
      if (match.index > lastIndex) {
        bodySpan.appendChild(document.createTextNode(contentText.slice(lastIndex, match.index)));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        const strong = document.createElement('strong');
        strong.textContent = token.slice(2, -2);
        bodySpan.appendChild(strong);
      } else if (token.startsWith('`') && token.endsWith('`')) {
        const code = document.createElement('code');
        code.className = 'chat-inline-code';
        code.textContent = token.slice(1, -1);
        bodySpan.appendChild(code);
      }
      lastIndex = tokenRegex.lastIndex;
    }
    if (lastIndex < contentText.length) {
      bodySpan.appendChild(document.createTextNode(contentText.slice(lastIndex)));
    }

    lineEl.appendChild(bodySpan);
    container.appendChild(lineEl);
  });
}

export class BuddyController {
  constructor(callbacks) {
    this.callbacks = callbacks || {};
    this.isChatOpen = false;
    this.isMemoryOpen = false;
    this.isBriefLoading = false;
    this.isChatLoading = false;
    this.serverStatus = { configured: null, model: 'openai/gpt-oss-20b' };
    this.currentMood = 'idle';
    this.bubbleTimerId = null;
    this.startupTimerId = null;
    this.activeLayoutFilter = 'all';

    this.dom = {
      // Performance Tab Buddy Hub
      perfCard: document.getElementById('buddy-perf-card'),
      perfAvatar: document.getElementById('buddy-perf-avatar'),
      perfHeadline: document.getElementById('buddy-perf-headline'),
      perfMeta: document.getElementById('buddy-perf-meta'),
      perfWhyText: document.getElementById('buddy-perf-why'),
      perfActionsList: document.getElementById('buddy-perf-actions'),
      perfCelebration: document.getElementById('buddy-perf-celebration'),
      perfDrillBtn: document.getElementById('buddy-perf-drill-btn'),
      perfRefreshBtn: document.getElementById('buddy-perf-refresh-btn'),
      perfOpenChatBtn: document.getElementById('buddy-perf-chat-btn'),
      perfQuickPrompts: document.getElementById('buddy-perf-quick-prompts'),
      perfEditNameBtn: document.getElementById('buddy-edit-name-btn'),
      perfNameForm: document.getElementById('buddy-name-inline-form'),
      perfNameInput: document.getElementById('buddy-name-inline-input'),

      // Results screen trigger
      resAskBuddyBtn: document.getElementById('res-ask-buddy-btn'),

      // Floating Draggable Widget & Cute Interactive Popup
      fabRoot: document.getElementById('buddy-fab-root'),
      fabBtn: document.getElementById('buddy-fab-btn'),
      fabAvatar: document.getElementById('buddy-fab-avatar'),
      fabBubble: document.getElementById('buddy-fab-bubble'),
      fabBubbleTitle: document.getElementById('buddy-fab-bubble-title'),
      fabBubbleText: document.getElementById('buddy-fab-bubble-text'),
      fabBubbleActions: document.getElementById('buddy-fab-bubble-actions'),
      fabBubbleClose: document.getElementById('buddy-fab-bubble-close'),

      // Chat Drawer
      chatDrawer: document.getElementById('buddy-chat-drawer'),
      chatAvatar: document.getElementById('buddy-chat-avatar'),
      chatSubtitle: document.getElementById('buddy-chat-subtitle'),
      chatMemoryToggle: document.getElementById('buddy-memory-toggle'),
      chatClearBtn: document.getElementById('buddy-chat-clear'),
      chatCloseBtn: document.getElementById('buddy-chat-close'),
      chatMemoryPanel: document.getElementById('buddy-memory-panel'),
      memoryNameInput: document.getElementById('buddy-mem-name'),
      memoryGoalInput: document.getElementById('buddy-mem-goal'),
      memorySaveBtn: document.getElementById('buddy-mem-save'),
      memoryList: document.getElementById('buddy-mem-list'),
      memoryClearBtn: document.getElementById('buddy-mem-clear'),
      chatMessages: document.getElementById('buddy-chat-messages'),
      chatQuickRow: document.getElementById('buddy-chat-quick'),
      chatForm: document.getElementById('buddy-chat-form'),
      chatInput: document.getElementById('buddy-chat-input'),
      chatSendBtn: document.getElementById('buddy-chat-send'),
    };
  }

  init() {
    if (!this.dom.fabBtn) return;

    if (this.dom.perfAvatar) this.dom.perfAvatar.innerHTML = buildRobotSvgMarkup('kibo-perf');
    if (this.dom.fabAvatar) this.dom.fabAvatar.innerHTML = buildRobotSvgMarkup('kibo-fab');
    if (this.dom.chatAvatar) this.dom.chatAvatar.innerHTML = buildRobotSvgMarkup('kibo-chat');

    this.restoreWidgetPosition();
    this.bindDraggableFab();
    this.bindEvents();
    this.bindConnectivityListeners();
    this.checkServerStatus();
    this.setMood('happy');
    this.renderChatView();
    this.scheduleStartupGreeting();
  }

  async checkServerStatus() {
    if (!navigator.onLine) {
      this.serverStatus = { configured: false, model: 'offline' };
      return;
    }
    try {
      const resp = await fetch('/api/buddy/status');
      if (resp.ok) {
        const data = await resp.json();
        this.serverStatus = {
          configured: Boolean(data.configured),
          model: data.model || 'openai/gpt-oss-20b',
        };
      }
    } catch {
      this.serverStatus = { configured: false, model: 'offline' };
    }
  }

  setMood(mood) {
    this.currentMood = mood || 'idle';
    const valid = ['idle', 'happy', 'celebrate', 'thinking', 'coach', 'concerned', 'talking'];
    const applied = valid.includes(this.currentMood) ? this.currentMood : 'idle';
    const avatars = [this.dom.perfAvatar, this.dom.fabAvatar, this.dom.chatAvatar];
    for (const el of avatars) {
      if (!el) continue;
      for (const m of valid) {
        el.classList.remove(`mood-${m}`);
      }
      el.classList.add(`mood-${applied}`);
    }
  }

  // ==========================================================================
  // Proactive Startup Greeting + Online/Offline Reactions
  // ==========================================================================

  scheduleStartupGreeting() {
    if (this.startupTimerId) window.clearTimeout(this.startupTimerId);
    this.startupTimerId = window.setTimeout(() => {
      if (this.isChatOpen || document.body.classList.contains('is-typing-active')) return;
      const ctx = buildBuddyContext(this.activeLayoutFilter);
      const greet = buildStartupGreeting(ctx);
      this.showPopup({
        title: greet.title,
        text: greet.body,
        mood: greet.mood,
        durationMs: 14000,
        actions: [
          {
            label: greet.primaryLabel,
            primary: true,
            onClick: () => {
              if (greet.primaryAction === 'practice') {
                this.hideBubble();
                if (typeof this.callbacks.onFocusPractice === 'function') {
                  this.callbacks.onFocusPractice();
                }
              } else if (greet.primaryAction === 'chat-prompt' && greet.primaryPrompt) {
                this.openChat(greet.primaryPrompt);
              } else {
                this.openChat();
              }
            },
          },
          {
            label: greet.secondaryLabel,
            primary: false,
            onClick: () => {
              if (greet.secondaryAction === 'chat-prompt' && greet.secondaryPrompt) {
                this.openChat(greet.secondaryPrompt);
              } else {
                this.openChat();
              }
            },
          },
        ],
      });
    }, 1100);
  }

  bindConnectivityListeners() {
    window.addEventListener('offline', () => {
      const userName = resolveUserFriendlyName();
      this.serverStatus = { configured: false, model: 'offline' };
      this.showPopup({
        title: `अरे ${userName}, इंटरनेट बंद है क्या?`,
        text: 'तुमने internet बंद किया है क्या, या WiFi connect नहीं है? कोई बात नहीं—typing प्रैक्टिस offline भी मस्त चलेगी!',
        mood: 'concerned',
        durationMs: 12000,
        actions: [
          {
            label: 'समझ गया, टाइप करते हैं',
            primary: true,
            onClick: () => this.hideBubble(),
          },
        ],
      });
    });

    window.addEventListener('online', () => {
      const userName = resolveUserFriendlyName();
      this.checkServerStatus();
      this.showPopup({
        title: `नेट वापस आ गया ${userName}!`,
        text: 'अब Kibo फिर से फुल पावर में है—चलो बात करें या एक नया टेस्ट मारें!',
        mood: 'celebrate',
        durationMs: 8000,
        actions: [
          {
            label: 'Kibo से Chat करो',
            primary: true,
            onClick: () => this.openChat(),
          },
        ],
      });
    });
  }

  // ==========================================================================
  // Floating Draggable Robot Toggle (Mouse + Touch, Click vs Drag Safe)
  // ==========================================================================

  restoreWidgetPosition() {
    const root = this.dom.fabRoot;
    if (!root) return;
    try {
      const raw = localStorage.getItem(WIDGET_POS_KEY);
      if (!raw) return;
      const pos = JSON.parse(raw);
      if (typeof pos?.x === 'number' && typeof pos?.y === 'number') {
        this.applyWidgetCoords(pos.x, pos.y, false);
      }
    } catch {
      // Use CSS default bottom-right
    }
  }

  clampWidgetCoords(x, y) {
    const btnSize = 58;
    const margin = 14;
    const maxX = Math.max(margin, window.innerWidth - btnSize - margin);
    const maxY = Math.max(margin, window.innerHeight - btnSize - margin);
    return {
      x: Math.max(margin, Math.min(maxX, Math.round(x))),
      y: Math.max(margin, Math.min(maxY, Math.round(y))),
    };
  }

  applyWidgetCoords(x, y, persist = false) {
    const root = this.dom.fabRoot;
    if (!root) return;
    const clamped = this.clampWidgetCoords(x, y);
    root.style.left = `${clamped.x}px`;
    root.style.top = `${clamped.y}px`;
    root.style.right = 'auto';
    root.style.bottom = 'auto';
    root.dataset.customPos = '1';

    root.classList.toggle('bubble-on-right', clamped.x < window.innerWidth * 0.42);
    root.classList.toggle('bubble-below', clamped.y < 190);

    if (persist) {
      try {
        localStorage.setItem(WIDGET_POS_KEY, JSON.stringify(clamped));
      } catch {
        // Ignore
      }
    }
  }

  bindDraggableFab() {
    const btn = this.dom.fabBtn;
    const root = this.dom.fabRoot;
    if (!btn || !root) return;

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    let hasMoved = false;

    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pointerId = e.pointerId;
      btn.setPointerCapture(pointerId);
      const rect = root.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      originLeft = rect.left;
      originTop = rect.top;
      hasMoved = false;
      root.classList.add('is-dragging');
    });

    btn.addEventListener('pointermove', (e) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!hasMoved && Math.hypot(dx, dy) >= 6) {
        hasMoved = true;
      }
      if (hasMoved) {
        this.applyWidgetCoords(originLeft + dx, originTop + dy, false);
      }
    });

    const endDrag = (e) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      try {
        btn.releasePointerCapture(pointerId);
      } catch {
        // Ignore
      }
      pointerId = null;
      root.classList.remove('is-dragging');

      if (hasMoved) {
        const rect = root.getBoundingClientRect();
        this.applyWidgetCoords(rect.left, rect.top, true);
      } else {
        this.toggleChat();
      }
    };

    btn.addEventListener('pointerup', endDrag);
    btn.addEventListener('pointercancel', endDrag);

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleChat();
      }
    });

    window.addEventListener('resize', () => {
      if (root.dataset.customPos === '1') {
        const rect = root.getBoundingClientRect();
        this.applyWidgetCoords(rect.left, rect.top, false);
      }
    });
  }

  /**
   * Show the cute interactive popup card next to Kibo with title, question/suggestion, and quick-action buttons.
   */
  showPopup({ title, text, mood = 'happy', durationMs = 10000, actions = [] }) {
    if (!this.dom.fabBubble || !this.dom.fabBubbleText || this.isChatOpen) return;
    if (document.body.classList.contains('is-typing-active')) return;

    this.setMood(mood);

    if (this.dom.fabBubbleTitle) {
      if (title) {
        this.dom.fabBubbleTitle.textContent = title;
        this.dom.fabBubbleTitle.classList.remove('is-hidden');
      } else {
        this.dom.fabBubbleTitle.classList.add('is-hidden');
      }
    }

    this.dom.fabBubbleText.textContent = text || '';

    if (this.dom.fabBubbleActions) {
      this.dom.fabBubbleActions.textContent = '';
      if (actions.length > 0) {
        for (const act of actions) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = act.primary ? 'popup-act-btn is-primary' : 'popup-act-btn';
          btn.textContent = act.label;
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof act.onClick === 'function') act.onClick();
          });
          this.dom.fabBubbleActions.appendChild(btn);
        }
        this.dom.fabBubbleActions.classList.remove('is-hidden');
      } else {
        this.dom.fabBubbleActions.classList.add('is-hidden');
      }
    }

    this.dom.fabBubble.classList.remove('is-hidden');
    if (this.bubbleTimerId) window.clearTimeout(this.bubbleTimerId);
    this.bubbleTimerId = window.setTimeout(() => {
      this.hideBubble();
    }, durationMs);
  }

  hideBubble() {
    if (this.bubbleTimerId) {
      window.clearTimeout(this.bubbleTimerId);
      this.bubbleTimerId = null;
    }
    if (this.dom.fabBubble) {
      this.dom.fabBubble.classList.add('is-hidden');
    }
  }

  // ==========================================================================
  // Performance Tab Coaching Hub
  // ==========================================================================

  async refreshPerformanceCoach(layoutFilter = 'all', forceRefresh = false) {
    if (!this.dom.perfCard) return;
    this.activeLayoutFilter = layoutFilter;

    const ctx = buildBuddyContext(layoutFilter);
    const buddy = loadBuddyState();

    if (this.dom.perfNameInput) {
      this.dom.perfNameInput.value =
        buddy.preferredName || (ctx.userName !== 'दोस्त' ? ctx.userName : '');
    }

    if (!forceRefresh && buddy.cachedBrief && buddy.cachedFingerprint === ctx.fingerprint) {
      this.renderPerformanceBrief(buddy.cachedBrief, ctx, buddy.cachedBrief._source || 'groq');
      return;
    }

    if (ctx.overall.totalTests === 0 && !forceRefresh) {
      const localBrief = buildLocalFallbackBrief(ctx);
      this.renderPerformanceBrief(localBrief, ctx, 'local');
      return;
    }

    if (!navigator.onLine) {
      const localBrief = buildLocalFallbackBrief(ctx);
      this.renderPerformanceBrief(localBrief, ctx, 'offline');
      return;
    }

    if (this.isBriefLoading) return;
    this.isBriefLoading = true;
    this.setMood('thinking');
    this.renderPerformanceLoading(ctx.userName, ctx.language);

    try {
      const resp = await fetch('/api/buddy/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: ctx.userName,
          focusLayout: ctx.effectiveLayout,
          language: ctx.language,
          digest: ctx.digest,
        }),
      });

      const data = await resp.json().catch(() => null);
      if (resp.ok && data?.ok && data.brief) {
        const briefToStore = {
          ...data.brief,
          _source: 'groq',
          _model: data.model || 'openai/gpt-oss-20b',
        };
        saveBuddyState({
          cachedBrief: briefToStore,
          cachedFingerprint: ctx.fingerprint,
        });
        if (data.brief.memoryNote) {
          appendBuddyMemory(data.brief.memoryNote);
          this.renderMemoryPanel();
        }
        this.renderPerformanceBrief(briefToStore, ctx, 'groq');
      } else {
        const localBrief = buildLocalFallbackBrief(ctx);
        const sourceTag = data?.code === 'NO_API_KEY' ? 'unconfigured' : 'local';
        this.renderPerformanceBrief(localBrief, ctx, sourceTag);
      }
    } catch {
      const localBrief = buildLocalFallbackBrief(ctx);
      this.renderPerformanceBrief(localBrief, ctx, 'offline');
    } finally {
      this.isBriefLoading = false;
    }
  }

  renderPerformanceLoading(userName, language) {
    if (this.dom.perfHeadline) {
      this.dom.perfHeadline.textContent =
        language === 'english'
          ? `Checking your latest runs, ${userName}...`
          : `रुको ${userName}, तुम्हारे पिछले टेस्ट देख रहा हूँ...`;
    }
    if (this.dom.perfMeta) {
      this.dom.perfMeta.textContent = 'Kibo AI Coach · Weak keys और speed pattern स्कैन हो रहे हैं';
    }
    if (this.dom.perfWhyText) {
      this.dom.perfWhyText.textContent =
        language === 'english'
          ? 'Scanning mistake patterns and finger transitions...'
          : 'तुम्हारी गलतियों और उंगलियों के rhythm का हिसाब लगा रहा हूँ...';
      this.dom.perfWhyText.classList.add('is-loading-shimmer');
    }
    if (this.dom.perfActionsList) {
      this.dom.perfActionsList.textContent = '';
    }
    if (this.dom.perfRefreshBtn) {
      this.dom.perfRefreshBtn.disabled = true;
    }
  }

  renderPerformanceBrief(brief, ctx, source = 'groq') {
    if (this.dom.perfRefreshBtn) {
      this.dom.perfRefreshBtn.disabled = false;
    }
    if (this.dom.perfWhyText) {
      this.dom.perfWhyText.classList.remove('is-loading-shimmer');
    }

    this.setMood(brief.mood || 'coach');

    if (this.dom.perfHeadline) {
      this.dom.perfHeadline.textContent = brief.headline || `हे ${ctx.userName}!`;
    }

    if (this.dom.perfMeta) {
      const modelShort = (brief._model || this.serverStatus.model || 'gpt-oss-20b').replace(
        /^openai\//,
        ''
      );
      const layoutLabel =
        ctx.layoutFilter === 'all'
          ? 'All layouts'
          : (LAYOUTS[ctx.layoutFilter] || LAYOUTS.english).shortName;
      if (source === 'groq') {
        this.dom.perfMeta.textContent = `Kibo AI Coach · ${layoutLabel} · Groq ${modelShort}`;
      } else if (source === 'unconfigured') {
        this.dom.perfMeta.textContent = `Kibo Coach · ${layoutLabel} · Local मोड (GROQ_API_KEY डालते ही Live AI चलेगा)`;
      } else if (source === 'offline') {
        this.dom.perfMeta.textContent = `Kibo Coach · ${layoutLabel} · Offline मोड`;
      } else {
        this.dom.perfMeta.textContent = `Kibo Coach · ${layoutLabel} · अगले टेस्ट के लिए तैयार`;
      }
    }

    if (this.dom.perfWhyText) {
      this.dom.perfWhyText.textContent = brief.whyYouFail || '';
    }

    if (this.dom.perfActionsList) {
      this.dom.perfActionsList.textContent = '';
      const steps = Array.isArray(brief.actionPlan) ? brief.actionPlan : [];
      steps.forEach((step, idx) => {
        const li = document.createElement('li');
        li.className = 'buddy-step-item';
        const num = document.createElement('span');
        num.className = 'buddy-step-num tabular-nums';
        num.textContent = `0${idx + 1}`;
        const txt = document.createElement('span');
        txt.className = 'buddy-step-text';
        txt.textContent = step;
        li.appendChild(num);
        li.appendChild(txt);
        this.dom.perfActionsList.appendChild(li);
      });
    }

    if (this.dom.perfCelebration) {
      if (brief.celebration) {
        this.dom.perfCelebration.textContent = brief.celebration;
        this.dom.perfCelebration.classList.remove('is-hidden');
      } else {
        this.dom.perfCelebration.classList.add('is-hidden');
      }
    }

    if (this.dom.perfDrillBtn) {
      const hasWeak = ctx.patterns.weakest.length > 0;
      this.dom.perfDrillBtn.textContent = hasWeak
        ? `Drill Weak Keys (${ctx.patterns.weakest
            .slice(0, 3)
            .map((w) => w.displayChar)
            .join(' ')})`
        : 'Recommended Practice शुरू करो';
      this.dom.perfDrillBtn.dataset.drillLayout = ctx.effectiveLayout;
    }

    this.renderPerformanceQuickPrompts(ctx);
  }

  renderPerformanceQuickPrompts(ctx) {
    if (!this.dom.perfQuickPrompts) return;
    this.dom.perfQuickPrompts.textContent = '';

    const prompts =
      ctx.language === 'english'
        ? [
            {
              label: 'Why do I miss these keys?',
              prompt:
                'Break down exactly why I keep missing my top weak keys and how to fix my finger movement.',
            },
            {
              label: 'Make a custom drill',
              prompt: `Create a short custom practice drill targeting my weak keys in ${ctx.effectiveLayout}.`,
            },
            {
              label: 'Review my last run',
              prompt: 'Give me an honest friend-style review of my most recent typing session.',
            },
          ]
        : [
            {
              label: 'ये keys क्यों गलत हो रही हैं?',
              prompt: 'मेरी top weak keys बार-बार गलत क्यों हो रही हैं? इन्हें ठीक करने का आसान तरीका बताओ।',
            },
            {
              label: 'Custom Drill बनाओ',
              prompt: `${ctx.effectiveLayout} में मेरी weak keys के लिए एक छोटा सा custom practice drill बना दो।`,
            },
            {
              label: 'पिछले टेस्ट का Review',
              prompt: 'मेरे सबसे पिछले टेस्ट का दोस्त की तरह honest review करो—क्या अच्छा रहा और कहाँ सुधारना है?',
            },
          ];

    for (const item of prompts) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'buddy-prompt-btn';
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        this.openChat(item.prompt);
      });
      this.dom.perfQuickPrompts.appendChild(btn);
    }
  }

  // ==========================================================================
  // Interactive Friend Chat Drawer & Evolving Memory
  // ==========================================================================

  openChat(prefillAndSend = null) {
    if (!this.dom.chatDrawer) return;
    this.hideBubble();
    this.isChatOpen = true;
    this.dom.chatDrawer.classList.remove('is-hidden');
    this.dom.fabBtn?.setAttribute('aria-expanded', 'true');
    if (typeof this.callbacks.onChatToggle === 'function') {
      this.callbacks.onChatToggle(true);
    }
    this.renderChatView();
    this.renderMemoryPanel();

    window.requestAnimationFrame(() => {
      this.scrollChatToBottom();
      if (!prefillAndSend) {
        this.dom.chatInput?.focus();
      }
    });

    if (prefillAndSend && typeof prefillAndSend === 'string') {
      this.sendChatMessage(prefillAndSend);
    }
  }

  closeChat() {
    if (!this.dom.chatDrawer || !this.isChatOpen) return;
    this.isChatOpen = false;
    this.dom.chatDrawer.classList.add('is-hidden');
    this.dom.fabBtn?.setAttribute('aria-expanded', 'false');
    if (typeof this.callbacks.onChatToggle === 'function') {
      this.callbacks.onChatToggle(false);
    }
  }

  toggleChat() {
    if (this.isChatOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  renderChatView() {
    if (!this.dom.chatMessages) return;
    const ctx = buildBuddyContext(this.activeLayoutFilter);
    const buddy = loadBuddyState();
    const history = buddy.chatHistory || [];

    if (this.dom.chatSubtitle) {
      if (!navigator.onLine) {
        this.dom.chatSubtitle.textContent = 'Offline मोड · नेट आते ही Live AI चालू होगा';
      } else {
        const testsText = `${ctx.overall.totalTests} ${ctx.overall.totalTests === 1 ? 'test' : 'tests'}`;
        this.dom.chatSubtitle.textContent = `${ctx.userName} · ${testsText} · ${ctx.overall.weightedAvgWpm} WPM`;
      }
    }

    this.dom.chatMessages.textContent = '';

    if (history.length === 0) {
      const welcome = document.createElement('div');
      welcome.className = 'chat-msg chat-msg-assistant';
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      let intro;
      if (!navigator.onLine) {
        intro = `अरे यार ${ctx.userName}, तुमने internet बंद किया है क्या? या WiFi connect नहीं है? 😅\nकोई बात नहीं—typing प्रैक्टिस offline भी मस्त चलेगी, और नेट आते ही हम लाइव बात करेंगे!`;
      } else if (ctx.overall.totalTests > 0) {
        intro = `अरे ${ctx.userName}! मैं **Kibo** हूँ—तुम्हारा typing दोस्त! अभी तुम्हारे **${ctx.overall.totalTests} टेस्ट** दिख रहे हैं (${ctx.overall.weightedAvgWpm} avg WPM, ${ctx.overall.weightedAccuracy}% accuracy)।\n\nवैसे तुम किसी exam (SSC/CPCT/Court) की तैयारी कर रहे हो या बस मस्त स्पीड बनानी है? बताओ, मिलकर टारगेट तोड़ते हैं!`;
      } else {
        intro = `हे ${ctx.userName}! मैं **Kibo** हूँ—तुम्हारा robotic typing buddy! चलो पहले बताओ तुम्हारा नाम क्या बुलाऊँ और तुम किस goal के लिए typing प्रैक्टिस कर रहे हो?`;
      }
      renderSafeRichText(bubble, intro);
      welcome.appendChild(bubble);
      this.dom.chatMessages.appendChild(welcome);
    } else {
      for (const msg of history) {
        this.appendMessageElement(msg);
      }
    }

    this.renderChatQuickSuggestions(ctx);
    this.scrollChatToBottom();
  }

  appendMessageElement(msg) {
    if (!this.dom.chatMessages) return;
    const wrap = document.createElement('div');
    wrap.className = `chat-msg ${msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-assistant'}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    renderSafeRichText(bubble, msg.content);
    wrap.appendChild(bubble);

    if (msg.role === 'assistant' && msg.drillText && msg.drillText.length >= 15) {
      const drillAction = document.createElement('button');
      drillAction.type = 'button';
      drillAction.className = 'chat-drill-btn';
      drillAction.textContent = 'ये Drill अभी Practice करो';
      drillAction.addEventListener('click', () => {
        if (typeof this.callbacks.onLaunchCustomDrill === 'function') {
          this.closeChat();
          this.callbacks.onLaunchCustomDrill({
            title: 'Kibo Custom Drill',
            text: msg.drillText,
          });
        }
      });
      wrap.appendChild(drillAction);
    }

    this.dom.chatMessages.appendChild(wrap);
  }

  renderChatQuickSuggestions(ctx) {
    if (!this.dom.chatQuickRow) return;
    this.dom.chatQuickRow.textContent = '';

    const suggestions = [];
    if (ctx.language === 'english') {
      if (ctx.patterns.weakest.length > 0) {
        suggestions.push(`Why do I miss "${ctx.patterns.weakest[0].displayChar}"?`);
      } else {
        suggestions.push('How to boost speed?');
      }
      suggestions.push('20-word custom drill');
      suggestions.push('Review my last run');
    } else {
      if (ctx.patterns.weakest.length > 0) {
        suggestions.push(`"${ctx.patterns.weakest[0].displayChar}" गलत क्यों होता है?`);
      } else {
        suggestions.push('स्पीड कैसे बढ़ाऊँ?');
      }
      suggestions.push('Custom drill बनाओ');
      suggestions.push(ctx.patterns.isHindi ? 'Hindi मात्रा टिप्स' : 'पिछला टेस्ट बताओ');
    }

    for (const q of suggestions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-quick-btn';
      btn.textContent = q;
      btn.addEventListener('click', () => this.sendChatMessage(q));
      this.dom.chatQuickRow.appendChild(btn);
    }
  }

  renderMemoryPanel() {
    if (!this.dom.chatMemoryPanel) return;
    const buddy = loadBuddyState();
    const userName = resolveUserFriendlyName();

    if (this.dom.memoryNameInput) {
      this.dom.memoryNameInput.value = buddy.preferredName || (userName !== 'दोस्त' ? userName : '');
    }
    if (this.dom.memoryGoalInput) {
      this.dom.memoryGoalInput.value = buddy.goal || '';
    }
    if (this.dom.memoryList) {
      this.dom.memoryList.textContent = '';
      if (!buddy.memories || buddy.memories.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'mem-empty';
        empty.textContent =
          'अभी तक कोई note save नहीं है। Kibo से अपने exam, WPM target या habit के बारे में बात करो—ये अपने आप याद रख लेगा!';
        this.dom.memoryList.appendChild(empty);
      } else {
        buddy.memories.forEach((item, idx) => {
          const row = document.createElement('div');
          row.className = 'mem-item';
          const textSpan = document.createElement('span');
          textSpan.textContent = item;
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'mem-del-btn';
          delBtn.textContent = 'हटाएँ';
          delBtn.setAttribute('aria-label', 'Forget memory');
          delBtn.addEventListener('click', () => {
            const current = loadBuddyState().memories || [];
            const next = current.filter((_, i) => i !== idx);
            saveBuddyState({ memories: next });
            this.renderMemoryPanel();
            this.renderChatView();
          });
          row.appendChild(textSpan);
          row.appendChild(delBtn);
          this.dom.memoryList.appendChild(row);
        });
      }
    }
  }

  scrollChatToBottom() {
    if (this.dom.chatMessages) {
      this.dom.chatMessages.scrollTop = this.dom.chatMessages.scrollHeight;
    }
  }

  async sendChatMessage(rawText) {
    const text = String(rawText || '').trim().slice(0, 500);
    if (!text || this.isChatLoading) return;

    this.isChatLoading = true;
    if (this.dom.chatInput) this.dom.chatInput.value = '';
    if (this.dom.chatSendBtn) this.dom.chatSendBtn.disabled = true;

    const buddy = loadBuddyState();
    const updatedHistory = [...(buddy.chatHistory || []), { role: 'user', content: text }].slice(-30);
    saveBuddyState({ chatHistory: updatedHistory });

    this.renderChatView();

    this.setMood('thinking');
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-msg chat-msg-assistant chat-msg-typing';
    typingEl.innerHTML =
      '<div class="chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
    this.dom.chatMessages?.appendChild(typingEl);
    this.scrollChatToBottom();

    // Context now includes updated chatHistory so language detection reflects this message!
    const ctx = buildBuddyContext(this.activeLayoutFilter);

    const priorTurns = updatedHistory.slice(0, -1).slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let assistantReply = '';
    let replyMood = 'happy';
    let drillText = '';

    if (!navigator.onLine) {
      const fb = buildLocalFallbackReply(text, ctx, 'OFFLINE');
      assistantReply = fb.reply;
      replyMood = fb.mood;
    } else {
      try {
        const resp = await fetch('/api/buddy/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            userName: ctx.userName,
            language: ctx.language,
            digest: ctx.digest,
            history: priorTurns,
          }),
        });
        const data = await resp.json().catch(() => null);

        if (resp.ok && data?.ok && data.reply) {
          assistantReply = data.reply;
          replyMood = data.mood || 'happy';
          drillText = data.drillText || '';
          if (data.memoryNote) {
            appendBuddyMemory(data.memoryNote);
          }
        } else {
          const fb = buildLocalFallbackReply(text, ctx, data?.code || 'UPSTREAM_ERROR');
          assistantReply = fb.reply;
          replyMood = fb.mood;
        }
      } catch {
        const fb = buildLocalFallbackReply(text, ctx, 'OFFLINE');
        assistantReply = fb.reply;
        replyMood = fb.mood;
      }
    }

    typingEl.remove();

    const finalBuddy = loadBuddyState();
    const nextHistory = [
      ...(finalBuddy.chatHistory || []),
      { role: 'assistant', content: assistantReply, drillText: drillText || undefined },
    ].slice(-30);
    saveBuddyState({ chatHistory: nextHistory });

    this.isChatLoading = false;
    if (this.dom.chatSendBtn) this.dom.chatSendBtn.disabled = false;

    this.setMood('talking');
    this.renderChatView();
    this.renderMemoryPanel();
    window.setTimeout(() => {
      if (!this.isChatLoading && !this.isBriefLoading) {
        this.setMood(replyMood);
      }
    }, 1500);
    this.dom.chatInput?.focus();
  }

  // ==========================================================================
  // App Lifecycle Hooks (Session Complete & Account Switch)
  // ==========================================================================

  onSessionComplete(summary) {
    const userName = resolveUserFriendlyName();
    if (!summary) return;
    if (summary.isNewPB && summary.netWpm > 0) {
      this.showPopup({
        title: `नया Personal Best, ${userName}!`,
        text: `कमाल कर दिया यार! ${summary.netWpm} WPM और ${summary.accuracy}% accuracy—आओ जश्न मनाएँ!`,
        mood: 'celebrate',
        durationMs: 10000,
        actions: [
          {
            label: 'Kibo से मिलो',
            primary: true,
            onClick: () =>
              this.openChat('मेरा अभी नया PB आया है! मेरे इस टेस्ट का review करो और अगला टारगेट बताओ!'),
          },
        ],
      });
    } else if (summary.accuracy >= 97 && summary.totalChars >= 20) {
      this.showPopup({
        title: `एकदम साफ ${summary.accuracy}% Accuracy!`,
        text: `बढ़िया कंट्रोल है ${userName}! अब अगले टेस्ट में स्पीड थोड़ी और बढ़ाएँ क्या?`,
        mood: 'happy',
        durationMs: 8500,
        actions: [
          {
            label: 'अगली टिप लो',
            primary: true,
            onClick: () => this.openChat('मेरी accuracy बढ़िया रही, अब speed कैसे बढ़ाऊँ?'),
          },
        ],
      });
    } else if (summary.errorChars >= 6) {
      this.showPopup({
        title: `थोड़ा tough रहा ${userName} (${summary.errorChars} गलतियाँ)`,
        text: 'टेंशन मत लो! मैंने देख लिया कौन सी keys गड़बड़ हुईं—आओ chat में बताता हूँ कैसे ठीक करनी हैं।',
        mood: 'concerned',
        durationMs: 9500,
        actions: [
          {
            label: 'बताओ क्या गलत हुआ',
            primary: true,
            onClick: () =>
              this.openChat('इस टेस्ट में मुझसे गलतियाँ क्यों हुईं और इन्हें कैसे सुधारूँ?'),
          },
        ],
      });
    } else {
      this.showPopup({
        title: `बढ़िया टेस्ट ${userName} — ${summary.netWpm} WPM!`,
        text: 'एक quick breakdown चाहिए या अगला drill शुरू करें?',
        mood: 'coach',
        durationMs: 8000,
        actions: [
          {
            label: 'Quick Review दो',
            primary: true,
            onClick: () => this.openChat('मेरे इस टेस्ट का quick review दो!'),
          },
        ],
      });
    }
  }

  onVaultChanged() {
    this.renderChatView();
    this.renderMemoryPanel();
    this.setMood('happy');
  }

  // ==========================================================================
  // Event Binding
  // ==========================================================================

  bindEvents() {
    this.dom.fabBubbleClose?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideBubble();
    });

    this.dom.fabBubble?.addEventListener('click', () => {
      this.openChat();
    });

    this.dom.perfRefreshBtn?.addEventListener('click', () => {
      this.refreshPerformanceCoach(this.activeLayoutFilter, true);
    });

    this.dom.perfOpenChatBtn?.addEventListener('click', () => {
      this.openChat();
    });

    this.dom.perfDrillBtn?.addEventListener('click', () => {
      const targetLayout = this.dom.perfDrillBtn.dataset.drillLayout || 'english';
      if (typeof this.callbacks.onLaunchWeakKeysDrill === 'function') {
        this.callbacks.onLaunchWeakKeysDrill(targetLayout);
      }
    });

    this.dom.perfEditNameBtn?.addEventListener('click', () => {
      const isHidden = this.dom.perfNameForm?.classList.toggle('is-hidden');
      if (!isHidden) {
        this.dom.perfNameInput?.focus();
        this.dom.perfNameInput?.select();
      }
    });

    this.dom.perfNameForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = (this.dom.perfNameInput?.value || '').trim().slice(0, 32);
      saveBuddyState({ preferredName: val, cachedFingerprint: '' });
      this.dom.perfNameForm?.classList.add('is-hidden');
      this.renderMemoryPanel();
      this.renderChatView();
      this.refreshPerformanceCoach(this.activeLayoutFilter, true);
    });

    this.dom.resAskBuddyBtn?.addEventListener('click', () => {
      this.openChat('मेरा टेस्ट अभी खत्म हुआ! दोस्त की तरह बताओ क्या अच्छा रहा और गलतियाँ क्यों हुईं?');
    });

    this.dom.chatCloseBtn?.addEventListener('click', () => this.closeChat());

    this.dom.chatMemoryToggle?.addEventListener('click', () => {
      this.isMemoryOpen = !this.isMemoryOpen;
      this.dom.chatMemoryPanel?.classList.toggle('is-hidden', !this.isMemoryOpen);
      this.dom.chatMemoryToggle?.classList.toggle('is-active', this.isMemoryOpen);
      if (this.isMemoryOpen) this.renderMemoryPanel();
    });

    this.dom.memorySaveBtn?.addEventListener('click', () => {
      const preferredName = (this.dom.memoryNameInput?.value || '').trim().slice(0, 32);
      const goal = (this.dom.memoryGoalInput?.value || '').trim().slice(0, 90);
      saveBuddyState({ preferredName, goal, cachedFingerprint: '' });
      this.renderMemoryPanel();
      this.renderChatView();
      this.showMemorySavedFlash();
    });

    this.dom.memoryClearBtn?.addEventListener('click', () => {
      clearBuddyMemories();
      this.renderMemoryPanel();
      this.renderChatView();
    });

    this.dom.chatClearBtn?.addEventListener('click', () => {
      saveBuddyState({ chatHistory: [] });
      this.renderChatView();
    });

    this.dom.chatForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendChatMessage(this.dom.chatInput?.value || '');
    });
  }

  showMemorySavedFlash() {
    if (!this.dom.memorySaveBtn) return;
    const orig = this.dom.memorySaveBtn.textContent;
    this.dom.memorySaveBtn.textContent = 'Save हो गया!';
    window.setTimeout(() => {
      if (this.dom.memorySaveBtn) this.dom.memorySaveBtn.textContent = orig;
    }, 1200);
  }
}
