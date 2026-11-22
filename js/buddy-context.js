/**
 * AksharType — Kibo AI Buddy Context Compressor, Instant Language Detector & Expert Local Coach
 * Builds a high-precision, token-efficient telemetry digest (~170-240 tokens) for Groq
 * with exact per-key finger zones, instant English/Hindi language matching, and smart offline custom tests.
 */

import { LAYOUTS } from './keymaps.js';
import { getActiveUser } from './auth.js';
import {
  loadPrefs,
  loadHistory,
  loadKeyStats,
  loadBuddyState,
  getPersonalBestForLayout,
} from './storage.js';
import {
  computeDashboardMetrics,
  computeWeakKeyReport,
  evaluateAchievements,
} from './analytics.js';

const FINGER_ZONES = {
  leftPinky: new Set(['`', '1', 'q', 'a', 'z']),
  leftRing: new Set(['2', 'w', 's', 'x']),
  leftMiddle: new Set(['3', 'e', 'd', 'c']),
  leftIndex: new Set(['4', '5', 'r', 't', 'f', 'g', 'v', 'b']),
  rightIndex: new Set(['6', '7', 'y', 'u', 'h', 'j', 'n', 'm']),
  rightMiddle: new Set(['8', 'i', 'k', ',']),
  rightRing: new Set(['9', 'o', 'l', '.']),
  rightPinky: new Set(['0', '-', '=', 'p', '[', ']', '\\', ';', "'", '/']),
};

// Strictly unambiguous Romanized Hindi (Hinglish) words — never overlap with common English words like "me", "to", "ha"
const HINGLISH_MARKERS = new Set([
  'kya', 'hai', 'hain', 'nahi', 'nhi', 'kaise', 'karu', 'karun', 'karna', 'karo', 'karke',
  'mera', 'meri', 'mere', 'mujhe', 'mujhse', 'humara', 'hamara', 'tumhara', 'aapka', 'apna',
  'bhai', 'yaar', 'dost', 'thik', 'theek', 'bata', 'batao', 'bataiye', 'hoon', 'hun', 'hum',
  'tum', 'aap', 'mein', 'aur', 'bhi', 'toh', 'achha', 'accha', 'haan', 'kuch', 'bahut',
  'bohot', 'kam', 'zyada', 'jyada', 'abhi', 'kal', 'aaj', 'chalo', 'galat', 'galti', 'galtiyan',
  'sahi', 'naam', 'kitna', 'kitni', 'kyu', 'kyun', 'kyuki', 'kyunki', 'phir', 'fir', 'lagta',
  'lagti', 'samajh', 'padhai', 'taiyari', 'tyari', 'namaste', 'shukriya', 'dhanyavad', 'bana',
  'banao', 'banaiye', 'sikhao', 'sikha', 'tez', 'dheere', 'ungli', 'matra', 'pichla', 'agla',
  'kaise', 'kahan', 'kab', 'kaun', 'kaisa', 'kaisi', 'wala', 'wali', 'wale', 'chahiye',
]);

function getFingerZone(keyLabel) {
  const clean = String(keyLabel || '').replace(/^Shift\+/i, '').toLowerCase().trim();
  if (clean === 'space') return 'thumb';
  for (const [zone, set] of Object.entries(FINGER_ZONES)) {
    if (set.has(clean)) return zone;
  }
  return 'reach';
}

function zoneTagForPrompt(zone) {
  const map = {
    leftPinky: 'left-pinky',
    leftRing: 'left-ring',
    leftMiddle: 'left-middle',
    leftIndex: 'left-index',
    rightIndex: 'right-index',
    rightMiddle: 'right-middle',
    rightRing: 'right-ring',
    rightPinky: 'right-pinky',
    thumb: 'thumb',
    reach: 'outer-reach',
  };
  return map[zone] || 'outer-reach';
}

function humanizeZoneHindi(zone) {
  const labels = {
    leftPinky: 'बाएँ हाथ की छोटी उंगली (Left Pinky)',
    leftRing: 'बाएँ हाथ की Ring Finger',
    leftMiddle: 'बाएँ हाथ की Middle Finger',
    leftIndex: 'बाएँ हाथ की Index Finger',
    rightIndex: 'दाएँ हाथ की Index Finger',
    rightMiddle: 'दाएँ हाथ की Middle Finger',
    rightRing: 'दाएँ हाथ की Ring Finger',
    rightPinky: 'दाएँ हाथ की छोटी उंगली (Right Pinky)',
    thumb: 'अंगूठा (Spacebar timing)',
    reach: 'किनारे वाली keys',
  };
  return labels[zone] || 'किनारे वाली keys';
}

