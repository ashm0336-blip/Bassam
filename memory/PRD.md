# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employees, schedules, and daily inspection tours at Al-Haram. The user language is Arabic.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi
- **Frontend**: React (CRA) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + group-based permissions
- **Real-time**: WebSocket with JWT authentication

## Sidebar Structure (March 2026) — Updated
Each department:
- Department Name
  - Daily Log (haram_map/gates only)
  - Daily Tasks → `/dept?tab=transactions`
  - Monthly Schedule → `/dept?tab=schedule` (standalone page)
  - Settings → `/dept?tab=settings`
    - Staff, Shifts, Maps, Categories/GatesData

## Permissions System — Complete
- 8 default groups with `is_system: true`
- Group-based + custom per-user overrides

## Security Monitoring Dashboard — Complete
- Admin > Overview: security KPIs + 4 sub-tabs

## Security Audit — Complete
- WebSocket auth, Rate limiting, DB indexes (30+), Error Boundary

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
