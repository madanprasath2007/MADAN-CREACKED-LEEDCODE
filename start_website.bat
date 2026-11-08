@echo off
title Leetcoder Web Dashboard Server
cd /d "%~dp0"
echo ========================================================
echo   Starting Leetcoder Web Dashboard Suite
echo ========================================================
echo.
echo Opening http://localhost:3001 in your browser...
start "" "http://localhost:3001"
echo.
node server/server.js
pause

