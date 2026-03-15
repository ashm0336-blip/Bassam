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
- **Department-based**: Each employee has `allowed_departments` list — can access multiple departments
- **38 total permissions** across 8 groups (pages, employees, sessions, field, density, settings, schedules)
- system_admin has all permissions automatically

## Recent Changes (March 2026)
- Multi-department access: employees can now access multiple departments via `allowed_departments`
- Security: WebSocket auth, CORS restriction, rate limiting, file size limits, NoSQL injection prevention
- Gates data tab redesigned: search, filters, cards/list views, import/export Excel
- Closed gates excluded from all operational statistics
- Real-time WebSocket updates (no polling)
- All window.confirm() replaced with Dialog components
- Plaza colors (PLAZA_COLORS) enforced as single source of truth everywhere

## Upcoming Tasks
- P0: Complete permissions matrix (38 permissions) with proper UI
- P0: Link sidebar visibility to permissions automatically
- P0: Daily prayer sessions page fixes
- P1: Comparative Density Report
- P1: Gates Audit Log
- P2: Advanced task features, attendance system, push notifications

## Credentials
- Admin: admin@crowd.sa / admin123
- Employee (Bassam): ID 1037299037 / PIN 100100

## Key Files
- `/app/backend/ws_manager.py` — WebSocket + broadcast middleware
- `/app/backend/routes/permissions.py` — ALL_PERMISSIONS, role defaults
- `/app/backend/routes/employees.py` — allowed_departments support
- `/app/backend/routes/settings.py` — sidebar filtering by allowed_departments
- `/app/backend/routes/auth.py` — login, rate limiting
- `/app/backend/routes/gate_io.py` — gates import/export
- `/app/frontend/src/context/AuthContext.jsx` — canViewDepartment with allowed_departments
- `/app/frontend/src/context/WebSocketContext.jsx` — WebSocket with JWT auth
- `/app/frontend/src/components/EmployeesList.jsx` — allowed_departments checkboxes
- `/app/frontend/src/components/GatesDataManagement.jsx` — redesigned with toolbar
- `/app/frontend/src/pages/GateMapPage.jsx` — unified toolbar
- `/app/frontend/src/constants/gateData.js` — PLAZA_COLORS (DO NOT CHANGE)