function humanizeZoneEnglish(zone) {
  const labels = {
    leftPinky: 'left pinky',
    leftRing: 'left ring finger',
    leftMiddle: 'left middle finger',
    leftIndex: 'left index finger',
    rightIndex: 'right index finger',
    rightMiddle: 'right middle finger',
    rightRing: 'right ring finger',
    rightPinky: 'right pinky',
    thumb: 'thumb (Spacebar timing)',
    reach: 'outer key reach',
  };
  return labels[zone] || 'key reach';
}

/**
 * Detect whether a single user message is English (not Devanagari and not Hinglish).
 */
export function isPureEnglishMessage(text) {
  const str = String(text || '').trim();
  if (!str) return false;
  if (/[\u0900-\u097F]/.test(str)) return false;

  const words = str
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return false;

  let hinglishHits = 0;
  for (const w of words) {
    if (HINGLISH_MARKERS.has(w)) {
      hinglishHits += 1;
    }
  }
  return hinglishHits === 0;
}

/**
 * Instant turn-level language detection:
 * - Default is natural everyday Hindi when no message has been sent yet.
 * - Immediately responds in English whenever the user writes in English.
 * - Immediately responds in Hindi whenever the user writes in Hindi or Hinglish.
 */
export function detectTurnLanguage(latestMessage, fallbackLang = 'hindi') {
  const clean = String(latestMessage || '').trim();
  if (!clean) return fallbackLang === 'english' ? 'english' : 'hindi';
  if (/[\u0900-\u097F]/.test(clean)) return 'hindi';
  return isPureEnglishMessage(clean) ? 'english' : 'hindi';
}

/**
 * Derive a clean, friendly display name from user profile or saved buddy preference.
 */
export function resolveUserFriendlyName() {
  const buddy = loadBuddyState();
  if (buddy.preferredName) return buddy.preferredName;
  const user = getActiveUser();
  if (!user || !user.username) return 'दोस्त';
  const firstPart = user.username
    .split(/[_\-\s.]+/)
    .map((p) => p.replace(/\d+$/g, ''))
    .find((p) => p.length >= 2);
  const chosen = firstPart || user.username;
  return chosen.charAt(0).toUpperCase() + chosen.slice(1);
}

/**
 * Time-of-day natural, respectful Hindi greeting.
 */
export function getTimeGreeting(userName) {
  const hr = new Date().getHours();
  const isGuestName = userName === 'दोस्त';
  if (hr >= 5 && hr < 12) return isGuestName ? 'गुड मॉर्निंग!' : `गुड मॉर्निंग, ${userName}!`;
  if (hr >= 12 && hr < 17) return isGuestName ? 'गुड आफ्टरनून!' : `गुड आफ्टरनून, ${userName}!`;
  if (hr >= 17 && hr < 21) return isGuestName ? 'गुड ईवनिंग!' : `गुड ईवनिंग, ${userName}!`;
  return isGuestName ? 'लेट नाइट प्रैक्टिस?' : `लेट नाइट प्रैक्टिस, ${userName}?`;
}

/**
 * Build an enthusiastic, curious, respectful startup popup greeting based on live user data.
 */
