/**
 * AksharType — Keyboard Layout Definitions & Devanagari Keystroke Compiler
 * Supports: English QWERTY, Hindi Mangal (InScript), Hindi Mangal (Remington Gail), Hindi Kruti Dev 010
 */

export const LAYOUTS = {
  english: {
    id: 'english',
    name: 'English',
    shortName: 'English',
    language: 'english',
    isHindi: false,
  },
  mangal: {
    id: 'mangal',
    name: 'हिन्दी — मंगल',
    shortName: 'मंगल',
    language: 'hindi',
    isHindi: true,
  },
  'kruti-dev': {
    id: 'kruti-dev',
    name: 'हिन्दी — कृति देव 010',
    shortName: 'कृति देव',
    language: 'hindi',
    isHindi: true,
  },
};

/**
 * Physical ANSI keyboard rows for the On-Screen Keymap Guide.
 * Each entry: [unshiftedEventKey, shiftedEventKey, widthClass?]
 */
export const PHYSICAL_ROWS = [
  [
    ['`', '~'],
    ['1', '!'],
    ['2', '@'],
    ['3', '#'],
    ['4', '$'],
    ['5', '%'],
    ['6', '^'],
    ['7', '&'],
    ['8', '*'],
    ['9', '('],
    ['0', ')'],
    ['-', '_'],
    ['=', '+'],
  ],
  [
    ['q', 'Q'],
    ['w', 'W'],
    ['e', 'E'],
    ['r', 'R'],
    ['t', 'T'],
    ['y', 'Y'],
    ['u', 'U'],
    ['i', 'I'],
    ['o', 'O'],
    ['p', 'P'],
    ['[', '{'],
    [']', '}'],
    ['\\', '|'],
  ],
  [
    ['a', 'A'],
    ['s', 'S'],
    ['d', 'D'],
    ['f', 'F'],
    ['g', 'G'],
    ['h', 'H'],
    ['j', 'J'],
    ['k', 'K'],
    ['l', 'L'],
    [';', ':'],
    ["'", '"'],
  ],
  [
    ['z', 'Z'],
    ['x', 'X'],
    ['c', 'C'],
    ['v', 'V'],
    ['b', 'B'],
    ['n', 'N'],
    ['m', 'M'],
    [',', '<'],
    ['.', '>'],
    ['/', '?'],
  ],
];

/**
 * DOE Standard Mangal InScript keymap (physical event.key -> Devanagari char/string)
 */
export const INSCRIPT_MAP = {
  // Row 1
  '`': 'ॊ',
  '~': 'ऒ',
  '1': '1',
  '!': 'ऍ',
  '2': '2',
  '@': 'ॅ',
  '3': '3',
  '#': '्र',
  '4': '4',
  '$': 'र्',
  '5': '5',
  '%': 'ज्ञ',
  '6': '6',
  '^': 'त्र',
  '7': '7',
  '&': 'क्ष',
  '8': '8',
  '*': 'श्र',
  '9': '9',
  '(': '(',
  '0': '0',
  ')': ')',
  '-': '-',
  '_': 'ः',
  '=': 'ृ',
  '+': 'ऋ',

  // Row 2
  q: 'ौ',
  Q: 'औ',
  w: 'ै',
  W: 'ऐ',
  e: 'ा',
  E: 'आ',
  r: 'ी',
  R: 'ई',
  t: 'ू',
  T: 'ऊ',
  y: 'ब',
  Y: 'भ',
  u: 'ह',
  U: 'ङ',
  i: 'ग',
  I: 'घ',
  o: 'द',
  O: 'ध',
  p: 'ज',
  P: 'झ',
  '[': 'ड',
  '{': 'ढ',
  ']': '़',
  '}': 'ञ',
  '\\': 'ॉ',
  '|': 'ऑ',

  // Row 3
  a: 'ो',
  A: 'ओ',
  s: 'े',
  S: 'ए',
  d: '्',
  D: 'अ',
  f: 'ि',
  F: 'इ',
  g: 'ु',
  G: 'उ',
  h: 'प',
  H: 'फ',
  j: 'र',
  J: 'ऱ',
  k: 'क',
  K: 'ख',
  l: 'त',
  L: 'थ',
  ';': 'च',
  ':': 'छ',
  "'": 'ट',
  '"': 'ठ',

  // Row 4
  z: 'ॆ',
  Z: 'ऎ',
  x: 'ं',
  X: 'ँ',
  c: 'म',
  C: 'ण',
  v: 'न',
  V: 'ऩ',
  b: 'व',
  B: 'ळ',
  n: 'ल',
  N: 'ळ',
  m: 'स',
  M: 'श',
  ',': ',',
  '<': 'ष',
  '.': '.',
  '>': '।',
  '/': 'य',
  '?': 'य़',
  ' ': ' ',
};

