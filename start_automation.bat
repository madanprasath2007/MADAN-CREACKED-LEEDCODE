@echo off
cd /d "%~dp0"
title Leetcoder Daily Automation Runner
echo Starting Leetcoder Automated Daily Solver...
"C:\Program Files\nodejs\node.exe" runInstructions.js
if %ERRORLEVEL% NEQ 0 (
    echo An error occurred during automation execution.
)
timeout /t 10

