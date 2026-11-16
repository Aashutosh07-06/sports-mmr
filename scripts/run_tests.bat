@echo off
REM Run all automated tests: ML + backend (pytest) and frontend (vitest).
cd /d "%~dp0\.."
call .venv\Scripts\activate.bat
python -m pytest -q
cd frontend
call npm test
cd ..
echo.
echo For the browser end-to-end check, start backend + frontend first, then run:
echo   python -m playwright install chromium   (one time)
echo   python scripts\e2e_check.py