export function buildStartupGreeting(ctx) {
  const { userName, overall, scoped, patterns, buddy } = ctx;
  const greeting = getTimeGreeting(userName);

  if (!navigator.onLine) {
    return {
      mood: 'concerned',
      title: 'इंटरनेट बंद है क्या?',
      body: 'लगता है internet बंद है या WiFi connect नहीं है। कोई बात नहीं—typing प्रैक्टिस offline भी बिल्कुल स्मूद चलेगी!',
      primaryLabel: 'टेस्ट शुरू करें',
      primaryAction: 'practice',
      secondaryLabel: 'Kibo खोलें',
      secondaryAction: 'chat',
    };
  }

  // Case 1: Brand new user (0 tests)
  if (overall.totalTests === 0) {
    return {
      mood: 'happy',
      title: `${greeting} मैं Kibo हूँ`,
      body: 'आज एक छोटा 3-min टेस्ट लगाकर शुरुआत करें? आप किस exam (SSC/CPCT) या goal के लिए typing सीख रहे हैं?',
      primaryLabel: 'Exam की तैयारी',
      primaryAction: 'chat-prompt',
      primaryPrompt: 'मैं exam के लिए typing की तैयारी कर रहा हूँ, मुझे सही practice plan और custom test बताओ।',
      secondaryLabel: 'स्पीड बढ़ानी है',
      secondaryAction: 'chat-prompt',
      secondaryPrompt: 'मुझे अपनी typing speed और accuracy बढ़ानी है, कहाँ से शुरू करूँ?',
    };
  }

  // Case 2: Has weak keys to fix
  if (patterns.weakest.length > 0 && (!buddy.goal || Math.random() < 0.65)) {
    const topChar = patterns.weakest[0].displayChar;
    const errRate = patterns.weakest[0].errorRate;
    const extraQ = !buddy.goal
      ? 'वैसे आपका target WPM क्या है?'
      : `"${buddy.goal}" के लिए आज 3-min का targeted drill करें?`;
    return {
      mood: 'coach',
      title: greeting,
      body: `आपकी "${topChar}" key पर ${errRate}% गलती हो रही है। ${extraQ} आइए chat में इसे फिक्स करते हैं।`,
      primaryLabel: `"${topChar}" ठीक करें`,
      primaryAction: 'chat-prompt',
      primaryPrompt: `मेरी "${topChar}" key बार-बार गलत क्यों हो रही है? सही finger और एक custom drill दो।`,
      secondaryLabel: 'Chat खोलें',
      secondaryAction: 'chat',
    };
  }

  // Case 3: Active streak or solid runs
  if (overall.streakDays >= 2) {
    return {
      mood: 'celebrate',
      title: `${greeting} शानदार ${overall.streakDays}-day streak!`,
      body: `अभी ${scoped.weightedAvgWpm} WPM चल रही है—आज एक quick 3-min टेस्ट लगाकर नया PB सेट करें?`,
      primaryLabel: 'आज का Plan लें',
      primaryAction: 'chat-prompt',
      primaryPrompt: 'आज के लिए मुझे एक बढ़िया 5 मिनट का structured typing plan दो।',
      secondaryLabel: 'Chat खोलें',
      secondaryAction: 'chat',
    };
  }

  return {
    mood: 'happy',
    title: greeting,
    body: `${overall.totalTests} टेस्ट पूरे हो चुके हैं (${overall.weightedAvgWpm} avg WPM)। आज English या Hindi किसमें प्रैक्टिस करना चाहेंगे?`,
    primaryLabel: 'Kibo से बात करें',
    primaryAction: 'chat',
    secondaryLabel: 'पिछला टेस्ट देखें',
    secondaryAction: 'chat-prompt',
    secondaryPrompt: 'मेरे पिछले टेस्ट का breakdown दो और बताओ कहाँ सुधार करना है।',
  };
}

/**
 * Analyze root-cause mechanical patterns across sessions and weak keys.
 */
export function analyzePatterns(allHistory, allKeyStats, focusLayout) {
  const layoutId =
    focusLayout && focusLayout !== 'all' ? focusLayout : loadPrefs().layout || 'english';
  const scopedHistory =
    focusLayout && focusLayout !== 'all'
      ? allHistory.filter((s) => s.layout === focusLayout)
      : allHistory;

  const recent5 = scopedHistory.slice(0, 5);
  const weakReport = computeWeakKeyReport(allKeyStats, layoutId);
  const weakest = weakReport.weakestChars.slice(0, 5).map((w) => {
    const zone = getFingerZone(w.keyLabel);
    return {
      ...w,
      fingerZone: zone,
      fingerTag: zoneTagForPrompt(zone),
      fingerLabelEn: humanizeZoneEnglish(zone),
      fingerLabelHi: humanizeZoneHindi(zone),
    };
  });

  let avgRawGap = 0;
  let avgConsistency = 0;
  if (recent5.length > 0) {
    avgRawGap = Number(
      (
        recent5.reduce(
          (sum, s) => sum + Math.max(0, Number(s.rawWpm || 0) - Number(s.netWpm || 0)),
          0
        ) / recent5.length
      ).toFixed(1)
    );
    avgConsistency = Math.round(
      recent5.reduce((sum, s) => sum + Number(s.consistency ?? 80), 0) / recent5.length
    );
  }

  let shiftWeakCount = 0;
  const zoneCounts = {};
  for (const w of weakest) {
    if (/Shift\+/i.test(w.keyLabel)) shiftWeakCount += 1;
    zoneCounts[w.fingerZone] = (zoneCounts[w.fingerZone] || 0) + w.misses;
  }
  const topZone = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const isHindi = layoutId === 'mangal' || layoutId === 'kruti-dev';
  const hasMatraWeakness =
    isHindi && weakest.some((w) => /[\u093E-\u094D\u0902\u0903]/.test(w.char));

  const latestRun = scopedHistory[0] || null;

  return {
    layoutId,
    isHindi,
    weakest,
    avgRawGap,
    avgConsistency,
    shiftWeakCount,
    topZone,
    topZoneLabel: topZone ? humanizeZoneEnglish(topZone) : null,
    topZoneLabelHi: topZone ? humanizeZoneHindi(topZone) : null,
    hasMatraWeakness,
    latestRun,
    recent5,
  };
}

/**
 * Build a super-compact, high-accuracy telemetry snapshot (~170-240 tokens) + cache fingerprint.
 * Every weak key explicitly includes its exact touch-typing finger zone so the model never guesses.
 */
