# Crowd Services Platform - PRD

## Original Problem Statement
Build a comprehensive "Crowd Services Platform" for managing prayer areas, gates, and crowd operations at Al-Haram.

## Architecture
```
إدارة الأبواب (Sidebar)
├── 📊 متابعة إدارة الأبواب  (Dashboard)
├── 🎯 مركز العمليات          (Daily Operations - /daily-gates)
│   ├── 🗺️ الخريطة (drag markers, pan/edit mode)
│   ├── 🚪 الأبواب (traffic-light quick status toggle)
│   ├── 👥 الموظفين (staff assignment to gates)
│   └── 📝 التغييرات (changes tracking)
├── 📋 المعاملات              (Transactions)
└── ⚙️ إعدادات القسم          (6 tabs - /gates?tab=settings)
    ├── 🚪 الأبواب (CRUD gates data)
    ├── 👥 الموظفين (CRUD employees)
    ├── 🗺️ الخرائط (map management, drag markers)
    ├── ⏰ الورديات (shifts config)
    ├── 🏖️ أنماط الراحة (rest patterns)
    └── 📍 المواقع (coverage locations)
```

## What's Implemented

### Gates Operations Center (`/daily-gates`) - COMPLETED
- 4-tab layout: Map, Gates, Employees, Changes
- Map: Interactive with draggable markers, pan/edit mode, staff count badges, warning indicators
- Gates: Traffic-light status buttons, search, filter, notes
- Employees: Assignment to gates, shift filtering, unassigned alerts
- Changes: Daily change tracking

### Department Settings (`/gates?tab=settings`) - COMPLETED
- 6 tabs for gates department (3 new + 3 existing)
- Gates data management (moved from sidebar)
- Employee management (moved from sidebar)
- Map management with drag & sync (moved from sidebar)
- Shifts, Rest Patterns, Coverage Locations (existing)

### Sidebar Cleanup - COMPLETED
- Removed: قائمة الأبواب, الموظفين, إدارة خرائط الأبواب
- Renamed: السجل اليومي → مركز العمليات
- Result: 4 clean items in sidebar

### Backend APIs
- `POST /api/admin/gate-map/sync-gates`
- `PUT /api/admin/gate-sessions/{id}/gates/{gate_id}`
- All CRUD for gates, sessions, floors, markers, employees

## Credentials
- **System Admin**: admin@crowd.sa / admin123

## Prioritized Backlog

### P0
- [ ] Automatic Area Calculation (BLOCKED - needs map with known scale)

### P1
- [ ] Smart Alert System
- [ ] Analytics Dashboard
- [ ] General Manager Dashboard
- [ ] Paths Feature (المسارات)

### P2
- [ ] Field Supervisor Mobile Mode
- [ ] Smart Routing System
- [ ] Live Haram Map
- [ ] AI Recommendations

## Testing
- Last test: iteration_32.json - 100% pass rate
