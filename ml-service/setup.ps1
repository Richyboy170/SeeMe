# SeeMe ML Service - Setup Script (Windows PowerShell)
# This script sets up the ML service environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SeeMe ML Service - Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python version
Write-Host "Checking Python version..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
Write-Host "  $pythonVersion" -ForegroundColor Green

# Activate virtual environment
Write-Host ""
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host "  Failed to activate virtual environment" -ForegroundColor Red
    Write-Host "  Please run: python -m venv venv" -ForegroundColor Yellow
    exit 1
}

# Upgrade pip
Write-Host ""
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "  Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Download models
Write-Host ""
Write-Host "Downloading ML models..." -ForegroundColor Yellow
python scripts\download_models.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Start the ML service:    .\start_server.ps1" -ForegroundColor White
    Write-Host "  2. Start the worker:        .\start_worker.ps1" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "  Failed to download models" -ForegroundColor Red
    Write-Host "  You can download them later using: python scripts\download_models.py" -ForegroundColor Yellow
}
