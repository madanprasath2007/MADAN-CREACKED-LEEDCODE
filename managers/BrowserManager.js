import puppeteer from 'puppeteer';
import path from 'path';
import {CHROME_PROFILE_PATH, GOOGLE_CHROME_EXECUTABLE_PATH} from "../data.js";

class BrowserManager {
  static browser = null;
  static page = null;

  static async init() {
    if (!BrowserManager.browser) {
      const resolvedProfilePath = path.resolve(CHROME_PROFILE_PATH);

      const isHeadless = process.env.HEADLESS === 'true';

      BrowserManager.browser = await puppeteer.launch({
        headless: isHeadless ? 'new' : false,
        executablePath: GOOGLE_CHROME_EXECUTABLE_PATH,
        userDataDir: resolvedProfilePath,
        defaultViewport: null,
        args: [
          "--start-maximized",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-blink-features=AutomationControlled",
          "--no-default-browser-check"
        ],
        ignoreDefaultArgs: ["--enable-automation"]
      });

      [BrowserManager.page] = await BrowserManager.browser.pages();
      
      if (BrowserManager.page) {
        BrowserManager.page.setDefaultNavigationTimeout(60000);
        BrowserManager.page.setDefaultTimeout(30000);

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
    if (!BrowserManager.browser || !BrowserManager.page) {
      await BrowserManager.init();
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
