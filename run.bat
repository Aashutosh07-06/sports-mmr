@echo off
REM ======================================================================
REM  Statline - Esports Performance Predictor : ONE-CLICK START
REM  Double-click this file, or type  run  in a terminal in this folder.
REM  The app opens in your browser at http://localhost:8000
REM  Keep this window open while using the app; close it to stop.
REM ======================================================================
setlocal
title Statline - Esports Performance Predictor
cd /d "%~dp0"
set "URL=http://localhost:8000"
REM health checks use 127.0.0.1: PowerShell tries IPv6 (::1) for "localhost" first and times out
set "HEALTH=http://127.0.0.1:8000/api/health"

REM Already running? Then just open the browser.
powershell -NoProfile -Command "try { $null = Invoke-WebRequest '%HEALTH%' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }"
if %errorlevel%==0 (
  echo Statline is already running - opening %URL%
  start "" "%URL%"
  exit /b 0
)

REM First run on this computer: install Python + Node packages.
if not exist ".venv\Scripts\python.exe" (
  echo First run: installing everything. This takes a few minutes...
  call scripts\setup.bat
  if errorlevel 1 goto :fail
)

REM Build the website (about 1 second) so it always matches the latest code.
where npm >nul 2>nul
if errorlevel 1 goto :nonode
pushd frontend
if not exist node_modules call npm install
call npm run build --silent >nul
if errorlevel 1 (
  popd
  echo Website build failed.
  goto :fail
)
popd
goto :serve

:nonode
if not exist "frontend\dist\index.html" (
  echo Node.js is needed to build the website the first time: https://nodejs.org
  goto :fail
)

:serve
REM Open the browser as soon as the server answers.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "for ($n = 0; $n -lt 90; $n++) { try { $null = Invoke-WebRequest '%HEALTH%' -UseBasicParsing -TimeoutSec 2; Start-Process '%URL%'; break } catch { Start-Sleep -Seconds 1 } }"

echo.
echo   Statline is starting at %URL%  (your browser will open automatically)
echo   Keep this window open while using the app. Close it or press Ctrl+C to stop.
echo.
".venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
if errorlevel 1 (
  echo The server stopped with an error. If port 8000 is busy, close the other Statline window first.
  goto :fail
)
goto :eof

:fail
echo.
echo Something went wrong - see the message above.
pause
exit /b 1
