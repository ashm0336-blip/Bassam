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
