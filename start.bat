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
REM         start.bat seed     (seed la base de donnees)
REM ============================================

set "ROOT=%~dp0"
set "API_DIR=%ROOT%apps\api"
set "WEB_DIR=%ROOT%apps\web"
set "ENV_FILE=%ROOT%.env"

REM Charger les variables du fichier .env dans l'environnement
REM Utilise scripts/load-env.js pour gerer les caracteres speciaux (<> & | etc.)
if exist "%ENV_FILE%" (
    where node >nul 2>&1
    if not errorlevel 1 (
        node "%ROOT%scripts\load-env.js" "%ENV_FILE%" "%TEMP%\xearn_env.bat" 2>nul
        if exist "%TEMP%\xearn_env.bat" (
            call "%TEMP%\xearn_env.bat"
            del "%TEMP%\xearn_env.bat" 2>nul
        )
    ) else (
        REM Fallback sans Node: parsing simple (peut echouer sur <> dans les valeurs)
        for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%ENV_FILE%") do (
            if not "%%a"=="" if not "%%b"=="" (
                set "ENVVAL=%%b"
                set "ENVVAL=!ENVVAL:"=!"
                set "%%a=!ENVVAL!"
            )
        ) 2>nul
    )
)
REM Ports par defaut si non definis dans .env
if not defined API_PORT set "API_PORT=4000"
if not defined WEB_PORT set "WEB_PORT=3000"

if "%1"=="stop" goto :STOP
if "%1"=="STOP" goto :STOP
if "%1"=="seed" goto :SEED
if "%1"=="SEED" goto :SEED

echo.
echo   ========================================
echo        XEARN - Demarrage complet
echo   ========================================
echo.

REM ============================================
REM 0. PRE-CHECKS (.env + node_modules)
REM ============================================
echo [0/6] Verification pre-requis...

if not exist "%ENV_FILE%" (
    echo    ERREUR: Fichier .env introuvable a la racine !
    echo    Copiez .env.example en .env et remplissez les valeurs :
    echo      copy .env.example .env
    pause
    exit /b 1
)
echo    OK: .env trouve

where node >nul 2>&1
if errorlevel 1 (
    echo    ERREUR: Node.js n'est pas installe ou pas dans le PATH !
    pause
    exit /b 1
)
echo    OK: Node.js disponible

if not exist "%ROOT%node_modules" (
    echo    node_modules manquant, installation en cours...
    pushd "%ROOT%"
    call npm install
    if errorlevel 1 (
        echo    ERREUR: npm install a echoue !
        popd
        pause
        exit /b 1
    )
    popd
    echo    OK: Dependances installees
) else (
    echo    OK: node_modules present
)

if "%1"=="web" goto :WEB_ONLY
if "%1"=="WEB" goto :WEB_ONLY

