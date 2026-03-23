#!/bin/bash

# Add node_modules binaries to PATH
export PATH="/home/runner/workspace/node_modules/.bin:$PATH"

# Start MongoDB in background
mkdir -p /home/runner/workspace/data/db
mongod --dbpath /home/runner/workspace/data/db --bind_ip 127.0.0.1 --port 27017 --logpath /tmp/mongod.log --fork 2>/dev/null || echo "MongoDB may already be running"
sleep 2
echo "MongoDB started"

# Start FastAPI backend in background on port 8000
cd /home/runner/workspace/backend
MONGO_URL="mongodb://localhost:27017" DB_NAME="crowd_services" JWT_SECRET="al-haram-os-secure-jwt-secret-key-production-2024" CORS_ORIGINS="*" python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"

# Wait for backend to be ready
sleep 5

# Start React frontend on port 5000
cd /home/runner/workspace/frontend
PORT=5000 HOST=0.0.0.0 REACT_APP_BACKEND_URL="" DANGEROUSLY_DISABLE_HOST_CHECK=true yarn start
