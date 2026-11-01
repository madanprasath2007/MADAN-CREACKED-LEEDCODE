import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

function getEnv() {
  const raw = {};
  try {
    const buf = require('fs').readFileSync(path.join(ROOT, '.env'), 'utf-8');
    dotenv.parse(buf);
  } catch (_) {}
  dotenv.config({ path: path.join(ROOT, '.env') });
  return {
    USER_EMAIL: process.env.USER_EMAIL || 'my_leetcode_profile',
  };
}

export async function getStats(req, res) {
  try {
    dotenv.config({ path: path.join(ROOT, '.env'), override: true });
    const userEmail = process.env.USER_EMAIL || 'my_leetcode_profile';
    const solvedPath = path.join(ROOT, 'UserData', userEmail, 'LeetcoderData', 'SolvedProblems.json');
    const problemsDir = path.join(ROOT, 'problems');

    let solvedCount = 0;
    let solvedProblems = [];
    try {
      const data = await fs.readFile(solvedPath, 'utf-8');
      solvedProblems = JSON.parse(data);
      solvedCount = solvedProblems.length;
    } catch (_) {}

    let totalProblems = 0;
    try {
      const files = await fs.readdir(problemsDir);
      totalProblems = files.filter(f => f.endsWith('.json')).length;
    } catch (_) {}

    res.json({ success: true, solvedCount, totalProblems, solvedProblems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

