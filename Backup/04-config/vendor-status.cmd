@echo off
setlocal
cd /d "%~dp0"
npm run vendor:status
pause
