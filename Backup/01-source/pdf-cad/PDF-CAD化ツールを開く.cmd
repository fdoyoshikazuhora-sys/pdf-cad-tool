@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process '%~dp0pdf-cad.html'"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath node -ArgumentList 'pdf-cad-server.mjs' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
