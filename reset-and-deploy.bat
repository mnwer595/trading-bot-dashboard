@echo off
echo ========================================
echo   Trading Bot Dashboard - Reset & Deploy
echo ========================================
echo.

echo [1/5] Discarding all current changes...
git reset --hard HEAD
if %errorlevel% neq 0 (
    echo WARNING: Failed to reset changes, continuing anyway...
) else (
    echo ✓ Changes discarded
)

echo.
echo [2/5] Cleaning untracked files...
git clean -fd
if %errorlevel% neq 0 (
    echo WARNING: Failed to clean untracked files, continuing anyway...
) else (
    echo ✓ Untracked files cleaned
)

echo.
echo [3/5] Force pulling latest changes from remote...
git pull --force
if %errorlevel% neq 0 (
    echo WARNING: Failed to pull from remote, continuing with current code...
) else (
    echo ✓ Latest changes pulled
)

echo.
echo [4/5] Building the project...
echo This may take a few moments...
npm run build
if %errorlevel% neq 0 (
    echo WARNING: Build failed, but attempting to start server anyway...
    echo Check the error messages above
) else (
    echo ✓ Build completed successfully
)

echo.
echo [5/5] Starting the application...
echo.
echo ========================================
echo   Server Starting...
echo ========================================
echo Starting server on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
echo Waiting for server to start...
timeout /t 2 /nobreak >nul
npm run start
