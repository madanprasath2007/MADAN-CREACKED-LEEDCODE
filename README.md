<p align="center">
  <img src="https://img.shields.io/github/stars/madanprasath2007/MADAN-CREACKED-LEEDCODE?style=for-the-badge&logo=github&color=gold" alt="GitHub stars" />
  <img src="https://img.shields.io/github/forks/madanprasath2007/MADAN-CREACKED-LEEDCODE?style=for-the-badge&logo=github&color=orange" alt="GitHub forks" />
  <img src="https://img.shields.io/github/issues/madanprasath2007/MADAN-CREACKED-LEEDCODE?style=for-the-badge&logo=github" alt="GitHub issues" />
</p>

<h1 align="center">⚡ MADAN-CRACKED-LEETCODE ⚡</h1>

<h2 align="center">Ultimate Automated LeetCode Solver, Scraper & Dashboard Suite</h2>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0--cracked-success?style=for-the-badge&logo=rocket" alt="Version 2.0.0" />
  <img src="https://img.shields.io/github/last-commit/madanprasath2007/MADAN-CREACKED-LEEDCODE?style=for-the-badge&logo=git" alt="Last commit" />
  <img src="https://img.shields.io/badge/maintainer-Madan_Prasath-blue?style=for-the-badge&logo=github" alt="Maintainer Madan Prasath" />
  <img src="https://img.shields.io/badge/docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Ready" />
</p>

<p align="center">
  <b>Automate solving, scraping, and tracking on LeetCode with an interactive Web Dashboard & Android PWA support.</b><br>
  Solve hundreds of problems effortlessly with Java online auto-fetch and live streaming logs.
</p>

---

## 🔥 What's New in this Version

- 🖥️ **Full Web Dashboard (React + Express)**: Control the bot, view real-time WebSocket console logs, search solutions, and configure `.env` directly from your browser.
- 🚀 **Java Online Solution Fetcher**: Automatically downloads verified solutions from open-source repositories when missing locally.
- 🎯 **Mode 4 (Custom Problem Targets)**: Run specific numbers (`1`), slugs (`two-sum`), ranges (`1-50`), or text files.
- 📅 **Mode 3 (Daily Challenge)**: Automatically queries LeetCode's GraphQL API for today's active question.
- 🐳 **Cloud & Docker Ready**: Headless Chrome with XVFB display server support for 1-click cloud deployment on Render, Railway, or VPS.
- 📱 **Android PWA & APK Support**: Packaged with Web Manifest and Service Worker for mobile installation and Play Store packaging.

---

## ⚡ Features

1. ### 🤖 Automated Problem Solving
   Solves LeetCode questions seamlessly with built-in Monaco editor code injection, fallback clipboard typing, and verdict polling.

2. ### 🌐 Interactive Web GUI Dashboard
   Full LeetCode dark-themed dashboard with live WebSocket log streaming, start/stop controls, and statistics.

3. ### ☕ Auto-Fetch Java Solutions
   When `PREFERRED_LANGUAGE=java` is set, the bot automatically retrieves verified solutions from the community archive and caches them locally.

4. ### 📥 Solution Scraper (GraphQL)
   Scrapes your accepted submissions via LeetCode's GraphQL API, saving problem names, code, and language metadata locally.

5. ### 🎯 Target Specific Problems & Ranges
   Queue exact problem IDs (e.g. `1, 15, 33`), slugs, or ranges like `1-20`.

6. ### 🔁 Auto-Resume
   Tracks previously solved questions in `SolvedProblems.json` so you never solve the same problem twice.

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/madanprasath2007/MADAN-CREACKED-LEEDCODE.git
cd MADAN-CREACKED-LEEDCODE
```

### 2. Install Dependencies
```bash
npm install
cd client && npm install && cd ..
```

### 3. Create your `.env` Configuration
Copy `.env.example` to `.env`:
```env
# Profile folder identifier
USER_EMAIL=my_leetcode_profile

# Submission language (java, cpp, python3, javascript, etc.)
PREFERRED_LANGUAGE=java

# Path to your Google Chrome executable (Windows example):
GOOGLE_CHROME_EXECUTABLE_PATH=C:/Program Files/Google/Chrome/Application/chrome.exe
```

---

## 🎮 How to Run

### 🌟 Option A: Modern Web Dashboard (Recommended)
```bash
npm run app
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser:
- Real-time live log stream
- 1-Click Start/Stop bot controls
- Mode 4 custom range input
- Progress tracker across 2,500+ problems
- Solution viewer & settings editor

---

### 💻 Option B: Terminal CLI Mode
```bash
npm start
```
Select a mode when prompted:
```text
[L] Login to LeetCode        <- Run first to save session to local Chrome profile
[1] Start Leetcode Bot       <- Solves all queued problems in ./problems/
[2] Scrape Solved Problems   <- Backs up your accepted LeetCode solutions
[3] Solve Daily Challenge    <- Automatically solves today's challenge
[4] Solve Specific Problems  <- Target by number (1), slug, range (1-10), or file
```

---

## 📱 Mobile App / APK (100% Free)

You can run this application on your Android phone as a native app:

1. **Direct Chrome Install**: Open the deployed web app on your phone's Chrome browser → tap **(⋮)** → tap **"Install App"**.
2. **Compile Free APK**: Follow the step-by-step instructions in [FREE_APK_GUIDE.md](FREE_APK_GUIDE.md) using PWABuilder or the included GitHub Actions workflow.

---

## 📁 Project Structure

```
MADAN-CREACKED-LEEDCODE/
├── server/                  # Express + WebSocket HTTP backend
│   ├── server.js            # App server & WS broadcast
│   ├── BotRunner.js         # Process manager & log streamer
│   └── routes/              # Stats, solutions, and settings APIs
├── client/                  # React 18 + Vite frontend
│   ├── src/                 # Dashboard components (LeetCode dark theme)
│   └── public/              # PWA manifest, service worker & icons
├── leetcoder/               # Core bot engines (Solver, Scraper, Authenticator)
├── managers/                # BrowserManager (Puppeteer) & FileManager
├── problems/                # 2,500+ local problem archives
├── Dockerfile               # Production Docker container with Chrome & XVFB
└── .github/workflows/       # Automated APK compilation workflow
```

---

## ⚖️ Disclaimer

This software is developed strictly for **educational and learning purposes**. Please use responsibly and adhere to [LeetCode's Terms of Service](https://leetcode.com/terms/).

---

## 👤 Author & Maintainer

**Madan Prasath**
- GitHub: [@madanprasath2007](https://github.com/madanprasath2007)
- Repository: [MADAN-CREACKED-LEEDCODE](https://github.com/madanprasath2007/MADAN-CREACKED-LEEDCODE)

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
