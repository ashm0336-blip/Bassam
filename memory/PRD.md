# Crowd Services Platform - PRD

## Original Problem Statement
Build a comprehensive "Crowd Services Platform" for managing prayer areas, gates, and crowd operations at Al-Haram.

## Architecture
```
إدارة الأبواب (4 items)
├── نظرة عامة
├── السجل اليومي للأبواب (with Archive: Year→Month→Day)
│   ├── 🗺️ الخريطة │ 🚪 الأبواب │ 👥 الموظفين │ 📝 التغييرات
├── المعاملات
└── إعدادات القسم (6 tabs: أبواب, موظفين, خرائط, ورديات, راحة, مواقع)

إدارة المصليات
├── السجل اليومي للخرائط (with Archive: Year→Month→Day)
└── ...
```

## What's Implemented

### Smart Archive System - COMPLETED (Both Gates & Prayer Areas)
- Year selector with navigation arrows
- 12-month grid with counts, progress bars, status indicators
- Current month highlighted (blue for gates, emerald for prayer areas)
- Drill-down: Year → Month grid → Calendar → Session
- "All Months" back button
- Monthly stats + yearly totals

### Gates Daily Log - COMPLETED
- 4-tab layout: Map, Gates (traffic-light), Employees, Changes
- Draggable map markers with pan/edit mode
- Staff count badges + warning indicators on map

### Department Settings - COMPLETED
- 6 tabs for gates: Gates, Employees, Maps, Shifts, Rest, Locations

### Sidebar - COMPLETED
- Gates: نظرة عامة, السجل اليومي, المعاملات, إعدادات القسم

## Credentials
- admin@crowd.sa / admin123

## Backlog
- P0: Automatic Area Calculation (BLOCKED)
- P1: Smart Alerts, Analytics, General Manager Dashboard, Paths
- P2: Field Supervisor Mobile, Smart Routing, Live Haram Map
