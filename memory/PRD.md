# Crowd Services Platform - PRD

## Original Problem Statement
Build a highly interactive and efficient "Crowd Services Platform" with two main modules: "Gates Management" and "Prayer Area Management." Both modules feature interactive maps with pan/zoom, real-time statistical dashboards, smart archiving system, and dynamic monthly scheduling for employees.

## User Language
Arabic (العربية)

## Architecture
- **Backend:** FastAPI + MongoDB
- **Frontend:** React + Shadcn/UI + Tailwind CSS
- **Auth:** JWT-based (admin@crowd.sa / admin123)

## What's Been Implemented

### Core Features
- Gates Management (Daily Log + Department Settings)
- Prayer Area Management (Daily Log + Department Settings)
- Interactive maps with pan/zoom
- Real-time statistical dashboards
- Smart archiving system with circular session grid
- Monthly employee scheduling
- Zone drawing tools (polygon, shapes, freehand)
- Zone editing (drag points, rotate, move, smooth, copy)
- Density management with heatmap visualization
- Employee assignment with coverage map
- Undo/Redo system for map edits
- Categories as single source of truth for zone styling

### Prayer Sessions Feature (Mar 6, 2026)
- Each daily session can have 6 prayer sub-sessions (Fajr, Dhuhr, Asr, Maghrib, Isha, Taraweeh)
- Backend: MapSession model extended with `prayer`, `parent_session_id`, `session_type` fields
- Prayer sessions cloned from parent daily session (or previous prayer)
- Prayer sessions bar in map tab showing status (✅ completed, 🔵 draft, ○ not started)
- Click prayer to load its session; all 3 tabs (map, density, employees) update automatically
- "Back to daily" button when in prayer session view
- Unique constraint: date + floor + prayer combination

### Dual Hijri/Gregorian Calendar (Mar 6, 2026)
- Calendar header shows both Gregorian and Hijri months
- Each calendar day cell shows Gregorian (large) + Hijri (small)
- Toggle button م ↔ هـ to switch primary/secondary
- Ramadan days have golden ☽ indicator
- New Hijri month first day indicated with short name
- Friday cells have green tint, Ramadan days have amber tint
- Session circles show Hijri day number
- Session header shows full Hijri date as amber badge

### Prayer Time Context in Map (Mar 6, 2026)
- Prayer time selector bar above map canvas
- Zone overlays show density color per selected prayer
- Zone tooltip shows prayer-specific occupancy (count/capacity + progress bar)
- Shared `activePrayer` state between all 3 tabs

### Tablet/Touch Improvements (Mar 6, 2026)
- Fixed coordinate calculation: replaced `getScreenCTM()` with manual calculation
- Fixed touch events: `interactionRef` for synchronous state in event handlers
- Single tap = tooltip, Double tap = enter edit mode (tablet)
- Panel handle slides with panel (not floating button)
- Panel state persists when switching tabs (lifted to parent)
- No layout shift when switching tabs (tabIndex=-1 + minHeight)

### Many-to-Many Employee Assignment (Mar 7, 2026)
- **Architecture change**: from `employee.location` (single string) → `zone.assigned_employee_ids[]` (session-local)
- **One employee → multiple zones**: Employee card shows zone tags `[ط-32 ✕] [ط-33 ✕] [+ إضافة]`
- **One zone → multiple employees**: Zone popover shows all assigned employees with individual ✕ remove
- **Session-local**: Assignments stored in zone within session, not globally on employee
- **New employee fields**: `contact_phone` (جوال التواصل), `is_tasked` (مكلف ⚡ badge this month)
- **New schedule field**: `ScheduleAssignment.is_tasked: bool`
- **API**: `PUT /admin/map-sessions/{session_id}/zones/{zone_id}` with `{assigned_employee_ids: [...]}`
- **Backwards compatible**: `employee.location` kept for monthly scheduling, old sessions use `||[]` fallback
- **Auto-Assign**: Updated to use new zone-based API
- **Clear All**: Clears `assigned_employee_ids=[]` on all zones in session
- **Print**: Updated to show multiple employees per zone + ⚡ icon for tasked employees
- **Session cloning**: New sessions include `assigned_employee_ids: []` on all zones
- **zoneEmployeeMap**: Merge-safe (handles duplicate zone_codes)


- **Forest Night Palette**: Deep emerald-tinted dark inspired by Al-Haram night atmosphere
  - Background: `hsl(160 30% 7%)` — very deep forest green
  - Card surface: `hsl(160 28% 10%)` — slightly lighter surface
  - Primary: `hsl(160 65% 42%)` — brighter emerald for visibility
  - Gold accent unchanged: `#C5A059`
- **Global CSS Overrides**: ~80 rules in index.css targeting all hardcoded Tailwind classes
  - Covers: bg-white, bg-slate-*, bg-gray-*, text-slate-*, border-*, from/to gradients
  - Covers all status colors: emerald, blue, amber, red, violet
  - Shadow overrides (stronger in dark), backdrop/overlay adjustments
