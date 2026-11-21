/**
 * AksharType — Interactive On-Screen Keyboard Layout Guide & Weak-Keys Heatmap Renderer
 */

import { LAYOUTS, PHYSICAL_ROWS, getKeycapMap } from './keymaps.js';

export class KeyboardGuide {
  constructor(gridEl, titleEl) {
    this.gridEl = gridEl;
    this.titleEl = titleEl;
    this.keyElements = new Map();
    this.shiftElements = [];
    this.spaceElement = null;
    this.currentLayout = 'english';
  }

  render(layoutId) {
    if (!this.gridEl) return;
    this.currentLayout = layoutId;
    const layout = LAYOUTS[layoutId] || LAYOUTS.english;
    const map = getKeycapMap(layoutId);
    const isEnglish = !layout.isHindi;

    if (this.titleEl) {
      this.titleEl.textContent = `${layout.name} Keymap`;
    }
    this.gridEl.innerHTML = '';
    this.keyElements.clear();
    this.shiftElements = [];
    this.spaceElement = null;

    PHYSICAL_ROWS.forEach((row, rowIdx) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';

      if (rowIdx === 1) {
        rowEl.appendChild(this._makeModifier('Tab', 'is-wide-sm'));
      } else if (rowIdx === 2) {
        rowEl.appendChild(this._makeModifier('Caps', 'is-wide-md'));
      } else if (rowIdx === 3) {
        const leftShift = this._makeModifier('Shift', 'is-wide-lg');
        this.shiftElements.push(leftShift);
        rowEl.appendChild(leftShift);
      }

      for (const [normal, shifted] of row) {
        const keyEl = document.createElement('div');
        keyEl.className = `kb-key${isEnglish ? ' is-english' : ''}`;
        keyEl.dataset.baseKey = normal;

        const topRow = document.createElement('div');
        topRow.className = 'kb-key-top';

        const qwertyLabel = document.createElement('span');
        qwertyLabel.className = 'kb-key-qwerty';
        qwertyLabel.textContent = isEnglish ? '' : normal;

        const shiftLabel = document.createElement('span');
        shiftLabel.className = 'kb-key-shift';
        shiftLabel.textContent = isEnglish
          ? shifted !== normal.toUpperCase()
            ? shifted
            : ''
          : (map && map[shifted]) || '';

        topRow.appendChild(qwertyLabel);
        topRow.appendChild(shiftLabel);

        const mainLabel = document.createElement('div');
        mainLabel.className = 'kb-key-main';
        mainLabel.textContent = isEnglish
          ? normal.toUpperCase()
          : (map && map[normal]) || normal;

        keyEl.appendChild(topRow);
        keyEl.appendChild(mainLabel);

        rowEl.appendChild(keyEl);
        this.keyElements.set(normal, keyEl);
      }

      if (rowIdx === 0) {
        rowEl.appendChild(this._makeModifier('Locked', 'is-wide-md'));
      } else if (rowIdx === 2) {
        rowEl.appendChild(this._makeModifier('Enter', 'is-wide-md'));
      } else if (rowIdx === 3) {
        const rightShift = this._makeModifier('Shift', 'is-wide-lg');
        this.shiftElements.push(rightShift);
        rowEl.appendChild(rightShift);
      }

      this.gridEl.appendChild(rowEl);
    });

    const bottomRow = document.createElement('div');
    bottomRow.className = 'kb-row';
    bottomRow.appendChild(this._makeModifier('Ctrl', 'is-wide-sm'));
    bottomRow.appendChild(this._makeModifier('Alt', 'is-wide-sm'));

    const spaceEl = document.createElement('div');
    spaceEl.className = 'kb-key is-spacebar is-modifier';
    spaceEl.textContent = 'Space';
    this.spaceElement = spaceEl;
    bottomRow.appendChild(spaceEl);

    bottomRow.appendChild(this._makeModifier('Alt', 'is-wide-sm'));
    bottomRow.appendChild(this._makeModifier('Ctrl', 'is-wide-sm'));
    this.gridEl.appendChild(bottomRow);
  }

  _makeModifier(label, widthClass) {
    const el = document.createElement('div');
    el.className = `kb-key is-modifier ${widthClass || ''}`.trim();
    el.textContent = label;
    return el;
  }

  highlightTarget(keyInfo) {
    for (const el of this.keyElements.values()) {
      el.classList.remove('is-target');
    }
    for (const sh of this.shiftElements) {
      sh.classList.remove('is-target');
    }
    if (this.spaceElement) {
      this.spaceElement.classList.remove('is-target');
    }

    if (!keyInfo) return;

    if (keyInfo.baseKey === ' ') {
      if (this.spaceElement) this.spaceElement.classList.add('is-target');
      return;
    }

    const keyEl = this.keyElements.get(keyInfo.baseKey);
    if (keyEl) keyEl.classList.add('is-target');

    if (keyInfo.needsShift) {
      for (const sh of this.shiftElements) {
        sh.classList.add('is-target');
      }
    }
  }

  flashKey(eventKey) {
    let targetEl = null;
    if (eventKey === ' ') {
      targetEl = this.spaceElement;
    } else {
      for (const row of PHYSICAL_ROWS) {
        for (const [normal, shifted] of row) {
          if (eventKey === normal || eventKey === shifted) {
            targetEl = this.keyElements.get(normal);
            break;
          }
        }
        if (targetEl) break;
      }
    }

    if (!targetEl) return;
    targetEl.classList.add('is-pressed');
    window.setTimeout(() => {
      targetEl.classList.remove('is-pressed');
    }, 110);
  }
}

