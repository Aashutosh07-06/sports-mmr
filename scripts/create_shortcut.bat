@echo off
REM Creates a "Statline" shortcut on your Desktop that starts the app (run.bat).
cd /d "%~dp0\.."
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root = (Get-Location).Path; $lnk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Statline.lnk'; $s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk); $s.TargetPath = Join-Path $root 'run.bat'; $s.WorkingDirectory = $root; $s.IconLocation = (Join-Path $root 'scripts\statline.ico') + ',0'; $s.Description = 'Start Statline - Esports Performance Predictor'; $s.Save(); Write-Host ('Shortcut created: ' + $lnk)"
