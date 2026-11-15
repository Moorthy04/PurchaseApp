@echo off
title Launch Item & Purchase Management System
echo Launching Full Stack Application...

echo Starting Backend Server (MySQL + Django)...
start "Backend Server" cmd /c "C:\prjct\start_backend.bat"

timeout /t 5 /nobreak >nul

echo Starting Frontend Server (React + Vite)...
start "Frontend Server" cmd /c "C:\prjct\start_frontend.bat"

timeout /t 4 /nobreak >nul

echo Opening browser to http://localhost:5173/ ...
start http://localhost:5173/

echo Application launched successfully!
exit
