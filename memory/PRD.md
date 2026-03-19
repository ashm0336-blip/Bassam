# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi
- **Frontend**: React (Vite) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + role-based + department-based
- **Real-time**: WebSocket with JWT authentication

## Permissions System (NEW - March 2026)
- Based on `role_visibility` stored on each sidebar menu item
- Each item has `{role: {visible: true/false, editable: true/false}}`
- `visible: false` = page hidden from sidebar + inaccessible
- `editable: false` = view only (no add/edit/delete buttons)
- `editable: true` = full access (all buttons visible)
- Changes reflect instantly via WebSocket (no refresh needed)
- Admin manages from: إدارة النظام → الصلاحيات والتحكم
- Backend maps role_visibility to permission keys via MENU_TO_PERM_MAP
- Frontend canWrite/canRead work unchanged (data source changed)

## Site Structure (50 items, 3 levels)
- 10 root pages (Dashboard, 6 departments, Field, Notifications, Admin)
- Each department: Daily Tasks + Settings (+ Daily Log for some)
- Settings sub-tabs: Staff, Monthly Schedule, Shifts, Maps (+ Gates Data / Categories)

## Key Architecture
- `require_admin` allows system_admin AND general_manager
- Sidebar filtering: role_visibility + department access (allowed_departments)
- Employee deletion cascades to: users, tasks, schedules, alerts
- Employee update syncs name/department to users collection

## Credentials
- Admin: admin@crowd.sa / admin123

## Key Files
- `/app/backend/routes/permissions.py` — MENU_TO_PERM_MAP, my-permissions endpoint
- `/app/backend/routes/settings.py` — sidebar-menu filtering by role_visibility
- `/app/backend/ws_manager.py` — WebSocket broadcast (permissions channel)
- `/app/backend/auth.py` — require_admin (system_admin + general_manager)
- `/app/backend/models.py` — SidebarMenuItemUpdate with role_visibility, is_editable
- `/app/frontend/src/pages/admin/PermissionsManager.jsx` — unified permissions + sidebar management
- `/app/frontend/src/context/AuthContext.jsx` — canWrite/canRead, WebSocket refresh
- `/app/frontend/src/context/SidebarContext.jsx` — WebSocket refresh on permissions change
- `/app/frontend/src/components/Layout.jsx` — sidebar rendering, department click behavior
