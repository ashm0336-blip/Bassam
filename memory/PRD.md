# Crowd Services Platform - PRD

## Architecture
```
إدارة الأبواب                           إدارة المصليات
├── نظرة عامة                           ├── نظرة عامة
├── السجل اليومي (Archive)              ├── السجل اليومي (Archive)
├── المعاملات                            └── إعدادات القسم
└── إعدادات القسم                            ├── الموظفين (+ جداول شهرية)
    ├── الأبواب │ الموظفين (+ جداول شهرية)    ├── الخرائط │ الورديات │ المواقع
    ├── الخرائط │ الورديات │ المواقع
```

## Credentials
- admin@crowd.sa / admin123

## Completed Features
- Gates Management (17 gates, maps, daily log, archiving)
- Separated Gate Status from Indicator
- Prayer Areas Management (60 zones, heatmap, daily sessions)
- Interactive SVG Maps with pan/zoom/drag
- Smart Archiving System (Year > Month > Day)
- Monthly Employee Schedules
- Professional card-style Department Settings tabs
- Unified employee management
- Dashboards with KPIs
- Multi-level auth
- Enhanced gate map tooltip
- **Enhanced Zone Format Panel**: 12 SVG patterns, pattern colors, stroke opacity, dash-dot border, live preview
- **Clean Map View**: Removed staff badges - staff info only in hover tooltip
- **Live Stats Panel (March 2026)**: Merged stats alongside map - real-time KPIs, donut chart, category bars, previous day comparison. Removed separate stats tab.
- **Density Tab Overhaul (March 2026)**: Split-screen with live heatmap + interactive control panel with mini-grid cards and popover editing
- **Unified Density Levels (March 2026)**: Consistent 4-level system (آمن, متوسط, مرتفع, حرج) across all UI
- **Professional Iconography (March 2026)**: Standardized KPI cards with larger icons, transparent backgrounds, and color-matched styling across the entire app
- **Circular Session Cards (March 2026)**: Redesigned session lists in both Gates and Prayer Areas Daily Logs from vertical cards to circular professional cards arranged 5 per row, with color-coded borders, hover tooltips, staggered entrance animations, and active state glow effects
- **Professional Daily Log Tabs (March 2026)**: Applied the same card-style tab design from Department Settings to Daily Log tabs - Gates (blue theme, 4 tabs) and Prayer Areas (emerald theme, 3 tabs) with icons in colored boxes, count badges, and accent underlines
- **New Prayer Area KPIs (March 2026)**: Replaced old stats (نشطة/مزالة/تغييرات/فئات) with 6 new professional KPIs: إجمالي المواقع, إجمالي الفئات, المساحة الإجمالية, متوسط المصلين, متوسط السعة, مناطق حرجة (dynamic color)
- **Employee Tab Overhaul (March 2026)**: Complete redesign to 60/40 split-screen with interactive coverage map (zones colored green/red/gray by staffing) and control panel with KPIs, shift filters, zone distribution list, and assign/unassign functionality
- **Zone Edit Bug Fix (March 2026)**: Fixed 422 error when saving zone edits by converting empty string numeric fields to null

## Planned Tasks (Awaiting User Direction)

### P0
- عرض احترافي لإدارة 200+ بوابة (Compact Table + Grouped by Plaza)
- الحساب التلقائي للمساحة (محظور)

### P1
- نظام أدوار متقدم (5 مستويات)
- خريطة الحرم الحية
- نظام التنبيهات الذكية مع التصعيد
- وضع الجولات للبوابات (Tour Mode)
- ميزة المسارات (Paths)

### P2
- واجهة الموظف الميداني للهاتف
- تدوير أيام الراحة التلقائي

### Refactoring
- دمج ArchiveSidebar.jsx و ArchiveSessionSidebar.jsx

## Key Files
- `/app/frontend/src/pages/DailySessions/components/MapStatsPanel.jsx` (Live stats panel)
- `/app/frontend/src/pages/DailySessions/components/MapToolbar.jsx`
- `/app/frontend/src/pages/DailySessions/components/ZonePatterns.jsx`
- `/app/frontend/src/pages/DailySessions/components/MapCanvas.jsx`
- `/app/frontend/src/pages/DailySessionsPage.jsx`
- `/app/backend/models.py`
- `/app/backend/routes/sessions.py`
