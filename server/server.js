import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import botRunner from './BotRunner.js';
import { getStats } from './routes/stats.js';
import { getSolutions, getSolutionCode } from './routes/solutions.js';
import { getSettings, saveSettings } from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env') });

const PORT = process.env.SERVER_PORT || 3001;

// ─── Express Setup ────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Serve React build in production
const clientDist = path.join(ROOT, 'client', 'dist');
app.use(express.static(clientDist));

// ─── Bot API ──────────────────────────────────────────────────────────────────
app.post('/api/bot/start', (req, res) => {
  const { mode, input } = req.body;
  if (!mode) return res.status(400).json({ success: false, error: 'mode is required' });
  const started = botRunner.start(String(mode), input || '');
  if (!started) {
    return res.status(409).json({ success: false, error: 'Bot already running. Stop it first.' });
  }
  res.json({ success: true, mode });
});

app.post('/api/bot/stop', (req, res) => {
  const stopped = botRunner.stop();
  res.json({ success: true, stopped });
});

app.get('/api/bot/status', (req, res) => {
  res.json({
    success: true,
    running: botRunner.isRunning(),
    mode: botRunner.getMode(),
  });
});

// ─── Stats & Solutions ────────────────────────────────────────────────────────
app.get('/api/stats', getStats);
app.get('/api/solutions', getSolutions);
app.get('/api/solutions/:slug/code', getSolutionCode);

// ─── Settings ─────────────────────────────────────────────────────────────────
app.get('/api/settings', getSettings);
app.post('/api/settings', saveSettings);

// ─── SPA Fallback ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/ws')) {
    return res.sendFile(path.join(clientDist, 'index.html'));
  }
  next();
});

// ─── HTTP + WebSocket Server ──────────────────────────────────────────────────
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

// Broadcast helper
function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1 /* OPEN */) {
      client.send(msg);
    }
  }
}

// Forward BotRunner events → all WebSocket clients
botRunner.on('log', (payload) => broadcast({ type: 'log', ...payload }));
botRunner.on('bot_started', (payload) => broadcast({ type: 'bot_started', ...payload }));
botRunner.on('bot_stopped', (payload) => broadcast({ type: 'bot_stopped', ...payload }));

wss.on('connection', (ws) => {
  // Send current status immediately on connect
  ws.send(JSON.stringify({
    type: 'status',
    running: botRunner.isRunning(),
    mode: botRunner.getMode(),
  }));
});

httpServer.listen(PORT, () => {
  console.log(`\n  Leetcoder App Server running at http://localhost:${PORT}\n`);
});

