# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi (rate limiting)
- **Frontend**: React (Vite) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + role-based permissions + department-based access
- **Real-time**: WebSocket with JWT authentication

## Permissions Architecture
- **Role-based**: Each role (general_manager, department_manager, shift_supervisor, field_staff, admin_staff) has default permissions
- **Department-based**: Each employee has `allowed_departments` list -- can access multiple departments
- **38 total permissions** across 8 groups (pages, employees, sessions, field, density, settings, schedules)
- system_admin has all permissions automatically
- Real-time permissions sync via WebSocket "permissions" channel

## Data Integrity Rules
- **Employee Deletion**: Cascade delete to users, tasks (single-assignee), monthly_schedules assignments, and alerts
- **Employee Update**: Name and department sync to users collection automatically
- **Delete Confirmations**: All destructive actions use AlertDialog (no window.confirm)
- **Task Stats**: Support work_date and month filters for accurate daily/monthly statistics
- **Shift Values**: Auto-generated with category suffix (_primary/_secondary) to ensure uniqueness

## Recent Changes (March 2026)
- Multi-department access via `allowed_departments`
- Security: WebSocket auth, CORS restriction, rate limiting, file size limits, NoSQL injection prevention
- Gates data tab redesigned: search, filters, cards/list views, import/export Excel
- Closed gates excluded from all operational statistics
- Real-time WebSocket updates (no polling)
- All window.confirm() replaced with AlertDialog components
- Plaza colors (PLAZA_COLORS) enforced as single source of truth
- Employee deletion cascade: user account + tasks + schedules + alerts all cleaned up
- Employee update sync: name/department synced to users collection
- WebSocket permissions broadcast fixed: /api/admin/role-permissions now triggers broadcast
- Task stats date filtering: work_date and month parameters added
- Daily sessions: handleCreateSession now sets activeDailySession for immediate prayer bar
- Shift assignment fix: shifts with same name but different categories (primary/secondary) are now fully distinguished with unique values and visual tags in dropdowns

## Pending Issues
- Issue 2 (P1): Daily Prayer Hall Session may auto-start for Fajr (needs user verification)
- Issue 4 (P0): Permissions real-time sync (fixed WebSocket broadcast, needs user verification)

## Upcoming Tasks
- P0: Comparative Density Report for Daily Sessions
- P0: Gates Audit Log (real-time)
- P1: Advanced task features (recurring tasks, templates, comments/attachments)
- P1: Full Attendance System (check-in/check-out)
- P2: Push Notifications
- Backlog: Soft delete / recycle bin for data recovery

## Credentials
- Admin: admin@crowd.sa / admin123
- Employee (Bassam): ID 1037299037
- Employee (Hussein): ID 1037299033, Job ID 123456

## Key Files
- `/app/backend/ws_manager.py` -- WebSocket + broadcast middleware
- `/app/backend/routes/permissions.py` -- ALL_PERMISSIONS, role defaults
- `/app/backend/routes/employees.py` -- cascade delete, update sync, allowed_departments
- `/app/backend/routes/settings.py` -- department settings, shifts, sidebar
- `/app/backend/routes/auth.py` -- login, rate limiting
- `/app/backend/routes/tasks.py` -- stats with date filter
- `/app/backend/routes/sessions.py` -- prayer sessions management
- `/app/frontend/src/context/AuthContext.jsx` -- canViewDepartment, permissions refresh via WebSocket
- `/app/frontend/src/context/WebSocketContext.jsx` -- WebSocket with JWT auth
- `/app/frontend/src/pages/DailySessionsPage.jsx` -- AlertDialog for delete confirmations
- `/app/frontend/src/pages/DepartmentSettings.jsx` -- shift creation with unique values
- `/app/frontend/src/components/EmployeeManagement.jsx` -- shift dropdown with category tags
- `/app/frontend/src/pages/TasksPage.jsx` -- stats with work_date filter
