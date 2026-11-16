@echo off
REM Start the React frontend on http://localhost:5173
cd /d "%~dp0\..\frontend"
call npm run dev
