import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import {CHROME_PROFILE_PATH, GOOGLE_CHROME_EXECUTABLE_PATH} from "../data.js";

class BrowserManager {
  static browser = null;
  static page = null;

  static cleanProfileLocks(profilePath) {
    const lockFiles = [
      'lockfile',
      'SingletonLock',
      'SingletonCookie',
      'SingletonSocket',
      'DevToolsActivePort'
    ];
    for (const file of lockFiles) {
      const p = path.join(profilePath, file);
      try {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      } catch (_) {}
    }
  }

  static async killLingeringChrome(profilePath) {
    if (process.platform === 'win32') {
      try {
        const { execSync } = await import('child_process');
        const escaped = profilePath.replace(/\\/g, '\\\\').replace(/'/g, "''");
        execSync(
          `powershell -Command "Get-CimInstance Win32_Process -Filter \\"Name = 'chrome.exe'\\" | Where-Object { \\$_.CommandLine -like '*${escaped}*' } | Stop-Process -Force -ErrorAction SilentlyContinue"`,
          { stdio: 'ignore' }
        );
      } catch (_) {}
    }
  }

  static async init() {
    if (!BrowserManager.browser) {
      const resolvedProfilePath = path.resolve(CHROME_PROFILE_PATH);
      if (!fs.existsSync(resolvedProfilePath)) {
        fs.mkdirSync(resolvedProfilePath, { recursive: true });
      }

      // Always clear stale lock files before launching
      BrowserManager.cleanProfileLocks(resolvedProfilePath);

      // On Linux/Render, use headless: 'new' unless DISPLAY is active or HEADLESS is explicitly false
      const isLinux = process.platform === 'linux';
      const hasDisplay = Boolean(process.env.DISPLAY);
      const isHeadless = process.env.HEADLESS === 'true' || (isLinux && !hasDisplay);

      const launchOptions = {
        headless: isHeadless ? 'new' : false,
        executablePath: GOOGLE_CHROME_EXECUTABLE_PATH,
        userDataDir: resolvedProfilePath,
        defaultViewport: null,
        // Raise the CDP protocol timeout so that Runtime.callFunctionOn never
        // times out prematurely during heavy page evaluations (default is 180 s
        // which is too low when LeetCode's React SPA is slow to hydrate).
        protocolTimeout: 300000, // 5 minutes
        args: [
          "--start-maximized",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--disable-blink-features=AutomationControlled",
          "--no-default-browser-check",
          "--disable-session-crashed-bubble",
          "--hide-crash-restore-bubble",
          "--disable-infobars",
          "--no-first-run",
          "--disable-notifications"
        ],
        ignoreDefaultArgs: ["--enable-automation"]
      };

      let launchAttempts = 0;
      while (launchAttempts < 2) {
        try {
          BrowserManager.browser = await puppeteer.launch(launchOptions);
          break;
        } catch (err) {
          launchAttempts++;
          if (launchAttempts >= 2) throw err;
          // Clear profile locks and terminate lingering bot chrome instances
          await BrowserManager.killLingeringChrome(resolvedProfilePath);
          BrowserManager.cleanProfileLocks(resolvedProfilePath);
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      [BrowserManager.page] = await BrowserManager.browser.pages();
      
      if (BrowserManager.page) {
        BrowserManager.page.setDefaultNavigationTimeout(120000);
        // Keep per-action timeout generous so waitForSelector never races
        // against the CDP protocol timeout we set in launch().
        BrowserManager.page.setDefaultTimeout(120000);

        // Remove webdriver flag from navigator to help pass Cloudflare checks
        await BrowserManager.page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
          });
        });
      }
    }
  }

  static async getBrowserDetails() {
    if (!BrowserManager.browser || !BrowserManager.page || BrowserManager.page.isClosed()) {
      await BrowserManager.closeBrowser();
      await BrowserManager.init();
    }
    return { page: BrowserManager.page, browser: BrowserManager.browser };
  }

  static async recreatePage() {
    if (BrowserManager.browser) {
      try {
        if (BrowserManager.page && !BrowserManager.page.isClosed()) {
          await BrowserManager.page.close().catch(() => {});
        }
      } catch (_) {}
      try {
        BrowserManager.page = await BrowserManager.browser.newPage();
        BrowserManager.page.setDefaultNavigationTimeout(120000);
        BrowserManager.page.setDefaultTimeout(120000);
        await BrowserManager.page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
          });
        });
      } catch (_) {
        await BrowserManager.closeBrowser();
        await BrowserManager.init();
      }
    }
    return { page: BrowserManager.page, browser: BrowserManager.browser };
  }

  static async closeBrowser() {
    if (BrowserManager.browser) {
      try {
        await BrowserManager.browser.close();
      } catch (_) {}
      BrowserManager.browser = null;
      BrowserManager.page = null;
    }
  }
}

export const getBrowserDetails = async () => {
  return await BrowserManager.getBrowserDetails();
};

export const closeBrowser = async () => {
  return await BrowserManager.closeBrowser();
};

export const recreatePage = async () => {
  return await BrowserManager.recreatePage();
};

export default BrowserManager;
