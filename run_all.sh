#!/bin/bash

echo "======================================================================="
echo "                       ZETFLIX ORCHESTRATOR (BASH)"
echo "======================================================================="
echo

# 1. Check Docker daemon status
echo "[*] Checking if Docker daemon is running..."
if ! docker info >/dev/null 2>&1; then
    echo "[ERROR] Docker is not running! Please start Docker Desktop first."
    exit 1
fi
echo "[OK] Docker daemon is running."
echo

# 2. Start Docker dependencies
echo "[1/3] Starting Docker dependencies..."
if ! docker compose up -d; then
    echo "[ERROR] Failed to start Docker containers."
    exit 1
fi
echo "[OK] Docker dependencies started successfully."
echo

echo "Waiting for dependencies to initialize (5 seconds)..."
sleep 5
echo

# Get absolute path to the project root directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Convert POSIX path to Windows path for Windows Terminal / wt.exe
# (e.g. /d/projects/Zetflix -> d:\projects\Zetflix)
win_path() {
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        cygpath -w "$1"
    else
        echo "$1"
    fi
}

PATH_CONTENT=$(win_path "$DIR/content-service/content-service")
PATH_VIDEO=$(win_path "$DIR/video-service/video-service")
PATH_ENCODING=$(win_path "$DIR/encoding-service/encoding-service")
PATH_STREAMING=$(win_path "$DIR/streaming-service/streaming-service")

echo "[2/3] Starting Spring Boot services in Windows Terminal tabs..."

wt -w 0 \
  -d "$PATH_CONTENT" powershell -NoExit -Command "Write-Host 'Starting Content Service (8081)...' -ForegroundColor Cyan\; .\mvnw.cmd spring-boot:run" \; \
  split-pane -H -d "$PATH_ENCODING" powershell -NoExit -Command "Write-Host 'Starting Encoding Service (8083)...' -ForegroundColor Cyan\; .\mvnw.cmd spring-boot:run" \; \
  move-focus up \; \
  split-pane -V -d "$PATH_VIDEO" powershell -NoExit -Command "Write-Host 'Starting Video Service (8082)...' -ForegroundColor Cyan\; .\mvnw.cmd spring-boot:run" \; \
  move-focus down \; \
  split-pane -V -d "$PATH_STREAMING" powershell -NoExit -Command "Write-Host 'Starting Streaming Service (8084)...' -ForegroundColor Cyan\; .\mvnw.cmd spring-boot:run"

echo
echo "[3/3] All services launched in Windows Terminal tabs!"
