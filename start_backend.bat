@echo off
title Item & Purchase Management - Backend Server
echo Starting MySQL and Django Backend...

echo [1/2] Starting MySQL Database...
start "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
timeout /t 3 /nobreak >nul

echo [2/2] Starting Django Development Server on port 8000...
cd /d C:\prjct\backend
python manage.py runserver 127.0.0.1:8000
pause
