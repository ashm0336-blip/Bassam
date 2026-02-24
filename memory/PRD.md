# Crowd Services Platform - PRD

## Original Problem Statement
Build an interactive map-based digital operational report for a crowd management platform (Al-Haram OS).

## Key Features
- **Dynamic Zone Categories** - DB-driven, managed from Admin Panel
- **Daily Map Sessions** - 4 tabs: Map+Zones, Stats, Density, Changes
- **Capacity Calculator** - area / per_person = max_capacity
- **Prayer Times Density** - Track crowd density per prayer time (Fajr, Dhuhr, Asr, Maghrib, Isha, Taraweeh)
- **Session Lock** - Completed sessions are read-only
- **Zone Card Highlight** - Pulse animation without entering edit mode
- **Heatmap** - Zoom/pan with labels appearing at 200%+

## Credentials
- Admin: admin@crowd.sa / admin123

## Prioritized Backlog
### P0 - GM Dashboard (نظرة عامة)
### P1 - Refactor server.py + DailySessionsPage.jsx, Paths tab
### P2 - PDF export, Real-time data, WebSocket

## Completed
1. Statistics Tab
2. Density Tab
3. Map Management simplification
4. Dynamic Zone Categories with Admin Manager
5. Advanced Drawing Tools
6. Pulse Animation on selected zone
7. Session Lock - Completed sessions fully read-only
8. Zone Card Click Fix - Pulse only, no edit mode
9. Grab cursor for map panning
10. Tabs reorder: Map > Stats > Density > Changes
11. Density cards grid layout (5 per row)
12. Professional heatmap with zoom/pan/tooltip
13. Heatmap labels hidden, appear on zoom > 200%
14. Prayer Times Density - 6 prayer time slots per zone (Feb 2026)
