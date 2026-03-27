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

## Permissions System

- Group-based RBAC with `page_permissions: {href: {visible, editable}}`
- Resolution priority: system_admin > custom_permissions (full replace) > group > default hidden
- **Custom overrides**: When a user has `custom_permissions` for an href, it REPLACES group permissions entirely (no merge)
- **Primary check (page_permissions direct)**: `canViewPage(href)` / `canEditPage(href)` reads `page_permissions` directly
- **Legacy fallback**: `canRead(key)` / `canWrite(key)` checks legacy permission keys via `HREF_TO_PERM_MAP` translation
- All route guards use `href` prop on `PermissionProtectedRoute` for direct page_permissions check
- All page/tab visibility uses `canViewPage(href)` as primary, legacy as fallback
- All action permissions use `canEditPage(href)` as primary, or `editable` prop from parent
- Settings sub-tabs use `canViewSubTab('Staff')` / `canEditSubTab('Shifts')` etc.
- `GatesDataManagement`, `EmployeesList`, `MapManagementPage`, `GateMapPage` accept `editable` prop from parent `DepartmentSettings`
- `/notifications` and `/alerts` have separate permissions (`page_notifications` / `page_alerts`)
- Force-logout on account freeze/terminate via WebSocket broadcast
- General manager (`general_manager` role) access is controlled by admin via permission groups — no automatic full access
- Backend role checks: system_admin has unconditional access; GM/dept_manager/others fall through to page_permission checks

### Rank Hierarchy (Role Protection)

- Each permission group has a `rank` field (1-4): 1=field staff, 2=shift supervisor, 3=dept manager, 4=general manager
- `system_admin` is always rank 5 (bypasses all checks)
- Effective rank = max(role_rank, group_rank)
- A user CANNOT edit/delete/freeze/terminate/reset-pin anyone at same rank or higher
- `_check_rank_protection()` is enforced on ALL 6 employee management endpoints
- Rank protection applies even to employees without activated accounts (checks `permission_group_id` on employee record)
- **Rank-based group visibility**: `list_groups` API filters by `rank < caller_rank` — users only see groups below their rank level
- **Schedule permissions decoupled**: `EmployeeManagement` takes separate `editable` (staff) and `editableSchedule` (schedule) props — schedule operations work independently from staff editing
- **Custom permissions warning**: Members list shows amber warning when users have custom_permissions overriding group, with reset button + confirmation dialog
- **Force-logout on credential changes**: Editing national_id or employee_number on activated employee forces logout + resets password; delete_employee also force-logouts before deletion

### Permission Group ↔ Account Lifecycle

- **Adding employee**: No permission group in the add dialog — group is assigned afterwards from the employee table
- **Assigning group (no account)**: Auto-creates user account + activates it + shows login credentials. Requires national_id.
- **Assigning group (frozen account)**: Auto-unfreezes account + force-logout to reload permissions
- **Removing group (active account)**: Auto-freezes account + force-logout
- **"Activate account" button**: Rejects if employee has no permission group ("يجب تسكين الموظف في مجموعة صلاحيات أولاً")
- Both `assign_user_group` (perm_groups.py) and `update_employee` (employees.py) enforce these rules

### Planned Features (Not Yet Implemented)

- **Employee transfer (نقل موظف)**: Formal transfer flow for moving employees between departments — GM/system_admin only. Should: change department, clear permission group + custom permissions, remove from old dept schedules/tasks, force-logout to reload permissions. Currently department field can be edited manually but with no cleanup logic.

### Department Scope Enforcement

- `_check_dept_scope()` is enforced on ALL employee endpoints (create, update, delete, activate, freeze, terminate, reset-pin)
- Users with permission groups: allowed departments derived from `page_permissions` hrefs via `DEPT_HREF_MAP` (requires `editable`)
- Department managers without groups: restricted to their own department only
- system_admin bypasses department scope checks

### Href Pattern Matching (check_page_permission)

