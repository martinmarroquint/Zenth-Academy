# =====================================================
# run_local_sqlite.ps1
# Levanta el backend en MODO LOCAL con SQLite (sin Supabase).
#
# Uso:
#   .\run_local_sqlite.ps1
#   .\run_local_sqlite.ps1 -Port 8080
#
# NO modifica tu archivo .env: inyecta la variable de entorno solo
# para este proceso. Tu configuración de Supabase queda intacta.
# =====================================================

param(
    [int]$Port = 8000,
    [string]$DbFile = "zenth_local.db"
)

$ErrorActionPreference = "Stop"

# Verificar venv
if (-not (Test-Path ".\venv\Scripts\python.exe")) {
    Write-Host "ERROR: No se encontró el entorno virtual en .\venv" -ForegroundColor Red
    Write-Host "Créalo con: python -m venv venv" -ForegroundColor Yellow
    exit 1
}

# Modo SQLite para este proceso (no toca .env)
$env:SUPABASE_DATABASE_URL = "sqlite:///./$DbFile"
if (-not $env:JWT_SECRET_KEY) {
    # Solo si el .env no la define, usamos una de desarrollo
    Write-Host "AVISO: Usando JWT_SECRET_KEY de desarrollo." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " ZENTH ACADEMY - MODO LOCAL (SQLite)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Base de datos : $DbFile" -ForegroundColor Green
Write-Host " URL           : http://localhost:$Port" -ForegroundColor Green
Write-Host " Docs          : http://localhost:$Port/docs" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

& ".\venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port $Port
