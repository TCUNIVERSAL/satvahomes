@echo off
title Sattva Homes - External Selections 3D
echo ===================================================
echo   Sattva Homes - External Selections 3D (Windows)
echo ===================================================
echo.
echo Starting local development server...
echo.

cd /d "%~dp0"

timeout /t 2 /nobreak >nul 2>&1
start "" http://localhost:5173
call npm run dev

pause
