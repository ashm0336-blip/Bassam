# Al-Haram OS - Crowd Services Platform

## Original Problem Statement
Build an interactive map for a "Crowd Services Platform" - a live, interactive digital version of a daily operational report focusing on "Daily Map Sessions" for the Grand Mosque (Al-Haram).

## Architecture
### Frontend Components (DailySessions)
```
/app/frontend/src/pages/
├── DailySessionsPage.jsx         # Main orchestrator
└── DailySessions/
    ├── constants.js               # SHAPE_LIBRARY, DRAG_SHAPE_MODES, etc.
    ├── utils.js                   # Shape generators, geometry, helpers
    └── components/
        ├── SessionSidebar.jsx     # Calendar + session list
        ├── SessionHeader.jsx      # Session header
        ├── MapToolbar.jsx         # Pan|Edit|Shapes|Zones|Zoom (clean)
        ├── MapCanvas.jsx          # SVG map + FloatingToolbar + PPT editing
        ├── MapZoneCards.jsx       # ChangesLog only
        ├── DensityTab.jsx         # Density tracking + heatmap
        ├── StatsTab.jsx           # Statistics tab
        └── Dialogs.jsx            # All modal dialogs
```

## Implemented Features (as of Feb 26, 2026)
- Full backend + frontend refactoring
- **Clean Toolbar**: تحريك | تعديل | أشكال | المناطق | Zoom (no duplicates)
- **Rich Shapes Library**: 10 shapes (rect, circle, ellipse, triangle, diamond, pentagon, hexagon, star, L, U) + 2 freehand
- **Floating Toolbar**: Appears above selected zone with تعديل|نسخ|تنعيم|لون|إزالة
- **PPT-Style Editing**: White square handles, green rotation, dashed blue selection
- **Delete Point**: Double-click vertex to remove it
- **Zones Dropdown**: Search + category filter in toolbar
- **Changes Log**: Below-map changes summary
- All tests passing (4 consecutive test iterations, 100%)

## Prioritized Backlog
### P0
- Build General Manager Dashboard ("نظرة عامة")
- Auto-calculate zone area from drawing (pending map with scale)

### P1
- "Paths" Feature (المسارات)
- Advanced Drawing: snap to grid/edge, undo/redo, keyboard shortcuts
- Bounding box resize handles

### P2
- Smart shape recognition, Layers, Mini map, Ruler, Templates, Analytics, Export

## Credentials
- System Admin: admin@crowd.sa / admin123
