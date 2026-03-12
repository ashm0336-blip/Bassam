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
import { useAuth } from "@/context/AuthContext";
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
  const { canWrite, canRead } = useAuth();

  // Permission checks — write = edit buttons, read = view only, none = hidden
  const canCreateSession = canWrite("create_session");
  const canApproveSession = canWrite("approve_session");
  const canDeleteSession = canWrite("delete_session");
  const canStartPrayer = canWrite("start_prayer_round");
  const canCompletePrayer = canWrite("complete_prayer_round");
  const canSkipPrayer = canWrite("skip_prayer_round");
  const canDistribute = canWrite("distribute_employees");
  const canViewDistribute = canRead("distribute_employees");
  const canEnterDensity = canWrite("enter_density");
  const canViewDensity = canRead("enter_density") || canRead("view_density_reports");

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
  const [emptyDaySelected, setEmptyDaySelected] = useState(null);
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

  // Clipboard for copy/paste zones
  const [clipboardZone, setClipboardZone] = useState(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null); // { x, y, zoneId } | null

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
      const res = await axios.get(`${API}/floors?department=haram_map`, getAuthHeaders());
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

  // Delete prayer session (remove entirely — allows restart)
  const handleDeletePrayerSession = useCallback(async (prayerKey) => {
    const ps = prayerSessions[prayerKey];
    if (!ps) return;
    const pt = PRAYER_TIMES.find(p => p.key === prayerKey);
    if (!window.confirm(isAr
      ? `هل تريد حذف جولة ${pt?.label_ar}؟ سيُمكن إعادة البدء بها من جديد`
      : `Delete ${pt?.label_en} session? You can restart it.`)) return;
    try {
      await axios.delete(`${API}/admin/map-sessions/${ps.id}`, getAuthHeaders());
      setPrayerSessions(prev => { const n = { ...prev }; delete n[prayerKey]; return n; });
      if (activeSession?.id === ps.id) {
        setActiveSession(activeDailySession);
        setActivePrayer(null);
      }
      toast.success(isAr ? `تم حذف جولة ${pt?.label_ar}` : `${pt?.label_en} session deleted`);
    } catch (e) {
      toast.error(e.response?.data?.detail || (isAr ? "تعذر الحذف" : "Delete failed"));
    }
  }, [prayerSessions, activeSession, activeDailySession, isAr]);

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

  const handleCopyZone = useCallback(async () => {
    if (!activeSession || !selectedZoneId) return;
    const allZones = activeSession?.zones || [];
    const zone = allZones.find(z => z.id === selectedZoneId);
    if (!zone) return;
    setClipboardZone({ ...zone });
    toast.success(isAr ? "✂️ تم النسخ — Ctrl+V للصق" : "Copied — Ctrl+V to paste");
  }, [activeSession, selectedZoneId, isAr]);

  const handlePasteZone = useCallback(async () => {
    if (!activeSession || !clipboardZone) return;
    const offset = 5;
    const newPoints = (clipboardZone.polygon_points || []).map(p => ({ x: p.x + offset, y: p.y + offset }));
    try {
      const res = await axios.post(`${API}/admin/map-sessions/${activeSession.id}/zones`, {
        zone_code: clipboardZone.zone_code + "-copy",
        name_ar: clipboardZone.name_ar + " (نسخة)",
        name_en: (clipboardZone.name_en || "") + " (copy)",
        zone_type: clipboardZone.zone_type,
        polygon_points: newPoints,
        fill_color: clipboardZone.fill_color,
        stroke_color: clipboardZone.stroke_color || "#000000",
        stroke_style: clipboardZone.stroke_style || "dashed",
        opacity: clipboardZone.opacity ?? 0.4,
        stroke_opacity: clipboardZone.stroke_opacity ?? 1,
        fill_type: clipboardZone.fill_type || "solid",
        pattern_type: clipboardZone.pattern_type || null,
        pattern_fg_color: clipboardZone.pattern_fg_color || "#000000",
        pattern_bg_color: clipboardZone.pattern_bg_color || "#ffffff",
      }, getAuthHeaders());
      setActiveSession(res.data);
      toast.success(isAr ? "📋 تم اللصق" : "Pasted");
    } catch { toast.error(isAr ? "تعذر اللصق" : "Paste failed"); }
  }, [activeSession, clipboardZone, isAr]);

  const handleCutZone = useCallback(async () => {
    if (!activeSession || !selectedZoneId) return;
    const allZones = activeSession?.zones || [];
    const zone = allZones.find(z => z.id === selectedZoneId);
    if (!zone) return;
    setClipboardZone({ ...zone });
    try {
      const res = await axios.delete(`${API}/admin/map-sessions/${activeSession.id}/zones/${selectedZoneId}`, getAuthHeaders());
      if (res.data?.zones) setActiveSession(res.data);
      else { const r2 = await axios.get(`${API}/map-sessions/${activeSession.id}`); setActiveSession(r2.data); }
      setSelectedZoneId(null);
      toast.success(isAr ? "✂️ تم القص — Ctrl+V للصق" : "Cut — Ctrl+V to paste");
    } catch { toast.error(isAr ? "تعذر القص" : "Cut failed"); }
  }, [activeSession, selectedZoneId, isAr]);

  const handleDeleteSelectedZone = useCallback(async () => {
    if (!activeSession || !selectedZoneId) return;
    try {
      const res = await axios.delete(`${API}/admin/map-sessions/${activeSession.id}/zones/${selectedZoneId}`, getAuthHeaders());
      if (res.data?.zones) setActiveSession(res.data);
      else { const r2 = await axios.get(`${API}/map-sessions/${activeSession.id}`); setActiveSession(r2.data); }
      setSelectedZoneId(null);
      toast.success(isAr ? "🗑️ تم حذف المنطقة" : "Zone deleted");
    } catch { toast.error(isAr ? "تعذر الحذف" : "Delete failed"); }
  }, [activeSession, selectedZoneId, isAr]);

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
    } catch (e) {
      console.error("Zone add error:", e?.response?.data || e?.message || e);
      toast.error(e?.response?.data?.detail || (isAr ? "تعذرت الإضافة" : "Error adding zone"));
    }
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
      // لا تتدخل إذا المستخدم يكتب في input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;

      // Ctrl+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (mapMode === "draw" && undoStack.length > 0) undoDrawing();
        else if (mapUndoStack.length > 0) undoMapAction();
        return;
      }
      // Ctrl+Y / Ctrl+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (mapMode === "draw" && redoStack.length > 0) redoDrawing();
        else if (mapRedoStack.length > 0) redoMapAction();
        return;
      }
      // Ctrl+C = نسخ المنطقة المحددة
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (selectedZoneId) { e.preventDefault(); handleCopyZone(); }
        return;
      }
      // Ctrl+V = لصق
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (clipboardZone) { e.preventDefault(); handlePasteZone(); }
        return;
      }
      // Ctrl+X = قص
      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        if (selectedZoneId) { e.preventDefault(); handleCutZone(); }
        return;
      }
      // Delete / Backspace = حذف المنطقة المحددة
      if ((e.key === "Delete" || e.key === "Backspace") && selectedZoneId && mapMode === "edit") {
        e.preventDefault();
        handleDeleteSelectedZone();
        return;
      }
      // Escape = إلغاء / رجوع
      if (e.key === "Escape") {
        setContextMenu(null);
        if (rectStart) { setRectStart(null); setRectEnd(null); }
        else if (drawingPoints.length > 0) { setDrawingPoints([]); setNearStart(false); }
        else if (selectedZoneId) setSelectedZoneId(null);
        else if (DRAG_SHAPE_MODES.includes(mapMode) || mapMode === "draw" || mapMode === "freehand") setMapMode("edit");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawingPoints.length, selectedZoneId, mapMode, rectStart,
      undoStack.length, redoStack.length, mapUndoStack.length, mapRedoStack.length,
      undoDrawing, redoDrawing, undoMapAction, redoMapAction,
      clipboardZone, handleCopyZone, handlePasteZone, handleCutZone, handleDeleteSelectedZone]);

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
    <div className="space-y-4" data-testid="daily-sessions-page">

      {/* ══ HERO HEADER ════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, #065f46 0%, #047857 40%, #059669 70%, #10b981 100%)" }}>
        {/* دوائر ديكورية */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10 bg-white"/>
        <div className="absolute -bottom-14 -left-6 w-56 h-56 rounded-full opacity-5 bg-white"/>
        <div className="absolute top-4 left-32 w-6 h-6 rounded-full opacity-15 bg-white"/>

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Eye className="w-4 h-4 text-white"/>
              </div>
              <span className="text-emerald-200 text-xs font-medium">السجل اليومي للمصليات</span>
            </div>
            <h1 className="font-cairo font-black text-2xl text-white leading-tight" data-testid="page-title">
              {selectedFloor ? (isAr ? selectedFloor.name_ar : selectedFloor.name_en) : "اختر الطابق"}
            </h1>
            <p className="text-emerald-200 text-xs mt-1">تتبع التغييرات اليومية للمصليات والمناطق في كل طابق</p>
          </div>

          {/* mini stats من الجلسات */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label:"الجولات",  value:sessions.length,                                           color:"text-white",         bg:"bg-white/20" },
              { label:"مكتملة",   value:sessions.filter(s=>s.status==="completed").length,         color:"text-emerald-200",   bg:"bg-white/10" },
              { label:"مسودة",    value:sessions.filter(s=>s.status==="draft").length,             color:"text-yellow-300",    bg:"bg-yellow-400/20" },
              { label:"هذا الشهر",value:sessions.filter(s=>s.date?.startsWith(new Date().toISOString().slice(0,7))).length, color:"text-cyan-300", bg:"bg-cyan-400/15" },
            ].map((s,i)=>(
              <div key={i} className={`${s.bg} rounded-xl px-3 py-2 text-center backdrop-blur-sm`}>
                <p className={`font-black text-xl leading-none ${s.color}`}>{s.value}</p>
                <p className="text-white/60 text-[9px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Controls bar */}
        <div className="relative flex items-center gap-2 mt-4 pt-3 border-t border-white/15 flex-wrap">
          <Select value={selectedFloor?.id || ""} onValueChange={(v) => setSelectedFloor(floors.find(f => f.id === v))}>
            <SelectTrigger className="w-36 lg:w-44 bg-white/20 border-white/30 text-white h-9 text-sm" data-testid="floor-select">
              <Layers className="w-4 h-4 ml-1" /><SelectValue placeholder={isAr ? "اختر الطابق" : "Select floor"} />
            </SelectTrigger>
            <SelectContent>{floors.map(f => <SelectItem key={f.id} value={f.id}>{isAr ? f.name_ar : f.name_en}</SelectItem>)}</SelectContent>
          </Select>
          {canCreateSession && (
            <Button onClick={() => { setCloneSource("auto"); setNewSessionDate(today); setShowNewSessionDialog(true); }}
              disabled={!selectedFloor} data-testid="start-new-tour-btn"
              className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold gap-1.5 h-9 shadow-md">
              <Plus className="w-4 h-4"/>{isAr ? "جولة جديدة" : "New Tour"}
            </Button>
          )}
          {canCreateSession && (
            <Button variant="outline" onClick={() => { setBatchStartDate(""); setBatchEndDate(""); setBatchCloneSource("master"); setShowBatchDialog(true); }}
              disabled={!selectedFloor} data-testid="batch-entry-btn"
              className="bg-white/15 border-white/30 text-white hover:bg-white/25 h-9 gap-1.5 hidden sm:flex">
              <CalendarRange className="w-4 h-4"/>{isAr ? "إدخال متعدد" : "Batch"}
            </Button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-5">
        <ArchiveSidebar
          sessions={sessions} activeSession={activeDailySession || activeSession} isAr={isAr}
          theme="emerald" showCompare showNotes
          className="lg:col-span-1 order-2 lg:order-first"
          readOnly={!canDeleteSession}
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
          onCalendarEmptyClick={canCreateSession 
            ? (ds) => { setEmptyDaySelected(null); setNewSessionDate(ds); setCloneSource("auto"); setShowNewSessionDialog(true); }
            : (ds) => { setActiveSession(null); setActiveDailySession(null); setEmptyDaySelected(ds); }
          }
          onCompare={handleCompare}
        />

        <div className="lg:col-span-3 order-1 lg:order-2">
          {!activeSession ? (
            /* ── Empty State خرافي ── */
            <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60"
              style={{ minHeight: "420px" }}>
              {/* دوائر ديكورية */}
              <div className="absolute top-6 right-6 w-24 h-24 rounded-full bg-emerald-100/50"/>
              <div className="absolute bottom-8 left-8 w-16 h-16 rounded-full bg-teal-100/40"/>

              <div className="relative flex flex-col items-center justify-center py-16 px-8 text-center">
                {/* أيقونة */}
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl"
                    style={{ background: "linear-gradient(135deg, #065f46, #059669)" }}>
                    {emptyDaySelected
                      ? <Calendar className="w-11 h-11 text-white"/>
                      : <Eye className="w-11 h-11 text-white"/>}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
                    <span className="text-lg">{emptyDaySelected ? "📅" : "🕌"}</span>
                  </div>
                </div>

                {emptyDaySelected ? (
                  <>
                    <h3 className="font-cairo font-black text-2xl text-emerald-900 mb-2">
                      لا توجد جولات لهذا اليوم
                    </h3>
                    <p className="text-emerald-700 font-medium mb-1">
                      {new Date(emptyDaySelected).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year:'numeric' })}
                    </p>
                    <p className="text-slate-500 text-sm max-w-xs">اختر يوماً آخر من التقويم أو أنشئ جولة جديدة لهذا اليوم</p>
                    {canCreateSession && selectedFloor && (
                      <Button onClick={() => { setCloneSource("auto"); setNewSessionDate(emptyDaySelected); setShowNewSessionDialog(true); }}
                        className="mt-5 gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg">
                        <Plus className="w-4 h-4"/>إنشاء جولة لهذا اليوم
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="font-cairo font-black text-2xl text-emerald-900 mb-2">
                      {canCreateSession ? "ابدأ جولتك اليومية" : "السجل اليومي للمصليات"}
                    </h3>
                    <p className="text-slate-500 text-sm max-w-sm leading-relaxed mb-5">
                      {canCreateSession
                        ? "اضغط على يوم في التقويم لعرض جولته، أو ابدأ جولة جديدة الآن لتتبع حالة المصليات والمناطق"
                        : "اضغط على يوم في التقويم لعرض تفاصيل الجولة اليومية للمصليات"}
                    </p>
                    {canCreateSession && selectedFloor && (
                      <div className="flex items-center gap-3">
                        <Button onClick={() => { setCloneSource("auto"); setNewSessionDate(today); setShowNewSessionDialog(true); }}
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg">
                          <Plus className="w-4 h-4"/>جولة جديدة الآن
                        </Button>
                        <Button variant="outline" onClick={() => setShowBatchDialog(true)}
                          className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                          <CalendarRange className="w-4 h-4"/>إدخال متعدد
                        </Button>
                      </div>
                    )}
                    {!selectedFloor && (
                      <div className="mt-4 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                        ⚠️ اختر الطابق من القائمة أعلاه أولاً
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <SessionHeader activeSession={activeSession} activeZones={activeZones} handleUpdateSession={handleUpdateSession} setSessionNotes={setSessionNotes} setShowNotesDialog={setShowNotesDialog} readOnly={!canApproveSession} />

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
                    <div className="rounded-2xl border-0 shadow-sm overflow-hidden" data-testid="prayer-sessions-bar"
                      style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdf4 100%)", border: "1px solid #a7f3d0" }}>

                      {/* ── Prayer Bar Header ────────────────────── */}
                      {(() => {
                        const completed = PRAYER_TIMES.filter(pt => prayerSessions[pt.key]?.status === 'completed').length;
                        const skipped   = PRAYER_TIMES.filter(pt => prayerSessions[pt.key]?.status === 'skipped').length;
                        const draft     = PRAYER_TIMES.filter(pt => prayerSessions[pt.key]?.status === 'draft').length;
                        const total     = PRAYER_TIMES.length - skipped;
                        const pct       = total > 0 ? Math.round(completed / total * 100) : 0;
                        return (
                          <div className="px-4 py-3 flex items-center justify-between gap-3 border-b" style={{ borderColor:"#bbf7d0" }}>
                            <div className="flex items-center gap-2.5">
                              {activeSession?.session_type === "prayer" && (
                                <button onClick={handleBackToDaily}
                                  className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-800 font-bold transition-colors mr-1"
                                  data-testid="back-to-daily-btn">
                                  <ChevronRight className="w-3.5 h-3.5"/>{isAr?"الجولة اليومية":"Daily Tour"}
                                </button>
                              )}
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <span className="text-base">🕌</span>
                              </div>
                              <div>
                                <p className="text-[12px] font-bold text-emerald-800">{isAr?"جولات الصلوات":"Prayer Rounds"}</p>
                                <p className="text-[9px] text-emerald-600">{PRAYER_TIMES.length} صلاة{skipped>0?` · ${skipped} مُتجاوزة`:""}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* chips */}
                              {[
                                { label:"مكتملة", v:completed, color:"#059669", bg:"#ecfdf5" },
                                { label:"جارية",  v:draft,     color:"#2563eb", bg:"#eff6ff" },
                                { label:"متبقية", v:total-completed-draft, color:"#d97706", bg:"#fffbeb" },
                              ].map((s,i) => s.v > 0 && (
                                <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold"
                                  style={{ color:s.color, backgroundColor:s.bg, borderColor:s.color+"40" }}>
                                  <span className="font-black">{s.v}</span>{s.label}
                                </div>
                              ))}
                              {/* دائرة progress */}
                              <div className="relative w-9 h-9 flex-shrink-0">
                                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                                  <circle cx="18" cy="18" r="14" fill="none" stroke="#bbf7d0" strokeWidth="4"/>
                                  <circle cx="18" cy="18" r="14" fill="none" stroke="#059669" strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray={`${88*pct/100} 88`}
                                    style={{ transition:"stroke-dasharray 0.8s ease" }}/>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-[9px] font-black text-emerald-700">{pct}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ── Prayer Cards ─────────────────────────── */}
                      <div className="p-3">
                        <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar sm:grid sm:grid-cols-6 sm:overflow-visible sm:pb-0">
                          {PRAYER_TIMES.map((pt, idx) => {
                            const ps = prayerSessions[pt.key];
                            const isActivePrayer = activeSession?.prayer === pt.key;
                            const status = ps?.status;
                            const prevPrayerKey = idx > 0 ? PRAYER_TIMES[idx - 1].key : null;
                            const prevSession = prevPrayerKey ? prayerSessions[prevPrayerKey] : null;
                            const prevCompleted = !prevPrayerKey || prevSession?.status === 'completed' || prevSession?.status === 'skipped';
                            const prevIsDraft = prevPrayerKey && prevSession && prevSession.status === 'draft';
                            const prevNotStarted = prevPrayerKey && !prevSession;
                            const canStartFreely = !ps && prevCompleted;
                            const needsBypass = !ps && (prevIsDraft || prevNotStarted);
                            const awaitingBypass = bypassConfirm === pt.key;
                            const isSkipped = status === 'skipped';

                            // Card style per state
                            const cardStyles = {
                              active:    { border:"#059669", bg:"linear-gradient(135deg,#d1fae5,#ecfdf5)", shadow:"0 4px 12px #05996930", iconBg:"#059669", textColor:"#065f46" },
                              completed: { border:"#059669", bg:"linear-gradient(135deg,#f0fdf4,#ecfdf5)", shadow:"0 2px 8px #05996920", iconBg:"#d1fae5", textColor:"#065f46" },
                              draft:     { border:"#2563eb", bg:"linear-gradient(135deg,#eff6ff,#e0f2fe)", shadow:"0 2px 8px #2563eb20", iconBg:"#dbeafe", textColor:"#1e40af" },
                              skipped:   { border:"#cbd5e1", bg:"linear-gradient(135deg,#f8fafc,#f1f5f9)", shadow:"none", iconBg:"#e2e8f0", textColor:"#94a3b8" },
                              empty:     { border:"#e2e8f0", bg:"linear-gradient(135deg,#fafafa,#f8fafc)", shadow:"none", iconBg:"#f1f5f9", textColor:"#94a3b8" },
                            };
                            const style = isActivePrayer ? cardStyles.active
                              : status === 'completed' ? cardStyles.completed
                              : status === 'draft'     ? cardStyles.draft
                              : isSkipped             ? cardStyles.skipped
                              : cardStyles.empty;

                            const statusIcon = status === 'completed' ? "✅"
                              : status === 'draft' ? "🔵"
                              : isSkipped ? "⏭️"
                              : "○";

                            return (
                              <div key={pt.key} className="relative flex flex-col gap-1.5 flex-shrink-0 sm:flex-shrink group"
                                style={{ minWidth: '82px' }}>
                                {/* Main card */}
                                <button
                                  onClick={() => ps && !isSkipped ? handleSelectPrayer(pt.key) : null}
                                  data-testid={`prayer-session-${pt.key}`}
                                  className={`flex flex-col items-center gap-1.5 pt-3 pb-2.5 px-1.5 rounded-2xl border-2 transition-all duration-300 w-full
                                    ${isActivePrayer ? 'scale-[1.06]' : ps && !isSkipped ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-default'}`}
                                  style={{ borderColor:style.border, background:style.bg, boxShadow:style.shadow }}>

                                  {/* أيقونة الصلاة */}
                                  <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                                    style={{ backgroundColor:style.iconBg }}>
                                    <span className={`text-xl leading-none ${isSkipped ? 'opacity-40 grayscale' : ''}`}>{pt.icon}</span>
                                  </div>

                                  {/* اسم الصلاة */}
                                  <span className="text-[10px] font-cairo font-bold leading-tight text-center"
                                    style={{ color:style.textColor, textDecoration: isSkipped ? 'line-through' : 'none' }}>
                                    {isAr ? pt.label_ar : pt.label_en}
                                  </span>

                                  {/* حالة */}
                                  <span className="text-sm leading-none">{statusIcon}</span>
                                </button>

                                {/* أزرار الإجراءات */}
                                {canStartFreely && canStartPrayer && (
                                  <div className="flex gap-1">
                                    <button onClick={() => handleStartPrayerSession(pt.key)} disabled={saving}
                                      data-testid={`start-prayer-session-${pt.key}`}
                                      className="flex-1 text-[9px] py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm disabled:opacity-50">
                                      ▶ {isAr ? "بدء" : "Start"}
                                    </button>
                                    {canSkipPrayer && (
                                      <button onClick={() => handleSkipPrayerSession(pt.key)} disabled={saving}
                                        data-testid={`skip-prayer-session-${pt.key}`}
                                        title={isAr ? "تجاوز هذه الصلاة" : "Skip"}
                                        className="text-[9px] px-2 py-1.5 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-100 transition-all">
                                        ⏭️
                                      </button>
                                    )}
                                  </div>
                                )}

                                {isSkipped && canSkipPrayer && (
                                  <div className="flex gap-1">
                                    <button onClick={() => handleUnskipPrayerSession(pt.key)}
                                      data-testid={`unskip-prayer-session-${pt.key}`}
                                      className="flex-1 text-[9px] py-1.5 rounded-xl border-2 border-amber-400 text-amber-600 hover:bg-amber-50 font-bold transition-all">
                                      {isAr ? "فك" : "Unskip"}
                                    </button>
                                    <button onClick={() => handleDeletePrayerSession(pt.key)}
                                      data-testid={`delete-prayer-session-${pt.key}`}
                                      className="text-[9px] px-2 py-1.5 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-all">
                                      🗑️
                                    </button>
                                  </div>
                                )}

                                {status && status !== 'skipped' && !isActivePrayer && canDeleteSession && (
                                  <button onClick={() => handleDeletePrayerSession(pt.key)}
                                    data-testid={`delete-prayer-session-${pt.key}`}
                                    className="w-full text-[8px] py-1 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 hover:border-red-300 transition-all opacity-0 group-hover:opacity-100">
                                    🗑️ {isAr?"حذف":"Delete"}
                                  </button>
                                )}

                                {needsBypass && !awaitingBypass && canStartPrayer && (
                                  <button onClick={() => setBypassConfirm(pt.key)}
                                    data-testid={`bypass-prayer-${pt.key}`}
                                    className="w-full text-[9px] py-1.5 rounded-xl border-2 border-dashed border-amber-400 text-amber-600 font-bold hover:bg-amber-50 transition-all">
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

                      {/* Legend row */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor:"#bbf7d0" }}>
                          <div className="flex items-center gap-3 flex-wrap">
                            {[["✅","مكتملة","#059669"],["🔵","جارية","#2563eb"],["⏭️","متجاوزة","#94a3b8"],["⚠️","يحتاج تجاوز","#d97706"]].map(([icon,label,color],i)=>(
                              <span key={i} className="text-[9px] font-medium flex items-center gap-1" style={{color}}>{icon} {label}</span>
                            ))}
                          </div>
                          {/* Progress dots */}
                          <div className="flex items-center gap-1.5">
                            {PRAYER_TIMES.map(pt => {
                              const s = prayerSessions[pt.key]?.status;
                              return <div key={pt.key} className="w-2.5 h-2.5 rounded-full transition-all"
                                style={{ backgroundColor: s==='completed'?'#059669':s==='draft'?'#2563eb':s==='skipped'?'#94a3b8':'#e2e8f0' }}
                                title={pt.label_ar}/>;
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeSession?.status !== "completed" && canCreateSession && (
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
                    readOnly={!canCreateSession}
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
                    <div className="absolute inset-0"
                      onContextMenu={(e) => {
                        if (!activeSession || activeSession.status === "completed") return;
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, zoneId: selectedZoneId });
                      }}>
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
                    readOnly={!canCreateSession}
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
                  {/* ── Keyboard hints bar ── */}
                  {activeSession && activeSession.status !== "completed" && (
                    <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 border rounded-lg text-[10px] text-slate-500 flex-wrap" dir="ltr">
                      {[
                        { keys: ["Ctrl","C"], label: "نسخ" },
                        { keys: ["Ctrl","V"], label: "لصق" },
                        { keys: ["Ctrl","X"], label: "قص" },
                        { keys: ["Del"], label: "حذف" },
                        { keys: ["Esc"], label: "إلغاء" },
                        { keys: ["Ctrl","Z"], label: "تراجع" },
                        { keys: ["Ctrl","Y"], label: "إعادة" },
                      ].map((s,i) => (
                        <span key={i} className="flex items-center gap-1">
                          {s.keys.map((k,j) => (
                            <span key={j}>
                              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[9px] font-mono shadow-sm">{k}</kbd>
                              {j < s.keys.length-1 && <span className="mx-0.5 text-slate-400">+</span>}
                            </span>
                          ))}
                          <span className="mr-1 font-cairo text-slate-500">{s.label}</span>
                        </span>
                      ))}
                    </div>
                  )}
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
                    readOnly={!canEnterDensity}
                  />
                </TabsContent>

                <TabsContent value="employees" tabIndex={-1} className="space-y-5" style={{ animation: 'tabSlideIn 0.3s ease-out', minHeight: 'min(760px, calc(100vh - 220px))' }}>
                  <ZoneEmployeesTab activeZones={activeZones} activeSession={activeSession}
                    setActiveSession={setActiveSession}
                    ZONE_TYPES={ZONE_TYPES} selectedFloor={selectedFloor} imgRatio={imgRatio}
                    department={selectedFloor?.department || "haram_map"}
                    panelCollapsed={employeesPanelCollapsed}
                    onPanelToggle={() => setEmployeesPanelCollapsed(p => !p)}
                    readOnly={!canDistribute}
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

      {/* ── Context Menu (Right-Click) ── */}
      {contextMenu && (
        <div
          className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 min-w-[180px] font-cairo text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={() => setContextMenu(null)}>
          {/* عنوان المنطقة إن وجدت */}
          {contextMenu.zoneId && (() => {
            const z = sessionZones.find(z => z.id === contextMenu.zoneId);
            return z ? (
              <div className="px-3 py-1.5 text-[10px] font-bold text-primary border-b mb-1 truncate">
                📍 {z.name_ar || z.zone_code}
              </div>
            ) : null;
          })()}
          {[
            { icon: "📋", label: `نسخ`, shortcut: "Ctrl+C", action: () => { handleCopyZone(); setContextMenu(null); }, disabled: !contextMenu.zoneId },
            { icon: "📌", label: `لصق`, shortcut: "Ctrl+V", action: () => { handlePasteZone(); setContextMenu(null); }, disabled: !clipboardZone },
            { icon: "✂️", label: `قص`, shortcut: "Ctrl+X", action: () => { handleCutZone(); setContextMenu(null); }, disabled: !contextMenu.zoneId },
            null, // فاصل
            { icon: "🗑️", label: `حذف`, shortcut: "Del", action: () => { handleDeleteSelectedZone(); setContextMenu(null); }, disabled: !contextMenu.zoneId, danger: true },
            null,
            { icon: "↩️", label: `تراجع`, shortcut: "Ctrl+Z", action: () => { if (mapUndoStack.length > 0) undoMapAction(); setContextMenu(null); }, disabled: mapUndoStack.length === 0 },
            { icon: "↪️", label: `إعادة`, shortcut: "Ctrl+Y", action: () => { if (mapRedoStack.length > 0) redoMapAction(); setContextMenu(null); }, disabled: mapRedoStack.length === 0 },
          ].map((item, i) =>
            item === null ? (
              <div key={i} className="my-1 border-t border-slate-100"/>
            ) : (
              <button key={i}
                disabled={item.disabled}
                onClick={item.disabled ? undefined : item.action}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors
                  ${item.disabled ? "opacity-40 cursor-not-allowed text-slate-400" :
                    item.danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"}`}>
                <span className="flex items-center gap-2">
                  <span>{item.icon}</span>
                  <span className="font-cairo">{item.label}</span>
                </span>
                <kbd className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                  {item.shortcut}
                </kbd>
              </button>
            )
          )}
        </div>
      )}
      {/* Close context menu on outside click */}
      {contextMenu && (
        <div className="fixed inset-0 z-[9998]" onClick={() => setContextMenu(null)}/>
      )}
    </div>
  );
}
