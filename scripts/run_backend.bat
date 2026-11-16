@echo off
REM Start the FastAPI backend on http://localhost:8000  (API docs: http://localhost:8000/docs)
cd /d "%~dp0\..\backend"
call ..\.venv\Scripts\activate.bat
python -m uvicorn app.main:app --reload --port 8000