REM ============================================
REM 1. DOCKER / POSTGRESQL
REM ============================================
echo.
echo [1/6] PostgreSQL (Docker)...

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
if %ATTEMPTS% gtr 20 (
    echo    ERREUR: PostgreSQL ne repond pas apres 20 secondes
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
REM Liberer les fichiers Prisma (query engine DLL) en tuant l'ancien processus API
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%API_PORT%.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo.
echo [2/6] Prisma (generate + migrations)...

pushd "%API_DIR%"
call npx prisma generate >nul 2>&1
if errorlevel 1 (
    echo    ERREUR: prisma generate a echoue !
    popd
    pause
    exit /b 1
)
echo    OK: Prisma Client genere

call npx prisma migrate deploy >nul 2>&1
if errorlevel 1 (
    echo    AVERTISSEMENT: prisma migrate deploy a echoue
    echo    Tentative avec prisma db push...
    call npx prisma db push >nul 2>&1
    if errorlevel 1 (
        echo    ERREUR: Impossible d'appliquer le schema !
        popd
        pause
        exit /b 1
    )
)
echo    OK: Migrations appliquees
popd

REM ============================================
REM 3. SEED (si premiere utilisation)
REM ============================================
echo.
echo [3/6] Verification des donnees...

pushd "%API_DIR%"
REM Tenter le seed (idempotent - ne fait rien si les donnees existent)
call npx ts-node prisma/seed.ts >nul 2>&1
if errorlevel 1 (
    echo    -  Seed deja applique ou non disponible
) else (
    echo    OK: Donnees initiales verifiees
)
popd

REM ============================================
REM 4. BUILD API
REM ============================================
echo.
echo [4/6] Build API (NestJS)...

pushd "%API_DIR%"
REM Nettoyer le cache incremental pour eviter les builds vides
del tsconfig.tsbuildinfo 2>nul
if exist dist (
    if not exist dist\main.js (
        rd /s /q dist 2>nul
    )
)
call npx nest build >nul 2>&1
if errorlevel 1 (
    echo    ERREUR: Compilation API echouee !
    echo    Details :
    call npx nest build
    popd
    pause
    exit /b 1
)
if not exist dist\main.js (
    echo    ERREUR: dist\main.js introuvable apres le build !
    echo    Nettoyage et re-build...
    rd /s /q dist 2>nul
    call npx nest build >nul 2>&1
    if not exist dist\main.js (
        echo    ERREUR: Build API echoue meme apres nettoyage !
        popd
        pause
        exit /b 1
    )
)
echo    OK: API compilee (dist/)
popd

REM ============================================
REM 5. START API
REM ============================================
echo.
echo [5/6] Demarrage API (port %API_PORT%)...

REM Tuer le processus existant sur le port API
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%API_PORT%.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

start "XEARN-API" /MIN /D "%API_DIR%" node dist\main.js

REM Attendre que l'API soit prete
echo    Attente de l'API...
set ATTEMPTS=0
:WAIT_API
set /a ATTEMPTS+=1
if %ATTEMPTS% gtr 20 (
    echo    ERREUR: API ne repond pas apres 20 secondes
    echo    Verifiez les logs : node apps\api\dist\main.js
    pause
    exit /b 1
)
powershell -Command "(Test-NetConnection localhost -Port %API_PORT% -WarningAction SilentlyContinue).TcpTestSucceeded" 2>nul | findstr "True" >nul
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto :WAIT_API
)
echo    OK: API prete sur http://localhost:%API_PORT%

if "%1"=="api" goto :SUMMARY
if "%1"=="API" goto :SUMMARY

REM ============================================
REM 6. START WEB
REM ============================================
:WEB_ONLY
echo.
echo [6/6] Demarrage Web (port %WEB_PORT%)...

REM Tuer le processus existant sur le port Web
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%WEB_PORT%.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

start "XEARN-WEB" /MIN /D "%WEB_DIR%" npx next dev --port %WEB_PORT%

echo    Attente du frontend...
set ATTEMPTS=0
:WAIT_WEB
set /a ATTEMPTS+=1
if %ATTEMPTS% gtr 30 (
    echo    Le frontend prend du temps (Next.js compile au 1er acces)
    goto :SUMMARY
)
powershell -Command "(Test-NetConnection localhost -Port %WEB_PORT% -WarningAction SilentlyContinue).TcpTestSucceeded" 2>nul | findstr "True" >nul
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto :WAIT_WEB
)
echo    OK: Frontend pret sur http://localhost:%WEB_PORT%

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
echo   API        : http://localhost:%API_PORT%
echo   Frontend   : http://localhost:%WEB_PORT%
echo.
echo   Commandes utiles :
echo     start.bat stop   - Arreter tout
echo     start.bat seed   - Re-seeder la base
echo     start.bat api    - API seulement
echo     start.bat web    - Frontend seulement
echo.
pause
exit /b 0

REM ============================================
REM SEED
REM ============================================
:SEED
echo.
echo   Seeding de la base de donnees...
echo.
pushd "%API_DIR%"
call npx prisma generate >nul 2>&1
call npx ts-node prisma/seed.ts
if errorlevel 1 (
    echo    ERREUR: Seed echoue !
    popd
    pause
    exit /b 1
)
popd
echo.
echo    OK: Base de donnees seedee
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
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%API_PORT%.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
    set "KILLED_API=1"
)
if "!KILLED_API!"=="1" (
    echo    OK: API arretee [port %API_PORT%]
) else (
    echo    -  API deja arretee
)

REM Arreter le Frontend (port 3000)
set "KILLED_WEB=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%WEB_PORT%.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
    set "KILLED_WEB=1"
)
if "!KILLED_WEB!"=="1" (
    echo    OK: Frontend arrete [port %WEB_PORT%]
) else (
    echo    -  Frontend deja arrete
)

REM Arreter PostgreSQL (optionnel)
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
