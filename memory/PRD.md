# Crowd Services Platform - PRD

## Original Problem Statement
Build an interactive map-based digital operational report for a crowd management platform (Al-Haram OS). The system manages daily operations including prayer areas, gates, and zones across multiple floors.

## Core Features Implemented
1. **Map Management** (Simplified) - Floor plan upload and management only
2. **Gate Management** - Gate markers with status tracking on floor plans
3. **Daily Map Sessions** - Daily operational center with 5 tabs:
   - Map (interactive drawing/editing)
   - Zones (zone cards with CRUD)
   - Changes (daily change tracking)
   - Density (crowd density tracking with heat map)
   - Statistics (category stats with day comparison)
4. **Daily Gate Sessions** - Daily gate status logging with interactive map

## Architecture
- **Frontend:** React + Shadcn/UI + Tailwind CSS
- **Backend:** FastAPI + MongoDB
- **Key Files:**
  - `/app/backend/server.py` - All backend logic
  - `/app/frontend/src/pages/MapManagementPage.jsx` - Simplified floors-only (was 1697 lines, now ~280)
  - `/app/frontend/src/pages/DailySessionsPage.jsx` - Daily operations center (5 tabs)
  - `/app/frontend/src/pages/DailyGateSessionsPage.jsx` - Daily gate sessions
  - `/app/frontend/src/pages/GateMapPage.jsx` - Gate management

## Page Structure
### Map Management (`/map-management`)
- Floor cards with images, names, edit/delete
- Stats: total floors, with/without image, floor range
- No tabs - just floor management

### Daily Map Sessions (`/daily-sessions`)
1. **الخريطة** (Map) - Drawing tools, rotation, dragging, cloning
2. **المناطق** (Zones) - Zone cards with edit/remove/restore
3. **التغييرات** (Changes) - Change summary and details
4. **الكثافات** (Density) - Crowd density tracking with heat map
5. **إحصائيات** (Stats) - Category statistics with day comparison

## Credentials
- Admin: admin@crowd.sa / admin123

## Prioritized Backlog

### P0 (Critical)
- Refactor `server.py` into modular FastAPI structure

### P1 (High)
- Dashboard & Analytics page (platform-wide statistics)
- PDF daily report export

### P2 (Medium)
- Real-time crowd data integration
- WebSocket integration for live updates
- Day-over-day trend charts
- Side-by-side day comparison view
- Refactor large frontend components

## Completed This Session
- Statistics Tab in Daily Map Sessions (iteration_15)
- Density Tab in Daily Map Sessions (iteration_16)
- Simplified Map Management page - removed Zones & Crowd tabs (iteration_17)
