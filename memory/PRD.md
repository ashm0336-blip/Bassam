# Crowd Services Platform - PRD

## Original Problem Statement
Build an interactive map-based digital operational report for a crowd management platform (Al-Haram OS).

## Daily Map Sessions - Tabs (4)
1. **الخريطة** (Map + Zones) - Drawing tools, zone cards below map with bidirectional selection
2. **التغييرات** (Changes) - Daily change tracking
3. **الكثافات** (Density) - Current count input → auto utilization from calculated capacity
4. **إحصائيات** (Stats) - Category stats with day comparison

## Capacity Calculator Flow
- Zone Edit Dialog → Enter area (m²) + per person (m²) → Auto-calculates max capacity
- Formula: `المساحة ÷ نصيب الفرد = السعة القصوى`
- Density tab → Only enter current_count → Utilization auto-calculated from capacity
- Capacity is READ-ONLY in density tab (comes from zone settings)

## Sidebar: إدارة المصليات
- نظرة عامة → /haram-map (future: GM dashboard - HIGHEST PRIORITY)
- السجل اليومي للخرائط → /daily-sessions
- إدارة الخرائط → /map-management (floors only)

## Credentials
- Admin: admin@crowd.sa / admin123

## Prioritized Backlog
### P0 - Overview Page for GM (أهم شي)
Transform /haram-map into professional GM dashboard

### P1
- PDF daily report export
- Refactor server.py

### P2
- Real-time crowd data, WebSocket, trend charts

## Completed This Session
1. Statistics Tab (iter_15)
2. Density Tab (iter_16)
3. Map Management simplification (iter_17)
4. Renamed to إدارة المصليات + sidebar fixes
5. Zones merged into Map tab (iter_18)
6. Capacity Calculator with auto-calculation (iter_19)
