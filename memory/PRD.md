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

## Gate Data Model
- `status`: "open" / "closed" (الحالة التشغيلية)
- `indicator`: "light" / "medium" / "crowded" (مؤشر الازدحام - للأبواب المفتوحة فقط)

## Zone Style Data Model (Updated March 2026)
- `fill_type`: "solid" / "pattern" (نوع التعبئة)
- `fill_color`: hex color (لون التعبئة - للون الصلب)
- `pattern_type`: 12 patterns (diagonal-right, diagonal-left, diagonal-cross, horizontal, vertical, grid, dots-small, dots-large, dense, light-fill, medium-fill, diamonds)
- `pattern_fg_color`: hex color (لون النقش الأمامي)
- `pattern_bg_color`: hex color (لون النقش الخلفي)
- `opacity`: 0-1 (شفافية التعبئة)
- `stroke_color`: hex color (لون الحدود)
- `stroke_width`: 0.1-3 (سمك الحدود)
- `stroke_opacity`: 0-1 (شفافية الحدود)
- `stroke_style`: "solid" / "dashed" / "dotted" / "dash-dot" (نوع الحدود)

## Completed Features
- Gates Management (17 gates, maps, daily log, archiving)
- Separated Gate Status from Indicator (March 2026)
- Prayer Areas Management (60 zones, heatmap, daily sessions)
- Interactive SVG Maps with pan/zoom/drag
- Smart Archiving System (Year > Month > Day)
- Monthly Employee Schedules - rest days, locations, shifts
- Professional card-style Department Settings tabs with department themes
- Unified employee management inside Department Settings
- Dashboards with KPIs, Weekly Coverage indicator
- Multi-level auth (system_admin, general_manager, department_manager, field_staff)
- Enhanced gate map tooltip (plaza, category, full Arabic translation)
- **Enhanced Zone Format Panel (March 2026)**: PowerPoint-style formatting with 12 SVG patterns, pattern colors, stroke opacity, dash-dot border type, live preview
- **Clean Map View (March 2026)**: Removed staff badges from zone centers - staff info only in hover tooltip

## Pending Verification
- Gate map tooltip update (المنطقة، الفئة، النوع، المسار، التصنيف، الحالة، المؤشر، الموظفين، الملاحظة)

## Planned Tasks (Awaiting User Direction)

### P0 - عالي الأولوية
- **عرض احترافي لإدارة 200+ بوابة**: عرض جدول مضغوط (Compact Table) + تجميع حسب الساحة (Grouped by Plaza) في السجل اليومي
- الحساب التلقائي للمساحة (محظور - يحتاج خريطة بمقياس معروف)

### P1 - متوسط الأولوية
- نظام أدوار متقدم (5 مستويات: مدير نظام، مدير عام، مدير قسم، مشرف وردية، موظف ميداني)
- خريطة الحرم الحية (عرض موحد ثلاثي الأبعاد أو heatmap)
- نظام التنبيهات الذكية مع التصعيد
- وضع الجولات للبوابات (Tour Mode - واجهة بطاقات للموظف الميداني)
- ميزة المسارات (Paths) لإدارة تدفق الحشود

### P2 - منخفض الأولوية
- واجهة الموظف الميداني للهاتف (Field Supervisor Mobile Mode)
- تدوير أيام الراحة التلقائي (Rotate Rests)

### Refactoring
- دمج ArchiveSidebar.jsx و ArchiveSessionSidebar.jsx في مكون واحد

## Key Files
- `/app/frontend/src/pages/DailySessions/components/MapToolbar.jsx` (Enhanced style panel)
- `/app/frontend/src/pages/DailySessions/components/ZonePatterns.jsx` (SVG pattern definitions - tileSize=1.2)
- `/app/frontend/src/pages/DailySessions/components/MapCanvas.jsx` (Pattern rendering, no staff badges)
- `/app/frontend/src/pages/DailySessions/constants.js` (PATTERN_TYPES)
- `/app/frontend/src/pages/PrayerAreas/EmployeeManagement.jsx`
- `/app/frontend/src/pages/DepartmentSettings.jsx`
- `/app/frontend/src/pages/DailyGateSessions/GatesTab.jsx`
- `/app/frontend/src/components/HaramInteractiveMap.jsx`
- `/app/backend/server.py`
- `/app/backend/models.py` (SessionZone + SessionZoneUpdate with pattern fields)
- `/app/backend/routes/sessions.py`

## Key DB Collections
- `gates_collection`: البوابات وخصائصها الثابتة
- `gate_sessions_collection`: البيانات التشغيلية اليومية (status + indicator منفصلين)
- `monthly_schedules`: الجداول الشهرية للموظفين (department, month, status, assignments)
- `employees`: بيانات الموظفين الثابتة فقط
- `map_sessions`: جلسات الخرائط اليومية مع بيانات المناطق والأنماط
