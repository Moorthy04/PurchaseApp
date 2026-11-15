@echo off
title Item & Purchase Management - React Frontend
echo Starting React Frontend on port 5173...
cd /d "%~dp0frontend"
npm run dev -- --host 127.0.0.1 --port 5173
pause
