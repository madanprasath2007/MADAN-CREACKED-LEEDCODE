import {getElementBySelector} from "../utils/utils.js";
import Logger from "../utils/Logger.js";
import {LEETCODER_ASCII_ART} from "../utils/constants.js";
import {getBrowserDetails} from "../managers/BrowserManager.js";

const AVATAR_SELECTORS = [
  '#navbar_user_avatar',
  '#web-user-menu',
  'img[alt="user avatar"]',
  'button[id*="headlessui-menu-button"] img'
];

class LeetcoderAuthenticator {
  static #loginUserHandler = async () => {
    const {page} = await getBrowserDetails();
    try {
      await page.goto(`https://leetcode.com/accounts/login/`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    } catch (_) {}

    try {
      await getElementBySelector(page, AVATAR_SELECTORS, 4, 0);
      Logger.success('User was already logged in.');
      return;
    } catch (_) {
    }
    Logger.success('Login to LeetCode using your credentials!');

    // Convert ASCII art to HTML-friendly format
    const formattedAsciiArt = LEETCODER_ASCII_ART.replace(/ /g, '&nbsp;').replace(/\n/g, '<br>');

    try {
      await page.evaluate((asciiArt) => {
        const appElement = document.getElementById('app') || document.body;
        if (appElement) {
          const parDiv = document.createElement('div');
          const newDiv = document.createElement('div');
          newDiv.innerHTML = `${asciiArt}<br>
          Please log in using your credentials (You have up to 10 min to login).<br>
          After successful login, you can close the browser or continue.<br>
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

    await getElementBySelector(page, AVATAR_SELECTORS, 600, 0);
    Logger.success('User logged in successfully.');
  };

  static loginUser = async () => {
    Logger.error('<<<< Starting Leetcoder Authenticator >>>>');
    await this.#loginUserHandler();
    Logger.error('<<<< Exiting Leetcoder Authenticator >>>>');
  };
}

export default LeetcoderAuthenticator;
