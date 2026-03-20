# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for Al-Haram. Arabic UI.

## Tech Stack
- **Backend**: FastAPI + MongoDB + WebSocket + slowapi
- **Frontend**: React (CRA) + Shadcn UI + WebSocket Client

## Real-time Notification System (March 2026) — Complete
### Features:
- WebSocket broadcasts notification payload (title, message, priority, target users)
- Toast popup with icon (task/alert/urgent) appears instantly
- Sound alert: gentle chime (normal) or double chime (urgent/high)
- Browser Notification API: shows OS-level notification when tab not focused
- Triggered on: task creation, task completion, admin alerts
- Target filtering: notifications sent to specific user IDs only

### Components:
- Backend: ws_manager.broadcast() with notification payload in tasks.py, admin.py
- Frontend: NotificationManager.jsx (listener component in Layout)
- Sound: Web Audio API beeps (no external files needed)

## Permission System — Complete
- Auto-clear custom permissions on group change
- Tree view with expandable departments + quick toggle
- Department access summary badges
- Individual permissions dialog with collapsible department sections

## Security — Complete
- WebSocket auth, Rate limiting, DB indexes (30+), Error Boundary
- Security monitoring dashboard in admin

## Credentials
- Admin: admin@crowd.sa / admin123

## Pending Tasks:
- Comparative Density Report (P0)
- Gates Audit Log (P0)
- Advanced Task Features (P1)
- Full Attendance System (P1)
- Push Notifications - real mobile (P2)
- Recycle Bin (P2)
