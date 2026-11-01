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
import {getBrowserDetails} from "../managers/BrowserManager.js";

class LeetcoderSolver {
  static async #checkIfSolvedEarlier(problemName) {
    const solvedProblemSet = await FileManager.getSolvedProblemSet();
    return solvedProblemSet.has(problemName);
  }

  static async #solveProblemWithName(problemName) {
    Logger.warn(`[NAVIGATING]\t\t\t:${problemName}`);
    const {page} = await getBrowserDetails();

    try {
      try {
        await page.goto(`https://leetcode.com/problems/${problemName}/`, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
      } catch (navErr) {
        Logger.warn(`[NAVIGATION_TIMEOUT]: Page navigation exceeded 60s, continuing anyway.`);
      }

      await sleep(2);

      // 1. Check if already solved
      try {
        const acceptedDiv = await getElementByXPath(page, QUESTIONS_SUBMIT_ACCEPTED_XPATH, 4, 0.5);
        const acceptedText = await acceptedDiv[0].evaluate((ele) => ele.textContent);
        if (acceptedText.includes("Solved")) {
          Logger.error(`[ALREADY_SOLVED]\t\t:${problemName}`);
          await FileManager.setSolvedProblemSet(problemName);
          return;
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
          return;
        }
      } catch (_) {
      }

      // 3. Load local solution details (checks ./problems/ first, then ./ScrapedSolutions/)
      let problemDetails;
      try {
        problemDetails = await FileManager.getProblemDetails(problemName);
      } catch (err) {
        Logger.error(`[MISSING_SOLUTION]\t: No solution file found for "${problemName}" in ./problems/ or ./ScrapedSolutions/ folder.`);
        return;
      }
      const {code, language} = problemDetails;
      Logger.warn(`[LOADED_SOLUTION]\t\t:${problemName} (language: ${language}, ${code.length} chars)`);

      // 4. Switch language if necessary
      Logger.warn(`[SWITCHING_LANGUAGE]\t\t:${language}`);
      const targetLabel = LANGUAGE_DISPLAY_MAP[language];
      if (!targetLabel) {
        throw new Error(`Unsupported language "${language}" for ${problemName}. Add it to LANGUAGE_DISPLAY_MAP in utils/constants.js.`);
      }

      try {
        const allLanguagesBtn = await getElementByXPath(page, QUESTIONS_LANGUAGE_BTN_XPATH, 6, 0.5);
        const currentSelectedText = await allLanguagesBtn[0].evaluate((el) => el.textContent.trim());

        if (!currentSelectedText.includes(targetLabel)) {
          await allLanguagesBtn[0].click();
          await sleep(0.5);

          const allLanguagesDivName = await getElementByXPath(page, QUESTIONS_LANGUAGE_DIV_XPATH, 6, 0.5);
          let languageSelected = false;
          for (let index = 0; index < allLanguagesDivName.length; index++) {
            const element = allLanguagesDivName[index];
            const text = await element.evaluate((el) => el.textContent);
            if (text.trim() === targetLabel) {
              await element.click();
              languageSelected = true;
              break;
            }
          }
          if (!languageSelected) {
            Logger.warn(`Language option "${targetLabel}" not clicked directly in list; continuing with active editor.`);
          }
          await sleep(1);
        } else {
          Logger.success(`[LANGUAGE_ALREADY_SET]\t:${targetLabel}`);
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
      } else {
        throw new Error(`${problemName} verdict was "${solutionAcceptedText}".`);
      }
      await sleep(1);
    } catch (err) {
      Logger.error(`[FAILED]\t\t: Failed to solve the ${problemName} problem:`, err.message || err);
    }
  }

  static async #solveProblems(problemNames) {
    for (const problemName of problemNames) {
      const checkIfSolved = await this.#checkIfSolvedEarlier(problemName);
      if (!checkIfSolved) {
        await this.#solveProblemWithName(problemName);
      } else {
        Logger.success(`[SOLVED_EARLIER]\t\t:${problemName}`);
      }
    }
  }

  static async solve() {
    Logger.error('<<<< Starting Leetcoder Solver >>>>');
    const allProblemsName = await FileManager.getAllProblemsNames();
    Logger.success(`[QUEUED]\t\t\t:${allProblemsName.length} problems to process`);
    await this.#solveProblems(allProblemsName);
    Logger.error('<<<< Exiting Leetcoder Solver >>>>');
  }

  static async solveCustomProblems(rawInput) {
    Logger.error('<<<< Starting Custom Problems Solver >>>>');
    const items = await parseProblemInputs(rawInput);
    if (items.length === 0) {
      Logger.error('No valid problem numbers or slugs provided.');
      return;
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
      return;
    }

    Logger.success(`[QUEUED_CUSTOM]\t\t: ${resolvedSlugs.length} problem(s) queued for solving.`);
    await this.#solveProblems(resolvedSlugs);
    Logger.error('<<<< Exiting Custom Problems Solver >>>>');
  }

  static async solveDailyChallenge() {
    Logger.error('<<<< Starting Leetcoder Daily Challenge Solver >>>>');
    
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
      const problemName = result?.data?.activeDailyCodingChallengeQuestion?.question?.titleSlug;

      if (!problemName) {
        Logger.error('[DAILY_CHALLENGE] Could not determine today\'s challenge title slug.');
        return;
      }

      Logger.success(`[DAILY_CHALLENGE]\t\t: ${problemName}`);
      
      const checkIfSolved = await this.#checkIfSolvedEarlier(problemName);
      if (!checkIfSolved) {
        await this.#solveProblemWithName(problemName);
      } else {
        Logger.success(`[SOLVED_EARLIER]\t\t:${problemName}`);
      }
    } catch (err) {
      Logger.error('[DAILY_CHALLENGE] Failed to solve daily challenge:', err.message || err);
    } finally {
      Logger.error('<<<< Exiting Leetcoder Daily Challenge Solver >>>>');
    }
  }
}

export default LeetcoderSolver;
