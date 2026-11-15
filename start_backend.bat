@echo off
title Item & Purchase Management - Backend Server
echo Starting Django Backend...

cd /d "%~dp0backend"
python manage.py runserver 127.0.0.1:8000
pause
