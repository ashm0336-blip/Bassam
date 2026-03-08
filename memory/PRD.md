# Crowd Services Platform - PRD

## Original Problem Statement
Build a highly interactive and efficient "Crowd Services Platform" with two main modules: "Gates Management" and "Prayer Area Management."

## User Language
Arabic (العربية)

## Architecture
- **Backend:** FastAPI + MongoDB
- **Frontend:** React + Shadcn/UI + Tailwind CSS
- **Auth:** JWT-based (admin@crowd.sa / admin123)

## What's Been Implemented

### Authentication System (Updated Feb 2026)
- Primary login: National ID (10 digits) + PIN/Employee Number
- Secondary login: Email + Password (admin)
- Default PIN = Employee Number (forced change on first login)
- Account lockout after 5 failed attempts
- Manager-driven PIN reset flow
- Dynamic RBAC with permissions stored in DB
- Re-hire flow: deleted+re-added employees get reset accounts
- Login UX: Dynamic labels, helper text, secure error messages

### Role Awareness System (Feb 2026)
- **Header role badge** — color-coded per role (red=admin, gold=GM, blue=dept mgr, violet=supervisor, green=field, gray=monitoring)
- **Smart welcome toast** — "مرحباً أحمد — مشرف الوردية في إدارة البوابات"
- **Silent periodic refresh** — checks role/permissions every 5 minutes
- **Role change alert banner** — sticky amber banner with "فهمت" dismiss button
- **Unified ROLE_LABELS/DEPT_LABELS** — exported from AuthContext for consistent use
- Sidebar user info uses proper role labels

### Admin Panel (Restructured Feb 2026)
**6 tabs:**
1. نظرة عامة (Overview)
2. حسابي (My Account) — profile edit + password change + account info
3. الصلاحيات (Permissions) — RBAC
4. سجل النشاط (Activity Log)
5. إعدادات النظام (System Settings) — Login page + Header + Appearance/Language
6. القائمة (Sidebar)

**Sidebar:** Single "إدارة النظام" item (replaced separate Settings + Admin)
**Settings page removed** — redirects to /admin

### Backend APIs Added (Feb 2026)
- `PUT /api/auth/update-profile` — Update own name/email
- `POST /api/auth/change-password` — Change password (requires current)

### Core Features
- Gates Management, Prayer Area Management
- Interactive maps with pan/zoom, zone drawing/editing
- Density management with heatmap, employee assignment
- Smart archiving, monthly scheduling
- Dual Hijri/Gregorian Calendar
- Prayer sessions (6 per day)
- Responsive design + Dark mode ("Forest Night")
- Professional employee table with compact UI

## Credentials
- Admin: admin@crowd.sa / admin123
- Employees: National ID + Employee Number (first login)

## Upcoming Tasks
- P0: واجهة مبسطة للعاملين الميدانيين (Mobile-First)
- P0: مركز العمليات — لوحة تحكم رئيسية
- P0: عرض احترافي مضغوط للبوابات (200+ بوابة)
- P1: نقل الممنوعات لإعدادات إدارة البوابات
- P1: نظام تنبيهات ذكي
- P1: صفحة ملف شخصي لكل موظف
- P1: تصدير التقارير PDF/Excel
- P2: بحث شامل Ctrl+K
- P2: توحيد صفحات الجلسات اليومية
- P2: إعادة تصميم المواسم
