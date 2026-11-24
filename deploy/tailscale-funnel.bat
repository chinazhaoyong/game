@echo off
chcp 65001 >nul
setlocal
rem ============================================================
rem  大江湖 · Tailscale Funnel（免费账号 / 固定公网 HTTPS，无需自有域名）
rem  前置：安装 Tailscale 并登录（个人版免费）：
rem        winget install Tailscale.tailscale
rem        tailscale up
rem  安全：只暴露 7788（游戏），GM 后台 7790 不暴露
rem ============================================================
set NODE=C:\Users\Administrator\.trae-cn\sdks\versions\node\current\node.exe
cd /d "%~dp0.."

where tailscale >nul 2>nul
if errorlevel 1 (
  echo [!] 未检测到 tailscale。先安装并登录：
  echo     winget install Tailscale.tailscale
  echo     tailscale up
  pause & exit /b 1
)

tailscale status >nul 2>nul
if errorlevel 1 (
  echo [!] Tailscale 未登录，先运行： tailscale up
  pause & exit /b 1
)

rem 确保游戏服 7788 在跑
netstat -ano | findstr ":7788" | findstr "LISTENING" >nul 2>nul
if errorlevel 1 (
  echo [i] 游戏服 7788 未运行，正在启动...
  start "MUD-game-7788" "%NODE%" server\index.js
  echo [i] 等待服务就绪...
  timeout /t 4 /nobreak >nul
)

echo.
echo [i] 正在打开 Funnel（仅暴露 7788）...
echo [i] 公网地址形如： https://你的电脑名.你的tailnet.ts.net:7788
echo [i]   （在 Tailscale 客户端 / https://login.tailscale.com 里能看到确切域名）
echo [i] 按 Ctrl+C 停止 Funnel
echo.
tailscale funnel 7788
pause
