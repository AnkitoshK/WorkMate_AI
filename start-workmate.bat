@echo off
title WorkMate AI - Full Stack Launcher
color 0B
echo =====================================================================
echo                 WorkMate AI - Full Stack Launcher
echo =====================================================================
echo.
echo Starting all WorkMate AI services concurrently:
echo   [1] Backend API Server : http://localhost:4000
echo   [2] Next.js Web Portal : http://localhost:3000
echo   [3] Expo Mobile Metro  : http://localhost:8081
echo.
echo Press Ctrl+C in this window at any time to stop all servers.
echo =====================================================================
echo.
cd /d "%~dp0"
call pnpm dev:all
pause