/**
 * Mangal Remington Gail keymap (physical event.key -> display glyph on keycap)
 */
export const REMINGTON_GAIL_MAP = {
  // Row 1
  '`': '़',
  '~': 'द्य',
  '1': '1',
  '!': '!',
  '2': '2',
  '@': '/',
  '3': '3',
  '#': 'रु',
  '4': '4',
  '$': '+',
  '5': '5',
  '%': 'ः',
  '6': '6',
  '^': '‘',
  '7': '7',
  '&': '-',
  '8': '8',
  '*': '’',
  '9': '9',
  '(': ';',
  '0': '0',
  ')': 'द्ध',
  '-': '.',
  '_': 'ऋ',
  '=': 'ृ',
  '+': '्',

  // Row 2
  q: 'ु',
  Q: 'फ',
  w: 'ू',
  W: 'ँ',
  e: 'म',
  E: 'म्',
  r: 'त',
  R: 'त्',
  t: 'ज',
  T: 'ज्',
  y: 'ल',
  Y: 'ल्',
  u: 'न',
  U: 'न्',
  i: 'प',
  I: 'प्',
  o: 'व',
  O: 'व्',
  p: 'च',
  P: 'च्',
  '[': 'ख्',
  '{': 'क्ष्',
  ']': ',',
  '}': 'द्व',
  '\\': '?',
  '|': '़',

  // Row 3
  a: 'ं',
  A: '।',
  s: 'े',
  S: 'ै',
  d: 'क',
  D: 'क्',
  f: 'ि',
  F: 'थ्',
  g: 'ह',
  G: 'ळ',
  h: 'ी',
  H: 'भ्',
  j: 'र',
  J: 'श्र',
  k: 'ा',
  K: 'ज्ञ',
  l: 'स',
  L: 'स्',
  ';': 'य',
  ':': 'रू',
  "'": 'श्',
  '"': 'ष्',

  // Row 4
  z: '्र',
  Z: 'र्',
  x: 'ग',
  X: 'ग्',
  c: 'ब',
  C: 'ब्',
  v: 'अ',
  V: 'ट',
  b: 'इ',
  B: 'ठ',
  n: 'द',
  N: 'छ',
  m: 'उ',
  M: 'ड',
  ',': 'ए',
  '<': 'ढ',
  '.': 'ण्',
  '>': 'झ',
  '/': 'ध्',
  '?': 'घ्',
  ' ': ' ',
};

/**
 * Kruti Dev 010 keymap (Remington heritage with Kruti Dev 010 specifics: `=ृ, ==त्र, G=ह्)
 */
export const KRUTI_DEV_MAP = {
  ...REMINGTON_GAIL_MAP,
  '`': 'ृ',
  '=': 'त्र',
  G: 'ह्',
  '\\': '?',
  '|': '़',
};

// Reverse map for InScript (Unicode char -> physical key)
const INSCRIPT_REVERSE = {};
for (const [key, ch] of Object.entries(INSCRIPT_MAP)) {
  if (!(ch in INSCRIPT_REVERSE)) {
    INSCRIPT_REVERSE[ch] = key;
  }
}

/**
 * Return the keycap display label map for a given layout.
 */
export function getKeycapMap(layoutId) {
  if (layoutId === 'mangal' || layoutId === 'mangal-inscript') return INSCRIPT_MAP;
  if (layoutId === 'kruti-dev') return KRUTI_DEV_MAP;
  return null; // English uses raw key letters
}

