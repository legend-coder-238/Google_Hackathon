@echo off
REM Legal AI Advisor - Complete Application Startup Script (Windows)
REM This script starts both the backend API and frontend in development mode

echo 🚀 Starting Legal AI Advisor Application...
echo ==================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ and try again.
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+ and try again.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found. Creating from template...
    copy .env.example .env
    echo 📝 Please edit .env file and add your GEMINI_API_KEY before continuing.
    echo    You can get an API key from: https://makersuite.google.com/app/apikey
    echo.
    echo After setting up the API key, run this script again.
    pause
    exit /b 1
)

REM Check if GEMINI_API_KEY is set
findstr /c:"GEMINI_API_KEY=" .env | findstr /v /c:"GEMINI_API_KEY=$" >nul
if errorlevel 1 (
    echo ⚠️  GEMINI_API_KEY not set in .env file.
    echo 📝 Please add your Google Gemini API key to the .env file.
    echo    You can get an API key from: https://makersuite.google.com/app/apikey
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed
echo.

REM Install backend dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing backend dependencies...
    npm install
    echo ✅ Backend dependencies installed
    echo.
)

REM Install Python dependencies if needed
if not exist "Google_Hackathon-AI\Google_Hackathon-AI\AI Code\.dependencies_installed" (
    echo 🐍 Installing Python AI dependencies...
    cd "Google_Hackathon-AI\Google_Hackathon-AI\AI Code"
    pip install -r requirements.txt
    echo. > .dependencies_installed
    cd ..\..\..
    echo ✅ Python dependencies installed
    echo.
)

REM Install frontend dependencies if needed
if not exist "Google_Hackathon-Frontend\Google_Hackathon-Frontend\node_modules" (
    echo ⚛️  Installing frontend dependencies...
    cd "Google_Hackathon-Frontend\Google_Hackathon-Frontend"
    npm install
    cd ..\..
    echo ✅ Frontend dependencies installed
    echo.
)

echo 🎯 Starting services...
echo.

REM Create logs directory
if not exist "logs" mkdir logs

echo 🔧 Starting backend API server...
start "Legal AI Backend" cmd /c "npm run dev"

REM Wait a moment for backend to start
timeout /t 3 >nul

echo ⚛️  Starting frontend development server...
cd "Google_Hackathon-Frontend\Google_Hackathon-Frontend"
start "Legal AI Frontend" cmd /c "npm run dev"
cd ..\..

echo.
echo ⏳ Services are starting up...
echo.
timeout /t 5 >nul

echo 🎉 Legal AI Advisor is now running!
echo ==================================
echo 📱 Frontend:    http://localhost:3000
echo 🔧 Backend API: http://localhost:3001
echo 🏥 Health Check: http://localhost:3001/api/health
echo.
echo Close the command windows or press Ctrl+C to stop the services
echo.

pause