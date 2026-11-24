@echo off
title StopDJH
taskkill /F /IM node.exe 2>nul
echo Done.
pause >nul