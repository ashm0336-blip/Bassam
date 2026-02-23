import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
  Plus, Trash2, Save, X, Calendar as CalendarIcon, ChevronRight, ChevronLeft,
  Eye, Clock, FileText, CheckCircle2, AlertCircle, ArrowLeftRight, MapPin,
  RefreshCw, Edit2, MessageSquare, Layers, ZoomIn, ZoomOut, Maximize2,
  RotateCcw, Check, CircleDot, CircleOff, ArrowRight, Tag, Copy,
  CalendarRange, FileStack, Database, Hand, Pencil, MousePointer,
  Undo2, Circle, Square, Triangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ZONE_TYPES = [
  { value: "men_prayer", label_ar: "مصلى رجال", label_en: "Men Prayer", color: "#22c55e", icon: "M" },
  { value: "women_prayer", label_ar: "مصلى نساء", label_en: "Women Prayer", color: "#93c5fd", icon: "W" },
  { value: "men_rakatayn", label_ar: "مصلى الركعتين للرجال", label_en: "Two-Rak'ah Men", color: "#16a34a", icon: "R" },
  { value: "women_rakatayn", label_ar: "مصلى الركعتين للنساء", label_en: "Two-Rak'ah Women", color: "#60a5fa", icon: "Q" },
  { value: "men_tasks", label_ar: "مصلى مهمات رجال", label_en: "Men Tasks Prayer", color: "#9ca3af", icon: "H" },
  { value: "women_tasks", label_ar: "مصلى مهمات نساء", label_en: "Women Tasks Prayer", color: "#fdba74", icon: "N" },
  { value: "emergency", label_ar: "مجمعات خدمات الطوارئ", label_en: "Emergency Services", color: "#78350f", icon: "!" },
  { value: "vip", label_ar: "مصلى رؤساء الدول", label_en: "VIP / Heads of State", color: "#1e3a5f", icon: "V" },
  { value: "mataf", label_ar: "صحن المطاف", label_en: "Mataf", color: "#84cc16", icon: "T" },
  { value: "masaa", label_ar: "المسعى", label_en: "Masa'a", color: "#06b6d4", icon: "S" },
  { value: "service", label_ar: "منطقة خدمات", label_en: "Service", color: "#6b7280", icon: "X" },
  { value: "entry", label_ar: "مدخل", label_en: "Entry", color: "#10b981", icon: "E" },
  { value: "exit", label_ar: "مخرج", label_en: "Exit", color: "#ef4444", icon: "O" },
  { value: "escalator", label_ar: "سلم كهربائي", label_en: "Escalator", color: "#8b5cf6", icon: "L" },
  { value: "kaaba", label_ar: "الكعبة المشرفة", label_en: "Kaaba", color: "#1a1a1a", icon: "K" },
  { value: "expansion", label_ar: "توسعة", label_en: "Expansion", color: "#64748b", icon: "P" },
];

const CHANGE_LABELS = {
  added: { ar: "مضاف", en: "Added", color: "#22c55e", bg: "#dcfce7" },
  removed: { ar: "تم الإزالة", en: "Removed", color: "#ef4444", bg: "#fef2f2" },
  modified: { ar: "معدّل", en: "Modified", color: "#f59e0b", bg: "#fefce8" },
  category_changed: { ar: "تغيير فئة", en: "Category Changed", color: "#8b5cf6", bg: "#f5f3ff" },
  moved: { ar: "تم النقل", en: "Moved", color: "#06b6d4", bg: "#ecfeff" },
  unchanged: { ar: "بدون تغيير", en: "Unchanged", color: "#94a3b8", bg: "#f8fafc" },
};

