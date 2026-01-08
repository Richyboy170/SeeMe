@echo off
REM Service Health Check Script for Windows

echo =========================================
echo SeeMe Infrastructure Health Check
echo =========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop.
    exit /b 1
)

echo OK Docker is running
echo.

REM Navigate to infrastructure directory
cd /d "%~dp0\..\infrastructure"

REM Check if docker-compose.yml exists
if not exist "docker-compose.yml" (
    echo ERROR: docker-compose.yml not found
    exit /b 1
)

echo Checking service status...
echo.

REM Check PostgreSQL
echo Checking postgres...
docker-compose ps postgres | find "Up" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   postgres: RUNNING
) else (
    echo   postgres: NOT RUNNING
)

REM Check MongoDB
echo Checking mongodb...
docker-compose ps mongodb | find "Up" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   mongodb: RUNNING
) else (
    echo   mongodb: NOT RUNNING
)

REM Check Redis
echo Checking redis...
docker-compose ps redis | find "Up" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   redis: RUNNING
) else (
    echo   redis: NOT RUNNING
)

REM Check RabbitMQ
echo Checking rabbitmq...
docker-compose ps rabbitmq | find "Up" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   rabbitmq: RUNNING
) else (
    echo   rabbitmq: NOT RUNNING
)

echo.
echo =========================================
echo.
echo Service URLs:
echo   PostgreSQL:  localhost:5432
echo   MongoDB:     localhost:27017
echo   Redis:       localhost:6379
echo   RabbitMQ:    localhost:5672
echo   RabbitMQ UI: http://localhost:15672
echo.
echo Run 'docker-compose logs' to view service logs
echo.
