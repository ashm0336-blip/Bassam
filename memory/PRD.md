# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for Al-Haram. Arabic UI.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi
- **Frontend**: React (CRA) + Shadcn UI + WebSocket Client
- **Auth**: JWT + bcrypt + group-based permissions

## Permission System Enhancements (March 2026) — Complete
### Safety:
- Auto-clear custom_permissions on group change (prevents conflicts)
- Reset button for custom permissions
- Copy permissions includes group change warning
- Full audit trail in activity logs

### UX Improvements:
- Tree auto-expanded showing all sub-pages per department
- Department access summary badges (colored chips: ✎ editable, ◉ visible, strikethrough hidden)
- Quick "toggle entire department" button per department row (كامل ✓ / جزئي / مخفي)
- Sub-page count per department (e.g., "6/7 صفحة ظاهرة")

## Sidebar: Monthly Schedule standalone at `/dept?tab=schedule`
## Security: Monitoring Dashboard, DB Indexes (30+), WebSocket Auth, Rate Limiting, Error Boundary
## Auto-Seed: sidebar_menu (50), dropdown_options (30), zone_categories (15), permission_groups (8)

## Credentials
- Admin: admin@crowd.sa / admin123

## Pending Tasks:
- Comparative Density Report (P0)
- Gates Audit Log (P0)
- Custom permissions dialog tree improvement (same as permissions manager)
- Advanced Task Features (P1)
- Full Attendance System (P1)
- Push Notifications (P2)
- Recycle Bin (P2)
