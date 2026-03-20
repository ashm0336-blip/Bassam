# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram. The user language is Arabic.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi
- **Frontend**: React (Vite/CRA) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + group-based permissions
- **Real-time**: WebSocket with JWT authentication (required)

## Permissions System (March 2026) — Complete
### Architecture:
- permission_groups collection with page_permissions
- Users assigned permission_group_id + optional custom_permissions
- system_admin always has full access
- Resolution: system_admin > custom > group > fallback
- Real-time WebSocket updates on any change
- 8 default groups auto-seeded with `is_system: true` (protected from deletion)

## Security Monitoring Dashboard (March 2026) — Complete
- Integrated into Admin > Overview tab
- Real-time security KPIs: failed logins, frozen/pending accounts, permission changes
- 4 sub-tabs: Frozen (with quick unfreeze), Failed Logins, Permission Changes, Pending Accounts
- Backend API: `/api/admin/security-stats` + `/api/admin/security/unfreeze/{user_id}`

## Database Indexes (March 2026) — Complete
- 30+ indexes across all major collections
- users, employees, tasks, alerts, sessions, permission_groups, sidebar_menu, schedules

## Security Audit (March 2026) — Complete
### Fixed:
1. WebSocket authentication now mandatory
2. Rate limiting on critical auth endpoints
3. Permission groups protected with is_system flag
4. canViewDepartment() properly checks permissions
5. ws_manager.broadcast() fixed for dict/string params
6. Dead code removed from tasks.py
7. Error Boundary added to frontend
8. Copyright year dynamic
9. Activity log cleaned from English role names

## Auto-Seed System
- sidebar_menu (50), dropdown_options (30), zone_categories (15), permission_groups (8)
- Full sync on every startup for deployment consistency

## Credentials
- Admin: admin@crowd.sa / admin123

## Pending Tasks:
- Comparative Density Report (P0)
- Gates Audit Log (P0)
- Daily Session auto-start fix (P1)
- Advanced Task Features (P1)
- Full Attendance System (P1)
- Push Notifications (P2)
- Recycle Bin (P2)
- CORS restriction for production (P2)
- Pagination for large datasets (P2)
- Real reports data (P2)