- **Component-specific fixes**:
  - Layout.jsx header: `isDark` conditional for `backgroundColor`
  - DailySessionsPage.jsx: `isDark` conditional for tab bar, tab icon/label styles
  - SessionHeader.jsx: `dark:bg-emerald-50`/`dark:bg-amber-50` Tailwind variants
  - Side panels (stats/density/employees): data-testid CSS overrides
  - Bottom navigation: `hsl(var(--card)/0.97)` in dark mode
- **Smooth transitions**: 0.2s ease for all color/background/border properties
- **Scrollbar**: Dark-themed scrollbar (green-tinted track + hover gold)
- **Persistence**: `localStorage.theme` saved across sessions
- **Toggle**: `data-testid="theme-toggle"` Moon/Sun icon in header


- **Bottom Navigation Bar**: Fixed at bottom on mobile/tablet (lg:hidden), 4 nav items + More button
- **Mobile Bottom Nav**: Active indicator (top border + scale), tap More opens full sidebar drawer
- **Map Heights**: CSS variable `--map-container-h` with 3 responsive breakpoints (mobile/tablet/desktop)
- **Prayer Rounds Bar**: Horizontal scroll with snap on mobile (flex overflow-x-auto no-scrollbar), stays as grid on sm+
- **Panels**: 92% width on mobile (vs 40% desktop) with backdrop overlay on touch
- **Archive Sidebar**: Shows BELOW main content on mobile (order-2), before on desktop (lg:order-first)
- **Tab Buttons**: flex-1 instead of min-w-[100px] for equal width on all screens
- **Main Content**: pb-24 lg:pb-6 to avoid bottom nav overlap
- **Header**: Responsive text (text-xl lg:text-2xl), smaller flex gaps on mobile
- **Batch button**: Hidden on mobile (hidden sm:flex), visible on desktop
- **`useIsMobile` hook**: Added to utils.js, used in DensityTab and ZoneEmployeesTab
- **Safe Area**: env(safe-area-inset-bottom) support for iOS devices
- **No Scrollbar**: .no-scrollbar CSS utility class added
- **Glass effect**: .glass CSS class fixed (was broken)

### UI Improvements (Mar 6, 2026)
- "السجل اليومي للمصليات" renamed from "خرائط"
- Tab renamed: "المصليات" (was "الخريطة")
- Tab order: الموظفين - الكثافات - المصليات
- Zoom controls moved inside map canvas as overlay (consistent across all 3 tabs)
- "أشكال" renamed to "إضافة موقع"
- Prayer sessions bar with professional card layout
- Collapsible side panels with fixed handle at panel edge (CSS transform, no layout shift)
- DensityTab image size: fixed using ResizeObserver for accurate container dimensions
- ZoneEmployeesTab: same ResizeObserver fix
- Container heights: `height: var(--map-container-h)` responsive via CSS variable

### Shift Cards in Employees Tab (Mar 6, 2026)
- 4 shift cards in one row (الأولى-الثانية-الثالثة-الرابعة)
- Each card shows: employee count + color dot + shift name + mini avatars
- Click to filter employee list
- "الموظفين حسب الورديات" section header

### Zone Distribution (Mar 6, 2026)
- Removed separate "مواقع بدون تغطية" section
- Zones without coverage shown first + red badge indicator
- Count badge in distribution header

## Key API Endpoints
- `POST /api/admin/map-sessions` - supports `session_type`, `prayer`, `parent_session_id`
- `GET /api/map-sessions?parent_session_id=X` - get prayer sub-sessions
- `GET /api/map-sessions?floor_id=X` - daily sessions only (excludes prayer sessions by default)
- `PUT /api/zone-categories/{id}` - propagates to all zones
- `POST /api/auth/setup` - one-time admin setup

## Key DB Schema
- `map_sessions.session_type`: "daily" | "prayer"
- `map_sessions.prayer`: null | "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | "taraweeh"
- `map_sessions.parent_session_id`: null | ID of parent daily session
- `zones.prayer_counts`: {fajr: 0, dhuhr: 0, ...} per-prayer occupancy counts

## Credentials
- Admin: admin@crowd.sa / admin123

## Upcoming Tasks (Backlog)
- **P0 (مهمة جداً): إعادة هيكلة نظام تعيين الموظفين**
  - التحول من `employee.location` (نص واحد) إلى `zone.employee_ids[]` (قائمة في الجلسة)
  - موظف واحد يغطي أكثر من منطقة في نفس الجولة ✅
  - منطقة واحدة بأكثر من موظف ✅
  - التوزيع مرتبط بالجلسة (محلي) وليس بالموظف عالمياً
  - واجهة: [ط-32 ✕] [ط-33 ✕] [+ إضافة موقع] للموظف + عرض موظفي المنطقة مع حذف فردي
- P0: حذف جولة صلاة (delete prayer session button)
- P1: Professional Gate Management View - Compact Table + Grouped by Plaza (200+ gates)
- P1: Advanced Role Hierarchy (5-level RBAC)
- P1: Live Haram Map (unified real-time heatmap)
- P1: Smart Alert System with escalations
- P1: Tour Mode for Gates (mobile flashcard UI)
- P2: Rotate Rests feature for monthly scheduling
- P2: Field Supervisor Mobile Mode
- Blocked: Automatic Area Calculation (needs map with scale)
