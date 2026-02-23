# Crowd Services Platform - PRD

## Original Problem Statement
Build an interactive map-based digital operational report for a crowd management platform (Al-Haram OS).

## Daily Map Sessions - Tabs (4)
1. **الخريطة** (Map + Zones) - Drawing tools, zone cards below map, enhanced tooltip
2. **التغييرات** (Changes) - Daily change tracking
3. **الكثافات** (Density) - Current count input → auto utilization
4. **إحصائيات** (Stats) - Category stats with day comparison

## Key Features
- **Capacity Calculator:** area ÷ per_person = max_capacity (auto-calculated)
- **Enhanced Tooltip:** code, name, category, area, capacity, utilization bar, status, notes
- **Bidirectional Selection:** click zone on map ↔ highlights card below
- **Density Heat Map:** zones colored by utilization level

## Sidebar: إدارة المصليات
- نظرة عامة → /haram-map (P0: future GM dashboard)
- السجل اليومي للخرائط → /daily-sessions
- إدارة الخرائط → /map-management (floors only)

## Credentials
- Admin: admin@crowd.sa / admin123

## Prioritized Backlog
### P0 - Overview Page for GM
Transform /haram-map into professional GM dashboard with daily summaries, density trends, alerts

### P1
- PDF daily report export
- Refactor server.py into modular structure

### P2
- Real-time crowd data, WebSocket, trend charts

## Completed This Session
1. Statistics Tab (iter_15)
2. Density Tab (iter_16)
3. Map Management simplification (iter_17)
4. Renamed to إدارة المصليات + sidebar fixes
5. Zones merged into Map tab (iter_18)
6. Capacity Calculator (iter_19)
7. Enhanced Zone Hover Tooltip (iter_20)
