# Crowd Services Platform - PRD

## Original Problem Statement
Build an interactive map-based digital operational report for a crowd management platform (Al-Haram OS). The system manages daily operations including prayer areas, gates, and zones across multiple floors.

## Core Features Implemented
1. **Master Map Management** - Interactive zone drawing/editing on floor plans
2. **Gate Management** - Gate markers with status tracking on floor plans
3. **Daily Map Sessions** - Daily snapshots of zone configurations with full editing suite
4. **Daily Gate Sessions** - Daily gate status logging with interactive map
5. **Statistics Tab** (Feb 2026) - Category-based statistics with previous day comparison
6. **Density Tab** (Feb 2026) - Real-time crowd density tracking per zone with heat map visualization

## Architecture
- **Frontend:** React + Shadcn/UI + Tailwind CSS
- **Backend:** FastAPI + MongoDB
- **Key Files:**
  - `/app/backend/server.py` - All backend logic (NEEDS REFACTORING)
  - `/app/frontend/src/pages/DailySessionsPage.jsx` - Daily map sessions + Stats + Density tabs
  - `/app/frontend/src/pages/DailyGateSessionsPage.jsx` - Daily gate sessions
  - `/app/frontend/src/pages/MapManagementPage.jsx` - Master map management
  - `/app/frontend/src/pages/GateMapPage.jsx` - Gate management

## Credentials
- Admin: admin@crowd.sa / admin123

## Daily Map Sessions Tabs (5 total)
1. **الخريطة** (Map) - Interactive map with drawing/editing tools
2. **المناطق** (Zones) - Zone cards with edit/remove/restore
3. **التغييرات** (Changes) - Change summary and details
4. **الكثافات** (Density) - Crowd density tracking with:
   - 4 KPI cards (utilization %, current count, critical zones, high zones)
   - Editable inputs per zone (current count + max capacity)
   - Real-time utilization bars with color-coded status badges
   - Batch save functionality
   - Density heat map visualization on floor plan
5. **إحصائيات** (Stats) - Category statistics with previous day comparison

## API Endpoints
- `PUT /api/admin/map-sessions/{session_id}/density-batch` - Batch update density data
- `GET /api/map-sessions` - List sessions
- `POST /api/admin/map-sessions` - Create session
- `PUT /api/admin/map-sessions/{session_id}/zones/{zone_id}` - Update zone

## Prioritized Backlog

### P0 (Critical)
- User verification of all features
- Refactor `server.py` into modular FastAPI structure

### P1 (High)
- Dashboard & Analytics page (platform-wide statistics)
- Refactor large frontend components
- PDF daily report export

### P2 (Medium)
- Real-time crowd data integration
- WebSocket integration for live updates
- Day-over-day trend charts
- Side-by-side day comparison view
