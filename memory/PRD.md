# Crowd Services Platform - PRD

## Architecture - Unified Design
```
إدارة الأبواب                           إدارة المصليات
├── نظرة عامة                           ├── نظرة عامة
├── السجل اليومي للأبواب (Archive)       ├── السجل اليومي للخرائط (Archive)
│   ├── الخريطة │ الأبواب │ الموظفين     │   ├── الخريطة │ الكثافات │ الموظفين
│   └── التغييرات                        │   └── إحصائيات
├── المعاملات                            └── إعدادات القسم (4 tabs)
└── إعدادات القسم (5 tabs)                   ├── الموظفين │ الخرائط
    ├── الأبواب │ الموظفين │ الخرائط          ├── الورديات │ المواقع
    ├── الورديات │ المواقع                    └── (أنماط الراحة - تم حذفها ونقلها للموظف مباشرة)
    └── (أنماط الراحة - تم حذفها)
```

## Credentials
- admin@crowd.sa / admin123

## Completed Features
- Full Gates Management (17 gates, interactive maps, daily log with archiving)
- Full Prayer Areas Management (60 zones, heatmap, daily sessions)
- Interactive SVG Maps with pan/zoom/drag
- Smart Archiving System (Year → Month → Day)
- Employee Management with direct Rest Days multi-select (Feb 2026)
- Dashboards with KPIs for both modules
- Multi-level auth (system_admin, general_manager, department_manager, field_staff)
- Weekly Coverage indicator for employee availability

## Recent Changes (March 2026)
- **Removed** "أنماط الراحة" (Rest Patterns) tab from Department Settings
- **Added** direct rest days multi-select picker on employee add/edit forms
- **Added** rest_days array field in employee model (migrated from text weekly_rest)
- **Added** colored day badges in employee table
- **Added** Weekly Coverage Card showing daily employee availability
- **Added** automatic "في راحة" status based on today matching rest_days

## Backlog
- P0: Employee distribution testing with real data
- P0: Automatic Area Calculation (BLOCKED - needs scaled map)
- P1: Monthly Summary for Archive
- P1: Smart Alerts with escalation system  
- P1: General Manager unified dashboard
- P1: Shift Supervisor role + interface (NEW)
- P1: Field Staff mobile interface (NEW)
- P1: Link employees to user accounts
- P2: Field Supervisor Mobile Mode
- P2: Smart Routing, Live Haram Map
- P2: Attendance & check-in system

## Technical Stack
- Frontend: React.js + Tailwind CSS + Shadcn/UI
- Backend: FastAPI (Python)
- Database: MongoDB
- Auth: JWT Tokens
- Maps: Custom SVG with pan/zoom/drag
