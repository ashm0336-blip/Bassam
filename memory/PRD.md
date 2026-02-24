# Crowd Services Platform - PRD

## Original Problem Statement
Build an interactive map-based digital operational report for a crowd management platform (Al-Haram OS).

## Key Features
- **Dynamic Zone Categories** - DB-driven, managed from Admin Panel
- **Daily Map Sessions** - 4 tabs: Map+Zones, Changes, Density, Stats
- **Capacity Calculator** - area ÷ per_person = max_capacity
- **Enhanced Tooltip** - code, name, category, area, capacity, utilization, status
- **Daily Gate Sessions** - Gate status logging
- **Map Management** - Floor plans only

## Sidebar: إدارة المصليات
- نظرة عامة → /haram-map (P0: future GM dashboard)
- السجل اليومي للخرائط → /daily-sessions
- إدارة الخرائط → /map-management

## Admin Panel Tabs (9)
لوحة التحكم, المستخدمون, النشاط, **الفئات**, المواسم, الممنوعات, الخرائط, الإعدادات, القائمة

## Credentials
- Admin: admin@crowd.sa / admin123

## Prioritized Backlog
### P0 - GM Dashboard (نظرة عامة)
### P1 - PDF export, Refactor server.py, Routes tab (المسارات)
### P2 - Real-time data, WebSocket, trends

## Completed This Session
1. Statistics Tab (iter_15)
2. Density Tab (iter_16)
3. Map Management simplification (iter_17)
4. Renamed to إدارة المصليات
5. Zones merged into Map tab (iter_18)
6. Capacity Calculator (iter_19)
7. Enhanced Tooltip (iter_20)
8. Dynamic Zone Categories with Admin Manager (iter_21)
