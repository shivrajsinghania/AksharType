/**
 * AksharType — Kibo AI Buddy Context Compressor, Language Tracker & Everyday Hindi Coach
 * Builds an ultra-token-efficient telemetry digest (~150-220 tokens) for Groq
 * and provides natural day-to-day Hindi diagnostics, startup greetings, and offline responses.
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

const HINGLISH_MARKERS = new Set([
  'kya', 'hai', 'hain', 'nahi', 'nhi', 'kaise', 'karu', 'karun', 'karna', 'mera', 'meri', 'mere',
  'bhai', 'yaar', 'dost', 'thik', 'theek', 'bata', 'batao', 'hoon', 'hun', 'hum', 'tum', 'aap',
  'mein', 'me', 'se', 'par', 'aur', 'bhi', 'toh', 'to', 'achha', 'accha', 'haan', 'ha', 'kuch',
  'bahut', 'bohot', 'kam', 'zyada', 'jyada', 'abhi', 'kal', 'aaj', 'chalo', 'karo', 'karke',
  'galat', 'galti', 'sahi', 'naam', 'kitna', 'kitni', 'kyu', 'kyun', 'kyuki', 'phir', 'fir',
  'lagta', 'lagti', 'samajh', 'padhai', 'taiyari', 'tyari', 'hindi', 'namaste', 'shukriya',
]);

function getFingerZone(keyLabel) {
  const clean = String(keyLabel || '').replace(/^Shift\+/i, '').toLowerCase();
  if (clean === 'space') return 'thumb';
  for (const [zone, set] of Object.entries(FINGER_ZONES)) {
    if (set.has(clean)) return zone;
  }
  return 'reach';
}

function humanizeZoneHindi(zone) {
  const labels = {
    leftPinky: 'बाएँ हाथ की छोटी उंगली (left pinky)',
    leftRing: 'बाएँ हाथ की ring finger',
    leftMiddle: 'बाएँ हाथ की middle finger',
    leftIndex: 'left index finger',
    rightIndex: 'right index finger',
    rightMiddle: 'दाएँ हाथ की middle finger',
    rightRing: 'दाएँ हाथ की ring finger',
    rightPinky: 'दाएँ हाथ की छोटी उंगली (right pinky)',
    thumb: 'अंगूठा (Space timing)',
    reach: 'किनारे वाली keys',
  };
  return labels[zone] || 'किनारे वाली keys';
}

function humanizeZoneEnglish(zone) {
  const labels = {
    leftPinky: 'left pinky',
    leftRing: 'left ring finger',
    leftMiddle: 'left middle finger',
    leftIndex: 'left index',
    rightIndex: 'right index',
    rightMiddle: 'right middle finger',
    rightRing: 'right ring finger',
    rightPinky: 'right pinky',
    thumb: 'thumb (Space timing)',
    reach: 'outer key reach',
  };
  return labels[zone] || 'key reach';
}

/**
 * Detect whether a single user message is pure English (not Devanagari and not Hinglish).
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
  for (const w of words) {
    if (HINGLISH_MARKERS.has(w)) return false;
  }
  return true;
}

/**
 * Default language is ALWAYS friendly everyday Hindi.
 * Switches to English ONLY when the user has sent 3 or more consecutive pure-English messages.
 */
export function detectBuddyLanguage(chatHistory) {
  const userMsgs = (Array.isArray(chatHistory) ? chatHistory : [])
    .filter((m) => m && m.role === 'user' && typeof m.content === 'string')
    .slice(-4);

  if (userMsgs.length < 3) return 'hindi';

  let consecutiveEnglish = 0;
  for (let i = userMsgs.length - 1; i >= 0; i -= 1) {
    if (isPureEnglishMessage(userMsgs[i].content)) {
      consecutiveEnglish += 1;
    } else {
      break;
    }
  }
  return consecutiveEnglish >= 3 ? 'english' : 'hindi';
}

/**
 * Derive a clean, friendly first-name style display name from user profile or custom preference.
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
 * Time-of-day friendly everyday Hindi greeting.
 */
