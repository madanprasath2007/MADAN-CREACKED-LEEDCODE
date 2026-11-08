import {promises as fs} from "fs";
import {
  JAVA_SOLUTIONS_PATH,
  LEETCODER_DATA_PATH,
  LEETCODER_SCRAPED_SOLUTIONS_PATH,
  PREFERRED_LANGUAGE,
  SOLVED_PROBLEMS_PATH
} from "../data.js";
import Logger from "../utils/Logger.js";
import {fetchJavaSolution} from "../utils/utils.js";
import path from 'path';

class FileManager {
  static async getAllProblemsNames() {
    const fileList = await fs.readdir('./problems');
    const files = fileList.map(file => file.split(".")[0]);
    Logger.success(`Total Problems found ${files.length}`, files);
    return files;
  }

  static async getProblemDetails(problemName, preferredLang = PREFERRED_LANGUAGE) {
    const isJavaPreferred = String(preferredLang).toLowerCase() === 'java';

    // 1. If preferred language is Java, prioritize online verified/cached Java solutions
    if (isJavaPreferred) {
      // Check cached Java solutions (verified online repository)
      try {
        const cachedPath = path.join(JAVA_SOLUTIONS_PATH, `${problemName}.json`);
        const file = await fs.readFile(cachedPath, 'utf-8');
        const data = JSON.parse(file);
        if (data && data.code && (!data.language || data.language.toLowerCase() === 'java')) {
          Logger.warn(`[LOADED_JAVA_CACHED]\t:`, {language: 'java', problem: problemName});
          return {language: 'java', code: data.code};
        }
      } catch (_) {}

      // Fetch verified Java solution online from high-efficiency repository and cache it
      try {
        Logger.warn(`[FETCHING_JAVA_SOLUTION]: ${problemName}...`);
        const javaSolution = await fetchJavaSolution(problemName);
        if (javaSolution && javaSolution.code) {
          await fs.mkdir(JAVA_SOLUTIONS_PATH, {recursive: true});
          await fs.writeFile(
            path.join(JAVA_SOLUTIONS_PATH, `${problemName}.json`),
            JSON.stringify(javaSolution, null, 2)
          );
          Logger.success(`[FETCHED_JAVA_ONLINE]\t: ${problemName} Java solution saved to cache.`);
          return {language: 'java', code: javaSolution.code};
        }
      } catch (err) {
        Logger.warn(`[FETCH_JAVA_FAILED]: Could not fetch Java solution online for ${problemName}`);
      }

      // Check ScrapedSolutions if already in Java
      try {
        const scrapedPath = path.join(LEETCODER_SCRAPED_SOLUTIONS_PATH, `${problemName}.json`);
        const file = await fs.readFile(scrapedPath, 'utf-8');
        const data = JSON.parse(file);
        if (data && data.code && data.language && data.language.toLowerCase() === 'java') {
          Logger.warn(`[LOADED_JAVA_SCRAPED]\t:`, {language: 'java', problem: problemName});
          return {language: 'java', code: data.code};
        }
      } catch (_) {}

      // Check ./problems/ fallback if already in Java
      try {
        const probPath = `./problems/${problemName}.json`;
        const file = await fs.readFile(probPath, 'utf-8');
        const data = JSON.parse(file);
        if (data && data.code && data.language && data.language.toLowerCase() === 'java') {
          Logger.warn(`[LOADED_JAVA_LOCAL]\t:`, {language: 'java', problem: problemName});
          return {language: 'java', code: data.code};
        }
      } catch (_) {}

      // Strict Java mode: if no Java solution found anywhere, skip non-Java questions completely
      Logger.warn(`[NON_JAVA_QUESTION]\t: No Java solution available for "${problemName}". Non-Java questions are skipped.`);
      return null;
    }

    // 2. Fallback to standard problem files for non-Java configurations
    let file = null;
    try {
      file = await fs.readFile(`./problems/${problemName}.json`, 'utf-8');
    } catch (_) {
      try {
        file = await fs.readFile(path.join(LEETCODER_SCRAPED_SOLUTIONS_PATH, `${problemName}.json`), 'utf-8');
      } catch (e) {
        throw new Error(`Solution file for "${problemName}" not found in ./problems/ or ./ScrapedSolutions/`);
      }
    }
    const data = JSON.parse(file);
    const obj = {language: data.language, code: data.code};
    Logger.warn(`[PROBLEM_DETAILS]\t\t:`, obj);
    return obj;
  }

  static async #ensureSolvedProblemSetFile() {
    try {
      await fs.access(SOLVED_PROBLEMS_PATH);
    } catch (_) {
      Logger.warn(`${SOLVED_PROBLEMS_PATH} was not found, created the file.`);
      await fs.mkdir(LEETCODER_DATA_PATH, {recursive: true});
      await fs.writeFile(SOLVED_PROBLEMS_PATH, JSON.stringify([]));
    }
  }

  static async getSolvedProblemSet() {
    await this.#ensureSolvedProblemSetFile();
    const data = await fs.readFile(SOLVED_PROBLEMS_PATH, 'utf8');
    return new Set(JSON.parse(data));
  }

  static async setSolvedProblemSet(problemName) {
    const problemSet = await this.getSolvedProblemSet();
    problemSet.add(problemName);
    Logger.success(`[CACHED]\t\t\t:${problemName}`);
    await fs.writeFile(SOLVED_PROBLEMS_PATH, JSON.stringify(Array.from(problemSet)));
  }

  static async saveScrapedSolution(fileContent) {
    const name = fileContent.problemName;
    await fs.mkdir(LEETCODER_SCRAPED_SOLUTIONS_PATH, {recursive: true});
    const filePath = path.join(LEETCODER_SCRAPED_SOLUTIONS_PATH, `${name}.json`);

    try {
      await fs.access(filePath);
      Logger.warn(`[ALREADY_SCRAPPED]\t\t:${name}`);
    } catch (error) {
      Logger.warn(`[SAVING]\t\t\t:${name}`);
      try {
        await fs.writeFile(filePath, JSON.stringify(fileContent, null, 4));
        Logger.success(`[SAVED]\t\t\t\t:${name}`);
      } catch (err) {
        Logger.success(`[FAILED]\t\t\t:${name}`, err);
      }
    }
  }
}

export default FileManager;
