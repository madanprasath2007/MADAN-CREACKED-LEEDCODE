import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import {CHROME_PROFILE_PATH, GOOGLE_CHROME_EXECUTABLE_PATH} from "../data.js";

class BrowserManager {
  static browser = null;
  static page = null;

  static async init() {
    if (!BrowserManager.browser) {
      const resolvedProfilePath = path.resolve(CHROME_PROFILE_PATH);

      // Clean up orphaned lockfile if previous process crashed
      const lockfilePath = path.join(resolvedProfilePath, 'lockfile');
      try {
        if (fs.existsSync(lockfilePath)) {
          fs.unlinkSync(lockfilePath);
        }
      } catch (_) {}

      // On Linux/Render, use headless: 'new' unless DISPLAY is active or HEADLESS is explicitly false
      const isLinux = process.platform === 'linux';
      const hasDisplay = Boolean(process.env.DISPLAY);
      const isHeadless = process.env.HEADLESS === 'true' || (isLinux && !hasDisplay);

      BrowserManager.browser = await puppeteer.launch({
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
      });

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