export function buildBuddyContext(layoutFilter = 'all', preferredLanguage = 'hindi') {
  const user = getActiveUser();
  const prefs = loadPrefs();
  const allHistory = loadHistory();
  const allKeyStats = loadKeyStats();
  const buddy = loadBuddyState();
  const userName = resolveUserFriendlyName();
  const language = preferredLanguage === 'english' ? 'english' : 'hindi';

  const effectiveLayout = layoutFilter !== 'all' ? layoutFilter : prefs.layout || 'english';
  const overall = computeDashboardMetrics(allHistory, 'all');
  const scoped = computeDashboardMetrics(allHistory, layoutFilter);
  const patterns = analyzePatterns(allHistory, allKeyStats, effectiveLayout);
  const achievements = evaluateAchievements(allHistory);

  const unlockedNames = achievements.filter((a) => a.unlocked).map((a) => a.title);
  const nextAch = achievements
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.progressPct - a.progressPct)
    .slice(0, 2)
    .map((a) => `${a.title}(${a.progressLabel})`);

  const pbs = Object.values(LAYOUTS)
    .map((l) => {
      const b = getPersonalBestForLayout(allHistory, l.id);
      return b ? `${l.id}:${b.netWpm}wpm/${b.accuracy}%` : null;
    })
    .filter(Boolean)
    .join(', ');

  const recentLines = patterns.recent5
    .map(
      (s) =>
        `${s.layout}:${s.netWpm}net/${s.rawWpm || s.netWpm}raw/${s.accuracy}%/${s.errorChars || 0}err/cons${s.consistency ?? '-'}%(${s.targetLabel || ''})`
    )
    .join(' | ');

  const weakLines = patterns.weakest
    .map(
      (w) =>
        `${w.displayChar}[key:${w.keyLabel}, finger:${w.fingerTag}, ${w.errorRate}%err, ${w.misses}/${w.total}]`
    )
    .join(', ');

  const signals = [];
  if (patterns.avgRawGap >= 6) signals.push(`rushing(raw-net gap +${patterns.avgRawGap}wpm)`);
  if (patterns.avgConsistency > 0 && patterns.avgConsistency < 75) {
    signals.push(`uneven-rhythm(consistency ${patterns.avgConsistency}%)`);
  }
  if (patterns.shiftWeakCount >= 2) signals.push('shift-combo-hesitation');
  if (patterns.topZoneLabel) signals.push(`weak-finger:${patterns.topZoneLabel}`);
  if (patterns.hasMatraWeakness) signals.push('hindi-matra-sequencing');
  if (scoped.recentDeltaWpm !== null) {
    signals.push(
      `recent5-vs-avg:${scoped.recentDeltaWpm >= 0 ? '+' : ''}${scoped.recentDeltaWpm}wpm`
    );
  }

  const lines = [
    `Name:${userName} (${user ? `@${user.username}` : 'Guest'}) | ActiveLayout:${prefs.layout} | Filter:${layoutFilter}`,
    `AllTime: ${overall.totalTests} tests, ${overall.weightedAvgWpm} avgWPM, ${overall.weightedAccuracy}% acc, ${overall.streakDays}d streak, ${Math.round(overall.totalDurationSec / 60)}m total`,
    layoutFilter !== 'all'
      ? `Filtered(${layoutFilter}): ${scoped.totalTests} tests, ${scoped.weightedAvgWpm} avgWPM, ${scoped.weightedAccuracy}% acc, best ${scoped.bestWpm}`
      : null,
    pbs ? `PBs: ${pbs}` : 'PBs: none yet',
    recentLines ? `LastRuns(newest first): ${recentLines}` : 'LastRuns: none yet',
    weakLines
      ? `TopWeakKeys(${effectiveLayout}): ${weakLines}`
      : `TopWeakKeys(${effectiveLayout}): none recorded`,
    signals.length > 0 ? `DetectedPatterns: ${signals.join('; ')}` : null,
    `Achievements(${unlockedNames.length}/${achievements.length}): unlocked=[${unlockedNames.join(', ') || 'none'}] next=[${nextAch.join(', ')}]`,
    buddy.goal ? `UserGoal: ${buddy.goal}` : null,
    buddy.memories && buddy.memories.length > 0
      ? `LongTermMemory: ${buddy.memories.join(' | ')}`
      : null,
  ].filter(Boolean);

  const digest = lines.join('\n');

  const latestTs = allHistory[0]?.timestamp || 0;
  const topWeakSig = patterns.weakest.map((w) => `${w.char}:${w.misses}`).join(',');
  const fingerprint = `${language}|${userName}|${layoutFilter}|${effectiveLayout}|${allHistory.length}|${latestTs}|${topWeakSig}|${buddy.goal || ''}`;

  return {
    userName,
    language,
    effectiveLayout,
    layoutFilter,
    digest,
    fingerprint,
    overall,
    scoped,
    patterns,
    achievements,
    buddy,
  };
}

