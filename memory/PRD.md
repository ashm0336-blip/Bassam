# Crowd Services Platform - PRD

## Original Problem Statement
Build an interactive map-based digital operational report for a crowd management platform (Al-Haram OS).

## Key Features
- **Dynamic Zone Categories** - DB-driven, managed from Admin Panel
- **Daily Map Sessions** - 4 tabs: Map+Zones, Changes, Density, Stats
- **Capacity Calculator** - area / per_person = max_capacity
- **Enhanced Tooltip** - code, name, category, area, capacity, utilization, status
- **Daily Gate Sessions** - Gate status logging
- **Map Management** - Floor plans only
- **Session Lock** - Completed sessions are read-only (no editing zones)

## Sidebar: إدارة المصليات
- نظرة عامة -> /haram-map (P0: future GM dashboard)
- السجل اليومي للخرائط -> /daily-sessions
- إدارة الخرائط -> /map-management

## Admin Panel Tabs (9)
لوحة التحكم, المستخدمون, النشاط, الفئات, المواسم, الممنوعات, الخرائط, الإعدادات, القائمة

## Credentials
- Admin: admin@crowd.sa / admin123

## Prioritized Backlog
### P0 - GM Dashboard (نظرة عامة)
### P1 - PDF export, Refactor server.py, Routes tab (المسارات)
### P2 - Real-time data, WebSocket, trends

## Completed
1. Statistics Tab
2. Density Tab
3. Map Management simplification
4. Renamed to إدارة المصليات
5. Zones merged into Map tab
6. Capacity Calculator
7. Enhanced Tooltip
8. Dynamic Zone Categories with Admin Manager
9. Advanced Drawing Tools (Circle, Ellipse, Freehand, Smooth Corners)
10. Pulse Animation on selected zone
11. Session Lock Bug Fix - Completed sessions now fully read-only (Feb 2026)
