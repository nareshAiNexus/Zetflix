@echo off
setlocal enabledelayedexpansion

title Zetflix Orchestrator

echo =======================================================================
echo                       ZETFLIX ORCHESTRATOR
echo =======================================================================
echo.

:check_docker
:: Check Docker daemon status
echo [*] Checking if Docker daemon is running...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop first, then press any key to retry.
    pause >nul
    goto check_docker
)

echo [OK] Docker daemon is running.
echo.

:: 1. Start Docker dependencies
echo [1/3] Starting Docker dependencies (MySQL, Redis, Zookeeper, Kafka)...
docker compose up -d
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start Docker containers.
    pause
    exit /b 1
)
echo [OK] Docker dependencies started successfully.
echo.

:: Give Docker services a few seconds to initialize
echo Waiting for dependencies to initialize (5 seconds)...
timeout /t 5 /nobreak > nul
echo.

:: 2. Start each Spring Boot service in Windows Terminal tabs
echo [2/3] Starting Spring Boot services in Windows Terminal tabs...

wt -w 0 -d "%~dp0content-service\content-service" powershell -NoExit -Command "Write-Host 'Starting Content Service (8081)...' -ForegroundColor Cyan\; .\mvnw.cmd spring-boot:run" ^; split-pane -H -d "%~dp0encoding-service\encoding-service" powershell -NoExit -Command "Write-Host 'Starting Encoding Service (8083)...' -ForegroundColor Cyan\; .\mvnw.cmd spring-boot:run" ^; move-focus up ^; split-pane -V -d "%~dp0video-service\video-service" powershell -NoExit -Command "Write-Host 'Starting Video Service (8082)...' -ForegroundColor Cyan\; .\mvnw.cmd spring-boot:run" ^; move-focus down ^; split-pane -V -d "%~dp0streaming-service\streaming-service" powershell -NoExit -Command "Write-Host 'Starting Streaming Service (8084)...' -ForegroundColor Cyan\; .\mvnw.cmd spring-boot:run"

echo.
echo [3/3] All services launched!
echo Windows Terminal has opened tabs for:
echo   - Content Service (Port 8081)
echo   - Video Service (Port 8082)
echo   - Encoding Service (Port 8083)
echo   - Streaming Service (Port 8084)
echo.
echo You can monitor their logs in their respective tabs.
echo To stop the Docker dependencies later, run: docker compose down
echo.
pause
