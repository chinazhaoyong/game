@echo off
echo Stopping Da Jiang Hu server on port 7788...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7788" ^| findstr LISTENING') do (
    echo Killing PID %%a
    taskkill /F /PID %%a >nul 2>&1
)
echo Done.
timeout /t 2 /nobreak >nul