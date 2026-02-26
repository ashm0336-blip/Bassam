# Al-Haram OS - Crowd Services Platform

## Original Problem Statement
Build an interactive map for a "Crowd Services Platform" - a live, interactive digital version of a daily operational report focusing on "Daily Map Sessions" for the Grand Mosque (Al-Haram).

## Core Features (Implemented)
- **Authentication & RBAC**: JWT-based auth with roles
- **Dashboard**: Real-time stats for crowd management
- **Daily Map Sessions**: Interactive map with zone management, density tracking
- **Daily Gate Sessions**: Gate status tracking
- **Interactive Maps**: Multi-floor map system with zone polygons, advanced drawing tools
- **Density Tracking**: 6 prayer times, percentage-based input
- **Capacity Calculation**: 3-tier system (Safe/Medium/Max), prayer carpet calculation
- **Heatmap Visualization**: Interactive zoom/pan, prayer row visualization
- **Employee Management**: Department-based employee tracking
- **Transactions Management**: With PDF export
- **Settings**: Full customization
- **Activity Logging**: Full audit trail

## Architecture
### Frontend Components (DailySessions)
```
/app/frontend/src/pages/
├── DailySessionsPage.jsx         # Main orchestrator (560 lines)
└── DailySessions/
    ├── constants.js               # SHAPE_LIBRARY, DRAG_SHAPE_MODES, etc.
    ├── utils.js                   # Shape generators, geometry, helpers
    └── components/
        ├── SessionSidebar.jsx     # Calendar + session list
        ├── SessionHeader.jsx      # Session header
        ├── MapToolbar.jsx         # Drawing tools + Shapes panel + Zones dropdown
        ├── MapCanvas.jsx          # SVG map with PPT-style editing
        ├── MapZoneCards.jsx       # ChangesLog only
        ├── DensityTab.jsx         # Density tracking + heatmap
        ├── StatsTab.jsx           # Statistics tab
        └── Dialogs.jsx            # All modal dialogs
```

## What's Been Implemented (as of Feb 26, 2026)
- Full backend refactoring (monolithic → modular)
- Frontend refactoring (3160 lines → 11 modular files)
- **Zones Dropdown**: Active zones in toolbar with search + category filter
- **Changes Log**: Below-map area shows only changes
- **Rich Shapes Library**: 10 basic shapes with visual SVG previews (rect, circle, ellipse, triangle, diamond, pentagon, hexagon, star, L-shape, U-shape) + 2 freehand modes
- **PPT-Style Editing**: White square control points with blue borders, green rotation handle, dashed blue selection, midpoint handles
- **Unified Shape Generator**: Single function handles all shape creation from drag
- All tests passing (100% success rate across 3 test iterations)

## Prioritized Backlog
### P0 (Critical)
- **Build General Manager Dashboard** ("نظرة عامة")
- **Auto-calculate zone area from drawing** (pending user map with scale)

### P1 (High)
- **Implement "Paths" Feature** (المسارات)
- **Advanced Drawing**: Snap to grid/edge, undo/redo stack, split/merge zones, keyboard shortcuts
- **Bounding box resize handles** (scale zone from corners/edges like PPT)

### P2 (Medium)
- Smart shape recognition (auto-detect from freehand)
- Layers system (show/hide by category)
- Mini map for navigation
- Ruler/measurement tool
- Zone templates library
- Historical trend analytics
- Export capabilities

## Credentials
- System Admin: admin@crowd.sa / admin123
