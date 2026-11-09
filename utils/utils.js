import {promises as fs} from "fs";
import path from "path";
import {LEETCODER_SCRAPED_SOLUTIONS_PATH} from "../data.js";

export const sleep = async (time) => {
  await new Promise((resolve) => setTimeout(resolve, time * 1000));
};

export const getElementByXPath = async (element, xpath, timeoutDelay = 30, delay = 1.3) => {
  await sleep(delay);
  const xpaths = Array.isArray(xpath) ? xpath : [xpath];
  const perTimeout = Math.max(3000, Math.floor((timeoutDelay * 1000) / xpaths.length));

  for (const xp of xpaths) {
    try {
      if (typeof element.waitForXPath === 'function') {
        await element.waitForXPath(xp, {
          visible: true,
          timeout: perTimeout,
        });
        const res = await element.$x(xp);
        if (res && res.length > 0) return res;
      } else {
        const selector = `::-p-xpath(${xp})`;
        await element.waitForSelector(selector, {
          visible: true,
          timeout: perTimeout,
        });
        const res = await element.$$(selector);
        if (res && res.length > 0) return res;
      }
    } catch (_) {
      // try next xpath candidate
    }
  }

  // Final fallback to the primary xpath
  if (typeof element.waitForXPath === 'function') {
    await element.waitForXPath(xpaths[0], {
      visible: true,
      timeout: timeoutDelay * 1000,
    });
    return await element.$x(xpaths[0]);
  }
  return await element.$$(`::-p-xpath(${xpaths[0]})`);
};

export const getElementBySelector = async (element, selector, timeoutDelay = 30, delay = 1.3) => {
  await sleep(delay);
  const selectors = Array.isArray(selector) ? selector : [selector];
  // Give each candidate an equal slice of the total timeout, minimum 3 s.
  const perTimeout = Math.max(3000, Math.floor((timeoutDelay * 1000) / selectors.length));

  for (const sel of selectors) {
    try {
      await element.waitForSelector(sel, {
        visible: true,
        timeout: perTimeout,
      });
      const res = await element.$$(sel);
      if (res && res.length > 0) return res;
    } catch (_) {
      // try next selector candidate
    }
  }

  // All candidates failed – do one final attempt with a generous timeout on
  // every selector before giving up, so we surface a useful error.
  for (const sel of selectors) {
    try {
      await element.waitForSelector(sel, {
        visible: true,
        timeout: Math.max(5000, timeoutDelay * 500),
      });
      const res = await element.$$(sel);
      if (res && res.length > 0) return res;
    } catch (_) {}
  }

  // Nothing matched – throw with the full selector list for easy debugging.
  throw new Error(
    `None of the selectors matched within ${timeoutDelay}s: ${selectors.join(', ')}`
  );
};

let cntrlKey = process.platform === "win32" ? "Control" : "Meta";

export const selectAllHelper = async (page) => {
  await page.keyboard.down(cntrlKey);
  await page.keyboard.press("KeyA");
  await page.keyboard.up(cntrlKey);
};

export const pasteHelper = async (page) => {
  await page.keyboard.down(cntrlKey);
  await page.keyboard.press("KeyV");
  await page.keyboard.up(cntrlKey);
};

/**
 * Resolves a problem number (e.g. "1", "15") or slug to a valid LeetCode titleSlug.
 */
export const resolveProblemToSlug = async (input) => {
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // 1. Direct check in ./problems/
  try {
    await fs.access(`./problems/${trimmed}.json`);
    return trimmed;
  } catch (_) {}

  // 2. Direct check in ScrapedSolutions/
  try {
    await fs.access(path.join(LEETCODER_SCRAPED_SOLUTIONS_PATH, `${trimmed}.json`));
    return trimmed;
  } catch (_) {}

  // 3. Query LeetCode GraphQL to resolve question ID or search keyword to titleSlug
  try {
    const query = `
      query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
        problemsetQuestionList: questionList(
          categorySlug: $categorySlug
          limit: $limit
          skip: $skip
          filters: $filters
        ) {
          data {
            questionFrontendId
            titleSlug
          }
        }
      }
    `;
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        query,
        variables: {
          categorySlug: '',
          skip: 0,
          limit: 10,
          filters: {searchKeywords: trimmed}
        }
      })
    });
    const json = await res.json();
    const questions = json?.data?.problemsetQuestionList?.data || [];

    // Exact frontend ID match (e.g. "1" matches questionFrontendId "1")
    const idMatch = questions.find(q => String(q.questionFrontendId) === trimmed);
    if (idMatch) return idMatch.titleSlug;

    // Match on titleSlug directly
    const slugMatch = questions.find(q => q.titleSlug.toLowerCase() === trimmed.toLowerCase());
    if (slugMatch) return slugMatch.titleSlug;

    // First match if any
    if (questions.length > 0) return questions[0].titleSlug;
  } catch (_) {}

  // Fallback to formatted slug
  return trimmed.toLowerCase().replace(/\s+/g, '-');
};

/**
 * Fetches verified Java solution from open-source repositories for a given problem slug.
 */
export const fetchJavaSolution = async (problemSlug) => {
  try {
    const query = `
      query getQuestionDetails($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionFrontendId
          title
          titleSlug
        }
      }
    `;
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query, variables: {titleSlug: problemSlug}})
    });
    const json = await res.json();
    const q = json?.data?.question;
    if (!q || !q.questionFrontendId) return null;

    const num = parseInt(q.questionFrontendId, 10);
    const blockStart = Math.floor(num / 100) * 100;
    const blockEnd = blockStart + 99;
    const block = `${String(blockStart).padStart(4, '0')}-${String(blockEnd).padStart(4, '0')}`;
    const folderName = `${String(num).padStart(4, '0')}.${q.title}`;
    const url = `https://raw.githubusercontent.com/doocs/leetcode/main/solution/${block}/${encodeURIComponent(folderName)}/Solution.java`;

    const codeRes = await fetch(url);
    if (codeRes.ok) {
      const javaCode = await codeRes.text();
      return {
        problemName: problemSlug,
        language: 'java',
        code: javaCode
      };
    }
  } catch (_) {}
  return null;
};

/**
 * Parses user input containing problem numbers, slugs, ranges ("1-5"), or a file path.
 */
export const parseProblemInputs = async (rawInput) => {
  const trimmed = String(rawInput).trim();
  if (!trimmed) return [];

  let items = [];

  // Check if input is a valid file path
  try {
    const fileStat = await fs.stat(trimmed);
    if (fileStat.isFile()) {
      const content = await fs.readFile(trimmed, 'utf-8');
      items = content.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean);
    }
  } catch (_) {}

  // If not a file, split by commas, spaces, or semicolons
  if (items.length === 0) {
    items = trimmed.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
  }

  // Handle number ranges like "1-5" or "1..5"
  const expandedItems = [];
  for (const item of items) {
    const rangeMatch = item.match(/^(\d+)(?:\.\.|-)(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start <= end && end - start <= 200) {
        for (let i = start; i <= end; i++) {
          expandedItems.push(String(i));
        }
        continue;
      }
    }
    expandedItems.push(item);
  }

  return expandedItems;
};
