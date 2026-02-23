# Crowd Services Platform - PRD

## Original Problem Statement
Build an interactive map-based digital operational report for a crowd management platform (Al-Haram OS). The system manages daily operations including prayer areas, gates, and zones across multiple floors.

## Core Features Implemented
1. **Map Management** (Simplified) - Floor plan upload and management only
2. **Gate Management** - Gate markers with status tracking on floor plans
3. **Daily Map Sessions** - Daily operational center with 4 tabs:
   - Map (interactive drawing/editing + zone cards below)
   - Changes (daily change tracking)
   - Density (crowd density tracking with heat map)
   - Statistics (category stats with day comparison)
4. **Daily Gate Sessions** - Daily gate status logging with interactive map
5. **Overview Page** - Interactive map overview for General Manager (to be enhanced)

## Architecture
- **Frontend:** React + Shadcn/UI + Tailwind CSS
- **Backend:** FastAPI + MongoDB
- **Key Files:**
  - `/app/backend/server.py` - All backend logic
  - `/app/frontend/src/pages/DailySessionsPage.jsx` - Daily operations center (4 tabs)
  - `/app/frontend/src/pages/MapManagementPage.jsx` - Simplified floors-only
  - `/app/frontend/src/pages/DailyGateSessionsPage.jsx` - Daily gate sessions
  - `/app/frontend/src/pages/HaramMapPage.jsx` - Overview page (future: GM dashboard)
  - `/app/frontend/src/components/Layout.jsx` - Sidebar with DB-driven menu

## Sidebar Menu Structure
- إدارة المصليات (Prayer Areas Management)
  - نظرة عامة (Overview) → /haram-map
  - السجل اليومي للخرائط (Daily Map Log) → /daily-sessions
  - إدارة الخرائط (Map Management) → /map-management

## Credentials
- Admin: admin@crowd.sa / admin123

## Prioritized Backlog

### P0 (Critical - Next)
- **Overview Page Enhancement** → Transform /haram-map into a professional GM dashboard with daily summaries, density trends, alerts
- Refactor `server.py` into modular FastAPI structure

### P1 (High)
- PDF daily report export
- Dashboard & Analytics page (platform-wide statistics)

### P2 (Medium)
- Real-time crowd data integration
- WebSocket integration for live updates
- Day-over-day trend charts
- Side-by-side day comparison view

## Completed This Session
1. Statistics Tab in Daily Map Sessions (iteration_15)
2. Density Tab in Daily Map Sessions (iteration_16)
3. Simplified Map Management page - removed Zones & Crowd tabs (iteration_17)
4. Renamed "خريطة الحرم التفاعلية" → "إدارة المصليات" across codebase
5. Added "نظرة عامة" sub-item to sidebar for /haram-map access
6. Merged Zones tab into Map tab - zones now appear below map with bidirectional interaction (iteration_18)
