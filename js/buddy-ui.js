/**
 * AksharType — Kibo AI Buddy UI Controller (Powered by Groq)
 * 1. Performance Tab Coaching Hub (respectful everyday Hindi default, root-cause diagnosis, 1-click drill)
 * 2. Cute Full-Body Floating Animated Robot (levitation shadow, waving hands, cheek blushes, cursor eye-tracking)
 * 3. ChatGPT/Claude-grade Markdown Chat Drawer (ephemeral session history, auto long-term memory, custom test builder)
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
  detectTurnLanguage,
  resolveUserFriendlyName,
} from './buddy-context.js';
import { LAYOUTS } from './keymaps.js';

const WIDGET_POS_KEY = 'akshartype_buddy_widget_pos_v1';

/**
 * Create a cute, physically present, full-body live-animated SVG robot character (Kibo)
 * with grounded levitation shadow, floating torso + glowing heart core, articulated waving hands,
 * rosy cheek blushes, cursor-tracking eyes, and pulsing signal antenna.
 */
function buildRobotSvgMarkup(idPrefix) {
  return `
    <svg class="kibo-svg" viewBox="0 0 80 86" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="${idPrefix}-head" x1="18" y1="14" x2="62" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#32323d"/>
          <stop offset="55%" stop-color="#1d1d24"/>
          <stop offset="100%" stop-color="#121216"/>
        </linearGradient>
        <linearGradient id="${idPrefix}-torso" x1="26" y1="51" x2="54" y2="73" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#2c2c36"/>
          <stop offset="100%" stop-color="#141419"/>
        </linearGradient>
        <linearGradient id="${idPrefix}-visor" x1="22" y1="22" x2="58" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#0b1017"/>
          <stop offset="100%" stop-color="#06070a"/>
        </linearGradient>
        <radialGradient id="${idPrefix}-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.34"/>
          <stop offset="70%" stop-color="#000000" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Grounded Levitation Floor Shadow (scales opposite to float height for physical presence) -->
      <ellipse class="kibo-shadow" cx="40" cy="80.5" rx="18" ry="3.8" fill="url(#${idPrefix}-shadow)"/>

      <!-- Floating Full-Body Character -->
      <g class="kibo-body">
        <!-- Floating Left Hand -->
        <g class="kibo-hand kibo-hand-l">
          <rect x="13" y="53" width="8.5" height="12.5" rx="4.25" fill="url(#${idPrefix}-torso)" stroke="#484857" stroke-width="1.2"/>
          <circle cx="17.25" cy="61.5" r="1.4" fill="currentColor" opacity="0.65"/>
        </g>

        <!-- Floating Right Hand (waves warmly on happy / hover!) -->
        <g class="kibo-hand kibo-hand-r">
          <rect x="58.5" y="53" width="8.5" height="12.5" rx="4.25" fill="url(#${idPrefix}-torso)" stroke="#484857" stroke-width="1.2"/>
          <circle cx="62.75" cy="61.5" r="1.4" fill="currentColor" opacity="0.65"/>
        </g>

        <!-- Compact Cute Rounded Torso Pod -->
        <path
          d="M27 52.5 C27 50.5 30 49.5 40 49.5 C50 49.5 53 50.5 53 52.5 L51.5 65 C51 70 46.5 72.5 40 72.5 C33.5 72.5 29 70 28.5 65 Z"
          fill="url(#${idPrefix}-torso)"
          stroke="#434351"
          stroke-width="1.3"
        />
        <!-- Glowing Chest Core -->
        <circle class="kibo-core-halo" cx="40" cy="60.5" r="5.5" fill="currentColor" opacity="0.16"/>
        <circle class="kibo-core" cx="40" cy="60.5" r="2.7" fill="currentColor"/>
        <circle cx="39.2" cy="59.7" r="0.9" fill="#ffffff" opacity="0.85"/>

        <!-- Animated Signal Antenna -->
        <g class="kibo-antenna">
          <line x1="40" y1="16" x2="40" y2="8.5" stroke="#636373" stroke-width="2.2" stroke-linecap="round"/>
          <circle class="kibo-antenna-ring" cx="40" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1" opacity="0.35"/>
          <circle class="kibo-antenna-tip" cx="40" cy="6.5" r="3.1" fill="currentColor"/>
          <circle cx="39.1" cy="5.5" r="0.9" fill="#ffffff" opacity="0.85"/>
        </g>

        <!-- Cute Rounded Ear Pods -->
        <rect x="13" y="28" width="5" height="12.5" rx="2.5" fill="#292933" stroke="#454552" stroke-width="1.1"/>
        <rect x="62" y="28" width="5" height="12.5" rx="2.5" fill="#292933" stroke="#454552" stroke-width="1.1"/>

        <!-- Rounded Chibi Head Shell -->
        <rect x="17.5" y="15.5" width="45" height="35" rx="15" fill="url(#${idPrefix}-head)" stroke="#484856" stroke-width="1.4"/>
        <!-- Soft Gloss Highlight -->
        <path d="M27 17.6 H53" stroke="rgba(255,255,255,0.2)" stroke-width="1.3" stroke-linecap="round"/>

        <!-- Glossy Dark Visor -->
        <rect x="22.5" y="22" width="35" height="22.5" rx="10" fill="url(#${idPrefix}-visor)" stroke="#27272f" stroke-width="1.1"/>

        <!-- Subtle Cheek Blushes (warm glow when happy/celebrate/hover) -->
        <g class="kibo-cheeks">
          <ellipse cx="26.5" cy="37.2" rx="2.6" ry="1.35" fill="#fb7185"/>
          <ellipse cx="53.5" cy="37.2" rx="2.6" ry="1.35" fill="#fb7185"/>
        </g>

        <!-- Cursor-Tracking Face Feature Group -->
        <g class="kibo-eye-track">
          <!-- Expressive Blinking Eyes -->
          <g class="kibo-eyes-normal">
            <rect class="kibo-eye kibo-eye-l" x="28.5" y="27.5" width="6.2" height="7.8" rx="3.1" fill="currentColor"/>
            <rect class="kibo-eye kibo-eye-r" x="45.3" y="27.5" width="6.2" height="7.8" rx="3.1" fill="currentColor"/>
            <circle cx="30.4" cy="29.6" r="1.25" fill="#ffffff" opacity="0.92"/>
            <circle cx="47.2" cy="29.6" r="1.25" fill="#ffffff" opacity="0.92"/>
            <circle cx="32.7" cy="33" r="0.6" fill="#ffffff" opacity="0.55"/>
            <circle cx="49.5" cy="33" r="0.6" fill="#ffffff" opacity="0.55"/>
          </g>

          <!-- Joyful Curved Eyes (Happy / Celebrate / Hover) -->
          <g class="kibo-eyes-happy">
            <path d="M27.6 32.8 Q31.6 26.8 35.6 32.8" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" fill="none"/>
            <path d="M44.4 32.8 Q48.4 26.8 52.4 32.8" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" fill="none"/>
          </g>

          <!-- Expressive Cute Smile / Voice Equalizer -->
          <path class="kibo-mouth-smile" d="M36 38.4 Q40 41.6 44 38.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" fill="none" opacity="0.9"/>
          <g class="kibo-voice-bars">
            <rect class="kibo-bar b1" x="34.5" y="36.8" width="2.1" height="4.2" rx="1.05" fill="currentColor"/>
            <rect class="kibo-bar b2" x="39" y="35.6" width="2.1" height="6.4" rx="1.05" fill="currentColor"/>
            <rect class="kibo-bar b3" x="43.5" y="36.8" width="2.1" height="4.2" rx="1.05" fill="currentColor"/>
          </g>
        </g>
      </g>
    </svg>
  `;
}

