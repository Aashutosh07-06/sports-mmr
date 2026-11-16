@echo off
REM One-time setup on Windows: Python virtual environment + Python packages + frontend packages.
REM Run from the project root:  scripts\setup.bat
cd /d "%~dp0\.."
if not exist .venv (
  echo Creating virtual environment...
  python -m venv .venv || goto :error
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r requirements.txt || goto :error
cd frontend
call npm install || goto :error
cd ..
echo.
echo Setup complete. Next: scripts\train_all.bat (only if ml\artifacts is empty), then scripts\run_backend.bat and scripts\run_frontend.bat
goto :eof
:error
echo Setup failed. See the message above.
exit /b 1
