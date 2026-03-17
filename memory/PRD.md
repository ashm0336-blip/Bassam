# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi (rate limiting)
- **Frontend**: React (Vite) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + role-based permissions + department-based access
- **Real-time**: WebSocket with JWT authentication

## Permissions Architecture
- `require_admin` allows both system_admin AND general_manager
- `require_department_manager` allows system_admin, general_manager, department_manager
- `AdminProtectedRoute` allows system_admin AND general_manager
- 38 total permissions across 8 groups
- Real-time permissions sync via WebSocket "permissions" channel

## Data Integrity Rules
- Employee Deletion: Cascade delete to users, tasks, monthly_schedules, alerts
- Employee Update: Name/department sync to users collection
- Shift Values: Auto-generated with category suffix (_primary/_secondary)
- Stats: Only active accounts counted in role distribution

## Recent Changes (March 2026)
- **CRITICAL FIX**: `require_admin` now allows general_manager (was system_admin only)
- **CRITICAL FIX**: `AdminProtectedRoute` now allows general_manager
- Employee deletion cascade + update sync
- All window.confirm() replaced with AlertDialog
- WebSocket permissions broadcast fixed
- Task stats date filtering
- Shift assignment: unique values + visual category tags
- Stats accuracy: role distribution only counts active accounts
- Map calibration: editable distance, AutoCAD-style crosshair, smoother zoom

## Pending Issues
- Issue 2 (P1): Daily Prayer Hall Session auto-start (needs user verification)

## Upcoming Tasks
- P0: Comparative Density Report
- P0: Gates Audit Log
- P1: Advanced task features
- P1: Full Attendance System
- P2: Push Notifications

## Credentials
- Admin: admin@crowd.sa / admin123

## Key Files
- `/app/backend/auth.py` -- require_admin, require_department_manager
- `/app/frontend/src/components/ProtectedRoute.jsx` -- AdminProtectedRoute
- `/app/backend/routes/employees.py` -- cascade delete, update sync
- `/app/backend/routes/tasks.py` -- stats with date filter
- `/app/backend/ws_manager.py` -- WebSocket broadcast
- `/app/frontend/src/components/EmployeeManagement.jsx` -- shift dropdown, stats
- `/app/frontend/src/pages/MapManagementPage.jsx` -- calibration system
