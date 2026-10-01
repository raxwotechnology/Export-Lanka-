@echo off
title Authentic Lanka ERP - Launcher
echo ===================================================
echo     Authentic Lanka Exports ERP Launcher
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend Server...
start "Export Lanka - Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Server...
start "Export Lanka - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are launching!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173 (or 5174 if 5173 is occupied)
echo.
pause
