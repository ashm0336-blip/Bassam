# Al-Haram OS - Crowd Services Platform

## Original Problem Statement
Build an interactive map for a "Crowd Services Platform" - a live, interactive digital version of a daily operational report focusing on "Daily Map Sessions" for the Grand Mosque (Al-Haram).

## Core Features (Implemented)
- **Authentication & RBAC**: JWT-based auth with roles (system_admin, general_manager, department_manager, field_staff, monitoring_team)
- **Dashboard**: Real-time stats for crowd management across departments
- **Daily Map Sessions**: Interactive map with zone management, density tracking, prayer-time tracking
- **Daily Gate Sessions**: Gate status tracking with daily snapshots
- **Interactive Maps**: Multi-floor map system with zone polygons, drawing tools
- **Density Tracking**: 6 prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha, Tarawih), percentage-based input
- **Capacity Calculation**: 3-tier system (Safe/Medium/Max), prayer carpet calculation
- **Heatmap Visualization**: Interactive zoom/pan, prayer row visualization
- **Employee Management**: Department-based employee tracking
- **Transactions Management**: With PDF export
- **Settings**: Login page customization, header settings, sidebar menu management, zone categories, dropdown options
- **Activity Logging**: Full audit trail

## Architecture
### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py          # Main app entry (109 lines)
├── database.py        # MongoDB connection
├── auth.py            # Auth functions & deps
├── models.py          # All Pydantic models
├── routes/
│   ├── auth.py, admin.py, dashboard.py, employees.py
│   ├── settings.py, maps.py, sessions.py
│   ├── transactions.py, uploads.py
├── tests/
└── uploads/maps/
```

### Frontend (React + Shadcn UI)
```
/app/frontend/src/
├── pages/
│   ├── DailySessionsPage.jsx       # Main orchestrator (568 lines)
│   └── DailySessions/
│       ├── constants.js             # Shared constants (31 lines)
│       ├── utils.js                 # Utility functions (157 lines)
│       └── components/
│           ├── SessionSidebar.jsx   # Calendar + session list (161 lines)
│           ├── SessionHeader.jsx    # Session header bar (65 lines)
│           ├── MapToolbar.jsx       # Drawing tools + zoom + ZonesDropdown (320 lines)
│           ├── MapCanvas.jsx        # SVG map rendering (328 lines)
│           ├── MapZoneCards.jsx     # ChangesLog only (93 lines)
│           ├── DensityTab.jsx       # Density tracking (279 lines)
│           ├── StatsTab.jsx         # Statistics tab (193 lines)
│           └── Dialogs.jsx          # All modal dialogs (337 lines)
├── components/
├── context/
├── hooks/
└── utils/
```

## What's Been Implemented (as of Feb 26, 2026)
- Full backend refactoring from monolithic server.py to modular structure
- Frontend refactoring: DailySessionsPage.jsx (3160 lines) -> 11 modular files
- **Zones Dropdown in Toolbar**: Active zones moved from below map into dropdown with search, category filter, and zone list
- **Changes Log**: Below-map area now shows only the changes log (removed zones/changes sub-tabs)
- Removed 73 unused Python packages
- All features fully functional
- Frontend tested: 100% success rate

## Prioritized Backlog
### P0 (Critical)
- ~~Refactor DailySessionsPage.jsx~~ DONE
- ~~Zones Dropdown in Toolbar~~ DONE
- **Build General Manager Dashboard** ("نظرة عامة" overview page)
- **Auto-calculate zone area from drawing** (pending user map with scale)

### P1 (High)
- **Implement "Paths" Feature** (المسارات)
- **Advanced Drawing Tools** (snap to grid, snap to edge, undo/redo stack, split/merge zones, keyboard shortcuts)

### P2 (Medium)
- Smart shape recognition
- Layers system (show/hide by category)
- Mini map for navigation
- Ruler/measurement tool
- Zone templates library
- Historical trend analytics
- Export capabilities

## Credentials
- System Admin: admin@crowd.sa / admin123
