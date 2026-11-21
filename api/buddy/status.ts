import { getStatusPayload } from '../../lib/groq-buddy.ts';

interface VercelLikeReq {
  method?: string;
}

interface VercelLikeRes {
  status(code: number): VercelLikeRes;
  json(data: unknown): void;
}

export default function handler(req: VercelLikeReq, res: VercelLikeRes) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }
  res.status(200).json(getStatusPayload());
}
