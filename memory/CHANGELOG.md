# CHANGELOG

## Feb 8, 2026

### Permission Levels System
- Changed permissions from binary (on/off) to 3-level (none/read/write)
- Backend: permissions stored as dict `{"perm": "read"|"write"}` instead of array
- Frontend: PermissionsManager shows 3 radio-style buttons per permission
- AuthContext: `hasPermission(perm, level)`, `canRead()`, `canWrite()`
- Backward compatible: old array format auto-migrates to dict
- Added `view_daily_sessions` permission for daily session access control
- Daily sessions routes use PermissionProtectedRoute instead of AdminProtectedRoute

### Admin Panel Restructure
- Reduced from 9 tabs to 6: Overview, My Account, Permissions, Activity, Settings, Sidebar
- Removed: Users Management, Seasons, Prohibited Items, Maps tabs
- Merged Settings page into Admin panel (standalone /settings redirects to /admin)
- Sidebar: single "إدارة النظام" item replaces "الإعدادات" + "لوحة الأدمن"

### My Account Tab
- New tab with profile edit (name, email) + password change + account info
- Backend: `PUT /api/auth/update-profile`, `POST /api/auth/change-password`
- Password change requires current password for security

### Role Awareness System
- Color-coded role badge in header (red=admin, gold=GM, blue=dept mgr, etc.)
- Smart welcome toast on login ("مرحباً أحمد — مشرف الوردية في إدارة البوابات")
- Silent periodic refresh (every 5 min) for role/permission changes
- Sticky role change alert banner with "فهمت" dismiss button
- Unified ROLE_LABELS/DEPT_LABELS exported from AuthContext

### Mobile Header Optimization
- Mobile header: only page name + short greeting + hamburger menu
- Mobile sidebar: date at top, navigation, user info with role badge at bottom
- Action buttons (notifications, theme, logout) moved to sidebar bottom on mobile
- Desktop: full header unchanged

### Login Improvements
- Dynamic password field label ("رقم الموظف / PIN" for National ID)
- Helper text for first-time login
- Secure error messages (don't reveal which field is wrong)

### Employee Re-hire Fix
- When deleted employee is re-added with same National ID, old account resets automatically
- PIN reset to new employee number, status to "pending", failed_attempts to 0

### Dark Mode Header Fix
- Removed inline `style={{ color: headerSettings.text_color }}` from header elements
- Header now inherits color from parent element which respects dark mode
