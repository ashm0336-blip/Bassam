# Crowd Management Application - PRD

## Original Problem Statement
Enterprise-grade crowd management application for Al-Haram & Al-Masjid Al-Nabawi. Arabic-first UI (RTL).
The system manages crowd statistics, employee scheduling, gate management, prayer area monitoring, and daily operations.

## Core Architecture
- **Backend**: FastAPI (Python) + MongoDB
- **Frontend**: React + Vite + Tailwind + ShadcnUI
- **Auth**: JWT-based with role hierarchy
- **Real-time**: WebSocket notifications

## Permission System Security (March 2026) — Hardened

### Access Control Levels:
1. **system_admin**: Full access to everything including system settings
2. **general_manager**: Full access except system-level settings
3. **department_manager**: Manages own department employees + their permissions
4. **Others**: View only what their permission group allows

### Security Rules Enforced:
- `require_admin` = system_admin OR general_manager ONLY
- Department managers can only modify permissions for employees in THEIR department
- Custom permissions auto-cleared on group change
- Sidebar only shows pages the user has permission to see
- Backend APIs enforce department-level access checks

## Notification System — Complete
- Real-time WebSocket notifications, Toast + Sound + Browser Notification
- Smart filtering by role, 4 tabs (All/Tasks/Alerts/Broadcasts)
- Broadcasts system for department-wide or all-org messages

## Daily Statistics System — Complete (March 2026)
- **Page**: `/daily-stats` — "الإحصائيات اليومية"
- **Backend**: Full CRUD + Excel Import/Export (`/app/backend/routes/daily_stats.py`)
- **Frontend**: `/app/frontend/src/pages/DailyStatsPage.jsx`
- **Features**:
  - 3 tabs: المسجد الحرام | المسجد النبوي | العرض الشامل
  - Daily entry cards per mosque with all fields
  - Date navigation with Hijri dates (moment-hijri)
  - Monthly filtering (year + month dropdowns)
  - Summary KPI cards (total worshippers, umrah, days recorded)
  - Combined data table with all columns
  - Excel import (with smart header mapping)
  - Excel export + template download
  - Edit/Delete with confirmation
  - Integrated with sidebar + permissions system
- **Data Schema**:
  - المسجد الحرام: المصلين, المعتمرين, حجر إسماعيل, العربات
  - المسجد النبوي: المصلين, الروضة رجال (منشور/محجوز/فعلي), الروضة نساء (منشور/محجوز/فعلي), ممر السلام
- **Tested**: 15/15 backend tests passed + 3 UI screenshots confirmed

## Credentials
- Admin: admin@crowd.sa / admin123

## Pending Tasks:
- P0: Comparative Density Report
- P0: Gates Audit Log
- P1: Daily Statistics Analytics Dashboard (لوحة التحليلات - المرحلة 2)
- P1: Task comments/replies
- P1: Daily summary notification
- P1: Full Attendance System
- P2: Push Notifications - mobile (Firebase)
- P2: Recycle Bin for deleted data

## Key Files
- `/app/backend/server.py` — Main FastAPI app
- `/app/backend/seed_sidebar.py` — Sidebar + permissions seeding
- `/app/backend/routes/daily_stats.py` — Daily statistics API
- `/app/frontend/src/pages/DailyStatsPage.jsx` — Daily stats page
- `/app/frontend/src/App.js` — Router
- `/app/frontend/src/components/Layout.jsx` — Sidebar layout