/**
 * Natural everyday Hindi (or clean English) local fallback brief for Performance Hub.
 */
export function buildLocalFallbackBrief(ctx) {
  const { userName, language, overall, scoped, patterns, achievements } = ctx;
  const layoutName = (LAYOUTS[patterns.layoutId] || LAYOUTS.english).shortName;
  const unlocked = achievements.filter((a) => a.unlocked).length;

  if (language === 'english') {
    if (overall.totalTests === 0) {
      return {
        mood: 'happy',
        headline: `Welcome ${userName} — Kibo is ready to map your typing.`,
        whyYouFail:
          'You have not completed a session yet. Run one calm 3-minute test and I will pinpoint your exact weak keys, finger zones, and pacing leaks.',
        actionPlan: [
          'Start with a steady 3-minute test instead of rushing for peak speed.',
          'Hold 95%+ accuracy first—no-backspace mode rewards clean keystrokes.',
          'Return right after to see your custom drill and finger breakdown.',
        ],
        celebration: `Ready to unlock your first achievement (0/${achievements.length} so far).`,
        drillNote: `Warm up in ${layoutName}`,
        memoryNote: '',
      };
    }

    const topWeak = patterns.weakest.slice(0, 3);
    const weakNames = topWeak
      .map((w) => `"${w.displayChar}" (${w.errorRate}% err, ${w.fingerLabelEn})`)
      .join(', ');

    return {
      mood: topWeak.length > 0 ? 'coach' : 'happy',
      headline: `${userName}, here is where your Net WPM is leaking.`,
      whyYouFail:
        topWeak.length > 0
          ? `Your highest error rates are on ${weakNames}. Slowing down 10% on those reaches and snapping back to home row will lift both accuracy and Net WPM.`
          : `Your accuracy is solid (${scoped.weightedAccuracy}%). The next leap comes from keeping steady rhythm across longer 5-minute runs.`,
      actionPlan: [
        topWeak.length > 0
          ? `Drill ${topWeak.map((w) => w.displayChar).join(' ')} for 3 minutes at 95%+ accuracy.`
          : `Run a 5-minute ${layoutName} test to build endurance.`,
        'Keep your eyes 1–2 words ahead of the cursor to eliminate micro-pauses.',
        'Tell Kibo your target WPM or exam in chat for tailored practice tests.',
      ],
      celebration: `${overall.totalTests} tests completed with ${unlocked}/${achievements.length} achievements unlocked.`,
      drillNote: 'Targeted weak-keys drill',
      memoryNote: '',
    };
  }

  // Default: Natural, respectful everyday Hindi
  if (overall.totalTests === 0) {
    return {
      mood: 'happy',
      headline: `स्वागत है ${userName}! मैं Kibo हूँ—आपका typing coach।`,
      whyYouFail:
        'अभी तक एक भी टेस्ट पूरा नहीं हुआ है। एक आरामदायक 3-min टेस्ट पूरा करें, उसके बाद मैं आपकी exact mistake keys, finger zone और rhythm का पूरा विश्लेषण दिखाऊँगा।',
      actionPlan: [
        'पहले एक शांत 3-min टेस्ट लगाएँ—शुरुआत में स्पीड की जल्दी न करें।',
        'Accuracy 95%+ रखने पर ध्यान दें, no-backspace मोड में यही Net WPM बढ़ाता है।',
        'टेस्ट पूरा होते ही यहाँ देखें—मैं आपकी कमज़ोर keys का drill तैयार कर दूँगा।',
      ],
      celebration: `पहला achievement unlock करने के लिए तैयार (अभी 0/${achievements.length})।`,
      drillNote: `${layoutName} में warm-up टेस्ट शुरू करें।`,
      memoryNote: '',
    };
  }

  const topWeak = patterns.weakest.slice(0, 3);
  const weakNames = topWeak
    .map((w) => `"${w.displayChar}" (${w.errorRate}% गलती, ${w.fingerLabelHi})`)
    .join(', ');

  let why = '';
  let mood = 'coach';

  if (topWeak.length > 0 && patterns.avgRawGap >= 6) {
    mood = 'concerned';
    why = `आप थोड़ी जल्दी टाइप कर रहे हैं (Raw स्पीड Net से +${patterns.avgRawGap} WPM ज़्यादा है), जिस वजह से ${weakNames} पर slip हो रहा है। No-backspace मोड में एक भी गलती Net WPM को सीधा नीचे लाती है।`;
  } else if (topWeak.length > 0 && patterns.hasMatraWeakness) {
    mood = 'coach';
    why = `${layoutName} में सबसे ज़्यादा गड़बड़ ${weakNames} पर हो रही है। मात्रा और आधे अक्षर (conjuncts) तब चूकते हैं जब उँगलियाँ sequence से पहले चलती हैं—इन जगहों पर हल्का सा नियंत्रण रखें।`;
  } else if (topWeak.length > 0 && patterns.shiftWeakCount >= 2) {
    mood = 'coach';
    why = `ज़्यादातर गलतियाँ (${weakNames}) Shift वाली keys पर हैं। अक्सर Shift key अक्षर से थोड़ा पहले छूट जाती है—दूसरे हाथ की pinky से Shift को एक पल ज़्यादा दबाकर रखें।`;
  } else if (topWeak.length > 0) {
    mood = scoped.weightedAccuracy < 90 ? 'concerned' : 'coach';
    why = `अभी आपकी स्पीड ${weakNames} पर अटक रही है। इन 2–3 keys पर सही उंगली से 10% आराम से प्रैक्टिस करते ही Net WPM और Accuracy दोनों तेज़ी से बढ़ेंगे।`;
  } else {
    mood = 'celebrate';
    why = `आपकी accuracy (${scoped.weightedAccuracy}%) काफी साफ है। अब अगला कदम 5-min या 2-Page टेस्ट में यही स्थिर rhythm बनाए रखना है।`;
  }

  const actions = [];
  if (topWeak.length > 0) {
    actions.push(
      `नीचे "Drill Weak Keys" से 3 मिनट ${topWeak.map((w) => w.displayChar).join(' ')} की फोकस्ड प्रैक्टिस करें।`
    );
  } else {
    actions.push(`${layoutName} में एक 5-min टेस्ट लगाएँ ताकि स्पीड ${scoped.weightedAvgWpm} WPM से ऊपर जाए।`);
  }

  if (patterns.avgRawGap >= 6) {
    actions.push('अगले 2 टेस्ट में 95%+ accuracy लॉक करें—Net WPM अपने आप ऊपर जाएगी।');
  } else if (patterns.shiftWeakCount >= 2) {
    actions.push('Shift हमेशा opposite हाथ की pinky से दबाएँ और key दबने के बाद छोड़ें।');
  } else {
    actions.push('नज़र हमेशा current शब्द से 1–2 शब्द आगे रखें ताकि flow न टूटे।');
  }

  const nextAch = achievements.find((a) => !a.unlocked);
  if (nextAch) {
    actions.push(`अगला टारगेट: "${nextAch.title}" badge (${nextAch.progressLabel}) unlock करें।`);
  } else {
    actions.push('2-Page टेस्ट ट्राय करें ताकि लंबी typing में थकान और गलतियाँ कम हों।');
  }

  let celebration = `अब तक ${overall.totalTests} टेस्ट पूरे और ${unlocked}/${achievements.length} achievements unlock हो चुके हैं।`;
  if (scoped.recentDeltaWpm !== null && scoped.recentDeltaWpm > 0) {
    mood = 'happy';
    celebration = `बेहतरीन प्रोग्रेस, ${userName}! पिछले 5 टेस्ट में आपकी स्पीड average से +${scoped.recentDeltaWpm} WPM ज़्यादा है।`;
  } else if (overall.streakDays >= 2) {
    celebration = `लगातार ${overall.streakDays}-day streak शानदार है—रोज़ की थोड़ी प्रैक्टिस ही असली फर्क लाती है।`;
  }

  return {
    mood,
    headline:
      scoped.recentDeltaWpm !== null && scoped.recentDeltaWpm > 0
        ? `शानदार फॉर्म, ${userName} — स्पीड लगातार बढ़ रही है।`
        : `${userName}, आपकी स्पीड और accuracy का फोकस पॉइंट मिल गया है।`,
    whyYouFail: why,
    actionPlan: actions.slice(0, 3),
    celebration,
    drillNote:
      topWeak.length > 0
        ? `${topWeak.map((w) => w.displayChar).join(', ')} का targeted drill`
        : `${layoutName} स्पीड प्रैक्टिस`,
    memoryNote: '',
  };
}

