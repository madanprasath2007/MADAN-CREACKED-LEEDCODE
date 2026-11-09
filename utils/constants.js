// Questions Solver XPath & Resilient Selectors
export const QUESTIONS_CODE_DIV_XPATH = [
  "//div[contains(@class, 'monaco-editor')]//textarea",
  "//div[contains(@class, 'view-lines')]",
  "/html/body/div[1]/div[2]/div/div/div[4]/div/div/div[8]/div/div[2]/div[1]/div/div[1]/div[1]/textarea"
];
export const QUESTIONS_SUBMIT_DIV_XPATH = [
  "//button[@data-cy='submit-code-btn']",
  "//button[@data-e2e-locator='console-submit-button']",
  "//button[normalize-space(.)='Submit' or contains(., 'Submit')]",
  "/html/body/div[1]/div[2]/div/div/div[3]/nav/div[2]/div/div[1]/div/div/div[2]/div/div[2]/div/div[3]/div[3]/div/button"
];
export const QUESTIONS_SUBMIT_ACCEPTED_XPATH = [
  "//div[contains(text(), 'Solved')]",
  "//span[contains(text(), 'Solved')]",
  "/html/body/div[1]/div[2]/div/div/div[4]/div/div/div[4]/div/div[1]/div[1]/div[2]"
];
export const QUESTIONS_LANGUAGE_BTN_XPATH = [
  "//button[contains(@id, 'headlessui-listbox-button')]",
  "//button[contains(@class, 'rounded') and (.//text()='C++' or .//text()='Python3' or .//text()='Java' or .//text()='JavaScript' or .//text()='TypeScript' or .//text()='C' or .//text()='Go' or .//text()='Rust')]",
  "/html/body/div[1]/div[2]/div/div/div[4]/div/div/div[8]/div/div[1]/div[1]/div[1]/button"
];
export const QUESTIONS_LANGUAGE_DIV_XPATH = [
  "//div[@role='option']",
  "//li[@role='option']",
  "//div[contains(@id, 'headlessui-listbox-options')]//div",
  "/html/body/div[8]/div/div/div/div"
];
export const IS_SOLUTION_ACCEPTED_DIV_XPATH = [
  "//span[contains(text(), 'Accepted')]",
  "//div[contains(@data-e2e-locator, 'submission-result') and contains(., 'Accepted')]",
  "/html/body/div[1]/div[2]/div/div/div[4]/div/div/div[11]/div/div/div/div[2]/div/div[1]/div[1]/div[1]/span"
];
export const IS_QUESTION_PREMIUM = [
  "//a[contains(text(), 'Subscribe')]",
  "//button[contains(text(), 'Subscribe')]",
  "//*[contains(text(), 'Subscribe to unlock')]",
  "/html/body/div[1]/div[2]/div/div/div[4]/div[2]/div/div[2]"
];

// Maps LeetCode's language slug (stored in each ./problems/*.json) to the label
// shown in the editor's dropdown. Add an entry to support a new language.
export const LANGUAGE_DISPLAY_MAP = {
  cpp: "C++",
  java: "Java",
  python: "Python",
  python3: "Python3",
  c: "C",
  csharp: "C#",
  javascript: "JavaScript",
  typescript: "TypeScript",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  dart: "Dart",
  golang: "Go",
  ruby: "Ruby",
  scala: "Scala",
  rust: "Rust",
  racket: "Racket",
  erlang: "Erlang",
  elixir: "Elixir",
  bash: "Bash",
  mysql: "MySQL",
  mssql: "MS SQL Server",
};

export const LEETCODER_ASCII_ART = `
    __  ___ ___     ____   ___    _   __   ______ ____   ___    ______ __ __ ______ ____ 
   /  |/  //   |   / __ \ /   |  / | / /  / ____// __ \ /   |  / ____// //_// ____// __ \
  / /|_/ // /| |  / / / // /| | /  |/ /  / /    / /_/ // /| | / /    / ,<  / __/  / / / /
 / /  / // ___ | / /_/ // ___ |/ /|  /  / /___ / _, _// ___ |/ /___ / /| |/ /___ / /_/ / 
/_/  /_//_/  |_|/_____//_/  |_/_/ |_/   \____//_/ |_|/_/  |_|\____//_/ |_/_____//_____/  
    
    Developed by : Madan Prasath
    Github Link  : https://github.com/madanprasath2007/MADAN-CREACKED-LEEDCODE
    `;

export const LEETCODER_MODE_QUESTION = `
     Select a mode
     [L] Login to LeetCode (do this first / whenever your session expires).
     [1] Start Solver (Solve all queued problems).
     [2] Scrape Solved Problems.
     [3] Solve Daily Challenge.
     [4] Solve Specific Problem(s) (by number, name, range 1-5, or list file).
     [other] Exit.
    `;

export const EXITING_LEETCODER = `Thanks for using Madan Cracked LeetCode. GitHub: https://github.com/madanprasath2007/MADAN-CREACKED-LEEDCODE`;