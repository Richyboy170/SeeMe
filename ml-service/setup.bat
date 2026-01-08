@echo off
REM SeeMe ML Service - Setup Script (Windows Batch)

echo ========================================
echo SeeMe ML Service - Setup
echo ========================================
echo.

REM Check Python
echo Checking Python version...
python --version
echo.

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo Failed to activate virtual environment
    echo Please run: python -m venv venv
    pause
    exit /b 1
)

REM Upgrade pip
echo.
echo Upgrading pip...
python -m pip install --upgrade pip --quiet

REM Install dependencies
echo.
echo Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

REM Download models
echo.
echo Downloading ML models...
python scripts\download_models.py

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Start the ML service:    start_server.bat
echo   2. Start the worker:        start_worker.bat
echo.
pause
