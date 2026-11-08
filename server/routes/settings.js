import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as parseDotenv, stringify as stringifyDotenv } from '../../utils/envUtils.js';
import { dbAdapter } from '../database/dbAdapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ENV_PATH = path.join(ROOT, '.env');

export async function getSettings(req, res) {
  try {
    let raw = '';
    try { raw = await fs.readFile(ENV_PATH, 'utf-8'); } catch (_) {}
    const settings = parseDotenv(raw);
    const dbStatus = dbAdapter.getStatus();
    res.json({ success: true, settings, dbStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function saveSettings(req, res) {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings payload.' });
    }
    const content = stringifyDotenv(settings);
    await fs.writeFile(ENV_PATH, content, 'utf-8');

    // Dynamically update process.env
    for (const [key, val] of Object.entries(settings)) {
      if (val !== undefined && val !== null) {
        process.env[key] = String(val);
      }
    }

    // Re-initialize database adapter to connect to Supabase if credentials changed
    await dbAdapter.init();

    res.json({ success: true, dbStatus: dbAdapter.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

