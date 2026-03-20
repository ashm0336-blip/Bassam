# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi
- **Frontend**: React (Vite) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + group-based permissions
- **Real-time**: WebSocket with JWT authentication

## Permissions System (March 2026) — Complete
### Architecture:
- permission_groups collection with page_permissions
- Users assigned permission_group_id + optional custom_permissions
- system_admin always has full access
- Resolution: system_admin > custom > group > fallback
- Real-time WebSocket updates on any change

### Features Implemented:
- CRUD for permission groups (create/edit/delete/duplicate)
- 8 default groups auto-seeded
- Group selector in employee add/edit form
- Group selector in employee table (inline change)
- Individual permissions dialog per employee
- Copy permissions from another employee
- User count per group displayed
- Permission change logging (detailed activity log)
- Real-time notification on permission change
- Header/sidebar show group name instead of old role
- Login greeting shows group name
- Backend checks use group permissions (not just role)
- Security: field staff cannot manage employees

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
