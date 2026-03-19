# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi
- **Frontend**: React (Vite) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + group-based permissions
- **Real-time**: WebSocket with JWT authentication

## NEW Permissions System (March 19, 2026)
### Architecture: Permission Groups + Individual Overrides
- **permission_groups** collection: each group has name + page_permissions (href → {visible, editable})
- Users get assigned a `permission_group_id` 
- Users can optionally have `custom_permissions` that override group settings
- system_admin always has full access (hardcoded)
- Sidebar filtering uses resolved permissions from group + custom
- Real-time updates via WebSocket

### Default Groups (auto-seeded):
1. مدير عام (49 pages, all editable)
2. مدير إدارة التخطيط (10 pages)
3. مدير إدارة المصليات (12 pages)
4. مدير إدارة الأبواب (12 pages)
5. مدير إدارة الساحات (10 pages)
6. مدير خدمات الحشود (10 pages)
7. مدير صحن المطاف (10 pages)
8. موظف ميداني (3 pages)

### Permission Resolution Order:
1. system_admin → all access
2. custom_permissions (per user) → overrides group
3. permission_group → base permissions
4. No group → fallback to department-based visibility

## Auto-Seed System
- `seed_sidebar.py` runs on every server startup
- Seeds: sidebar_menu (50), dropdown_options (30), zone_categories (15), permission_groups (8)
- Full sync for sidebar_menu (drop + rebuild), idempotent for others

## Key Files
- `/app/backend/routes/perm_groups.py` — NEW: Permission Groups CRUD + resolution
- `/app/backend/seed_sidebar.py` — Auto-seed ALL system config
- `/app/backend/routes/settings.py` — sidebar-menu filtering (uses new groups)
- `/app/backend/routes/permissions.py` — LEGACY (empty, kept for import compat)
- `/app/frontend/src/pages/admin/PermissionsManager.jsx` — NEEDS UPDATE for groups

## Credentials
- Admin: admin@crowd.sa / admin123

## In Progress
- **Frontend for Permission Groups management** — needs new UI to replace old role-based permissions page

## Pending
- Daily Prayer Hall Session auto-starts (P1)
- Comparative Density Report (P0)
- Gates Audit Log (P0)
