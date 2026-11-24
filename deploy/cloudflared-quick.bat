@echo off
chcp 65001 >nul
setlocal
rem ============================================================
rem  大江湖 · Cloudflare 快速隧道（零账号 / 零配置 / 秒出公网 HTTPS）
rem  特点：不需要 Cloudflare 账号或域名；缺点：URL 每次重启会变
rem  安全：只转发 7788（游戏），GM 后台 7790 不暴露
rem ============================================================
set NODE=C:\Users\Administrator\.trae-cn\sdks\versions\node\current\node.exe
cd /d "%~dp0.."

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo [!] 未检测到 cloudflared。先安装：
  echo     winget install Cloudflare.cloudflared
  echo     （装完重开一个终端再跑本脚本）
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
echo [i] 正在建立隧道（仅转发 7788）...
echo [i] 下面日志里出现  https://xxxx-xxxx-xxxx.trycloudflare.com  就是你的公网地址
echo [i] 把该地址发给朋友即可访问；按 Ctrl+C 停止隧道
echo.
cloudflared tunnel --url http://localhost:7788
pause