/**
 * Build a realistic custom practice test locally (used offline or if Groq is unavailable).
 */
export function buildLocalCustomTest(message, ctx) {
  const lower = String(message || '').toLowerCase();
  const wantsHindi =
    /[\u0900-\u097F]/.test(message) &&
    (lower.includes('hindi') ||
      lower.includes('mangal') ||
      lower.includes('kruti') ||
      lower.includes('हिंदी') ||
      lower.includes('हिन्दी') ||
      lower.includes('मंगल') ||
      lower.includes('कृति') ||
      ctx.patterns.isHindi);

  const layout = lower.includes('kruti') || lower.includes('कृति')
    ? 'kruti-dev'
    : lower.includes('mangal') || lower.includes('मंगल') || wantsHindi
      ? 'mangal'
      : 'english';

  const minMatch = lower.match(/\b([1-9]|1[0-5])\s*(min|minute|minutes|मिनट)\b/);
  const durationMinutes = minMatch ? Number(minMatch[1]) : 3;

  if (layout !== 'english') {
    return {
      title: layout === 'kruti-dev' ? 'कृति देव फोकस्ड प्रैक्टिस टेस्ट' : 'मंगल मात्रा और गति अभ्यास',
      layout,
      durationMinutes,
      text: 'नियमित अभ्यास से हिंदी टाइपिंग में गति और शुद्धता दोनों एक साथ बढ़ती हैं। शुरुआती दौर में हर मात्रा, आधे अक्षर और विराम चिह्न को सही उंगली से दबाने की आदत डालनी चाहिए। जब उंगलियों को कुंजियों की सही स्थिति याद हो जाती है, तब बिना देखे लगातार तेज़ और सटीक टाइप करना बिल्कुल आसान लगने लगता है।',
    };
  }

  if (lower.includes('number') || lower.includes('digit') || /[0-9]/.test(lower)) {
    return {
      title: 'Number Row Precision Test',
      layout: 'english',
      durationMinutes,
      text: 'Batch 1647 cleared inspection at 06:45 with 98.6% accuracy across 265 units. Team 6 logged 76 entries on shelf 48, verified code 6092, and shipped 368 boxes before 17:30. Keep your right index finger anchored on J as you reach up to 6 and 7, then return cleanly to home row before typing 8456, 2960, and 7614.',
    };
  }

  if (lower.includes('symbol') || lower.includes('punct') || lower.includes('code')) {
    return {
      title: 'Punctuation & Shift Control Test',
      layout: 'english',
      durationMinutes,
      text: 'Hold Shift with the opposite pinky: clean rhythm beats rushing! Check item #42 (status: ready), confirm the 95.5% target, and review notes — "Accuracy first, speed second." When brackets [a, b], colons, and hyphens appear mid-sentence, stay calm and keep your wrists floating lightly over the home row.',
    };
  }

  const weakChars = ctx.patterns.weakest.slice(0, 4).map((w) => w.displayChar);
  if (weakChars.length > 0) {
    return {
      title: `Weak Keys Drill (${weakChars.join(' ')})`,
      layout: 'english',
      durationMinutes,
      text: 'Steady touch typing builds speed naturally when every finger returns to its home key after each reach. Read two words ahead of the cursor, keep your shoulders relaxed, and maintain ninety-six percent accuracy before pushing faster. Consistent daily drills turn awkward transitions into effortless muscle memory over just a few focused weeks.',
    };
  }

  return {
    title: 'Speed & Rhythm Builder Test',
    layout: 'english',
    durationMinutes,
    text: 'Great typists focus on smooth rhythm rather than frantic bursts of speed. When your eyes scan two words ahead of the caret, your fingers prepare the next combination before you even finish the current word. Maintain crisp accuracy above ninety-five percent, keep your wrists level, and let speed rise steadily across every minute.',
  };
}

