# SeeMe ML Service - Start Celery Worker (Windows PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting SeeMe ML Celery Worker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Activate virtual environment
& ".\venv\Scripts\Activate.ps1"

# Change to src directory
Set-Location src

# Start Celery worker
Write-Host "Starting Celery worker..." -ForegroundColor Green
Write-Host "Worker configuration:" -ForegroundColor Yellow
Write-Host "  - Queue: ml_processing" -ForegroundColor White
Write-Host "  - Concurrency: 2 workers" -ForegroundColor White
Write-Host "  - Pool: solo (Windows compatible)" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Note: Windows requires 'solo' or 'gevent' pool
celery -A celery_app worker --pool=solo --loglevel=info --concurrency=2
