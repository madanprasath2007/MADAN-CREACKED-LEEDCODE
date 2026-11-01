# Deploying Leetcoder to Cloud Hosting

Leetcoder includes full Docker and XVFB (X Virtual Framebuffer) support so Chrome runs in cloud server environments (Linux) with zero display hardware required, maintaining anti-bot bypass support.

---

## Option 1: Railway (Easiest — 1-Click Git Deploy)

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Leetcoder Dockerized Web Application"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. Go to [Railway.app](https://railway.app/) and sign in with GitHub.
3. Click **"New Project"** → **"Deploy from GitHub repo"** → Select your repository.
4. Under **Variables**, optionally configure:
   - `PORT=3001`
   - `USER_EMAIL=my_leetcode_profile`
   - `PREFERRED_LANGUAGE=java`
5. Under **Settings**, add a persistent volume mounted at `/app/UserData` to retain your login session and solved records across deployments.
6. Railway automatically builds the `Dockerfile` and gives you a free public domain (e.g. `https://leetcoder-production.up.railway.app`).

---

## Option 2: Render.com

1. Create a **New Web Service** on [Render.com](https://render.com/).
2. Connect your GitHub repository.
3. Select **Environment**: `Docker`.
4. Add a Disk under **Disks** (mount path: `/app/UserData`, size: 1GB).
5. Click **Create Web Service**.

---

## Option 3: Self-Hosted Cloud VPS (DigitalOcean / Hetzner / AWS / Linode)

On any Ubuntu/Debian VPS with Docker installed:

1. Clone your repo:
   ```bash
   git clone <your-repo-url>
   cd Leetcoder
   ```
2. Build and launch with Docker Compose:
   ```bash
   docker compose up -d --build
   ```
3. Access your dashboard at `http://<your-server-ip>:3001`.

---

## Option 4: Instant Public Access from your Local PC (Cloudflare Tunnel)

If you prefer to keep running Chrome on your own machine without cloud costs:

1. Download [Cloudflare Tunnel (`cloudflared`)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Run in a terminal:
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```
3. Cloudflare gives you an instant, secure public HTTPS URL (e.g. `https://random-words.trycloudflare.com`) pointing directly to your local dashboard.

