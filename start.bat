@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

REM ============================================
REM  XEARN - Script de demarrage complet (.bat)
REM ============================================
REM  Usage: start.bat          (lance tout)
REM         start.bat api      (BDD + API seulement)
REM         start.bat web      (Frontend seulement)
REM         start.bat stop     (arrete tout)
REM ============================================

set "ROOT=%~dp0"
set "API_DIR=%ROOT%apps\api"
set "WEB_DIR=%ROOT%apps\web"

if "%1"=="stop" goto :STOP
if "%1"=="STOP" goto :STOP

echo.
echo   ========================================
echo        XEARN - Demarrage complet
echo   ========================================
echo.

if "%1"=="web" goto :WEB_ONLY
if "%1"=="WEB" goto :WEB_ONLY

REM ============================================
REM 1. DOCKER / POSTGRESQL
REM ============================================
echo [1/5] PostgreSQL (Docker)...

docker info >nul 2>&1
if errorlevel 1 (
    echo    ERREUR: Docker Desktop n'est pas demarre !
    echo    Lancez Docker Desktop puis reessayez.
    pause
    exit /b 1
)

docker ps -q --filter "name=xearn-postgres" >nul 2>&1
for /f %%i in ('docker ps -q --filter "name=xearn-postgres"') do set "PG_RUNNING=%%i"

if defined PG_RUNNING (
    echo    OK: PostgreSQL deja en cours
) else (
    for /f %%i in ('docker ps -aq --filter "name=xearn-postgres"') do set "PG_EXISTS=%%i"
    if defined PG_EXISTS (
        docker start xearn-postgres >nul 2>&1
        echo    OK: PostgreSQL redemarre
    ) else (
        pushd "%ROOT%"
        docker compose up -d >nul 2>&1
        popd
        echo    OK: PostgreSQL cree et demarre
    )
)

REM Attendre que PostgreSQL soit pret
echo    Attente de PostgreSQL...
set ATTEMPTS=0
:WAIT_PG
set /a ATTEMPTS+=1
if %ATTEMPTS% gtr 15 (
    echo    ERREUR: PostgreSQL ne repond pas
    pause
    exit /b 1
)
powershell -Command "(Test-NetConnection localhost -Port 5432 -WarningAction SilentlyContinue).TcpTestSucceeded" 2>nul | findstr "True" >nul
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto :WAIT_PG
)
echo    OK: PostgreSQL pret (port 5432)

REM ============================================
REM 2. PRISMA
REM ============================================
echo.
echo [2/5] Prisma (schema sync)...

pushd "%API_DIR%"
call npx prisma generate >nul 2>&1
echo    OK: Prisma Client genere
call npx prisma db push >nul 2>&1
echo    OK: Schema synchronise
popd

REM ============================================
REM 3. BUILD API
REM ============================================
echo.
echo [3/5] Build API (NestJS)...

pushd "%API_DIR%"
del /q tsconfig.tsbuildinfo >nul 2>&1
call npx tsc --project tsconfig.json >nul 2>&1
if errorlevel 1 (
    echo    ERREUR: Compilation echouee !
    call npx tsc --project tsconfig.json
    popd
    pause
    exit /b 1
)
echo    OK: API compilee (dist/)
popd

REM ============================================
REM 4. START API
REM ============================================
echo.
echo [4/5] Demarrage API (port 4000)...

REM Tuer le processus existant sur le port 4000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

start /B /MIN "" node "%API_DIR%\dist\main.js"

REM Attendre que l'API soit prete
echo    Attente de l'API...
set ATTEMPTS=0
:WAIT_API
set /a ATTEMPTS+=1
if %ATTEMPTS% gtr 15 (
    echo    ERREUR: API ne repond pas
    pause
    exit /b 1
)
powershell -Command "(Test-NetConnection localhost -Port 4000 -WarningAction SilentlyContinue).TcpTestSucceeded" 2>nul | findstr "True" >nul
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto :WAIT_API
)
echo    OK: API prete sur http://localhost:4000

if "%1"=="api" goto :SUMMARY
if "%1"=="API" goto :SUMMARY

REM ============================================
REM 5. START WEB
REM ============================================
:WEB_ONLY
echo.
echo [5/5] Demarrage Web (port 3000)...

REM Tuer le processus existant sur le port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

pushd "%WEB_DIR%"
start /B /MIN "" npx next dev --port 3000
popd

echo    Attente du frontend...
set ATTEMPTS=0
:WAIT_WEB
set /a ATTEMPTS+=1
if %ATTEMPTS% gtr 30 (
    echo    Le frontend prend du temps (Next.js compile au 1er acces)
    goto :SUMMARY
)
powershell -Command "(Test-NetConnection localhost -Port 3000 -WarningAction SilentlyContinue).TcpTestSucceeded" 2>nul | findstr "True" >nul
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto :WAIT_WEB
)
echo    OK: Frontend pret sur http://localhost:3000

REM ============================================
REM SUMMARY
REM ============================================
:SUMMARY
echo.
echo   ========================================
echo        XEARN demarre avec succes !
echo   ========================================
echo.
echo   PostgreSQL : localhost:5432
echo   API        : http://localhost:4000
echo   Frontend   : http://localhost:3000
echo.
echo   Comptes de test :
echo     Admin : admin@xearn.com / admin123
echo     User  : test@xearn.com / test123
echo.
echo   Pour arreter : start.bat stop
echo.
pause
exit /b 0

REM ============================================
REM STOP
REM ============================================
:STOP
echo.
echo   Arret de XEARN...
echo.

REM Arreter l'API (port 4000)
set "KILLED_API=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
    set "KILLED_API=1"
)
if "!KILLED_API!"=="1" (
    echo    OK: API arretee [port 4000]
) else (
    echo    -  API deja arretee
)

REM Arreter le Frontend (port 3000)
set "KILLED_WEB=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
    set "KILLED_WEB=1"
)
if "!KILLED_WEB!"=="1" (
    echo    OK: Frontend arrete [port 3000]
) else (
    echo    -  Frontend deja arrete
)

REM Nettoyage : tuer tout processus node restant
taskkill /IM node.exe /F >nul 2>&1
if !errorlevel!==0 (
    echo    OK: Processus Node restants arretes
)

REM Arreter PostgreSQL
set "PG_UP="
for /f %%i in ('docker ps -q --filter "name=xearn-postgres" 2^>nul') do set "PG_UP=%%i"
if defined PG_UP (
    docker stop xearn-postgres >nul 2>&1
    echo    OK: PostgreSQL arrete
) else (
    echo    -  PostgreSQL deja arrete
)

echo.
echo   XEARN arrete.
echo.
pause
exit /b 0
