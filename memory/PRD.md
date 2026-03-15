# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi (rate limiting)
- **Frontend**: React (Vite) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + role-based permissions + department-based access
- **Real-time**: WebSocket with JWT authentication

## Permissions Architecture
- **Role-based**: Each role has default permissions
- **Department-based**: Each employee has `allowed_departments` list
- **38 total permissions** across 8 groups
- system_admin has all permissions automatically
- Real-time permissions sync via WebSocket "permissions" channel

## Data Integrity Rules
- **Employee Deletion**: Cascade delete to users, tasks, monthly_schedules, alerts
- **Employee Update**: Name/department sync to users collection
- **Delete Confirmations**: All destructive actions use AlertDialog
- **Task Stats**: Support work_date and month filters
- **Shift Values**: Auto-generated with category suffix (_primary/_secondary)
- **Stats Accuracy**: Only active accounts counted in role stats, pending shown as "غير مفعّل"

## Recent Changes (March 2026)
- Employee deletion cascade: user account + tasks + schedules + alerts cleaned up
- Employee update sync: name/department synced to users collection
- All window.confirm() replaced with AlertDialog components
- WebSocket permissions broadcast fixed for /api/admin/role-permissions
- Task stats date filtering: work_date and month parameters
- Shift assignment fix: unique values with category suffix + visual tags in dropdowns
- Stats accuracy fix: role distribution only counts active accounts, pending employees shown separately as "غير مفعّل", "حسابات نشطة" card replaces misleading "ميدانيون"

## Pending Issues
- Issue 2 (P1): Daily Prayer Hall Session auto-start (needs user verification)
- Issue 4 (P0): Permissions real-time sync (fixed, needs user verification)

## Upcoming Tasks
- P0: Comparative Density Report for Daily Sessions
- P0: Gates Audit Log (real-time)
- P1: Advanced task features (recurring tasks, templates, comments/attachments)
- P1: Full Attendance System (check-in/check-out)
- P2: Push Notifications
- Backlog: Soft delete / recycle bin

## Credentials
- Admin: admin@crowd.sa / admin123

## Key Files
- `/app/backend/routes/employees.py` -- cascade delete, update sync
- `/app/backend/routes/tasks.py` -- stats with date filter
- `/app/backend/ws_manager.py` -- WebSocket + broadcast middleware
- `/app/frontend/src/components/EmployeeManagement.jsx` -- shift dropdown, stats fix
- `/app/frontend/src/pages/DepartmentSettings.jsx` -- shift creation with unique values
- `/app/frontend/src/pages/DailySessionsPage.jsx` -- AlertDialog for delete confirmations
