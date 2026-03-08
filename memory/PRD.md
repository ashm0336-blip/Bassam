# Crowd Services Platform - PRD

## Original Problem Statement
Build a highly interactive and efficient "Crowd Services Platform" with two main modules: "Gates Management" and "Prayer Area Management." Both modules feature interactive maps with pan/zoom, real-time statistical dashboards, smart archiving system, and dynamic monthly scheduling for employees.

## User Language
Arabic (العربية)

## Architecture
- **Backend:** FastAPI + MongoDB
- **Frontend:** React + Shadcn/UI + Tailwind CSS
- **Auth:** JWT-based (admin@crowd.sa / admin123)

## What's Been Implemented

### Core Features
- Gates Management (Daily Log + Department Settings)
- Prayer Area Management (Daily Log + Department Settings)
- Interactive maps with pan/zoom
- Real-time statistical dashboards
- Smart archiving system with circular session grid
- Monthly employee scheduling
- Zone drawing tools (polygon, shapes, freehand)
- Density management with heatmap visualization
- Employee assignment with coverage map
- Undo/Redo system for map edits
- Categories as single source of truth for zone styling

### Authentication System (Updated Feb 2026)
- **Primary login**: National ID (10 digits) + PIN/Employee Number
- **Secondary login**: Email + Password (admin)
- Default PIN = Employee Number (forced change on first login)
- Account lockout after 5 failed attempts
- Manager-driven PIN reset flow
- Dynamic RBAC with permissions stored in DB
- **Login page UX**: Dynamic labels — shows "رقم الموظف / PIN" for National ID, helper text for first-time login
- **Security**: Unified error messages that don't reveal which field is wrong
- **Re-hire flow**: When employee is deleted and re-added with same National ID, old account resets automatically (PIN, status, attempts)

### Admin Panel (Restructured Feb 2026)
**6 tabs (down from 9):**
1. **نظرة عامة** (Overview) — System stats dashboard
2. **حسابي** (My Account) — Profile edit + password change + account info
3. **الصلاحيات** (Permissions) — RBAC checklist manager
4. **سجل النشاط** (Activity Log) — Who did what and when
5. **إعدادات النظام** (System Settings) — Login page + Header + Appearance/Language
6. **القائمة** (Sidebar) — Sidebar menu management

**Removed tabs:** Users Management, Seasons, Prohibited Items, Maps
- Users tab removed (employees managed from department tables)
- Seasons removed (to be reimplemented differently)
- Prohibited Items moved to Gates department settings
- Maps removed (each department manages its own)

**Standalone Settings page removed** — redirects to /admin

### New Backend APIs (Feb 2026)
- `PUT /api/auth/update-profile` — Update own name/email
- `POST /api/auth/change-password` — Change password (requires current password)

### Prayer Sessions Feature
- Each daily session can have 6 prayer sub-sessions
- Prayer sessions bar showing status
- Click prayer to load its session

### Dual Hijri/Gregorian Calendar
- Calendar header shows both Gregorian and Hijri months
- Toggle button to switch primary/secondary

### Responsive Design
- Full responsive for mobile, tablet, and desktop
- Bottom navigation bar for mobile
- Professional dark mode ("Forest Night" theme)

### Employee Management
- Professional compact table with icons, tooltips, actions menu
- National ID validation (10 digits, starts with 1 or 2)
- Many-to-many employee-to-zone assignment
- Employment types: permanent, seasonal, temporary
- Auto-creates user account when employee has National ID
- Re-hire resets old terminated account automatically

### RBAC System
- Dynamic permissions stored in role_permissions collection
- Admin-managed checklist UI in PermissionsManager page
- AuthContext provides user.permissions array

## Key API Endpoints
- `POST /api/auth/login`: Login with National ID or email
- `POST /api/auth/change-pin`: Set new PIN (first login)
- `PUT /api/auth/update-profile`: Update own profile
- `POST /api/auth/change-password`: Change password
- `GET/POST /api/permissions`: Manage RBAC checklist
- `POST /api/employees/check-national-id`: Real-time ID validation
- `POST /api/employees/{id}/account-status`: Set account status

## Credentials
- Admin: admin@crowd.sa / admin123
- Employees: National ID + Employee Number (first login), then National ID + PIN

## Upcoming Tasks
- P0: واجهة مبسطة للعاملين الميدانيين (Mobile-First)
- P0: مركز العمليات — لوحة تحكم رئيسية
- P0: عرض احترافي مضغوط للبوابات (200+ بوابة)
- P1: نقل الممنوعات لإعدادات إدارة البوابات
- P1: نظام تنبيهات ذكي في الباك إند
- P1: صفحة ملف شخصي كامل لكل موظف
- P1: تصدير التقارير PDF/Excel
- P2: بحث شامل Ctrl+K
- P2: توحيد صفحات الجلسات اليومية في مكوّن واحد
- P2: إعادة تصميم المواسم بطريقة أفضل
