# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi
- **Frontend**: React (Vite) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + group-based permissions
- **Real-time**: WebSocket with JWT authentication

## Permissions System (March 19, 2026) — Group-Based
### Architecture:
- **permission_groups** collection: each group has name + `page_permissions` ({href: {visible, editable}})
- Users assigned a `permission_group_id` on their user document
- Optional `custom_permissions` per-user that override group settings
- system_admin always has full access (hardcoded)
- Sidebar filtering uses resolved permissions: system_admin > custom > group > fallback

### Default Groups (8, auto-seeded):
1. مدير عام (49 pages, all editable)
2-7. مدير لكل إدارة (10-12 pages each)
8. موظف ميداني (3 pages)

### Key Files:
- `/app/backend/routes/perm_groups.py` — Groups CRUD + permission resolution + my-permissions
- `/app/backend/seed_sidebar.py` — Auto-seed ALL system config (sidebar, dropdown, zones, groups)
- `/app/backend/routes/settings.py` — Sidebar filtering using group permissions
- `/app/backend/routes/employees.py` — Employee CRUD with permission_group_id sync
- `/app/frontend/src/pages/admin/PermissionsManager.jsx` — Group management UI
- `/app/frontend/src/components/EmployeesList.jsx` — Employee list with group selector

## Auto-Seed System
- Runs on every server startup
- Seeds: sidebar_menu (50), dropdown_options (30), zone_categories (15), permission_groups (8)
- Full sync for sidebar_menu (drop + rebuild preserving role_visibility)
- Ensures production matches preview 100% on deploy

## Completed (March 19, 2026):
- Full permission groups backend (CRUD + resolution)
- Permission groups management UI (admin page)
- Group selector in employee add/edit form
- Group selector in employee list table/cards
- Fixed child page visibility bug (3-level depth)
- Auto-seed for all system config data
- CORS fix for deployment

## Credentials
- Admin: admin@crowd.sa / admin123

## Pending:
- Individual permissions override UI (tab in employee profile) — low priority, backend ready
- Daily Prayer Hall Session auto-starts (P1)
- Comparative Density Report (P0)
- Gates Audit Log (P0)
- Advanced Task Features (P1)
- Full Attendance System (P1)
- Push Notifications (P2)
- Recycle Bin (P2)
