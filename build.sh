#!/bin/bash
set -e
echo "Building frontend..."
cd /home/runner/workspace/frontend
REACT_APP_BACKEND_URL="" yarn build
echo "Frontend build complete!"
