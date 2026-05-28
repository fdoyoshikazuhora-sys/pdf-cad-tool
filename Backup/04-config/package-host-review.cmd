@echo off
setlocal
cd /d "%~dp0"
npm run package:host-review
pause
