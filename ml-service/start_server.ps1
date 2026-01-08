# SeeMe ML Service - Start FastAPI Server (Windows PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting SeeMe ML Service (FastAPI)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Activate virtual environment
& ".\venv\Scripts\Activate.ps1"

# Change to src directory
Set-Location src

# Start FastAPI server with uvicorn
Write-Host "Starting FastAPI server on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level info
