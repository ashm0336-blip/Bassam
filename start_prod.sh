#!/bin/bash

export PATH="/home/runner/workspace/node_modules/.bin:$PATH"
export DB_NAME="${DB_NAME:-crowd_services}"
export JWT_SECRET="${JWT_SECRET:-al-haram-os-secure-jwt-secret-key-production-2024}"
export CORS_ORIGINS="*"
export SERVE_STATIC="true"

echo "Using MongoDB Atlas"

# Build frontend if not already built
if [ ! -f /home/runner/workspace/frontend/build/index.html ]; then
  echo "Building frontend..."
  cd /home/runner/workspace/frontend
  REACT_APP_BACKEND_URL="" yarn build
fi

# Start FastAPI backend on port 5000 (serves API + static frontend)
cd /home/runner/workspace/backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 5000 --workers 2
