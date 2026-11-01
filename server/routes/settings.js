import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as parseDotenv, stringify as stringifyDotenv } from '../../utils/envUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ENV_PATH = path.join(ROOT, '.env');

export async function getSettings(req, res) {
  try {
    let raw = '';
    try { raw = await fs.readFile(ENV_PATH, 'utf-8'); } catch (_) {}
    const settings = parseDotenv(raw);
    res.json({ success: true, settings });
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

