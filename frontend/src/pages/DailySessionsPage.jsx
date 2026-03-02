import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
  Plus, Calendar as CalendarIcon, Layers, Eye, MapPin, BarChart3, Activity,
  CalendarRange,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

import { API, ZONE_TYPES_FALLBACK, DRAG_SHAPE_MODES } from "./DailySessions/constants";
import {
  getAuthHeaders, normalizeImageUrl, smoothPoints, simplifyPoints,
  generateShapeFromDrag, getDensityLevel, formatDate,
} from "./DailySessions/utils";

import { SessionSidebar } from "./DailySessions/components/SessionSidebar";
import { ArchiveSessionSidebar } from "./DailySessions/components/ArchiveSessionSidebar";
import { SessionHeader } from "./DailySessions/components/SessionHeader";
import { MapToolbar } from "./DailySessions/components/MapToolbar";
import { MapCanvas } from "./DailySessions/components/MapCanvas";
import { ChangesLog } from "./DailySessions/components/MapZoneCards";
import { DensityTab } from "./DailySessions/components/DensityTab";
import { StatsTab } from "./DailySessions/components/StatsTab";
import {
  NewSessionDialog, BatchDialog, ZoneEditDialog, NewZoneDialog,
  NotesDialog, CompareDialog,
} from "./DailySessions/components/Dialogs";