/**
 * Append inline Markdown tokens (**bold**, *italic*, `code/keycap`) safely using DOM nodes.
 * Zero innerHTML — completely XSS-safe.
 */
function appendInlineFormatted(parent, text) {
  const str = String(text || '');
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parent.appendChild(document.createTextNode(str.slice(lastIndex, match.index)));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      const strong = document.createElement('strong');
      strong.textContent = token.slice(2, -2);
      parent.appendChild(strong);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const code = document.createElement('code');
      code.className = 'chat-inline-code';
      code.textContent = token.slice(1, -1);
      parent.appendChild(code);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const em = document.createElement('em');
      em.textContent = token.slice(1, -1);
      parent.appendChild(em);
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < str.length) {
    parent.appendChild(document.createTextNode(str.slice(lastIndex)));
  }
}

function parseTableCells(line) {
  let clean = line.trim();
  if (clean.startsWith('|')) clean = clean.slice(1);
  if (clean.endsWith('|')) clean = clean.slice(0, -1);
  return clean.split('|').map((c) => c.trim());
}

function isTableSeparatorLine(line) {
  const trimmed = line.trim();
  return /^\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?$/.test(trimmed);
}

/**
 * ChatGPT / Claude / Gemini-grade XSS-safe Markdown DOM renderer.
 * Supports headings (###/##/#), paragraphs, bullet lists, numbered lists,
 * Markdown tables, fenced code blocks, dividers (---), bold, italic, and inline keycaps.
 */
