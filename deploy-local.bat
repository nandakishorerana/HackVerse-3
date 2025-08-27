@echo off
echo Starting Deshi Sahayak Hub - Local Development Deployment
echo.

echo [1/4] Checking dependencies...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js first.
    exit /b 1
)

echo Node.js: Found
echo.

echo [2/4] Starting Frontend (Development Server)...
echo Frontend will be available at: http://localhost:5173
start cmd /k "npm run dev"

echo Waiting 5 seconds for frontend to start...
timeout /t 5 /nobreak >nul

echo.
echo [3/4] Starting Backend (Development Server)...
echo Backend API will be available at: http://localhost:5000
cd backend
start cmd /k "npm run dev"

echo.
echo [4/4] Deployment Summary:
echo =====================================================
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
echo API Docs: http://localhost:5000/api-docs (once backend starts)
echo =====================================================
echo.
echo Both servers are starting in separate windows.
echo.
echo IMPORTANT NOTES:
echo - MongoDB and Redis are not running (Docker required)
echo - Some features may not work without databases
echo - This is for development/testing purposes only
echo.
echo Press any key to continue...
pause >nul
