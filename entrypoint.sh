#!/bin/sh
set -e

# Start dbus service if available
mkdir -p /run/dbus
dbus-daemon --system --fork 2>/dev/null || true

# Start XVFB virtual display server on screen :99
echo "Starting Xvfb on display :99..."
Xvfb :99 -screen 0 1920x1080x24 -ac -nolisten tcp &
XVFB_PID=$!

export DISPLAY=:99

# Wait briefly for Xvfb socket to initialize
sleep 2

# Start the Node.js application server
echo "Starting Leetcoder App Server..."
exec npm run app

