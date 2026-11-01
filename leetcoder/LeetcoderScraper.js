import Logger from "../utils/Logger.js";
import {getBrowserDetails} from "../managers/BrowserManager.js";
import FileManager from "../managers/FileManager.js";
import {sleep} from "../utils/utils.js";

const SUBMISSIONS_LIST_QUERY = `
  query Submissions($offset: Int!, $limit: Int!) {
    submissionList(offset: $offset, limit: $limit) {
      hasNext
      submissions {
        id
        title
        titleSlug
        statusDisplay
        lang
      }
    }
  }
`;

const SUBMISSION_DETAILS_QUERY = `
  query submissionDetails($submissionId: Int!) {
    submissionDetails(submissionId: $submissionId) {
      code
      runtime
      memory
      statusCode
      lang {
        name
        verboseName
      }
      question {
        title
        titleSlug
      }
    }
  }
`;

class LeetcoderScraper {
  static async #fetchSubmissionDetails(page, submissionId) {
    return await page.evaluate(async (query, subId) => {
      try {
        const response = await fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            variables: { submissionId: parseInt(subId, 10) }
          })
        });
        const json = await response.json();
        return json?.data?.submissionDetails || null;
      } catch (err) {
        return null;
      }
    }, SUBMISSION_DETAILS_QUERY, submissionId);
  }

  static async #fetchSubmissionPage(page, offset, limit = 20) {
    return await page.evaluate(async (query, offsetVal, limitVal) => {
      try {
        const response = await fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            variables: { offset: offsetVal, limit: limitVal }
          })
        });
        const json = await response.json();
        return json?.data?.submissionList || { hasNext: false, submissions: [] };
      } catch (err) {
        return { hasNext: false, submissions: [] };
      }
    }, SUBMISSIONS_LIST_QUERY, offset, limit);
  }

  static async scrapeAcceptedSolutions() {
    Logger.error('<<<< Starting Leetcoder Scrapper >>>>');
    const {page} = await getBrowserDetails();
    
    // Ensure we are on an authenticated LeetCode page to access session cookies & GraphQL
    try {
      await page.goto('https://leetcode.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
    } catch (_) {
      Logger.warn('Navigation warning: proceeding to query GraphQL API.');
    }

    const seenProblems = new Set();
    let offset = 0;
    const limit = 20;
    let totalScraped = 0;

    while (true) {
      Logger.warn(`[FETCHING_SUBMISSIONS]\t: offset ${offset}...`);
      const listData = await this.#fetchSubmissionPage(page, offset, limit);
      const submissions = listData.submissions || [];

      if (submissions.length === 0) {
        Logger.success('No more submissions found.');
        break;
      }

      Logger.success(`Fetched ${submissions.length} submissions at offset ${offset}`);

      for (const sub of submissions) {
        if (sub.statusDisplay !== 'Accepted') {
          continue;
        }

        const problemSlug = sub.titleSlug;
        if (seenProblems.has(problemSlug)) {
          Logger.warn(`[SKIPPING_DUPLICATE]\t:${problemSlug} (already scraped latest accepted submission)`);
          continue;
        }

        Logger.warn(`[SCRAPING_CODE]\t\t:${problemSlug} (ID: ${sub.id})`);
        const details = await this.#fetchSubmissionDetails(page, sub.id);

        if (details && details.code) {
          const fileContent = {
            problemName: details.question?.titleSlug || problemSlug,
            language: details.lang?.name || sub.lang,
            code: details.code
          };
          await FileManager.saveScrapedSolution(fileContent);
          seenProblems.add(problemSlug);
          totalScraped++;
        } else {
          Logger.error(`[FAILED_FETCH]\t\t: Could not retrieve code for submission ${sub.id}`);
        }

        await sleep(0.3); // Respectful rate limiting
      }

      if (!listData.hasNext) {
        Logger.success('Reached end of submission history.');
        break;
      }

      offset += limit;
      await sleep(0.5);
    }

    Logger.success(`[SCRAPING_COMPLETE]\t: Successfully processed ${totalScraped} accepted problem solutions.`);
    Logger.error('<<<< Exiting Leetcoder Scrapper >>>>');
  }

  /**
   * Scrape solutions globally (legacy testing helper)
   */
  static async scrapeAcceptedSolutionsGlobally() {
    Logger.error('<<<< Starting Leetcoder Global Scrapper >>>>');
    const {page} = await getBrowserDetails();
    let id_no = 1010011580;
    while (id_no > 0) {
      const details = await this.#fetchSubmissionDetails(page, id_no);
      if (details && details.code && details.question?.titleSlug) {
        await FileManager.saveScrapedSolution({
          problemName: details.question.titleSlug,
          language: details.lang?.name || 'unknown',
          code: details.code
        });
      }
      id_no++;
      await sleep(1);
    }
    Logger.error('<<<< Exiting Leetcoder Global Scrapper >>>>');
  }
}

export default LeetcoderScraper;
