#!/bin/bash

# Legal AI Advisor - Complete Application Startup Script
# This script starts both the backend API and frontend in development mode

echo "🚀 Starting Legal AI Advisor Application..."
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8+ and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env file and add your GEMINI_API_KEY before continuing."
    echo "   You can get an API key from: https://makersuite.google.com/app/apikey"
    echo ""
    echo "After setting up the API key, run this script again."
    exit 1
fi

# Check if GEMINI_API_KEY is set
if ! grep -q "GEMINI_API_KEY=.*[a-zA-Z0-9]" .env; then
    echo "⚠️  GEMINI_API_KEY not set in .env file."
    echo "📝 Please add your Google Gemini API key to the .env file."
    echo "   You can get an API key from: https://makersuite.google.com/app/apikey"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Install backend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
    echo "✅ Backend dependencies installed"
    echo ""
fi

# Install Python dependencies if needed
if [ ! -f "Google_Hackathon-AI/Google_Hackathon-AI/AI Code/.dependencies_installed" ]; then
    echo "🐍 Installing Python AI dependencies..."
    cd "Google_Hackathon-AI/Google_Hackathon-AI/AI Code"
    
    if command -v pip3 &> /dev/null; then
        pip3 install -r requirements.txt
    else
        pip install -r requirements.txt
    fi
    
    touch .dependencies_installed
    cd ../../..
    echo "✅ Python dependencies installed"
    echo ""
fi

# Install frontend dependencies if needed
if [ ! -d "Google_Hackathon-Frontend/Google_Hackathon-Frontend/node_modules" ]; then
    echo "⚛️  Installing frontend dependencies..."
    cd "Google_Hackathon-Frontend/Google_Hackathon-Frontend"
    npm install
    cd ../..
    echo "✅ Frontend dependencies installed"
    echo ""
fi

echo "🎯 Starting services..."
echo ""

# Create logs directory
mkdir -p logs

# Function to handle cleanup on script exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM

# Start backend in background
echo "🔧 Starting backend API server..."
npm run dev &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "⚛️  Starting frontend development server..."
cd "Google_Hackathon-Frontend/Google_Hackathon-Frontend"
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
cd ../..

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are running
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend API is running on http://localhost:3001"
else
    echo "❌ Backend failed to start"
    exit 1
fi

if ps -p $FRONTEND_PID > /dev/null; then
    echo "✅ Frontend is running on http://localhost:3000"
else
    echo "❌ Frontend failed to start"
    exit 1
fi

echo ""
echo "🎉 Legal AI Advisor is now running!"
echo "=================================="
echo "📱 Frontend:    http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo "🏥 Health Check: http://localhost:3001/api/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running and wait for user input
wait $BACKEND_PID $FRONTEND_PID