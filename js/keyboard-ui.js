/**
 * AksharType — Interactive On-Screen Keyboard Layout Guide
 * Displays Normal & Shift legends for English, Mangal InScript, Mangal Remington Gail, and Kruti Dev 010.
 * Highlights the next required key (and Shift modifier) in real time and flashes pressed keys.
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
    this.currentLayout = layoutId;
    const layout = LAYOUTS[layoutId] || LAYOUTS.english;
    const map = getKeycapMap(layoutId);
    const isEnglish = !layout.isHindi;

    this.titleEl.textContent = `${layout.name} Keymap`;
    this.gridEl.innerHTML = '';
    this.keyElements.clear();
    this.shiftElements = [];
    this.spaceElement = null;

    PHYSICAL_ROWS.forEach((row, rowIdx) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';

      // Left row modifiers for realistic staggered feel
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

      // Right row modifiers
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

    // Bottom Spacebar Row
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

  /**
   * Highlight the target key (and Shift if required) for the upcoming keystroke.
   */
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

  /**
   * Flash the physically pressed key briefly on screen.
   */
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
