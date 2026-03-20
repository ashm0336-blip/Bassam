# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram. The user language is Arabic.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi
- **Frontend**: React (CRA) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + group-based permissions

## Permission Safety System (March 2026) — Complete
### Key Features:
- Auto-clear custom permissions when changing permission group (prevents conflicts)
- Reset button for custom permissions in the dialog
- Backend returns `custom_cleared` flag when group changes
- Copy permissions includes group change warning
- Full audit trail in activity logs

### Architecture:
- permission_groups collection with page_permissions
- 8 default groups with `is_system: true`
- Users: permission_group_id + custom_permissions (auto-cleared on group change)
- Resolution: system_admin > custom > group > fallback

## Sidebar Structure
Each department: Daily Log > Daily Tasks > Monthly Schedule (standalone) > Settings

## Security: Monitoring Dashboard, DB Indexes (30+), WebSocket Auth, Rate Limiting, Error Boundary

## Credentials
- Admin: admin@crowd.sa / admin123

## Pending Tasks:
- Comparative Density Report (P0)
- Gates Audit Log (P0)
- Advanced Task Features (P1)
- Full Attendance System (P1)
- Push Notifications (P2)
- Recycle Bin (P2)
