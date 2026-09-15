#!/bin/bash

set -e

echo "Starting D&D World Builder..."

# Start FastAPI backend
echo "Starting backend on http://localhost:8000..."
uv run uvicorn worldbuilder.api.app:app --reload &
BACKEND_PID=$!

# Start React frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!

# Stop both servers when this script exits
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
}

trap cleanup EXIT INT TERM

wait
