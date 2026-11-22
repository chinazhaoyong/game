@echo off
cd /d "%~dp0"

set "LAN_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        if not defined LAN_IP set "LAN_IP=%%b"
    )
)
if not defined LAN_IP set "LAN_IP=192.168.3.2"

netsh advfirewall firewall add rule name="Da Jiang Hu 7788" dir=in action=allow protocol=TCP localport=7788 >nul 2>&1
netsh advfirewall firewall add rule name="Da Jiang Hu 7788" dir=out action=allow protocol=TCP localport=7788 >nul 2>&1

start "" /min "c:\Users\Administrator\.trae-cn\sdks\versions\node\current\node.exe" --experimental-sqlite server\index.js

timeout /t 3 /nobreak >nul

echo.
echo   Da Jiang Hu server STARTED in background!
echo.
echo   PC Local:  http://localhost:7788
echo   PC LAN:    http://%LAN_IP%:7788
echo.
echo   PHONE:     http://%LAN_IP%:7788
echo   (Phone MUST be on same WiFi as PC)
echo.
echo   Stop server with: stop.bat
echo.
pause