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
- Zone editing (drag points, rotate, move, smooth, copy)
- Density management with heatmap visualization
- Employee assignment with coverage map
- Undo/Redo system for map edits
- Categories as single source of truth for zone styling

### Authentication System
- **Primary login**: National ID (10 digits) + PIN
- **Secondary login**: Email + Password (mainly for admin)
- Default PIN = Employee Number (forced change on first login)
- Account lockout after 5 failed attempts
- Manager-driven PIN reset flow
- Dynamic RBAC with permissions stored in DB

### Login Page UX (Feb 2026)
- Field 1: "رقم الهوية الوطنية أو البريد الإلكتروني"
- Field 2: Dynamically changes to "رقم الموظف / PIN" when National ID detected
- Helper text: "أول دخول: استخدم رقمك الوظيفي — سيُطلب منك تغييره"
- Unified error messages that don't reveal which field is wrong (security)
- PIN change modal forced on first login

### Prayer Sessions Feature
- Each daily session can have 6 prayer sub-sessions
- Prayer sessions bar showing status
- Click prayer to load its session; all 3 tabs update automatically

### Dual Hijri/Gregorian Calendar
- Calendar header shows both Gregorian and Hijri months
- Toggle button to switch primary/secondary
- Ramadan days have golden indicator

### Responsive Design
- Full responsive for mobile, tablet, and desktop
- Bottom navigation bar for mobile
- Professional dark mode ("Forest Night" theme)

### Employee Management
- Professional compact table with icons, tooltips, actions menu
- National ID validation (10 digits, starts with 1 or 2)
- Many-to-many employee-to-zone assignment
- Employment types: permanent, seasonal, temporary

### RBAC System
- Dynamic permissions stored in role_permissions collection
- Admin-managed checklist UI in PermissionsManager page
- AuthContext provides user.permissions array

## Key API Endpoints
- `POST /api/auth/login`: Login with National ID or email
- `POST /api/auth/change-pin`: Set new PIN
- `GET/POST /api/permissions`: Manage RBAC checklist
- `POST /api/employees/check-national-id`: Real-time ID validation
- `POST /api/employees/{id}/account-status`: Set account status
- `POST /api/users/{id}/change-role`: Change user role

## Credentials
- Admin: admin@crowd.sa / admin123
- Employees: National ID + Employee Number (first login), then National ID + PIN

## Upcoming Tasks (Backlog)
- P0: واجهة مبسطة للعاملين الميدانيين (Mobile-First)
- P0: مركز العمليات — لوحة تحكم رئيسية
- P0: عرض احترافي مضغوط للبوابات (200+ بوابة)
- P1: نظام تنبيهات ذكي في الباك إند
- P1: صفحة ملف شخصي كامل لكل موظف
- P1: تصدير التقارير PDF/Excel
- P2: بحث شامل Ctrl+K
- P2: توحيد صفحات الجلسات اليومية في مكوّن واحد
