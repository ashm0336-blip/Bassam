# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for Al-Haram. Arabic UI.

## Permission System Security (March 2026) — Hardened

### Access Control Levels:
1. **system_admin**: Full access to everything including system settings
2. **general_manager**: Full access except system-level settings
3. **department_manager**: Manages own department employees + their permissions
4. **Others**: View only what their permission group allows

### Security Rules Enforced:
- `require_admin` = system_admin OR general_manager ONLY (was incorrectly allowing dept managers)
- Department managers can only modify permissions for employees in THEIR department
- Custom permissions auto-cleared on group change
- No "Access Denied" messages — unauthorized pages redirect to home silently
- Sidebar only shows pages the user has permission to see
- Direct URL access blocked by redirect (not error page)
- Backend APIs enforce department-level access checks

### Fixed Vulnerabilities:
- `require_admin` was allowing any user with 20+ editable pages (dept managers)
- `check_department_access` was returning true for any user with a group
- Protected routes showed "Access Denied" page instead of hiding

## Notification System — Complete
- Real-time WebSocket notifications, Toast + Sound + Browser Notification
- Smart filtering by role, 4 tabs (All/Tasks/Alerts/Broadcasts)
- Broadcasts system for department-wide or all-org messages

## Credentials
- Admin: admin@crowd.sa / admin123

## Pending Tasks:
- Comparative Density Report (P0)
- Gates Audit Log (P0)
- Task comments/replies (P1)
- Daily summary notification (P1)
- Push Notifications - mobile (P2)
