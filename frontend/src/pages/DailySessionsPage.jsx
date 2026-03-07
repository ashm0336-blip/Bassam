import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
  Plus, Calendar as CalendarIcon, Layers, Eye, MapPin, Activity,
  CalendarRange, Users, BarChart3, PanelLeftClose, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "sonner";

import { API, ZONE_TYPES_FALLBACK, DRAG_SHAPE_MODES, PRAYER_TIMES } from "./DailySessions/constants";
import {
  getAuthHeaders, normalizeImageUrl, smoothPoints, simplifyPoints,
  generateShapeFromDrag, getDensityLevel, formatDate,
} from "./DailySessions/utils";

import { SessionSidebar } from "./DailySessions/components/SessionSidebar";
import { ArchiveSidebar } from "@/components/shared/ArchiveSidebar";
import { SessionHeader } from "./DailySessions/components/SessionHeader";
import { MapToolbar } from "./DailySessions/components/MapToolbar";
import { MapCanvas } from "./DailySessions/components/MapCanvas";
import { ChangesLog } from "./DailySessions/components/MapZoneCards";
import { DensityTab } from "./DailySessions/components/DensityTab";
import { MapStatsPanel } from "./DailySessions/components/MapStatsPanel";
import {
  NewSessionDialog, BatchDialog, ZoneEditDialog, NewZoneDialog,
  NotesDialog, CompareDialog,
} from "./DailySessions/components/Dialogs";
import { ZoneEmployeesTab } from "./DailySessions/components/ZoneEmployeesTab";

