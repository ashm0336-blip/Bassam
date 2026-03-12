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
  - Density tab now shows zones from the specific prayer session (not all zones)
  - Prayer time selector shows status indicators (green=completed, blue=draft, amber=skipped, gray=no session)
  - Empty state with helpful messaging when no prayer session exists for selected prayer
  - Available prayers shown as clickable quick-switch buttons in empty state
  - Density save handler targets the correct prayer session
  - Files modified: `DailySessionsPage.jsx`, `DensityTab.jsx`
- **UI Cleanup: Remove duplicate stats headers** - COMPLETE
  - Removed redundant stats banners from Density tab and Employees tab
  - KPI data remains in the side panel (no data loss)
  - Files modified: `DensityTab.jsx`, `ZoneEmployeesTab.jsx`
- **Multi-Select Employee Assignment for Zones** - COMPLETE & TESTED
  - Zone cards now open a professional multi-select popover with checkboxes
  - Employees grouped by shift with color indicators
  - Shows which employees are assigned to other zones (amber warning)
  - Search field for quick filtering by name/employee number
  - Read-only mode with clear message when session is completed
  - **Map-click assignment**: Click any zone on the map to open assignment panel
  - Removed redundant "Quick Assign" button from toolbar
  - Files modified: `ZoneEmployeesTab.jsx`

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
