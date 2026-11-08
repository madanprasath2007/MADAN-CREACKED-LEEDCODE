import {getElementBySelector, sleep} from "../utils/utils.js";
import Logger from "../utils/Logger.js";
import {LEETCODER_ASCII_ART} from "../utils/constants.js";
import {getBrowserDetails} from "../managers/BrowserManager.js";

// Selectors that prove a user is logged in on LeetCode's modern UI.
// LeetCode keeps redesigning its navbar, so we cast a wide net.
const AVATAR_SELECTORS = [
  // Modern (2024-2025) React navbar – user menu / avatar wrappers
  '[data-cy="user-avatar"]',
  'img[alt="user avatar"]',
  'img[alt="User Avatar"]',
  // headlessui dropdown button that wraps the avatar image
  'button[id*="headlessui-menu-button"] img',
  // Older selectors kept as fallbacks
  '#navbar_user_avatar',
  '#web-user-menu',
  // Any img inside the top-right nav that carries "avatar" in its src
  'nav img[src*="avatar"]',
  'nav img[src*="user"]',
];

class LeetcoderAuthenticator {
  /**
   * Directly queries LeetCode's official status endpoint from inside the browser context.
   * This is 100% immune to frontend DOM / navbar redesigns.
   */
  static async #checkSignedInViaAPI(page) {
    try {
      return await page.evaluate(async () => {
        try {
          const resp = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'query userStatus { userStatus { isSignedIn username } }'
            })
          });
          const json = await resp.json();
          return Boolean(json?.data?.userStatus?.isSignedIn);
        } catch (_) {
          return false;
        }
      });
    } catch (_) {
      return false;
    }
  }

  static #loginUserHandler = async () => {
    const {page} = await getBrowserDetails();

    // Navigate to accounts login or home page
    try {
      await page.goto(`https://leetcode.com/accounts/login/`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    } catch (_) {}

    await sleep(3);

    // 1. Check if user is already signed in via direct GraphQL API
    const isSignedInAPI = await this.#checkSignedInViaAPI(page);
    if (isSignedInAPI) {
      Logger.success('User was already logged in (Verified via LeetCode Session API).');
      return;
    }

    // 2. Secondary check via DOM selectors
    try {
      await getElementBySelector(page, AVATAR_SELECTORS, 5, 0);
      Logger.success('User was already logged in (Verified via Avatar).');
      return;
    } catch (_) {}

    Logger.success('Login to LeetCode using your credentials!');

    // Inject a friendly banner
    const formattedAsciiArt = LEETCODER_ASCII_ART.replace(/ /g, '&nbsp;').replace(/\n/g, '<br>');
    try {
      await page.evaluate((asciiArt) => {
        const appElement = document.getElementById('app') || document.body;
        if (appElement) {
          const parDiv = document.createElement('div');
          const newDiv = document.createElement('div');
          newDiv.innerHTML = `${asciiArt}<br>
          Please log in using your credentials.<br>
          After successful login, the bot will automatically proceed.<br>
          `;

          parDiv.style.display = 'flex';
          parDiv.style.flexDirection = 'row';
          parDiv.style.justifyContent = 'center';
          parDiv.style.alignItems = 'center';
          parDiv.style.color = '#fcfcfc';
          parDiv.style.padding = '1.5rem';
          parDiv.style.backgroundColor = '#181818';

          parDiv.appendChild(newDiv);
          appElement.insertBefore(parDiv, appElement.firstChild);
        }
      }, formattedAsciiArt);
    } catch (_) {}

    // 3. Poll for signed-in state every 3 seconds for up to 10 minutes
    const maxPollSeconds = 600;
    const start = Date.now();
    while ((Date.now() - start) / 1000 < maxPollSeconds) {
      await sleep(3);
      if (await this.#checkSignedInViaAPI(page)) {
        Logger.success('User logged in successfully.');
        return;
      }
    }

    throw new Error('Login timed out: user did not complete login within 10 minutes.');
  };

  static loginUser = async () => {
    Logger.error('<<<< Starting Leetcoder Authenticator >>>>');
    await this.#loginUserHandler();
    Logger.error('<<<< Exiting Leetcoder Authenticator >>>>');
  };
}

export default LeetcoderAuthenticator;
