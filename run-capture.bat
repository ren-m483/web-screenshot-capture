\
@echo off
chcp 65001 > nul

cd /d %~dp0

echo ========================================
echo Web Screenshot Capture
echo ========================================
echo.

if not exist node_modules (
    echo Installing dependencies...
    call npm install

    if errorlevel 1 (
        echo npm install failed.
        pause
        exit /b 1
    )
)

call npx playwright install chromium

if errorlevel 1 (
    echo Playwright browser installation failed.
    pause
    exit /b 1
)

echo Starting capture...
echo.

call npm run capture

if errorlevel 1 (
    echo.
    echo Some captures failed.
    echo Check capture-report.json.
) else (
    echo.
    echo Capture completed successfully.
)

echo.
pause
