# Crowd Services Platform - PRD

## Original Problem Statement
Build an interactive map-based digital operational report for a crowd management platform (Al-Haram OS).

## Key Features
- **Dynamic Zone Categories** - DB-driven, managed from Admin Panel
- **Daily Map Sessions** - 3 tabs: Map, Stats, Density + sub-tabs (Zones/Changes) under map
- **Area Calculator** - Length x Width = Area (auto-computed)
- **3-Level Capacity System** - Safe (0.75) | Medium (0.60) | Maximum (0.55) m²/person
- **Prayer Carpet Calculator** - Carpet dimensions → total carpets, rows, per-row count
- **Prayer Times Density** - 6 prayer slots (Fajr/Dhuhr/Asr/Maghrib/Isha/Taraweeh)
- **Percentage-Based Input** - Enter fill % → auto-compute count & filled rows
- **Heatmap with Row Lines** - Horizontal lines showing filled prayer rows per zone
- **Session Lock** - Completed sessions are fully read-only
- **Professional Toolbar** - Pan | Draw | Edit | Shapes dropdown | Style dropdown

## Credentials
- Admin: admin@crowd.sa / admin123

## Prioritized Backlog
### P0 - GM Dashboard (نظرة عامة)
### P1 - Refactor server.py + DailySessionsPage.jsx, Paths tab
### P2 - PDF export, Real-time data, WebSocket

## Completed
1-9. Previous features (Stats, Density, Categories, Drawing tools, etc.)
10. Session Lock & Zone Card pulse fix
11. Tabs reorder (3 main tabs + 2 sub-tabs under map)
12. Density cards grid layout
13. Professional heatmap with zoom/pan/tooltip
14. Prayer Times Density (Feb 2026)
15. Changes merged under map as sub-tab (Feb 2026)
16. Toolbar redesign with Shapes & Style dropdowns (Feb 2026)
17. Area calculator (Length x Width), 3-level capacity, Carpet calculator (Feb 2026)
18. Percentage-based density input + row visualization on heatmap (Feb 2026)