/**
 * Render a Weak-Keys Keyboard Heatmap for the Performance Dashboard.
 */
export function renderWeakKeyHeatmap(containerEl, layoutId, byPhysicalKey, statusLabelEl) {
  if (!containerEl) return;
  const layout = LAYOUTS[layoutId] || LAYOUTS.english;
  const map = getKeycapMap(layoutId);
  const isEnglish = !layout.isHindi;

  containerEl.innerHTML = '';

  const applyHeatState = (keyEl, baseKey, label) => {
    const stats = byPhysicalKey[baseKey];
    if (!stats || stats.total === 0) {
      keyEl.title = `${label}: No attempts yet`;
      return;
    }
    const err = stats.errorRate;
    if (stats.misses === 0) {
      keyEl.classList.add('heat-clean');
    } else if (err < 10) {
      keyEl.classList.add('heat-low');
    } else if (err < 25) {
      keyEl.classList.add('heat-med');
    } else {
      keyEl.classList.add('heat-high');
    }
    const detail = `${label} — ${stats.misses} mistakes / ${stats.total} hits (${err}% error)`;
    keyEl.title = detail;
    keyEl.addEventListener('mouseenter', () => {
      if (statusLabelEl) statusLabelEl.textContent = detail;
    });
  };

  PHYSICAL_ROWS.forEach((row, rowIdx) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';

    if (rowIdx === 1) {
      const m = document.createElement('div');
      m.className = 'kb-key is-modifier is-wide-sm';
      m.textContent = 'Tab';
      rowEl.appendChild(m);
    } else if (rowIdx === 2) {
      const m = document.createElement('div');
      m.className = 'kb-key is-modifier is-wide-md';
      m.textContent = 'Caps';
      rowEl.appendChild(m);
    } else if (rowIdx === 3) {
      const m = document.createElement('div');
      m.className = 'kb-key is-modifier is-wide-lg';
      m.textContent = 'Shift';
      rowEl.appendChild(m);
    }

    for (const [normal, shifted] of row) {
      const keyEl = document.createElement('div');
      keyEl.className = `kb-key kb-heat-key${isEnglish ? ' is-english' : ''}`;

      const stats = byPhysicalKey[normal];
      const topRow = document.createElement('div');
      topRow.className = 'kb-key-top';

      const leftSpan = document.createElement('span');
      leftSpan.className = 'kb-key-qwerty';
      leftSpan.textContent = isEnglish ? '' : normal;

      const rightSpan = document.createElement('span');
      rightSpan.className = 'kb-heat-pct tabular-nums';
      rightSpan.textContent = stats && stats.misses > 0 ? `${stats.errorRate}%` : '';

      topRow.appendChild(leftSpan);
      topRow.appendChild(rightSpan);

      const mainLabel = document.createElement('div');
      mainLabel.className = 'kb-key-main';
      mainLabel.textContent = isEnglish
        ? normal.toUpperCase()
        : (map && map[normal]) || normal;

      keyEl.appendChild(topRow);
      keyEl.appendChild(mainLabel);

      const humanLabel = isEnglish
        ? normal.toUpperCase()
        : `${(map && map[normal]) || normal} (${normal.toUpperCase()})`;
      applyHeatState(keyEl, normal, humanLabel);

      rowEl.appendChild(keyEl);
    }

    if (rowIdx === 0) {
      const m = document.createElement('div');
      m.className = 'kb-key is-modifier is-wide-md';
      m.textContent = 'Locked';
      rowEl.appendChild(m);
    } else if (rowIdx === 2) {
      const m = document.createElement('div');
      m.className = 'kb-key is-modifier is-wide-md';
      m.textContent = 'Enter';
      rowEl.appendChild(m);
    } else if (rowIdx === 3) {
      const m = document.createElement('div');
      m.className = 'kb-key is-modifier is-wide-lg';
      m.textContent = 'Shift';
      rowEl.appendChild(m);
    }

    containerEl.appendChild(rowEl);
  });

  // Spacebar row
  const bottomRow = document.createElement('div');
  bottomRow.className = 'kb-row';
  const spaceEl = document.createElement('div');
  spaceEl.className = 'kb-key kb-heat-key is-spacebar is-modifier';
  const spaceStats = byPhysicalKey[' '];
  spaceEl.textContent =
    spaceStats && spaceStats.misses > 0 ? `Space · ${spaceStats.errorRate}% err` : 'Space';
  applyHeatState(spaceEl, ' ', 'Space');
  bottomRow.appendChild(spaceEl);
  containerEl.appendChild(bottomRow);
}
