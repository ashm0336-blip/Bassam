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

### Features Implemented:
- CRUD for permission groups (create/edit/delete/duplicate)
- 8 default groups auto-seeded (protected as system groups)
- Group selector in employee add/edit form
- Individual permissions dialog per employee
- Copy permissions from another employee
- User count per group displayed
- Permission change logging
- Real-time notification on permission change
- Backend checks use group permissions (not just role)

## Auto-Seed System
- sidebar_menu (50), dropdown_options (30), zone_categories (15), permission_groups (8)
- Full sync on every startup for deployment consistency

## Database Indexes (March 2026) — Complete
- users: id (unique), email, national_id, permission_group_id, department
- employees: id (unique), department, national_id, user_id
- tasks: id (unique), department, status, work_date, [department+work_date]
- alerts: id (unique), is_read, department, [is_read+department]
- map_sessions: id (unique), [date+floor_id], parent_session_id
- gate_sessions: id (unique), [date+floor_id]
- activity_logs: id, [timestamp desc]
- permission_groups: id (unique)
- sidebar_menu: id, href
- monthly_schedules: id (unique), [department+month]
- department_settings: [department+setting_type]

## Security Audit (March 2026) — Complete
### Fixed:
1. WebSocket authentication now mandatory (token required)
2. Rate limiting on change-pin (5/min), reset-pin (10/min), change-password (5/min)
3. Permission groups protected with is_system flag
4. canViewDepartment() properly checks permissions
5. ws_manager.broadcast() accepts both dict and string
6. Dead code removed from tasks.py
7. Error Boundary added to frontend
8. Copyright year made dynamic
9. Activity log cleaned from English role names

### Known Limitations (for future):
- CORS still open (`*`) — restrict before production
- JWT token in localStorage — consider HttpOnly cookies
- PIN allows 4 digits — consider stronger requirements
- No Pagination on list endpoints
- Reports endpoint returns hardcoded data

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