export function getTimeGreeting(userName) {
  const hr = new Date().getHours();
  if (hr >= 5 && hr < 12) return `गुड मॉर्निंग ${userName}!`;
  if (hr >= 12 && hr < 17) return `गुड आफ्टरनून ${userName}!`;
  if (hr >= 17 && hr < 21) return `गुड ईवनिंग ${userName}!`;
  return `अरे वाह ${userName}, लेट नाइट प्रैक्टिस?`;
}

/**
 * Build an enthusiastic, curious startup popup greeting based on live user data.
 */
export function buildStartupGreeting(ctx) {
  const { userName, overall, scoped, patterns, buddy } = ctx;
  const greeting = getTimeGreeting(userName);

  if (!navigator.onLine) {
    return {
      mood: 'concerned',
      title: `अरे ${userName}, इंटरनेट बंद है क्या?`,
      body: 'तुमने internet बंद किया है क्या, या WiFi connect नहीं है? कोई बात नहीं—typing प्रैक्टिस offline भी मस्त चलेगी!',
      primaryLabel: 'चलो टेस्ट लगाएँ',
      primaryAction: 'practice',
      secondaryLabel: 'Kibo से बात करो',
      secondaryAction: 'chat',
    };
  }

  // Case 1: Brand new user (0 tests)
  if (overall.totalTests === 0) {
    return {
      mood: 'happy',
      title: `${greeting} मैं Kibo हूँ!`,
      body: 'चलो आज का पहला 3-min टेस्ट मारें? वैसे तुम किस exam (SSC/CPCT) या काम के लिए typing सीख रहे हो?',
      primaryLabel: 'Exam की तैयारी है',
      primaryAction: 'chat-prompt',
      primaryPrompt: 'मैं exam के लिए typing की तैयारी कर रहा हूँ, मुझे सही plan बताओ!',
      secondaryLabel: 'बस स्पीड बढ़ानी है',
      secondaryAction: 'chat-prompt',
      secondaryPrompt: 'मुझे बस अपनी typing speed और accuracy बढ़ानी है, कहाँ से शुरू करूँ?',
    };
  }

  // Case 2: Has weak keys to fix
  if (patterns.weakest.length > 0 && (!buddy.goal || Math.random() < 0.65)) {
    const topChar = patterns.weakest[0].displayChar;
    const errRate = patterns.weakest[0].errorRate;
    const extraQ = !buddy.goal
      ? 'वैसे तुम्हारा target WPM क्या है?'
      : `तुम्हारे "${buddy.goal}" goal के लिए आज 3-min टेस्ट हो जाए?`;
    return {
      mood: 'coach',
      title: greeting,
      body: `तुम्हारे "${topChar}" key पर ${errRate}% गलती हो रही है यार! ${extraQ} आओ chat में बताओ!`,
      primaryLabel: `"${topChar}" ठीक करो`,
      primaryAction: 'chat-prompt',
      primaryPrompt: `मेरा "${topChar}" key बार-बार गलत क्यों हो रहा है? इसे कैसे ठीक करूँ?`,
      secondaryLabel: 'Chat खोलो',
      secondaryAction: 'chat',
    };
  }

  // Case 3: Active streak or solid runs
  if (overall.streakDays >= 2) {
    return {
      mood: 'celebrate',
      title: `${greeting} मस्त ${overall.streakDays}-day streak!`,
      body: `अभी ${scoped.weightedAvgWpm} WPM चल रही है—चलो आज एक quick 3-min टेस्ट लगाकर नया PB तोड़ें?`,
      primaryLabel: 'आज का Plan दो',
      primaryAction: 'chat-prompt',
      primaryPrompt: 'आज के लिए मुझे एक बढ़िया 5 मिनट का typing plan दो!',
      secondaryLabel: 'Chat खोलो',
      secondaryAction: 'chat',
    };
  }

  return {
    mood: 'happy',
    title: greeting,
    body: `${overall.totalTests} टेस्ट हो चुके हैं (${overall.weightedAvgWpm} avg WPM)! आज English या Hindi किसमें प्रैक्टिस करने का मन है?`,
    primaryLabel: 'आओ बात करते हैं',
    primaryAction: 'chat',
    secondaryLabel: 'पिछला टेस्ट देखो',
    secondaryAction: 'chat-prompt',
    secondaryPrompt: 'मेरे पिछले टेस्ट का review करो और बताओ कहाँ सुधार करना है!',
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
  const weakest = weakReport.weakestChars.slice(0, 5);

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
    const z = getFingerZone(w.keyLabel);
    zoneCounts[z] = (zoneCounts[z] || 0) + w.misses;
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
 * Build a super-compact, token-efficient snapshot (~150-220 tokens) + cache fingerprint.
 */
export function buildBuddyContext(layoutFilter = 'all') {
  const user = getActiveUser();
  const prefs = loadPrefs();
  const allHistory = loadHistory();
  const allKeyStats = loadKeyStats();
  const buddy = loadBuddyState();
  const userName = resolveUserFriendlyName();
  const language = detectBuddyLanguage(buddy.chatHistory);

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
    .map((w) => `${w.displayChar}[${w.keyLabel}:${w.errorRate}%err,${w.misses}/${w.total}]`)
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
    weakLines ? `TopWeakKeys(${effectiveLayout}): ${weakLines}` : `TopWeakKeys(${effectiveLayout}): none recorded`,
    signals.length > 0 ? `DetectedPatterns: ${signals.join('; ')}` : null,
    `Achievements(${unlockedNames.length}/${achievements.length}): unlocked=[${unlockedNames.join(', ') || 'none'}] next=[${nextAch.join(', ')}]`,
    buddy.goal ? `UserGoal: ${buddy.goal}` : null,
    buddy.memories && buddy.memories.length > 0 ? `Memory: ${buddy.memories.join(' | ')}` : null,
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
 * Natural day-to-day Hindi (or English if 3+ English turns) local fallback brief.
 */
export function buildLocalFallbackBrief(ctx) {
  const { userName, language, overall, scoped, patterns, achievements } = ctx;
  const layoutName = (LAYOUTS[patterns.layoutId] || LAYOUTS.english).shortName;
  const unlocked = achievements.filter((a) => a.unlocked).length;

  if (language === 'english') {
    if (overall.totalTests === 0) {
      return {
        mood: 'happy',
        headline: `Hey ${userName}! I'm Kibo, your typing buddy.`,
        whyYouFail:
          'You have not finished a test yet, so run one quick 3-minute session and I will map out your exact mistake keys and rhythm.',
        actionPlan: [
          'Take a calm 3-minute test without rushing for speed.',
          'Keep accuracy above 94% first—no-backspace mode rewards steady rhythm.',
          'Check back here right after so I can pinpoint your trickiest keys.',
        ],
        celebration: `Ready to unlock your first badge (0/${achievements.length} so far)!`,
        drillNote: `Warm up in ${layoutName}`,
        memoryNote: '',
      };
    }

    const topWeak = patterns.weakest.slice(0, 3);
    const weakNames = topWeak
      .map((w) => `"${w.displayChar}" (${w.errorRate}% err on ${w.keyLabel})`)
      .join(', ');

    return {
      mood: topWeak.length > 0 ? 'coach' : 'happy',
      headline: `Hey ${userName}, Kibo found where your speed is leaking!`,
      whyYouFail:
        topWeak.length > 0
          ? `Your biggest slips right now are ${weakNames}, mostly around your ${patterns.topZoneLabel || 'outer keys'}. Slowing down 10% on those transitions will boost both accuracy and Net WPM.`
          : `Your accuracy is super clean (${scoped.weightedAccuracy}%)! Now focus on holding steady rhythm across longer runs.`,
      actionPlan: [
        topWeak.length > 0
          ? `Drill ${topWeak.map((w) => w.displayChar).join(' ')} for 3 minutes at 95%+ accuracy.`
          : `Push a 5-minute ${layoutName} test to test endurance.`,
        'Keep your eyes 1–2 words ahead of the caret to avoid sudden pauses.',
        'Tell me your WPM or exam goal in chat so I can tailor your drills.',
      ],
      celebration: `${overall.totalTests} tests done and ${unlocked}/${achievements.length} achievements unlocked!`,
      drillNote: 'Targeted drill',
      memoryNote: '',
    };
  }

  // Default: Natural day-to-day friendly Hindi!
  if (overall.totalTests === 0) {
    return {
      mood: 'happy',
      headline: `अरे ${userName}! मैं Kibo हूँ—तुम्हारा typing दोस्त।`,
      whyYouFail:
        'अभी तक एक भी टेस्ट पूरा नहीं हुआ है, इसलिए कोई डेटा नहीं है। बस एक छोटा सा 3-min टेस्ट लगाओ, फिर मैं बताऊँगा कि कौन सी उंगली या key तुम्हारी स्पीड रोक रही है!',
      actionPlan: [
        'पहले एक आराम से 3-min टेस्ट लगाओ—अभी स्पीड की टेंशन मत लो।',
        'Accuracy 94%+ रखने पर ध्यान दो, no-backspace में यही सबसे ज़्यादा काम आता है।',
        'टेस्ट खत्म होते ही यहाँ आओ—मैं तुम्हारी exact गलतियाँ पकड़ कर बताऊँगा।',
      ],
      celebration: `चलो पहला achievement unlock करते हैं (अभी 0/${achievements.length})!`,
      drillNote: `${layoutName} में एक warm-up टेस्ट शुरू करो।`,
      memoryNote: '',
    };
  }

  const topWeak = patterns.weakest.slice(0, 3);
  const weakNames = topWeak
    .map((w) => `"${w.displayChar}" (${w.errorRate}% गलती, ${w.keyLabel})`)
    .join(', ');

  let why = '';
  let mood = 'coach';

  if (topWeak.length > 0 && patterns.avgRawGap >= 6) {
    mood = 'concerned';
    why = `तुम थोड़ी ज़्यादा जल्दी टाइप कर रहे हो (Raw स्पीड Net से +${patterns.avgRawGap} WPM ज़्यादा है), इसलिए ${weakNames} पर slip हो रहा है। No-backspace मोड में एक गलत key तुम्हारी Net WPM काफी गिरा देती है!`;
  } else if (topWeak.length > 0 && patterns.hasMatraWeakness) {
    mood = 'coach';
    why = `${layoutName} में सबसे ज़्यादा गड़बड़ ${weakNames} पर हो रही है। मात्रा और आधे अक्षर (conjuncts) तब गलत होते हैं जब उँगलियाँ order से पहले भागती हैं—इन जगहों पर बस हल्का सा slow हो जाओ!`;
  } else if (topWeak.length > 0 && patterns.shiftWeakCount >= 2) {
    mood = 'coach';
    why = `तुम्हारी ज़्यादातर गलतियाँ (${weakNames}) Shift वाली keys पर हैं। अक्सर Shift key थोड़ा पहले छूट जाती है—बस दूसरे हाथ से Shift को एक पल ज़्यादा दबाकर रखो, accuracy तुरंत उछलेगी!`;
  } else if (topWeak.length > 0) {
    mood = scoped.weightedAccuracy < 90 ? 'concerned' : 'coach';
    why = `अभी तुम्हारी स्पीड को ${weakNames} रोक रहे हैं—खासकर ${patterns.topZoneLabelHi || 'किनारे वाली keys'} पर। बस ये 2–3 keys ठीक कर लीं तो Net WPM और Accuracy दोनों मस्त बढ़ जाएँगी!`;
  } else {
    mood = 'celebrate';
    why = `वाह यार, तुम्हारी accuracy (${scoped.weightedAccuracy}%) बहुत साफ है! अब अगला लेवल है 5-min या 2-Page टेस्ट में यही rhythm बनाए रखना।`;
  }

  const actions = [];
  if (topWeak.length > 0) {
    actions.push(
      `नीचे "Drill Weak Keys" दबाकर 3 मिनट सिर्फ ${topWeak.map((w) => w.displayChar).join(' ')} की प्रैक्टिस करो।`
    );
  } else {
    actions.push(`${layoutName} में एक 5-min टेस्ट लगाओ ताकि स्पीड ${scoped.weightedAvgWpm} WPM से ऊपर जाए।`);
  }

  if (patterns.avgRawGap >= 6) {
    actions.push('अगले 2 टेस्ट में थोड़ा आराम से टाइप करो—95%+ accuracy आते ही Net WPM अपने आप बढ़ेगी।');
  } else if (patterns.shiftWeakCount >= 2) {
    actions.push('Shift हमेशा opposite हाथ की छोटी उंगली से दबाओ और letter के बाद छोड़ो।');
  } else {
    actions.push('नज़र हमेशा current अक्षर से 1–2 शब्द आगे रखो, इससे अटकना बंद हो जाएगा।');
  }

  const nextAch = achievements.find((a) => !a.unlocked);
  if (nextAch) {
    actions.push(`अगला टारगेट: "${nextAch.title}" badge (${nextAch.progressLabel}) unlock करो!`);
  } else {
    actions.push('2-Page टेस्ट ट्राय करो ताकि लंबी typing में थकान न हो।');
  }

  let celebration = `अब तक ${overall.totalTests} टेस्ट पूरे और ${unlocked}/${achievements.length} achievements unlock हो चुके हैं!`;
  if (scoped.recentDeltaWpm !== null && scoped.recentDeltaWpm > 0) {
    mood = 'happy';
    celebration = `मस्त फॉर्म में हो ${userName}! पिछले 5 टेस्ट में तुम्हारी स्पीड average से +${scoped.recentDeltaWpm} WPM ज़्यादा है!`;
  } else if (overall.streakDays >= 2) {
    celebration = `जबरदस्त ${overall.streakDays}-day streak चल रही है ${userName}—रोज़ थोड़ा अभ्यास ही असली जादू करता है!`;
  }

  return {
    mood,
    headline:
      scoped.recentDeltaWpm !== null && scoped.recentDeltaWpm > 0
        ? `क्या बात है ${userName}! स्पीड ऊपर जा रही है!`
        : `हे ${userName}, मैंने पकड़ लिया कि स्पीड कहाँ अटक रही है!`,
    whyYouFail: why,
    actionPlan: actions.slice(0, 3),
    celebration,
    drillNote:
      topWeak.length > 0
        ? `${topWeak.map((w) => w.displayChar).join(', ')} का drill`
        : `${layoutName} में स्पीड प्रैक्टिस`,
    memoryNote: '',
  };
}

/**
 * Local fallback chat responder when offline or before GROQ_API_KEY is added.
 */
export function buildLocalFallbackReply(message, ctx, reasonCode) {
  const { userName, language, overall, scoped, patterns } = ctx;
  const lower = message.toLowerCase();
  const topWeak = patterns.weakest.slice(0, 3);
  const weakStr = topWeak.map((w) => `"${w.displayChar}" (${w.errorRate}% गलती)`).join(', ');

  if (reasonCode === 'OFFLINE') {
    return {
      reply: `अरे यार ${userName}, तुमने internet बंद किया है क्या? या WiFi connect नहीं है? 😅\nकोई बात नहीं, मैं तुम्हारे local stats देखकर भी मदद कर सकता हूँ—अभी तुम्हारी avg स्पीड ${scoped.weightedAvgWpm} WPM और accuracy ${scoped.weightedAccuracy}% है। नेट आते ही मैं फिर फुल AI मोड में आ जाऊँगा!`,
      mood: 'concerned',
      drillText: '',
    };
  }

  const keyHint =
    reasonCode === 'NO_API_KEY'
      ? '\n\n(नोट: AI Studio के Settings → Secrets में GROQ_API_KEY डालते ही मैं फुल Groq AI के साथ लाइव बात करूँगा!)'
      : '';

  if (language === 'english') {
    const weakEn = topWeak.map((w) => `"${w.displayChar}" (${w.errorRate}% err)`).join(', ');
    if (overall.totalTests === 0) {
      return {
        reply: `Hey ${userName}! Finish one quick test first and I'll break down your exact weak keys and speed. By the way, what's your typing goal?${keyHint}`,
        mood: 'happy',
        drillText: '',
      };
    }
    return {
      reply: `Hey ${userName}! You're at ${scoped.weightedAvgWpm} avg WPM and ${scoped.weightedAccuracy}% accuracy across ${overall.totalTests} tests. ${weakEn ? `Top slips: ${weakEn}. Slow down 10% on those keys to jump your Net WPM!` : 'Your accuracy looks super clean!'} What WPM are you aiming for?${keyHint}`,
      mood: 'coach',
      drillText: '',
    };
  }

  // Friendly everyday Hindi fallback
  if (overall.totalTests === 0) {
    return {
      reply: `अरे ${userName}, पहले एक छोटा सा 3-min टेस्ट लगाओ ना! उसके बाद मैं तुम्हारी हर गलती और स्पीड का पूरा हिसाब बताऊँगा। वैसे तुम किस exam या काम के लिए typing कर रहे हो?${keyHint}`,
      mood: 'happy',
      drillText: '',
    };
  }

  if (
    lower.includes('why') ||
    lower.includes('fail') ||
    lower.includes('mistake') ||
    lower.includes('weak') ||
    lower.includes('galat') ||
    lower.includes('गलत') ||
    lower.includes('क्यों') ||
    lower.includes('kyu')
  ) {
    const why =
      topWeak.length > 0
        ? `देखो ${userName}, तुम्हारी सबसे ज़्यादा गलती ${weakStr} पर हो रही है${patterns.topZoneLabelHi ? ` (ज़्यादातर ${patterns.topZoneLabelHi} से)` : ''}। ${patterns.avgRawGap >= 6 ? `तुम थोड़ा तेज़ भाग रहे हो (Raw स्पीड +${patterns.avgRawGap} WPM ज़्यादा है), इसलिए no-backspace में Net WPM कट रही है।` : 'बस इन keys पर 10% आराम से टाइप करो, गलतियाँ आधी हो जाएँगी!'}`
        : `अरे ${userName}, तुम्हारी accuracy (${scoped.weightedAccuracy}%) तो बढ़िया है! अब बस लंबे टेस्ट में rhythm बनाए रखो।`;
    return {
      reply: `${why} क्या तुम रोज़ कितना टाइम प्रैक्टिस करते हो?${keyHint}`,
      mood: 'coach',
      drillText: '',
    };
  }

  if (
    lower.includes('plan') ||
    lower.includes('drill') ||
    lower.includes('improve') ||
    lower.includes('practice') ||
    lower.includes('कैसे') ||
    lower.includes('कहाँ')
  ) {
    return {
      reply: `चलो ${userName}, ये रहा तुम्हारे लिए मस्त 5-min प्लान:\n• पहले 2 मिनट: Weak Keys drill आराम से लगाओ (96%+ accuracy पर ध्यान)${topWeak.length ? ` — खासकर ${topWeak.map((w) => w.displayChar).join(' ')}` : ''}।\n• अगले 3 मिनट: एक पूरा 3-min टेस्ट लगाओ बिना जल्दबाज़ी किए!\nवैसे तुम्हारा target WPM क्या है?${keyHint}`,
      mood: 'happy',
      drillText: '',
    };
  }

  return {
    reply: `हे ${userName}! अभी तुम्हारे ${overall.totalTests} टेस्ट हो चुके हैं—avg स्पीड ${scoped.weightedAvgWpm} WPM, accuracy ${scoped.weightedAccuracy}% और बेस्ट ${scoped.bestWpm} WPM है! ${topWeak.length ? `सबसे ज़्यादा ${weakStr} अटक रहे हैं—चलो इन्हें ठीक करें?` : 'बढ़िया चल रहा है यार!'} वैसे तुम्हें English ज़्यादा पसंद है या Hindi Mangal/Kruti Dev?${keyHint}`,
    mood: 'happy',
    drillText: '',
  };
}
