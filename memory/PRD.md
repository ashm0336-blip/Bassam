# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for Al-Haram. Arabic UI.

## Real-time Notification System — Complete
### Features:
- WebSocket instant notifications (toast + sound + browser notification)
- Smart filtering by role: admin sees all, manager sees department, employee sees own tasks
- 4 tabs: All | My Tasks | Alerts | Broadcasts
- Broadcasts system: send messages to a department or all departments
- Mark as read with timestamp
- Priority badges: urgent (red), high (orange), normal (gray)

### API Endpoints:
- GET /api/alerts?category=tasks|alerts|broadcasts — filtered by user role
- POST /api/broadcasts — create broadcast (admin/managers)
- PUT /api/alerts/{id} — mark read
- GET /api/alerts/unread-count — smart count per user

## Permission System — Complete
## Security — Complete  
## Sidebar: Monthly Schedule standalone

## Credentials
- Admin: admin@crowd.sa / admin123

## Pending Tasks:
- Comparative Density Report (P0)
- Gates Audit Log (P0)
- Task comments/replies (P1)
- Daily summary notification (P1)
- Advanced Task Features (P1)
- Push Notifications - mobile (P2)
