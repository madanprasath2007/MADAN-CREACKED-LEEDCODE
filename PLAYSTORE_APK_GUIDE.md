# How to Generate an Android APK & Publish to Google Play Store

Leetcoder has been configured as a Progressive Web App (PWA) with **Trusted Web Activity (TWA)** compatibility. Google officially supports wrapping PWAs into standard signed Android `.apk` and `.aab` (Android App Bundle) packages for submission to the Google Play Store.

---

## Method 1: Instant APK via PWABuilder (Recommended & Free)

[PWABuilder](https://www.pwabuilder.com/) is Microsoft & Google's open-source tool that reads your online manifest and compiles a signed Android APK / AAB package in seconds without needing Android Studio installed.

### Step 1: Deploy Leetcoder Online
Deploy your app to an online URL (e.g. `https://your-leetcoder-app.up.railway.app`) using the instructions in [`DEPLOYMENT.md`](DEPLOYMENT.md).

### Step 2: Generate Android Package
1. Open [PWABuilder](https://www.pwabuilder.com/).
2. Enter your live HTTPS URL (e.g., `https://your-app-domain.com`).
3. Click **"Start"**. PWABuilder verifies your manifest (`manifest.json`), service worker (`sw.js`), and icons (`icon-512.png`).
4. Click **"Package for Stores"** → Select **"Android"**.
5. Configure package settings:
   - **Package ID**: `com.leetcoder.dashboard`
   - **App Name**: `Leetcoder`
   - **Version Name**: `1.0.0`
6. Click **"Generate"**.

### Step 3: What You Get in the Download
The generated `.zip` contains:
- `assetlinks.json`: Place this in your public directory to enable full-screen Trusted Web Activity (no browser address bar).
- `app-release-signed.apk`: Real APK you can immediately transfer and install on any Android phone.
- `app-release.aab`: Production Android App Bundle required by Google Play Console.

---

## Method 2: Command-Line Generation using Bubblewrap (Google's Official CLI)

If you have Node.js and want to generate the Android project locally:

1. Install Google's official CLI tool:
   ```bash
   npm install -g @bubblewrap/cli
   ```
2. Initialize the Android project from your deployed URL:
   ```bash
   bubblewrap init --manifest="https://your-app-domain.com/manifest.json"
   ```
3. Build the APK & AAB:
   ```bash
   bubblewrap build
   ```
4. Bubblewrap generates:
   - `app-release-signed.apk`
   - `app-release-bundle.aab`

---

## Submitting to Google Play Store

1. Create a [Google Play Developer Account](https://play.google.com/console) ($25 one-time registration fee).
2. Click **"Create app"**:
   - App name: **Leetcoder**
   - Default language: **English**
   - App or game: **App**
   - Free or paid: **Free**
3. Complete the **Set up your app** checklist (Privacy Policy, App content, Target audience).
4. Go to **Production** or **Internal testing** → Click **"Create new release"**.
5. Upload your `app-release.aab` bundle.
6. Submit for review!