/**
 * Local fallback chat responder when offline or before GROQ_API_KEY is configured.
 * Formats replies cleanly in Markdown and matches the user's language immediately.
 */
export function buildLocalFallbackReply(message, ctx, reasonCode) {
  const { userName, language, overall, scoped, patterns } = ctx;
  const lower = String(message || '').toLowerCase();
  const topWeak = patterns.weakest.slice(0, 3);

  const wantsCustomTest =
    /\b(test|drill|passage|practice text|exercise)\b/.test(lower) &&
    /\b(make|build|create|give|generate|custom|write)\b/.test(lower) ||
    /(टेस्ट|ड्रिल|प्रैक्टिस).*(बना|दो|दीजिए|तैयार)/.test(message);

  const customTest = wantsCustomTest ? buildLocalCustomTest(message, ctx) : null;

  if (reasonCode === 'OFFLINE') {
    if (language === 'english') {
      return {
        reply: [
          '### You appear to be offline',
          'Is your internet turned off or WiFi disconnected? No problem—typing practice works completely offline.',
          '',
          `**Your local snapshot (${userName}):**`,
          `- **Average Speed:** ${scoped.weightedAvgWpm} WPM (Best: ${scoped.bestWpm} WPM)`,
          `- **Accuracy:** ${scoped.weightedAccuracy}% across ${overall.totalTests} tests`,
          customTest ? '\nI also built an offline custom practice test for you below.' : '',
        ]
          .filter(Boolean)
          .join('\n'),
        mood: 'concerned',
        customTest,
      };
    }

    return {
      reply: [
        '### लगता है आप Offline हैं',
        'क्या आपने internet बंद किया है या WiFi connect नहीं है? कोई बात नहीं—typing प्रैक्टिस offline भी बिल्कुल स्मूद चलती है।',
        '',
        `**आपका local डेटा (${userName}):**`,
        `- **Average Speed:** ${scoped.weightedAvgWpm} WPM (Best: ${scoped.bestWpm} WPM)`,
        `- **Accuracy:** ${scoped.weightedAccuracy}% (${overall.totalTests} टेस्ट)`,
        customTest ? '\nमैंने नीचे आपके लिए offline custom practice test भी तैयार कर दिया है।' : '',
      ]
        .filter(Boolean)
        .join('\n'),
      mood: 'concerned',
      customTest,
    };
  }

  const keyHint =
    reasonCode === 'NO_API_KEY'
      ? language === 'english'
        ? '\n\n---\n*Tip: Add `GROQ_API_KEY` in Settings → Secrets to enable live Groq AI responses.*'
        : '\n\n---\n*नोट: Settings → Secrets में `GROQ_API_KEY` जोड़ते ही लाइव Groq AI चालू हो जाएगा।*'
      : '';

  if (language === 'english') {
    if (customTest) {
      return {
        reply: [
          `### Custom Test Ready: ${customTest.title}`,
          'Focus on **95%+ accuracy** and return to the home row (`ASDF` / `JKL;`) after every outer reach.',
          '',
          'Click **Start Practice Test** below whenever you are ready.' + keyHint,
        ].join('\n'),
        mood: 'happy',
        customTest,
      };
    }

    if (overall.totalTests === 0) {
      return {
        reply: [
          `Hi ${userName}! Complete one quick 3-minute test first so I can analyze your real weak keys and speed rhythm.`,
          '',
          'What typing goal or exam are you preparing for?' + keyHint,
        ].join('\n'),
        mood: 'happy',
        customTest: null,
      };
    }

    const weakBullets = topWeak.map(
      (w) => `- \`${w.displayChar}\` — **${w.errorRate}% error** (${w.fingerLabelEn}, key \`${w.keyLabel}\`)`
    );

    return {
      reply: [
        `### Quick Breakdown for ${userName}`,
        `- **Average Speed:** ${scoped.weightedAvgWpm} WPM (Personal Best: **${scoped.bestWpm} WPM**)`,
        `- **Accuracy:** ${scoped.weightedAccuracy}% across ${overall.totalTests} tests`,
        weakBullets.length > 0 ? '\n**Top keys to tighten up:**\n' + weakBullets.join('\n') : '',
        '\nSlow down 10% on those specific keys and keep your eyes 1–2 words ahead of the cursor.' +
          keyHint,
      ]
        .filter(Boolean)
        .join('\n'),
      mood: 'coach',
      customTest: null,
    };
  }

  // Natural everyday Hindi fallback
  if (customTest) {
    return {
      reply: [
        `### Custom Test तैयार है: ${customTest.title}`,
        '- **लक्ष्य:** 95%+ accuracy के साथ शांत rhythm में टाइप करें।',
        '- **ध्यान दें:** हर reach के बाद उंगलियाँ तुरंत home row (`ASDF` / `JKL;`) पर वापस लाएँ।',
        '',
        'नीचे दिए **Start Practice Test** बटन पर क्लिक करके शुरू करें।' + keyHint,
      ].join('\n'),
      mood: 'happy',
      customTest,
    };
  }

  if (overall.totalTests === 0) {
    return {
      reply: [
        `नमस्ते ${userName}! पहले एक छोटा 3-min टेस्ट पूरा करें, उसके बाद मैं आपकी हर कमज़ोर key और स्पीड का पूरा breakdown दूँगा।`,
        '',
        'वैसे आप किसी exam (SSC / CPCT / Court) की तैयारी कर रहे हैं या general typing speed बढ़ाना चाहते हैं?' +
          keyHint,
      ].join('\n'),
      mood: 'happy',
      customTest: null,
    };
  }

  const weakBulletsHi = topWeak.map(
    (w) => `- \`${w.displayChar}\` — **${w.errorRate}% गलती** (${w.fingerLabelHi}, key \`${w.keyLabel}\`)`
  );

  return {
    reply: [
      `### ${userName}, आपका Quick Summary`,
      `- **Average Speed:** ${scoped.weightedAvgWpm} WPM (Personal Best: **${scoped.bestWpm} WPM**)`,
      `- **Accuracy:** ${scoped.weightedAccuracy}% (${overall.totalTests} टेस्ट)`,
      weakBulletsHi.length > 0 ? '\n**इन keys पर सबसे ज़्यादा ध्यान दें:**\n' + weakBulletsHi.join('\n') : '',
      '\nअगर आप चाहें तो मैं इनमें से किसी भी कमज़ोर key या exam pattern पर तुरंत एक custom practice test बना सकता हूँ।' +
        keyHint,
    ]
      .filter(Boolean)
      .join('\n'),
    mood: 'coach',
    customTest: null,
  };
}
