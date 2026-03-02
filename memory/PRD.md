# Crowd Services Platform - PRD

## Original Problem Statement
Build a comprehensive "Crowd Services Platform" for managing prayer areas, gates, and crowd operations at Al-Haram.

## Architecture - Unified Design
```
إدارة الأبواب (4 items)                 إدارة المصليات (3 items)
├── نظرة عامة                           ├── نظرة عامة
├── السجل اليومي للأبواب (Archive)       ├── السجل اليومي للخرائط (Archive)
│   ├── الخريطة │ الأبواب │ الموظفين     │   ├── الخريطة │ الكثافة │ الإحصائيات
│   └── التغييرات                        │   └── التغييرات
├── المعاملات                            └── إعدادات القسم (5 tabs)
└── إعدادات القسم (6 tabs)                   ├── الموظفين │ الخرائط
    ├── الأبواب │ الموظفين │ الخرائط          ├── الورديات │ أنماط الراحة
    ├── الورديات │ أنماط الراحة              └── المواقع
    └── المواقع
```

## What's Implemented

### Smart Archive System - BOTH departments
- Year→Month grid→Calendar→Session navigation
- Gates: blue theme | Prayer Areas: emerald theme

### Gates Department - COMPLETE
- Daily log: 4 tabs (Map, Gates traffic-light, Employees, Changes)
- Settings: 6 tabs (Gates, Employees, Maps, Shifts, Rest, Locations)
- Draggable map markers + sync gates

### Prayer Areas Department - COMPLETE  
- Daily log: Archive sidebar + existing map/density/stats tabs
- Settings: 5 tabs (Employees, Maps, Shifts, Rest, Locations)
- Sidebar: 3 items (no transactions)

## Credentials
- admin@crowd.sa / admin123

## Backlog
- P0: Automatic Area Calculation (BLOCKED)
- P1: Smart Alerts, Analytics, General Manager Dashboard
- P2: Field Supervisor Mobile, Smart Routing, Live Haram Map
