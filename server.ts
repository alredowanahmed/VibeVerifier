import express from 'express';
import { createServer as createViteServer } from 'vite';
import { analyzeVibeServer } from './src/lib/gemini-server';
import 'dotenv/config';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post('/api/analyze', async (req, res) => {
    try {
      const { image, audio } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
      }

      const result = await analyzeVibeServer(image, audio, apiKey);
      res.json(result);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production (if running as a server), serve static files
    // But for Vercel, this part isn't used as Vercel handles static serving
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