function renderSafeMarkdown(container, markdown) {
  container.textContent = '';
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // 1. Fenced code block
    if (trimmed.startsWith('```')) {
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      const pre = document.createElement('pre');
      pre.className = 'md-code-block';
      const code = document.createElement('code');
      code.textContent = codeLines.join('\n');
      pre.appendChild(code);
      container.appendChild(pre);
      continue;
    }

    // 2. Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      const hr = document.createElement('hr');
      hr.className = 'md-hr';
      container.appendChild(hr);
      i += 1;
      continue;
    }

    // 3. Heading (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const h = document.createElement('div');
      h.className = `md-h md-h${Math.min(level, 3)}`;
      appendInlineFormatted(h, headingMatch[2]);
      container.appendChild(h);
      i += 1;
      continue;
    }

    // 4. Markdown table
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparatorLine(lines[i + 1])
    ) {
      const headers = parseTableCells(trimmed);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== '') {
        rows.push(parseTableCells(lines[i]));
        i += 1;
      }

      const wrap = document.createElement('div');
      wrap.className = 'md-table-wrap';
      const table = document.createElement('table');
      table.className = 'md-table';

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      for (const cellText of headers) {
        const th = document.createElement('th');
        appendInlineFormatted(th, cellText);
        headRow.appendChild(th);
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      if (rows.length > 0) {
        const tbody = document.createElement('tbody');
        for (const r of rows) {
          const tr = document.createElement('tr');
          for (let c = 0; c < headers.length; c += 1) {
            const td = document.createElement('td');
            appendInlineFormatted(td, r[c] || '');
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
      }

      wrap.appendChild(table);
      container.appendChild(wrap);
      continue;
    }

    // 5. Unordered list (-, *, •)
    if (/^([•\-*])\s+/.test(trimmed)) {
      const ul = document.createElement('ul');
      ul.className = 'md-ul';
      while (i < lines.length && /^([•\-*])\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^([•\-*])\s+/, '');
        const li = document.createElement('li');
        appendInlineFormatted(li, itemText);
        ul.appendChild(li);
        i += 1;
      }
      container.appendChild(ul);
      continue;
    }

    // 6. Ordered list (1. 2. 3.)
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const ol = document.createElement('ol');
      ol.className = 'md-ol';
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+[.)]\s+/, '');
        const li = document.createElement('li');
        appendInlineFormatted(li, itemText);
        ol.appendChild(li);
        i += 1;
      }
      container.appendChild(ol);
      continue;
    }

    // 7. Standard paragraph (merge consecutive plain lines)
    const paraLines = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        cur.startsWith('```') ||
        /^#{1,4}\s+/.test(cur) ||
        /^([•\-*])\s+/.test(cur) ||
        /^\d+[.)]\s+/.test(cur) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(cur) ||
        (cur.includes('|') && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1]))
      ) {
        break;
      }
      paraLines.push(cur);
      i += 1;
    }
    const p = document.createElement('p');
    p.className = 'md-p';
    paraLines.forEach((lineStr, idx) => {
      if (idx > 0) p.appendChild(document.createElement('br'));
      appendInlineFormatted(p, lineStr);
    });
    container.appendChild(p);
  }
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

    // Ephemeral session chat — wipes automatically when the app closes/reloads!
    this.chatHistory = [];
    // Starts in everyday Hindi; immediately matches English whenever user types English
    this.sessionLang = 'hindi';

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
    this.bindRobotPresence();
    this.bindEvents();
    this.bindConnectivityListeners();
    this.checkServerStatus();
    this.setMood('happy');
    this.renderChatView();
    this.scheduleStartupGreeting();
  }

  /**
   * Give Kibo physical presence: smooth pointer eye-tracking on the floating robot + hover wave.
   */
  bindRobotPresence() {
    const fabAvatar = this.dom.fabAvatar;
    const fabBtn = this.dom.fabBtn;
    if (!fabAvatar || !fabBtn) return;

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let rafPending = false;
    let lastClientX = 0;
    let lastClientY = 0;

    const updateEyeTrack = () => {
      rafPending = false;
      if (document.body.classList.contains('is-typing-active')) return;
      const rect = fabBtn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = lastClientX - cx;
      const dy = lastClientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist > 460) {
        fabAvatar.style.setProperty('--eye-x', '0px');
        fabAvatar.style.setProperty('--eye-y', '0px');
        return;
      }

      const factor = Math.min(1, dist / 220);
      const angle = Math.atan2(dy, dx);
      const ex = (Math.cos(angle) * 2.2 * factor).toFixed(2);
      const ey = (Math.sin(angle) * 1.5 * factor).toFixed(2);
      fabAvatar.style.setProperty('--eye-x', `${ex}px`);
      fabAvatar.style.setProperty('--eye-y', `${ey}px`);
    };

    window.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        if (!rafPending) {
          rafPending = true;
          window.requestAnimationFrame(updateEyeTrack);
        }
      },
      { passive: true }
    );

    fabBtn.addEventListener('pointerenter', () => {
      fabAvatar.classList.add('is-hover-wave');
    });

    fabBtn.addEventListener('pointerleave', () => {
      fabAvatar.classList.remove('is-hover-wave');
      fabAvatar.style.setProperty('--eye-x', '0px');
      fabAvatar.style.setProperty('--eye-y', '0px');
    });
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
    if (this.dom.fabBtn) {
      for (const m of valid) {
        this.dom.fabBtn.classList.remove(`mood-${m}`);
      }
      this.dom.fabBtn.classList.add(`mood-${applied}`);
    }
  }

  // ==========================================================================
  // Proactive Startup Greeting + Online/Offline Reactions
  // ==========================================================================

  scheduleStartupGreeting() {
    if (this.startupTimerId) window.clearTimeout(this.startupTimerId);
    this.startupTimerId = window.setTimeout(() => {
      if (this.isChatOpen || document.body.classList.contains('is-typing-active')) return;
      const ctx = buildBuddyContext(this.activeLayoutFilter, 'hindi');
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
      this.serverStatus = { configured: false, model: 'offline' };
      this.showPopup({
        title: 'इंटरनेट बंद है क्या?',
        text: 'लगता है internet बंद है या WiFi connect नहीं है। कोई बात नहीं—typing प्रैक्टिस offline भी बिल्कुल स्मूद चलेगी!',
        mood: 'concerned',
        durationMs: 12000,
        actions: [
          {
            label: 'ठीक है, प्रैक्टिस करते हैं',
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
        title: userName === 'दोस्त' ? 'इंटरनेट वापस आ गया!' : `नेट वापस आ गया, ${userName}!`,
        text: 'Kibo फिर से लाइव AI मोड में तैयार है—आइए बात करें या नया custom टेस्ट बनाएँ।',
        mood: 'celebrate',
        durationMs: 8000,
        actions: [
          {
            label: 'Kibo से Chat करें',
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
    const btnSize = 68;
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
    root.classList.toggle('bubble-below', clamped.y < 200);

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

    const ctx = buildBuddyContext(layoutFilter, this.sessionLang);
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
          ? `Analyzing your latest sessions, ${userName}...`
          : `${userName}, आपके पिछले टेस्ट का विश्लेषण हो रहा है...`;
    }
    if (this.dom.perfMeta) {
      this.dom.perfMeta.textContent = 'Kibo AI Coach · Weak keys और speed pattern स्कैन हो रहे हैं';
    }
    if (this.dom.perfWhyText) {
      this.dom.perfWhyText.textContent =
        language === 'english'
          ? 'Scanning mistake patterns and finger transitions...'
          : 'आपकी गलतियों और उंगलियों के rhythm का विश्लेषण चल रहा है...';
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
      this.dom.perfHeadline.textContent = brief.headline || `${ctx.userName}, आइए प्रैक्टिस को बेहतर बनाएँ।`;
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
        : 'Recommended Practice शुरू करें';
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
                'Break down exactly why I keep missing my top weak keys and which exact finger should press each one.',
            },
            {
              label: 'Build a custom test',
              prompt: `Build a custom 3-minute practice test targeting my weak keys in ${ctx.effectiveLayout}.`,
            },
            {
              label: 'Review my last run',
              prompt: 'Give me a structured review of my most recent typing session and what to fix next.',
            },
          ]
        : [
            {
              label: 'ये keys क्यों गलत हो रही हैं?',
              prompt: 'मेरी top weak keys बार-बार गलत क्यों हो रही हैं? सही उंगली और सुधारने का तरीका बताओ।',
            },
            {
              label: 'Custom Test बनाओ',
              prompt: `${ctx.effectiveLayout} में मेरी weak keys के लिए एक 3-minute custom practice test बना दो।`,
            },
            {
              label: 'पिछले टेस्ट का Review',
              prompt: 'मेरे सबसे पिछले टेस्ट का पूरा structured review दो—क्या अच्छा रहा और कहाँ सुधारना है?',
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
  // Interactive Chat Drawer (Ephemeral Session + Persistent Long-Term Memory)
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
    const ctx = buildBuddyContext(this.activeLayoutFilter, this.sessionLang);

    if (this.dom.chatSubtitle) {
      if (!navigator.onLine) {
        this.dom.chatSubtitle.textContent = 'Offline मोड · नेट आते ही Live AI चालू होगा';
      } else {
        const testsText = `${ctx.overall.totalTests} ${ctx.overall.totalTests === 1 ? 'test' : 'tests'}`;
        this.dom.chatSubtitle.textContent = `${ctx.userName} · ${testsText} · ${ctx.overall.weightedAvgWpm} WPM`;
      }
    }

    if (this.dom.chatInput) {
      this.dom.chatInput.placeholder =
        this.sessionLang === 'english'
          ? 'Ask Kibo about speed, accuracy, or a custom test...'
          : 'Kibo से पूछें — गलती, स्पीड या custom test...';
    }

    this.dom.chatMessages.textContent = '';

    if (this.chatHistory.length === 0) {
      const welcome = document.createElement('div');
      welcome.className = 'chat-msg chat-msg-assistant';
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      let intro;
      if (!navigator.onLine) {
        intro = [
          '### लगता है आप Offline हैं',
          'क्या आपने internet बंद किया है या WiFi connect नहीं है? कोई बात नहीं—typing प्रैक्टिस offline भी बिल्कुल स्मूद चलेगी, और नेट आते ही हम लाइव बात करेंगे।',
        ].join('\n');
      } else if (ctx.overall.totalTests > 0) {
        intro = [
          `नमस्ते **${ctx.userName}**! मैं **Kibo** हूँ—आपका AI typing coach।`,
          '',
          `अभी तक आपके **${ctx.overall.totalTests} टेस्ट** रिकॉर्ड हैं (**${ctx.overall.weightedAvgWpm} avg WPM**, **${ctx.overall.weightedAccuracy}% accuracy**)। आप मुझसे कुछ भी पूछ सकते हैं—Hindi या English दोनों में:`,
          '- किसी भी कमज़ोर key की सही उंगली और सुधारने का तरीका',
          '- WPM और accuracy बढ़ाने की exact तकनीक',
          '- किसी भी टॉपिक, नंबर-रो या exam (SSC / CPCT / Court) के लिए **Custom Practice Test**',
        ].join('\n');
      } else {
        intro = [
          'नमस्ते! मैं **Kibo** हूँ—आपका AI typing mentor।',
          '',
          'आप हिंदी या English किसी भी भाषा में बात कर सकते हैं। शुरुआत करने के लिए बताइए—आप किस **goal या exam** के लिए typing सीख रहे हैं, और आपको किस नाम से बुलाऊँ?',
        ].join('\n');
      }
      renderSafeMarkdown(bubble, intro);
      welcome.appendChild(bubble);
      this.dom.chatMessages.appendChild(welcome);
    } else {
      for (const msg of this.chatHistory) {
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
    if (msg.role === 'user') {
      bubble.textContent = msg.content;
    } else {
      renderSafeMarkdown(bubble, msg.content);
    }
    wrap.appendChild(bubble);

    // Rich Custom Practice Test Card
    if (msg.role === 'assistant' && msg.customTest && msg.customTest.text) {
      const ct = msg.customTest;
      const card = document.createElement('div');
      card.className = 'chat-custom-test-card';

      const head = document.createElement('div');
      head.className = 'ct-card-head';

      const titleEl = document.createElement('div');
      titleEl.className = 'ct-card-title';
      titleEl.textContent = ct.title || 'Kibo Custom Practice Test';

      const layoutMeta = (LAYOUTS[ct.layout] || LAYOUTS.english).shortName;
      const wordCount = ct.text.split(/\s+/).filter(Boolean).length;
      const metaEl = document.createElement('div');
      metaEl.className = 'ct-card-meta tabular-nums';
      metaEl.textContent = `${layoutMeta} · ${wordCount} words · ${ct.durationMinutes || 3} min`;

      head.appendChild(titleEl);
      head.appendChild(metaEl);

      const previewEl = document.createElement('p');
      previewEl.className = 'ct-card-preview';
      previewEl.textContent = ct.text;

      const launchBtn = document.createElement('button');
      launchBtn.type = 'button';
      launchBtn.className = 'chat-drill-btn';
      launchBtn.textContent =
        this.sessionLang === 'english' ? 'Start Practice Test' : 'ये Practice Test शुरू करें';
      launchBtn.addEventListener('click', () => {
        if (typeof this.callbacks.onLaunchCustomDrill === 'function') {
          this.closeChat();
          this.callbacks.onLaunchCustomDrill({
            title: ct.title,
            text: ct.text,
            layout: ct.layout,
            durationMinutes: ct.durationMinutes,
          });
        }
      });

      card.appendChild(head);
      card.appendChild(previewEl);
      card.appendChild(launchBtn);
      wrap.appendChild(card);
    }

    // Subtle confirmation note when new long-term personal memory was stored
    if (
      msg.role === 'assistant' &&
      Array.isArray(msg.savedMemories) &&
      msg.savedMemories.length > 0
    ) {
      const memNote = document.createElement('div');
      memNote.className = 'chat-memory-note';
      const prefix = this.sessionLang === 'english' ? 'Saved to memory:' : 'Long-term memory में सेव:';
      memNote.textContent = `${prefix} ${msg.savedMemories.join(' · ')}`;
      wrap.appendChild(memNote);
    }

    this.dom.chatMessages.appendChild(wrap);
  }

  renderChatQuickSuggestions(ctx) {
    if (!this.dom.chatQuickRow) return;
    this.dom.chatQuickRow.textContent = '';

    const suggestions = [];
    if (this.sessionLang === 'english') {
      if (ctx.patterns.weakest.length > 0) {
        suggestions.push(`Why do I miss "${ctx.patterns.weakest[0].displayChar}"?`);
      } else {
        suggestions.push('How do I boost WPM & accuracy?');
      }
      suggestions.push('Build a custom weak-keys test');
      suggestions.push('Review my last test');
    } else {
      if (ctx.patterns.weakest.length > 0) {
        suggestions.push(`"${ctx.patterns.weakest[0].displayChar}" गलत क्यों होता है?`);
      } else {
        suggestions.push('स्पीड और accuracy कैसे बढ़ाएँ?');
      }
      suggestions.push('Custom practice test बनाओ');
      suggestions.push(ctx.patterns.isHindi ? 'Hindi मात्रा टिप्स' : 'पिछले टेस्ट का review');
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
          'Chat बंद होते ही conversation हट जाती है, लेकिन आपके बारे में ज़रूरी बातें (नाम, exam, target WPM, keyboard) यहाँ हमेशा के लिए सेव रहती हैं।';
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

  /**
   * Persist extracted personal facts (name, goal, memories[]) into permanent long-term memory.
   * Returns a list of human-readable labels for facts newly stored on this turn.
   */
  applyLongTermMemoryUpdates({ detectedName, detectedGoal, memoryUpdates }) {
    const saved = [];
    const current = loadBuddyState();

    const cleanName = String(detectedName || '').trim().slice(0, 32);
    if (cleanName && cleanName.toLowerCase() !== (current.preferredName || '').toLowerCase()) {
      saveBuddyState({ preferredName: cleanName, cachedFingerprint: '' });
      saved.push(`Name: ${cleanName}`);
    }

    const cleanGoal = String(detectedGoal || '').trim().slice(0, 90);
    if (cleanGoal && cleanGoal.toLowerCase() !== (current.goal || '').toLowerCase()) {
      saveBuddyState({ goal: cleanGoal, cachedFingerprint: '' });
      saved.push(`Goal: ${cleanGoal}`);
    }

    if (Array.isArray(memoryUpdates)) {
      for (const note of memoryUpdates) {
        const res = appendBuddyMemory(note);
        if (res && res.added) {
          saved.push(String(note).trim());
        }
      }
    }

    return saved;
  }

  async sendChatMessage(rawText) {
    const text = String(rawText || '').trim().slice(0, 500);
    if (!text || this.isChatLoading) return;

    this.isChatLoading = true;
    if (this.dom.chatInput) this.dom.chatInput.value = '';
    if (this.dom.chatSendBtn) this.dom.chatSendBtn.disabled = true;

    // Instant language match on this exact message!
    this.sessionLang = detectTurnLanguage(text, this.sessionLang);

    // Push into ephemeral RAM chat history (clears when app closes)
    this.chatHistory = [...this.chatHistory, { role: 'user', content: text }].slice(-30);
    this.renderChatView();

    this.setMood('thinking');
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-msg chat-msg-assistant chat-msg-typing';
    typingEl.innerHTML =
      '<div class="chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
    this.dom.chatMessages?.appendChild(typingEl);
    this.scrollChatToBottom();

    const ctx = buildBuddyContext(this.activeLayoutFilter, this.sessionLang);

    const priorTurns = this.chatHistory.slice(0, -1).slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let assistantReply = '';
    let replyMood = 'happy';
    let customTest = null;
    let savedMemories = [];

    if (!navigator.onLine) {
      const fb = buildLocalFallbackReply(text, ctx, 'OFFLINE');
      assistantReply = fb.reply;
      replyMood = fb.mood;
      customTest = fb.customTest || null;
    } else {
      try {
        const resp = await fetch('/api/buddy/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            userName: ctx.userName,
            language: this.sessionLang,
            digest: ctx.digest,
            history: priorTurns,
          }),
        });
        const data = await resp.json().catch(() => null);

        if (resp.ok && data?.ok && data.reply) {
          assistantReply = data.reply;
          replyMood = data.mood || 'happy';
          customTest = data.customTest || null;
          savedMemories = this.applyLongTermMemoryUpdates({
            detectedName: data.detectedName,
            detectedGoal: data.detectedGoal,
            memoryUpdates: data.memoryUpdates,
          });
        } else {
          const fb = buildLocalFallbackReply(text, ctx, data?.code || 'UPSTREAM_ERROR');
          assistantReply = fb.reply;
          replyMood = fb.mood;
          customTest = fb.customTest || null;
        }
      } catch {
        const fb = buildLocalFallbackReply(text, ctx, 'OFFLINE');
        assistantReply = fb.reply;
        replyMood = fb.mood;
        customTest = fb.customTest || null;
      }
    }

    typingEl.remove();

    this.chatHistory = [
      ...this.chatHistory,
      {
        role: 'assistant',
        content: assistantReply,
        customTest: customTest || undefined,
        savedMemories: savedMemories.length > 0 ? savedMemories : undefined,
      },
    ].slice(-30);

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
        text: `बेहतरीन प्रदर्शन — ${summary.netWpm} WPM और ${summary.accuracy}% accuracy। आइए इसका breakdown देखें।`,
        mood: 'celebrate',
        durationMs: 10000,
        actions: [
          {
            label: 'Review देखें',
            primary: true,
            onClick: () =>
              this.openChat('मेरा अभी नया PB आया है! मेरे इस टेस्ट का review दो और अगला टारगेट बताओ।'),
          },
        ],
      });
    } else if (summary.accuracy >= 97 && summary.totalChars >= 20) {
      this.showPopup({
        title: `शानदार ${summary.accuracy}% Accuracy!`,
        text: `कंट्रोल बहुत साफ रहा, ${userName}। अगले टेस्ट में स्पीड बढ़ाने की तकनीक जाननी है?`,
        mood: 'happy',
        durationMs: 8500,
        actions: [
          {
            label: 'स्पीड टिप्स लें',
            primary: true,
            onClick: () => this.openChat('मेरी accuracy बढ़िया रही, अब speed कैसे बढ़ाऊँ?'),
          },
        ],
      });
    } else if (summary.errorChars >= 6) {
      this.showPopup({
        title: `इस टेस्ट में ${summary.errorChars} गलतियाँ हुईं`,
        text: 'कोई बात नहीं—मैंने पकड़ लिया कौन सी keys चूक रहीं हैं। आइए तुरंत एक targeted drill बनाएँ।',
        mood: 'concerned',
        durationMs: 9500,
        actions: [
          {
            label: 'गलतियाँ ठीक करें',
            primary: true,
            onClick: () =>
              this.openChat('इस टेस्ट में मुझसे गलतियाँ क्यों हुईं और इन्हें सुधारने के लिए एक custom drill दो।'),
          },
        ],
      });
    } else {
      this.showPopup({
        title: `टेस्ट पूरा हुआ — ${summary.netWpm} WPM`,
        text: 'क्या आप इस सेशन का quick review या एक custom practice test चाहेंगे?',
        mood: 'coach',
        durationMs: 8000,
        actions: [
          {
            label: 'Quick Review',
            primary: true,
            onClick: () => this.openChat('मेरे इस टेस्ट का quick structured review दो।'),
          },
        ],
      });
    }
  }

  onVaultChanged() {
    this.chatHistory = [];
    this.sessionLang = 'hindi';
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
      this.openChat('मेरा टेस्ट अभी खत्म हुआ। कृपया structured review दो—क्या अच्छा रहा और गलतियाँ क्यों हुईं?');
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
    });

    this.dom.chatClearBtn?.addEventListener('click', () => {
      this.chatHistory = [];
      this.sessionLang = 'hindi';
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
