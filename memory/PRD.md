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
  - **Tab-level permissions**: Each tab has independent visibility & edit control via permissions manager (same pattern as Settings page)
  - Daily entry cards per mosque with all fields
  - Date navigation with Hijri dates (moment-hijri)
  - Monthly filtering (year + month dropdowns)
  - Summary KPI cards (total worshippers, umrah, days recorded)
  - Combined data table with all columns
  - Excel import (with smart header mapping)
  - Excel export + template download
  - Edit/Delete with confirmation
  - Integrated with sidebar + permissions system
- **Permission Keys**:
  - `page_stats_haram` / `edit_stats_haram` — المسجد الحرام tab
  - `page_stats_nabawi` / `edit_stats_nabawi` — المسجد النبوي tab
  - `page_stats_all` / `edit_daily_stats` / `import_daily_stats` — العرض الشامل tab
- **Data Schema**:
  - المسجد الحرام: المصلين, المعتمرين, حجر إسماعيل, العربات
  - المسجد النبوي: المصلين, الروضة رجال (منشور/محجوز/فعلي), الروضة نساء (منشور/محجوز/فعلي), ممر السلام
- **Tested**: iteration_8 (15/15 backend) + iteration_9 (5/5 frontend permissions)

## Statistics Analytics Dashboard — Complete (March 2026)
- **Page**: `/stats-analytics` — "تحليلات الإحصائيات"
- **Frontend**: `/app/frontend/src/pages/StatsAnalyticsPage.jsx`
- KPI cards, Line/Bar/Pie/Heatmap charts using recharts
- USER VERIFICATION PENDING

## Credentials
- Admin: admin@crowd.sa / admin123

## Pending Issues:
- P1: Daily Prayer Hall Session auto-starts (recurring, user verification pending)
- P1: Deployment data consistency verification (user needs to re-deploy)

## Upcoming Tasks:
- P0: Iterate on Statistics Analytics page based on user feedback
- P1: Comparative Density Report
- P1: Gates Audit Log

## Future Tasks:
- P1: Advanced Features for Tasks Module (Recurring Tasks, Templates, Comments)
- P1: Full Attendance System (Check-in/out)
- P2: Native Mobile Push Notifications (Firebase)
- P2: "Recycle Bin" for deleted data

## Key Files
- `/app/backend/server.py` — Main FastAPI app
- `/app/backend/seed_sidebar.py` — Sidebar + permissions seeding (auto-patches existing groups)
- `/app/backend/routes/daily_stats.py` — Daily statistics API
- `/app/backend/routes/perm_groups.py` — Permission groups + MENU_TO_PERM_MAP
- `/app/frontend/src/pages/DailyStatsPage.jsx` — Daily stats page with tab-level permissions
- `/app/frontend/src/pages/StatsAnalyticsPage.jsx` — Analytics dashboard
- `/app/frontend/src/pages/admin/PermissionsManager.jsx` — Admin permissions manager
- `/app/frontend/src/components/Layout.jsx` — Sidebar layout (filters sidebar_hidden items)
- `/app/frontend/src/App.js` — Router
