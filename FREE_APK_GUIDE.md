# 🚀 100% Free: Generate & Download Your Leetcoder APK

You do **NOT** need to pay $25 for Google Play or pay for cloud servers to get and use your `.apk` file. Everything can be generated **completely free**.

---

## ⚡ Option 1: 100% Free Instant APK via PWABuilder (Fastest — 2 Minutes)

Microsoft & Google provide **PWABuilder** as a completely free service that generates signed Android `.apk` files without needing Android Studio or SDKs on your computer.

### Step 1: Get a Free Temporary or Permanent URL

You can host the application on **Render.com** (Free Tier) or run an instant tunnel:
1. Create a free account on [Render.com](https://render.com/).
2. Select **"New Web Service"** → Connect your repository.
3. Render builds your Docker/Node app for **$0/month** and assigns a free HTTPS domain:
   `https://leetcoder.onrender.com`

### Step 2: Generate the Free APK
1. Open [https://www.pwabuilder.com/](https://www.pwabuilder.com/) in your browser.
2. Enter your free URL (e.g. `https://leetcoder.onrender.com`).
3. Click **"Start"**.
4. Click **"Package for Stores"** → Choose **Android**.
5. Set the options:
   - **Package ID**: `com.leetcoder.app`
   - **App Name**: `Leetcoder`
6. Click **"Generate"** and download the ZIP.
7. Inside the ZIP, you will find:
   - `app-release-signed.apk` → **This is your free installable Android app file!**
   - Transfer it to any phone (via WhatsApp, Google Drive, USB) and tap to install.

---

## 🛠️ Option 2: Free Automated APK via GitHub Actions (Zero Setup)

A GitHub Actions workflow has been created in your repository:
[`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml)

Every time you push this code to GitHub:
1. GitHub provides free Linux virtual machines with Java and Android SDK pre-installed.
2. It compiles the APK automatically in ~3 minutes.
3. You can download the `.apk` directly from the **"Actions"** tab on GitHub under **Artifacts** without installing any tools locally.

---

## 📱 Option 3: Direct Chrome Install (Instant Native App on Android)

Because Leetcoder has a configured Service Worker and Web Manifest, Android supports **Direct Native Installation** for free without even compiling an APK:

1. Open your Leetcoder web URL in Google Chrome on your phone.
2. Tap the three dots (⋮) in the top-right corner.
3. Tap **"Install App"** (or *"Add to Home Screen"*).
4. An icon named **Leetcoder** will appear on your phone home screen and app drawer, opening in full-screen standalone mode with no browser URL bar, behaving exactly like a Play Store APK.

