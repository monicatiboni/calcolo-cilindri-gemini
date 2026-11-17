@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 20 o superiore e' richiesto sul computer che ospita il server.
 pause
 exit /b 1
)
start "" "http://localhost:8501"
if exist .env (
  node --env-file=.env server.mjs
) else (
  node server.mjs
)
pause
