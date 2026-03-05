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

### Floating Toolbar - Quick Style Button (Mar 5, 2026)
- Added **تنسيق سريع** (Quick Style) button to the floating toolbar on prayer area maps
- Button position: between Smooth (تنعيم) and Remove (إزالة)
- Opening a compact Popover with: 10 quick color swatches, fill color picker + opacity slider, border color + width slider, 4 border style buttons (solid/dashed/dotted/dash-dot), live SVG preview
- Live color dot indicator on the button showing the zone's current fill color
- Implemented as `FloatingStyleButton` sub-component with internal useState for Popover control


- **Removed Pan/Edit mode toggle buttons** from all 3 map interfaces (DailyGateSessionsPage, GateMapPage, DailySessionsPage)
- **Smart cursor behavior:** drag on gate/marker = reposition; drag on background = pan map; 2 fingers = pinch-to-zoom
- Added `hasPannedRef` to prevent accidental zone deselection after panning in edit mode
- Added `hasDraggedRef` to prevent gate dialog from opening after dragging in DailyGateSessionsPage
- Added full **touch support** to `GateMapPage.jsx` (was missing): touch drag, touch pan, pinch-to-zoom
- Updated MapCanvas pan fallback in edit mode, default mode changed to "edit"
- Updated MapToolbar: removed Pan button, kept Edit button only
- Professional green hint badge replaces mode toggle: "اسحب الباب لتغيير موقعه • اسحب الخلفية للتنقل"

- Merged `ArchiveSessionSidebar.jsx` and `ArchiveSidebar.jsx` into single reusable `ArchiveSidebar` at `/app/frontend/src/components/shared/ArchiveSidebar.jsx`
- Supports theme prop (blue/emerald), optional compare button, notes display
- Deleted old duplicate files, updated imports in DailySessionsPage.jsx and DailyGateSessionsPage.jsx

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
