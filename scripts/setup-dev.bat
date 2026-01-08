@echo off
REM SeeMe Development Environment Setup Script for Windows

echo =========================================
echo SeeMe Development Environment Setup
echo =========================================
echo.

echo Checking prerequisites...

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    exit /b 1
)
echo OK Node.js found
node -v

REM Check Python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed. Please install Python 3.10+ from https://python.org/
    exit /b 1
)
echo OK Python found
python --version

REM Check Docker
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not installed. Please install Docker Desktop from https://docker.com/
    exit /b 1
)
echo OK Docker found
docker --version

REM Check Docker Compose
docker-compose --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    docker compose version >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Docker Compose is not installed.
        exit /b 1
    )
)
echo OK Docker Compose found

REM Check Git
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git is not installed.
    exit /b 1
)
echo OK Git found
git --version

echo.
echo All prerequisites satisfied!
echo.

REM Set up environment file
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo OK .env file created
    echo WARNING: Edit .env file and add your actual credentials
) else (
    echo OK .env file already exists
)

echo.
echo =========================================
echo Starting Docker services...
echo =========================================

REM Start Docker services
cd infrastructure
docker-compose up -d

echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check if services are running
docker-compose ps

echo.
echo =========================================
echo Setup Complete!
echo =========================================
echo.
echo Next steps:
echo 1. Edit .env file with your actual credentials
echo 2. Verify services are running: cd infrastructure ^&^& docker-compose ps
echo 3. View service logs: cd infrastructure ^&^& docker-compose logs -f
echo 4. Access RabbitMQ management: http://localhost:15672 (guest/guest)
echo.
echo To stop services: cd infrastructure ^&^& docker-compose down
echo.

cd ..
pause
