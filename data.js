import dotenv from 'dotenv';

dotenv.config();

export const GOOGLE_CHROME_EXECUTABLE_PATH = process.env.GOOGLE_CHROME_EXECUTABLE_PATH || 
  (process.platform === 'win32' 
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : "/usr/bin/google-chrome");

export const USER_EMAIL = process.env.USER_EMAIL || 'my_leetcode_profile';

export const PREFERRED_LANGUAGE = (process.env.PREFERRED_LANGUAGE || 'java').toLowerCase();

/**
 * Chrome Profile directory
 */
export const CHROME_PROFILE_PATH = `./UserData/${USER_EMAIL}/ProfileData`;
/**
 * User Leetcode Data Directory
 */
export const LEETCODER_DATA_PATH = `./UserData/${USER_EMAIL}/LeetcoderData`;
/**
 * Scraped Solutions Directory
 */
export const LEETCODER_SCRAPED_SOLUTIONS_PATH = `${LEETCODER_DATA_PATH}/ScrapedSolutions`;
/**
 * Cached Java Solutions Directory
 */
export const JAVA_SOLUTIONS_PATH = `${LEETCODER_DATA_PATH}/JavaSolutions`;
/**
 * Solved Problems are stored in this location so that the bot can continue solving from the unsolved problems.
 */
export const SOLVED_PROBLEMS_PATH = `${LEETCODER_DATA_PATH}/SolvedProblems.json`;
