@echo off
REM SeeMe ML Service - Start FastAPI Server (Windows Batch)

echo ========================================
echo Starting SeeMe ML Service (FastAPI)
echo ========================================
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Change to src directory
cd src

REM Start FastAPI server
echo Starting FastAPI server on http://localhost:8000
echo Press Ctrl+C to stop
echo.

uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level info
