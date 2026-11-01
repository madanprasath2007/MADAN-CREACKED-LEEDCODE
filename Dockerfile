# Base image with Node.js 20 & Debian
FROM node:20-bookworm-slim

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
    SERVER_PORT=3001

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY client/package*.json ./client/

# Install root & client packages
RUN npm install --omit=dev
RUN cd client && npm install

# Copy application source code
COPY . .

# Build React client bundle
RUN npm run build:client

# Create directories for persistent storage / volume mount
RUN mkdir -p /app/UserData

# Expose server port
EXPOSE 3001

# Start virtual display (Xvfb) and Node application server
CMD ["sh", "-c", "Xvfb :99 -screen 0 1920x1080x24 -ac & npm run app"]

