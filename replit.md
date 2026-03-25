# Crowd Services Platform (منصة خدمات الحشود)

## Project Overview

A crowd management platform for the Grand Mosque (Haram) in Mecca. Manages gates, prayer areas, staffing, interactive maps, daily sessions, and real-time tracking. UI is primarily in Arabic with RTL support.

## Tech Stack

- **Frontend**: React 19, CRACO (Create React App Configuration Override), Tailwind CSS, Radix UI (shadcn/ui), React Router v7, Axios, Recharts
- **Backend**: FastAPI (Python 3.12), MongoDB (Motor async driver), JWT auth, Uvicorn, slowapi (rate limiting), WebSocket support
- **Package Manager**: Yarn (frontend), pip (backend)
- **Database**: MongoDB 7.0

## Architecture

- Frontend dev server runs on port **5000** (host: 0.0.0.0)
- Backend API server runs on port **8000** (host: localhost)
- MongoDB runs on port **27017** (localhost, data in `/home/runner/workspace/data/db`)
- Frontend proxies `/api` and `/uploads` to backend via CRACO dev server proxy
- `REACT_APP_BACKEND_URL` is set to empty string (uses proxy in dev)

## Running the App

Single workflow: `Start application` runs `bash /home/runner/workspace/start.sh`

The startup script:
1. Starts MongoDB at `mongodb://localhost:27017`
2. Starts FastAPI backend on localhost:8000 with `python3 -m uvicorn`
3. Starts React dev server on 0.0.0.0:5000

## Environment Variables (set as Replit env vars)

- `MONGO_URL`: `mongodb://localhost:27017`
- `DB_NAME`: `crowd_services`
- `JWT_SECRET`: JWT signing key
- `CORS_ORIGINS`: `*`

## Default Admin Credentials

- Email: `admin@crowd.sa`
- Password: `admin123`

## Key Files

- `start.sh` - Main startup script (dev) — starts MongoDB, backend, then frontend
- `backend/server.py` - FastAPI app entry point (WebSocket + rate limiting support)
- `backend/database.py` - MongoDB connection
- `backend/ws_manager.py` - WebSocket manager for real-time features
- `frontend/craco.config.js` - Build config with dev server proxy and allowedHosts
- `frontend/.env` - Frontend environment variables
- `frontend/src/pages/WelcomePage.jsx` - Welcome/profile landing page for non-admin users

## Post-Login Routing

- ALL users → WelcomePage `/` (home page with profile info, shift, coverage location, available pages)
- Dashboard (غرفة العمليات) moved to `/dashboard` — requires `page_dashboard` permission

## Important Setup Notes

- **Python runtime**: `python-3.12` module must be installed (not just from .replit)
- **Node.js runtime**: `nodejs-20` module must be installed
- **MongoDB**: Installed as system dependency (`mongodb` Nix package)
- **slowapi**: Required Python package for rate limiting (not in original requirements.txt)
- **ajv fix**: `ajv-keywords@5.x` needs `ajv@8.x` — a nested copy is placed at `node_modules/ajv-keywords/node_modules/ajv/` to fix the resolution conflict with `react-scripts`
- **yarn PATH**: Yarn is at `/home/runner/workspace/node_modules/.bin/yarn` — `start.sh` adds this to PATH

## System Dependencies (Nix)

- `mongodb` — MongoDB 7.0 database server

## Python Packages (key ones beyond requirements.txt)

- `slowapi` — Rate limiting for FastAPI
- `websockets` — WebSocket support
