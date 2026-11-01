# Multi-stage Docker build

# ── Stage 1: Build the React Client ──
FROM node:20-bookworm-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
# Install ALL dependencies (including vite & devDependencies)
RUN npm install
COPY client/ ./
RUN npm run build

# ── Stage 2: Production Server with Chrome & XVFB ──
FROM node:20-bookworm-slim
WORKDIR /app

# Install Google Chrome stable & necessary dependencies for headless automation / Xvfb
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    xvfb \
    xauth \
    procps \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    GOOGLE_CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome \
    HEADLESS=false \
    DISPLAY=:99 \
    PORT=10000

# Copy root package manifests and install production backend dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Copy pre-built React static files from builder stage
COPY --from=client-builder /app/client/dist ./client/dist

# Create directory for persistent user data
RUN mkdir -p /app/UserData

# Expose Render standard port
EXPOSE 10000

# Start virtual display (Xvfb) and Node application server
CMD ["sh", "-c", "Xvfb :99 -screen 0 1920x1080x24 -ac & npm run app"]
