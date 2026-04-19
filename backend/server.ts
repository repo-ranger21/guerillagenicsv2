import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import v1Router from './src/routes/api.ts';
import { setupCrons } from './src/services/dataIngestion.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Data Ingestion
  setupCrons();

  app.use(express.json());

  // Tactical Intelligence API v1
  app.use('/api/v1', v1Router);

  // Legacy/Internal endpoints
  app.get('/api/health', (req, res) => res.json({ status: 'ok', mission_time: new Date() }));

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API endpoint available at http://localhost:${PORT}/api/matchups`);
  });
}

startServer();
