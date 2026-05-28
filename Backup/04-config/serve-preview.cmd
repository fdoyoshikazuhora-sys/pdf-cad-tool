@echo off
setlocal
cd /d "%~dp0"
npm run verify
npm run serve:preview
pause
