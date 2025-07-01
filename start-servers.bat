@echo off
title Chanspaw Platform Server Starter
color 0A

echo.
echo ========================================
echo    CHANSPAW PLATFORM SERVER STARTER
echo ========================================
echo.

echo Starting Backend Server...
cd backend
start "Backend Server" cmd /k "node server.js"

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo Starting Frontend Server...
cd ..
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo    SERVERS STARTED SUCCESSFULLY!
echo ========================================
echo.
echo Frontend: http://localhost:5174/
echo Backend:  http://localhost:3001/
echo.
echo Press any key to close this window...
pause >nul 