# Al-Haram OS - Crowd Services Platform

## Original Problem Statement
Build an interactive map for a "Crowd Services Platform" - a live, interactive digital version of a daily operational report focusing on "Daily Map Sessions" for the Grand Mosque (Al-Haram). The platform manages prayer areas, gates, and crowd services.

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

### Gates Section
```
/app/frontend/src/pages/
├── GatesDepartment.jsx           # Gates Dashboard with KPI cards
├── GateMapPage.jsx               # Gate Map Management (floor CRUD)
└── DailyGateSessionsPage.jsx     # Daily Gate Sessions with interactive map
```

### Routes
- `/gates` - Gates Dashboard
- `/gate-map` - Gate Map Management (Admin)
- `/daily-gates` - Daily Gate Sessions (Admin)
- `/map-management` - Prayer Area Map Management (Admin)
- `/daily-sessions` - Prayer Area Daily Sessions (Admin)

## Implemented Features (as of Feb 27, 2026)
- Full backend + frontend refactoring
- **Clean Toolbar**: Pan|Edit|Shapes|Zones|Zoom (no duplicates)
- **Rich Shapes Library**: 10 shapes + 2 freehand
- **Floating Toolbar**: Appears above selected zone with edit|copy|smooth|color|remove
- **PPT-Style Editing**: White square handles, green rotation, dashed blue selection
- **Delete Point**: Double-click vertex to remove it
- **Zones Dropdown**: Search + category filter in toolbar
- **Changes Log**: Below-map changes summary
- **Gates Dashboard**: Professional KPI cards with live stats
- **Gate Map Management**: Full floor CRUD (add/edit/delete with image upload)
- **Daily Gate Sessions**: Interactive map with gate status management
- **Unified Zone Dialogs**: Shared ZoneFormFields component for add/edit
- **Global Undo/Redo**: History stack for all map operations
- All E2E tests passing (iteration 31, 100% backend + frontend)

## Prioritized Backlog
### P0
- Auto-calculate zone area from drawing (pending map with scale from user)

### P1
- Build General Manager Dashboard ("Overview")
- "Paths" Feature (managing paths/routes)
- Advanced Drawing: smart drawing, rotation by angle, layers, ruler, keyboard shortcuts
- Live Gates Dashboard with real-time alerts

### P2
- Smart shape recognition, mini map, templates, analytics, export

## Credentials
- System Admin: admin@crowd.sa / admin123
