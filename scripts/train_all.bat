@echo off
REM Train all four game models + run the two feasibility experiments (about 3-5 minutes).
cd /d "%~dp0\.."
call .venv\Scripts\activate.bat
python -m ml.train_all
