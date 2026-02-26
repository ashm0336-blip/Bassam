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
│   └── DailySessionsPage.jsx  # 3160 lines - NEEDS REFACTORING
├── components/
├── context/
├── hooks/
└── utils/
```

## What's Been Implemented (as of Feb 2026)
- Full backend refactoring from monolithic server.py (3952 lines) to modular structure
- Removed 73 unused Python packages (~55% reduction in build size)
- All features listed above are fully functional
- Backend tested: 24/24 API tests passing
- Frontend tested: Login flow and Daily Sessions page working

## Prioritized Backlog
### P0 (Critical)
- **Refactor DailySessionsPage.jsx** (3160 lines) into smaller components and hooks
- **Build General Manager Dashboard** ("نظرة عامة" overview page)

### P1 (High)
- **Implement "Paths" Feature** (المسارات) - New tab for path management

### P2 (Medium)
- Historical trend analytics
- Export capabilities for sessions

## Credentials
- System Admin: admin@crowd.sa / admin123
