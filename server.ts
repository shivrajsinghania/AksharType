import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStatusPayload, handleCoachRequest, handleChatRequest } from './lib/groq-buddy.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/buddy/status', (_req: Request, res: Response) => {
    res.json(getStatusPayload());
  });

  app.post('/api/buddy/coach', async (req: Request, res: Response) => {
    const result = await handleCoachRequest(
      (req.body || {}) as Record<string, unknown>,
      req.ip || 'local'
    );
    res.status(result.status).json(result.payload);
  });

  app.post('/api/buddy/chat', async (req: Request, res: Response) => {
    const result = await handleChatRequest(
      (req.body || {}) as Record<string, unknown>,
      req.ip || 'local'
    );
    res.status(result.status).json(result.payload);
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AksharType server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AksharType server:', err);
  process.exit(1);
});
