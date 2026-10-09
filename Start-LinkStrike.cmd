@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or later is required. See README.md.
  pause
  exit /b 1
)
if not exist node_modules\ws\package.json (
  call npm install --ignore-scripts --no-audit --no-fund
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Open http://localhost:4173 in your browser once the server starts.
call npm start
pause
