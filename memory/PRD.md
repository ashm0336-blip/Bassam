# Crowd Services Platform - PRD

## Original Problem Statement
Build a highly interactive and efficient "Crowd Services Platform" with two main modules: "Gates Management" and "Prayer Area Management." Both modules feature interactive maps with pan/zoom, real-time statistical dashboards, smart archiving system, and dynamic monthly scheduling for employees.

## User Language
Arabic (العربية)

## Architecture
- **Backend:** FastAPI + MongoDB
- **Frontend:** React + Shadcn/UI + Tailwind CSS
- **Auth:** JWT-based (admin@crowd.sa / admin123)

## What's Been Implemented

### Core Features
- Gates Management (Daily Log + Department Settings)
- Prayer Area Management (Daily Log + Department Settings)
- Interactive maps with pan/zoom (useZoomPan hook)
- Real-time statistical dashboards
- Smart archiving system with circular session grid
- Monthly employee scheduling
- Zone drawing tools (polygon, shapes, freehand)
- Zone editing (drag points, rotate, move, smooth, copy)
- Density management with heatmap visualization
- Employee assignment with coverage map
- Undo/Redo system for map edits

### Recent Fixes (Feb 2026)
- Professional tab restyling for both modules
- Circular session list redesign
- Prayer Area Stats Panel with 6 KPIs
- Employees Tab 60/40 split-screen overhaul
- Map pan/zoom consistency fix
- Save prayer area bug fix (empty strings → null)

### Pinch-to-Zoom Support (Mar 5, 2026)
- Added pinch-to-zoom (2-finger zoom) to all 4 map components
- Zoom centers between the two fingers (like Google Maps behavior)
- Clean separation: 1-finger = pan/drag, 2-fingers = pinch zoom
- Files modified: DailySessionsPage.jsx, DensityTab.jsx, ZoneEmployeesTab.jsx, DailyGateSessionsPage.jsx, MapCanvas.jsx

## Prioritized Backlog

### P0
- **Gate Management at Scale:** Compact Table View + Grouped by Plaza view for 200+ gates

### P1
- Advanced Role Hierarchy (5-level RBAC)
- Live Haram Map (unified real-time 3D/heatmap)
- Smart Alert System (multi-level with escalations)
- Tour Mode for Gates (mobile flashcard UI)

### P2
- Rotate Rests feature (auto-rotation for scheduling)
- Field Supervisor Mobile Mode
- Merge duplicate archive components (ArchiveSidebar.jsx + ArchiveSessionSidebar.jsx)

### Blocked
- Automatic Area Calculation (pending user-provided map with scale)

## Key Files
- `/app/frontend/src/pages/DailySessions/components/MapCanvas.jsx`
- `/app/frontend/src/pages/DailySessions/components/DensityTab.jsx`
- `/app/frontend/src/pages/DailySessions/components/ZoneEmployeesTab.jsx`
- `/app/frontend/src/pages/DailyGateSessionsPage.jsx`
- `/app/frontend/src/pages/DailySessionsPage.jsx`
- `/app/frontend/src/hooks/useZoomPan.js`
- `/app/backend/server.py`

## Credentials
- System Admin: admin@crowd.sa / admin123
