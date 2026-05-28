@echo off
setlocal
cd /d "%~dp0"
echo Writing only to app-output-bridge\sandbox.
npm run apply
pause
