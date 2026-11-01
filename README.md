
<p align="center">
  <img src="https://img.shields.io/github/stars/chanpreet3000/Leetcoder?style=for-the-badge&logo=github&color=gold" alt="GitHub stars" />
  <img src="https://img.shields.io/github/forks/chanpreet3000/Leetcoder?style=for-the-badge&logo=github" alt="GitHub forks" />
  <img src="https://img.shields.io/github/issues/chanpreet3000/Leetcoder?style=for-the-badge&logo=github" alt="GitHub issues" />
</p>

<h1 align="center">Leetcoder</h1>

<h2 align="center">Last verified working on 15 July 2026</h2>

<p align="center">
  <img src="https://img.shields.io/badge/maintenance-active-success?style=for-the-badge" alt="Actively maintained" />
  <img src="https://img.shields.io/github/last-commit/chanpreet3000/Leetcoder?style=for-the-badge&logo=git" alt="Last commit" />
</p>

<p align="center">
  Automate login, solving, and scraping on LeetCode so you can focus on learning — not busywork.
</p>

---

## This project is maintained

Leetcoder is **actively maintained**. If something breaks after a LeetCode UI change, or you hit a rough edge on Windows, **speak up** — that helps everyone.

- **Bug or regression?** Open a [GitHub issue](https://github.com/chanpreet3000/Leetcoder/issues) with steps to reproduce and your environment (Windows version, Chrome path, what you expected vs. what happened).
- **Feature idea or question?** Open an [issue](https://github.com/chanpreet3000/Leetcoder/issues) — questions are welcome too.
- **Want to reach out directly?** Message me on GitHub ([@chanpreet3000](https://github.com/chanpreet3000)) or use the contact options on my profile.

Stars and PRs are welcome. Even a short issue with a screenshot often saves hours for the next person.

---

## Important notes

1. Works on **LeetCode's newer dynamic layout** only.
2. **Windows only** for now. PRs that add solid macOS support are very welcome.
3. **Use responsibly** and in line with LeetCode's terms.
4. **Privacy:** no data is sent anywhere outside your machine by this tool (see your own Chrome/network setup as usual).

> **Verified working:** **15 July 2026** — if you're reading this months later, check the "Last commit" badge above; regular commits usually mean the layout selectors are still being kept in sync.

Leetcoder is built to make problem-solving and scraping more efficient. With its automated flow, **Leetcoder can solve on the order of ~200 problems in about an hour** (network and UI permitting).

## Features

1. ### Automated problem solving
   Automates solving LeetCode questions from your saved solutions, in any language LeetCode supports (C++, Java, Python, Go, Rust, and more).

2. ### Seamless login
   Handles authentication via a persistent Chrome profile.

3. ### Solution scraping
   Scrapes and organizes accepted solutions into a local archive using the LeetCode GraphQL API.

4. ### Resume where you left off
   Remembers solved problem names so runs can continue after interruption.

5. ### Solve specific problems (Mode 4)
   Target individual problems by number (`1`), slug (`two-sum`), comma-separated list (`1, 3, 5`), numeric range (`1-10`), or a file path containing problem identifiers — one per line.

6. ### Java auto-fetch (online fallback)
   When `PREFERRED_LANGUAGE=java` is set and no local solution exists, Leetcoder automatically fetches a verified Java solution from the [doocs/leetcode](https://github.com/doocs/leetcode) open-source repository and caches it locally for future runs.

## Usage disclaimer

Leetcoder is for **educational use**. Do not use it to misrepresent your progress or break LeetCode's rules. Always follow [LeetCode's terms of service](https://leetcode.com/terms/) and community guidelines.

## Getting started

1. Clone the repo.
   ```bash
   git clone https://github.com/chanpreet3000/Leetcoder
   ```
2. Open the project in your editor.
3. In the terminal: `yarn install`
4. Create a `.env` in the project root (copy `.env.example` as a starting point):
   ```text
   # Used only for the local Chrome profile folder name.
   USER_EMAIL=your_email_here
   # Chrome -> chrome://version/ -> Executable Path
   GOOGLE_CHROME_EXECUTABLE_PATH=C:/Program Files/Google/Chrome/Application/chrome.exe
   # Optional: preferred submission language. Defaults to java.
   # Set to cpp, python3, javascript, etc. to use a different language.
   PREFERRED_LANGUAGE=java
   ```
5. **Choose how to run:**

   #### Option A: Modern Web Application (Recommended)
   ```bash
   npm run app
   ```
   Open [http://localhost:3001](http://localhost:3001) in your browser for the full interactive GUI dashboard:
   - Live real-time WebSocket log streaming
   - Start / Stop bot execution across all modes (L, 1, 2, 3, 4)
   - Mode 4 custom input support (ranges, problem numbers, slugs)
   - Solved problems counter & progress tracking
   - Local and scraped solutions browser with code preview
   - In-app `.env` settings manager

   #### Option B: Terminal CLI
   ```bash
   npm start
   ```
   ```text
   [L] Login to LeetCode        <- run this first (or when session expires)
   [1] Start Leetcode Bot       <- solve all queued problems
   [2] Scrape Solved Problems   <- back up your accepted submissions
   [3] Solve Daily Challenge    <- solve today's LeetCode daily
   [4] Solve Specific Problem(s)<- target by number, slug, range, or file
   ```

### First run: log in

Pick **`L`** on the first run. A Chrome window opens on the LeetCode login page — log in, then **close the window**. Your session is saved to the local Chrome profile, so run `npm start` again and pick `1`, `2`, `3`, or `4` to start.

> Log in again with `L` whenever your session expires. The login window and the bot can't run at the same time, so it's a separate step.

### Mode 4 — Solve Specific Problems

Examples of accepted input:

| Input | Meaning |
|-------|---------|
| `1` | Problem #1 (Two Sum) |
| `two-sum` | Problem by slug |
| `1, 3, 5` | Problems 1, 3, and 5 |
| `1-10` | Problems 1 through 10 |
| `problems.txt` | File with one identifier per line |

### Where data lives

| Kind | Path |
|------|------|
| Scraped solutions | `./UserData/your_email/LeetcoderData/ScrapedSolutions` |
| Cached Java solutions | `./UserData/your_email/LeetcoderData/JavaSolutions` |
| Solved problem list (resume) | `./UserData/your_email/LeetcoderData/SolvedProblems.json` |
| Chrome profile (stay logged in) | `./UserData/your_email/ProfileData` |

## Compatibility

Leetcoder targets **Windows**. Behavior on macOS is not supported today — contributions to fix that are welcome.

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/chanpreet3000/Leetcoder). See **This project is maintained** above if you're unsure how to report something.

## License

Open source under the [MIT License](LICENSE). Free to use and modify for fun or learning; no warranty. If you build on it, a star or mention is appreciated but not required.
