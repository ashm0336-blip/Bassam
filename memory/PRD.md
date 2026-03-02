# Crowd Services Platform - PRD

## Original Problem Statement
Build a comprehensive "Crowd Services Platform" for managing prayer areas, gates, and crowd operations at Al-Haram.

## Architecture
```
إدارة الأبواب (Sidebar - 4 items)
├── 📊 نظرة عامة                (Dashboard)
├── 📋 السجل اليومي للأبواب     (Daily Log with Archive - /daily-gates)
│   ├── 📁 Archive: Year → Month → Day navigation
│   ├── 🗺️ الخريطة (drag markers, pan/edit mode)
│   ├── 🚪 الأبواب (traffic-light quick status toggle)
│   ├── 👥 الموظفين (staff assignment)
│   └── 📝 التغييرات (changes tracking)
├── 📋 المعاملات                (Transactions)
└── ⚙️ إعدادات القسم            (6 tabs)
    ├── 🚪 الأبواب (CRUD) │ 👥 الموظفين │ 🗺️ الخرائط
    ├── ⏰ الورديات │ 🏖️ أنماط الراحة │ 📍 المواقع
```

## What's Implemented

### Smart Archive System - COMPLETED
- Year selector with arrow navigation
- 12-month grid with session counts, progress bars, status indicators
- Current month highlighted with blue accent
- Seamless drill-down: Year → Month grid → Month calendar → Session
- "All Months" back button for easy navigation
- Year summary with total tours count

### Daily Gate Log with 4 Tabs - COMPLETED
- Map, Gates (traffic-light status), Employees, Changes

### Department Settings with 6 Tabs - COMPLETED
- Gates data, Employees, Maps, Shifts, Rest Patterns, Locations

### Sidebar Cleanup - COMPLETED
- 4 items: نظرة عامة, السجل اليومي للأبواب, المعاملات, إعدادات القسم

## Credentials
- admin@crowd.sa / admin123

## Backlog
- P0: Automatic Area Calculation (BLOCKED)
- P1: Smart Alerts, Analytics Dashboard, General Manager Dashboard, Paths
- P2: Field Supervisor Mobile, Smart Routing, Live Haram Map
