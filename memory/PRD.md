# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi
- **Frontend**: React (Vite) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + group-based permissions
- **Real-time**: WebSocket with JWT authentication

## Permissions System (March 19, 2026) — Group + Individual
### Architecture:
- **permission_groups** collection: groups with page_permissions ({href: {visible, editable}})
- Users assigned `permission_group_id` on their user document
- **custom_permissions** per-user override group settings
- system_admin always has full access
- Resolution: system_admin > custom_permissions > group > department fallback

### Features:
- Admin creates/edits/deletes/duplicates permission groups
- 8 default groups auto-seeded (General Manager, 6 dept managers, Field Staff)
- Group selector in employee add/edit form
- Group selector in employee table
- Individual permissions dialog per employee (overrides group)
- Real-time WebSocket updates

## Auto-Seed System
- sidebar_menu (50), dropdown_options (30), zone_categories (15), permission_groups (8)
- Full sync on every startup

## Key Files:
- `/app/backend/routes/perm_groups.py` — Groups CRUD + resolution + my-permissions
- `/app/backend/seed_sidebar.py` — Auto-seed system
- `/app/backend/routes/settings.py` — Sidebar filtering
- `/app/backend/routes/employees.py` — Employee CRUD with group sync
- `/app/frontend/src/pages/admin/PermissionsManager.jsx` — Group management UI
- `/app/frontend/src/components/EmployeesList.jsx` — Employee list with group + custom perms

## Credentials
- Admin: admin@crowd.sa / admin123

## Completed (March 19, 2026):
- Permission groups system (backend + frontend)
- Group selector in employee forms + table
- Individual permissions override dialog
- Auto-seed for deployment consistency
- Child page visibility bug fix

## Pending:
- Comparative Density Report (P0)
- Gates Audit Log (P0)
- Daily Session auto-start fix (P1)
- Advanced Task Features (P1)
- Full Attendance System (P1)
- Push Notifications (P2)
- Recycle Bin (P2)
