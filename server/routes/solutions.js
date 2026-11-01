import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

async function listDir(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    return files.filter(f => f.endsWith('.json'));
  } catch (_) {
    return [];
  }
}

export async function getSolutions(req, res) {
  try {
    dotenv.config({ path: path.join(ROOT, '.env'), override: true });
    const userEmail = process.env.USER_EMAIL || 'my_leetcode_profile';

    const scrapedDir = path.join(ROOT, 'UserData', userEmail, 'LeetcoderData', 'ScrapedSolutions');
    const javaDir = path.join(ROOT, 'UserData', userEmail, 'LeetcoderData', 'JavaSolutions');

    const search = (req.query.q || '').toLowerCase().trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);

    const scrapedFiles = await listDir(scrapedDir);
    const javaFiles = await listDir(javaDir);

    // Build unified map: slug -> {scraped, java}
    const allSlugs = new Set([
      ...scrapedFiles.map(f => f.replace('.json', '')),
      ...javaFiles.map(f => f.replace('.json', ''))
    ]);

    let slugArray = Array.from(allSlugs).sort();
    if (search) {
      slugArray = slugArray.filter(s => s.includes(search));
    }

    const total = slugArray.length;
    const paginated = slugArray.slice((page - 1) * limit, page * limit);

    const solutions = await Promise.all(paginated.map(async (slug) => {
      let language = 'unknown';
      let hasJava = false;
      let hasScraped = false;
      let preview = '';

      // Try java cache first
      try {
        const data = JSON.parse(await fs.readFile(path.join(javaDir, `${slug}.json`), 'utf-8'));
        language = 'java';
        hasJava = true;
        preview = (data.code || '').slice(0, 120);
      } catch (_) {}

      // Try scraped
      try {
        const data = JSON.parse(await fs.readFile(path.join(scrapedDir, `${slug}.json`), 'utf-8'));
        hasScraped = true;
        if (!hasJava) {
          language = data.language || 'unknown';
          preview = (data.code || '').slice(0, 120);
        }
      } catch (_) {}

      return { slug, language, hasJava, hasScraped, preview };
    }));

    res.json({ success: true, total, page, limit, solutions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getSolutionCode(req, res) {
  try {
    dotenv.config({ path: path.join(ROOT, '.env'), override: true });
    const userEmail = process.env.USER_EMAIL || 'my_leetcode_profile';
    const { slug } = req.params;
    const type = req.query.type || 'java'; // java | scraped

    const dirMap = {
      java: path.join(ROOT, 'UserData', userEmail, 'LeetcoderData', 'JavaSolutions'),
      scraped: path.join(ROOT, 'UserData', userEmail, 'LeetcoderData', 'ScrapedSolutions'),
    };

    const dir = dirMap[type] || dirMap.java;
    try {
      const data = JSON.parse(await fs.readFile(path.join(dir, `${slug}.json`), 'utf-8'));
      return res.json({ success: true, slug, language: data.language || type, code: data.code || '' });
    } catch (_) {}

    // Fallback: try the other dir
    const altDir = type === 'java' ? dirMap.scraped : dirMap.java;
    try {
      const data = JSON.parse(await fs.readFile(path.join(altDir, `${slug}.json`), 'utf-8'));
      return res.json({ success: true, slug, language: data.language, code: data.code || '' });
    } catch (_) {}

    res.status(404).json({ success: false, error: 'Solution not found.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

