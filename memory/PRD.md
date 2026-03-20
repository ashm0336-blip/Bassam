# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram. The user language is Arabic.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi
- **Frontend**: React (Vite/CRA) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + group-based permissions
- **Real-time**: WebSocket with JWT authentication (required)

## Sidebar Structure (March 2026) — Updated
Each department now has this hierarchy:
- Department Name
  - Daily Log (for haram_map and gates only)
  - Daily Tasks
  - Monthly Schedule ← moved out of Settings to top level
  - Settings
    - Staff
    - Shifts
    - Maps
    - Categories/Gates Data (dept-specific)

## Permissions System (March 2026) — Complete
- permission_groups collection with page_permissions
- 8 default groups auto-seeded with `is_system: true`
- Users assigned permission_group_id + optional custom_permissions

## Security Monitoring Dashboard (March 2026) — Complete
- Integrated into Admin > Overview tab
- Real-time security KPIs + 4 sub-tabs (Frozen, Failed, Permissions, Pending)
- Quick unfreeze functionality

## Database Indexes (March 2026) — Complete
- 30+ indexes across all major collections

## Security Audit (March 2026) — Complete
- WebSocket auth mandatory, Rate limiting, is_system flag, Error Boundary, etc.

## Auto-Seed System
- sidebar_menu (50), dropdown_options (30), zone_categories (15), permission_groups (8)
- Full sync (drop + rebuild) on every startup

## Deployment Notes
- Sidebar menu uses `drop()` + rebuild pattern — fixes duplication on redeploy
- WebSocket may fail on some proxies — app works without it (no real-time updates)

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