/**
 * Segment text into grapheme clusters (keeps Devanagari matras and conjuncts intact).
 */
function segmentGraphemes(text) {
  const normalized = text.normalize('NFC');
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('hi', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(normalized), (s) => s.segment);
  }
  return Array.from(normalized);
}

/**
 * Compile a Devanagari grapheme cluster into physical key sequence(s) for Mangal InScript.
 */
function compileInScriptCluster(cluster) {
  const codepoints = Array.from(cluster);
  const primary = [];
  const alts = [];

  // Check for standard 3-codepoint conjunct shortcuts (क्ष, त्र, ज्ञ, श्र)
  const shortcutPrefixes = [
    { seq: 'क्ष', key: '&' },
    { seq: 'त्र', key: '^' },
    { seq: 'ज्ञ', key: '%' },
    { seq: 'श्र', key: '*' },
  ];

  // Build standard codepoint-by-codepoint sequence
  for (const cp of codepoints) {
    primary.push(INSCRIPT_REVERSE[cp] || cp);
  }

  for (const sc of shortcutPrefixes) {
    if (cluster.startsWith(sc.seq)) {
      const rest = Array.from(cluster.slice(sc.seq.length)).map(
        (cp) => INSCRIPT_REVERSE[cp] || cp
      );
      const shortcutSeq = [sc.key, ...rest];
      // Make shortcut primary and full decomposed form alternate (both accepted!)
      alts.push(primary);
      return { keySeq: shortcutSeq, altKeySeqs: alts };
    }
  }

  // Handle common Nukta precomposed codepoints (ड़, ढ़, क़, ख़, ग़, ज़, फ़)
  const nuktaDecomp = {
    'क़': ['k', ']'],
    'ख़': ['K', ']'],
    'ग़': ['i', ']'],
    'ज़': ['p', ']'],
    'ड़': ['[', ']'],
    'ढ़': ['{', ']'],
    'फ़': ['H', ']'],
  };
  if (codepoints.some((cp) => cp in nuktaDecomp)) {
    const seq = [];
    for (const cp of codepoints) {
      if (cp in nuktaDecomp) {
        seq.push(...nuktaDecomp[cp]);
      } else {
        seq.push(INSCRIPT_REVERSE[cp] || cp);
      }
    }
    return { keySeq: seq, altKeySeqs: [] };
  }

  return { keySeq: primary, altKeySeqs: [] };
}

/**
 * Compile a Devanagari grapheme cluster into physical key sequence(s) for
 * Mangal Remington Gail or Kruti Dev 010.
 */