- `_href_matches()`: Exact match for paths, or proper prefix (path + "?" or path + "/")
- Query-param patterns (e.g. `sub=Staff`, `tab=settings`) match as query string parameters only
- Prevents partial string matching vulnerability (e.g. `/daily-stats` won't match `/daily-stats-admin`)

## Key Files

- `start.sh` - Main startup script (dev) — starts MongoDB, backend, then frontend
- `backend/server.py` - FastAPI app entry point (WebSocket + rate limiting support)
- `backend/database.py` - MongoDB connection
- `backend/ws_manager.py` - WebSocket manager for real-time features
- `backend/seed_sidebar.py` - Sidebar menu and permission group seeding (runs on startup)
- `backend/routes/perm_groups.py` - Permission groups CRUD + resolution logic
- `frontend/craco.config.js` - Build config with dev server proxy and allowedHosts
- `frontend/.env` - Frontend environment variables
- `frontend/src/pages/EmployeeProfilePage.jsx` - Profile page with tabs (personal info, work info, activity log, available pages)

## Post-Login Routing

- ALL users → EmployeeProfilePage `/` (tabbed profile: المعلومات الشخصية, معلومات العمل, سجل الأحداث, الصفحات المتاحة)
- `/my-profile` also routes to EmployeeProfilePage (self mode) — accessible from sidebar user avatar
- `/employee/:id` shows another employee's profile (requires `page_employees` permission, no "الصفحات المتاحة" tab)
- Dashboard (غرفة العمليات) at `/dashboard` — requires `page_dashboard` permission, nested under الإدارة العامة in sidebar
- Department name: `plazas` is the only valid name for إدارة الساحات (no `squares` alias)

## Departments

7 departments total (key → Arabic name):
- `general_admin` → الإدارة العامة (order 0, contains Operations Room + Settings with Staff/Permissions)
- `planning` → تخطيط خدمات الحشود
- `haram_map` → إدارة المصليات
- `gates` → إدارة الأبواب
- `plazas` → إدارة الساحات
- `crowd_services` → خدمات حشود الحرم
- `mataf` → صحن المطاف

DEPARTMENTS constants are defined in multiple files and must be kept in sync:
- `AuthContext.jsx` (DEPT_LABELS, DEPT_PATH_MAP)
- `DepartmentSettings.jsx` (DEPT_THEMES, DEPT_NAMES, DEPT_PATHS)
- `EmployeeManagement.jsx`, `UserManagement.jsx`, `SidebarManager.jsx`, `PermissionsManager.jsx`, `NotificationsPage.jsx`, `AlertsPage.jsx`

## Permissions System

- **Architecture**: Group-based permissions. Permission groups define `page_permissions: {href: {visible, editable}}`.
- **Resolution order**: system_admin (full access) → custom_permissions → group permissions → default (hidden)
- **Frontend enforcement**: `canViewPage(href)` filters sidebar, `canEditPage(href)` gates edit controls, `PermissionProtectedRoute` wraps routes
- **Backend enforcement**: `require_page_permission(user, href_pattern, require_edit)` checks group+custom permissions on write endpoints
- **Protected routes**: ALL routes in App.js are wrapped with `PermissionProtectedRoute` or `DepartmentProtectedRoute` (no unprotected pages)
- **Department access**: `canViewDepartment` checks if user has any visible page with that department's path prefix
- **Department-scoped groups**: Permission groups can have a `department` field. Department managers can only CRUD groups scoped to their department. `DepartmentSettings` has a "الصلاحيات" (Permissions) tab per department that shows `PermissionsManager` filtered to that department's pages and groups only.
- **Write protection**: daily_stats (POST/PUT/DELETE/import/fix-dates), alerts (PUT), broadcasts (POST) all enforce edit permissions server-side
- **View-only pages**: `/dashboard`, `?tab=overview`, `/stats-analytics` — no edit button shown in permissions tree

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
