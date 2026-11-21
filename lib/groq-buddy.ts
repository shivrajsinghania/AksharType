/**
 * AksharType — Shared Groq Engine for Kibo AI Typing Buddy
 * Used by both Express (server.ts in AI Studio / Node) and Vercel Serverless Functions (/api/buddy/*).
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';
const FALLBACK_GROQ_MODEL = 'llama-3.1-8b-instant';

export function getGroqApiKey(): string {
  return (process.env.GROQ_API_KEY || '').trim();
}

export function getGroqModel(): string {
  const configured = (process.env.GROQ_MODEL || '').trim();
  return configured || DEFAULT_GROQ_MODEL;
}

// Lightweight per-IP sliding-window rate limiter to protect Groq free-tier quota
const rateBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQ = 24;

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateBuckets.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_MAX_REQ) {
    rateBuckets.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  rateBuckets.set(ip, timestamps);
  if (rateBuckets.size > 500) {
    for (const [k, list] of rateBuckets.entries()) {
      if (list.every((t) => now - t >= RATE_WINDOW_MS)) {
        rateBuckets.delete(k);
      }
    }
  }
  return false;
}

export function sanitizeShortText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqCallOptions {
  messages: GroqMessage[];
  maxTokens: number;
  temperature: number;
  jsonMode?: boolean;
}

async function callGroqChat(opts: GroqCallOptions): Promise<{
  ok: boolean;
  content?: string;
  modelUsed?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: string;
  code?: string;
}> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    return {
      ok: false,
      code: 'NO_API_KEY',
      error: 'GROQ_API_KEY is not configured on the server.',
    };
  }

  const primaryModel = getGroqModel();
  const modelsToTry =
    primaryModel === FALLBACK_GROQ_MODEL ? [primaryModel] : [primaryModel, FALLBACK_GROQ_MODEL];

  for (const model of modelsToTry) {
    const isOssReasoning = model.includes('gpt-oss');
    const body: Record<string, unknown> = {
      model,
      messages: opts.messages,
      temperature: opts.temperature,
      max_completion_tokens: opts.maxTokens,
    };

    if (isOssReasoning) {
      body.reasoning_effort = 'low';
    }
    if (opts.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18_000);

    try {
      const resp = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errPayload = (await resp.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        const errMsg =
          typeof errPayload?.error?.message === 'string'
            ? errPayload.error.message
            : `Groq HTTP ${resp.status}`;

        if (
          (resp.status === 404 || resp.status === 400) &&
          model !== modelsToTry[modelsToTry.length - 1]
        ) {
          continue;
        }
        return {
          ok: false,
          code: resp.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR',
          error: errMsg,
        };
      }

      const data = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        if (model !== modelsToTry[modelsToTry.length - 1]) continue;
        return { ok: false, code: 'EMPTY_RESPONSE', error: 'Model returned an empty response.' };
      }

      return {
        ok: true,
        content,
        modelUsed: model,
        usage: data.usage,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (model !== modelsToTry[modelsToTry.length - 1]) continue;
      return {
        ok: false,
        code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
        error: isAbort ? 'Groq request timed out.' : 'Could not reach Groq API.',
      };
    }
  }

  return { ok: false, code: 'UPSTREAM_ERROR', error: 'Groq request failed.' };
}

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function clampMood(val: unknown): 'happy' | 'celebrate' | 'coach' | 'concerned' {
  if (val === 'happy' || val === 'celebrate' || val === 'coach' || val === 'concerned') {
    return val;
  }
  return 'coach';
}

export function getStatusPayload() {
  return {
    configured: Boolean(getGroqApiKey()),
    model: getGroqModel(),
  };
}

export async function handleCoachRequest(body: Record<string, unknown>, clientIp: string) {
  if (isRateLimited(clientIp)) {
    return {
      status: 429,
      payload: {
        ok: false,
        code: 'RATE_LIMITED',
        error: 'अरे थोड़ा रुक जाओ यार! कुछ सेकंड बाद फिर ट्राई करना।',
      },
    };
  }

  const digest = sanitizeShortText(body?.digest, 2200);
  const userName = sanitizeShortText(body?.userName, 40) || 'दोस्त';
  const focusLayout = sanitizeShortText(body?.focusLayout, 20) || 'english';
  const preferredLang = body?.language === 'english' ? 'english' : 'hindi';

  if (!digest) {
    return {
      status: 400,
      payload: { ok: false, code: 'BAD_REQUEST', error: 'Missing typing digest.' },
    };
  }

  const langRule =
    preferredLang === 'english'
      ? 'Write in casual, warm, everyday friendly English.'
      : 'Write in NATURAL DAY-TO-DAY FRIENDLY HINDI (Devanagari script, modern spoken tone like a real friend: "यार", "मस्त", "टेस्ट", "स्पीड", "एक्यूरेसी", "गलती", "फोकस"). NEVER use heavy/old-fashioned textbook Hindi words like टंकण, निरंतरता, उल्लेखनीय, कुशलता, परिश्रम, सटीकता. Use natural English typing terms (WPM, Accuracy, Shift, Space, Test, Drill) smoothly inside Hindi sentences!';

  const systemPrompt = [
    'You are Kibo, a cute, energetic, robotic typing buddy & close friend inside AksharType (English, Hindi Mangal, Kruti Dev 010 typing app with no-backspace mode).',
    `Call the user "${userName}" naturally like a real buddy.`,
    langRule,
    'Be razor-sharp, honest, and grounded strictly in their real stats—never invent numbers.',
    'Explain WHY they slip in specific areas (e.g. Shift timing, pinky/ring reach, Hindi matra order, rushing ahead of muscle memory in no-backspace mode, fatigue drop-off).',
    'Return ONLY a compact valid JSON object with keys:',
    '{"mood":"happy|celebrate|coach|concerned","headline":"<=115 chars warm buddy opener","whyYouFail":"2 short sentences explaining exact root cause","actionPlan":["3 short concrete steps, <=105 chars each"],"celebration":"1 short sentence praising a real achievement/streak/PB or hyping them up","drillNote":"<=90 chars describing what to drill next","memoryNote":"optional <=85 chars new lasting observation about user, or empty string"}',
    'Keep output concise to save tokens.',
  ].join('\n');

  const userPrompt = `Layout focus: ${focusLayout}\nUser telemetry:\n${digest}`;

  const result = await callGroqChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    maxTokens: 600,
    temperature: 0.65,
    jsonMode: true,
  });

  if (!result.ok || !result.content) {
    const status = result.code === 'NO_API_KEY' ? 503 : result.code === 'RATE_LIMITED' ? 429 : 502;
    return {
      status,
      payload: {
        ok: false,
        code: result.code || 'UPSTREAM_ERROR',
        error: result.error || 'Could not generate insight.',
      },
    };
  }

  const parsed = tryParseJsonObject(result.content);
  if (!parsed) {
    return {
      status: 200,
      payload: {
        ok: true,
        source: 'groq',
        model: result.modelUsed,
        usage: result.usage,
        brief: {
          mood: 'coach',
          headline:
            preferredLang === 'english'
              ? `Hey ${userName}, Kibo spotted a few easy wins in your stats!`
              : `अरे ${userName}, मैंने तुम्हारे stats देख लिए—चलो स्पीड बढ़ाते हैं!`,
          whyYouFail: sanitizeShortText(result.content, 340),
          actionPlan: [
            preferredLang === 'english'
              ? 'Slow down 10% for 2 minutes to lock clean accuracy.'
              : 'अगले 2 मिनट थोड़ा आराम से टाइप करो ताकि accuracy 95%+ रहे।',
            preferredLang === 'english'
              ? 'Drill your top missed keys before chasing a speed PB.'
              : 'स्पीड भगाने से पहले अपनी सबसे ज़्यादा miss होने वाली keys का drill करो।',
            preferredLang === 'english'
              ? 'Keep your eyes 1–2 words ahead of the cursor.'
              : 'नज़र हमेशा cursor से 1–2 शब्द आगे रखो, rhythm अपने आप सुधरेगा।',
          ],
          celebration:
            preferredLang === 'english'
              ? 'Every completed test builds real muscle memory!'
              : 'हर टेस्ट के साथ तुम्हारे हाथ और तेज़ हो रहे हैं!',
          drillNote: 'Weak keys drill',
          memoryNote: '',
        },
      },
    };
  }

  const rawActions = Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [];
  const actionPlan = rawActions
    .map((item) => sanitizeShortText(item, 150))
    .filter(Boolean)
    .slice(0, 3);

  return {
    status: 200,
    payload: {
      ok: true,
      source: 'groq',
      model: result.modelUsed,
      usage: result.usage,
      brief: {
        mood: clampMood(parsed.mood),
        headline:
          sanitizeShortText(parsed.headline, 160) ||
          (preferredLang === 'english'
            ? `Hey ${userName}, ready to level up?`
            : `हे ${userName}, चलो आज स्पीड थोड़ा और ऊपर ले जाते हैं!`),
        whyYouFail:
          sanitizeShortText(parsed.whyYouFail, 440) ||
          'एक-दो टेस्ट और पूरे करो, फिर मैं तुम्हारी exact गलतियाँ पकड़ लूँगा।',
        actionPlan:
          actionPlan.length > 0
            ? actionPlan
            : ['3 मिनट का weak-keys drill लगाओ और 95%+ accuracy रखो।'],
        celebration: sanitizeShortText(parsed.celebration, 220) || '',
        drillNote: sanitizeShortText(parsed.drillNote, 140) || '',
        memoryNote: sanitizeShortText(parsed.memoryNote, 100) || '',
      },
    },
  };
}

export async function handleChatRequest(body: Record<string, unknown>, clientIp: string) {
  if (isRateLimited(clientIp)) {
    return {
      status: 429,
      payload: {
        ok: false,
        code: 'RATE_LIMITED',
        error: 'अरे थोड़ा धीरे यार! कुछ सेकंड बाद फिर पूछना।',
      },
    };
  }

  const message = sanitizeShortText(body?.message, 500);
  const digest = sanitizeShortText(body?.digest, 2200);
  const userName = sanitizeShortText(body?.userName, 40) || 'दोस्त';
  const preferredLang = body?.language === 'english' ? 'english' : 'hindi';
  const rawHistory = Array.isArray(body?.history) ? body.history : [];

  if (!message) {
    return {
      status: 400,
      payload: { ok: false, code: 'BAD_REQUEST', error: 'Message cannot be empty.' },
    };
  }

  const history: GroqMessage[] = [];
  for (const entry of rawHistory.slice(-6)) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const role = rec.role === 'assistant' ? 'assistant' : rec.role === 'user' ? 'user' : null;
    const content = sanitizeShortText(rec.content, 420);
    if (role && content) {
      history.push({ role, content });
    }
  }

  const langRule =
    preferredLang === 'english'
      ? 'The user has been chatting consistently in English, so reply in warm, casual, energetic English.'
      : 'Reply in NATURAL DAY-TO-DAY FRIENDLY HINDI (Devanagari script, spoken dost-style tone: "अरे यार", "बढ़िया", "मस्त", "बताओ", "चलो"). NEVER use stiff/shuddh/traditional textbook Hindi words (avoid टंकण, निरंतरता, उल्लेखनीय, सटीकता, अभ्यासक्रम). Mix everyday English words naturally (WPM, accuracy, speed, test, drill, Shift, Space, exam).';

  const systemPrompt = [
    'You are Kibo, a cute, enthusiastic, robotic typing buddy inside AksharType (English, Hindi Mangal, Kruti Dev 010, no-backspace mode).',
    `Talk to "${userName}" like a genuinely interested, supportive best friend—warm, fun, curious, never robotic or boring.`,
    langRule,
    'Use their live stats, weak keys, achievements, streaks, and memory below. Cite real numbers/keys naturally and explain WHY mistakes happen.',
    'Be genuinely curious about the user! When natural (especially if you do not know their goal/exam/background yet), end with 1 short friendly question to learn more about them (e.g., exam prep, daily routine, favorite layout, target WPM).',
    'Keep replies punchy (2-4 short sentences or crisp bullets, under 115 words).',
    'Return ONLY valid JSON: {"reply":"your friendly answer","mood":"happy|celebrate|coach|concerned","memoryNote":"optional <=85 chars new personal fact/goal/habit the user just shared, else empty string","drillText":"optional 15-30 word custom practice drill ONLY if user asks for a drill or practice words, else empty string"}',
    '',
    'LIVE USER CONTEXT:',
    digest || 'No sessions yet.',
  ].join('\n');

  const result = await callGroqChat({
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
    maxTokens: 500,
    temperature: 0.72,
    jsonMode: true,
  });

  if (!result.ok || !result.content) {
    const status = result.code === 'NO_API_KEY' ? 503 : result.code === 'RATE_LIMITED' ? 429 : 502;
    return {
      status,
      payload: {
        ok: false,
        code: result.code || 'UPSTREAM_ERROR',
        error: result.error || 'Kibo could not reply right now.',
      },
    };
  }

  const parsed = tryParseJsonObject(result.content);
  if (!parsed) {
    return {
      status: 200,
      payload: {
        ok: true,
        source: 'groq',
        model: result.modelUsed,
        usage: result.usage,
        reply: sanitizeShortText(result.content, 900),
        mood: 'happy',
        memoryNote: '',
        drillText: '',
      },
    };
  }

  return {
    status: 200,
    payload: {
      ok: true,
      source: 'groq',
      model: result.modelUsed,
      usage: result.usage,
      reply:
        sanitizeShortText(parsed.reply, 1000) ||
        `बढ़िया ${userName}! चलो अपनी tricky keys को ठीक करते हैं।`,
      mood: clampMood(parsed.mood),
      memoryNote: sanitizeShortText(parsed.memoryNote, 100),
      drillText: sanitizeShortText(parsed.drillText, 400),
    },
  };
}
