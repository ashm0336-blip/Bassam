# Crowd Services Platform - PRD

## Architecture - Unified Design
```
إدارة الأبواب                           إدارة المصليات
├── نظرة عامة                           ├── نظرة عامة
├── السجل اليومي للأبواب (Archive)       ├── السجل اليومي للخرائط (Archive)
│   ├── الخريطة │ الأبواب │ الموظفين     │   ├── الخريطة │ الكثافات │ الموظفين
│   └── التغييرات                        │   └── إحصائيات
├── المعاملات                            └── إعدادات القسم (4 card-tabs)
└── إعدادات القسم (5 card-tabs)              ├── الموظفين │ الخرائط
    ├── الأبواب │ الموظفين │ الخرائط          └── الورديات │ المواقع
    └── الورديات │ المواقع

تخطيط خدمات الحشود / خدمات الحشود / المطاف
└── إعدادات القسم (3 card-tabs)
    ├── الموظفين
    └── الورديات │ المواقع
```

## Credentials
- admin@crowd.sa / admin123

## Completed Features
- Full Gates Management (17 gates, interactive maps, daily log with archiving)
- Full Prayer Areas Management (60 zones, heatmap, daily sessions)
- Interactive SVG Maps with pan/zoom/drag
- Smart Archiving System (Year → Month → Day)
- Employee Management with direct Rest Days multi-select (March 2026)
- Professional card-style Department Settings tabs with department themes (March 2026)
- Unified employee management inside Department Settings for ALL departments (March 2026)
- Dashboards with KPIs for both modules
- Multi-level auth (system_admin, general_manager, department_manager, field_staff)
- Weekly Coverage indicator for employee availability

## Recent Changes (March 2026)
- **Redesigned** Department Settings tabs from flat style to card-based with icons, counts, and department color themes
- **Moved** employees tab into Department Settings for Planning, Crowd Services, and Mataf departments
- **Removed** separate "الموظفين" sidebar links (now inside Settings for all departments)
- **Added** department-specific color themes: Gates=emerald, Plazas=blue, Planning=violet, Crowd=amber, Mataf=rose
- **Replaced** Rest Patterns system with direct rest days multi-select
- **Added** Weekly Coverage Card for employee availability

## Backlog
- P0: Employee distribution testing with real data
- P0: Automatic Area Calculation (BLOCKED - needs scaled map)
- P1: Monthly Summary for Archive
- P1: Smart Alerts with escalation system  
- P1: General Manager unified dashboard
- P1: Shift Supervisor role + interface
- P1: Field Staff mobile interface
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
