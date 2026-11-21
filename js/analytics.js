/**
 * AksharType — Mathematical Performance Analytics, Weak-Key Diagnostics,
 * Achievements Evaluator & Targeted Weak-Key Drill Generator.
 */

import { LAYOUTS, describePhysicalKey, tokenizeForLayout } from './keymaps.js';
import { PASSAGES } from './passages.js';

function getLocalDayKey(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/**
 * Compute current consecutive-day practice streak across all user sessions.
 */
export function computeDailyStreak(sessions) {
  if (!sessions || sessions.length === 0) return 0;
  const uniqueDays = new Set(sessions.map((s) => getLocalDayKey(s.timestamp)));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cursor = new Date(today);
  // Allow streak to remain active if user practiced yesterday even if not yet today
  if (!uniqueDays.has(getLocalDayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!uniqueDays.has(getLocalDayKey(cursor.getTime()))) {
      return 0;
    }
  }

  let streak = 0;
  while (uniqueDays.has(getLocalDayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Compute mathematically weighted averages and comparisons across all matching tests.
 */
export function computeDashboardMetrics(allSessions, layoutFilter = 'all') {
  const filtered =
    layoutFilter === 'all'
      ? allSessions
      : allSessions.filter((s) => s.layout === layoutFilter);

  const totalTests = filtered.length;
  let totalDurationSec = 0;
  let totalCorrectKeystrokes = 0;
  let totalKeystrokes = 0;
  let totalRightChars = 0;
  let totalWrongChars = 0;
  let bestWpm = 0;

  for (const s of filtered) {
    const dur = Math.max(1, Number(s.durationSec || 60));
    const rightChars = Number(s.correctChars || 0);
    const wrongChars = Number(s.errorChars || 0);
    const corrKeys = Number(s.correctKeystrokes ?? rightChars);
    const allKeys = Number(s.totalKeystrokes ?? rightChars + wrongChars);

    totalDurationSec += dur;
    totalCorrectKeystrokes += corrKeys;
    totalKeystrokes += allKeys;
    totalRightChars += rightChars;
    totalWrongChars += wrongChars;
    if (Number(s.netWpm || 0) > bestWpm) {
      bestWpm = Number(s.netWpm || 0);
    }
  }

  // Time-weighted mathematical Average Net WPM across all tests:
  // sum(correctKeystrokes / 5) / sum(durationMinutes)
  const totalMinutes = totalDurationSec / 60;
  const weightedAvgWpm =
    totalTests > 0 && totalMinutes > 0
      ? Number((totalCorrectKeystrokes / 5 / totalMinutes).toFixed(1))
      : 0;

  // True keystroke-weighted mathematical Overall Accuracy across all tests:
  // sum(correctKeystrokes) / sum(totalKeystrokes) * 100
  // Never falsely rounds to 100% when any mistake exists.
  let weightedAccuracy = 0;
  if (totalKeystrokes > 0) {
    if (totalCorrectKeystrokes >= totalKeystrokes) {
      weightedAccuracy = 100;
    } else {
      const exact = (totalCorrectKeystrokes / totalKeystrokes) * 100;
      weightedAccuracy = Math.min(99.9, Number(exact.toFixed(1)));
    }
  }

  // Recent 5 tests weighted WPM vs All-Time comparison delta
  let recentDeltaWpm = null;
  if (totalTests >= 2) {
    const recentSlice = filtered.slice(0, Math.min(5, totalTests));
    let rKeys = 0;
    let rSec = 0;
    for (const s of recentSlice) {
      rKeys += Number(s.correctKeystrokes ?? s.correctChars ?? 0);
      rSec += Math.max(1, Number(s.durationSec || 60));
    }
    const recentWpm = rSec > 0 ? rKeys / 5 / (rSec / 60) : 0;
    recentDeltaWpm = Number((recentWpm - weightedAvgWpm).toFixed(1));
  }

  // Chronological trend series (oldest -> newest, up to 30 most recent sessions)
  const trendSeries = filtered
    .slice(0, 30)
    .reverse()
    .map((s, idx) => {
      const d = new Date(s.timestamp);
      const layoutObj = LAYOUTS[s.layout];
      return {
        index: idx + 1,
        dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        netWpm: Number(s.netWpm || 0),
        accuracy: Number(s.accuracy || 0),
        mistakes: Number(s.errorChars || 0),
        layoutName: layoutObj ? layoutObj.shortName : s.layoutName || s.layout,
      };
    });

  return {
    totalTests,
    weightedAvgWpm,
    weightedAccuracy,
    recentDeltaWpm,
    bestWpm,
    totalRightChars,
    totalWrongChars,
    totalWordsTyped: Math.floor(totalCorrectKeystrokes / 5),
    totalDurationSec,
    streakDays: computeDailyStreak(allSessions),
    trendSeries,
  };
}

/**
 * Analyze per-key hit/miss telemetry for a specific layout.
 * Returns heatmap stats by base physical key AND ranked weakest characters.
 */
export function computeWeakKeyReport(allKeyStats, layoutId) {
  const bucket = (allKeyStats && allKeyStats[layoutId]) || {};
  const byPhysicalKey = {};
  const charList = [];

  for (const [char, counts] of Object.entries(bucket)) {
    const hits = Number(counts.hits || 0);
    const misses = Number(counts.misses || 0);
    const total = hits + misses;
    if (total <= 0) continue;

    const errorRate = Math.round((misses / total) * 100);
    // Determine primary physical key for this character in the given layout
    const tokens = tokenizeForLayout(char, layoutId);
    const firstKey =
      tokens.length > 0 && tokens[0].keySeq && tokens[0].keySeq.length > 0
        ? tokens[0].keySeq[0]
        : char;
    const keyInfo = describePhysicalKey(firstKey, layoutId);

    // Accumulate into physical key heatmap bucket
    const base = keyInfo.baseKey;
    if (!byPhysicalKey[base]) {
      byPhysicalKey[base] = { hits: 0, misses: 0, total: 0, errorRate: 0 };
    }
    byPhysicalKey[base].hits += hits;
    byPhysicalKey[base].misses += misses;
    byPhysicalKey[base].total += total;

    if (misses > 0) {
      // Weighted severity prioritizes repeated mistakes over one-off flukes
      const severity = (misses / total) * Math.log2(misses + 1.5);
      charList.push({
        char,
        displayChar: char === ' ' ? 'Space' : char,
        keyLabel: keyInfo.label,
        hits,
        misses,
        total,
        errorRate,
        severity,
      });
    }
  }

  for (const stats of Object.values(byPhysicalKey)) {
    stats.errorRate = stats.total > 0 ? Math.round((stats.misses / stats.total) * 100) : 0;
  }

  charList.sort((a, b) => b.severity - a.severity || b.misses - a.misses);

  return {
    byPhysicalKey,
    weakestChars: charList.slice(0, 8),
    hasData: Object.keys(byPhysicalKey).length > 0,
  };
}

/**
 * Generate a natural real-word practice drill targeting the user's weakest characters.
 */
export function buildWeakKeysDrill(weakestChars, layoutId) {
  const layout = LAYOUTS[layoutId] || LAYOUTS.english;
  const targetLang = layout.language;

  // Build vocabulary pool from curated passages of this language + supplemental drill words
  const supplemental =
    targetLang === 'hindi'
      ? [
          'प्रगति', 'सफलता', 'अनुशासन', 'परिश्रम', 'कार्यालय', 'प्रशासन', 'विश्वास',
          'संविधान', 'प्रौद्योगिकी', 'अभ्यास', 'कुशलता', 'सटीकता', 'एकाग्रता', 'निरंतरता',
          'महत्वपूर्ण', 'दस्तावेज', 'न्यायालय', 'संरक्षण', 'पर्यावरण', 'विविधता',
          'उल्लेखनीय', 'पारदर्शी', 'संतुलन', 'व्यवस्था', 'समाधान', 'परिणाम', 'उद्देश्य',
          'अध्ययन', 'प्रशिक्षण', 'संस्कृति', 'वैज्ञानिक', 'आधुनिक', 'संगठन', 'सहयोग',
          'निर्णय', 'कर्तव्य', 'अधिकार', 'विस्तार', 'संवाद', 'लेखन', 'टंकण', 'शुद्धता',
        ]
      : [
          'precision', 'rhythm', 'keyboard', 'discipline', 'practice', 'accuracy',
          'velocity', 'structure', 'interface', 'thoughtful', 'character', 'quality',
          'sequence', 'progress', 'workflow', 'strength', 'benchmark', 'question',
          'navigate', 'platform', 'solution', 'keyboard', 'exercise', 'momentum',
          'consistent', 'highlight', 'framework', 'document', 'standard', 'feedback',
          'maximize', 'optimize', 'keyboard', 'zephyr', 'quartz', 'complex',
          'junction', 'vibrant', 'synergy', 'project', 'balance', 'clarity',
        ];

  const wordSet = new Set(supplemental);
  for (const p of PASSAGES) {
    if (p.language !== targetLang) continue;
    const words = p.text
      .replace(/[.,;!?()।\-]/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2);
    for (const w of words) {
      wordSet.add(w);
    }
  }

  const allWords = Array.from(wordSet);
  const weakSet = new Set(
    weakestChars
      .map((item) => item.char)
      .filter((ch) => ch && ch !== ' ')
  );

  // Score every word by how many of the user's weak characters it exercises
  const scored = allWords.map((word) => {
    let score = 0;
    const lowerWord = targetLang === 'english' ? word.toLowerCase() : word;
    for (const weakChar of weakSet) {
      const needle = targetLang === 'english' ? weakChar.toLowerCase() : weakChar;
      if (lowerWord.includes(needle)) {
        score += 3;
      }
    }
    return { word, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const focusedPool = scored.filter((item) => item.score > 0).map((item) => item.word);
  const pool = focusedPool.length >= 12 ? focusedPool.slice(0, 48) : allWords;

  // Assemble ~140 natural words with light shuffling so repetition feels organic
  const drillWords = [];
  for (let i = 0; i < 140; i += 1) {
    const idx = (i * 7 + Math.floor(i / pool.length) * 3) % pool.length;
    drillWords.push(pool[idx]);
  }

  const topLabels = weakestChars
    .filter((c) => c.char !== ' ')
    .slice(0, 4)
    .map((c) => c.displayChar)
    .join(' ');

  return {
    id: `weak-drill-${layoutId}-${Date.now()}`,
    language: targetLang,
    category: 'Weak Keys Drill',
    title: topLabels
      ? targetLang === 'hindi'
        ? `कमज़ोर कुंजी अभ्यास (${topLabels})`
        : `Weak Keys Drill (${topLabels})`
      : targetLang === 'hindi'
        ? 'लक्षित कुंजी अभ्यास'
        : 'Targeted Key Drill',
    text: drillWords.join(' '),
    isCustom: true,
  };
}

/**
 * Evaluate all data-driven user achievements strictly from persisted history.
 */
export function evaluateAchievements(allSessions) {
  const totalSessions = allSessions.length;
  const bestWpm = allSessions.reduce((m, s) => Math.max(m, Number(s.netWpm || 0)), 0);
  const hasPerfectRun = allSessions.some(
    (s) => Number(s.accuracy) === 100 && Number(s.totalChars || 0) >= 20
  );
  const hasEnglish = allSessions.some((s) => s.layout === 'english');
  const hasHindi = allSessions.some((s) => s.layout === 'mangal' || s.layout === 'kruti-dev');
  const hasMultiPage = allSessions.some(
    (s) => s.testMode === 'pages' && (s.targetLabel === '2 Pages' || s.targetLabel === '3 Pages')
  );
  const streak = computeDailyStreak(allSessions);

  // Overall weighted accuracy for Accuracy Ace
  let corr = 0;
  let tot = 0;
  for (const s of allSessions) {
    corr += Number(s.correctKeystrokes ?? s.correctChars ?? 0);
    tot += Number(s.totalKeystrokes ?? (s.correctChars || 0) + (s.errorChars || 0));
  }
  const overallAcc = tot > 0 ? (corr / tot) * 100 : 0;

  return [
    {
      id: 'first-run',
      title: 'First Session',
      description: 'Complete your first typing test',
      unlocked: totalSessions >= 1,
      progressLabel: totalSessions >= 1 ? 'Unlocked' : '0 / 1 session',
      progressPct: Math.min(100, totalSessions * 100),
    },
    {
      id: 'zero-mistakes',
      title: 'Zero Mistakes',
      description: 'Finish a session with 100% accuracy',
      unlocked: hasPerfectRun,
      progressLabel: hasPerfectRun ? 'Unlocked' : '0 / 1 perfect run',
      progressPct: hasPerfectRun ? 100 : 0,
    },
    {
      id: 'speed-40',
      title: '40+ WPM Pace',
      description: 'Reach 40 Net WPM in any layout',
      unlocked: bestWpm >= 40,
      progressLabel: bestWpm >= 40 ? 'Unlocked' : `${bestWpm} / 40 WPM`,
      progressPct: Math.min(100, Math.round((bestWpm / 40) * 100)),
    },
    {
      id: 'speed-60',
      title: '60+ WPM Mastery',
      description: 'Reach 60 Net WPM in any layout',
      unlocked: bestWpm >= 60,
      progressLabel: bestWpm >= 60 ? 'Unlocked' : `${bestWpm} / 60 WPM`,
      progressPct: Math.min(100, Math.round((bestWpm / 60) * 100)),
    },
    {
      id: 'accuracy-ace',
      title: 'Accuracy Ace',
      description: 'Maintain 95%+ overall accuracy across 5 tests',
      unlocked: totalSessions >= 5 && overallAcc >= 95,
      progressLabel:
        totalSessions >= 5 && overallAcc >= 95
          ? 'Unlocked'
          : `${Math.min(totalSessions, 5)}/5 tests · ${overallAcc.toFixed(0)}%`,
      progressPct: Math.min(100, Math.round((Math.min(totalSessions, 5) / 5) * 100)),
    },
    {
      id: 'bilingual',
      title: 'Bilingual Typist',
      description: 'Practice both English and Hindi (मंगल / कृति देव)',
      unlocked: hasEnglish && hasHindi,
      progressLabel:
        hasEnglish && hasHindi
          ? 'Unlocked'
          : `${(hasEnglish ? 1 : 0) + (hasHindi ? 1 : 0)} / 2 scripts`,
      progressPct: ((hasEnglish ? 1 : 0) + (hasHindi ? 1 : 0)) * 50,
    },
    {
      id: 'multi-page',
      title: 'Page Endurance',
      description: 'Complete a 2-page or 3-page typing test',
      unlocked: hasMultiPage,
      progressLabel: hasMultiPage ? 'Unlocked' : '0 / 1 multi-page run',
      progressPct: hasMultiPage ? 100 : 0,
    },
    {
      id: 'streak-3',
      title: '3-Day Streak',
      description: 'Complete sessions on 3 consecutive days',
      unlocked: streak >= 3,
      progressLabel: streak >= 3 ? 'Unlocked' : `${streak} / 3 days`,
      progressPct: Math.min(100, Math.round((streak / 3) * 100)),
    },
    {
      id: 'ten-sessions',
      title: 'Consistent Practitioner',
      description: 'Complete 10 total typing sessions',
      unlocked: totalSessions >= 10,
      progressLabel: totalSessions >= 10 ? 'Unlocked' : `${totalSessions} / 10 sessions`,
      progressPct: Math.min(100, Math.round((totalSessions / 10) * 100)),
    },
  ];
}