const AR_WEEKDAYS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

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

  // UI state
  const [activeTab, setActiveTab] = useState("map");
  const [selectedZone, setSelectedZone] = useState(null);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  // New session form state
  const [newSessionDate, setNewSessionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [cloneSource, setCloneSource] = useState("auto"); // auto, master, empty, or session_id
  const [batchStartDate, setBatchStartDate] = useState("");
  const [batchEndDate, setBatchEndDate] = useState("");
  const [batchCloneSource, setBatchCloneSource] = useState("master");

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // Map state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [imgRatio, setImgRatio] = useState(null);
  const [hoveredZone, setHoveredZone] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const mapContainerRef = useRef(null);
  const svgRef = useRef(null);

  // Drawing state
  const [mapMode, setMapMode] = useState("pan"); // pan, draw, edit, rect
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [nearStart, setNearStart] = useState(false);
  const [showNewZoneDialog, setShowNewZoneDialog] = useState(false);
  const [newZoneForm, setNewZoneForm] = useState({ zone_code: "", name_ar: "", name_en: "", zone_type: "men_prayer", fill_color: "#22c55e" });
  const [rectStart, setRectStart] = useState(null); // For rectangle drag mode
  const [rectEnd, setRectEnd] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isDraggingZone, setIsDraggingZone] = useState(false);
  const [dragZoneStart, setDragZoneStart] = useState(null);
  const DRAW_POINT_RADIUS = 0.08;
  const SNAP_DISTANCE = 1.2;

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const normalizeImageUrl = (url) => {
    if (!url) return url;
    let value = url;
    if (value.includes(".preview.emergentagent.com") && !value.startsWith(process.env.REACT_APP_BACKEND_URL)) {
      const pathMatch = value.match(/\/(?:api\/)?uploads\/.+$/);
      if (pathMatch) value = `${process.env.REACT_APP_BACKEND_URL}${pathMatch[0].startsWith("/api") ? pathMatch[0] : "/api" + pathMatch[0]}`;
    }
    if (value.startsWith("/")) value = `${process.env.REACT_APP_BACKEND_URL}${value}`;
    else if (value.startsWith("uploads/")) value = `${process.env.REACT_APP_BACKEND_URL}/${value}`;
    if (value.includes("/uploads/") && !value.includes("/api/uploads/")) value = value.replace("/uploads/", "/api/uploads/");
    return value;
  };

  // Fetch
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
  useEffect(() => {
    if (selectedFloor) {
      fetchSessions();
      setActiveSession(null);
      setImgRatio(null);
    }
  }, [selectedFloor, fetchSessions]);

  // Session dates set for quick lookup
  const sessionDatesMap = useMemo(() => {
    const map = {};
    sessions.forEach(s => { map[s.date] = s; });
    return map;
  }, [sessions]);

  // Calendar helpers
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();
    const days = [];
    // Fill leading blanks
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  }, [calendarYear, calendarMonth]);

  const navigateCalendar = (delta) => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const getDayDateStr = (day) => {
    if (!day) return null;
    const m = String(calendarMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${calendarYear}-${m}-${d}`;
  };

  const handleCalendarDayClick = (day) => {
    if (!day) return;
    const dateStr = getDayDateStr(day);
    const existingSession = sessionDatesMap[dateStr];
    if (existingSession) {
      setActiveSession(existingSession);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      zoomRef.current = 1;
    } else {
      setNewSessionDate(dateStr);
      setCloneSource("auto");
      setShowNewSessionDialog(true);
    }
  };

  // Wheel zoom
  const wheelRef = useCallback((node) => {
    if (!node) return;
    mapContainerRef.current = node;
    const handler = (e) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const prev = zoomRef.current;
      const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const nz = Math.max(0.5, Math.min(6, prev * delta));
      const s = nz / prev;
      zoomRef.current = nz;
      setZoom(nz);
      setPanOffset(p => ({ x: mx - s * (mx - p.x), y: my - s * (my - p.y) }));
    };
    node.addEventListener("wheel", handler, { passive: false });
    return () => node.removeEventListener("wheel", handler);
  }, []);

  // Pan (old handlers removed - now using handleMapMouseDown/Move/Up)
  const getPath = (points, close = true) => {
    if (!points || points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
    if (close && points.length > 2) d += " Z";
    return d;
  };

  // SVG coordinate helpers
  const getMousePercent = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const t = pt.matrixTransform(ctm.inverse());
    return { x: Math.max(0, Math.min(100, t.x)), y: Math.max(0, Math.min(100, t.y)) };
  };
  const getDistance = (p1, p2) => Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  const getHitPointIndex = (points, pos) => {
    if (!points?.length) return -1;
    const radius = 2 / Math.max(zoom, 0.5);
    return points.findIndex((p) => getDistance(pos, p) < radius);
  };
  const isPointInPolygon = (point, polygon) => {
    if (!polygon || polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;

  // Get center of polygon
  const getZoneCenter = (points) => {
    if (!points?.length) return { x: 50, y: 50 };
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    return { x: cx, y: cy };
  };

  // Rotate points around center by angle (radians)
  const rotatePoints = (points, center, angle) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return points.map(p => ({
      x: center.x + (p.x - center.x) * cos - (p.y - center.y) * sin,
      y: center.y + (p.x - center.x) * sin + (p.y - center.y) * cos,
    }));
  };

  // Move all points by delta
  const movePoints = (points, dx, dy) => {
    return points.map(p => ({ x: p.x + dx, y: p.y + dy }));
  };

  // Get rotation handle position (above center of zone)
  const getRotationHandle = (points) => {
    if (!points?.length) return null;
    const center = getZoneCenter(points);
    // Find the topmost point to place handle above it
    const minY = Math.min(...points.map(p => p.y));
    const handleOffset = 3 / Math.max(zoom, 0.5);
    return { x: center.x, y: minY - handleOffset, cx: center.x, cy: center.y };
  };
  };

  // Session zones as mutable local state for editing
  const sessionZones = activeSession?.zones || [];

  // Shape generators
  const generateShape = (type) => {
    const cx = 50, cy = 50;
    let points;
    if (type === "circle") points = Array.from({ length: 24 }, (_, i) => ({ x: cx + 15 * Math.cos(2 * Math.PI * i / 24), y: cy + 15 * Math.sin(2 * Math.PI * i / 24) }));
    else if (type === "rectangle") points = [{ x: cx - 20, y: cy - 15 }, { x: cx + 20, y: cy - 15 }, { x: cx + 20, y: cy + 15 }, { x: cx - 20, y: cy + 15 }];
    else if (type === "triangle") points = Array.from({ length: 3 }, (_, i) => ({ x: cx + 18 * Math.cos(2 * Math.PI * i / 3 - Math.PI / 2), y: cy + 18 * Math.sin(2 * Math.PI * i / 3 - Math.PI / 2) }));
    if (points) { setDrawingPoints(points); setShowNewZoneDialog(true); }
  };

  // Map mouse handlers for drawing/editing
  const handleMapMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const pos = getMousePercent(e);
    if (mapMode === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } else if (mapMode === "rect") {
      setRectStart(pos);
      setRectEnd(pos);
    } else if (mapMode === "edit" && selectedZoneId) {
      const zone = sessionZones.find(z => z.id === selectedZoneId);
      if (!zone?.polygon_points) return;
      const hitIndex = getHitPointIndex(zone.polygon_points, pos);
      if (hitIndex !== -1) { setDraggingPoint(hitIndex); setHoveredPoint(hitIndex); return; }
      // Midpoint handle
      const pts = zone.polygon_points;
      const midRadius = 1.5 / Math.max(zoom, 0.5);
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        const mx = (pts[i].x + pts[j].x) / 2, my = (pts[i].y + pts[j].y) / 2;
        if (getDistance(pos, { x: mx, y: my }) < midRadius) {
          const newPoints = [...pts]; newPoints.splice(j, 0, { x: pos.x, y: pos.y });
          // Update zone in session locally
          const updatedSession = { ...activeSession, zones: activeSession.zones.map(z => z.id === selectedZoneId ? { ...z, polygon_points: newPoints } : z) };
          setActiveSession(updatedSession);
          setDraggingPoint(j); setHoveredPoint(j); return;
        }
      }
    }
  };

  const handleMapMouseMove = (e) => {
    const pos = getMousePercent(e);
    setMousePos(pos);
    if (isPanning && mapMode === "pan") { setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); return; }
    if (mapMode === "rect" && rectStart) { setRectEnd(pos); return; }
    if (draggingPoint !== null && selectedZoneId) {
      const updatedSession = { ...activeSession, zones: activeSession.zones.map(z => {
        if (z.id !== selectedZoneId) return z;
        const newPts = [...z.polygon_points]; newPts[draggingPoint] = { x: pos.x, y: pos.y };
        return { ...z, polygon_points: newPts };
      })};
      setActiveSession(updatedSession);
      return;
    }
    if (mapMode === "edit" && selectedZoneId) {
      const zone = sessionZones.find(z => z.id === selectedZoneId);
      const hit = getHitPointIndex(zone?.polygon_points, pos);
      setHoveredPoint(hit !== -1 ? hit : null);
    }
    if (mapMode === "draw" && drawingPoints.length >= 3) setNearStart(getDistance(pos, drawingPoints[0]) < SNAP_DISTANCE);
    // Tooltip
    if (mapMode !== "draw" && draggingPoint === null && !isPanning) {
      if (mapContainerRef.current) {
        const rect = mapContainerRef.current.getBoundingClientRect();
        setTooltipPos({ x: e.clientX - rect.left + 16, y: e.clientY - rect.top - 10 });
      }
      let found = null;
      for (const zone of sessionZones) {
        if (!zone.is_removed && isPointInPolygon(pos, zone.polygon_points)) { found = zone; break; }
      }
      if (found?.id !== hoveredZone?.id) setHoveredZone(found || null);
    } else if (hoveredZone) setHoveredZone(null);
  };

  const handleMapMouseUp = async () => {
    // Rectangle mode: finalize and open dialog
    if (mapMode === "rect" && rectStart && rectEnd) {
      const x1 = Math.min(rectStart.x, rectEnd.x), y1 = Math.min(rectStart.y, rectEnd.y);
      const x2 = Math.max(rectStart.x, rectEnd.x), y2 = Math.max(rectStart.y, rectEnd.y);
      if (Math.abs(x2 - x1) > 1 && Math.abs(y2 - y1) > 1) {
        setDrawingPoints([{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }]);
        setShowNewZoneDialog(true);
      }
      setRectStart(null); setRectEnd(null);
      return;
    }
    if (draggingPoint !== null && selectedZoneId) {
      const zone = sessionZones.find(z => z.id === selectedZoneId);
      if (zone) {
        try {
          const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}/zones/${selectedZoneId}`, { polygon_points: zone.polygon_points }, getAuthHeaders());
          setActiveSession(res.data);
        } catch (e) { console.error(e); }
      }
    }
    setIsPanning(false); setDraggingPoint(null); setHoveredPoint(null);
  };

  const handleMapClick = (e) => {
    if (isPanning || draggingPoint !== null) return;
    e.preventDefault();
    const pos = getMousePercent(e);
    if (mapMode === "draw") {
      if (drawingPoints.length >= 3 && nearStart) { setShowNewZoneDialog(true); return; }
      setDrawingPoints(prev => [...prev, { x: pos.x, y: pos.y }]);
    } else if (mapMode === "edit") {
      if (e.target?.closest && e.target.closest("[data-zone-id]")) return;
      let found = null;
      for (const zone of sessionZones) {
        if (!zone.is_removed && isPointInPolygon(pos, zone.polygon_points)) { found = zone; break; }
      }
      setSelectedZoneId(found?.id || null);
    }
  };

  // Save new drawn zone to session
  const handleSaveNewZone = async () => {
    if (!activeSession || drawingPoints.length < 3) return;
    const typeInfo = ZONE_TYPES.find(t => t.value === newZoneForm.zone_type);
    try {
      const res = await axios.post(`${API}/admin/map-sessions/${activeSession.id}/zones`, {
        zone_code: newZoneForm.zone_code || `Z-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        name_ar: newZoneForm.name_ar || (isAr ? typeInfo?.label_ar : typeInfo?.label_en) || "منطقة جديدة",
        name_en: newZoneForm.name_en || typeInfo?.label_en || "New Zone",
        zone_type: newZoneForm.zone_type,
        polygon_points: drawingPoints,
        fill_color: typeInfo?.color || newZoneForm.fill_color,
      }, getAuthHeaders());
      setActiveSession(res.data);
      setShowNewZoneDialog(false);
      setDrawingPoints([]);
      setNewZoneForm({ zone_code: "", name_ar: "", name_en: "", zone_type: "men_prayer", fill_color: "#22c55e" });
      setMapMode("pan");
      toast.success(isAr ? "تم إضافة المنطقة" : "Zone added");
    } catch (e) { toast.error(isAr ? "تعذرت الإضافة" : "Error adding zone"); }
  };

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (rectStart) { setRectStart(null); setRectEnd(null); }
        else if (drawingPoints.length > 0) { setDrawingPoints([]); setNearStart(false); }
        else if (selectedZoneId) setSelectedZoneId(null);
        else if (mapMode !== "pan") setMapMode("pan");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawingPoints.length, selectedZoneId, mapMode, rectStart]);

  // Resolve clone source for API call
  const resolveCloneFrom = () => {
    if (cloneSource === "auto") {
      return sessions.length > 0 ? sessions[0].id : "master";
    }
    return cloneSource; // "master", "empty", or a session id
  };

  // Create session
  const handleCreateSession = async () => {
    if (!selectedFloor) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/admin/map-sessions`, {
        date: newSessionDate,
        floor_id: selectedFloor.id,
        clone_from: resolveCloneFrom(),
      }, getAuthHeaders());
      setActiveSession(res.data);
      await fetchSessions();
      setShowNewSessionDialog(false);
      toast.success(isAr ? "تم بدء جولة جديدة" : "New tour started");
    } catch (e) {
      toast.error(e.response?.data?.detail || (isAr ? "تعذر إنشاء الجلسة" : "Error"));
    } finally { setSaving(false); }
  };

  // Batch create
  const handleBatchCreate = async () => {
    if (!selectedFloor || !batchStartDate || !batchEndDate) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/admin/map-sessions/batch`, {
        start_date: batchStartDate,
        end_date: batchEndDate,
        floor_id: selectedFloor.id,
        clone_from: batchCloneSource,
      }, getAuthHeaders());
      const data = res.data;
      await fetchSessions();
      setShowBatchDialog(false);
      toast.success(
        isAr
          ? `تم إنشاء ${data.total_created} جلسة${data.total_skipped > 0 ? ` (تم تخطي ${data.total_skipped} أيام موجودة مسبقاً)` : ""}`
          : `Created ${data.total_created} sessions${data.total_skipped > 0 ? ` (${data.total_skipped} skipped)` : ""}`
      );
    } catch (e) {
      toast.error(e.response?.data?.detail || (isAr ? "تعذر الإنشاء" : "Error"));
    } finally { setSaving(false); }
  };

  // Zone operations
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
  const handleAddNote = async (zoneId, note) => {
    await handleUpdateZone(zoneId, { daily_note: note });
  };
  const handleUpdateSession = async (updateData) => {
    if (!activeSession) return;
    try {
      const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}`, updateData, getAuthHeaders());
      setActiveSession(res.data);
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
      setCompareData(res.data);
      setShowCompareDialog(true);
    } catch (e) { toast.error(isAr ? "تعذرت المقارنة" : "Compare failed"); }
  };

  // Computed
  const activeZones = activeSession?.zones?.filter(z => !z.is_removed) || [];
  const removedZones = activeSession?.zones?.filter(z => z.is_removed) || [];
  const changedZones = activeSession?.zones?.filter(z => z.change_type && z.change_type !== "unchanged") || [];

  const formatDate = (dateStr) => {
    try { return new Date(dateStr + "T00:00:00").toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); }
    catch { return dateStr; }
  };
  const formatDateShort = (dateStr) => {
    try { return new Date(dateStr + "T00:00:00").toLocaleDateString("ar-SA", { month: "short", day: "numeric" }); }
    catch { return dateStr; }
  };

  // Clone source label
  const getSourceLabel = (src) => {
    if (src === "auto") return isAr ? "تلقائي (آخر جولة)" : "Auto (latest)";
    if (src === "master") return isAr ? "الخريطة الأساسية" : "Master Map";
    if (src === "empty") return isAr ? "بدء فارغ (بدون مناطق)" : "Empty (no zones)";
    const s = sessions.find(x => x.id === src);
    return s ? `${isAr ? "جولة " : "Tour "}${formatDateShort(s.date)}` : src;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="sessions-loading">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto flex items-center justify-center mb-3 animate-pulse">
            <CalendarIcon className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-5" data-testid="daily-sessions-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-cairo font-bold text-2xl" data-testid="page-title">
            {isAr ? "السجل اليومي للخرائط" : "Daily Map Log"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "تتبع التغييرات اليومية للمصليات والمناطق في كل طابق" : "Track daily changes to prayer areas and zones per floor"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedFloor?.id || ""} onValueChange={(v) => setSelectedFloor(floors.find(f => f.id === v))}>
            <SelectTrigger className="w-44" data-testid="floor-select">
              <Layers className="w-4 h-4 ml-1" />
              <SelectValue placeholder={isAr ? "اختر الطابق" : "Select floor"} />
            </SelectTrigger>
            <SelectContent>
              {floors.map(f => (
                <SelectItem key={f.id} value={f.id} data-testid={`floor-option-${f.id}`}>
                  {isAr ? f.name_ar : f.name_en}
                </SelectItem>
              ))}
            </SelectContent>
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
        {/* LEFT SIDEBAR: Calendar + Session List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Monthly Calendar */}
          <Card data-testid="monthly-calendar">
            <CardContent className="p-3">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-3">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateCalendar(1)} data-testid="calendar-next">
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <span className="font-cairo font-semibold text-sm" data-testid="calendar-month-label">
                  {isAr ? AR_MONTHS[calendarMonth] : new Date(calendarYear, calendarMonth).toLocaleDateString("en", { month: "long" })} {calendarYear}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateCalendar(-1)} data-testid="calendar-prev">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {AR_WEEKDAYS.map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">{isAr ? d : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i]}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`blank-${i}`} />;
                  const dateStr = getDayDateStr(day);
                  const session = sessionDatesMap[dateStr];
                  const isToday = dateStr === today;
                  const isActiveDay = activeSession?.date === dateStr;

                  return (
                    <button
                      key={day}
                      data-testid={`calendar-day-${day}`}
                      onClick={() => handleCalendarDayClick(day)}
                      className={`
                        relative flex flex-col items-center justify-center rounded-lg py-1.5 text-xs transition-all duration-150
                        ${isActiveDay
                          ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-200"
                          : isToday
                            ? "bg-slate-100 font-semibold ring-1 ring-slate-300"
                            : "hover:bg-slate-50"
                        }
                        ${session && !isActiveDay ? "font-medium" : ""}
                      `}
                    >
                      <span>{day}</span>
                      {session && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            isActiveDay ? "bg-white" :
                            session.status === "completed" ? "bg-emerald-500" : "bg-amber-400"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />{isAr ? "مكتمل" : "Done"}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />{isAr ? "مسودة" : "Draft"}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-slate-200" />{isAr ? "فارغ" : "Empty"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session List */}
          <div className="space-y-2">
            <h3 className="font-cairo font-semibold text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {isAr ? "سجل الجولات" : "Tour History"}
              <Badge variant="secondary" className="text-[10px] px-1.5">{sessions.length}</Badge>
            </h3>

            {sessions.length === 0 ? (
              <div className="text-center py-6">
                <CalendarIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">{isAr ? "لا توجد جولات بعد" : "No tours yet"}</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[calc(100vh-620px)] overflow-y-auto pr-1">
                {sessions.map((s) => {
                  const isActive = activeSession?.id === s.id;
                  const changes = s.changes_summary || {};
                  const totalChanges = (changes.added || 0) + (changes.removed || 0) + (changes.modified || 0);
                  return (
                    <div
                      key={s.id}
                      data-testid={`session-card-${s.id}`}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all duration-150 group ${
                        isActive ? "border-emerald-500 bg-emerald-50/60 shadow-sm" : "hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                      onClick={() => { setActiveSession(s); setZoom(1); setPanOffset({ x: 0, y: 0 }); zoomRef.current = 1; }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-xs">{formatDateShort(s.date)}</span>
                          <Badge className={`text-[9px] px-1 py-0 ${s.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {s.status === "completed" ? (isAr ? "مكتمل" : "Done") : (isAr ? "مسودة" : "Draft")}
                          </Badge>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {activeSession && activeSession.id !== s.id && (
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleCompare(s.id); }} data-testid={`compare-btn-${s.id}`}>
                              <ArrowLeftRight className="w-3 h-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }} data-testid={`delete-session-btn-${s.id}`}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {totalChanges > 0 && (
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          {changes.added > 0 && <span className="text-emerald-600 flex items-center gap-0.5"><Plus className="w-3 h-3" />{changes.added}</span>}
                          {changes.removed > 0 && <span className="text-red-500 flex items-center gap-0.5"><X className="w-3 h-3" />{changes.removed}</span>}
                          {changes.modified > 0 && <span className="text-amber-600 flex items-center gap-0.5"><Edit2 className="w-3 h-3" />{changes.modified}</span>}
                        </div>
                      )}
                      {s.supervisor_notes && (
                        <p className="text-[10px] text-slate-500 mt-1 truncate flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 flex-shrink-0" />{s.supervisor_notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Active Session */}
        <div className="lg:col-span-3">
          {!activeSession ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-4">
                  <Eye className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="font-cairo font-semibold text-lg text-slate-600 mb-2">
                  {isAr ? "اختر يوماً من التقويم أو ابدأ جولة جديدة" : "Pick a day from the calendar or start a new tour"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {isAr
                    ? "اضغط على يوم في التقويم لعرض جولته، أو اضغط على يوم فارغ لإنشاء جولة جديدة بأثر رجعي"
                    : "Click a day in the calendar to view its tour, or click an empty day to create a retroactive tour"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Session Header */}
              <div className="relative overflow-hidden rounded-xl border bg-gradient-to-l from-emerald-50 via-white to-slate-50 p-4">
                <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-emerald-200/30 blur-2xl" />
                <div className="relative flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                      <CalendarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="font-cairo font-bold text-lg" data-testid="session-date-title">
                        {isAr ? "جولة " : "Tour "}{formatDate(activeSession.date)}
                      </h2>
                      <div className="flex items-center gap-3 mt-0.5">
                        <Badge className={`text-xs ${activeSession.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`} data-testid="session-status-badge">
                          {activeSession.status === "completed" ? (isAr ? "مكتملة" : "Completed") : (isAr ? "مسودة" : "Draft")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{activeZones.length} {isAr ? "منطقة نشطة" : "active zones"}</span>
                        {activeSession.created_by && <span className="text-xs text-muted-foreground">{isAr ? "بواسطة: " : "By: "}{activeSession.created_by}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setSessionNotes(activeSession.supervisor_notes || ""); setShowNotesDialog(true); }} data-testid="add-notes-btn">
                      <MessageSquare className="w-4 h-4 ml-1" />{isAr ? "ملاحظات" : "Notes"}
                    </Button>
                    {activeSession.status === "draft" ? (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleUpdateSession({ status: "completed" })} data-testid="complete-session-btn">
                        <CheckCircle2 className="w-4 h-4 ml-1" />{isAr ? "إنهاء الجولة" : "Complete"}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleUpdateSession({ status: "draft" })} data-testid="reopen-session-btn">
                        <RotateCcw className="w-4 h-4 ml-1" />{isAr ? "إعادة فتح" : "Reopen"}
                      </Button>
                    )}
                  </div>
                </div>
                {activeSession.changes_summary && (
                  <div className="relative flex items-center gap-3 mt-3 pt-3 border-t border-slate-200/60 flex-wrap">
                    {Object.entries(activeSession.changes_summary).map(([key, val]) => {
                      if (val === 0) return null;
                      const label = CHANGE_LABELS[key];
                      if (!label) return null;
                      return (
                        <div key={key} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: label.bg, color: label.color }} data-testid={`change-summary-${key}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                          {val} {isAr ? label.ar : label.en}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="map" data-testid="tab-map"><MapPin className="w-4 h-4 ml-1" />{isAr ? "الخريطة" : "Map"}</TabsTrigger>
                  <TabsTrigger value="zones" data-testid="tab-zones"><Tag className="w-4 h-4 ml-1" />{isAr ? "المناطق" : "Zones"}{changedZones.length > 0 && <Badge variant="destructive" className="mr-1 text-[10px] px-1.5">{changedZones.length}</Badge>}</TabsTrigger>
                  <TabsTrigger value="changes" data-testid="tab-changes"><FileText className="w-4 h-4 ml-1" />{isAr ? "التغييرات" : "Changes"}</TabsTrigger>
                </TabsList>

                {/* MAP TAB */}
                <TabsContent value="map" className="space-y-3">
                  {/* Toolbar */}
                  {activeSession?.status === "draft" && (
                    <div className="flex justify-between items-center flex-wrap gap-3 bg-slate-50 p-3 rounded-lg">
                      {/* Mode buttons */}
                      <div className="flex items-center gap-2">
                        <div className="flex border rounded-lg overflow-hidden">
                          <Button variant={mapMode === "pan" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => { setMapMode("pan"); setDrawingPoints([]); setSelectedZoneId(null); setRectStart(null); }} data-testid="mode-pan-btn">
                            <Hand className="w-4 h-4" />
                          </Button>
                          <Button variant={mapMode === "draw" ? "default" : "ghost"} size="sm" className="rounded-none border-x" onClick={() => { setMapMode("draw"); setDrawingPoints([]); setSelectedZoneId(null); setRectStart(null); }} data-testid="mode-draw-btn">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant={mapMode === "rect" ? "default" : "ghost"} size="sm" className="rounded-none border-l" onClick={() => { setMapMode("rect"); setDrawingPoints([]); setSelectedZoneId(null); setRectStart(null); }} data-testid="mode-rect-btn" title={isAr ? "رسم مستطيل بالسحب" : "Draw Rectangle"}>
                            <Square className="w-4 h-4" />
                          </Button>
                          <Button variant={mapMode === "edit" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => { setMapMode("edit"); setDrawingPoints([]); setRectStart(null); }} data-testid="mode-edit-btn">
                            <MousePointer className="w-4 h-4" />
                          </Button>
                        </div>
                        {/* Zoom controls */}
                        <div className="flex items-center gap-1 border rounded-lg p-1 bg-white">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c = mapContainerRef.current; if (!c) return; const r = c.getBoundingClientRect(); const cx = r.width/2, cy = r.height/2; const p = zoomRef.current; const nz = Math.max(0.5, p * 0.8); const s = nz/p; zoomRef.current = nz; setZoom(nz); setPanOffset(o => ({ x: cx - s*(cx-o.x), y: cy - s*(cy-o.y) })); }} data-testid="zoom-out-btn"><ZoomOut className="w-4 h-4" /></Button>
                          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c = mapContainerRef.current; if (!c) return; const r = c.getBoundingClientRect(); const cx = r.width/2, cy = r.height/2; const p = zoomRef.current; const nz = Math.min(6, p * 1.25); const s = nz/p; zoomRef.current = nz; setZoom(nz); setPanOffset(o => ({ x: cx - s*(cx-o.x), y: cy - s*(cy-o.y) })); }} data-testid="zoom-in-btn"><ZoomIn className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { zoomRef.current=1; setZoom(1); setPanOffset({x:0,y:0}); }} data-testid="zoom-reset-btn"><Maximize2 className="w-4 h-4" /></Button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {mapMode === "draw" && (
                          <>
                            {drawingPoints.length === 0 && (
                              <div className="flex border rounded-lg overflow-hidden">
                                <Button variant="ghost" size="sm" className="rounded-none" onClick={() => generateShape("circle")} title={isAr ? "دائرة" : "Circle"} data-testid="shape-circle-btn"><Circle className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" className="rounded-none border-x" onClick={() => generateShape("rectangle")} title={isAr ? "مربع" : "Rectangle"} data-testid="shape-rect-btn"><Square className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" className="rounded-none" onClick={() => generateShape("triangle")} title={isAr ? "مثلث" : "Triangle"} data-testid="shape-triangle-btn"><Triangle className="w-4 h-4" /></Button>
                              </div>
                            )}
                            {drawingPoints.length > 0 && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => setDrawingPoints(p => p.slice(0, -1))} data-testid="drawing-undo-btn"><Undo2 className="w-4 h-4 ml-1" />{isAr ? "تراجع" : "Undo"}</Button>
                                <Button variant="outline" size="sm" onClick={() => setDrawingPoints([])} data-testid="drawing-clear-btn"><X className="w-4 h-4 ml-1" />{isAr ? "مسح" : "Clear"}</Button>
                                {drawingPoints.length >= 3 && <Button size="sm" onClick={() => setShowNewZoneDialog(true)} data-testid="drawing-save-btn"><Check className="w-4 h-4 ml-1" />{isAr ? "حفظ" : "Save"}</Button>}
                              </>
                            )}
                          </>
                        )}
                        {mapMode === "edit" && selectedZoneId && (
                          <Button variant="destructive" size="sm" onClick={() => { handleToggleRemove(selectedZoneId, false); setSelectedZoneId(null); setMapMode("pan"); }} data-testid="edit-delete-zone-btn">
                            <Trash2 className="w-4 h-4 ml-1" />{isAr ? "إزالة" : "Remove"}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  {activeSession?.status === "draft" && mapMode === "draw" && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-700"><Pencil className="w-3.5 h-3.5 inline ml-1" />{isAr ? `انقر على الخريطة لإضافة نقاط. انقر على النقطة الأولى لإغلاق الشكل. (${drawingPoints.length} نقطة)` : `Click to add points. Click first point to close. (${drawingPoints.length})`}</p>
                    </div>
                  )}
                  {activeSession?.status === "draft" && mapMode === "rect" && (
                    <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <p className="text-xs text-indigo-700"><Square className="w-3.5 h-3.5 inline ml-1" />{isAr ? "انقر واسحب لرسم مستطيل. حرر الماوس لإنهاء الشكل." : "Click and drag to draw a rectangle. Release to finish."}</p>
                    </div>
                  )}
                  {activeSession?.status === "draft" && mapMode === "edit" && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700"><MousePointer className="w-3.5 h-3.5 inline ml-1" />{isAr ? "انقر على منطقة لتحديدها، اسحب النقاط لتعديلها، انقر مزدوج لتعديل التفاصيل" : "Click zone to select, drag points to edit, double-click for details"}</p>
                    </div>
                  )}

                  {/* Zoom-only controls for completed sessions */}
                  {activeSession?.status === "completed" && (
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex items-center gap-1 border rounded-lg p-1 bg-white">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c = mapContainerRef.current; if (!c) return; const r = c.getBoundingClientRect(); const cx = r.width/2, cy = r.height/2; const p = zoomRef.current; const nz = Math.max(0.5, p * 0.8); const s = nz/p; zoomRef.current = nz; setZoom(nz); setPanOffset(o => ({ x: cx - s*(cx-o.x), y: cy - s*(cy-o.y) })); }}><ZoomOut className="w-4 h-4" /></Button>
                        <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c = mapContainerRef.current; if (!c) return; const r = c.getBoundingClientRect(); const cx = r.width/2, cy = r.height/2; const p = zoomRef.current; const nz = Math.min(6, p * 1.25); const s = nz/p; zoomRef.current = nz; setZoom(nz); setPanOffset(o => ({ x: cx - s*(cx-o.x), y: cy - s*(cy-o.y) })); }}><ZoomIn className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { zoomRef.current=1; setZoom(1); setPanOffset({x:0,y:0}); }}><Maximize2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  )}
                  {selectedFloor?.image_url ? (
                    <Card className="overflow-hidden">
                      <CardContent className="p-0">
                        <div ref={wheelRef} data-testid="session-map-container" className="relative bg-slate-100 overflow-hidden" style={{ height: "550px", cursor: mapMode === "draw" || mapMode === "rect" ? "crosshair" : mapMode === "edit" ? "default" : (isPanning ? "grabbing" : "grab") }} onMouseDown={handleMapMouseDown} onMouseMove={handleMapMouseMove} onMouseUp={handleMapMouseUp} onMouseLeave={handleMapMouseUp} onClick={handleMapClick}>
                          <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: "0 0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {(() => {
                              const ce = mapContainerRef.current;
                              let ws = { position: "relative", width: "100%", height: "100%" };
                              if (imgRatio && ce) { const cw = ce.clientWidth, ch = ce.clientHeight; if (cw/ch > imgRatio) ws = { position: "relative", height: "100%", width: ch * imgRatio }; else ws = { position: "relative", width: "100%", height: cw / imgRatio }; }
                              return (
                                <div style={ws}>
                                  <img src={selectedFloor.image_url} alt="" style={{ width: "100%", height: "100%", display: "block" }} draggable={false} className="pointer-events-none select-none" onLoad={(e) => setImgRatio(e.target.naturalWidth / e.target.naturalHeight)} />
                                  <svg ref={svgRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }} viewBox="0 0 100 100" preserveAspectRatio="none" data-testid="session-map-svg">
                                    {activeZones.map(zone => {
                                      const cl = CHANGE_LABELS[zone.change_type] || CHANGE_LABELS.unchanged;
                                      const ch = zone.change_type && zone.change_type !== "unchanged";
                                      const isSelected = zone.id === selectedZoneId;
                                      return (
                                        <g key={zone.id} data-testid={`session-zone-${zone.id}`} data-zone-id={zone.id}
                                          onMouseEnter={() => { if (mapMode !== "draw" && draggingPoint === null) setHoveredZone(zone); }}
                                          onMouseLeave={() => setHoveredZone(null)}
                                          onClick={(e) => { if (mapMode === "edit") { e.stopPropagation(); setSelectedZoneId(zone.id); } }}
                                          onDoubleClick={(e) => { if (activeSession?.status === "draft") { e.stopPropagation(); setSelectedZone(zone); setShowZoneDialog(true); } }}
                                          style={{ cursor: mapMode === "edit" || activeSession?.status === "draft" ? "pointer" : "default" }}>
                                          <path d={getPath(zone.polygon_points)} fill={zone.fill_color} fillOpacity={zone.opacity || 0.4}
                                            stroke={isSelected ? "#3b82f6" : ch ? cl.color : (zone.stroke_color || "#000")}
                                            strokeWidth={isSelected ? 0.6 : ch ? 0.8 : 0.3}
                                            strokeOpacity={isSelected ? 1 : (zone.stroke_opacity ?? 1)}
                                            strokeDasharray={isSelected ? "1 0.5" : zone.change_type === "added" ? "1.5 0.8" : "none"}
                                            vectorEffect="non-scaling-stroke" />
                                          {isSelected && mapMode === "edit" && zone.polygon_points?.map((pt, i) => {
                                            const isActive = i === draggingPoint || i === hoveredPoint;
                                            return <circle key={`v-${i}`} pointerEvents="none" cx={pt.x} cy={pt.y} r={isActive ? "0.18" : "0.1"} fill="#ef4444" stroke="white" strokeWidth="0.04" vectorEffect="non-scaling-stroke" />;
                                          })}
                                          {isSelected && mapMode === "edit" && zone.polygon_points?.map((pt, i) => {
                                            const j = (i + 1) % zone.polygon_points.length;
                                            const nx = zone.polygon_points[j];
                                            const mx = (pt.x + nx.x) / 2, my = (pt.y + nx.y) / 2;
                                            return <rect key={`m-${i}`} x={mx - 0.07} y={my - 0.07} width="0.14" height="0.14" transform={`rotate(45 ${mx} ${my})`} fill="#ef4444" stroke="white" strokeWidth="0.03" vectorEffect="non-scaling-stroke" opacity="0.4" pointerEvents="none" />;
                                          })}
                                        </g>
                                      );
                                    })}
                                    {removedZones.map(zone => (
                                      <g key={zone.id} data-testid={`session-zone-removed-${zone.id}`} onMouseEnter={() => setHoveredZone(zone)} onMouseLeave={() => setHoveredZone(null)} onClick={(e) => { e.stopPropagation(); setSelectedZone(zone); setShowZoneDialog(true); }} style={{ cursor: "pointer" }}>
                                        <path d={getPath(zone.polygon_points)} fill="#ef4444" fillOpacity={0.08} stroke="#ef4444" strokeWidth={0.5} strokeOpacity={0.4} strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" />
                                        {zone.polygon_points?.length > 0 && (() => { const cx = zone.polygon_points.reduce((s,p)=>s+p.x,0)/zone.polygon_points.length; const cy = zone.polygon_points.reduce((s,p)=>s+p.y,0)/zone.polygon_points.length; return (<g><line x1={cx-0.8} y1={cy-0.8} x2={cx+0.8} y2={cy+0.8} stroke="#ef4444" strokeWidth="0.4" vectorEffect="non-scaling-stroke" opacity="0.6"/><line x1={cx+0.8} y1={cy-0.8} x2={cx-0.8} y2={cy+0.8} stroke="#ef4444" strokeWidth="0.4" vectorEffect="non-scaling-stroke" opacity="0.6"/></g>); })()}
                                      </g>
                                    ))}
                                    {/* Drawing polygon */}
                                    {mapMode === "draw" && drawingPoints.length > 0 && (
                                      <g data-testid="drawing-layer">
                                        <path d={getPath(drawingPoints, false)} fill="none" stroke="#3b82f6" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                        <line x1={drawingPoints[drawingPoints.length-1].x} y1={drawingPoints[drawingPoints.length-1].y} x2={mousePos.x} y2={mousePos.y} stroke="#3b82f6" strokeWidth="0.4" strokeDasharray="1 0.5" vectorEffect="non-scaling-stroke" />
                                        {nearStart && drawingPoints.length >= 3 && <path d={getPath(drawingPoints)} fill={newZoneForm.fill_color} fillOpacity={0.3} stroke="#22c55e" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />}
                                        {drawingPoints.map((pt, i) => {
                                          const isStart = i === 0;
                                          const r = isStart ? (nearStart ? 0.3 : 0.15) : DRAW_POINT_RADIUS;
                                          return <circle key={i} cx={pt.x} cy={pt.y} r={r} fill={isStart ? (nearStart ? "#22c55e" : "#ef4444") : "#3b82f6"} fillOpacity={isStart ? 0.8 : 0.25} stroke="white" strokeWidth="0.08" vectorEffect="non-scaling-stroke" />;
                                        })}
                                      </g>
                                    )}
                                    {/* Rectangle drag preview */}
                                    {mapMode === "rect" && rectStart && rectEnd && (
                                      <rect
                                        x={Math.min(rectStart.x, rectEnd.x)} y={Math.min(rectStart.y, rectEnd.y)}
                                        width={Math.abs(rectEnd.x - rectStart.x)} height={Math.abs(rectEnd.y - rectStart.y)}
                                        fill={newZoneForm.fill_color} fillOpacity={0.3}
                                        stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="1 0.5"
                                        vectorEffect="non-scaling-stroke" data-testid="rect-preview"
                                      />
                                    )}
                                  </svg>
                                </div>
                              );
                            })()}
                          </div>
                          {hoveredZone && (() => {
                            const ti = ZONE_TYPES.find(t => t.value === hoveredZone.zone_type);
                            const cl = CHANGE_LABELS[hoveredZone.change_type] || CHANGE_LABELS.unchanged;
                            return (
                              <div className="absolute pointer-events-none z-50" style={{ left: tooltipPos.x, top: tooltipPos.y }} data-testid="zone-hover-tooltip">
                                <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border p-3 min-w-[200px]" style={{ borderTopColor: hoveredZone.fill_color, borderTopWidth: 3, direction: "rtl" }}>
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="font-bold text-sm">{hoveredZone.zone_code}</span>
                                    {hoveredZone.change_type !== "unchanged" && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: cl.bg, color: cl.color }}>{isAr ? cl.ar : cl.en}</span>}
                                  </div>
                                  <p className="text-xs text-slate-700">{isAr ? hoveredZone.name_ar : hoveredZone.name_en}</p>
                                  {ti && <p className="text-[10px] mt-1" style={{ color: ti.color }}>{isAr ? ti.label_ar : ti.label_en}</p>}
                                  {hoveredZone.is_removed && <p className="text-[10px] text-red-500 mt-1 font-medium">{isAr ? "تم الإزالة" : "Removed"}</p>}
                                  {hoveredZone.daily_note && <p className="text-[10px] text-slate-500 mt-1 border-t pt-1">{hoveredZone.daily_note}</p>}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  ) : <Card><CardContent className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد صورة خريطة" : "No map image"}</CardContent></Card>}
                </TabsContent>

                {/* ZONES TAB */}
                <TabsContent value="zones" className="space-y-4">
                  <div>
                    <h3 className="font-cairo font-semibold text-sm mb-3 flex items-center gap-2">
                      <CircleDot className="w-4 h-4 text-emerald-500" />{isAr ? "المناطق النشطة" : "Active Zones"}<Badge variant="secondary">{activeZones.length}</Badge>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {activeZones.map(zone => {
                        const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                        const cl = CHANGE_LABELS[zone.change_type] || CHANGE_LABELS.unchanged;
                        const ch = zone.change_type && zone.change_type !== "unchanged";
                        return (
                          <Card key={zone.id} data-testid={`zone-card-${zone.id}`} className={`transition-all hover:shadow-md ${ch ? "ring-1" : ""}`} style={ch ? { borderColor: cl.color + "40" } : {}}>
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: zone.fill_color }}>{ti?.icon || "?"}</div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-sm">{zone.zone_code}</span>
                                      {ch && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: cl.bg, color: cl.color }}>{isAr ? cl.ar : cl.en}</span>}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{isAr ? zone.name_ar : zone.name_en}</p>
                                    <p className="text-[10px] mt-0.5" style={{ color: ti?.color }}>{isAr ? ti?.label_ar : ti?.label_en}</p>
                                  </div>
                                </div>
                                {activeSession.status === "draft" && (
                                  <div className="flex flex-col gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedZone(zone); setShowZoneDialog(true); }} data-testid={`edit-zone-btn-${zone.id}`}><Edit2 className="w-3 h-3" /></Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleToggleRemove(zone.id, false)} data-testid={`remove-zone-btn-${zone.id}`}><CircleOff className="w-3 h-3" /></Button>
                                  </div>
                                )}
                              </div>
                              {zone.daily_note && <div className="mt-2 p-2 bg-amber-50 rounded text-[11px] text-amber-700 flex items-start gap-1"><MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" /><span>{zone.daily_note}</span></div>}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                  {removedZones.length > 0 && (
                    <div>
                      <h3 className="font-cairo font-semibold text-sm mb-3 flex items-center gap-2"><CircleOff className="w-4 h-4 text-red-500" />{isAr ? "المناطق المزالة" : "Removed"}<Badge variant="destructive">{removedZones.length}</Badge></h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {removedZones.map(zone => {
                          const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                          return (
                            <Card key={zone.id} className="border-red-200/50 bg-red-50/30 opacity-70" data-testid={`removed-zone-card-${zone.id}`}>
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100 text-red-500 text-xs font-bold"><X className="w-4 h-4" /></div>
                                    <div><span className="font-semibold text-sm line-through text-red-400">{zone.zone_code}</span><p className="text-xs text-red-400">{isAr ? zone.name_ar : zone.name_en}</p></div>
                                  </div>
                                  {activeSession.status === "draft" && (
                                    <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleToggleRemove(zone.id, true)} data-testid={`restore-zone-btn-${zone.id}`}>
                                      <RotateCcw className="w-3 h-3 ml-1" />{isAr ? "استعادة" : "Restore"}
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* CHANGES TAB */}
                <TabsContent value="changes" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" />{isAr ? "ملخص التغييرات" : "Changes Summary"}</CardTitle></CardHeader>
                    <CardContent>
                      {changedZones.length === 0 ? (
                        <div className="text-center py-8"><CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-3" /><p className="text-muted-foreground">{isAr ? "لا توجد تغييرات" : "No changes"}</p></div>
                      ) : (
                        <div className="space-y-3">
                          {changedZones.map(zone => {
                            const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                            const cl = CHANGE_LABELS[zone.change_type] || CHANGE_LABELS.unchanged;
                            return (
                              <div key={zone.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderRightColor: cl.color, borderRightWidth: 3 }} data-testid={`change-item-${zone.id}`}>
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cl.color }} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2"><span className="font-semibold text-sm">{zone.zone_code}</span><span className="text-xs text-muted-foreground">-</span><span className="text-xs">{isAr ? zone.name_ar : zone.name_en}</span></div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: cl.bg, color: cl.color }}>{isAr ? cl.ar : cl.en}</span>
                                    {ti && <span className="text-[10px] text-muted-foreground">{isAr ? ti.label_ar : ti.label_en}</span>}
                                  </div>
                                </div>
                                {zone.daily_note && <p className="text-[10px] text-slate-500 max-w-xs truncate">{zone.daily_note}</p>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {activeSession.supervisor_notes && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <h4 className="font-cairo font-semibold text-sm text-blue-700 flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4" />{isAr ? "ملاحظات المشرف" : "Supervisor Notes"}</h4>
                          <p className="text-sm text-blue-600 whitespace-pre-wrap">{activeSession.supervisor_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* ===== DIALOGS ===== */}

      {/* New Session Dialog (Enhanced with source selector) */}
      <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              {isAr ? "بدء جولة جديدة" : "Start New Tour"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{isAr ? "التاريخ" : "Date"}</Label>
              <Input type="date" value={newSessionDate} onChange={(e) => setNewSessionDate(e.target.value)} className="mt-1" data-testid="new-session-date" />
            </div>

            {/* Source Selector */}
            <div>
              <Label className="text-sm font-medium mb-2 block">{isAr ? "مصدر المناطق" : "Zones Source"}</Label>
              <div className="space-y-2">
                {/* Auto */}
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${cloneSource === "auto" ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-200" : "hover:bg-slate-50"}`} data-testid="source-auto">
                  <input type="radio" name="cloneSource" value="auto" checked={cloneSource === "auto"} onChange={() => setCloneSource("auto")} className="accent-emerald-600" />
                  <div className="flex items-center gap-2 flex-1">
                    <RefreshCw className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium">{isAr ? "تلقائي" : "Automatic"}</p>
                      <p className="text-[11px] text-muted-foreground">{isAr ? `نسخ من ${sessions.length > 0 ? "آخر جولة" : "الخريطة الأساسية"}` : `Clone from ${sessions.length > 0 ? "latest tour" : "master map"}`}</p>
                    </div>
                  </div>
                </label>
                {/* Master */}
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${cloneSource === "master" ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-200" : "hover:bg-slate-50"}`} data-testid="source-master">
                  <input type="radio" name="cloneSource" value="master" checked={cloneSource === "master"} onChange={() => setCloneSource("master")} className="accent-emerald-600" />
                  <div className="flex items-center gap-2 flex-1">
                    <Database className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">{isAr ? "الخريطة الأساسية" : "Master Map"}</p>
                      <p className="text-[11px] text-muted-foreground">{isAr ? "نسخ من المناطق الأصلية في إدارة الخرائط" : "Clone from original zones in map management"}</p>
                    </div>
                  </div>
                </label>
                {/* Specific session */}
                {sessions.length > 0 && (
                  <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${cloneSource !== "auto" && cloneSource !== "master" && cloneSource !== "empty" ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-200" : "hover:bg-slate-50"}`} data-testid="source-session">
                    <input type="radio" name="cloneSource" value="session" checked={cloneSource !== "auto" && cloneSource !== "master" && cloneSource !== "empty"} onChange={() => setCloneSource(sessions[0].id)} className="accent-emerald-600 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Copy className="w-4 h-4 text-purple-600" />
                        <p className="text-sm font-medium">{isAr ? "نسخ من جولة محددة" : "Clone from specific tour"}</p>
                      </div>
                      {cloneSource !== "auto" && cloneSource !== "master" && cloneSource !== "empty" && (
                        <Select value={cloneSource} onValueChange={setCloneSource}>
                          <SelectTrigger className="mt-2 h-8 text-xs" data-testid="source-session-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sessions.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {formatDateShort(s.date)} - {s.status === "completed" ? (isAr ? "مكتمل" : "Done") : (isAr ? "مسودة" : "Draft")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </label>
                )}
                {/* Empty */}
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${cloneSource === "empty" ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-200" : "hover:bg-slate-50"}`} data-testid="source-empty">
                  <input type="radio" name="cloneSource" value="empty" checked={cloneSource === "empty"} onChange={() => setCloneSource("empty")} className="accent-emerald-600" />
                  <div className="flex items-center gap-2 flex-1">
                    <FileStack className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-sm font-medium">{isAr ? "بدء فارغ" : "Start Empty"}</p>
                      <p className="text-[11px] text-muted-foreground">{isAr ? "بدون أي مناطق - ارسم من الصفر" : "No zones - draw from scratch"}</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateSession} disabled={saving || !newSessionDate} className="bg-emerald-600 hover:bg-emerald-700" data-testid="confirm-new-session">
              {saving ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <Plus className="w-4 h-4 ml-1" />}
              {isAr ? "بدء الجولة" : "Start Tour"}
            </Button>
            <Button variant="outline" onClick={() => setShowNewSessionDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Entry Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-blue-600" />
              {isAr ? "إدخال متعدد (بأثر رجعي)" : "Batch Entry (Retroactive)"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700">
                <AlertCircle className="w-4 h-4 inline ml-1" />
                {isAr
                  ? "سيتم إنشاء جلسة لكل يوم في النطاق المحدد. الأيام الي فيها جلسات مسبقة سيتم تخطيها تلقائياً."
                  : "A session will be created for each day in the range. Days with existing sessions will be skipped."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">{isAr ? "من تاريخ" : "From"}</Label>
                <Input type="date" value={batchStartDate} onChange={(e) => setBatchStartDate(e.target.value)} className="mt-1" data-testid="batch-start-date" />
              </div>
              <div>
                <Label className="text-sm font-medium">{isAr ? "إلى تاريخ" : "To"}</Label>
                <Input type="date" value={batchEndDate} onChange={(e) => setBatchEndDate(e.target.value)} className="mt-1" data-testid="batch-end-date" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">{isAr ? "مصدر المناطق" : "Zones Source"}</Label>
              <Select value={batchCloneSource} onValueChange={setBatchCloneSource}>
                <SelectTrigger data-testid="batch-source-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">{isAr ? "الخريطة الأساسية" : "Master Map"}</SelectItem>
                  <SelectItem value="empty">{isAr ? "بدء فارغ (بدون مناطق)" : "Empty (no zones)"}</SelectItem>
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{isAr ? "جولة " : "Tour "}{formatDateShort(s.date)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {batchStartDate && batchEndDate && (
              <div className="text-center p-2 bg-slate-50 rounded">
                <p className="text-sm font-medium">
                  {(() => {
                    const s = new Date(batchStartDate);
                    const e = new Date(batchEndDate);
                    const diff = Math.max(0, Math.round((e - s) / 86400000) + 1);
                    return `${diff} ${isAr ? "يوم" : "days"}`;
                  })()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleBatchCreate} disabled={saving || !batchStartDate || !batchEndDate} className="bg-blue-600 hover:bg-blue-700" data-testid="confirm-batch">
              {saving ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <CalendarRange className="w-4 h-4 ml-1" />}
              {isAr ? "إنشاء الجلسات" : "Create Sessions"}
            </Button>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Edit Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><Edit2 className="w-5 h-5" />{isAr ? "تعديل المنطقة" : "Edit Zone"}</DialogTitle></DialogHeader>
          {selectedZone && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: selectedZone.fill_color }}>{ZONE_TYPES.find(t => t.value === selectedZone.zone_type)?.icon || "?"}</div>
                <div><p className="font-semibold">{selectedZone.zone_code}</p><p className="text-xs text-muted-foreground">{isAr ? selectedZone.name_ar : selectedZone.name_en}</p></div>
              </div>
              <div>
                <Label className="text-sm font-medium">{isAr ? "تغيير الفئة" : "Change Category"}</Label>
                <Select value={selectedZone.zone_type} onValueChange={(v) => { handleCategoryChange(selectedZone.id, v); setSelectedZone(p => ({ ...p, zone_type: v })); }} disabled={activeSession?.status === "completed"}>
                  <SelectTrigger className="mt-1" data-testid="zone-category-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{ZONE_TYPES.map(t => <SelectItem key={t.value} value={t.value}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />{isAr ? t.label_ar : t.label_en}</div></SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">{isAr ? "ملاحظة يومية" : "Daily Note"}</Label>
                <Textarea className="mt-1 text-sm" placeholder={isAr ? "أضف ملاحظة لهذا اليوم..." : "Add a note..."} value={selectedZone.daily_note || ""} onChange={(e) => setSelectedZone(p => ({ ...p, daily_note: e.target.value }))} rows={3} disabled={activeSession?.status === "completed"} data-testid="zone-daily-note" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {selectedZone.is_removed ? <CircleOff className="w-5 h-5 text-red-500" /> : <CircleDot className="w-5 h-5 text-emerald-500" />}
                  <span className="text-sm font-medium">{selectedZone.is_removed ? (isAr ? "تم إزالة هذه المنطقة" : "Removed") : (isAr ? "المنطقة نشطة" : "Active")}</span>
                </div>
                {activeSession?.status === "draft" && (
                  <Button variant={selectedZone.is_removed ? "default" : "destructive"} size="sm" onClick={() => { handleToggleRemove(selectedZone.id, selectedZone.is_removed); setSelectedZone(p => ({ ...p, is_removed: !p.is_removed })); }} data-testid="zone-toggle-remove">
                    {selectedZone.is_removed ? <><RotateCcw className="w-3 h-3 ml-1" />{isAr ? "استعادة" : "Restore"}</> : <><CircleOff className="w-3 h-3 ml-1" />{isAr ? "إزالة" : "Remove"}</>}
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedZone?.daily_note !== undefined && activeSession?.status === "draft" && (
              <Button onClick={() => { handleAddNote(selectedZone.id, selectedZone.daily_note); setShowZoneDialog(false); }} data-testid="save-zone-changes"><Save className="w-4 h-4 ml-1" />{isAr ? "حفظ" : "Save"}</Button>
            )}
            <Button variant="outline" onClick={() => setShowZoneDialog(false)}>{isAr ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Zone Dialog (for drawn zones) */}
      <Dialog open={showNewZoneDialog} onOpenChange={(open) => { setShowNewZoneDialog(open); if (!open) { setDrawingPoints([]); setMapMode("pan"); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />{isAr ? "إضافة منطقة جديدة" : "Add New Zone"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <p className="text-xs text-emerald-700"><CheckCircle2 className="w-4 h-4 inline ml-1" />{isAr ? `تم رسم الشكل بـ ${drawingPoints.length} نقطة. أكمل البيانات التالية:` : `Shape drawn with ${drawingPoints.length} points. Fill in the details:`}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">{isAr ? "كود المنطقة" : "Zone Code"}</Label>
              <Input className="mt-1" placeholder={isAr ? "مثال: Z-001" : "e.g., Z-001"} value={newZoneForm.zone_code} onChange={(e) => setNewZoneForm(p => ({ ...p, zone_code: e.target.value }))} data-testid="new-zone-code" />
            </div>
            <div>
              <Label className="text-sm font-medium">{isAr ? "اسم المنطقة" : "Zone Name"}</Label>
              <Input className="mt-1" placeholder={isAr ? "مثال: مصلى رجال 5" : "e.g., Men Prayer 5"} value={newZoneForm.name_ar} onChange={(e) => setNewZoneForm(p => ({ ...p, name_ar: e.target.value }))} data-testid="new-zone-name" />
            </div>
            <div>
              <Label className="text-sm font-medium">{isAr ? "الفئة" : "Category"}</Label>
              <Select value={newZoneForm.zone_type} onValueChange={(v) => setNewZoneForm(p => ({ ...p, zone_type: v, fill_color: ZONE_TYPES.find(t => t.value === v)?.color || "#22c55e" }))}>
                <SelectTrigger className="mt-1" data-testid="new-zone-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ZONE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />{isAr ? t.label_ar : t.label_en}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveNewZone} className="bg-emerald-600 hover:bg-emerald-700" data-testid="confirm-new-zone">
              <Plus className="w-4 h-4 ml-1" />{isAr ? "إضافة المنطقة" : "Add Zone"}
            </Button>
            <Button variant="outline" onClick={() => { setShowNewZoneDialog(false); setDrawingPoints([]); }}>{isAr ? "إلغاء" : "Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><MessageSquare className="w-5 h-5" />{isAr ? "ملاحظات المشرف" : "Supervisor Notes"}</DialogTitle></DialogHeader>
          <Textarea value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} placeholder={isAr ? "أضف ملاحظاتك..." : "Add your notes..."} rows={5} className="text-sm" data-testid="supervisor-notes-textarea" />
          <DialogFooter>
            <Button onClick={() => { handleUpdateSession({ supervisor_notes: sessionNotes }); setShowNotesDialog(false); }} data-testid="save-notes-btn"><Save className="w-4 h-4 ml-1" />{isAr ? "حفظ" : "Save"}</Button>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-blue-600" />{isAr ? "مقارنة الجولات" : "Compare Tours"}</DialogTitle></DialogHeader>
          {compareData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="text-center flex-1"><p className="text-xs text-muted-foreground">{isAr ? "الحالية" : "Current"}</p><p className="font-semibold text-sm">{formatDateShort(compareData.session_1.date)}</p></div>
                <ArrowLeftRight className="w-5 h-5 text-slate-400 mx-3" />
                <div className="text-center flex-1"><p className="text-xs text-muted-foreground">{isAr ? "المقارنة" : "Compared"}</p><p className="font-semibold text-sm">{formatDateShort(compareData.session_2.date)}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-emerald-50 rounded-lg"><p className="text-2xl font-bold text-emerald-600">{compareData.added.length}</p><p className="text-xs text-emerald-600">{isAr ? "مضاف" : "Added"}</p></div>
                <div className="text-center p-3 bg-red-50 rounded-lg"><p className="text-2xl font-bold text-red-500">{compareData.removed.length}</p><p className="text-xs text-red-500">{isAr ? "محذوف" : "Removed"}</p></div>
                <div className="text-center p-3 bg-amber-50 rounded-lg"><p className="text-2xl font-bold text-amber-600">{compareData.modified.length}</p><p className="text-xs text-amber-600">{isAr ? "معدّل" : "Modified"}</p></div>
              </div>
              {compareData.added.length > 0 && <div><h4 className="text-sm font-semibold mb-2 text-emerald-600 flex items-center gap-1"><Plus className="w-4 h-4" />{isAr ? "مضافة" : "Added"}</h4>{compareData.added.map((z,i) => <div key={i} className="p-2 bg-emerald-50 rounded mb-1 text-sm flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: z.fill_color }} /><span className="font-medium">{z.zone_code}</span><span className="text-muted-foreground">- {isAr ? z.name_ar : z.name_en}</span></div>)}</div>}
              {compareData.removed.length > 0 && <div><h4 className="text-sm font-semibold mb-2 text-red-500 flex items-center gap-1"><X className="w-4 h-4" />{isAr ? "محذوفة" : "Removed"}</h4>{compareData.removed.map((z,i) => <div key={i} className="p-2 bg-red-50 rounded mb-1 text-sm flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: z.fill_color }} /><span className="font-medium line-through">{z.zone_code}</span><span className="text-muted-foreground">- {isAr ? z.name_ar : z.name_en}</span></div>)}</div>}
              {compareData.modified.length > 0 && <div><h4 className="text-sm font-semibold mb-2 text-amber-600 flex items-center gap-1"><Edit2 className="w-4 h-4" />{isAr ? "معدّلة" : "Modified"}</h4>{compareData.modified.map((m,i) => <div key={i} className="p-2 bg-amber-50 rounded mb-1 text-sm"><div className="flex items-center gap-2"><span className="font-medium">{m.before.zone_code}</span><ArrowRight className="w-3 h-3 text-amber-500" /><span>{m.after.zone_code}</span></div>{m.before.zone_type !== m.after.zone_type && <div className="text-[11px] text-amber-600 mt-0.5">{isAr ? "الفئة: " : "Type: "}{ZONE_TYPES.find(t => t.value === m.before.zone_type)?.[isAr ? "label_ar" : "label_en"]} → {ZONE_TYPES.find(t => t.value === m.after.zone_type)?.[isAr ? "label_ar" : "label_en"]}</div>}</div>)}</div>}
              {compareData.unchanged_count > 0 && <p className="text-xs text-muted-foreground text-center">{compareData.unchanged_count} {isAr ? "بدون تغيير" : "unchanged"}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
