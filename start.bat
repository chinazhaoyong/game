@echo off
title DaJiangHu
cd /d "%~dp0"
echo Starting server...
echo Press Ctrl+C to stop.
c:\Users\Administrator\.trae-cn\sdks\versions\node\current\node.exe --experimental-sqlite server\index.js 2> crash.log
echo.
echo Server crashed! Error saved to crash.log
type crash.log
pause