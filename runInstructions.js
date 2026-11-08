import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from './utils/Logger.js';
import LeetcoderAuthenticator from './leetcoder/LeetcoderAuthenticator.js';
import LeetcoderSolver from './leetcoder/LeetcoderSolver.js';
import LeetcoderScraper from './leetcoder/LeetcoderScraper.js';
import { closeBrowser } from './managers/BrowserManager.js';
import { sendEmailNotification } from './utils/emailNotifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INSTRUCTIONS_FILE = path.join(__dirname, 'instructions.json');
const LOG_FILE = path.join(__dirname, 'automation_run.log');

function appendRunLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (_) {}
}

export async function runPredefinedInstructions() {
  appendRunLog('Starting Automated Instruction Runner');
  Logger.success('====================================================');
  Logger.success('🤖 LEETCODER AUTOMATION: Starting Predefined Run');
  Logger.success('====================================================');

  const reportState = {
    success: false,
    dailyChallenge: null,
    dailyChallengeSuccess: false,
    solvedProblems: [],
    failedProblems: [],
    errorMessage: ''
  };

  if (!fs.existsSync(INSTRUCTIONS_FILE)) {
    const errorMsg = `Instructions file not found: ${INSTRUCTIONS_FILE}`;
    Logger.error(errorMsg);
    appendRunLog(errorMsg);
    reportState.errorMessage = errorMsg;
    await sendEmailNotification(reportState);
    return;
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(INSTRUCTIONS_FILE, 'utf8'));
  } catch (err) {
    Logger.error(`Failed to parse instructions.json: ${err.message}`);
    appendRunLog(`Parse error: ${err.message}`);
    reportState.errorMessage = `Failed to parse instructions.json: ${err.message}`;
    await sendEmailNotification(reportState);
    return;
  }

  if (config.enabled === false) {
    Logger.warn('Instructions automation is disabled in instructions.json. Exiting.');
    appendRunLog('Automation is disabled.');
    return;
  }

  try {
    Logger.warn('[1/3] Checking LeetCode authentication session...');
    appendRunLog('Authenticating session...');
    await LeetcoderAuthenticator.loginUser();

    const tasks = config.instructions || [];
    Logger.success(`[2/3] Executing ${tasks.length} instruction task(s)...`);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      Logger.warn(`--- [Task ${i + 1}/${tasks.length}] Type: ${task.type} (${task.description || ''}) ---`);
      appendRunLog(`Running task ${task.type}`);

      switch (task.type) {
        case 'daily_challenge': {
          const res = await LeetcoderSolver.solveDailyChallenge();
          reportState.dailyChallenge = res.problemName;
          reportState.dailyChallengeSuccess = res.success;
          if (res.success && res.problemName) {
            reportState.solvedProblems.push(`${res.problemName} (Daily Challenge)`);
          } else if (res.problemName) {
            reportState.failedProblems.push(`${res.problemName} (Daily Challenge)`);
          }
          break;
        }

        case 'new_unsolved_batch': {
          const count = task.count || 8;
          const res = await LeetcoderSolver.solveNewUnsolvedProblems(count);
          if (res && res.solved) {
            reportState.solvedProblems.push(...res.solved);
          }
          if (res && res.failed) {
            reportState.failedProblems.push(...res.failed);
          }
          break;
        }

        case 'solve_all_queued':
          await LeetcoderSolver.solve();
          break;

        case 'specific_problems':
          if (task.target) {
            await LeetcoderSolver.solveCustomProblems(String(task.target));
          } else {
            Logger.warn('Skipping specific_problems task because target is empty.');
          }
          break;

        case 'scrape_solved':
          await LeetcoderScraper.scrapeAcceptedSolutions();
          break;

        default:
          Logger.warn(`Unknown instruction type: ${task.type}`);
      }
    }

    reportState.success = true;
    Logger.success('====================================================');
    Logger.success('🎉 [3/3] All predefined instructions completed successfully!');
    Logger.success('====================================================');
    appendRunLog('Completed successfully.');
  } catch (err) {
    Logger.error(`Automation error encountered: ${err.message}`);
    appendRunLog(`Execution error: ${err.stack || err.message}`);
    reportState.errorMessage = err.message || String(err);
  } finally {
    try {
      await sendEmailNotification(reportState);
    } catch (mailErr) {
      Logger.error(`Failed to send email notification: ${mailErr.message}`);
    }
    await closeBrowser();
  }
}

// Allow direct CLI execution: node runInstructions.js
if (process.argv[1] && process.argv[1].endsWith('runInstructions.js')) {
  (async () => {
    await runPredefinedInstructions();
    process.exit(0);
  })();
}

