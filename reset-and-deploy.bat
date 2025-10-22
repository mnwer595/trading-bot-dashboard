@echo off
echo ========================================
echo   Trading Bot Dashboard - Reset & Deploy
echo ========================================
echo.

echo [1/5] Discarding all current changes...
git reset --hard HEAD
if %errorlevel% neq 0 (
    echo ERROR: Failed to reset changes
    pause
    exit /b 1
)
echo ✓ Changes discarded

echo.
echo [2/5] Cleaning untracked files...
git clean -fd
if %errorlevel% neq 0 (
    echo ERROR: Failed to clean untracked files
    pause
    exit /b 1
)
echo ✓ Untracked files cleaned

echo.
echo [3/5] Force pulling latest changes from remote...
git pull --force
if %errorlevel% neq 0 (
    echo ERROR: Failed to pull from remote
    pause
    exit /b 1
)
echo ✓ Latest changes pulled

echo.
echo [4/5] Building the project...
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo ✓ Build completed successfully

echo.
echo [5/5] Starting the application...
echo Starting server on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
npm run start

pause
