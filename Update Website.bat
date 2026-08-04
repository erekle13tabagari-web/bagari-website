@echo off
setlocal
title BAGARI - Publish website to GitHub
color 0F
cd /d "%~dp0"

echo.
echo  ==================================================
echo    BAGARI  -  Publish website to GitHub
echo  ==================================================
echo.

if not exist ".git" (
  echo   ERROR: this folder is not a git repository.
  goto :end
)

REM --- The website publishes from "main" only. ---
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%b"
if /i not "%BRANCH%"=="main" (
  echo   ERROR: you are on branch "%BRANCH%", but the website
  echo          publishes from "main" only.
  echo.
  echo          Fix it with:   git checkout main
  goto :end
)

REM --- Refresh the ?v= tag on style.css / main.js so visitors' browsers fetch
REM     the new files instead of serving a cached copy. ---
echo   [1/5] Refreshing cache tags and checking for changes...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bump-cache-version.ps1"

git add -A
git diff --cached --quiet
if errorlevel 1 (
  echo.
  echo   Files to publish:
  git diff --cached --name-only
  echo.
  echo   [2/5] Committing...
  git commit -m "Update website (%date% %time%)" >nul
  if errorlevel 1 (
    echo   Commit failed.
    goto :end
  )
) else (
  echo   No new file changes.
  echo.
  echo   [2/5] Nothing to commit.
)

REM --- This site is edited from more than one machine. Pull whatever was
REM     pushed elsewhere BEFORE pushing, or the push will be rejected. ---
echo   [3/5] Pulling latest changes from GitHub...
git pull --rebase origin main
if errorlevel 1 (
  echo.
  echo   PULL FAILED - probably a conflict with changes made on
  echo   another machine, or no internet connection.
  echo.
  echo   If it is a conflict: the same lines were edited on two
  echo   machines. Run "git rebase --abort" to undo, then resolve
  echo   it with help, or ask Claude to sort it out.
  goto :end
)

REM --- Committed work still has to reach GitHub. Check for unpushed
REM     commits separately: a clean working tree does NOT mean the
REM     site is up to date. ---
echo   [4/5] Comparing with GitHub...
for /f "delims=" %%c in ('git rev-list --count origin/main..HEAD') do set "AHEAD=%%c"

if "%AHEAD%"=="0" (
  echo.
  echo   Nothing new to publish - the site is already up to date.
  goto :end
)

echo.
echo   Commits waiting to publish: %AHEAD%
git log --oneline origin/main..HEAD
echo.

echo   [5/5] Pushing to GitHub...
git push origin main
if errorlevel 1 (
  echo.
  echo   PUSH FAILED. Check your internet connection or GitHub login.
  goto :end
)

echo.
echo   ==================================================
echo    DONE - website published.
echo    It goes live in about a minute on GitHub Pages.
echo   ==================================================

:end
echo.
if not defined BAGARI_NOPAUSE pause
