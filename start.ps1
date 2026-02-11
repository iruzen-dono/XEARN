# ============================================
# XEARN - Script de démarrage complet
# ============================================
# Usage: .\start.ps1          (lance tout)
#        .\start.ps1 -ApiOnly (lance seulement l'API + BDD)
#        .\start.ps1 -WebOnly (lance seulement le frontend)
#        .\start.ps1 -Stop    (arrête tout)
# ============================================

param(
    [switch]$ApiOnly,
    [switch]$WebOnly,
    [switch]$Stop
)

$ROOT = $PSScriptRoot
$API_DIR = Join-Path $ROOT "apps\api"
$WEB_DIR = Join-Path $ROOT "apps\web"

# Couleurs
function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "   OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "   !! $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "   ERREUR: $msg" -ForegroundColor Red }

# ============================================
# STOP MODE
# ============================================
if ($Stop) {
    Write-Step "Arret de XEARN..."
    
    # Stop Node processes
    $nodes = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodes) {
        $nodes | Stop-Process -Force
        Write-Ok "Processus Node arretes ($($nodes.Count))"
    } else {
        Write-Ok "Aucun processus Node en cours"
    }

    # Stop Docker container
    $container = docker ps -q --filter "name=xearn-postgres" 2>$null
    if ($container) {
        docker stop xearn-postgres 2>$null | Out-Null
        Write-Ok "PostgreSQL arrete"
    } else {
        Write-Ok "PostgreSQL deja arrete"
    }

    Write-Host "`nXEARN arrete." -ForegroundColor Green
    exit 0
}

# ============================================
# HEADER
# ============================================
Write-Host ""
Write-Host "  ========================================" -ForegroundColor Yellow
Write-Host "       XEARN - Demarrage complet" -ForegroundColor Yellow
Write-Host "  ========================================" -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date

# ============================================
# 1. DOCKER / POSTGRESQL
# ============================================
if (-not $WebOnly) {
    Write-Step "1. PostgreSQL (Docker)"

    # Check Docker is running
    try {
        docker info 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Docker not running" }
    } catch {
        Write-Err "Docker Desktop n'est pas demarre !"
        Write-Host "       Lancez Docker Desktop puis reessayez." -ForegroundColor Gray
        exit 1
    }

    # Start container
    $running = docker ps -q --filter "name=xearn-postgres" 2>$null
    if ($running) {
        Write-Ok "PostgreSQL deja en cours (xearn-postgres)"
    } else {
        $exists = docker ps -aq --filter "name=xearn-postgres" 2>$null
        if ($exists) {
            docker start xearn-postgres 2>$null | Out-Null
            Write-Ok "PostgreSQL redemarre (xearn-postgres)"
        } else {
            Push-Location $ROOT
            docker compose up -d 2>$null | Out-Null
            Pop-Location
            Write-Ok "PostgreSQL cree et demarre (xearn-postgres)"
        }
    }

    # Wait for PostgreSQL to be ready
    $attempts = 0
    $maxAttempts = 15
    do {
        $attempts++
        $ready = (Test-NetConnection localhost -Port 5432 -WarningAction SilentlyContinue).TcpTestSucceeded
        if (-not $ready) { Start-Sleep -Seconds 1 }
    } while (-not $ready -and $attempts -lt $maxAttempts)

    if ($ready) {
        Write-Ok "PostgreSQL pret sur le port 5432"
    } else {
        Write-Err "PostgreSQL ne repond pas apres ${maxAttempts}s"
        exit 1
    }
}

# ============================================
# 2. PRISMA (migrations + generate)
# ============================================
if (-not $WebOnly) {
    Write-Step "2. Prisma (schema sync)"

    Push-Location $API_DIR
    $env:DATABASE_URL = "postgresql://xearn:xearn_password@localhost:5432/xearn_db?schema=public"

    # Generate client
    npx prisma generate 2>$null | Out-Null
    Write-Ok "Prisma Client genere"

    # Push schema (safe, no data loss for dev)
    npx prisma db push 2>$null | Out-Null
    Write-Ok "Schema synchronise avec la base"
    Pop-Location
}

# ============================================
# 3. BUILD API
# ============================================
if (-not $WebOnly) {
    Write-Step "3. Build API (NestJS)"

    Push-Location $API_DIR
    Remove-Item tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
    $buildOutput = npx tsc --project tsconfig.json 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "API compilee (dist/)"
    } else {
        Write-Err "Erreur de compilation !"
        Write-Host $buildOutput -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
}

# ============================================
# 4. START API
# ============================================
if (-not $WebOnly) {
    Write-Step "4. Demarrage API (port 4000)"

    # Kill existing Node processes on port 4000
    $existing = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
    if ($existing) {
        $existing | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }

    # Start API in background
    $apiMain = Join-Path $API_DIR "dist\main.js"
    Start-Process -FilePath "node" -ArgumentList $apiMain -WindowStyle Hidden -WorkingDirectory $ROOT
    
    # Wait for API to be ready
    $attempts = 0
    $maxAttempts = 15
    do {
        $attempts++
        Start-Sleep -Seconds 1
        $ready = (Test-NetConnection localhost -Port 4000 -WarningAction SilentlyContinue).TcpTestSucceeded
    } while (-not $ready -and $attempts -lt $maxAttempts)

    if ($ready) {
        Write-Ok "API prete sur http://localhost:4000"
    } else {
        Write-Err "API ne repond pas apres ${maxAttempts}s"
        exit 1
    }
}

# ============================================
# 5. START WEB (Next.js dev)
# ============================================
if (-not $ApiOnly) {
    Write-Step "5. Demarrage Web (port 3000)"

    # Kill existing process on port 3000
    $existing = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($existing) {
        $existing | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }

    Push-Location $WEB_DIR
    Start-Process -FilePath "npx" -ArgumentList "next", "dev", "--port", "3000" -WindowStyle Hidden -WorkingDirectory $WEB_DIR
    Pop-Location

    # Wait for Web to be ready
    $attempts = 0
    $maxAttempts = 30
    do {
        $attempts++
        Start-Sleep -Seconds 1
        $ready = (Test-NetConnection localhost -Port 3000 -WarningAction SilentlyContinue).TcpTestSucceeded
    } while (-not $ready -and $attempts -lt $maxAttempts)

    if ($ready) {
        Write-Ok "Frontend pret sur http://localhost:3000"
    } else {
        Write-Warn "Frontend prend du temps a demarrer (Next.js compile au premier acces)"
    }
}

# ============================================
# SUMMARY
# ============================================
$elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds)

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Green
Write-Host "       XEARN demarre ! ($elapsed secondes)" -ForegroundColor Green
Write-Host "  ========================================" -ForegroundColor Green
Write-Host ""

if (-not $WebOnly) {
    Write-Host "  PostgreSQL : localhost:5432" -ForegroundColor White
    Write-Host "  API        : http://localhost:4000" -ForegroundColor White
}
if (-not $ApiOnly) {
    Write-Host "  Frontend   : http://localhost:3000" -ForegroundColor White
}

Write-Host ""
Write-Host "  Comptes de test :" -ForegroundColor Gray
Write-Host "    Admin  : juleszhou00@gmail.com / admin123" -ForegroundColor Gray
Write-Host ""
Write-Host "  Pour arreter : .\start.ps1 -Stop" -ForegroundColor Gray
Write-Host ""
