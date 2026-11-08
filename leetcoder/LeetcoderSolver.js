import {
  getElementByXPath,
  parseProblemInputs,
  pasteHelper,
  resolveProblemToSlug,
  selectAllHelper,
  sleep
} from "../utils/utils.js";
import {
  IS_QUESTION_PREMIUM,
  IS_SOLUTION_ACCEPTED_DIV_XPATH,
  LANGUAGE_DISPLAY_MAP,
  QUESTIONS_CODE_DIV_XPATH,
  QUESTIONS_LANGUAGE_BTN_XPATH,
  QUESTIONS_LANGUAGE_DIV_XPATH,
  QUESTIONS_SUBMIT_ACCEPTED_XPATH,
  QUESTIONS_SUBMIT_DIV_XPATH,
} from "../utils/constants.js";
import clipboardy from "clipboardy";
import Logger from "../utils/Logger.js";
import FileManager from "../managers/FileManager.js";
import {getBrowserDetails, recreatePage} from "../managers/BrowserManager.js";
import {PREFERRED_LANGUAGE} from "../data.js";

class LeetcoderSolver {
  static async #checkIfSolvedEarlier(problemName) {
    const solvedProblemSet = await FileManager.getSolvedProblemSet();
    return solvedProblemSet.has(problemName);
  }

  static async #solveProblemWithName(problemName, problemDetails = null) {
    // 1. Ensure solution is available and in Java before spending time navigating
    if (!problemDetails) {
      try {
        problemDetails = await FileManager.getProblemDetails(problemName);
      } catch (err) {
        Logger.error(`[MISSING_SOLUTION]\t: No solution file found for "${problemName}".`);
        return false;
      }
    }

    if (!problemDetails || !problemDetails.code) {
      Logger.warn(`[SKIP_NON_JAVA]\t\t: "${problemName}" has no Java solution. Skipping to next question.`);
      return false;
    }

    if (PREFERRED_LANGUAGE === 'java' && problemDetails.language?.toLowerCase() !== 'java') {
      Logger.warn(`[SKIP_NON_JAVA]\t\t: "${problemName}" language is ${problemDetails.language}, not Java. Skipping to next question.`);
      return false;
    }

    const {code, language} = problemDetails;

    Logger.warn(`[NAVIGATING]\t\t\t:${problemName}`);
    let {page} = await getBrowserDetails();

    try {
      try {
        await page.goto(`https://leetcode.com/problems/${problemName}/`, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });
      } catch (navErr) {
        Logger.warn(`[NAVIGATION_TIMEOUT]: Page navigation exceeded timeout for ${problemName}, attempting recovery...`);
        // If a navigation times out or main frame is detached, recreate page to ensure a clean frame
        const rec = await recreatePage();
        page = rec.page;
        try {
          await page.goto(`https://leetcode.com/problems/${problemName}/`, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
        } catch (_) {}
      }

      // Allow LeetCode React SPA / Monaco editor to fully mount into the frame
      await sleep(3);
      try {
        await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
      } catch (_) {}

      // 1. Check if already solved
      try {
        const acceptedDiv = await getElementByXPath(page, QUESTIONS_SUBMIT_ACCEPTED_XPATH, 4, 0.5);
        const acceptedText = await acceptedDiv[0].evaluate((ele) => ele.textContent);
        if (acceptedText.includes("Solved")) {
          Logger.error(`[ALREADY_SOLVED]\t\t:${problemName}`);
          await FileManager.setSolvedProblemSet(problemName);
          return true;
        }
      } catch (_) {
      }

      // 2. Check if question is premium
      try {
        const premiumDiv = await getElementByXPath(page, IS_QUESTION_PREMIUM, 2, 0.2);
        const premiumText = await premiumDiv[0].evaluate((ele) => ele.textContent);
        if (premiumText.includes("Subscribe")) {
          Logger.error(`[PREMIUM_QUESTION]\t\t:${problemName}. Marking this as solved.`);
          await FileManager.setSolvedProblemSet(problemName);
          return false;
        }
      } catch (_) {
      }

      Logger.warn(`[LOADED_SOLUTION]\t\t:${problemName} (language: ${language}, ${code.length} chars)`);

      // 3. Switch language if necessary
      Logger.warn(`[SWITCHING_LANGUAGE]\t\t:${language}`);
      const targetLabel = LANGUAGE_DISPLAY_MAP[language];
      if (!targetLabel) {
        throw new Error(`Unsupported language "${language}" for ${problemName}. Add it to LANGUAGE_DISPLAY_MAP in utils/constants.js.`);
      }

      try {
        const switchResult = await page.evaluate(async (targetLanguage) => {
          const knownLangs = [
            'C++', 'Java', 'Python', 'Python3', 'C', 'C#', 'JavaScript', 'TypeScript',
            'PHP', 'Swift', 'Kotlin', 'Dart', 'Go', 'Ruby', 'Scala', 'Rust', 'Racket',
            'Erlang', 'Elixir', 'Bash', 'MySQL', 'MS SQL Server', 'Oracle', 'PostgreSQL', 'Pandas'
          ];
          
          // 1. Locate current language dropdown button in the code editor bar
          const buttons = Array.from(document.querySelectorAll('button'));
          const langBtn = buttons.find(b => knownLangs.includes(b.innerText?.trim()));
          if (!langBtn) return { success: false, reason: 'Language button not found' };

          const currentLang = langBtn.innerText.trim();
          if (currentLang.toLowerCase() === targetLanguage.toLowerCase()) {
            return { success: true, alreadySet: true, lang: currentLang };
          }

          // 2. Open dropdown
          langBtn.click();
          await new Promise(r => setTimeout(r, 600));

          // 3. Find and click target language option
          const allElements = Array.from(document.querySelectorAll('div, li, [role="option"], button'));
          const targetItem = allElements.find(el => el.children.length === 0 && el.innerText?.trim().toLowerCase() === targetLanguage.toLowerCase());

          if (!targetItem) {
            return { success: false, reason: `Target option "${targetLanguage}" not in dropdown list` };
          }

          targetItem.click();
          await new Promise(r => setTimeout(r, 800));

          // 4. Verify new selection
          const updatedButtons = Array.from(document.querySelectorAll('button'));
          const updatedBtn = updatedButtons.find(b => knownLangs.includes(b.innerText?.trim()));
          const newLang = updatedBtn?.innerText?.trim();

          return {
            success: newLang?.toLowerCase() === targetLanguage.toLowerCase(),
            lang: newLang
          };
        }, targetLabel);

        if (switchResult.alreadySet) {
          Logger.success(`[LANGUAGE_ALREADY_SET]\t:${targetLabel}`);
        } else if (switchResult.success) {
          Logger.success(`[LANGUAGE_SWITCHED]\t:${switchResult.lang}`);
        } else {
          Logger.warn(`[LANGUAGE_SELECTION_WARN]: ${switchResult.reason || 'Could not switch language'}`);
        }
      } catch (langErr) {
        Logger.warn(`[LANGUAGE_SELECTION_WARN]: Could not switch language automatically: ${langErr.message}`);
      }

      // 5. Populate code into editor
      Logger.warn(`[INJECTING_CODE]\t\t:${problemName}`);
      let codeInjected = false;

      // Try direct Monaco Editor injection
      try {
        codeInjected = await page.evaluate((newCode) => {
          if (window.monaco && window.monaco.editor) {
            const models = window.monaco.editor.getModels();
            if (models && models.length > 0) {
              models[0].setValue(newCode);
              return true;
            }
          }
          return false;
        }, code);
      } catch (_) {}

      // Fallback to clipboard & paste
      if (!codeInjected) {
        clipboardy.writeSync(code);
        const code_editor = await getElementByXPath(page, QUESTIONS_CODE_DIV_XPATH, 6, 0.5);
        await code_editor[0].click();
        await selectAllHelper(page);
        await page.keyboard.press("Backspace");
        await pasteHelper(page);
      }

      await sleep(1);

      // 6. Submit solution
      Logger.warn(`[SUBMITTING]\t\t\t:${problemName}`);
      const submit_btn = await getElementByXPath(page, QUESTIONS_SUBMIT_DIV_XPATH, 6, 0.5);
      await submit_btn[0].click();

      // 7. Await verdict
      Logger.warn(`[AWAITING_VERDICT]\t\t:${problemName}`);
      let solutionAcceptedText = '';
      try {
        const isSolutionAccepted = await getElementByXPath(page, IS_SOLUTION_ACCEPTED_DIV_XPATH, 20, 1.5);
        solutionAcceptedText = await isSolutionAccepted[0].evaluate((ele) => ele.textContent.trim());
      } catch (_) {
        // Fallback verdict scan
        solutionAcceptedText = await page.evaluate(() => {
          const bodyText = document.body.innerText || '';
          if (bodyText.includes('Accepted')) return 'Accepted';
          if (bodyText.includes('Wrong Answer')) return 'Wrong Answer';
          if (bodyText.includes('Time Limit Exceeded')) return 'Time Limit Exceeded';
          if (bodyText.includes('Runtime Error')) return 'Runtime Error';
          if (bodyText.includes('Compile Error')) return 'Compile Error';
          return 'Pending / Unknown';
        });
      }

      if (solutionAcceptedText.includes('Accepted')) {
        Logger.success(`[ACCEPTED]\t\t\t:${problemName}`);
        await FileManager.setSolvedProblemSet(problemName);
        await sleep(1);
        return true;
      } else {
        throw new Error(`${problemName} verdict was "${solutionAcceptedText}".`);
      }
    } catch (err) {
      Logger.error(`[FAILED]\t\t: Failed to solve the ${problemName} problem:`, err.message || err);
      // If frame was detached or broken, recreate the page tab immediately so next problem has a clean state
      if (err.message && (err.message.includes('main frame') || err.message.includes('destroyed') || err.message.includes('detached') || err.message.includes('Target closed'))) {
        try {
          await recreatePage();
        } catch (_) {}
      }
      return false;
    }
  }

  static async #solveProblems(problemNames) {
    const results = { solved: [], failed: [] };
    for (const problemName of problemNames) {
      const checkIfSolved = await this.#checkIfSolvedEarlier(problemName);
      if (!checkIfSolved) {
        const problemDetails = await FileManager.getProblemDetails(problemName);
        if (!problemDetails || !problemDetails.code || (PREFERRED_LANGUAGE === 'java' && problemDetails.language?.toLowerCase() !== 'java')) {
          Logger.warn(`[SKIP_NON_JAVA]\t\t: "${problemName}" is not a Java problem. Skipping.`);
          results.failed.push(problemName);
          continue;
        }

        const ok = await this.#solveProblemWithName(problemName, problemDetails);
        if (ok) {
          results.solved.push(problemName);
        } else {
          results.failed.push(problemName);
        }
      } else {
        Logger.success(`[SOLVED_EARLIER]\t\t:${problemName}`);
        results.solved.push(problemName);
      }
    }
    return results;
  }

  static async solve() {
    Logger.error('<<<< Starting Leetcoder Solver >>>>');
    const allProblemsName = await FileManager.getAllProblemsNames();
    Logger.success(`[QUEUED]\t\t\t:${allProblemsName.length} problems to process`);
    const results = await this.#solveProblems(allProblemsName);
    Logger.error('<<<< Exiting Leetcoder Solver >>>>');
    return results;
  }

  static async solveCustomProblems(rawInput) {
    Logger.error('<<<< Starting Custom Problems Solver >>>>');
    const items = await parseProblemInputs(rawInput);
    if (items.length === 0) {
      Logger.error('No valid problem numbers or slugs provided.');
      return { solved: [], failed: [] };
    }

    Logger.warn(`[PARSING_INPUT]\t\t: Resolving ${items.length} item(s)...`);
    const resolvedSlugs = [];
    for (const item of items) {
      const slug = await resolveProblemToSlug(item);
      if (slug) {
        resolvedSlugs.push(slug);
        Logger.success(`[RESOLVED]\t\t: "${item}" -> ${slug}`);
      } else {
        Logger.error(`[UNRESOLVED]\t\t: Could not find LeetCode problem for "${item}"`);
      }
    }

    if (resolvedSlugs.length === 0) {
      Logger.error('No problems could be resolved to solve.');
      return { solved: [], failed: [] };
    }

    Logger.success(`[QUEUED_CUSTOM]\t\t: ${resolvedSlugs.length} problem(s) queued for solving.`);
    const results = await this.#solveProblems(resolvedSlugs);
    Logger.error('<<<< Exiting Custom Problems Solver >>>>');
    return results;
  }

  static async solveDailyChallenge() {
    Logger.error('<<<< Starting Leetcoder Daily Challenge Solver >>>>');
    let problemName = null;
    let isAccepted = false;
    
    try {
      // Fetch daily challenge from LeetCode GraphQL API
      const response = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query questionOfToday {
              activeDailyCodingChallengeQuestion {
                question {
                  titleSlug
                }
              }
            }
          `
        })
      });
      const result = await response.json();
      problemName = result?.data?.activeDailyCodingChallengeQuestion?.question?.titleSlug;

      if (!problemName) {
        Logger.error('[DAILY_CHALLENGE] Could not determine today\'s challenge title slug.');
        return { problemName: null, success: false };
      }

      Logger.success(`[DAILY_CHALLENGE]\t\t: ${problemName}`);
      
      const checkIfSolved = await this.#checkIfSolvedEarlier(problemName);
      if (!checkIfSolved) {
        const problemDetails = await FileManager.getProblemDetails(problemName);
        if (!problemDetails || !problemDetails.code || (PREFERRED_LANGUAGE === 'java' && problemDetails.language?.toLowerCase() !== 'java')) {
          Logger.warn(`[SKIP_NON_JAVA]\t\t: Today's Daily Challenge "${problemName}" does not have a Java solution. Skipping.`);
          return { problemName, success: false };
        }
        isAccepted = await this.#solveProblemWithName(problemName, problemDetails);
      } else {
        Logger.success(`[SOLVED_EARLIER]\t\t:${problemName}`);
        isAccepted = true;
      }
      return { problemName, success: Boolean(isAccepted) };
    } catch (err) {
      Logger.error('[DAILY_CHALLENGE] Failed to solve daily challenge:', err.message || err);
      return { problemName, success: false };
    } finally {
      Logger.error('<<<< Exiting Leetcoder Daily Challenge Solver >>>>');
    }
  }

  /**
   * Solves target number of new unsolved problems.
   * If any problem fails (e.g. invalid testcase, wrong syntax), it automatically skips it
   * and continues picking subsequent new unsolved problems until the target quota (default: 8)
   * of ACCEPTED problems is fully reached.
   * @param {number} targetSolvedCount Number of successfully solved problems required (default: 8)
   * @param {number} maxAttempts Maximum number of candidate problems to try before stopping (default: 30)
   */
  static async solveNewUnsolvedProblems(targetSolvedCount = 8, maxAttempts = 30) {
    Logger.error(`<<<< Starting Solver: Target = ${targetSolvedCount} Accepted Problems >>>>`);
    const allProblemsName = await FileManager.getAllProblemsNames();
    const solvedProblemSet = await FileManager.getSolvedProblemSet();

    const results = { solved: [], failed: [] };
    let attempts = 0;

    for (const name of allProblemsName) {
      if (results.solved.length >= targetSolvedCount) {
        break;
      }
      if (attempts >= maxAttempts) {
        Logger.warn(`[TARGET_QUOTA] Reached maximum problem attempts limit (${maxAttempts}). Stopping.`);
        break;
      }

      // Check if already in solved cache
      if (solvedProblemSet.has(name) || results.solved.includes(name)) {
        continue;
      }

      // Check if question has a valid Java solution (skip non-Java questions immediately)
      const problemDetails = await FileManager.getProblemDetails(name);
      if (!problemDetails || !problemDetails.code || (PREFERRED_LANGUAGE === 'java' && problemDetails.language?.toLowerCase() !== 'java')) {
        Logger.warn(`[SKIP_NON_JAVA]\t\t: "${name}" is not a Java problem. Skipping immediately to next question...`);
        continue;
      }

      attempts++;
      Logger.warn(`[TRYING_PROBLEM ${attempts}/${maxAttempts}] Target Progress: ${results.solved.length}/${targetSolvedCount} Solved -> "${name}"`);

      const ok = await this.#solveProblemWithName(name, problemDetails);
      if (ok) {
        results.solved.push(name);
        Logger.success(`[QUOTA_PROGRESS] ✅ Solved ${results.solved.length}/${targetSolvedCount}: "${name}"`);
      } else {
        results.failed.push(name);
        Logger.warn(`[REPLACING_PROBLEM] ❌ "${name}" was not accepted. Immediately picking next new problem...`);
      }
    }

    Logger.error(`<<<< Finished: ${results.solved.length} Solved (Target: ${targetSolvedCount}), ${results.failed.length} Failed/Skipped >>>>`);
    return results;
  }
}

export default LeetcoderSolver;