export default function DailySessionsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { isDark } = useTheme();

  // Core state
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [activeDailySession, setActiveDailySession] = useState(null); // the parent daily session
  const [prayerSessions, setPrayerSessions] = useState({}); // prayer key → session
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ZONE_TYPES, setZoneTypes] = useState(ZONE_TYPES_FALLBACK);

  // UI state
  const [activeTab, setActiveTab] = useState("map");
  const [selectedZone, setSelectedZone] = useState(null);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const zoneCardsRef = useRef({});
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const [densityPanelCollapsed, setDensityPanelCollapsed] = useState(false);
  const [employeesPanelCollapsed, setEmployeesPanelCollapsed] = useState(false);
  const [bypassConfirm, setBypassConfirm] = useState(null); // prayer key awaiting bypass confirmation

  // New session form state
  const [newSessionDate, setNewSessionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [cloneSource, setCloneSource] = useState("auto");
  const [batchStartDate, setBatchStartDate] = useState("");
  const [batchEndDate, setBatchEndDate] = useState("");
  const [batchCloneSource, setBatchCloneSource] = useState("master");

  // Map state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [imgRatio, setImgRatio] = useState(null);
  const zoomRef = useRef(1);
  const mapContainerRef = useRef(null);
  const svgRef = useRef(null);

  // Drawing state
  const [mapMode, setMapMode] = useState("edit");
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [nearStart, setNearStart] = useState(false);
  const [showNewZoneDialog, setShowNewZoneDialog] = useState(false);
  const [newZoneForm, setNewZoneForm] = useState({ zone_code: "", name_ar: "", name_en: "", zone_type: "men_prayer", fill_color: "#22c55e", area_sqm: 0, per_person_sqm: 0.8, max_capacity: 0, length_m: "", width_m: "", carpet_length: "1.2", carpet_width: "0.7", daily_note: "" });
  const [rectStart, setRectStart] = useState(null);
  const [rectEnd, setRectEnd] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isDraggingZone, setIsDraggingZone] = useState(false);
  const [dragZoneStart, setDragZoneStart] = useState(null);
  const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);
  const [freehandPoints, setFreehandPoints] = useState([]);

  // Undo/Redo stacks for drawing
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Global map undo/redo (zone edits: move, rotate, smooth, style, etc.)
  const [mapUndoStack, setMapUndoStack] = useState([]);
  const [mapRedoStack, setMapRedoStack] = useState([]);
  const preEditRef = useRef(null); // captures zone state before drag/rotate/move

  // Density state
  const [densityEdits, setDensityEdits] = useState({});
  const [savingDensity, setSavingDensity] = useState(false);
  const [activePrayer, setActivePrayer] = useState("fajr");

  // ─── Drawing Undo/Redo ────────────────────────────────────
  const addDrawingPoint = useCallback((point) => {
    setUndoStack(prev => [...prev, drawingPoints]);
    setRedoStack([]);
    setDrawingPoints(prev => [...prev, point]);
  }, [drawingPoints]);

  const undoDrawing = useCallback(() => {
    if (undoStack.length === 0) return;
    setRedoStack(prev => [...prev, drawingPoints]);
    setDrawingPoints(undoStack[undoStack.length - 1]);
    setUndoStack(prev => prev.slice(0, -1));
  }, [undoStack, drawingPoints]);

  const redoDrawing = useCallback(() => {
    if (redoStack.length === 0) return;
    setUndoStack(prev => [...prev, drawingPoints]);
    setDrawingPoints(redoStack[redoStack.length - 1]);
    setRedoStack(prev => prev.slice(0, -1));
  }, [redoStack, drawingPoints]);

  const clearDrawing = useCallback(() => {
    if (drawingPoints.length > 0) setUndoStack(prev => [...prev, drawingPoints]);
    setRedoStack([]);
    setDrawingPoints([]);
  }, [drawingPoints]);

  // ─── Global Map Undo/Redo ─────────────────────────────────
  // Called when drag/rotate/move starts to capture "before" state
  const onEditStart = useCallback((zoneId) => {
    const zone = (activeSession?.zones || []).find(z => z.id === zoneId);
    if (zone) preEditRef.current = { zoneId, prevPoints: [...zone.polygon_points] };
  }, [activeSession]);

  // Called after mouseUp saves zone - pushes to undo stack
  const commitZoneEdit = useCallback((label) => {
    if (!preEditRef.current) return;
    const { zoneId, prevPoints } = preEditRef.current;
    const zone = (activeSession?.zones || []).find(z => z.id === zoneId);
    if (zone) {
      setMapUndoStack(prev => [...prev.slice(-29), { zoneId, prevData: { polygon_points: prevPoints }, nextData: { polygon_points: [...zone.polygon_points] }, label }]);
      setMapRedoStack([]);
    }
    preEditRef.current = null;
  }, [activeSession]);

  // Push any zone change to undo (for smooth, style, remove, etc.)
  const pushZoneUndo = useCallback((zoneId, prevData, nextData, label) => {
    setMapUndoStack(prev => [...prev.slice(-29), { zoneId, prevData, nextData, label }]);
    setMapRedoStack([]);
  }, []);

  const undoMapAction = useCallback(async () => {
    if (mapUndoStack.length === 0 || !activeSession) return;
    const action = mapUndoStack[mapUndoStack.length - 1];
    try {
      const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}/zones/${action.zoneId}`, action.prevData, getAuthHeaders());
      setActiveSession(res.data);
      setMapRedoStack(prev => [...prev, action]);
      setMapUndoStack(prev => prev.slice(0, -1));
      toast.success(isAr ? "تم التراجع" : "Undone");
    } catch { toast.error(isAr ? "تعذر التراجع" : "Undo failed"); }
  }, [mapUndoStack, activeSession, isAr]);

  const redoMapAction = useCallback(async () => {
    if (mapRedoStack.length === 0 || !activeSession) return;
    const action = mapRedoStack[mapRedoStack.length - 1];
    try {
      const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}/zones/${action.zoneId}`, action.nextData, getAuthHeaders());
      setActiveSession(res.data);
      setMapUndoStack(prev => [...prev, action]);
      setMapRedoStack(prev => prev.slice(0, -1));
      toast.success(isAr ? "تم الإعادة" : "Redone");
    } catch { toast.error(isAr ? "تعذرت الإعادة" : "Redo failed"); }
  }, [mapRedoStack, activeSession, isAr]);

  // ─── Data Fetching ────────────────────────────────────────
  const fetchFloors = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/floors`);
      const normalized = res.data.map(f => ({ ...f, image_url: normalizeImageUrl(f.image_url) }));
      setFloors(normalized);
      normalized.forEach(f => { if (f.image_url) { const img = new Image(); img.src = f.image_url; } });
      if (!selectedFloor && normalized.length > 0) setSelectedFloor(normalized[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchSessions = useCallback(async () => {
    if (!selectedFloor) return;
    try {
      const res = await axios.get(`${API}/map-sessions?floor_id=${selectedFloor.id}`);
      setSessions(res.data);
    } catch (e) { console.error(e); }
  }, [selectedFloor]);

  // Fetch prayer sub-sessions for a daily session
  const fetchPrayerSessions = useCallback(async (parentSessionId) => {
    try {
      const res = await axios.get(`${API}/map-sessions?parent_session_id=${parentSessionId}`);
      const map = {};
      res.data.forEach(s => { if (s.prayer) map[s.prayer] = s; });
      setPrayerSessions(map);
    } catch (e) { console.error(e); }
  }, []);

  // Start a prayer session (create or load existing)
  const handleSelectPrayer = useCallback(async (prayerKey) => {
    if (!activeDailySession) return;
    setActivePrayer(prayerKey);

    const existing = prayerSessions[prayerKey];
    if (existing) {
      // Load existing prayer session
      try {
        const res = await axios.get(`${API}/map-sessions/${existing.id}`, getAuthHeaders());
        setActiveSession(res.data);
        setZoom(1); setPanOffset({ x: 0, y: 0 }); zoomRef.current = 1;
      } catch { setActiveSession(existing); }
    }
    // If no prayer session yet, stay on daily session but highlight the prayer
  }, [activeDailySession, prayerSessions]);

  // Start/create a new prayer session
  const handleStartPrayerSession = useCallback(async (prayerKey) => {
    if (!activeDailySession || !selectedFloor) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/admin/map-sessions`, {
        date: activeDailySession.date,
        floor_id: selectedFloor.id,
        session_type: "prayer",
        prayer: prayerKey,
        parent_session_id: activeDailySession.id,
      }, getAuthHeaders());
      const newSession = res.data;
      setPrayerSessions(prev => ({ ...prev, [prayerKey]: newSession }));
      setActiveSession(newSession);
      setActivePrayer(prayerKey);
      setZoom(1); setPanOffset({ x: 0, y: 0 }); zoomRef.current = 1;
      toast.success(isAr ? `تم بدء جولة ${prayerKey === 'fajr' ? 'الفجر' : prayerKey}` : `Started ${prayerKey} session`);
    } catch (e) {
      toast.error(e.response?.data?.detail || (isAr ? "تعذر إنشاء الجلسة" : "Error"));
    } finally { setSaving(false); }
  }, [activeDailySession, selectedFloor, isAr]);

  // Return to daily session view
  const handleBackToDaily = useCallback(() => {
    if (activeDailySession) {
      setActiveSession(activeDailySession);
      setZoom(1); setPanOffset({ x: 0, y: 0 }); zoomRef.current = 1;
    }
  }, [activeDailySession]);

  // Skip a prayer session (mark as skipped, doesn't block next prayer)
  const handleSkipPrayerSession = useCallback(async (prayerKey) => {
    if (!activeDailySession || !selectedFloor) return;
    setSaving(true);
    try {
      // Create session with status "skipped"
      const res = await axios.post(`${API}/admin/map-sessions`, {
        date: activeDailySession.date,
        floor_id: selectedFloor.id,
        session_type: "prayer",
        prayer: prayerKey,
        parent_session_id: activeDailySession.id,
      }, getAuthHeaders());
      // Immediately mark as skipped
      const skipped = await axios.put(`${API}/admin/map-sessions/${res.data.id}`, { status: "skipped" }, getAuthHeaders());
      setPrayerSessions(prev => ({ ...prev, [prayerKey]: skipped.data }));
      setBypassConfirm(null);
      const pt = PRAYER_TIMES.find(p => p.key === prayerKey);
      toast.success(isAr ? `تم تجاوز صلاة ${pt?.label_ar}` : `${pt?.label_en} skipped`);
    } catch (e) {
      toast.error(e.response?.data?.detail || (isAr ? "تعذرت العملية" : "Error"));
    } finally { setSaving(false); }
  }, [activeDailySession, selectedFloor, isAr]);

  // Un-skip: convert skipped session back to draft for editing
  const handleUnskipPrayerSession = useCallback(async (prayerKey) => {
    const ps = prayerSessions[prayerKey];
    if (!ps) return;
    try {
      const res = await axios.put(`${API}/admin/map-sessions/${ps.id}`, { status: "draft" }, getAuthHeaders());
      setPrayerSessions(prev => ({ ...prev, [prayerKey]: res.data }));
      // Load the session for editing
      setActiveSession(res.data);
      setActivePrayer(prayerKey);
      setZoom(1); setPanOffset({ x: 0, y: 0 }); zoomRef.current = 1;
      const pt = PRAYER_TIMES.find(p => p.key === prayerKey);
      toast.success(isAr ? `تم فك تجاوز ${pt?.label_ar}` : `${pt?.label_en} unskipped`);
    } catch (e) {
      toast.error(isAr ? "تعذرت العملية" : "Error");
    }
  }, [prayerSessions, isAr]);

  useEffect(() => { fetchFloors(); }, [fetchFloors]);
  useEffect(() => { axios.get(`${API}/zone-categories`).then(res => { if (res.data?.length > 0) setZoneTypes(res.data); }).catch(() => {}); }, []);
  useEffect(() => { if (selectedFloor) { fetchSessions(); setActiveSession(null); setImgRatio(null); } }, [selectedFloor, fetchSessions]);

  // Wheel + Pinch zoom callback
  const wheelRef = useCallback((node) => {
    if (!node) return;
    mapContainerRef.current = node;
    const handler = (e) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const prev = zoomRef.current;
      const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const nz = Math.max(0.3, Math.min(20, prev * delta));
      const s = nz / prev;
      zoomRef.current = nz; setZoom(nz);
      setPanOffset(p => ({ x: mx - s * (mx - p.x), y: my - s * (my - p.y) }));
    };
    // Pinch-to-zoom + single-touch scroll prevention
    let pinchDist = null, pinchZoom = null;
    const dist = (a, b) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const onTs = (e) => { if (e.touches.length === 2) { e.preventDefault(); pinchDist = dist(e.touches[0], e.touches[1]); pinchZoom = zoomRef.current; } };
    const onTm = (e) => {
      if (e.touches.length === 2 && pinchDist) {
        e.preventDefault();
        const d = dist(e.touches[0], e.touches[1]);
        const rect = node.getBoundingClientRect();
        const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
        const cy = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
        const prev = zoomRef.current;
        const nz = Math.max(0.3, Math.min(20, pinchZoom * (d / pinchDist)));
        const s = nz / prev;
        zoomRef.current = nz; setZoom(nz);
        setPanOffset(p => ({ x: cx - s * (cx - p.x), y: cy - s * (cy - p.y) }));
      } else if (e.touches.length === 1) {
        // Prevent browser scroll during single-finger interaction (non-passive handler)
        e.preventDefault();
      }
    };
    const onTe = (e) => { if (e.touches.length < 2) { pinchDist = null; pinchZoom = null; } };
    node.addEventListener("wheel", handler, { passive: false });
    node.addEventListener("touchstart", onTs, { passive: false });
    node.addEventListener("touchmove", onTm, { passive: false });
    node.addEventListener("touchend", onTe);
    return () => { node.removeEventListener("wheel", handler); node.removeEventListener("touchstart", onTs); node.removeEventListener("touchmove", onTm); node.removeEventListener("touchend", onTe); };
  }, []);

  // ─── Session Handlers ─────────────────────────────────────
  const resolveCloneFrom = () => {
    if (cloneSource === "auto") return sessions.length > 0 ? sessions[0].id : "master";
    return cloneSource;
  };

  const handleCreateSession = async () => {
    if (!selectedFloor) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/admin/map-sessions`, { date: newSessionDate, floor_id: selectedFloor.id, clone_from: resolveCloneFrom() }, getAuthHeaders());
      setActiveSession(res.data); await fetchSessions(); setShowNewSessionDialog(false);
      toast.success(isAr ? "تم بدء جولة جديدة" : "New tour started");
    } catch (e) { toast.error(e.response?.data?.detail || (isAr ? "تعذر إنشاء الجلسة" : "Error")); }
    finally { setSaving(false); }
  };

  const handleBatchCreate = async () => {
    if (!selectedFloor || !batchStartDate || !batchEndDate) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/admin/map-sessions/batch`, { start_date: batchStartDate, end_date: batchEndDate, floor_id: selectedFloor.id, clone_from: batchCloneSource }, getAuthHeaders());
      await fetchSessions(); setShowBatchDialog(false);
      toast.success(isAr ? `تم إنشاء ${res.data.total_created} جلسة${res.data.total_skipped > 0 ? ` (تم تخطي ${res.data.total_skipped} أيام موجودة مسبقاً)` : ""}` : `Created ${res.data.total_created} sessions${res.data.total_skipped > 0 ? ` (${res.data.total_skipped} skipped)` : ""}`);
    } catch (e) { toast.error(e.response?.data?.detail || (isAr ? "تعذر الإنشاء" : "Error")); }
    finally { setSaving(false); }
  };

  const handleUpdateSession = async (updateData) => {
    if (!activeSession) return;
    try {
      const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}`, updateData, getAuthHeaders());
      setActiveSession(res.data);
      if (updateData.status) { setMapMode("edit"); setSelectedZoneId(null); setDrawingPoints([]); }
      // If this is a prayer session, refresh prayer sessions bar to reflect new status
      if (activeSession.session_type === "prayer" && activeSession.prayer && activeDailySession) {
        setPrayerSessions(prev => ({ ...prev, [activeSession.prayer]: res.data }));
      }
      fetchSessions();
      toast.success(isAr ? "تم الحفظ" : "Saved");
    } catch (e) { toast.error(isAr ? "تعذر الحفظ" : "Save failed"); }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await axios.delete(`${API}/admin/map-sessions/${sessionId}`, getAuthHeaders());
      if (activeSession?.id === sessionId) setActiveSession(null);
      fetchSessions();
      toast.success(isAr ? "تم الحذف" : "Deleted");
    } catch (e) { toast.error(isAr ? "تعذر الحذف" : "Delete failed"); }
  };

  const handleCompare = async (sessionId) => {
    if (!activeSession) return;
    try {
      const res = await axios.get(`${API}/map-sessions/compare/${activeSession.id}/${sessionId}`);
      setCompareData(res.data); setShowCompareDialog(true);
    } catch (e) { toast.error(isAr ? "تعذرت المقارنة" : "Compare failed"); }
  };

  // ─── Zone Handlers ────────────────────────────────────────
  const handleUpdateZone = async (zoneId, updateData) => {
    if (!activeSession) return;
    try {
      const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}/zones/${zoneId}`, updateData, getAuthHeaders());
      setActiveSession(res.data);
      toast.success(isAr ? "تم التحديث" : "Updated");
    } catch (e) { toast.error(isAr ? "تعذر التحديث" : "Update failed"); }
  };

  const handleCategoryChange = async (zoneId, newType) => {
    const typeInfo = ZONE_TYPES.find(t => t.value === newType);
    await handleUpdateZone(zoneId, {
      zone_type: newType,
      fill_color: typeInfo?.color || "#22c55e",
      fill_type: typeInfo?.fill_type || "solid",
      pattern_type: typeInfo?.pattern_type || null,
      pattern_fg_color: typeInfo?.pattern_fg_color || null,
      pattern_bg_color: typeInfo?.pattern_bg_color || null,
      stroke_color: typeInfo?.stroke_color || "#000000",
      stroke_width: typeInfo?.stroke_width ?? 0.3,
      stroke_style: typeInfo?.stroke_style || "dashed",
      stroke_opacity: typeInfo?.stroke_opacity ?? 1.0,
    });
  };

  const handleToggleRemove = async (zoneId, currentlyRemoved) => {
    await handleUpdateZone(zoneId, { is_removed: !currentlyRemoved });
  };

  const handleUpdateZoneStyle = async (zoneId, styleData) => {
    if (!activeSession) return;
    const zone = sessionZones.find(z => z.id === zoneId);
    if (zone) {
      const prevData = {}; const nextData = {};
      Object.keys(styleData).forEach(k => { prevData[k] = zone[k]; nextData[k] = styleData[k]; });
      pushZoneUndo(zoneId, prevData, nextData, isAr ? "تنسيق" : "Style");
    }
    try {
      const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}/zones/${zoneId}`, styleData, getAuthHeaders());
      setActiveSession(res.data);
    } catch (e) { console.error(e); }
  };

  const handleSmoothZone = async () => {
    if (!activeSession || !selectedZoneId) return;
    const zone = sessionZones.find(z => z.id === selectedZoneId);
    if (!zone?.polygon_points || zone.polygon_points.length < 3) return;
    const smoothed = smoothPoints(zone.polygon_points, 2);
    pushZoneUndo(selectedZoneId, { polygon_points: zone.polygon_points }, { polygon_points: smoothed }, isAr ? "تنعيم" : "Smooth");
    try {
      const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}/zones/${selectedZoneId}`, { polygon_points: smoothed }, getAuthHeaders());
      setActiveSession(res.data);
      toast.success(isAr ? "تم تنعيم الزوايا" : "Corners smoothed");
    } catch (e) { toast.error(isAr ? "تعذر التنعيم" : "Smooth failed"); }
  };

  const handleCopyZone = async () => {
    if (!activeSession || !selectedZoneId) return;
    const zone = sessionZones.find(z => z.id === selectedZoneId);
    if (!zone) return;
    const newPoints = zone.polygon_points.map(p => ({ x: p.x + 4, y: p.y + 4 }));
    try {
      const res = await axios.post(`${API}/admin/map-sessions/${activeSession.id}/zones`, {
        zone_code: zone.zone_code + "-copy", name_ar: zone.name_ar + " (نسخة)", name_en: (zone.name_en || "") + " (copy)",
        zone_type: zone.zone_type, polygon_points: newPoints, fill_color: zone.fill_color,
        stroke_color: zone.stroke_color || "#000000", stroke_style: zone.stroke_style || "dashed",
        opacity: zone.opacity ?? 0.4, stroke_opacity: zone.stroke_opacity ?? 1,
        fill_type: zone.fill_type || "solid", pattern_type: zone.pattern_type || null,
        pattern_fg_color: zone.pattern_fg_color || "#000000", pattern_bg_color: zone.pattern_bg_color || "#ffffff",
      }, getAuthHeaders());
      setActiveSession(res.data);
      toast.success(isAr ? "تم نسخ المنطقة" : "Zone copied");
    } catch (e) { toast.error(isAr ? "تعذر النسخ" : "Copy failed"); }
  };

  // Delete a single vertex point from a zone (double-click)
  const handleDeletePoint = async (zoneId, pointIndex) => {
    const zone = sessionZones.find(z => z.id === zoneId);
    if (!zone?.polygon_points || zone.polygon_points.length <= 3) return;
    const newPoints = zone.polygon_points.filter((_, i) => i !== pointIndex);
    pushZoneUndo(zoneId, { polygon_points: zone.polygon_points }, { polygon_points: newPoints }, isAr ? "حذف نقطة" : "Delete Point");
    try {
      const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}/zones/${zoneId}`, { polygon_points: newPoints }, getAuthHeaders());
      setActiveSession(res.data);
      toast.success(isAr ? "تم حذف النقطة" : "Point deleted");
    } catch (e) { toast.error(isAr ? "تعذر الحذف" : "Delete failed"); }
  };

  const handleSaveNewZone = async () => {
    if (!activeSession || drawingPoints.length < 3) return;
    const typeInfo = ZONE_TYPES.find(t => t.value === newZoneForm.zone_type);
    try {
      const res = await axios.post(`${API}/admin/map-sessions/${activeSession.id}/zones`, {
        zone_code: newZoneForm.zone_code || `Z-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        name_ar: newZoneForm.name_ar || (isAr ? typeInfo?.label_ar : typeInfo?.label_en) || "منطقة جديدة",
        name_en: newZoneForm.name_en || typeInfo?.label_en || "New Zone",
        zone_type: newZoneForm.zone_type, polygon_points: drawingPoints,
        fill_color: typeInfo?.color || newZoneForm.fill_color,
        fill_type: typeInfo?.fill_type || "solid",
        pattern_type: typeInfo?.pattern_type || null,
        pattern_fg_color: typeInfo?.pattern_fg_color || null,
        pattern_bg_color: typeInfo?.pattern_bg_color || null,
        stroke_color: typeInfo?.stroke_color || "#000000",
        stroke_width: typeInfo?.stroke_width ?? 0.3,
        stroke_style: typeInfo?.stroke_style || "dashed",
        stroke_opacity: typeInfo?.stroke_opacity ?? 1.0,
        opacity: 0.4,
        area_sqm: newZoneForm.area_sqm || 0, per_person_sqm: newZoneForm.per_person_sqm || 0.8, max_capacity: newZoneForm.max_capacity || 0,
        length_m: newZoneForm.length_m || 0, width_m: newZoneForm.width_m || 0,
        carpet_length: newZoneForm.carpet_length || 1.2, carpet_width: newZoneForm.carpet_width || 0.7,
        daily_note: newZoneForm.daily_note || "",
      }, getAuthHeaders());
      setActiveSession(res.data); setShowNewZoneDialog(false); setDrawingPoints([]);
      setNewZoneForm({ zone_code: "", name_ar: "", name_en: "", zone_type: "men_prayer", fill_color: "#22c55e", area_sqm: 0, per_person_sqm: 0.8, max_capacity: 0, length_m: "", width_m: "", carpet_length: "1.2", carpet_width: "0.7", daily_note: "" });
      setMapMode("edit");
      toast.success(isAr ? "تم إضافة المنطقة" : "Zone added");
    } catch (e) { toast.error(isAr ? "تعذرت الإضافة" : "Error adding zone"); }
  };

  // Map mouse up handler (shared between MapCanvas callback and save logic)
  const handleMapMouseUp = async () => {
    // Unified drag shape handler (rect, circle, ellipse, triangle, pentagon, etc.)
    if (DRAG_SHAPE_MODES.includes(mapMode) && rectStart && rectEnd) {
      const pts = generateShapeFromDrag(mapMode, rectStart, rectEnd);
      if (pts) { setDrawingPoints(pts); setShowNewZoneDialog(true); }
      setRectStart(null); setRectEnd(null); return;
    }
    if (mapMode === "freehand" && isDrawingFreehand && freehandPoints.length > 5) {
      const simplified = simplifyPoints(freehandPoints, 0.4);
      if (simplified.length >= 3) { setDrawingPoints(simplified); setShowNewZoneDialog(true); }
      setIsDrawingFreehand(false); setFreehandPoints([]); return;
    }
    setIsDrawingFreehand(false); setFreehandPoints([]);

    const needsSave = (draggingPoint !== null || isRotating || isDraggingZone) && selectedZoneId;
    if (needsSave) {
      const zone = sessionZones.find(z => z.id === selectedZoneId);
      if (zone) {
        try {
          const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}/zones/${selectedZoneId}`, { polygon_points: zone.polygon_points }, getAuthHeaders());
          setActiveSession(res.data);
          commitZoneEdit(draggingPoint !== null ? (isAr ? "تعديل نقطة" : "Edit Point") : isRotating ? (isAr ? "تدوير" : "Rotate") : (isAr ? "تحريك" : "Move"));
        } catch (e) { console.error(e); }
      }
    }
    setIsPanning(false); setDraggingPoint(null); setHoveredPoint(null);
    setIsRotating(false); setIsDraggingZone(false); setDragZoneStart(null);
  };

  // ─── Effects ──────────────────────────────────────────────
  useEffect(() => {
    if (!activeSession || activeSession.status === "completed") {
      setMapMode("edit"); setSelectedZoneId(null); setDrawingPoints([]); setRectStart(null); setFreehandPoints([]);
      setMapUndoStack([]); setMapRedoStack([]);
      setUndoStack([]); setRedoStack([]);
    }
  }, [activeSession?.id, activeSession?.status]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z = Undo, Ctrl+Y or Ctrl+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (mapMode === "draw" && undoStack.length > 0) undoDrawing();
        else if (mapUndoStack.length > 0) undoMapAction();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (mapMode === "draw" && redoStack.length > 0) redoDrawing();
        else if (mapRedoStack.length > 0) redoMapAction();
        return;
      }
      if (e.key === "Escape") {
        if (rectStart) { setRectStart(null); setRectEnd(null); }
        else if (drawingPoints.length > 0) { setDrawingPoints([]); setNearStart(false); }
        else if (selectedZoneId) setSelectedZoneId(null);
        else if (DRAG_SHAPE_MODES.includes(mapMode) || mapMode === "draw" || mapMode === "freehand") setMapMode("edit");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawingPoints.length, selectedZoneId, mapMode, rectStart, undoStack.length, redoStack.length, mapUndoStack.length, mapRedoStack.length, undoDrawing, redoDrawing, undoMapAction, redoMapAction]);

  useEffect(() => { setDensityEdits({}); }, [activeSession?.id]);

  // ─── Density Handlers ─────────────────────────────────────
  const handleDensityChange = (zoneId, field, value, prayerOverride = null) => {
    const prayer = prayerOverride || activePrayer;
    if (field === "prayer_count") {
      setDensityEdits(prev => ({ ...prev, [zoneId]: { ...prev[zoneId], prayer_counts: { ...(prev[zoneId]?.prayer_counts || {}), [prayer]: value } } }));
    } else {
      setDensityEdits(prev => ({ ...prev, [zoneId]: { ...prev[zoneId], [field]: value } }));
    }
  };

  const handleSaveDensityBatch = async () => {
    if (!activeSession || Object.keys(densityEdits).length === 0) return;
    setSavingDensity(true);
    try {
      const updates = Object.entries(densityEdits).map(([zone_id, edits]) => {
        const upd = { zone_id };
        if (edits.prayer_counts) {
          const zone = activeSession.zones?.find(z => z.id === zone_id);
          const existing = zone?.prayer_counts || { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, taraweeh: 0 };
          upd.prayer_counts = { ...existing, ...edits.prayer_counts };
        }
        if (edits.current_count !== undefined) upd.current_count = edits.current_count;
        if (edits.max_capacity !== undefined) upd.max_capacity = edits.max_capacity;
        return upd;
      });
      const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}/density-batch`, { updates }, getAuthHeaders());
      setActiveSession(res.data); setDensityEdits({}); await fetchSessions();
      toast.success(isAr ? "تم حفظ بيانات الكثافة" : "Density data saved");
    } catch (e) { toast.error(isAr ? "تعذر حفظ البيانات" : "Save failed"); }
    finally { setSavingDensity(false); }
  };

  // ─── Computed Values ──────────────────────────────────────
  const sessionZones = activeSession?.zones || [];
  const activeZones = activeSession?.zones?.filter(z => !z.is_removed) || [];
  const removedZones = activeSession?.zones?.filter(z => z.is_removed) || [];
  const changedZones = activeSession?.zones?.filter(z => z.change_type && z.change_type !== "unchanged") || [];

  const sessionStats = useMemo(() => {
    if (!activeSession?.zones) return null;
    const active = activeSession.zones.filter(z => !z.is_removed);
    const removed = activeSession.zones.filter(z => z.is_removed);
    const catCounts = {};
    ZONE_TYPES.forEach(t => { catCounts[t.value] = 0; });
    active.forEach(z => { catCounts[z.zone_type] = (catCounts[z.zone_type] || 0) + 1; });
    const sortedSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
    const curIdx = sortedSessions.findIndex(s => s.id === activeSession.id);
    const prevSession = curIdx >= 0 && curIdx < sortedSessions.length - 1 ? sortedSessions[curIdx + 1] : null;
    const prevCatCounts = {};
    let prevTotalActive = 0;
    if (prevSession?.zones) {
      const prevActive = prevSession.zones.filter(z => !z.is_removed);
      prevTotalActive = prevActive.length;
      ZONE_TYPES.forEach(t => { prevCatCounts[t.value] = 0; });
      prevActive.forEach(z => { prevCatCounts[z.zone_type] = (prevCatCounts[z.zone_type] || 0) + 1; });
    }
    const activeCats = ZONE_TYPES.filter(t => catCounts[t.value] > 0);
    // Total area
    const totalArea = active.reduce((sum, z) => sum + (z.area_sqm || 0), 0);
    // Average worshippers (average of max prayer count per zone across all prayers)
    const avgWorshippers = active.length > 0 ? Math.round(active.reduce((sum, z) => {
      const pc = z.prayer_counts || {};
      const vals = Object.values(pc).filter(v => typeof v === 'number' && v > 0);
      return sum + (vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
    }, 0) / active.length) : 0;
    // Average safe capacity per zone (area / 0.75)
    const avgCapacity = active.length > 0 ? Math.round(active.reduce((sum, z) => {
      const area = z.area_sqm || 0;
      return sum + (area > 0 ? Math.round(area / 0.75) : 0);
    }, 0) / active.length) : 0;
    return { totalActive: active.length, totalRemoved: removed.length, totalAll: activeSession.zones.length, uniqueCategories: activeCats.length, catCounts, prevSession, prevCatCounts, prevTotalActive, hasPrevious: !!prevSession && Object.keys(prevCatCounts).length > 0, activeCats, totalArea, avgWorshippers, avgCapacity };
  }, [activeSession, sessions, ZONE_TYPES]);

  const densityStats = useMemo(() => {
    if (!activeSession?.zones) return null;
    const active = activeSession.zones.filter(z => !z.is_removed);
    let totalCurrent = 0, totalCapacity = 0, criticalCount = 0, highCount = 0, mediumCount = 0, safeCount = 0;
    const zonesDensity = active.map(z => {
      const area = z.area_sqm || 0;
      const capMax = area > 0 ? Math.round(area / 0.55) : (z.max_capacity || 1000);
      const capSafe = area > 0 ? Math.round(area / 0.75) : Math.round(capMax * 0.73);
      const capMedium = area > 0 ? Math.round(area / 0.60) : Math.round(capMax * 0.92);
      const prayerCounts = z.prayer_counts || { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, taraweeh: 0 };
      const editedPrayers = densityEdits[z.id]?.prayer_counts || {};
      const currentPrayerCount = editedPrayers[activePrayer] ?? prayerCounts[activePrayer] ?? 0;
      const fillPct = Math.min(currentPrayerCount, 120);
      const actualCount = capMax > 0 ? Math.round((fillPct / 100) * capMax) : 0;
      totalCurrent += actualCount; totalCapacity += capMax;
      const info = getDensityLevel(actualCount, capMax, area);
      const cl = z.carpet_length || 1.2, cw = z.carpet_width || 0.7;
      const zl = z.length_m || 0, zw = z.width_m || 0;
      const totalRows = zl > 0 ? Math.floor(zl / cl) : 0;
      const carpetsPerRow = zw > 0 ? Math.floor(zw / cw) : 0;
      const totalCarpets = totalRows * carpetsPerRow;
      const filledRows = totalRows > 0 ? Math.round((fillPct / 100) * totalRows) : 0;
      if (info.level === "critical") criticalCount++;
      if (info.level === "high") highCount++;
      if (info.level === "medium") mediumCount++;
      if (info.level === "safe") safeCount++;
      return { ...z, fillPct, actualCount, capMax, capSafe, capMedium, currentDisplay: actualCount, maxDisplay: capMax, densityInfo: info, prayerCounts: { ...prayerCounts, ...editedPrayers }, totalRows, carpetsPerRow, totalCarpets, filledRows };
    });
    const overallPct = totalCapacity > 0 ? Math.round((totalCurrent / totalCapacity) * 100) : 0;
    const overallLevel = getDensityLevel(totalCurrent, totalCapacity);
    return { zonesDensity, totalCurrent, totalCapacity, overallPct, overallLevel, criticalCount, highCount, mediumCount, safeCount, totalZones: active.length };
  }, [activeSession, densityEdits, activePrayer]);

  // ─── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="sessions-loading">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto flex items-center justify-center mb-3 animate-pulse"><CalendarIcon className="w-6 h-6 text-primary" /></div>
          <p className="text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-5" data-testid="daily-sessions-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 lg:gap-4">
        <div>
          <h1 className="font-cairo font-bold text-xl lg:text-2xl" data-testid="page-title">{isAr ? "السجل اليومي للمصليات" : "Daily Prayer Areas Log"}</h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">{isAr ? "تتبع التغييرات اليومية للمصليات والمناطق في كل طابق" : "Track daily changes to prayer areas and zones per floor"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedFloor?.id || ""} onValueChange={(v) => setSelectedFloor(floors.find(f => f.id === v))}>
            <SelectTrigger className="w-36 lg:w-44" data-testid="floor-select"><Layers className="w-4 h-4 ml-1" /><SelectValue placeholder={isAr ? "اختر الطابق" : "Select floor"} /></SelectTrigger>
            <SelectContent>{floors.map(f => <SelectItem key={f.id} value={f.id} data-testid={`floor-option-${f.id}`}>{isAr ? f.name_ar : f.name_en}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => { setCloneSource("auto"); setNewSessionDate(today); setShowNewSessionDialog(true); }} disabled={!selectedFloor} data-testid="start-new-tour-btn" className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 ml-1" />{isAr ? "جولة جديدة" : "New Tour"}
          </Button>
          <Button variant="outline" onClick={() => { setBatchStartDate(""); setBatchEndDate(""); setBatchCloneSource("master"); setShowBatchDialog(true); }} disabled={!selectedFloor} data-testid="batch-entry-btn" className="hidden sm:flex">
            <CalendarRange className="w-4 h-4 ml-1" />{isAr ? "إدخال متعدد" : "Batch"}
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-5">
        <ArchiveSidebar
          sessions={sessions} activeSession={activeDailySession || activeSession} isAr={isAr}
          theme="emerald" showCompare showNotes
          className="lg:col-span-1 order-2 lg:order-first"
          onSelectSession={async (s) => {
            setZoom(1); setPanOffset({ x: 0, y: 0 }); zoomRef.current = 1;
            try {
              const res = await axios.get(`${API}/map-sessions/${s.id}`, getAuthHeaders());
              const dailySession = res.data;
              setActiveDailySession(dailySession);
              setActiveSession(dailySession);
              setPrayerSessions({});
              fetchPrayerSessions(dailySession.id);
            } catch {
              setActiveDailySession(s);
              setActiveSession(s);
              setPrayerSessions({});
              fetchPrayerSessions(s.id);
            }
          }}
          onDeleteSession={handleDeleteSession}
          onCalendarEmptyClick={(ds) => { setNewSessionDate(ds); setCloneSource("auto"); setShowNewSessionDialog(true); }}
          onCompare={handleCompare}
        />

        <div className="lg:col-span-3 order-1 lg:order-2">
          {!activeSession ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-4"><Eye className="w-8 h-8 text-slate-400" /></div>
                <h3 className="font-cairo font-semibold text-lg text-slate-600 mb-2">{isAr ? "اختر يوماً من التقويم أو ابدأ جولة جديدة" : "Pick a day from the calendar or start a new tour"}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{isAr ? "اضغط على يوم في التقويم لعرض جولته، أو اضغط على يوم فارغ لإنشاء جولة جديدة بأثر رجعي" : "Click a day in the calendar to view its tour, or click an empty day to create a retroactive tour"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <SessionHeader activeSession={activeSession} activeZones={activeZones} handleUpdateSession={handleUpdateSession} setSessionNotes={setSessionNotes} setShowNotesDialog={setShowNotesDialog} />

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Professional Tab Bar */}
                <div
                  className="rounded-2xl p-2 mb-4"
                  style={isDark
                    ? { backgroundColor: 'hsl(160 22% 10%)', border: '1px solid hsl(160 18% 18%)' }
                    : { backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }
                  }
                  data-testid="daily-tabs-bar"
                >
                  <div className="flex items-center justify-center gap-2">
                    {[
                      { id: 'employees', label: isAr ? 'الموظفين' : 'Staff', icon: Users, count: null },
                      { id: 'density', label: isAr ? 'الكثافات' : 'Density', icon: Activity, count: densityStats?.criticalCount || null, isAlert: true },
                      { id: 'map', label: isAr ? 'المصليات' : 'Prayer Areas', icon: MapPin, count: activeZones.length },
                    ].map(tab => {
                      const isActive = activeTab === tab.id;
                      const TabIcon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          data-testid={`tab-${tab.id}`}
                          className={`relative flex flex-col items-center gap-1 lg:gap-1.5 px-3 lg:px-5 py-2 lg:py-3 rounded-xl transition-all duration-300 flex-1
                            ${isActive
                              ? 'bg-white shadow-md border-2 scale-[1.02]'
                              : 'bg-transparent border-2 border-transparent hover:bg-white/60 hover:shadow-sm'
                            }`}
                          style={isActive ? { borderColor: isDark ? 'hsl(160 65% 42%)' : '#047857' } : {}}
                        >
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${isActive ? 'shadow-sm' : ''}`}
                            style={isActive
                            ? { backgroundColor: isDark ? 'hsl(160 30% 16%)' : '#ecfdf5', color: isDark ? 'hsl(160 65% 50%)' : '#047857' }
                            : { backgroundColor: isDark ? 'hsl(160 15% 14%)' : '#f3f4f6', color: isDark ? 'hsl(155 8% 50%)' : '#6b7280' }
                          }
                          >
                            <TabIcon className="w-5 h-5" />
                          </div>
                          <span
                            className={`text-xs font-medium transition-colors duration-300 ${isActive ? 'font-bold' : 'text-gray-500'}`}
                            style={isActive ? { color: isDark ? 'hsl(160 65% 50%)' : '#047857' } : {}}
                          >
                            {tab.label}
                          </span>
                          {tab.count !== null && tab.count > 0 && (
                            <span
                              className={`absolute -top-1 -left-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
                              style={{ backgroundColor: tab.isAlert ? '#ef4444' : (isActive ? '#047857' : '#9ca3af') }}
                            >
                              {tab.count}
                            </span>
                          )}
                          {isActive && (
                            <div className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-1 rounded-full" style={{ backgroundColor: isDark ? 'hsl(160 65% 42%)' : '#047857' }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <TabsContent value="map" tabIndex={-1} className="space-y-3" style={{ animation: 'tabSlideIn 0.3s ease-out', minHeight: 'min(760px, calc(100vh - 220px))' }}>
                  {/* Prayer Sessions Bar */}
                  {activeDailySession && (
                    <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-l from-slate-50 to-white p-3" data-testid="prayer-sessions-bar">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {activeSession?.session_type === "prayer" && (
                            <button onClick={handleBackToDaily}
                              className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold transition-colors"
                              data-testid="back-to-daily-btn">
                              <ChevronRight className="w-3.5 h-3.5" />
                              {isAr ? "الجولة اليومية" : "Daily Tour"}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Day completion progress */}
                          {(() => {
                            const completed = PRAYER_TIMES.filter(pt => prayerSessions[pt.key]?.status === 'completed').length;
                            const skipped = PRAYER_TIMES.filter(pt => prayerSessions[pt.key]?.status === 'skipped').length;
                            const countable = PRAYER_TIMES.length - skipped;
                            const started = Object.keys(prayerSessions).length;
                            return started > 0 && (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                {completed}/{countable}
                                {skipped > 0 && <span className="text-slate-400">({skipped} ⏭️)</span>}
                                {isAr ? " مكتملة" : " done"}
                              </span>
                            );
                          })()}
                          <p className="text-[11px] font-cairo font-bold text-slate-500">{isAr ? "جولات الصلوات" : "Prayer Rounds"}</p>
                        </div>
                      </div>

                      {/* Prayer Cards - horizontal scroll on mobile, grid on desktop */}
                      <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar sm:grid sm:grid-cols-6 sm:overflow-visible sm:pb-0">
                        {PRAYER_TIMES.map((pt, idx) => {
                          const ps = prayerSessions[pt.key];
                          const isActivePrayer = activeSession?.prayer === pt.key;
                          const status = ps?.status;

                          // Determine ordering state
                          const prevPrayerKey = idx > 0 ? PRAYER_TIMES[idx - 1].key : null;
                          const prevSession = prevPrayerKey ? prayerSessions[prevPrayerKey] : null;
                          const prevCompleted = !prevPrayerKey || prevSession?.status === 'completed' || prevSession?.status === 'skipped';
                          const prevIsDraft = prevPrayerKey && prevSession && prevSession.status === 'draft';
                          const prevNotStarted = prevPrayerKey && !prevSession;
                          const canStartFreely = !ps && prevCompleted;
                          const needsBypass = !ps && (prevIsDraft || prevNotStarted);
                          const awaitingBypass = bypassConfirm === pt.key;
                          const isSkipped = status === 'skipped';

                          // Card border/bg based on state
                          let cardClass = 'border-dashed border-slate-200 bg-slate-50/50';
                          if (isActivePrayer) cardClass = 'border-emerald-500 bg-emerald-50 shadow-md scale-[1.03]';
                          else if (status === 'completed') cardClass = 'border-emerald-300 bg-emerald-50/60 cursor-pointer hover:shadow-sm';
                          else if (status === 'draft') cardClass = 'border-blue-300 bg-blue-50/60 cursor-pointer hover:shadow-sm';
                          else if (isSkipped) cardClass = 'border-slate-300 bg-slate-100/80 opacity-75';

                          return (
                            <div key={pt.key} className="relative flex flex-col gap-1 flex-shrink-0 sm:flex-shrink" style={{ minWidth: '82px' }}>
                              {/* Main card */}
                              <button
                                onClick={() => ps && !isSkipped ? handleSelectPrayer(pt.key) : null}
                                data-testid={`prayer-session-${pt.key}`}
                                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all ${cardClass}`}
                              >
                                <span className={`text-lg leading-none ${isSkipped ? 'grayscale opacity-50' : ''}`}>{pt.icon}</span>
                                <span className={`text-[9px] font-cairo font-bold leading-tight ${isActivePrayer ? 'text-emerald-700' : isSkipped ? 'text-slate-400 line-through' : status ? 'text-slate-600' : 'text-slate-400'}`}>
                                  {isAr ? pt.label_ar : pt.label_en}
                                </span>
                                <span className="text-[8px] leading-none">
                                  {status === 'completed' ? '✅' : status === 'draft' ? '🔵' : isSkipped ? '⏭️' : '○'}
                                </span>
                              </button>

                              {/* Skip button - for unstarted prayers (can start freely) */}
                              {canStartFreely && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleStartPrayerSession(pt.key)}
                                    disabled={saving}
                                    data-testid={`start-prayer-session-${pt.key}`}
                                    className="flex-1 text-[8px] py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm disabled:opacity-50"
                                  >
                                    {isAr ? "▶ بدء" : "▶ Start"}
                                  </button>
                                  <button
                                    onClick={() => handleSkipPrayerSession(pt.key)}
                                    disabled={saving}
                                    data-testid={`skip-prayer-session-${pt.key}`}
                                    title={isAr ? "تجاوز هذه الصلاة (لا تُحسب في الإحصائيات)" : "Skip this prayer (excluded from stats)"}
                                    className="text-[8px] px-1.5 py-1.5 rounded-lg border border-slate-300 text-slate-400 hover:bg-slate-100 transition-all"
                                  >
                                    ⏭️
                                  </button>
                                </div>
                              )}

                              {/* Skipped session - show unskip button */}
                              {isSkipped && (
                                <button
                                  onClick={() => handleUnskipPrayerSession(pt.key)}
                                  data-testid={`unskip-prayer-session-${pt.key}`}
                                  className="w-full text-[8px] py-1.5 rounded-lg border-2 border-amber-400 text-amber-600 hover:bg-amber-50 font-bold transition-all"
                                  title={isAr ? "فك التجاوز وإدخال البيانات" : "Unskip and enter data"}
                                >
                                  {isAr ? "فك التجاوز" : "Unskip"}
                                </button>
                              )}

                              {/* Needs bypass - previous not completed */}
                              {needsBypass && !awaitingBypass && (
                                <button
                                  onClick={() => setBypassConfirm(pt.key)}
                                  data-testid={`bypass-prayer-${pt.key}`}
                                  className="w-full text-[8px] py-1.5 rounded-lg border-2 border-dashed border-amber-400 text-amber-600 font-bold hover:bg-amber-50 transition-all"
                                  title={isAr ? `${prevPrayerKey ? PRAYER_TIMES.find(p=>p.key===prevPrayerKey)?.label_ar : ''} لم تُكتمل بعد` : 'Previous not done'}
                                >
                                  ⚠️ {isAr ? "تجاوز" : "Bypass"}
                                </button>
                              )}

                              {/* Bypass confirmation inline */}
                              {awaitingBypass && (
                                <div className="absolute -bottom-24 right-0 left-0 z-40 bg-white rounded-xl border-2 border-amber-400 shadow-xl p-2.5" style={{ minWidth: '160px' }}>
                                  <p className="text-[9px] font-cairo font-bold text-amber-700 mb-1.5 leading-snug">
                                    {isAr
                                      ? `${PRAYER_TIMES.find(p=>p.key===prevPrayerKey)?.label_ar} لم تُكتمل — ستُنسخ آخر تعديلاتها`
                                      : `Previous prayer not done — will clone its latest state`}
                                  </p>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => { setBypassConfirm(null); handleStartPrayerSession(pt.key); }}
                                      className="flex-1 text-[8px] py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors"
                                    >
                                      {isAr ? "متابعة" : "Continue"}
                                    </button>
                                    <button
                                      onClick={() => setBypassConfirm(null)}
                                      className="flex-1 text-[8px] py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors"
                                    >
                                      {isAr ? "إلغاء" : "Cancel"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Legend + progress bar */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] text-slate-400 flex items-center gap-1">✅ {isAr ? "مكتملة" : "Done"}</span>
                          <span className="text-[9px] text-slate-400 flex items-center gap-1">🔵 {isAr ? "مسودة" : "Draft"}</span>
                          <span className="text-[9px] text-slate-400 flex items-center gap-1">⏭️ {isAr ? "متجاوزة" : "Skipped"}</span>
                          <span className="text-[9px] text-slate-400 flex items-center gap-1">⚠️ {isAr ? "يحتاج تجاوز" : "Needs bypass"}</span>
                        </div>
                        {/* Progress dots */}
                        <div className="flex items-center gap-1">
                          {PRAYER_TIMES.map(pt => {
                            const s = prayerSessions[pt.key]?.status;
                            return <span key={pt.key} className={`w-2 h-2 rounded-full transition-all ${s === 'completed' ? 'bg-emerald-500' : s === 'draft' ? 'bg-blue-400' : s === 'skipped' ? 'bg-slate-400' : 'bg-slate-200'}`} title={s === 'skipped' ? (isAr ? 'متجاوزة' : 'Skipped') : ''} />;
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  {activeSession?.status !== "completed" && (
                  <MapToolbar
                    activeSession={activeSession} mapMode={mapMode} setMapMode={setMapMode}
                    drawingPoints={drawingPoints} setDrawingPoints={setDrawingPoints}
                    selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId}
                    setRectStart={setRectStart} setFreehandPoints={setFreehandPoints}
                    sessionZones={sessionZones} zoom={zoom} zoomRef={zoomRef} setZoom={setZoom}
                    setPanOffset={setPanOffset} mapContainerRef={mapContainerRef}
                    handleUpdateZoneStyle={handleUpdateZoneStyle}
                    setShowNewZoneDialog={setShowNewZoneDialog}
                    activeZones={activeZones} removedZones={removedZones}
                    setSelectedZone={setSelectedZone} setShowZoneDialog={setShowZoneDialog}
                    handleToggleRemove={handleToggleRemove} ZONE_TYPES={ZONE_TYPES}
                    undoDrawing={undoDrawing} redoDrawing={redoDrawing} clearDrawing={clearDrawing}
                    undoStack={undoStack} redoStack={redoStack}
                    undoMapAction={undoMapAction} redoMapAction={redoMapAction}
                    mapUndoStack={mapUndoStack} mapRedoStack={mapRedoStack}
                  />
                  )}
                  <div className="relative rounded-xl overflow-hidden border border-slate-200/60" style={{ height: 'var(--map-container-h)' }}>
                    {/* Fixed handle - always at panel edge */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-300"
                      style={{ right: statsCollapsed ? 0 : '40%' }}
                    >
                      <button
                        onClick={() => setStatsCollapsed(p => !p)}
                        className="flex items-center justify-center w-5 h-14 bg-emerald-600 hover:bg-emerald-700 rounded-r-none rounded-l-lg shadow-lg transition-colors"
                        data-testid="stats-panel-handle"
                        title={isAr ? (statsCollapsed ? "إظهار الإحصائيات" : "إخفاء الإحصائيات") : (statsCollapsed ? "Show Stats" : "Hide Stats")}
                      >
                        <ChevronRight className="w-3 h-3 text-white transition-transform duration-300" style={{ transform: statsCollapsed ? 'rotate(180deg)' : '' }} />
                      </button>
                    </div>
                    {/* Map canvas: absolute inset-0 → always same size regardless of panel state */}
                    <div className="absolute inset-0">
                      <MapCanvas
                    selectedFloor={selectedFloor} activeSession={activeSession}
                    sessionZones={sessionZones} activeZones={activeZones} removedZones={removedZones}
                    mapMode={mapMode} zoom={zoom} setZoom={setZoom} panOffset={panOffset} setPanOffset={setPanOffset}
                    zoomRef={zoomRef} svgRef={svgRef} mapContainerRef={mapContainerRef}
                    drawingPoints={drawingPoints} setDrawingPoints={setDrawingPoints}
                    selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId}
                    draggingPoint={draggingPoint} setDraggingPoint={setDraggingPoint}
                    hoveredPoint={hoveredPoint} setHoveredPoint={setHoveredPoint}
                    mousePos={mousePos} setMousePos={setMousePos}
                    nearStart={nearStart} setNearStart={setNearStart}
                    rectStart={rectStart} setRectStart={setRectStart}
                    rectEnd={rectEnd} setRectEnd={setRectEnd}
                    isRotating={isRotating} setIsRotating={setIsRotating}
                    isDraggingZone={isDraggingZone} setIsDraggingZone={setIsDraggingZone}
                    dragZoneStart={dragZoneStart} setDragZoneStart={setDragZoneStart}
                    isDrawingFreehand={isDrawingFreehand} setIsDrawingFreehand={setIsDrawingFreehand}
                    freehandPoints={freehandPoints} setFreehandPoints={setFreehandPoints}
                    isPanning={isPanning} setIsPanning={setIsPanning}
                    panStart={panStart} setPanStart={setPanStart}
                    imgRatio={imgRatio} setImgRatio={setImgRatio}
                    newZoneForm={newZoneForm} setActiveSession={setActiveSession}
                    setSelectedZone={setSelectedZone} setShowZoneDialog={setShowZoneDialog}
                    setShowNewZoneDialog={setShowNewZoneDialog}
                    ZONE_TYPES={ZONE_TYPES} wheelRef={wheelRef}
                    onMapMouseUp={handleMapMouseUp}
                    handleSmoothZone={handleSmoothZone} handleCopyZone={handleCopyZone}
                    handleToggleRemove={handleToggleRemove} handleUpdateZoneStyle={handleUpdateZoneStyle}
                    handleDeletePoint={handleDeletePoint}
                    addDrawingPoint={addDrawingPoint}
                    onEditStart={onEditStart} setMapMode={setMapMode}
                    activePrayer={activePrayer} densityEdits={densityEdits}
                    handleDensityChange={handleDensityChange} handleSaveDensityBatch={handleSaveDensityBatch}
                    savingDensity={savingDensity}
                  />
                    </div>
                    {/* Stats panel: absolutely positioned, slides over the map */}
                    <MapStatsPanel
                      sessionStats={sessionStats}
                      densityStats={densityStats}
                      changedZones={changedZones}
                      ZONE_TYPES={ZONE_TYPES}
                      activeZones={activeZones}
                      collapsed={statsCollapsed}
                      onToggle={() => setStatsCollapsed(prev => !prev)}
                    />
                  </div>
                  <ChangesLog
                    activeSession={activeSession} changedZones={changedZones} ZONE_TYPES={ZONE_TYPES}
                  />
                </TabsContent>

                <TabsContent value="density" tabIndex={-1} className="space-y-5" style={{ animation: 'tabSlideIn 0.3s ease-out', minHeight: 'min(760px, calc(100vh - 220px))' }}>
                  <DensityTab
                    activeSession={activeSession} densityStats={densityStats}
                    densityEdits={densityEdits} activePrayer={activePrayer} setActivePrayer={setActivePrayer}
                    handleDensityChange={handleDensityChange} handleSaveDensityBatch={handleSaveDensityBatch}
                    savingDensity={savingDensity} selectedFloor={selectedFloor}
                    imgRatio={imgRatio} ZONE_TYPES={ZONE_TYPES}
                    panelCollapsed={densityPanelCollapsed}
                    onPanelToggle={() => setDensityPanelCollapsed(p => !p)}
                  />
                </TabsContent>

                <TabsContent value="employees" tabIndex={-1} className="space-y-5" style={{ animation: 'tabSlideIn 0.3s ease-out', minHeight: 'min(760px, calc(100vh - 220px))' }}>
                  <ZoneEmployeesTab activeZones={activeZones} activeSession={activeSession} ZONE_TYPES={ZONE_TYPES} selectedFloor={selectedFloor} imgRatio={imgRatio}
                    panelCollapsed={employeesPanelCollapsed}
                    onPanelToggle={() => setEmployeesPanelCollapsed(p => !p)}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <NewSessionDialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog} newSessionDate={newSessionDate} setNewSessionDate={setNewSessionDate} cloneSource={cloneSource} setCloneSource={setCloneSource} sessions={sessions} saving={saving} handleCreateSession={handleCreateSession} />
      <BatchDialog open={showBatchDialog} onOpenChange={setShowBatchDialog} batchStartDate={batchStartDate} setBatchStartDate={setBatchStartDate} batchEndDate={batchEndDate} setBatchEndDate={setBatchEndDate} batchCloneSource={batchCloneSource} setBatchCloneSource={setBatchCloneSource} sessions={sessions} saving={saving} handleBatchCreate={handleBatchCreate} />
      <ZoneEditDialog open={showZoneDialog} onOpenChange={setShowZoneDialog} selectedZone={selectedZone} setSelectedZone={setSelectedZone} activeSession={activeSession} handleUpdateZone={handleUpdateZone} handleToggleRemove={handleToggleRemove} handleCategoryChange={handleCategoryChange} setActiveSession={setActiveSession} setSelectedZoneId={setSelectedZoneId} ZONE_TYPES={ZONE_TYPES} />
      <NewZoneDialog open={showNewZoneDialog} onOpenChange={(v) => { setShowNewZoneDialog(v); if (!v) setMapMode("edit"); }} newZoneForm={newZoneForm} setNewZoneForm={setNewZoneForm} drawingPoints={drawingPoints} setDrawingPoints={setDrawingPoints} handleSaveNewZone={handleSaveNewZone} ZONE_TYPES={ZONE_TYPES} />
      <NotesDialog open={showNotesDialog} onOpenChange={setShowNotesDialog} sessionNotes={sessionNotes} setSessionNotes={setSessionNotes} handleUpdateSession={handleUpdateSession} />
      <CompareDialog open={showCompareDialog} onOpenChange={setShowCompareDialog} compareData={compareData} ZONE_TYPES={ZONE_TYPES} />
    </div>
  );
}
