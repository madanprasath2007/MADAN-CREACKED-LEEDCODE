import Logger from "./utils/Logger.js";
import readline from 'readline';
import LeetcoderAuthenticator from "./leetcoder/LeetcoderAuthenticator.js";
import LeetcoderLogin from "./leetcoder/LeetcoderLogin.js";
import {EXITING_LEETCODER, LEETCODER_ASCII_ART, LEETCODER_MODE_QUESTION} from "./utils/constants.js";
import LeetcoderSolver from "./leetcoder/LeetcoderSolver.js";
import {closeBrowser} from "./managers/BrowserManager.js";
import LeetcoderScraper from "./leetcoder/LeetcoderScraper.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

(async () => {
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
      await LeetcoderSolver.solve();
    } else if (mode === '2') {
      await LeetcoderAuthenticator.loginUser();
      await LeetcoderScraper.scrapeAcceptedSolutions();
    } else if (mode === '3') {
      await LeetcoderAuthenticator.loginUser();
      await LeetcoderSolver.solveDailyChallenge();
    } else if (mode === '4') {
      if (!customInput) {
        customInput = await question('Enter problem number(s), slug(s), range (e.g. 1-5), or file path: ');
      }
      await LeetcoderAuthenticator.loginUser();
      await LeetcoderSolver.solveCustomProblems(customInput);
    }
  } catch (err) {
    Logger.error('Something went wrong!', err);
  } finally {
    Logger.error(EXITING_LEETCODER);
    rl.close();
    await closeBrowser();
    process.exit();
  }
})();
