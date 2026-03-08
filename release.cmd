@echo off
setlocal enabledelayedexpansion
title Release Creator

echo ================================
echo         Release Creator
echo ================================
echo.

:: Read current version from package.json
for /f "delims=" %%v in ('node -e "console.log(require('./package.json').version)"') do set CURRENT_VERSION=%%v
echo Current version: %CURRENT_VERSION%
echo.

:: Ask for new version
set /p NEW_VERSION=New version (e.g. 1.2.5):
if "%NEW_VERSION%"=="" (
    echo No version entered. Aborting.
    pause & exit /b 1
)

:: Ask for commit message
set DEFAULT_MSG=chore: release v%NEW_VERSION%
set /p COMMIT_MSG=Commit message [%DEFAULT_MSG%]:
if "%COMMIT_MSG%"=="" set COMMIT_MSG=%DEFAULT_MSG%

:: Summary + confirmation
echo.
echo --------------------------------
echo  Version : %CURRENT_VERSION% -^> %NEW_VERSION%
echo  Tag     : v%NEW_VERSION%
echo  Commit  : %COMMIT_MSG%
echo --------------------------------
echo.
set /p CONFIRM=Proceed? (y/n):
if /i not "%CONFIRM%"=="y" (
    echo Aborted.
    pause & exit /b 0
)

echo.

:: Update version in package.json
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.version='%NEW_VERSION%';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');"
if errorlevel 1 ( echo [ERROR] Failed to update package.json & pause & exit /b 1 )
echo [OK] package.json updated to v%NEW_VERSION%

:: Commit
git add package.json
git commit -m "%COMMIT_MSG%"
if errorlevel 1 ( echo [ERROR] git commit failed & pause & exit /b 1 )
echo [OK] Commit created

:: Tag
git tag v%NEW_VERSION%
if errorlevel 1 ( echo [ERROR] git tag failed & pause & exit /b 1 )
echo [OK] Tag v%NEW_VERSION% created

:: Push main
git push origin main
if errorlevel 1 ( echo [ERROR] git push main failed & pause & exit /b 1 )
echo [OK] main pushed

:: Push tag -> triggers GitHub Actions
git push origin v%NEW_VERSION%
if errorlevel 1 ( echo [ERROR] git push tag failed & pause & exit /b 1 )
echo [OK] Tag pushed

echo.
echo ================================
echo  Done! GitHub Actions is now
echo  building release v%NEW_VERSION%
echo ================================
echo.
pause
