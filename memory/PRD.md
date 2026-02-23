# Crowd Services Platform - PRD

## Original Problem Statement
Build an interactive map-based digital operational report for a crowd management platform (Al-Haram OS). The system manages daily operations including prayer areas, gates, and zones across multiple floors.

## Core Features Implemented
1. **Master Map Management** - Interactive zone drawing/editing on floor plans
2. **Gate Management** - Gate markers with status tracking on floor plans
3. **Daily Map Sessions** - Daily snapshots of zone configurations with full editing suite
4. **Daily Gate Sessions** - Daily gate status logging with interactive map
5. **Statistics Tab** (Feb 2026) - Category-based statistics with previous day comparison inside Daily Map Sessions

## Architecture
- **Frontend:** React + Shadcn/UI + Tailwind CSS
- **Backend:** FastAPI + MongoDB
- **Key Files:**
  - `/app/backend/server.py` - All backend logic (NEEDS REFACTORING)
  - `/app/frontend/src/pages/DailySessionsPage.jsx` - Daily map sessions + Statistics tab
  - `/app/frontend/src/pages/DailyGateSessionsPage.jsx` - Daily gate sessions
  - `/app/frontend/src/pages/MapManagementPage.jsx` - Master map management
  - `/app/frontend/src/pages/GateMapPage.jsx` - Gate management

## Credentials
- Admin: admin@crowd.sa / admin123

## Prioritized Backlog

### P0 (Critical)
- User verification of Daily Map Sessions and Daily Gate Sessions features
- Refactor `server.py` into modular FastAPI structure (routes/, models/, services/)

### P1 (High)
- Dashboard & Analytics page (comprehensive statistics across all sessions)
- Refactor large frontend components (DailySessionsPage, DailyGateSessionsPage)

### P2 (Medium)
- Real-time crowd data integration
- WebSocket integration for live updates
- PDF export for daily reports
- Day-over-day trend charts
- Side-by-side day comparison view

## Last Completed Task
- **Statistics Tab** in Daily Map Sessions (`/daily-sessions`):
  - 4 KPI cards (active zones, removed, changes, categories)
  - Donut chart for category distribution
  - Category breakdown table with counts, percentages, progress bars
  - Previous day comparison with category-level deltas
  - All tests passed (iteration_15.json - 100% success rate)
