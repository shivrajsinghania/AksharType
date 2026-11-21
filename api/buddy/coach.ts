import { handleCoachRequest } from '../../lib/groq-buddy.ts';

interface VercelLikeReq {
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
}

interface VercelLikeRes {
  status(code: number): VercelLikeRes;
  json(data: unknown): void;
}

export default async function handler(req: VercelLikeReq, res: VercelLikeRes) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : (forwarded || 'vercel').split(',')[0].trim();
  const result = await handleCoachRequest(req.body || {}, ip);
  res.status(result.status).json(result.payload);
}
