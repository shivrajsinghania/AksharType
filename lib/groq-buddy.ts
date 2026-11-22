/**
 * AksharType — Shared Groq Engine for Kibo AI Typing Coach
 * Powers both Express (server.ts) and Vercel Serverless Functions (/api/buddy/*).
 * Uses openai/gpt-oss-20b with low reasoning effort for crisp intelligence at minimal token cost.
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

// Per-IP sliding-window rate limiter to protect Groq free-tier quota
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
    const timeoutId = setTimeout(() => controller.abort(), 22_000);

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

function normalizeLayoutChoice(val: unknown): 'english' | 'mangal' | 'kruti-dev' {
  if (val === 'mangal' || val === 'kruti-dev' || val === 'english') return val;
  return 'english';
}

/**
 * Shared expert touch-typing & Indian exam typing knowledge base.
 * Prevents finger-mapping hallucinations (e.g. key 6 is RIGHT index, never left ring!).
 */
const TYPING_EXPERTISE_RULES = [
  'EXACT TOUCH-TYPING FINGER MAP (NEVER get fingers wrong!):',
  '- Left Pinky: ` 1 Q A Z | Left Ring: 2 W S X | Left Middle: 3 E D C | Left Index: 4 5 R T F G V B',
  '- Right Index: 6 7 Y U H J N M | Right Middle: 8 I K , | Right Ring: 9 O L . | Right Pinky: 0 - = P [ ] \\ ; \' /',
  '- Thumbs: Spacebar | Shift: ALWAYS hold Shift with the OPPOSITE hand pinky.',
  'DOMAIN MASTERY:',
  '- AksharType uses no-backspace mode: one error directly cuts Net WPM, so 95%+ accuracy always beats reckless raw speed.',
  '- Speed-building science: look 1-2 words ahead (reading buffer), burst common bigrams/trigrams (th, ing, tion, के, में, प्र), keep wrists neutral/floating, return fingers to home row (ASDF / JKL;) immediately after number-row or symbol reaches.',
  '- Hindi Mangal InScript: Left hand = vowels/matras, Right hand = consonants, `d` = halant (्) for half-letters/conjuncts.',
  '- Hindi Kruti Dev 010: Remington layout where छोटी इ मात्रा (`f`) is typed BEFORE the consonant, Shift changes half-forms/special conjuncts, and Alt codes handle rare glyphs.',
  '- Indian exam targets: SSC CGL/CHSL (~35 WPM Eng / 30 WPM Hindi), CPCT (30 WPM Eng / 20 WPM Hindi), High Court / Stenographer (40-50+ WPM with strict error limits).',
].join('\n');

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
        error: 'थोड़ा रुकिए—कुछ सेकंड बाद दोबारा ट्राई करें।',
      },
    };
  }

  const digest = sanitizeShortText(body?.digest, 2600);
  const userName = sanitizeShortText(body?.userName, 40) || 'Friend';
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
      ? 'Write in clear, warm, intelligent, natural English.'
      : 'Write in clear, natural, modern everyday Hindi (Devanagari script) using natural English typing terms (WPM, Accuracy, Shift, Home Row, Net Speed, Test, Drill). Be warm and respectful—NEVER start with repetitive slang like "अरे यार" and NEVER use heavy textbook Hindi (no टंकण, निरंतरता, उल्लेखनीय, सटीकता).';

  const systemPrompt = [
    'You are Kibo, an intelligent, genuinely helpful robotic typing coach inside AksharType.',
    `Address the user naturally as "${userName}" without sounding robotic or over-familiar. Vary your phrasing freshly every time.`,
    langRule,
    TYPING_EXPERTISE_RULES,
    'Analyze the user telemetry accurately (never invent stats or wrong fingers). Explain the exact mechanical cause of their mistakes and give high-leverage steps.',
    'Return ONLY a valid JSON object:',
    '{"mood":"happy|celebrate|coach|concerned","headline":"<=115 chars fresh, insightful opener","whyYouFail":"2-3 crisp sentences explaining exact root cause using real weak keys & correct finger mechanics","actionPlan":["3 concrete, specific steps (<=115 chars each)"],"celebration":"1 genuine sentence highlighting a real PB/streak/achievement or encouraging milestone","drillNote":"<=90 chars focused drill note","memoryNote":"optional <=85 chars new lasting observation, or empty string"}',
  ].join('\n');

  const userPrompt = `Layout focus: ${focusLayout}\nUser telemetry:\n${digest}`;

  const result = await callGroqChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    maxTokens: 680,
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
              ? `${userName}, here is your focused speed & accuracy breakdown.`
              : `${userName}, आपकी latest typing performance का breakdown तैयार है।`,
          whyYouFail: sanitizeShortText(result.content, 380),
          actionPlan: [
            preferredLang === 'english'
              ? 'Hold 95%+ accuracy for 2 warm-up runs before pushing peak speed.'
              : 'स्पीड बढ़ाने से पहले 2 warm-up टेस्ट में 95%+ accuracy लॉक करें।',
            preferredLang === 'english'
              ? 'Drill your top weak keys slowly and return immediately to the home row.'
              : 'अपनी top weak keys का slow drill करें और हर reach के बाद home row पर लौटें।',
            preferredLang === 'english'
              ? 'Read 1–2 words ahead of the cursor to keep steady rhythm.'
              : 'Cursor से 1–2 शब्द आगे पढ़कर टाइप करें ताकि flow टूटे नहीं।',
          ],
          celebration: '',
          drillNote: 'Targeted weak-keys drill',
          memoryNote: '',
        },
      },
    };
  }

  const rawActions = Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [];
  const actionPlan = rawActions
    .map((item) => sanitizeShortText(item, 160))
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
            ? `${userName}, let's sharpen your typing rhythm.`
            : `${userName}, आइए आज की प्रैक्टिस को और smart बनाते हैं।`),
        whyYouFail:
          sanitizeShortText(parsed.whyYouFail, 480) ||
          'कुछ और टेस्ट पूरे करें ताकि मैं आपकी exact key mistakes का पैटर्न बता सकूँ।',
        actionPlan:
          actionPlan.length > 0
            ? actionPlan
            : ['3 मिनट का weak-keys drill 95%+ accuracy के साथ पूरा करें।'],
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
        error: 'थोड़ा रुकिए—कुछ सेकंड बाद दोबारा भेजें।',
      },
    };
  }

  const message = sanitizeShortText(body?.message, 600);
  const digest = sanitizeShortText(body?.digest, 2600);
  const userName = sanitizeShortText(body?.userName, 40) || 'Friend';
  const preferredLang = body?.language === 'english' ? 'english' : 'hindi';
  const rawHistory = Array.isArray(body?.history) ? body.history : [];

  if (!message) {
    return {
      status: 400,
      payload: { ok: false, code: 'BAD_REQUEST', error: 'Message cannot be empty.' },
    };
  }

  const history: GroqMessage[] = [];
  for (const entry of rawHistory.slice(-8)) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const role = rec.role === 'assistant' ? 'assistant' : rec.role === 'user' ? 'user' : null;
    const content = sanitizeShortText(rec.content, 650);
    if (role && content) {
      history.push({ role, content });
    }
  }

  const langRule =
    preferredLang === 'english'
      ? 'LANGUAGE: The user just wrote in English, so reply cleanly and naturally in English.'
      : 'LANGUAGE: Reply in natural, clear, everyday Hindi (Devanagari script) mixed smoothly with common English typing terms (WPM, Accuracy, PB, Shift, Home Row, Net Speed, Test, Drill). NEVER use traditional/bookish Hindi (avoid टंकण, निरंतरता, उल्लेखनीय, सटीकता). NEVER overuse slang like "अरे यार" — be warm, respectful, and intelligent like a sharp coach.';

  const systemPrompt = [
    'You are Kibo, an intelligent, warm, well-spoken robotic typing mentor & companion inside AksharType.',
    `The user's name is "${userName}". Use their name naturally when it fits (not awkwardly in every sentence).`,
    langRule,
    '',
    'FORMATTING & STYLE (ChatGPT / Claude / Gemini quality):',
    '- Write cleanly structured Markdown! You have full freedom to use short paragraphs, `###` headings, bullet lists (`- `), numbered steps (`1. `), **bold** highlights, inline `` `key` `` code tags, and compact Markdown tables when comparing stats or layouts.',
    '- NEVER dump everything into one giant wall-of-text paragraph. Match response length to the question: quick questions get crisp 2-4 line answers; technique breakdowns or practice plans get clean structured sections.',
    '- Never sound scripted or repetitive. Vary your tone and openings naturally.',
    '- Be genuinely curious about the user when appropriate (occasionally ask 1 relevant follow-up question to learn their goal, exam, keyboard setup, or struggle—not every single turn).',
    '',
    TYPING_EXPERTISE_RULES,
    '',
    'CUSTOM TYPING TEST BUILDER:',
    '- Whenever the user asks to build/create/generate ANY custom typing test, practice passage, or key drill (e.g., number row, weak keys, SSC/CPCT paragraph, Hindi Mangal matra drill, Kruti Dev practice, punctuation drill, speed burst), populate the `customTest` object with a HIGH-QUALITY, realistic 45-100 word passage specifically engineered for their request (real natural words/sentences or targeted patterns—NOT lazy spam like "66666 66666"!).',
    '- If the user did NOT ask for a test/drill, set `customTest` to null.',
    '',
    'LONG-TERM MEMORY EXTRACTION:',
    '- Chat resets when the user closes the app, so ALWAYS extract important personal facts the user reveals (name, exam/job target, WPM goal, preferred language/layout, keyboard type, daily practice time, hand/finger pain or habit) into `memoryUpdates`, `detectedName`, or `detectedGoal`.',
    '',
    'Return ONLY a valid JSON object matching this exact schema:',
    '{"reply":"well-formatted Markdown response","mood":"happy|celebrate|coach|concerned","detectedName":"only if user explicitly tells their name, else empty string","detectedGoal":"only if user mentions a concrete typing/exam goal, else empty string","memoryUpdates":["0 to 2 concise personal facts worth remembering long-term"],"customTest":null OR {"title":"short test title","layout":"english|mangal|kruti-dev","durationMinutes":3,"text":"45-100 words of tailored practice text"}}',
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
    maxTokens: 1050,
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
        reply: sanitizeShortText(result.content, 2400),
        mood: 'happy',
        detectedName: '',
        detectedGoal: '',
        memoryUpdates: [],
        customTest: null,
      },
    };
  }

  // Validate optional customTest payload cleanly
  let customTest: {
    title: string;
    layout: 'english' | 'mangal' | 'kruti-dev';
    durationMinutes: number;
    text: string;
  } | null = null;

  if (parsed.customTest && typeof parsed.customTest === 'object' && !Array.isArray(parsed.customTest)) {
    const ct = parsed.customTest as Record<string, unknown>;
    const cleanText = sanitizeShortText(ct.text, 1400).replace(/\s+/g, ' ').trim();
    if (cleanText.length >= 20) {
      const rawMin = Number(ct.durationMinutes);
      const durationMinutes =
        Number.isFinite(rawMin) && rawMin >= 1 && rawMin <= 15 ? Math.round(rawMin) : 3;
      customTest = {
        title: sanitizeShortText(ct.title, 70) || 'Kibo Custom Practice Test',
        layout: normalizeLayoutChoice(ct.layout),
        durationMinutes,
        text: cleanText,
      };
    }
  } else if (typeof parsed.drillText === 'string' && parsed.drillText.trim().length >= 20) {
    // Backward-compatible safeguard if model outputs drillText
    const cleanText = sanitizeShortText(parsed.drillText, 1200).replace(/\s+/g, ' ').trim();
    customTest = {
      title: 'Kibo Custom Drill',
      layout: /[\u0900-\u097F]/.test(cleanText) ? 'mangal' : 'english',
      durationMinutes: 3,
      text: cleanText,
    };
  }

  // Extract long-term memories cleanly
  const memoryUpdates: string[] = [];
  if (Array.isArray(parsed.memoryUpdates)) {
    for (const m of parsed.memoryUpdates) {
      const clean = sanitizeShortText(m, 110);
      if (clean) memoryUpdates.push(clean);
    }
  }
  if (typeof parsed.memoryNote === 'string' && parsed.memoryNote.trim()) {
    const clean = sanitizeShortText(parsed.memoryNote, 110);
    if (clean && !memoryUpdates.includes(clean)) memoryUpdates.push(clean);
  }

  return {
    status: 200,
    payload: {
      ok: true,
      source: 'groq',
      model: result.modelUsed,
      usage: result.usage,
      reply:
        sanitizeShortText(parsed.reply, 2600) ||
        (preferredLang === 'english'
          ? 'Ready to help! Tell me what you want to work on next.'
          : 'मैं तैयार हूँ—बताइए आज किस चीज़ पर फोकस करना है?'),
      mood: clampMood(parsed.mood),
      detectedName: sanitizeShortText(parsed.detectedName, 32),
      detectedGoal: sanitizeShortText(parsed.detectedGoal, 90),
      memoryUpdates: memoryUpdates.slice(0, 3),
      customTest,
    },
  };
}
