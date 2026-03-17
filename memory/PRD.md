# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi (rate limiting)
- **Frontend**: React (Vite) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + role-based permissions + department-based access
- **Real-time**: WebSocket with JWT authentication

## Data Integrity Rules
- Employee Deletion: Cascade delete to users, tasks, monthly_schedules, alerts
- Employee Update: Name/department sync to users collection
- Delete Confirmations: All destructive actions use AlertDialog
- Shift Values: Auto-generated with category suffix (_primary/_secondary)
- Stats: Only active accounts counted in role distribution

## Recent Changes (March 2026)
- Employee deletion cascade + update sync
- All window.confirm() replaced with AlertDialog
- WebSocket permissions broadcast fixed
- Task stats date filtering (work_date/month)
- Shift assignment: unique values + visual category tags
- Stats accuracy: role distribution only counts active accounts
- Map calibration: editable distance, AutoCAD-style crosshair points, points preserved on re-open

## Pending Issues
- Issue 2 (P1): Daily Prayer Hall Session auto-start (needs user verification)

## Upcoming Tasks
- P0: Comparative Density Report
- P0: Gates Audit Log
- P1: Advanced task features
- P1: Full Attendance System
- P2: Push Notifications
- Backlog: Soft delete / recycle bin

## Credentials
- Admin: admin@crowd.sa / admin123

## Key Files
- `/app/backend/routes/employees.py` -- cascade delete, update sync
- `/app/backend/routes/tasks.py` -- stats with date filter
- `/app/backend/ws_manager.py` -- WebSocket broadcast
- `/app/frontend/src/components/EmployeeManagement.jsx` -- shift dropdown, stats
- `/app/frontend/src/pages/DepartmentSettings.jsx` -- shift creation
- `/app/frontend/src/pages/MapManagementPage.jsx` -- calibration system
- `/app/frontend/src/pages/DailySessionsPage.jsx` -- AlertDialog, prayer sessions
