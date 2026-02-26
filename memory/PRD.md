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
├── database.py        # MongoDB connection (6 lines)
├── auth.py            # Auth functions & deps (86 lines)
├── models.py          # All Pydantic models (746 lines)
├── routes/
│   ├── auth.py        # Auth + User CRUD (122 lines)
│   ├── admin.py       # Admin CRUD routes (194 lines)
│   ├── dashboard.py   # Dashboard + public data (276 lines)
│   ├── employees.py   # Employee management (89 lines)
│   ├── settings.py    # All settings routes (450 lines)
│   ├── maps.py        # Maps/floors/zones/gate maps (366 lines)
│   ├── sessions.py    # Map + gate sessions (464 lines)
│   ├── transactions.py # Transactions + PDF (163 lines)
│   └── uploads.py     # File uploads (43 lines)
├── tests/
└── uploads/maps/
```

### Frontend (React + Shadcn UI)
```
/app/frontend/src/
├── pages/
│   ├── DailySessionsPage.jsx       # Main orchestrator (573 lines) - REFACTORED
│   └── DailySessions/
│       ├── constants.js             # Shared constants (31 lines)
│       ├── utils.js                 # Utility functions (157 lines)
│       └── components/
│           ├── SessionSidebar.jsx   # Calendar + session list (161 lines)
│           ├── SessionHeader.jsx    # Session header bar (65 lines)
│           ├── MapToolbar.jsx       # Drawing tools + zoom (214 lines)
│           ├── MapCanvas.jsx        # SVG map rendering (328 lines)
│           ├── MapZoneCards.jsx     # Zone cards + changes (177 lines)
│           ├── DensityTab.jsx       # Density tracking (279 lines)
│           ├── StatsTab.jsx         # Statistics tab (193 lines)
│           └── Dialogs.jsx          # All modal dialogs (337 lines)
├── components/
├── context/
├── hooks/
└── utils/
```

## What's Been Implemented (as of Feb 26, 2026)
- Full backend refactoring from monolithic server.py (3952 lines) to modular structure
- **Frontend refactoring: DailySessionsPage.jsx (3160 lines) → 11 modular files (largest: 573 lines)**
- Removed 73 unused Python packages (~55% reduction in build size)
- All features listed above are fully functional
- Backend tested: 24/24 API tests passing
- Frontend tested: 45+ UI tests passing post-refactoring (100% success rate)

## Prioritized Backlog
### P0 (Critical)
- ~~Refactor DailySessionsPage.jsx (3160 lines) into smaller components~~ DONE
- **Build General Manager Dashboard** ("نظرة عامة" overview page)

### P1 (High)
- **Implement "Paths" Feature** (المسارات) - New tab for path management

### P2 (Medium)
- Historical trend analytics
- Export capabilities for sessions

## Credentials
- System Admin: admin@crowd.sa / admin123
