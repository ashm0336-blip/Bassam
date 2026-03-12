# Crowd Management System - PRD

## Original Problem Statement
Enterprise-grade crowd management application for managing prayer halls, gates, employee schedules, and daily operations. Built with FARM stack (FastAPI, React, MongoDB).

## Core Requirements
- Dashboard & Overviews with real-time KPIs
- Employee & Schedule Management (static employees + dynamic monthly schedules)
- Tasks Management (Kanban, Calendar, Performance Tracking)
- Daily Sessions (Prayer Halls + Gates inspection tours)
- Real-time Updates (30-60s polling)
- Responsive design (mobile + tablet)
- Arabic-first UI (RTL)

## Key Technical Concepts
- **Timezone**: All date/time uses UTC+3 offset
- **Architecture**: Employees tab (static data) vs Schedule tab (monthly assignments)
- **Approved data only**: Stats reflect only approved schedules
- **Component-driven UI**: Shadcn/UI + TailwindCSS + Cairo font

## What's Been Implemented

### Core Features (Complete)
- Full dashboard with Operations Room
- Employee management with account creation/reset
- Monthly schedule with approve/lock/unlock workflow
- Tasks page (Kanban + Calendar + List views)
- Daily Sessions for Prayer Halls (map editor, prayer tours, audit log)
- Daily Sessions for Gates
- Responsive design overhaul
- Real-time polling on all key pages

### Recent Implementation (March 12, 2026)
- **P0: Link Crowd Densities to Prayer-Specific Zones** - COMPLETE & TESTED
  - Density tab shows zones from specific prayer session
  - Prayer status indicators + empty state for prayers without sessions
- **UI Cleanup: Remove duplicate stats headers** - COMPLETE
  - Removed from Density tab and Employees tab in Prayer Halls
- **Multi-Select Employee Assignment for Zones** - COMPLETE & TESTED
  - Zone cards + map click: multi-select popover with checkboxes grouped by shift
  - Read-only mode with clear message for completed sessions
  - Removed redundant "Quick Assign" button
- **Map Scale Calibration System** - COMPLETE
  - Two-point calibration tool: user clicks 2 known points on map + enters real distance in meters
  - Auto-computes area (m²), safe/medium/max capacity, carpet rows/count for any drawn zone
  - Calibration saved per floor in MongoDB
  - Shoelace formula with aspect ratio correction for precise polygon area
  - Files: `calibration.js`, `DailySessionsPage.jsx`, `Dialogs.jsx`
  - Renamed/reordered tabs: الموظفين ← الكثافات ← الأبواب (matches Prayer Halls)
  - Removed stats banner, added side panel with KPIs + mini gate cards
  - Legend moved to toolbar
  - Gate changes log under the map (cards showing status/indicator changes)
  - Employees tab completely rewritten: map with coverage overlay + side panel + multi-select gate assignment popovers

## Prioritized Backlog

### P0 - Upcoming
- Comparative density report between prayers (e.g., Fajr vs Dhuhr chart)
- Gate audit log (سجل تغييرات الأبواب) under map - records open/close/crowded changes

### P1 - Advanced Task Features
- Recurring Tasks (daily/weekly/monthly)
- Task Templates (e.g., "Friday Checklist")
- Comments on Tasks
- Attachments & Images on Tasks
- Pre-deadline Reminders
- Assign Task to entire Department
- Weekly/Monthly Performance Reports

## Credentials
- **Admin**: admin@crowd.sa / admin123
- **Employee (Bassam)**: ID 1037299037 / PIN 0000

## Architecture
- **Backend**: FastAPI at /app/backend/server.py with modular routers in /app/backend/routes/
- **Frontend**: React (CRA) at /app/frontend/src/ with page-based structure
- **Database**: MongoDB (collections: users, employees, monthly_schedules, tasks, map_sessions, gate_sessions)