function compileRemingtonCluster(cluster, isKruti) {
  let working = cluster.normalize('NFC');
  const keys = [];
  let appendReph = false;

  // 1. Pre-base Chhoti-i matra (ि) is typed FIRST in Remington & Kruti Dev
  if (working.includes('ि')) {
    keys.push('f');
    working = working.replace(/ि/g, '');
  }

  // 2. Leading Reph (र् + consonant) is typed AT THE END with 'Z'
  if (working.startsWith('र्') && working.length > 2) {
    appendReph = true;
    working = working.slice(2);
  }

  // Consonants that require [half-key + 'k'] to form full consonant
  const halfThenK = {
    'ख': '[',
    'थ': 'F',
    'भ': 'H',
    'श': "'",
    'ष': '"',
    'ध': '/',
    'घ': '?',
    'ण': '.',
  };

  // Single-key full consonants with optional Shift half-form
  const fullConsonants = {
    'क': { full: 'd', half: 'D' },
    'ग': { full: 'x', half: 'X' },
    'च': { full: 'p', half: 'P' },
    'छ': { full: 'N', half: null },
    'ज': { full: 't', half: 'T' },
    'झ': { full: '>', half: null },
    'ट': { full: 'V', half: null },
    'ठ': { full: 'B', half: null },
    'ड': { full: 'M', half: null },
    'ढ': { full: '<', half: null },
    'त': { full: 'r', half: 'R' },
    'द': { full: 'n', half: null },
    'न': { full: 'u', half: 'U' },
    'प': { full: 'i', half: 'I' },
    'फ': { full: 'Q', half: null },
    'ब': { full: 'c', half: 'C' },
    'म': { full: 'e', half: 'E' },
    'य': { full: ';', half: null },
    'र': { full: 'j', half: null },
    'ल': { full: 'y', half: 'Y' },
    'व': { full: 'o', half: 'O' },
    'स': { full: 'l', half: 'L' },
    'ह': { full: 'g', half: isKruti ? 'G' : null },
    'ळ': { full: 'G', half: null },
    'ङ': { full: 'M', half: null },
    'ञ': { full: 'u', half: null },
  };

  const vowelsAndMarks = {
    'अ': ['v'],
    'आ': ['v', 'k'],
    'इ': ['b'],
    'ई': ['b', 'Z'],
    'उ': ['m'],
    'ऊ': ['m', 'w'],
    'ऋ': ['_'],
    'ए': [','],
    'ऐ': [',', 's'],
    'ओ': ['v', 'k', 's'],
    'औ': ['v', 'k', 'S'],
    'ऑ': ['v', 'k', 'W'],
    'ा': ['k'],
    'ी': ['h'],
    'ु': ['q'],
    'ू': ['w'],
    'ृ': [isKruti ? '`' : '='],
    'े': ['s'],
    'ै': ['S'],
    'ो': ['k', 's'],
    'ौ': ['k', 'S'],
    'ॉ': ['k', 'W'],
    'ॅ': ['W'],
    'ं': ['a'],
    'ँ': ['W'],
    'ः': ['%'],
    '।': ['A'],
    '़': ['|'],
    '्': ['+'],
    ',': [']'],
    '.': ['-'],
    '?': ['\\'],
    '-': ['&'],
    '!': ['!'],
    ';': ['('],
    ' ': [' '],
  };

  // Precomposed nukta letters
  const precomposedNukta = {
    'क़': ['d', '|'],
    'ख़': ['[', 'k', '|'],
    'ग़': ['x', '|'],
    'ज़': ['t', '|'],
    'ड़': ['M', '|'],
    'ढ़': ['<', '|'],
    'फ़': ['Q', '|'],
  };

  const chars = Array.from(working);
  let i = 0;

  while (i < chars.length) {
    const rest = chars.slice(i).join('');

    // Special Remington / Kruti conjuncts
    if (rest.startsWith('क्ष्')) {
      keys.push('{');
      i += 4;
      continue;
    }
    if (rest.startsWith('क्ष')) {
      keys.push('{', 'k');
      i += 3;
      continue;
    }
    if (rest.startsWith('ज्ञ')) {
      keys.push('K');
      i += 3;
      continue;
    }
    if (rest.startsWith('श्र')) {
      keys.push('J');
      i += 3;
      continue;
    }
    if (rest.startsWith('द्य')) {
      keys.push('~');
      i += 3;
      continue;
    }
    if (rest.startsWith('द्ध')) {
      keys.push(')');
      i += 3;
      continue;
    }
    if (rest.startsWith('द्व')) {
      keys.push('}');
      i += 3;
      continue;
    }
    if (isKruti && rest.startsWith('त्र')) {
      keys.push('=');
      i += 3;
      continue;
    }

    const ch = chars[i];
    const next = chars[i + 1];
    const next2 = chars[i + 2];

    // Precomposed nukta
    if (ch in precomposedNukta) {
      keys.push(...precomposedNukta[ch]);
      i += 1;
      continue;
    }

    // Consonant + Rakar (् + र), e.g., प्र = i + z, क्र = d + z, त्र = r + z
    if (next === '्' && next2 === 'र' && (ch in fullConsonants || ch in halfThenK)) {
      if (ch in halfThenK) {
        keys.push(halfThenK[ch], 'k', 'z');
      } else {
        keys.push(fullConsonants[ch].full, 'z');
      }
      i += 3;
      continue;
    }

    // Half-then-K consonants (ख, थ, भ, श, ष, ध, घ, ण)
    if (ch in halfThenK) {
      if (next === '्') {
        keys.push(halfThenK[ch]);
        i += 2;
      } else {
        keys.push(halfThenK[ch], 'k');
        i += 1;
      }
      continue;
    }

    // Standard full consonants
    if (ch in fullConsonants) {
      const entry = fullConsonants[ch];
      if (next === '्') {
        if (entry.half) {
          keys.push(entry.half);
        } else {
          keys.push(entry.full, '+');
        }
        i += 2;
      } else {
        keys.push(entry.full);
        i += 1;
      }
      continue;
    }

    // Vowels, matras & punctuation
    if (ch in vowelsAndMarks) {
      keys.push(...vowelsAndMarks[ch]);
      i += 1;
      continue;
    }

    // Digits or ASCII fallback
    keys.push(ch);
    i += 1;
  }

  if (appendReph) {
    keys.push('Z');
  }

  // Alternate sequence for Kruti Dev त्र (allow both '=' and 'r'+'z')
  const altKeySeqs = [];
  if (isKruti && cluster.includes('त्र')) {
    const gailCompiled = compileRemingtonCluster(cluster, false);
    if (gailCompiled.keySeq.join('') !== keys.join('')) {
      altKeySeqs.push(gailCompiled.keySeq);
    }
  }

  return { keySeq: keys, altKeySeqs };
}

