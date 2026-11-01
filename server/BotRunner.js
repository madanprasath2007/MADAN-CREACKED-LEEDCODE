import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

class BotRunner extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.running = false;
    this.currentMode = null;
  }

  isRunning() {
    return this.running;
  }

  getMode() {
    return this.currentMode;
  }

  start(mode, customInput = '') {
    if (this.running) {
      this.emit('log', { level: 'warn', message: 'Bot is already running. Stop it first.' });
      return false;
    }

    const args = [path.join(ROOT, 'index.js'), mode];
    if (customInput) {
      args.push(...customInput.split(' ').filter(Boolean));
    }

    this.process = spawn('node', args, {
      cwd: ROOT,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    this.running = true;
    this.currentMode = mode;
    this.emit('bot_started', { mode });

    const onData = (level) => (data) => {
      const text = data.toString();
      // Strip ANSI escape codes (chalk colors)
      const clean = text.replace(/\x1B\[[0-9;]*m/g, '').trim();
      if (!clean) return;
      for (const line of clean.split('\n')) {
        if (line.trim()) {
          this.emit('log', { level, message: line.trim(), timestamp: new Date().toISOString() });
        }
      }
    };

    this.process.stdout.on('data', onData('info'));
    this.process.stderr.on('data', onData('error'));

    this.process.on('close', (code) => {
      this.running = false;
      this.currentMode = null;
      this.process = null;
      this.emit('bot_stopped', { exitCode: code });
      this.emit('log', { level: 'system', message: `Bot process exited with code ${code}.`, timestamp: new Date().toISOString() });
    });

    this.process.on('error', (err) => {
      this.running = false;
      this.currentMode = null;
      this.process = null;
      this.emit('log', { level: 'error', message: `Failed to start bot: ${err.message}`, timestamp: new Date().toISOString() });
      this.emit('bot_stopped', { exitCode: -1 });
    });

    return true;
  }

  stop() {
    if (!this.running || !this.process) {
      return false;
    }
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(this.process.pid), '/f', '/t'], { shell: true });
      } else {
        // Linux / Unix process group termination
        try {
          process.kill(-this.process.pid, 'SIGKILL');
        } catch (_) {
          this.process.kill('SIGKILL');
        }
      }
    } catch (_) {
      this.process.kill('SIGTERM');
    }
    return true;
  }
}

// Singleton
export default new BotRunner();

