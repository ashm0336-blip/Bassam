# Crowd Services Platform - PRD

## Original Problem Statement
Build a comprehensive "Crowd Services Platform" for managing prayer areas, gates, and crowd operations at Al-Haram. The platform includes daily session management, interactive maps, employee management, and real-time monitoring.

## Core Modules
1. **Prayer Areas (مناطق الصلاة)** - Daily sessions with interactive map drawing tools
2. **Gates Operations Center (مركز عمليات الأبواب)** - Daily gate management hub
3. **Gate Map Management (إدارة خرائط الأبواب)** - Map setup with draggable markers
4. **Dashboard** - Overview statistics
5. **Employee Management** - Staff tracking per department
6. **Settings & Admin** - System configuration

## What's Been Implemented

### Gates Operations Center (`/daily-gates`) - COMPLETED
- **4-tab layout**: الخريطة | الأبواب | الموظفين | التغييرات
- **Map Tab**: Interactive map with gate markers, pan/edit mode toggle, draggable markers
- **Gates Tab**: Traffic-light style quick status toggle (مفتوح/مغلق/مزدحم/صيانة), search, filter
- **Employees Tab**: Staff assignment to gates, shift filtering, unassigned alerts
- **Changes Tab**: Daily changes tracking
- **Map markers show**: Staff count badges, warning indicators for unstaffed gates

### Gate Map Management (`/gate-map`) - COMPLETED
- Floor management with image upload
- Interactive map with draggable gate markers
- Pan/Edit mode toggle for marker positioning
- "Sync Gates" button to auto-create markers from gates data
- Marker list with delete capability

### Backend APIs
- `POST /api/admin/gate-map/sync-gates` - Syncs gates to map markers
- `PUT /api/admin/gate-sessions/{id}/gates/{gate_id}` - Updates gate status/position
- `GET /api/gate-map/markers` - Get gate markers for a floor
- All existing CRUD endpoints for gates, sessions, floors, markers

## Architecture
```
/app/
├── backend/
│   ├── server.py
│   ├── routes/
│   │   ├── maps.py (gate-map endpoints + sync-gates)
│   │   ├── sessions.py (gate sessions)
│   │   ├── employees.py
│   │   └── ...
│   └── models.py
└── frontend/
    └── src/
        ├── pages/
        │   ├── DailyGateSessionsPage.jsx (main operations center)
        │   ├── DailyGateSessions/
        │   │   ├── GatesTab.jsx (traffic light status cards)
        │   │   └── EmployeesTab.jsx (staff assignment)
        │   ├── GateMapPage.jsx (map management with drag)
        │   └── ...
        └── ...
```

## Credentials
- **System Admin**: admin@crowd.sa / admin123

## Prioritized Backlog

### P0 (High Priority)
- [ ] Automatic Area Calculation (BLOCKED - needs map with known scale)
- [ ] Live Haram Map - unified real-time view

### P1 (Medium Priority)
- [ ] Smart Alert System
- [ ] Analytics Dashboard
- [ ] Advanced Drawing Tool Enhancements
- [ ] General Manager Dashboard
- [ ] Paths Feature (المسارات)

### P2 (Lower Priority)
- [ ] Field Supervisor Mobile Mode
- [ ] Smart Routing System
- [ ] Live Gates Dashboard
- [ ] AI Recommendations
- [ ] External Integrations (CCTV, emergency)

## Testing
- Last test: iteration_32.json - 100% pass rate (backend & frontend)
- No known issues or regressions
