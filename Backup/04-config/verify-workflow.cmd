@echo off
setlocal
cd /d "%~dp0"
echo Verifying sandbox output and confirming the host App_minimal.js stays unchanged.
npm run verify
pause
