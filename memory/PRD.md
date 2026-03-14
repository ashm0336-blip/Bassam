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

## Tech Stack
- **Backend**: FastAPI + MongoDB
- **Frontend**: React (Vite) + Shadcn UI
- **Auth**: JWT-based with role permissions

## What's Been Implemented
- Full dashboard with operations room
- Employee & schedule management with lock/approval
- Tasks module (calendar, Kanban, list views)
- Daily sessions for prayer halls & gates (map-based)
- Map calibration system with real-world metrics
- Fine-grained permissions system
- Employee profile pages
- Gates map with interactive SVG points
- Real-time measurement during drawing
- Audit log for prayer halls

## Recent Changes (March 2026)
- **Bug Fix**: Zone categories permissions - changed from `require_admin` to `require_department_manager` so General Manager and Department Manager can access categories in Prayer Hall settings
- **Bug Fix**: Fixed employee account activation - EmployeesList.jsx was sending requests to wrong endpoint `/account-action` instead of `/{action}`
- Removed yellow warning circles from gate points on map

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
- `/app/frontend/src/pages/DailyGateSessionsPage.jsx`
- `/app/frontend/src/pages/DepartmentSettings.jsx`
- `/app/frontend/src/pages/admin/ZoneCategoryManager.jsx`
- `/app/frontend/src/components/EmployeesList.jsx`
- `/app/frontend/src/components/EmployeeManagement.jsx`
- `/app/frontend/src/contexts/AuthContext.jsx`
- `/app/frontend/src/App.js`
- `/app/backend/server.py`
- `/app/backend/routes/auth.py`
- `/app/backend/routes/employees.py`
- `/app/backend/routes/settings.py`
- `/app/backend/auth.py`
