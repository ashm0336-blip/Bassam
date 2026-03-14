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
- Real-time WebSocket updates

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket
- **Frontend**: React (Vite) + Shadcn UI + WebSocket Client
- **Auth**: JWT-based with role permissions
- **Real-time**: WebSocket (ws_manager.py + WebSocketContext.jsx)

## What's Been Implemented
- Full dashboard with operations room + LIVE indicator
- Employee & schedule management with lock/approval
- Tasks module (calendar, Kanban, list views) — department-isolated
- Daily sessions for prayer halls & gates (map-based)
- Map calibration system with real-world metrics
- Fine-grained permissions system
- Employee profile pages
- Gates map with interactive SVG points
- WebSocket real-time updates (no polling)

## Recent Changes (March 2026)
- **Bug Fix**: Tasks were showing across all departments for system_admin — fixed department filtering in all 4 task endpoints
- **Bug Fix**: Schedule tab crash (hoisting error in EmployeeManagement.jsx)
- **Cleanup**: Removed ALL refresh buttons from: EmployeesList, MapManagementPage, GateMapPage, ZoneCategoryManager, Dashboard, DepartmentOverview
- **WebSocket**: Full real-time system — any CRUD broadcasts to all connected clients
- **Bug Fix**: Zone categories permissions — require_department_manager instead of require_admin
- **Bug Fix**: Employee account activation endpoint fix

## Upcoming Tasks (P0)
1. Comparative Density Report
2. Gates Audit Log

## Future Tasks
- P1: Advanced task features (recurring, templates, comments, reminders)
- P1: Full attendance system (check-in/check-out)
- P2: Push notifications

## Credentials
- Admin: admin@crowd.sa / admin123
- Employee (Bassam): ID 1037299037 / PIN 100100

## Key Files
- `/app/backend/ws_manager.py`
- `/app/backend/server.py`
- `/app/backend/routes/tasks.py`
- `/app/backend/routes/employees.py`
- `/app/backend/routes/settings.py`
- `/app/frontend/src/context/WebSocketContext.jsx`
- `/app/frontend/src/App.js`
- `/app/frontend/src/pages/Dashboard.jsx`
- `/app/frontend/src/pages/DepartmentOverview.jsx`
- `/app/frontend/src/components/EmployeesList.jsx`
- `/app/frontend/src/components/EmployeeManagement.jsx`
- `/app/frontend/src/pages/DepartmentSettings.jsx`
- `/app/frontend/src/pages/MapManagementPage.jsx`
- `/app/frontend/src/pages/GateMapPage.jsx`
- `/app/frontend/src/pages/admin/ZoneCategoryManager.jsx`
