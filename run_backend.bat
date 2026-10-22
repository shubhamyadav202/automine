@echo off
echo ========================================================
echo   AutoMiner Pro - Launching Backend API Server
echo ========================================================
cd /d "%~dp0backend"
python -m uvicorn main:app --reload --port 8000
pause