export default function DailySessionsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  // Core state
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
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
  const [mapMode, setMapMode] = useState("pan");
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

  useEffect(() => { fetchFloors(); }, [fetchFloors]);
  useEffect(() => { axios.get(`${API}/zone-categories`).then(res => { if (res.data?.length > 0) setZoneTypes(res.data); }).catch(() => {}); }, []);
  useEffect(() => { if (selectedFloor) { fetchSessions(); setActiveSession(null); setImgRatio(null); } }, [selectedFloor, fetchSessions]);

  // Wheel zoom callback
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
    node.addEventListener("wheel", handler, { passive: false });
    return () => node.removeEventListener("wheel", handler);
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
      if (updateData.status) { setMapMode("pan"); setSelectedZoneId(null); setDrawingPoints([]); }
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
    await handleUpdateZone(zoneId, { zone_type: newType, fill_color: typeInfo?.color || "#22c55e" });
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
        fill_color: typeInfo?.color || newZoneForm.fill_color, stroke_color: "#000000", stroke_style: "dashed",
        area_sqm: newZoneForm.area_sqm || 0, per_person_sqm: newZoneForm.per_person_sqm || 0.8, max_capacity: newZoneForm.max_capacity || 0,
        length_m: newZoneForm.length_m || 0, width_m: newZoneForm.width_m || 0,
        carpet_length: newZoneForm.carpet_length || 1.2, carpet_width: newZoneForm.carpet_width || 0.7,
        daily_note: newZoneForm.daily_note || "",
      }, getAuthHeaders());
      setActiveSession(res.data); setShowNewZoneDialog(false); setDrawingPoints([]);
      setNewZoneForm({ zone_code: "", name_ar: "", name_en: "", zone_type: "men_prayer", fill_color: "#22c55e", area_sqm: 0, per_person_sqm: 0.8, max_capacity: 0, length_m: "", width_m: "", carpet_length: "1.2", carpet_width: "0.7", daily_note: "" });
      setMapMode("pan");
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
      setMapMode("pan"); setSelectedZoneId(null); setDrawingPoints([]); setRectStart(null); setFreehandPoints([]);
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
        else if (mapMode !== "pan") setMapMode("pan");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawingPoints.length, selectedZoneId, mapMode, rectStart, undoStack.length, redoStack.length, mapUndoStack.length, mapRedoStack.length, undoDrawing, redoDrawing, undoMapAction, redoMapAction]);

  useEffect(() => { setDensityEdits({}); }, [activeSession?.id]);

  // ─── Density Handlers ─────────────────────────────────────
  const handleDensityChange = (zoneId, field, value) => {
    if (field === "prayer_count") {
      setDensityEdits(prev => ({ ...prev, [zoneId]: { ...prev[zoneId], prayer_counts: { ...(prev[zoneId]?.prayer_counts || {}), [activePrayer]: value } } }));
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
    return { totalActive: active.length, totalRemoved: removed.length, totalAll: activeSession.zones.length, uniqueCategories: activeCats.length, catCounts, prevSession, prevCatCounts, prevTotalActive, hasPrevious: !!prevSession && Object.keys(prevCatCounts).length > 0, activeCats };
  }, [activeSession, sessions, ZONE_TYPES]);

  const densityStats = useMemo(() => {
    if (!activeSession?.zones) return null;
    const active = activeSession.zones.filter(z => !z.is_removed);
    let totalCurrent = 0, totalCapacity = 0, criticalCount = 0, highCount = 0;
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
      if (info.level === "max" || info.level === "over") criticalCount++;
      if (info.level === "medium") highCount++;
      return { ...z, fillPct, actualCount, capMax, capSafe, capMedium, currentDisplay: actualCount, maxDisplay: capMax, densityInfo: info, prayerCounts: { ...prayerCounts, ...editedPrayers }, totalRows, carpetsPerRow, totalCarpets, filledRows };
    });
    const overallPct = totalCapacity > 0 ? Math.round((totalCurrent / totalCapacity) * 100) : 0;
    const overallLevel = getDensityLevel(totalCurrent, totalCapacity);
    return { zonesDensity, totalCurrent, totalCapacity, overallPct, overallLevel, criticalCount, highCount };
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-cairo font-bold text-2xl" data-testid="page-title">{isAr ? "السجل اليومي للخرائط" : "Daily Map Log"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{isAr ? "تتبع التغييرات اليومية للمصليات والمناطق في كل طابق" : "Track daily changes to prayer areas and zones per floor"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedFloor?.id || ""} onValueChange={(v) => setSelectedFloor(floors.find(f => f.id === v))}>
            <SelectTrigger className="w-44" data-testid="floor-select"><Layers className="w-4 h-4 ml-1" /><SelectValue placeholder={isAr ? "اختر الطابق" : "Select floor"} /></SelectTrigger>
            <SelectContent>{floors.map(f => <SelectItem key={f.id} value={f.id} data-testid={`floor-option-${f.id}`}>{isAr ? f.name_ar : f.name_en}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => { setCloneSource("auto"); setNewSessionDate(today); setShowNewSessionDialog(true); }} disabled={!selectedFloor} data-testid="start-new-tour-btn" className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 ml-1" />{isAr ? "جولة جديدة" : "New Tour"}
          </Button>
          <Button variant="outline" onClick={() => { setBatchStartDate(""); setBatchEndDate(""); setBatchCloneSource("master"); setShowBatchDialog(true); }} disabled={!selectedFloor} data-testid="batch-entry-btn">
            <CalendarRange className="w-4 h-4 ml-1" />{isAr ? "إدخال متعدد" : "Batch"}
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <ArchiveSessionSidebar
          sessions={sessions} activeSession={activeSession} setActiveSession={setActiveSession}
          setZoom={setZoom} setPanOffset={setPanOffset} zoomRef={zoomRef}
          setNewSessionDate={setNewSessionDate} setCloneSource={setCloneSource} setShowNewSessionDialog={setShowNewSessionDialog}
          handleCompare={handleCompare} handleDeleteSession={handleDeleteSession}
        />

        <div className="lg:col-span-3">
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="map" data-testid="tab-map"><MapPin className="w-4 h-4 ml-1" />{isAr ? "الخريطة" : "Map"}<Badge variant="secondary" className="mr-1 text-[10px] px-1.5">{activeZones.length}</Badge></TabsTrigger>
                  <TabsTrigger value="stats" data-testid="tab-stats"><BarChart3 className="w-4 h-4 ml-1" />{isAr ? "إحصائيات" : "Stats"}</TabsTrigger>
                  <TabsTrigger value="density" data-testid="tab-density"><Activity className="w-4 h-4 ml-1" />{isAr ? "الكثافات" : "Density"}{densityStats?.criticalCount > 0 && <Badge variant="destructive" className="mr-1 text-[10px] px-1.5">{densityStats.criticalCount}</Badge>}</TabsTrigger>
                </TabsList>

                <TabsContent value="map" className="space-y-3">
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
                  <MapCanvas
                    selectedFloor={selectedFloor} activeSession={activeSession}
                    sessionZones={sessionZones} activeZones={activeZones} removedZones={removedZones}
                    mapMode={mapMode} zoom={zoom} panOffset={panOffset} setPanOffset={setPanOffset}
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
                  />
                  <ChangesLog
                    activeSession={activeSession} changedZones={changedZones} ZONE_TYPES={ZONE_TYPES}
                  />
                </TabsContent>

                <TabsContent value="density" className="space-y-5">
                  <DensityTab
                    activeSession={activeSession} densityStats={densityStats}
                    densityEdits={densityEdits} activePrayer={activePrayer} setActivePrayer={setActivePrayer}
                    handleDensityChange={handleDensityChange} handleSaveDensityBatch={handleSaveDensityBatch}
                    savingDensity={savingDensity} selectedFloor={selectedFloor}
                    imgRatio={imgRatio} ZONE_TYPES={ZONE_TYPES}
                  />
                </TabsContent>

                <TabsContent value="stats" className="space-y-5">
                  <StatsTab sessionStats={sessionStats} changedZones={changedZones} ZONE_TYPES={ZONE_TYPES} sessions={sessions} />
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
      <NewZoneDialog open={showNewZoneDialog} onOpenChange={(v) => { setShowNewZoneDialog(v); if (!v) setMapMode("pan"); }} newZoneForm={newZoneForm} setNewZoneForm={setNewZoneForm} drawingPoints={drawingPoints} setDrawingPoints={setDrawingPoints} handleSaveNewZone={handleSaveNewZone} ZONE_TYPES={ZONE_TYPES} />
      <NotesDialog open={showNotesDialog} onOpenChange={setShowNotesDialog} sessionNotes={sessionNotes} setSessionNotes={setSessionNotes} handleUpdateSession={handleUpdateSession} />
      <CompareDialog open={showCompareDialog} onOpenChange={setShowCompareDialog} compareData={compareData} ZONE_TYPES={ZONE_TYPES} />
    </div>
  );
}
