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

## Gate Data Model (Updated)
- `status`: "open" / "closed" (الحالة التشغيلية)
- `indicator`: "light" / "medium" / "crowded" (مؤشر الازدحام - للأبواب المفتوحة فقط)

## Completed Features
- Gates Management (17 gates, maps, daily log, archiving)
- **Separated Gate Status from Indicator** (March 2026) - status (open/closed) vs indicator (light/medium/crowded)
- Prayer Areas Management (60 zones, heatmap, daily sessions)
- Interactive SVG Maps with pan/zoom/drag
- Smart Archiving System (Year → Month → Day)
- Monthly Employee Schedules - rest days, locations, shifts change monthly
- Professional card-style Department Settings tabs with department themes
- Unified employee management inside Department Settings for ALL departments
- Dashboards with KPIs, Weekly Coverage indicator
- Multi-level auth (system_admin, general_manager, department_manager, field_staff)

## Backlog
- P0: Automatic Area Calculation (BLOCKED - needs scaled map)
- P1: Monthly Summary report for Archive
- P1: Smart Alerts with escalation system
- P1: General Manager unified dashboard
- P1: Shift Supervisor role + interface
- P1: Field Staff mobile interface
- P1: Link employees to user accounts
- P2: Smart Routing, Live Haram Map
- P2: Attendance & check-in system
