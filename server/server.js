import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import qrcode from 'qrcode';
import dotenv from 'dotenv';

import botRunner from './BotRunner.js';
import { getStats } from './routes/stats.js';
import { getSolutions, getSolutionCode } from './routes/solutions.js';
import { getSettings, saveSettings } from './routes/settings.js';
import authRoutes from './routes/authRoutes.js';
import { requireAuth, authService, verifyToken } from './auth.js';
import { dbAdapter } from './database/dbAdapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env') });

const PORT = process.env.PORT || process.env.SERVER_PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

function getNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const list = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        list.push({ name, address: iface.address });
      }
    }
  }
  // Prioritize Wi-Fi interface if present
  list.sort((a, b) => (b.name.toLowerCase().includes('wi-fi') ? 1 : 0) - (a.name.toLowerCase().includes('wi-fi') ? 1 : 0));
  return list;
}

// ─── Express Setup ────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Serve React build in production
const clientDist = path.join(ROOT, 'client', 'dist');
app.use(express.static(clientDist));

// ─── Authentication API (Public + Protected) ──────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Bot API (Protected) ──────────────────────────────────────────────────────
app.post('/api/bot/start', requireAuth, (req, res) => {
  const { mode, input } = req.body;
  if (!mode) return res.status(400).json({ success: false, error: 'mode is required' });
  const started = botRunner.start(String(mode), input || '');
  if (!started) {
    return res.status(409).json({ success: false, error: 'Bot already running. Stop it first.' });
  }
  res.json({ success: true, mode });
});

app.post('/api/bot/stop', requireAuth, (req, res) => {
  const stopped = botRunner.stop();
  res.json({ success: true, stopped });
});

app.get('/api/bot/status', requireAuth, (req, res) => {
  res.json({
    success: true,
    running: botRunner.isRunning(),
    mode: botRunner.getMode(),
  });
});

// ─── Stats & Solutions (Protected) ────────────────────────────────────────────
app.get('/api/stats', requireAuth, getStats);
app.get('/api/solutions', requireAuth, getSolutions);
app.get('/api/solutions/:slug/code', requireAuth, getSolutionCode);

// ─── Settings (Protected) ─────────────────────────────────────────────────────
app.get('/api/settings', requireAuth, getSettings);
app.post('/api/settings', requireAuth, saveSettings);

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
wss.on('error', (err) => {
  // Handled together with httpServer error listener
});

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

wss.on('connection', (ws, req) => {
  let authenticated = false;
  try {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (token && verifyToken(token, authService.getJwtSecret())) {
      authenticated = true;
    }
  } catch (_) {}

  // Allow client 5 seconds to authenticate if not passed in query string
  const authTimer = setTimeout(() => {
    if (!authenticated) {
      ws.close(4001, 'Unauthorized');
    }
  }, 5000);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'auth' && data.token) {
        if (verifyToken(data.token, authService.getJwtSecret())) {
          authenticated = true;
          clearTimeout(authTimer);
          ws.send(JSON.stringify({
            type: 'status',
            running: botRunner.isRunning(),
            mode: botRunner.getMode(),
          }));
        } else {
          ws.close(4001, 'Unauthorized');
        }
      }
    } catch (_) {}
  });

  if (authenticated) {
    clearTimeout(authTimer);
    ws.send(JSON.stringify({
      type: 'status',
      running: botRunner.isRunning(),
      mode: botRunner.getMode(),
    }));
  }
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️  Port ${PORT} is already in use by another running instance of Leetcoder or another app.`);
    console.error(`💡 To free port ${PORT} on Windows, run this command in PowerShell:`);
    console.error(`   Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT} -State Listen).OwningProcess -Force\n`);
    process.exit(1);
  } else {
    console.error('\n❌ Server error:', err);
    process.exit(1);
  }
});

async function startServer() {
  try {
    await dbAdapter.init();
  } catch (e) {
    console.warn('[DB] Database init warning:', e.message);
  }

  httpServer.listen(PORT, HOST, async () => {
    const networks = getNetworkAddresses();
    const primaryNet = networks[0];

    console.log('\n  ====================================================');
    console.log('  🚀 Leetcoder Suite is Live on your Wi-Fi & Network!');
    console.log('  ====================================================');
    console.log(`  ➜  Local:    http://localhost:${PORT}`);
    if (primaryNet) {
      console.log(`  ➜  Network:  http://${primaryNet.address}:${PORT} (${primaryNet.name})`);
    }
    for (let i = 1; i < networks.length; i++) {
      console.log(`  ➜  Network:  http://${networks[i].address}:${PORT} (${networks[i].name})`);
    }

    if (primaryNet) {
      const networkUrl = `http://${primaryNet.address}:${PORT}`;
      console.log(`\n  📱 Scan with your phone on the same Wi-Fi:\n`);
      try {
        const qr = await qrcode.toString(networkUrl, { type: 'terminal', small: true });
        console.log(qr);
      } catch (_) {}
    }
    console.log('  ====================================================\n');
  });
}

startServer();