/**
 * Tokenize passage text into visual render tokens + layout-specific keystroke sequences.
 * Returns array of tokens:
 * {
 *   display: string,       // visual text (grapheme cluster or char)
 *   keySeq: string[],      // primary expected physical event.key sequence (Mapper mode)
 *   altKeySeqs: string[][],// alternate valid physical key sequences
 *   unicodeSeq: string[],  // expected Unicode codepoints (OS IME mode)
 *   isSpace: boolean,
 *   state: 'pending' | 'correct' | 'error'
 * }
 */
export function tokenizeForLayout(text, layoutId) {
  const clean = text.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
  const layout = LAYOUTS[layoutId] || LAYOUTS.english;

  if (!layout.isHindi) {
    return Array.from(clean).map((ch) => ({
      display: ch,
      keySeq: [ch],
      altKeySeqs: [],
      unicodeSeq: [ch],
      isSpace: ch === ' ',
      state: 'pending',
    }));
  }

  const graphemes = segmentGraphemes(clean);
  return graphemes.map((cluster) => {
    const isSpace = cluster === ' ';
    const unicodeSeq = Array.from(cluster.normalize('NFC'));

    if (isSpace) {
      return {
        display: ' ',
        keySeq: [' '],
        altKeySeqs: [],
        unicodeSeq: [' '],
        isSpace: true,
        state: 'pending',
      };
    }

    let compiled;
    if (layoutId === 'mangal') {
      compiled = compileInScriptCluster(cluster);
    } else {
      compiled = compileRemingtonCluster(cluster, true);
    }

    return {
      display: cluster,
      keySeq: compiled.keySeq,
      altKeySeqs: compiled.altKeySeqs,
      unicodeSeq,
      isSpace: false,
      state: 'pending',
    };
  });
}

/**
 * Given a physical event.key (e.g. 'H', 'f', ' '), find its base physical key and whether Shift is required.
 */
export function describePhysicalKey(eventKey, layoutId) {
  if (eventKey === ' ') {
    return {
      baseKey: ' ',
      needsShift: false,
      label: 'Space',
      glyph: 'Space',
    };
  }

  const keycapMap = getKeycapMap(layoutId);
  const glyph = keycapMap ? keycapMap[eventKey] || eventKey : eventKey;

  for (const row of PHYSICAL_ROWS) {
    for (const [normal, shifted] of row) {
      if (eventKey === normal) {
        return {
          baseKey: normal,
          needsShift: false,
          label: normal.toUpperCase(),
          glyph,
        };
      }
      if (eventKey === shifted) {
        return {
          baseKey: normal,
          needsShift: true,
          label: `Shift + ${normal.toUpperCase()}`,
          glyph,
        };
      }
    }
  }

  return {
    baseKey: eventKey,
    needsShift: false,
    label: eventKey,
    glyph,
  };
}
