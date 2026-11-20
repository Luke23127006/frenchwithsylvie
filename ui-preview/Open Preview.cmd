@echo off
setlocal
cd /d "%~dp0"
title French with Sylvie - UI Preview

where node.exe >nul 2>&1
if errorlevel 1 goto install_node
where npm.cmd >nul 2>&1
if errorlevel 1 goto install_node
node -e "const [major, minor] = process.versions.node.split('.').map(Number); process.exit(major > 20 || (major === 20 && minor >= 9) ? 0 : 1)"
if errorlevel 1 goto install_node

if not exist "node_modules\.preview-ready" goto setup
if not exist "node_modules\next\dist\bin\next" goto setup
fc /b package-lock.json "node_modules\.preview-ready" >nul 2>&1
if errorlevel 1 goto setup
goto launch

:setup
    echo Setting up the preview. The first run may take a few minutes.
    call npm.cmd ci --no-audit --no-fund
    if errorlevel 1 goto failed
    copy /y package-lock.json "node_modules\.preview-ready" >nul
    if errorlevel 1 goto failed

:launch
echo Starting preview. Keep this window open while you use it.
node open-preview.mjs
if errorlevel 1 goto failed
exit /b 0

:install_node
echo Install the LTS version of Node.js, then double-click Open Preview again.
start "" "https://nodejs.org/en/download"
pause
exit /b 1

:failed
echo.
echo The preview could not start. Check the message above and contact the project maintainer if needed.
pause
exit /b 1
