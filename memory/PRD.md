# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram.

## Core Modules
- Real-time dashboards (Operations Room)
- Employee scheduling with approval workflow
- Advanced task management (Kanban/Calendar)
- Daily inspection tours for prayer halls and gates
- Fine-grained role-based access control (RBAC)
- Map calibration with real-world measurements
- Employee management and profiles
- **Real-time WebSocket updates** (NEW)

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket
- **Frontend**: React (Vite) + Shadcn UI + WebSocket Client
- **Auth**: JWT-based with role permissions
- **Real-time**: WebSocket (ws_manager.py + WebSocketContext.jsx)

## What's Been Implemented
- Full dashboard with operations room + LIVE indicator
- Employee & schedule management with lock/approval
- Tasks module (calendar, Kanban, list views)
- Daily sessions for prayer halls & gates (map-based)
- Map calibration system with real-world metrics
- Fine-grained permissions system
- Employee profile pages
- Gates map with interactive SVG points
- Real-time measurement during drawing
- Audit log for prayer halls
- **WebSocket real-time updates** — all data changes broadcast instantly to all connected users

## Recent Changes (March 2026)
- **WebSocket System**: Implemented full real-time updates using WebSocket. Any CRUD operation broadcasts to all connected clients. Removed all polling (setInterval). Added "مباشر" live indicator.
- **Bug Fix**: Zone categories permissions — changed from `require_admin` to `require_department_manager`
- **Bug Fix**: Employee account activation — fixed wrong API endpoint in EmployeesList.jsx
- Removed yellow warning circles from gate points on map

## Architecture: WebSocket Real-time
- Backend: `ws_manager.py` — ConnectionManager + RealtimeBroadcastMiddleware
- Middleware auto-detects POST/PUT/DELETE on /api/* and broadcasts channel events
- Frontend: `WebSocketContext.jsx` — Provider + `useRealtimeRefresh` hook
- Channels: employees, gate_sessions, sessions, settings, maps, tasks, alerts, permissions, schedules, dashboard

## Upcoming Tasks (P0)
1. Comparative Density Report - visual comparison of crowd densities between prayer times
2. Gates Audit Log - full implementation similar to prayer halls

## Future Tasks
- P1: Advanced task features (recurring, templates, comments, reminders)
- P1: Full attendance system (check-in/check-out)
- P2: Push notifications

## Credentials
- Admin: admin@crowd.sa / admin123
- Employee (Bassam): ID 1037299037 / PIN 100100

## Key Files
- `/app/backend/ws_manager.py` (NEW - WebSocket manager)
- `/app/backend/server.py` (WebSocket endpoint + middleware)
- `/app/frontend/src/context/WebSocketContext.jsx` (NEW - WebSocket context)
- `/app/frontend/src/pages/Dashboard.jsx`
- `/app/frontend/src/pages/DepartmentOverview.jsx`
- `/app/frontend/src/components/EmployeesList.jsx`
- `/app/frontend/src/components/EmployeeManagement.jsx`
- `/app/frontend/src/components/Layout.jsx`
- `/app/frontend/src/pages/DepartmentSettings.jsx`
- `/app/frontend/src/pages/AlertsPage.jsx`
- `/app/frontend/src/pages/NotificationsPage.jsx`
- `/app/frontend/src/pages/ManagerDashboard.jsx`
- `/app/backend/routes/employees.py`
- `/app/backend/routes/settings.py`
