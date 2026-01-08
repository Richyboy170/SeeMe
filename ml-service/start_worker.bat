@echo off
REM SeeMe ML Service - Start Celery Worker (Windows Batch)

echo ========================================
echo Starting SeeMe ML Celery Worker
echo ========================================
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Change to src directory
cd src

REM Start Celery worker
echo Starting Celery worker...
echo Worker configuration:
echo   - Queue: ml_processing
echo   - Concurrency: 2 workers
echo   - Pool: solo (Windows compatible)
echo.
echo Press Ctrl+C to stop
echo.

celery -A celery_app worker --pool=solo --loglevel=info --concurrency=2
