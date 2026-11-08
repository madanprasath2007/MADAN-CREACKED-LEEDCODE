import Logger from "./utils/Logger.js";
import readline from 'readline';
import LeetcoderAuthenticator from "./leetcoder/LeetcoderAuthenticator.js";
import LeetcoderLogin from "./leetcoder/LeetcoderLogin.js";
import {EXITING_LEETCODER, LEETCODER_ASCII_ART, LEETCODER_MODE_QUESTION} from "./utils/constants.js";
import LeetcoderSolver from "./leetcoder/LeetcoderSolver.js";
import {closeBrowser} from "./managers/BrowserManager.js";
import LeetcoderScraper from "./leetcoder/LeetcoderScraper.js";
import {sendEmailNotification} from "./utils/emailNotifier.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

(async () => {
  let executionSummary = {
    success: false,
    dailyChallenge: null,
    dailyChallengeSuccess: false,
    solvedProblems: [],
    failedProblems: [],
    errorMessage: ''
  };

  try {
    const args = process.argv.slice(2);
    let type = args[0];
    let customInput = args.slice(1).join(' ');

    if (!type) {
      Logger.success(LEETCODER_ASCII_ART);
      Logger.success(LEETCODER_MODE_QUESTION);
      type = await question('Select mode (L, 1, 2, 3, 4 or other): ');
    }

    const mode = type.trim();

    if (mode.toLowerCase() === 'l') {
      await LeetcoderLogin.loginUser();
    } else if (mode === '1') {
      await LeetcoderAuthenticator.loginUser();
      const res = await LeetcoderSolver.solve();
      if (res) {
        executionSummary.solvedProblems = res.solved || [];
        executionSummary.failedProblems = res.failed || [];
        executionSummary.success = true;
      }
    } else if (mode === '2') {
      await LeetcoderAuthenticator.loginUser();
      await LeetcoderScraper.scrapeAcceptedSolutions();
    } else if (mode === '3') {
      await LeetcoderAuthenticator.loginUser();
      const res = await LeetcoderSolver.solveDailyChallenge();
      executionSummary.dailyChallenge = res.problemName;
      executionSummary.dailyChallengeSuccess = res.success;
      executionSummary.success = res.success;
      if (res.problemName && !res.success) {
        executionSummary.failedProblems.push(`${res.problemName} (Daily Challenge)`);
      }
    } else if (mode === '4') {
      if (!customInput) {
        customInput = await question('Enter problem number(s), slug(s), range (e.g. 1-5), or file path: ');
      }
      await LeetcoderAuthenticator.loginUser();
      const res = await LeetcoderSolver.solveCustomProblems(customInput);
      if (res) {
        executionSummary.solvedProblems = res.solved || [];
        executionSummary.failedProblems = res.failed || [];
        executionSummary.success = (res.solved && res.solved.length > 0);
      }
    } else if (mode === '5' || mode.toLowerCase() === 'auto') {
      const { runPredefinedInstructions } = await import('./runInstructions.js');
      await runPredefinedInstructions();
      return; // runPredefinedInstructions handles its own summary, browser close, and email notification
    }

    // If an action was performed (Mode 1, 3, or 4), send an email notification
    if (['1', '3', '4'].includes(mode)) {
      await sendEmailNotification(executionSummary);
    }
  } catch (err) {
    Logger.error('Something went wrong!', err);
    executionSummary.errorMessage = err.message || String(err);
    try {
      await sendEmailNotification(executionSummary);
    } catch (_) {}
  } finally {
    Logger.error(EXITING_LEETCODER);
    rl.close();
    await closeBrowser();
    process.exit();
  }
})();
