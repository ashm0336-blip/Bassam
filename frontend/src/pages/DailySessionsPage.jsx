import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
  Plus, Trash2, Save, X, Calendar as CalendarIcon, ChevronRight, ChevronLeft,
  Eye, Clock, FileText, CheckCircle2, AlertCircle, ArrowLeftRight, MapPin,
  RefreshCw, Edit2, MessageSquare, Layers, ZoomIn, ZoomOut, Maximize2,
  RotateCcw, Check, CircleDot, CircleOff, ArrowRight, Tag, Copy,
  CalendarRange, FileStack, Database, Hand, Pencil, MousePointer,
  Undo2, Circle, Square, Triangle, Palette, CopyPlus,
  BarChart3, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight,
  Users, Activity, Gauge, ShieldAlert, Flame, SaveAll,
  Spline, PenTool, Sparkles
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
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ZONE_TYPES loaded from API - fallback used until loaded
const ZONE_TYPES_FALLBACK = [
  { value: "men_prayer", label_ar: "مصليات الرجال", label_en: "Men Prayer Areas", color: "#22c55e", icon: "M" },
  { value: "women_prayer", label_ar: "مصليات النساء", label_en: "Women Prayer Areas", color: "#93c5fd", icon: "W" },
  { value: "service", label_ar: "خدمات", label_en: "Services", color: "#374151", icon: "X" },
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
  const [ZONE_TYPES, setZoneTypes] = useState(ZONE_TYPES_FALLBACK);

  // UI state
  const [activeTab, setActiveTab] = useState("map");
  const [selectedZone, setSelectedZone] = useState(null);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showRemovedZones, setShowRemovedZones] = useState(false);
  const zoneCardsRef = useRef({});
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
  const [mapMode, setMapMode] = useState("pan"); // pan, draw, edit, rect, circle, ellipse, freehand
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [nearStart, setNearStart] = useState(false);
  const [showNewZoneDialog, setShowNewZoneDialog] = useState(false);
  const [newZoneForm, setNewZoneForm] = useState({ zone_code: "", name_ar: "", name_en: "", zone_type: "men_prayer", fill_color: "#22c55e", area_sqm: 0, per_person_sqm: 0.8, max_capacity: 0 });
  const [rectStart, setRectStart] = useState(null); // For rectangle drag mode
  const [rectEnd, setRectEnd] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isDraggingZone, setIsDraggingZone] = useState(false);
  const [dragZoneStart, setDragZoneStart] = useState(null);
  const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);
  const [freehandPoints, setFreehandPoints] = useState([]);
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
    // Fetch zone categories from API
    axios.get(`${API}/zone-categories`).then(res => {
      if (res.data?.length > 0) setZoneTypes(res.data);
    }).catch(() => {});
  }, []);
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
      const nz = Math.max(0.3, Math.min(20, prev * delta));
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
  };

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

  // Session zones as mutable local state for editing
  const sessionZones = activeSession?.zones || [];

  // Shape generators
  const generateShape = (type) => {
    const cx = 50, cy = 50;
    let points;
    if (type === "circle") points = Array.from({ length: 36 }, (_, i) => ({ x: cx + 15 * Math.cos(2 * Math.PI * i / 36), y: cy + 15 * Math.sin(2 * Math.PI * i / 36) }));
    else if (type === "rectangle") points = [{ x: cx - 20, y: cy - 15 }, { x: cx + 20, y: cy - 15 }, { x: cx + 20, y: cy + 15 }, { x: cx - 20, y: cy + 15 }];
    else if (type === "triangle") points = Array.from({ length: 3 }, (_, i) => ({ x: cx + 18 * Math.cos(2 * Math.PI * i / 3 - Math.PI / 2), y: cy + 18 * Math.sin(2 * Math.PI * i / 3 - Math.PI / 2) }));
    if (points) { setDrawingPoints(points); setShowNewZoneDialog(true); }
  };

  // Generate circle from center + radius
  const generateCircleFromDrag = (center, edge) => {
    const r = getDistance(center, edge);
    if (r < 0.5) return null;
    return Array.from({ length: 36 }, (_, i) => ({
      x: center.x + r * Math.cos(2 * Math.PI * i / 36),
      y: center.y + r * Math.sin(2 * Math.PI * i / 36),
    }));
  };

  // Generate ellipse from bounding box
  const generateEllipseFromDrag = (start, end) => {
    const cx = (start.x + end.x) / 2, cy = (start.y + end.y) / 2;
    const rx = Math.abs(end.x - start.x) / 2, ry = Math.abs(end.y - start.y) / 2;
    if (rx < 0.5 || ry < 0.5) return null;
    return Array.from({ length: 36 }, (_, i) => ({
      x: cx + rx * Math.cos(2 * Math.PI * i / 36),
      y: cy + ry * Math.sin(2 * Math.PI * i / 36),
    }));
  };

  // Smooth corners - Chaikin's algorithm
  const smoothPoints = (pts, iterations = 2) => {
    let result = [...pts];
    for (let iter = 0; iter < iterations; iter++) {
      const smoothed = [];
      for (let i = 0; i < result.length; i++) {
        const p0 = result[i];
        const p1 = result[(i + 1) % result.length];
        smoothed.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 });
        smoothed.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 });
      }
      result = smoothed;
    }
    return result;
  };

  // Simplify freehand points (Ramer-Douglas-Peucker)
  const simplifyPoints = (pts, tolerance = 0.3) => {
    if (pts.length <= 2) return pts;
    const first = pts[0], last = pts[pts.length - 1];
    let maxDist = 0, maxIdx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = pointToLineDistance(pts[i], first, last);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > tolerance) {
      const left = simplifyPoints(pts.slice(0, maxIdx + 1), tolerance);
      const right = simplifyPoints(pts.slice(maxIdx), tolerance);
      return [...left.slice(0, -1), ...right];
    }
    return [first, last];
  };

  const pointToLineDistance = (p, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return getDistance(p, a);
    return Math.abs(dx * (a.y - p.y) - dy * (a.x - p.x)) / len;
  };

  // Smooth existing zone points
  const handleSmoothZone = async () => {
    if (!activeSession || !selectedZoneId) return;
    const zone = sessionZones.find(z => z.id === selectedZoneId);
    if (!zone?.polygon_points || zone.polygon_points.length < 3) return;
    const smoothed = smoothPoints(zone.polygon_points, 2);
    try {
      const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}/zones/${selectedZoneId}`, { polygon_points: smoothed }, getAuthHeaders());
      setActiveSession(res.data);
      toast.success(isAr ? "تم تنعيم الزوايا" : "Corners smoothed");
    } catch (e) { toast.error(isAr ? "تعذر التنعيم" : "Smooth failed"); }
  };

  // Map mouse handlers for drawing/editing
  const handleMapMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const pos = getMousePercent(e);
    // Completed sessions: always pan only
    if (activeSession?.status === "completed" || mapMode === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } else if (mapMode === "rect" || mapMode === "circle" || mapMode === "ellipse") {
      setRectStart(pos);
      setRectEnd(pos);
    } else if (mapMode === "freehand") {
      setIsDrawingFreehand(true);
      setFreehandPoints([pos]);
    } else if (mapMode === "edit" && selectedZoneId && activeSession?.status === "draft") {
      const zone = sessionZones.find(z => z.id === selectedZoneId);
      if (!zone?.polygon_points) return;

      // Check rotation handle first
      const rotHandle = getRotationHandle(zone.polygon_points);
      if (rotHandle && getDistance(pos, rotHandle) < (2.5 / Math.max(zoom, 0.5))) {
        setIsRotating(true);
        return;
      }

      // Check vertex handles
      const hitIndex = getHitPointIndex(zone.polygon_points, pos);
      if (hitIndex !== -1) { setDraggingPoint(hitIndex); setHoveredPoint(hitIndex); return; }

      // Check midpoint handles
      const pts = zone.polygon_points;
      const midRadius = 1.5 / Math.max(zoom, 0.5);
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        const mx = (pts[i].x + pts[j].x) / 2, my = (pts[i].y + pts[j].y) / 2;
        if (getDistance(pos, { x: mx, y: my }) < midRadius) {
          const newPoints = [...pts]; newPoints.splice(j, 0, { x: pos.x, y: pos.y });
          setActiveSession({ ...activeSession, zones: activeSession.zones.map(z => z.id === selectedZoneId ? { ...z, polygon_points: newPoints } : z) });
          setDraggingPoint(j); setHoveredPoint(j); return;
        }
      }

      // Check if clicking inside the zone to drag the whole shape
      if (isPointInPolygon(pos, zone.polygon_points)) {
        setIsDraggingZone(true);
        setDragZoneStart(pos);
        return;
      }
    }
  };

  const handleMapMouseMove = (e) => {
    const pos = getMousePercent(e);
    setMousePos(pos);
    if (isPanning && mapMode === "pan") { setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); return; }
    if ((mapMode === "rect" || mapMode === "circle" || mapMode === "ellipse") && rectStart) { setRectEnd(pos); return; }
    if (mapMode === "freehand" && isDrawingFreehand) { setFreehandPoints(prev => [...prev, pos]); return; }

    // Rotating
    if (isRotating && selectedZoneId) {
      const zone = sessionZones.find(z => z.id === selectedZoneId);
      if (zone?.polygon_points) {
        const center = getZoneCenter(zone.polygon_points);
        const angle = Math.atan2(pos.y - center.y, pos.x - center.x) - Math.atan2(mousePos.y - center.y, mousePos.x - center.x);
        const newPts = rotatePoints(zone.polygon_points, center, angle);
        setActiveSession({ ...activeSession, zones: activeSession.zones.map(z => z.id === selectedZoneId ? { ...z, polygon_points: newPts } : z) });
      }
      return;
    }

    // Dragging whole zone
    if (isDraggingZone && selectedZoneId && dragZoneStart) {
      const dx = pos.x - dragZoneStart.x;
      const dy = pos.y - dragZoneStart.y;
      const zone = sessionZones.find(z => z.id === selectedZoneId);
      if (zone?.polygon_points) {
        const newPts = movePoints(zone.polygon_points, dx, dy);
        setActiveSession({ ...activeSession, zones: activeSession.zones.map(z => z.id === selectedZoneId ? { ...z, polygon_points: newPts } : z) });
        setDragZoneStart(pos);
      }
      return;
    }

    // Dragging a single point
    if (draggingPoint !== null && selectedZoneId) {
      setActiveSession({ ...activeSession, zones: activeSession.zones.map(z => {
        if (z.id !== selectedZoneId) return z;
        const newPts = [...z.polygon_points]; newPts[draggingPoint] = { x: pos.x, y: pos.y };
        return { ...z, polygon_points: newPts };
      })});
      return;
    }
    if (mapMode === "edit" && selectedZoneId) {
      const zone = sessionZones.find(z => z.id === selectedZoneId);
      const hit = getHitPointIndex(zone?.polygon_points, pos);
      setHoveredPoint(hit !== -1 ? hit : null);
    }
    if (mapMode === "draw" && drawingPoints.length >= 3) setNearStart(getDistance(pos, drawingPoints[0]) < SNAP_DISTANCE);
    // Tooltip
    if (mapMode !== "draw" && draggingPoint === null && !isPanning && !isRotating && !isDraggingZone) {
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
    // Rectangle mode
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

    // Circle mode
    if (mapMode === "circle" && rectStart && rectEnd) {
      const pts = generateCircleFromDrag(rectStart, rectEnd);
      if (pts) { setDrawingPoints(pts); setShowNewZoneDialog(true); }
      setRectStart(null); setRectEnd(null);
      return;
    }

    // Ellipse mode
    if (mapMode === "ellipse" && rectStart && rectEnd) {
      const pts = generateEllipseFromDrag(rectStart, rectEnd);
      if (pts) { setDrawingPoints(pts); setShowNewZoneDialog(true); }
      setRectStart(null); setRectEnd(null);
      return;
    }

    // Freehand mode
    if (mapMode === "freehand" && isDrawingFreehand && freehandPoints.length > 5) {
      const simplified = simplifyPoints(freehandPoints, 0.4);
      if (simplified.length >= 3) { setDrawingPoints(simplified); setShowNewZoneDialog(true); }
      setIsDrawingFreehand(false); setFreehandPoints([]);
      return;
    }
    setIsDrawingFreehand(false); setFreehandPoints([]);

    // Save after rotate, drag zone, or drag point
    const needsSave = (draggingPoint !== null || isRotating || isDraggingZone) && selectedZoneId;
    if (needsSave) {
      const zone = sessionZones.find(z => z.id === selectedZoneId);
      if (zone) {
        try {
          const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}/zones/${selectedZoneId}`, { polygon_points: zone.polygon_points }, getAuthHeaders());
          setActiveSession(res.data);
        } catch (e) { console.error(e); }
      }
    }
    setIsPanning(false); setDraggingPoint(null); setHoveredPoint(null);
    setIsRotating(false); setIsDraggingZone(false); setDragZoneStart(null);
  };

  const handleMapClick = (e) => {
    if (isPanning || draggingPoint !== null) return;
    if (activeSession?.status === "completed") return; // No interaction in completed sessions
    e.preventDefault();
    const pos = getMousePercent(e);
    if (mapMode === "draw" && activeSession?.status === "draft") {
      if (drawingPoints.length >= 3 && nearStart) { setShowNewZoneDialog(true); return; }
      setDrawingPoints(prev => [...prev, { x: pos.x, y: pos.y }]);
    } else if (mapMode === "edit" && activeSession?.status === "draft") {
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
        stroke_color: "#000000",
        stroke_style: "dashed",
        area_sqm: newZoneForm.area_sqm || 0,
        per_person_sqm: newZoneForm.per_person_sqm || 0.8,
        max_capacity: newZoneForm.max_capacity || 0,
      }, getAuthHeaders());
      setActiveSession(res.data);
      setShowNewZoneDialog(false);
      setDrawingPoints([]);
      setNewZoneForm({ zone_code: "", name_ar: "", name_en: "", zone_type: "men_prayer", fill_color: "#22c55e", area_sqm: 0, per_person_sqm: 0.8, max_capacity: 0 });
      setMapMode("pan");
      toast.success(isAr ? "تم إضافة المنطقة" : "Zone added");
    } catch (e) { toast.error(isAr ? "تعذرت الإضافة" : "Error adding zone"); }
  };

  // Copy zone (duplicate with offset)
  const handleCopyZone = async () => {
    if (!activeSession || !selectedZoneId) return;
    const zone = sessionZones.find(z => z.id === selectedZoneId);
    if (!zone) return;
    const offset = 4;
    const newPoints = zone.polygon_points.map(p => ({ x: p.x + offset, y: p.y + offset }));
    try {
      const res = await axios.post(`${API}/admin/map-sessions/${activeSession.id}/zones`, {
        zone_code: zone.zone_code + "-copy",
        name_ar: zone.name_ar + " (نسخة)",
        name_en: (zone.name_en || "") + " (copy)",
        zone_type: zone.zone_type,
        polygon_points: newPoints,
        fill_color: zone.fill_color,
        stroke_color: zone.stroke_color || "#000000",
        stroke_style: zone.stroke_style || "dashed",
        opacity: zone.opacity ?? 0.4,
        stroke_opacity: zone.stroke_opacity ?? 1,
      }, getAuthHeaders());
      setActiveSession(res.data);
      toast.success(isAr ? "تم نسخ المنطقة" : "Zone copied");
    } catch (e) { toast.error(isAr ? "تعذر النسخ" : "Copy failed"); }
  };

  // Update zone style (colors, opacity, stroke)
  const handleUpdateZoneStyle = async (zoneId, styleData) => {
    if (!activeSession) return;
    try {
      const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}/zones/${zoneId}`, styleData, getAuthHeaders());
      setActiveSession(res.data);
    } catch (e) { console.error(e); }
  };


  // Reset map mode when session changes or is completed
  useEffect(() => {
    if (!activeSession || activeSession.status === "completed") {
      setMapMode("pan");
      setSelectedZoneId(null);
      setDrawingPoints([]);
      setRectStart(null);
      setFreehandPoints([]);
    }
  }, [activeSession?.id, activeSession?.status]);

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
      // Reset map mode when session status changes
      if (updateData.status) {
        setMapMode("pan");
        setSelectedZoneId(null);
        setDrawingPoints([]);
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
      setCompareData(res.data);
      setShowCompareDialog(true);
    } catch (e) { toast.error(isAr ? "تعذرت المقارنة" : "Compare failed"); }
  };

  // Computed
  const activeZones = activeSession?.zones?.filter(z => !z.is_removed) || [];
  const removedZones = activeSession?.zones?.filter(z => z.is_removed) || [];
  const changedZones = activeSession?.zones?.filter(z => z.change_type && z.change_type !== "unchanged") || [];

  // Statistics computation
  const sessionStats = useMemo(() => {
    if (!activeSession?.zones) return null;

    const active = activeSession.zones.filter(z => !z.is_removed);
    const removed = activeSession.zones.filter(z => z.is_removed);

    // Category breakdown
    const catCounts = {};
    ZONE_TYPES.forEach(t => { catCounts[t.value] = 0; });
    active.forEach(z => { catCounts[z.zone_type] = (catCounts[z.zone_type] || 0) + 1; });

    // Find previous session (nearest older date)
    const sortedSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
    const curIdx = sortedSessions.findIndex(s => s.id === activeSession.id);
    const prevSession = curIdx >= 0 && curIdx < sortedSessions.length - 1 ? sortedSessions[curIdx + 1] : null;

    // Previous session category stats
    const prevCatCounts = {};
    let prevTotalActive = 0;
    if (prevSession?.zones) {
      const prevActive = prevSession.zones.filter(z => !z.is_removed);
      prevTotalActive = prevActive.length;
      ZONE_TYPES.forEach(t => { prevCatCounts[t.value] = 0; });
      prevActive.forEach(z => { prevCatCounts[z.zone_type] = (prevCatCounts[z.zone_type] || 0) + 1; });
    }

    // Categories with data (for pie chart)
    const activeCats = ZONE_TYPES.filter(t => catCounts[t.value] > 0);
    const totalActive = active.length;

    return {
      totalActive,
      totalRemoved: removed.length,
      totalAll: activeSession.zones.length,
      uniqueCategories: activeCats.length,
      catCounts,
      prevSession,
      prevCatCounts,
      prevTotalActive,
      hasPrevious: !!prevSession && Object.keys(prevCatCounts).length > 0,
      activeCats,
    };
  }, [activeSession, sessions]);

  // Density editing state
  const [densityEdits, setDensityEdits] = useState({});
  const [savingDensity, setSavingDensity] = useState(false);

  // Reset density edits when session changes
  useEffect(() => {
    setDensityEdits({});
  }, [activeSession?.id]);

  const getDensityLevel = (current, max) => {
    if (!max || max <= 0) return { level: "unknown", pct: 0, color: "#94a3b8", bg: "#f8fafc", label_ar: "غير محدد", label_en: "N/A" };
    const pct = Math.round((current / max) * 100);
    if (pct >= 90) return { level: "critical", pct, color: "#dc2626", bg: "#fef2f2", label_ar: "حرج", label_en: "Critical" };
    if (pct >= 70) return { level: "high", pct, color: "#ea580c", bg: "#fff7ed", label_ar: "مرتفع", label_en: "High" };
    if (pct >= 50) return { level: "medium", pct, color: "#d97706", bg: "#fffbeb", label_ar: "متوسط", label_en: "Medium" };
    if (pct >= 25) return { level: "normal", pct, color: "#16a34a", bg: "#f0fdf4", label_ar: "طبيعي", label_en: "Normal" };
    return { level: "low", pct, color: "#0ea5e9", bg: "#f0f9ff", label_ar: "منخفض", label_en: "Low" };
  };

  const handleDensityChange = (zoneId, field, value) => {
    setDensityEdits(prev => ({
      ...prev,
      [zoneId]: { ...prev[zoneId], [field]: value }
    }));
  };

  const handleSaveDensityBatch = async () => {
    if (!activeSession || Object.keys(densityEdits).length === 0) return;
    setSavingDensity(true);
    try {
      const updates = Object.entries(densityEdits).map(([zone_id, edits]) => ({
        zone_id,
        ...edits,
      }));
      const res = await axios.put(`${API}/admin/map-sessions/${activeSession.id}/density-batch`, { updates }, getAuthHeaders());
      setActiveSession(res.data);
      setDensityEdits({});
      await fetchSessions();
      toast.success(isAr ? "تم حفظ بيانات الكثافة" : "Density data saved");
    } catch (e) {
      toast.error(isAr ? "تعذر حفظ البيانات" : "Save failed");
    } finally { setSavingDensity(false); }
  };

  // Density computed stats
  const densityStats = useMemo(() => {
    if (!activeSession?.zones) return null;
    const active = activeSession.zones.filter(z => !z.is_removed);
    let totalCurrent = 0, totalCapacity = 0, criticalCount = 0, highCount = 0;
    const zonesDensity = active.map(z => {
      const current = densityEdits[z.id]?.current_count ?? z.current_count ?? 0;
      const max = densityEdits[z.id]?.max_capacity ?? z.max_capacity ?? 1000;
      totalCurrent += current;
      totalCapacity += max;
      const info = getDensityLevel(current, max);
      if (info.level === "critical") criticalCount++;
      if (info.level === "high") highCount++;
      return { ...z, currentDisplay: current, maxDisplay: max, densityInfo: info };
    });
    const overallPct = totalCapacity > 0 ? Math.round((totalCurrent / totalCapacity) * 100) : 0;
    const overallLevel = getDensityLevel(totalCurrent, totalCapacity);
    return { zonesDensity, totalCurrent, totalCapacity, overallPct, overallLevel, criticalCount, highCount };
  }, [activeSession, densityEdits]);

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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="map" data-testid="tab-map"><MapPin className="w-4 h-4 ml-1" />{isAr ? "الخريطة" : "Map"}<Badge variant="secondary" className="mr-1 text-[10px] px-1.5">{activeZones.length}</Badge></TabsTrigger>
                  <TabsTrigger value="changes" data-testid="tab-changes"><FileText className="w-4 h-4 ml-1" />{isAr ? "التغييرات" : "Changes"}{changedZones.length > 0 && <Badge variant="destructive" className="mr-1 text-[10px] px-1.5">{changedZones.length}</Badge>}</TabsTrigger>
                  <TabsTrigger value="density" data-testid="tab-density"><Activity className="w-4 h-4 ml-1" />{isAr ? "الكثافات" : "Density"}{densityStats?.criticalCount > 0 && <Badge variant="destructive" className="mr-1 text-[10px] px-1.5">{densityStats.criticalCount}</Badge>}</TabsTrigger>
                  <TabsTrigger value="stats" data-testid="tab-stats"><BarChart3 className="w-4 h-4 ml-1" />{isAr ? "إحصائيات" : "Stats"}</TabsTrigger>
                </TabsList>

                {/* MAP TAB */}
                <TabsContent value="map" className="space-y-3">
                  {/* Toolbar */}
                  {activeSession?.status === "draft" && (
                    <div className="flex justify-between items-center flex-wrap gap-3 bg-slate-50 p-3 rounded-lg">
                      {/* Mode buttons */}
                      <div className="flex items-center gap-2">
                        <div className="flex border rounded-lg overflow-hidden">
                          <Button variant={mapMode === "pan" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => { setMapMode("pan"); setDrawingPoints([]); setSelectedZoneId(null); setRectStart(null); setFreehandPoints([]); }} data-testid="mode-pan-btn" title={isAr ? "تحريك" : "Pan"}>
                            <Hand className="w-4 h-4" />
                          </Button>
                          <Button variant={mapMode === "draw" ? "default" : "ghost"} size="sm" className="rounded-none border-x" onClick={() => { setMapMode("draw"); setDrawingPoints([]); setSelectedZoneId(null); setRectStart(null); setFreehandPoints([]); }} data-testid="mode-draw-btn" title={isAr ? "رسم نقطة بنقطة" : "Point Draw"}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant={mapMode === "rect" ? "default" : "ghost"} size="sm" className="rounded-none border-l" onClick={() => { setMapMode("rect"); setDrawingPoints([]); setSelectedZoneId(null); setRectStart(null); setFreehandPoints([]); }} data-testid="mode-rect-btn" title={isAr ? "مستطيل بالسحب" : "Rectangle"}>
                            <Square className="w-4 h-4" />
                          </Button>
                          <Button variant={mapMode === "circle" ? "default" : "ghost"} size="sm" className="rounded-none border-l" onClick={() => { setMapMode("circle"); setDrawingPoints([]); setSelectedZoneId(null); setRectStart(null); setFreehandPoints([]); }} data-testid="mode-circle-btn" title={isAr ? "دائرة بالسحب" : "Circle"}>
                            <Circle className="w-4 h-4" />
                          </Button>
                          <Button variant={mapMode === "ellipse" ? "default" : "ghost"} size="sm" className="rounded-none border-l" onClick={() => { setMapMode("ellipse"); setDrawingPoints([]); setSelectedZoneId(null); setRectStart(null); setFreehandPoints([]); }} data-testid="mode-ellipse-btn" title={isAr ? "بيضاوي بالسحب" : "Ellipse"}>
                            <Spline className="w-4 h-4" />
                          </Button>
                          <Button variant={mapMode === "freehand" ? "default" : "ghost"} size="sm" className="rounded-none border-l" onClick={() => { setMapMode("freehand"); setDrawingPoints([]); setSelectedZoneId(null); setRectStart(null); setFreehandPoints([]); }} data-testid="mode-freehand-btn" title={isAr ? "رسم حر" : "Freehand"}>
                            <PenTool className="w-4 h-4" />
                          </Button>
                          <Button variant={mapMode === "edit" ? "default" : "ghost"} size="sm" className="rounded-none border-l" onClick={() => { setMapMode("edit"); setDrawingPoints([]); setRectStart(null); setFreehandPoints([]); }} data-testid="mode-edit-btn" title={isAr ? "تعديل" : "Edit"}>
                            <MousePointer className="w-4 h-4" />
                          </Button>
                        </div>
                        {/* Zoom controls */}
                        <div className="flex items-center gap-1 border rounded-lg p-1 bg-white">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c = mapContainerRef.current; if (!c) return; const r = c.getBoundingClientRect(); const cx = r.width/2, cy = r.height/2; const p = zoomRef.current; const nz = Math.max(0.3, p * 0.8); const s = nz/p; zoomRef.current = nz; setZoom(nz); setPanOffset(o => ({ x: cx - s*(cx-o.x), y: cy - s*(cy-o.y) })); }} data-testid="zoom-out-btn"><ZoomOut className="w-4 h-4" /></Button>
                          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c = mapContainerRef.current; if (!c) return; const r = c.getBoundingClientRect(); const cx = r.width/2, cy = r.height/2; const p = zoomRef.current; const nz = Math.min(20, p * 1.25); const s = nz/p; zoomRef.current = nz; setZoom(nz); setPanOffset(o => ({ x: cx - s*(cx-o.x), y: cy - s*(cy-o.y) })); }} data-testid="zoom-in-btn"><ZoomIn className="w-4 h-4" /></Button>
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
                          <>
                            <Button variant="outline" size="sm" onClick={handleSmoothZone} data-testid="edit-smooth-zone-btn" title={isAr ? "تنعيم الزوايا" : "Smooth Corners"}>
                              <Sparkles className="w-4 h-4 ml-1" />{isAr ? "تنعيم" : "Smooth"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleCopyZone} data-testid="edit-copy-zone-btn" title={isAr ? "نسخ المنطقة" : "Copy Zone"}>
                              <CopyPlus className="w-4 h-4 ml-1" />{isAr ? "نسخ" : "Copy"}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => { handleToggleRemove(selectedZoneId, false); setSelectedZoneId(null); setMapMode("pan"); }} data-testid="edit-delete-zone-btn">
                              <Trash2 className="w-4 h-4 ml-1" />{isAr ? "إزالة" : "Remove"}
                            </Button>
                          </>
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
                  {activeSession?.status === "draft" && mapMode === "circle" && (
                    <div className="p-2.5 bg-cyan-50 border border-cyan-200 rounded-lg">
                      <p className="text-xs text-cyan-700"><Circle className="w-3.5 h-3.5 inline ml-1" />{isAr ? "انقر على مركز الدائرة واسحب لتحديد نصف القطر. حرر الماوس لإنهاء الشكل." : "Click center, drag to set radius. Release to finish."}</p>
                    </div>
                  )}
                  {activeSession?.status === "draft" && mapMode === "ellipse" && (
                    <div className="p-2.5 bg-violet-50 border border-violet-200 rounded-lg">
                      <p className="text-xs text-violet-700"><Spline className="w-3.5 h-3.5 inline ml-1" />{isAr ? "انقر واسحب لرسم شكل بيضاوي. حرر الماوس لإنهاء الشكل." : "Click and drag to draw an ellipse. Release to finish."}</p>
                    </div>
                  )}
                  {activeSession?.status === "draft" && mapMode === "freehand" && (
                    <div className="p-2.5 bg-pink-50 border border-pink-200 rounded-lg">
                      <p className="text-xs text-pink-700"><PenTool className="w-3.5 h-3.5 inline ml-1" />{isAr ? "انقر واسحب للرسم الحر. حرر الماوس لإنهاء الشكل. سيتم تبسيط الخط تلقائياً." : "Click and drag to draw freehand. Release to finish. Line will be auto-simplified."}</p>
                    </div>
                  )}
                  {activeSession?.status === "draft" && mapMode === "edit" && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700"><MousePointer className="w-3.5 h-3.5 inline ml-1" />{isAr ? "انقر على منطقة لتحديدها. اسحب النقاط لتعديل الشكل. اسحب المقبض البنفسجي ↻ للدوران. اسحب المنطقة لنقلها." : "Click zone to select. Drag points to edit shape. Drag purple handle ↻ to rotate. Drag zone to move."}</p>
                    </div>
                  )}

                  {/* Zoom-only controls for completed sessions */}
                  {activeSession?.status === "completed" && (
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex items-center gap-1 border rounded-lg p-1 bg-white">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c = mapContainerRef.current; if (!c) return; const r = c.getBoundingClientRect(); const cx = r.width/2, cy = r.height/2; const p = zoomRef.current; const nz = Math.max(0.3, p * 0.8); const s = nz/p; zoomRef.current = nz; setZoom(nz); setPanOffset(o => ({ x: cx - s*(cx-o.x), y: cy - s*(cy-o.y) })); }}><ZoomOut className="w-4 h-4" /></Button>
                        <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c = mapContainerRef.current; if (!c) return; const r = c.getBoundingClientRect(); const cx = r.width/2, cy = r.height/2; const p = zoomRef.current; const nz = Math.min(20, p * 1.25); const s = nz/p; zoomRef.current = nz; setZoom(nz); setPanOffset(o => ({ x: cx - s*(cx-o.x), y: cy - s*(cy-o.y) })); }}><ZoomIn className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { zoomRef.current=1; setZoom(1); setPanOffset({x:0,y:0}); }}><Maximize2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  )}
                  {selectedFloor?.image_url ? (
                    <Card className="overflow-hidden">
                      <CardContent className="p-0">
                        <div ref={wheelRef} data-testid="session-map-container" className="relative bg-slate-100 overflow-hidden" style={{ height: "550px", cursor: activeSession?.status === "completed" ? (isPanning ? "grabbing" : "grab") : (mapMode === "draw" || mapMode === "rect" || mapMode === "circle" || mapMode === "ellipse" || mapMode === "freehand" ? "crosshair" : mapMode === "edit" ? "default" : (isPanning ? "grabbing" : "grab")) }} onMouseDown={handleMapMouseDown} onMouseMove={handleMapMouseMove} onMouseUp={handleMapMouseUp} onMouseLeave={handleMapMouseUp} onClick={handleMapClick}>
                          <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: "0 0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {(() => {
                              const ce = mapContainerRef.current;
                              let ws = { position: "relative", width: "100%", height: "100%" };
                              if (imgRatio && ce) { const cw = ce.clientWidth, ch = ce.clientHeight; if (cw/ch > imgRatio) ws = { position: "relative", height: "100%", width: ch * imgRatio }; else ws = { position: "relative", width: "100%", height: cw / imgRatio }; }
                              return (
                                <div style={ws}>
                                  <img src={selectedFloor.image_url} alt="" style={{ width: "100%", height: "100%", display: "block", imageRendering: "high-quality" }} draggable={false} className="pointer-events-none select-none" onLoad={(e) => setImgRatio(e.target.naturalWidth / e.target.naturalHeight)} />
                                  <svg ref={svgRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }} viewBox="0 0 100 100" preserveAspectRatio="none" data-testid="session-map-svg">
                                    {activeZones.map(zone => {
                                      const cl = CHANGE_LABELS[zone.change_type] || CHANGE_LABELS.unchanged;
                                      const ch = zone.change_type && zone.change_type !== "unchanged";
                                      const isSelected = zone.id === selectedZoneId;
                                      return (
                                        <g key={zone.id} data-testid={`session-zone-${zone.id}`} data-zone-id={zone.id}
                                          onMouseEnter={() => { if (mapMode !== "draw" && draggingPoint === null) setHoveredZone(zone); }}
                                          onMouseLeave={() => setHoveredZone(null)}
                                          onClick={(e) => { if (mapMode === "edit" && activeSession?.status === "draft") { e.stopPropagation(); setSelectedZoneId(zone.id); } }}
                                          onDoubleClick={(e) => { if (activeSession?.status !== "draft") return; e.stopPropagation(); setSelectedZone(zone); setShowZoneDialog(true); }}
                                          style={{ cursor: mapMode === "edit" && activeSession?.status === "draft" ? "pointer" : "inherit" }}>
                                          <path d={getPath(zone.polygon_points)} fill={zone.fill_color} fillOpacity={zone.opacity || 0.4}
                                            stroke={isSelected ? "#3b82f6" : (zone.stroke_color || "#000000")}
                                            strokeWidth={isSelected ? 0.6 : (zone.stroke_width ?? 0.3)}
                                            strokeOpacity={isSelected ? 1 : (zone.stroke_opacity ?? 1)}
                                            strokeDasharray={isSelected ? "1 0.5" : (zone.stroke_style === "solid" ? "none" : zone.stroke_style === "dotted" ? "0.5 0.8" : "2 1")}
                                            vectorEffect="non-scaling-stroke" />
                                          {/* Pulse animation for selected zone */}
                                          {isSelected && (
                                            <path d={getPath(zone.polygon_points)} fill="none"
                                              stroke="#3b82f6" strokeWidth="1.2" strokeOpacity="0"
                                              vectorEffect="non-scaling-stroke" pointerEvents="none">
                                              <animate attributeName="stroke-opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite" />
                                              <animate attributeName="stroke-width" values="0.6;2.5" dur="1.5s" repeatCount="indefinite" />
                                            </path>
                                          )}
                                          {isSelected && mapMode === "edit" && activeSession?.status === "draft" && zone.polygon_points?.map((pt, i) => {
                                            const isActive = i === draggingPoint || i === hoveredPoint;
                                            return <circle key={`v-${i}`} pointerEvents="none" cx={pt.x} cy={pt.y} r={isActive ? "0.18" : "0.1"} fill="#ef4444" stroke="white" strokeWidth="0.04" vectorEffect="non-scaling-stroke" />;
                                          })}
                                          {isSelected && mapMode === "edit" && activeSession?.status === "draft" && zone.polygon_points?.map((pt, i) => {
                                            const j = (i + 1) % zone.polygon_points.length;
                                            const nx = zone.polygon_points[j];
                                            const mx = (pt.x + nx.x) / 2, my = (pt.y + nx.y) / 2;
                                            return <rect key={`m-${i}`} x={mx - 0.07} y={my - 0.07} width="0.14" height="0.14" transform={`rotate(45 ${mx} ${my})`} fill="#ef4444" stroke="white" strokeWidth="0.03" vectorEffect="non-scaling-stroke" opacity="0.4" pointerEvents="none" />;
                                          })}
                                          {/* Rotation handle */}
                                          {isSelected && mapMode === "edit" && activeSession?.status === "draft" && (() => {
                                            const rh = getRotationHandle(zone.polygon_points);
                                            if (!rh) return null;
                                            return (
                                              <g data-testid="rotation-handle" style={{ cursor: "grab" }}>
                                                <line x1={rh.cx} y1={Math.min(...zone.polygon_points.map(p => p.y))} x2={rh.x} y2={rh.y}
                                                  stroke="#8b5cf6" strokeWidth="0.3" strokeDasharray="0.5 0.3" vectorEffect="non-scaling-stroke" opacity="0.6" pointerEvents="none" />
                                                <circle cx={rh.x} cy={rh.y} r="0.25" fill="#8b5cf6" stroke="white" strokeWidth="0.06" vectorEffect="non-scaling-stroke" opacity="0.9" pointerEvents="none" />
                                                <g transform={`translate(${rh.x}, ${rh.y})`} pointerEvents="none">
                                                  <path d="M -0.1 -0.05 A 0.1 0.1 0 1 1 0.05 -0.1" fill="none" stroke="white" strokeWidth="0.04" vectorEffect="non-scaling-stroke" />
                                                  <path d="M 0.05 -0.1 L 0.12 -0.06 L 0.04 -0.04" fill="white" stroke="none" />
                                                </g>
                                              </g>
                                            );
                                          })()}
                                        </g>
                                      );
                                    })}
                                    {removedZones.map(zone => (
                                      <g key={zone.id} data-testid={`session-zone-removed-${zone.id}`} onMouseEnter={() => setHoveredZone(zone)} onMouseLeave={() => setHoveredZone(null)} onClick={(e) => { if (activeSession?.status === "draft") { e.stopPropagation(); setSelectedZone(zone); setShowZoneDialog(true); } }} style={{ cursor: activeSession?.status === "draft" ? "pointer" : "default" }}>
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
                                    {/* Circle drag preview */}
                                    {mapMode === "circle" && rectStart && rectEnd && (() => {
                                      const r = getDistance(rectStart, rectEnd);
                                      return r > 0.5 ? (
                                        <circle cx={rectStart.x} cy={rectStart.y} r={r}
                                          fill={newZoneForm.fill_color} fillOpacity={0.3}
                                          stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="1 0.5"
                                          vectorEffect="non-scaling-stroke" data-testid="circle-preview" />
                                      ) : null;
                                    })()}
                                    {/* Ellipse drag preview */}
                                    {mapMode === "ellipse" && rectStart && rectEnd && (() => {
                                      const cx = (rectStart.x + rectEnd.x) / 2, cy = (rectStart.y + rectEnd.y) / 2;
                                      const rx = Math.abs(rectEnd.x - rectStart.x) / 2, ry = Math.abs(rectEnd.y - rectStart.y) / 2;
                                      return (rx > 0.5 && ry > 0.5) ? (
                                        <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
                                          fill={newZoneForm.fill_color} fillOpacity={0.3}
                                          stroke="#8b5cf6" strokeWidth="0.5" strokeDasharray="1 0.5"
                                          vectorEffect="non-scaling-stroke" data-testid="ellipse-preview" />
                                      ) : null;
                                    })()}
                                    {/* Freehand drawing preview */}
                                    {mapMode === "freehand" && isDrawingFreehand && freehandPoints.length > 1 && (
                                      <path
                                        d={getPath(freehandPoints, false)}
                                        fill="none" stroke="#ec4899" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke" data-testid="freehand-preview" />
                                    )}
                                  </svg>
                                </div>
                              );
                            })()}
                          </div>
                          {hoveredZone && mapMode !== "edit" && (() => {
                            const ti = ZONE_TYPES.find(t => t.value === hoveredZone.zone_type);
                            const cl = CHANGE_LABELS[hoveredZone.change_type] || CHANGE_LABELS.unchanged;
                            const hasChange = hoveredZone.change_type && hoveredZone.change_type !== "unchanged";
                            const capacity = hoveredZone.max_capacity || 0;
                            const area = hoveredZone.area_sqm || 0;
                            const currentCount = hoveredZone.current_count || 0;
                            const utilPct = capacity > 0 ? Math.round((currentCount / capacity) * 100) : 0;
                            const densityInfo = getDensityLevel(currentCount, capacity);
                            return (
                              <div className="absolute pointer-events-none z-50" style={{ left: tooltipPos.x, top: tooltipPos.y }} data-testid="zone-hover-tooltip">
                                <div className="bg-white/97 backdrop-blur-md rounded-xl shadow-2xl border overflow-hidden min-w-[240px]" style={{ direction: "rtl" }}>
                                  {/* Color header bar */}
                                  <div className="h-1.5" style={{ backgroundColor: hoveredZone.fill_color }} />
                                  <div className="p-3 space-y-2">
                                    {/* Zone code + change badge */}
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold shadow-sm" style={{ backgroundColor: hoveredZone.fill_color }}>
                                          {ti?.icon || "?"}
                                        </div>
                                        <span className="font-bold text-sm">{hoveredZone.zone_code}</span>
                                      </div>
                                      {hasChange && <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: cl.bg, color: cl.color }}>{isAr ? cl.ar : cl.en}</span>}
                                    </div>
                                    {/* Name + Category */}
                                    <div>
                                      <p className="text-xs font-medium text-slate-800">{isAr ? hoveredZone.name_ar : hoveredZone.name_en}</p>
                                      {ti && <p className="text-[10px] font-medium mt-0.5" style={{ color: ti.color }}>{isAr ? ti.label_ar : ti.label_en}</p>}
                                    </div>
                                    {/* Separator + Details */}
                                    {(area > 0 || capacity > 0) && (
                                      <>
                                        <div className="border-t border-dashed border-slate-200" />
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                          {area > 0 && (
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center text-blue-600 text-[8px] font-bold flex-shrink-0">م²</span>
                                              <span className="text-[11px] text-slate-600">{area.toLocaleString()} {isAr ? "م²" : "m²"}</span>
                                            </div>
                                          )}
                                          {capacity > 0 && (
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-4 h-4 rounded bg-amber-100 flex items-center justify-center text-amber-600 text-[8px] font-bold flex-shrink-0">S</span>
                                              <span className="text-[11px] text-slate-600">{capacity.toLocaleString()} {isAr ? "مصلي" : "cap"}</span>
                                            </div>
                                          )}
                                        </div>
                                      </>
                                    )}
                                    {/* Utilization bar (if has current count) */}
                                    {currentCount > 0 && capacity > 0 && (
                                      <div className="flex items-center gap-2 pt-0.5">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(utilPct, 100)}%`, backgroundColor: densityInfo.color }} />
                                        </div>
                                        <span className="text-[10px] font-bold font-mono" style={{ color: densityInfo.color }}>{utilPct}%</span>
                                      </div>
                                    )}
                                    {/* Status */}
                                    <div className="flex items-center gap-1.5">
                                      <span className={`w-2 h-2 rounded-full ${hoveredZone.is_removed ? "bg-red-500" : "bg-emerald-500"}`} />
                                      <span className={`text-[10px] font-semibold ${hoveredZone.is_removed ? "text-red-500" : "text-emerald-600"}`}>
                                        {hoveredZone.is_removed ? (isAr ? "مزالة" : "Removed") : (isAr ? "نشطة" : "Active")}
                                      </span>
                                    </div>
                                    {/* Daily note */}
                                    {hoveredZone.daily_note && (
                                      <div className="p-1.5 bg-slate-50 rounded text-[10px] text-slate-500 line-clamp-2 border-r-2 border-slate-300">{hoveredZone.daily_note}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  ) : <Card><CardContent className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد صورة خريطة" : "No map image"}</CardContent></Card>}

                  {/* ZONES LIST BELOW MAP */}
                  {activeZones.length > 0 && (
                    <div data-testid="zones-below-map">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-cairo font-semibold text-sm flex items-center gap-2">
                          <CircleDot className="w-4 h-4 text-emerald-500" />
                          {isAr ? "المناطق النشطة" : "Active Zones"}
                          <Badge variant="secondary" className="text-[10px]">{activeZones.length}</Badge>
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                        {activeZones.map(zone => {
                          const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                          const cl = CHANGE_LABELS[zone.change_type] || CHANGE_LABELS.unchanged;
                          const ch = zone.change_type && zone.change_type !== "unchanged";
                          const isSelected = zone.id === selectedZoneId;
                          return (
                            <div
                              key={zone.id}
                              ref={el => { zoneCardsRef.current[zone.id] = el; }}
                              data-testid={`zone-card-${zone.id}`}
                              className={`rounded-lg border p-2 transition-all ${activeSession?.status === "draft" ? "cursor-pointer" : ""} ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-200 shadow-md"
                                  : ch ? "hover:shadow-md" : "hover:shadow-sm hover:border-slate-300"
                              }`}
                              style={ch && !isSelected ? { borderBottomColor: cl.color, borderBottomWidth: 2 } : {}}
                              onClick={() => {
                                // Select zone for pulse highlight only - don't enter edit mode
                                setSelectedZoneId(isSelected ? null : zone.id);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: zone.fill_color }}>
                                  {ti?.icon || "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-xs truncate">{zone.zone_code}</span>
                                    {ch && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cl.color }} />}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground truncate">{isAr ? zone.name_ar : zone.name_en}</p>
                                </div>
                                {activeSession.status === "draft" && (
                                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100" style={{ opacity: isSelected ? 1 : undefined }}>
                                    <button className="p-0.5 rounded hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); setSelectedZone(zone); setShowZoneDialog(true); }} data-testid={`edit-zone-btn-${zone.id}`}>
                                      <Edit2 className="w-3 h-3 text-slate-400 hover:text-blue-600" />
                                    </button>
                                    <button className="p-0.5 rounded hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleToggleRemove(zone.id, false); }} data-testid={`remove-zone-btn-${zone.id}`}>
                                      <CircleOff className="w-3 h-3 text-slate-400 hover:text-red-500" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* REMOVED ZONES - Collapsible */}
                  {removedZones.length > 0 && (
                    <div data-testid="removed-zones-section">
                      <button
                        onClick={() => setShowRemovedZones(prev => !prev)}
                        className="flex items-center gap-2 w-full text-right py-2 px-1 text-sm font-cairo font-semibold text-red-400 hover:text-red-600 transition-colors"
                        data-testid="toggle-removed-zones"
                      >
                        <ChevronRight className={`w-4 h-4 transition-transform ${showRemovedZones ? "rotate-90" : ""}`} />
                        <CircleOff className="w-4 h-4" />
                        {isAr ? "المناطق المزالة" : "Removed Zones"}
                        <Badge variant="destructive" className="text-[10px] px-1.5">{removedZones.length}</Badge>
                      </button>
                      {showRemovedZones && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 mt-2">
                          {removedZones.map(zone => {
                            const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                            return (
                              <div key={zone.id} className="rounded-xl border border-red-200/50 bg-red-50/30 p-3 opacity-80" data-testid={`removed-zone-card-${zone.id}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100 text-red-500 text-xs font-bold"><X className="w-4 h-4" /></div>
                                    <div>
                                      <span className="font-semibold text-sm line-through text-red-400">{zone.zone_code}</span>
                                      <p className="text-xs text-red-400">{isAr ? zone.name_ar : zone.name_en}</p>
                                    </div>
                                  </div>
                                  {activeSession.status === "draft" && (
                                    <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-7 text-xs" onClick={() => handleToggleRemove(zone.id, true)} data-testid={`restore-zone-btn-${zone.id}`}>
                                      <RotateCcw className="w-3 h-3 ml-1" />{isAr ? "استعادة" : "Restore"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* CHANGES TAB */}
                <TabsContent value="changes" className="space-y-4">
                  {/* Change Summary KPIs */}
                  {activeSession?.changes_summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { key: "added", icon: Plus, label: isAr ? "مضاف" : "Added", color: "#22c55e", bg: "from-emerald-50" },
                        { key: "removed", icon: Trash2, label: isAr ? "محذوف" : "Removed", color: "#ef4444", bg: "from-red-50" },
                        { key: "modified", icon: Edit2, label: isAr ? "معدّل" : "Modified", color: "#f59e0b", bg: "from-amber-50" },
                        { key: "unchanged", icon: Check, label: isAr ? "بدون تغيير" : "Unchanged", color: "#94a3b8", bg: "from-slate-50" },
                      ].map(item => {
                        const count = activeSession.changes_summary[item.key] || 0;
                        const Icon = item.icon;
                        return (
                          <div key={item.key} className={`rounded-xl border bg-gradient-to-bl ${item.bg} to-white p-3`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-muted-foreground font-medium">{item.label}</span>
                              <Icon className="w-4 h-4" style={{ color: item.color }} />
                            </div>
                            <p className="text-2xl font-bold" style={{ color: item.color }}>{count}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* All zones grouped by change type */}
                  {(() => {
                    const allZones = activeSession?.zones || [];
                    const groups = [
                      { type: "added", label: isAr ? "مناطق مضافة" : "Added Zones", zones: allZones.filter(z => z.change_type === "added"), color: "#22c55e", bg: "#dcfce7", icon: Plus },
                      { type: "removed", label: isAr ? "مناطق محذوفة" : "Removed Zones", zones: allZones.filter(z => z.is_removed || z.change_type === "removed"), color: "#ef4444", bg: "#fef2f2", icon: Trash2 },
                      { type: "modified", label: isAr ? "مناطق معدّلة" : "Modified Zones", zones: allZones.filter(z => z.change_type && ["modified","category_changed","moved"].includes(z.change_type)), color: "#f59e0b", bg: "#fefce8", icon: Edit2 },
                      { type: "unchanged", label: isAr ? "بدون تغيير" : "Unchanged", zones: allZones.filter(z => !z.is_removed && (!z.change_type || z.change_type === "unchanged")), color: "#94a3b8", bg: "#f8fafc", icon: Check },
                    ].filter(g => g.zones.length > 0);

                    return groups.length === 0 ? (
                      <Card><CardContent className="py-12 text-center"><CheckCircle2 className="w-12 h-12 mx-auto text-emerald-300 mb-3" /><p className="text-muted-foreground">{isAr ? "لا توجد تغييرات" : "No changes"}</p></CardContent></Card>
                    ) : (
                      <div className="space-y-4">
                        {groups.map(group => {
                          const GroupIcon = group.icon;
                          return (
                            <div key={group.type} data-testid={`changes-group-${group.type}`}>
                              <h3 className="font-cairo font-semibold text-sm flex items-center gap-2 mb-2">
                                <GroupIcon className="w-4 h-4" style={{ color: group.color }} />
                                {group.label}
                                <Badge className="text-[9px] px-1.5" style={{ backgroundColor: group.bg, color: group.color }}>{group.zones.length}</Badge>
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                                {group.zones.map(zone => {
                                  const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                                  return (
                                    <div key={zone.id} className="rounded-lg border p-2 transition-all hover:shadow-sm" style={{ borderBottomColor: group.color, borderBottomWidth: 2 }} data-testid={`change-item-${zone.id}`}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: zone.fill_color || group.color }}>
                                          {ti?.icon || "?"}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className={`text-xs font-bold truncate ${group.type === "removed" ? "line-through text-red-400" : ""}`}>{zone.zone_code}</p>
                                          <p className="text-[10px] text-muted-foreground truncate">{isAr ? zone.name_ar : zone.name_en}</p>
                                        </div>
                                      </div>
                                      {zone.daily_note && <p className="text-[9px] text-slate-400 mt-1 truncate">{zone.daily_note}</p>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Supervisor Notes */}
                  {activeSession?.supervisor_notes && (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <h4 className="font-cairo font-semibold text-sm text-blue-700 flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4" />{isAr ? "ملاحظات المشرف" : "Supervisor Notes"}</h4>
                      <p className="text-sm text-blue-600 whitespace-pre-wrap">{activeSession.supervisor_notes}</p>
                    </div>
                  )}
                </TabsContent>

                {/* DENSITY TAB */}
                <TabsContent value="density" className="space-y-5">
                  {densityStats && (
                    <>
                      {/* Density KPI Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="density-kpi-row">
                        {/* Overall Utilization */}
                        <div className="relative overflow-hidden rounded-xl border p-4" style={{ background: `linear-gradient(135deg, ${densityStats.overallLevel.bg}, white)` }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground font-medium">{isAr ? "نسبة الإشغال" : "Utilization"}</span>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: densityStats.overallLevel.color + "20" }}>
                              <Gauge className="w-4 h-4" style={{ color: densityStats.overallLevel.color }} />
                            </div>
                          </div>
                          <p className="text-3xl font-bold" style={{ color: densityStats.overallLevel.color }} data-testid="density-overall-pct">{densityStats.overallPct}%</p>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(densityStats.overallPct, 100)}%`, backgroundColor: densityStats.overallLevel.color }} />
                          </div>
                        </div>

                        {/* Total Current */}
                        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-blue-50 to-white p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground font-medium">{isAr ? "العدد الحالي" : "Current Count"}</span>
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Users className="w-4 h-4 text-blue-600" />
                            </div>
                          </div>
                          <p className="text-3xl font-bold text-blue-700" data-testid="density-total-current">{densityStats.totalCurrent.toLocaleString()}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{isAr ? `من أصل ${densityStats.totalCapacity.toLocaleString()}` : `of ${densityStats.totalCapacity.toLocaleString()}`}</p>
                        </div>

                        {/* Critical Zones */}
                        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-red-50 to-white p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground font-medium">{isAr ? "مناطق حرجة" : "Critical Zones"}</span>
                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                              <ShieldAlert className="w-4 h-4 text-red-500" />
                            </div>
                          </div>
                          <p className="text-3xl font-bold text-red-600" data-testid="density-critical-count">{densityStats.criticalCount}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{isAr ? "تجاوز 90% من السعة" : "> 90% capacity"}</p>
                        </div>

                        {/* High Zones */}
                        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-orange-50 to-white p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground font-medium">{isAr ? "مناطق مرتفعة" : "High Zones"}</span>
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                              <Flame className="w-4 h-4 text-orange-500" />
                            </div>
                          </div>
                          <p className="text-3xl font-bold text-orange-600" data-testid="density-high-count">{densityStats.highCount}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{isAr ? "بين 70% - 90%" : "70% - 90%"}</p>
                        </div>
                      </div>

                      {/* Save button */}
                      {Object.keys(densityEdits).length > 0 && (
                        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg" data-testid="density-save-bar">
                          <div className="flex items-center gap-2 text-sm text-amber-700">
                            <AlertCircle className="w-4 h-4" />
                            {isAr ? `${Object.keys(densityEdits).length} تعديل غير محفوظ` : `${Object.keys(densityEdits).length} unsaved changes`}
                          </div>
                          <Button onClick={handleSaveDensityBatch} disabled={savingDensity} className="bg-emerald-600 hover:bg-emerald-700" size="sm" data-testid="density-save-btn">
                            {savingDensity ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <SaveAll className="w-4 h-4 ml-1" />}
                            {isAr ? "حفظ الكل" : "Save All"}
                          </Button>
                        </div>
                      )}

                      {/* Density Zone Cards */}
                      <Card data-testid="density-zones-card">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-cairo flex items-center gap-2">
                              <Activity className="w-4 h-4 text-blue-600" />
                              {isAr ? "كثافة المناطق" : "Zone Density"}
                              <Badge variant="secondary" className="text-[10px]">{densityStats.zonesDensity.length} {isAr ? "منطقة" : "zones"}</Badge>
                            </CardTitle>
                            {/* Density level legend */}
                            <div className="flex items-center gap-3">
                              {[
                                { color: "#0ea5e9", label: isAr ? "منخفض" : "Low" },
                                { color: "#16a34a", label: isAr ? "طبيعي" : "Normal" },
                                { color: "#d97706", label: isAr ? "متوسط" : "Medium" },
                                { color: "#ea580c", label: isAr ? "مرتفع" : "High" },
                                { color: "#dc2626", label: isAr ? "حرج" : "Critical" },
                              ].map(l => (
                                <div key={l.color} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                                  {l.label}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2" data-testid="density-zone-list">
                            {/* Header row */}
                            <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[11px] font-semibold text-muted-foreground border-b">
                              <div className="col-span-3">{isAr ? "المنطقة" : "Zone"}</div>
                              <div className="col-span-2 text-center">{isAr ? "العدد الحالي" : "Current"}</div>
                              <div className="col-span-2 text-center">{isAr ? "السعة القصوى" : "Capacity"}</div>
                              <div className="col-span-3 text-center">{isAr ? "مستوى الإشغال" : "Utilization"}</div>
                              <div className="col-span-2 text-center">{isAr ? "الحالة" : "Status"}</div>
                            </div>
                            {densityStats.zonesDensity.map(zone => {
                              const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                              const di = zone.densityInfo;
                              const editCount = densityEdits[zone.id]?.current_count;
                              const editCap = densityEdits[zone.id]?.max_capacity;
                              return (
                                <div
                                  key={zone.id}
                                  className={`grid grid-cols-12 gap-3 px-3 py-3 rounded-lg items-center transition-all hover:shadow-sm ${
                                    di.level === "critical" ? "bg-red-50/60 border border-red-100" :
                                    di.level === "high" ? "bg-orange-50/40 border border-orange-100" :
                                    "hover:bg-slate-50/80 border border-transparent"
                                  }`}
                                  data-testid={`density-zone-${zone.id}`}
                                >
                                  {/* Zone Info */}
                                  <div className="col-span-3 flex items-center gap-2 min-w-0">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: zone.fill_color }}>
                                      {ti?.icon || "?"}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold truncate">{zone.zone_code}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">{isAr ? zone.name_ar : zone.name_en}</p>
                                    </div>
                                  </div>

                                  {/* Current Count Input */}
                                  <div className="col-span-2 flex justify-center">
                                    <Input
                                      type="number"
                                      min={0}
                                      className={`w-24 h-8 text-center text-sm font-mono ${editCount !== undefined ? "ring-2 ring-amber-300 border-amber-400" : ""}`}
                                      value={editCount ?? zone.currentDisplay}
                                      onChange={(e) => handleDensityChange(zone.id, "current_count", parseInt(e.target.value) || 0)}
                                      data-testid={`density-input-${zone.id}`}
                                    />
                                  </div>

                                  {/* Max Capacity - Read Only (calculated from zone settings) */}
                                  <div className="col-span-2 flex flex-col items-center justify-center">
                                    <span className="text-sm font-bold font-mono text-slate-600" data-testid={`capacity-display-${zone.id}`}>{zone.maxDisplay.toLocaleString()}</span>
                                    {zone.area_sqm > 0 && <span className="text-[9px] text-muted-foreground">{zone.area_sqm}{isAr ? " م²" : " m²"}</span>}
                                  </div>

                                  {/* Utilization Bar */}
                                  <div className="col-span-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full rounded-full transition-all duration-500"
                                          style={{
                                            width: `${Math.min(di.pct, 100)}%`,
                                            backgroundColor: di.color,
                                          }}
                                        />
                                      </div>
                                      <span className="text-xs font-bold font-mono w-10 text-left" style={{ color: di.color }}>{di.pct}%</span>
                                    </div>
                                  </div>

                                  {/* Status Badge */}
                                  <div className="col-span-2 flex justify-center">
                                    <span
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                                      style={{ backgroundColor: di.bg, color: di.color }}
                                      data-testid={`density-status-${zone.id}`}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: di.color }} />
                                      {isAr ? di.label_ar : di.label_en}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Density Heat Map Visualization */}
                      {selectedFloor?.image_url && (
                        <Card data-testid="density-heatmap-card">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-cairo flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-orange-600" />
                              {isAr ? "خريطة الكثافة الحرارية" : "Density Heat Map"}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-2">
                            <div className="relative bg-slate-100 rounded-lg overflow-hidden" style={{ height: "400px" }}>
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {(() => {
                                  let ws = { position: "relative", width: "100%", height: "100%" };
                                  if (imgRatio) {
                                    const ch = 400;
                                    const cw = mapContainerRef.current?.clientWidth || 800;
                                    if (cw / ch > imgRatio) ws = { position: "relative", height: "100%", width: ch * imgRatio };
                                    else ws = { position: "relative", width: "100%", height: cw / imgRatio };
                                  }
                                  return (
                                    <div style={ws}>
                                      <img src={selectedFloor.image_url} alt="" style={{ width: "100%", height: "100%", display: "block" }} draggable={false} className="pointer-events-none select-none" />
                                      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 100" preserveAspectRatio="none" data-testid="density-heatmap-svg">
                                        {densityStats.zonesDensity.map(zone => {
                                          const di = zone.densityInfo;
                                          const center = zone.polygon_points?.length > 0
                                            ? { x: zone.polygon_points.reduce((s,p) => s+p.x, 0) / zone.polygon_points.length, y: zone.polygon_points.reduce((s,p) => s+p.y, 0) / zone.polygon_points.length }
                                            : { x: 50, y: 50 };
                                          return (
                                            <g key={zone.id}>
                                              <path
                                                d={getPath(zone.polygon_points)}
                                                fill={di.color}
                                                fillOpacity={0.15 + (di.pct / 100) * 0.45}
                                                stroke={di.color}
                                                strokeWidth={di.level === "critical" ? 0.6 : 0.3}
                                                strokeOpacity={0.8}
                                                vectorEffect="non-scaling-stroke"
                                              />
                                              {/* Percentage label on zone */}
                                              <text
                                                x={center.x} y={center.y - 0.8}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                fontSize="2.2"
                                                fontWeight="bold"
                                                fill={di.pct >= 50 ? "#fff" : di.color}
                                                style={{ paintOrder: "stroke", stroke: di.pct >= 50 ? di.color : "white", strokeWidth: 0.4 }}
                                              >
                                                {di.pct}%
                                              </text>
                                              <text
                                                x={center.x} y={center.y + 1.5}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                fontSize="1.4"
                                                fill={di.pct >= 50 ? "#fff" : "#64748b"}
                                                style={{ paintOrder: "stroke", stroke: di.pct >= 50 ? di.color : "white", strokeWidth: 0.3 }}
                                              >
                                                {zone.currentDisplay.toLocaleString()}
                                              </text>
                                            </g>
                                          );
                                        })}
                                      </svg>
                                    </div>
                                  );
                                })()}
                              </div>
                              {/* Gradient legend */}
                              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-sm">
                                <span className="text-[10px] font-medium text-muted-foreground">{isAr ? "منخفض" : "Low"}</span>
                                <div className="flex-1 h-2.5 rounded-full" style={{ background: "linear-gradient(to left, #0ea5e9, #16a34a, #d97706, #ea580c, #dc2626)" }} />
                                <span className="text-[10px] font-medium text-muted-foreground">{isAr ? "حرج" : "Critical"}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* STATISTICS TAB */}
                <TabsContent value="stats" className="space-y-5">
                  {sessionStats && (
                    <>
                      {/* KPI Summary Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="stats-kpi-row">
                        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-emerald-50 to-white p-4">
                          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-emerald-200/30 blur-xl" />
                          <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground font-medium">{isAr ? "المناطق النشطة" : "Active Zones"}</span>
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <CircleDot className="w-4 h-4 text-emerald-600" />
                              </div>
                            </div>
                            <p className="text-3xl font-bold text-emerald-700" data-testid="stats-total-active">{sessionStats.totalActive}</p>
                            {sessionStats.hasPrevious && (
                              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
                                sessionStats.totalActive > sessionStats.prevTotalActive ? "text-emerald-600" :
                                sessionStats.totalActive < sessionStats.prevTotalActive ? "text-red-500" : "text-slate-400"
                              }`}>
                                {sessionStats.totalActive > sessionStats.prevTotalActive ? <ArrowUpRight className="w-3.5 h-3.5" /> :
                                 sessionStats.totalActive < sessionStats.prevTotalActive ? <ArrowDownRight className="w-3.5 h-3.5" /> :
                                 <Minus className="w-3.5 h-3.5" />}
                                {sessionStats.totalActive !== sessionStats.prevTotalActive
                                  ? `${Math.abs(sessionStats.totalActive - sessionStats.prevTotalActive)} ${isAr ? "عن اليوم السابق" : "vs prev"}`
                                  : (isAr ? "بدون تغيير" : "No change")}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-red-50 to-white p-4">
                          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-red-200/30 blur-xl" />
                          <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground font-medium">{isAr ? "المناطق المزالة" : "Removed"}</span>
                              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                <CircleOff className="w-4 h-4 text-red-500" />
                              </div>
                            </div>
                            <p className="text-3xl font-bold text-red-600" data-testid="stats-total-removed">{sessionStats.totalRemoved}</p>
                          </div>
                        </div>

                        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-amber-50 to-white p-4">
                          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-amber-200/30 blur-xl" />
                          <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground font-medium">{isAr ? "التغييرات" : "Changes"}</span>
                              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                <Edit2 className="w-4 h-4 text-amber-600" />
                              </div>
                            </div>
                            <p className="text-3xl font-bold text-amber-600" data-testid="stats-total-changes">{changedZones.length}</p>
                          </div>
                        </div>

                        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-blue-50 to-white p-4">
                          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-blue-200/30 blur-xl" />
                          <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground font-medium">{isAr ? "فئات مستخدمة" : "Categories"}</span>
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Layers className="w-4 h-4 text-blue-600" />
                              </div>
                            </div>
                            <p className="text-3xl font-bold text-blue-600" data-testid="stats-unique-cats">{sessionStats.uniqueCategories}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">{isAr ? `من أصل ${ZONE_TYPES.length} فئة` : `of ${ZONE_TYPES.length} total`}</p>
                          </div>
                        </div>
                      </div>

                      {/* Main Stats Content: Chart + Breakdown */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Donut Chart */}
                        <Card className="lg:col-span-1" data-testid="stats-donut-chart">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-cairo flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-emerald-600" />
                              {isAr ? "توزيع الفئات" : "Category Distribution"}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex flex-col items-center">
                            {sessionStats.totalActive === 0 ? (
                              <div className="py-8 text-center text-muted-foreground text-sm">{isAr ? "لا توجد مناطق" : "No zones"}</div>
                            ) : (
                              <>
                                <svg viewBox="0 0 200 200" className="w-48 h-48" data-testid="donut-svg">
                                  {(() => {
                                    const total = sessionStats.totalActive;
                                    const cx = 100, cy = 100, r = 72, strokeW = 28;
                                    const circumference = 2 * Math.PI * r;
                                    let offset = 0;
                                    return sessionStats.activeCats.map((cat, i) => {
                                      const count = sessionStats.catCounts[cat.value];
                                      const pct = count / total;
                                      const dashLen = pct * circumference;
                                      const dashGap = circumference - dashLen;
                                      const el = (
                                        <circle
                                          key={cat.value}
                                          cx={cx} cy={cy} r={r}
                                          fill="none"
                                          stroke={cat.color}
                                          strokeWidth={strokeW}
                                          strokeDasharray={`${dashLen} ${dashGap}`}
                                          strokeDashoffset={-offset}
                                          strokeLinecap="butt"
                                          transform={`rotate(-90 ${cx} ${cy})`}
                                          className="transition-all duration-500"
                                        />
                                      );
                                      offset += dashLen;
                                      return el;
                                    });
                                  })()}
                                  <text x="100" y="92" textAnchor="middle" className="fill-current text-foreground" fontSize="28" fontWeight="bold">{sessionStats.totalActive}</text>
                                  <text x="100" y="114" textAnchor="middle" className="fill-muted-foreground" fontSize="12">{isAr ? "منطقة" : "zones"}</text>
                                </svg>
                                {/* Legend */}
                                <div className="w-full space-y-1.5 mt-3">
                                  {sessionStats.activeCats.map(cat => {
                                    const count = sessionStats.catCounts[cat.value];
                                    const pct = sessionStats.totalActive > 0 ? Math.round((count / sessionStats.totalActive) * 100) : 0;
                                    return (
                                      <div key={cat.value} className="flex items-center gap-2 text-xs">
                                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                        <span className="flex-1 truncate">{isAr ? cat.label_ar : cat.label_en}</span>
                                        <span className="font-mono font-semibold">{count}</span>
                                        <span className="text-muted-foreground w-8 text-left">{pct}%</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>

                        {/* Category Breakdown Table */}
                        <Card className="lg:col-span-2" data-testid="stats-category-breakdown">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-cairo flex items-center gap-2">
                              <Tag className="w-4 h-4 text-blue-600" />
                              {isAr ? "تفصيل الفئات" : "Category Breakdown"}
                              {sessionStats.hasPrevious && (
                                <Badge variant="outline" className="text-[10px] font-normal">
                                  {isAr ? `مقارنة مع ${formatDateShort(sessionStats.prevSession.date)}` : `vs ${formatDateShort(sessionStats.prevSession.date)}`}
                                </Badge>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1" data-testid="category-rows">
                              {/* Header */}
                              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-semibold text-muted-foreground border-b">
                                <div className="col-span-5">{isAr ? "الفئة" : "Category"}</div>
                                <div className="col-span-2 text-center">{isAr ? "العدد" : "Count"}</div>
                                <div className="col-span-3 text-center">{isAr ? "النسبة" : "Share"}</div>
                                {sessionStats.hasPrevious && <div className="col-span-2 text-center">{isAr ? "الفرق" : "Delta"}</div>}
                              </div>
                              {ZONE_TYPES.map(cat => {
                                const count = sessionStats.catCounts[cat.value] || 0;
                                const prevCount = sessionStats.prevCatCounts[cat.value] ?? null;
                                const delta = prevCount !== null ? count - prevCount : null;
                                const pct = sessionStats.totalActive > 0 ? Math.round((count / sessionStats.totalActive) * 100) : 0;
                                if (count === 0 && (prevCount === null || prevCount === 0)) return null;
                                return (
                                  <div
                                    key={cat.value}
                                    className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-50/80 transition-colors items-center"
                                    data-testid={`stat-row-${cat.value}`}
                                  >
                                    <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: cat.color }}>
                                        {cat.icon}
                                      </div>
                                      <span className="text-xs font-medium truncate">{isAr ? cat.label_ar : cat.label_en}</span>
                                    </div>
                                    <div className="col-span-2 text-center">
                                      <span className="text-sm font-bold">{count}</span>
                                    </div>
                                    <div className="col-span-3">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                          <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${pct}%`, backgroundColor: cat.color }}
                                          />
                                        </div>
                                        <span className="text-[11px] text-muted-foreground font-mono w-8 text-left">{pct}%</span>
                                      </div>
                                    </div>
                                    {sessionStats.hasPrevious && (
                                      <div className="col-span-2 text-center">
                                        {delta !== null && delta !== 0 ? (
                                          <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                                            delta > 0 ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
                                          }`}>
                                            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {delta > 0 ? `+${delta}` : delta}
                                          </span>
                                        ) : (
                                          <span className="text-xs text-slate-300">-</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Previous Day Comparison Panel */}
                      {sessionStats.hasPrevious && (
                        <Card data-testid="stats-prev-comparison">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-cairo flex items-center gap-2">
                              <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                              {isAr ? "مقارنة مع اليوم السابق" : "Previous Day Comparison"}
                              <Badge variant="outline" className="text-[10px]">{formatDateShort(sessionStats.prevSession.date)}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              {/* Today summary */}
                              <div className="text-center p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                <p className="text-xs text-emerald-600 font-medium mb-1">{isAr ? "اليوم" : "Today"}</p>
                                <p className="text-3xl font-bold text-emerald-700">{sessionStats.totalActive}</p>
                                <p className="text-[11px] text-emerald-500">{isAr ? "منطقة نشطة" : "active zones"}</p>
                              </div>
                              {/* Delta */}
                              <div className="flex items-center justify-center">
                                <div className={`text-center p-4 rounded-xl border-2 ${
                                  sessionStats.totalActive > sessionStats.prevTotalActive
                                    ? "border-emerald-200 bg-emerald-50/30"
                                    : sessionStats.totalActive < sessionStats.prevTotalActive
                                      ? "border-red-200 bg-red-50/30"
                                      : "border-slate-200 bg-slate-50/30"
                                }`}>
                                  {sessionStats.totalActive > sessionStats.prevTotalActive ? (
                                    <TrendingUp className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                                  ) : sessionStats.totalActive < sessionStats.prevTotalActive ? (
                                    <TrendingDown className="w-8 h-8 mx-auto text-red-500 mb-1" />
                                  ) : (
                                    <Minus className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                                  )}
                                  <p className={`text-2xl font-bold ${
                                    sessionStats.totalActive > sessionStats.prevTotalActive ? "text-emerald-600" :
                                    sessionStats.totalActive < sessionStats.prevTotalActive ? "text-red-600" : "text-slate-500"
                                  }`}>
                                    {sessionStats.totalActive > sessionStats.prevTotalActive ? "+" : ""}
                                    {sessionStats.totalActive - sessionStats.prevTotalActive}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">{isAr ? "فرق المناطق" : "zone difference"}</p>
                                </div>
                              </div>
                              {/* Previous summary */}
                              <div className="text-center p-4 bg-slate-50/60 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 font-medium mb-1">{isAr ? "اليوم السابق" : "Previous"}</p>
                                <p className="text-3xl font-bold text-slate-600">{sessionStats.prevTotalActive}</p>
                                <p className="text-[11px] text-slate-400">{isAr ? "منطقة نشطة" : "active zones"}</p>
                              </div>
                            </div>

                            {/* Category-level changes */}
                            {(() => {
                              const changes = ZONE_TYPES
                                .map(cat => ({
                                  ...cat,
                                  today: sessionStats.catCounts[cat.value] || 0,
                                  prev: sessionStats.prevCatCounts[cat.value] || 0,
                                  delta: (sessionStats.catCounts[cat.value] || 0) - (sessionStats.prevCatCounts[cat.value] || 0),
                                }))
                                .filter(c => c.delta !== 0);

                              if (changes.length === 0) {
                                return (
                                  <div className="text-center py-4 text-sm text-muted-foreground">
                                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-300 mb-2" />
                                    {isAr ? "نفس توزيع الفئات مع اليوم السابق" : "Same category distribution as previous day"}
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-2" data-testid="category-changes-list">
                                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">{isAr ? "التغييرات بحسب الفئة:" : "Changes by category:"}</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {changes.map(c => (
                                      <div
                                        key={c.value}
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                          c.delta > 0 ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"
                                        }`}
                                        data-testid={`change-cat-${c.value}`}
                                      >
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: c.color }}>
                                          {c.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium truncate">{isAr ? c.label_ar : c.label_en}</p>
                                          <p className="text-[11px] text-muted-foreground">{c.prev} &rarr; {c.today}</p>
                                        </div>
                                        <span className={`text-sm font-bold ${c.delta > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                          {c.delta > 0 ? `+${c.delta}` : c.delta}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><Edit2 className="w-5 h-5" />{isAr ? "تعديل المنطقة" : "Edit Zone"}</DialogTitle></DialogHeader>
          {selectedZone && (
            <div className="space-y-4">
              {/* Zone header with color icon */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: selectedZone.fill_color }}>{ZONE_TYPES.find(t => t.value === selectedZone.zone_type)?.icon || "?"}</div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{selectedZone.zone_code}</p>
                  <p className="text-xs text-muted-foreground">{isAr ? selectedZone.name_ar : selectedZone.name_en}</p>
                </div>
                {selectedZone.change_type && selectedZone.change_type !== "unchanged" && (() => {
                  const cl = CHANGE_LABELS[selectedZone.change_type];
                  return cl ? <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: cl.bg, color: cl.color }}>{isAr ? cl.ar : cl.en}</span> : null;
                })()}
              </div>

              {/* Editable Name & Code */}
              {activeSession?.status === "draft" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">{isAr ? "اسم المنطقة" : "Zone Name"}</Label>
                    <Input className="mt-1 text-sm" value={selectedZone.name_ar || ""} onChange={(e) => setSelectedZone(p => ({ ...p, name_ar: e.target.value }))} data-testid="zone-edit-name" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">{isAr ? "الترميز" : "Zone Code"}</Label>
                    <Input className="mt-1 text-sm font-mono" value={selectedZone.zone_code || ""} onChange={(e) => setSelectedZone(p => ({ ...p, zone_code: e.target.value }))} data-testid="zone-edit-code" />
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <Label className="text-sm font-medium">{isAr ? "الفئة" : "Category"}</Label>
                <Select value={selectedZone.zone_type} onValueChange={(v) => { handleCategoryChange(selectedZone.id, v); setSelectedZone(p => ({ ...p, zone_type: v })); }} disabled={activeSession?.status === "completed"}>
                  <SelectTrigger className="mt-1" data-testid="zone-category-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{ZONE_TYPES.map(t => <SelectItem key={t.value} value={t.value}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />{isAr ? t.label_ar : t.label_en}</div></SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Style Controls */}
              {activeSession?.status === "draft" && (
                <div className="space-y-3 p-3 border rounded-lg bg-slate-50/50">
                  <h4 className="font-cairo font-semibold text-sm flex items-center gap-2"><Palette className="w-4 h-4" />{isAr ? "تنسيق الشكل" : "Shape Style"}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{isAr ? "لون التعبئة" : "Fill Color"}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={selectedZone.fill_color || "#22c55e"} onChange={(e) => { setSelectedZone(p => ({ ...p, fill_color: e.target.value })); handleUpdateZoneStyle(selectedZone.id, { fill_color: e.target.value }); }} className="w-8 h-8 rounded cursor-pointer border-0" data-testid="zone-fill-color" />
                        <span className="text-xs text-muted-foreground font-mono">{selectedZone.fill_color}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{isAr ? "شفافية التعبئة" : "Fill Opacity"}</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Slider value={[Math.round((selectedZone.opacity ?? 0.4) * 100)]} min={5} max={100} step={5} onValueChange={([v]) => { const op = v / 100; setSelectedZone(p => ({ ...p, opacity: op })); handleUpdateZoneStyle(selectedZone.id, { opacity: op }); }} className="flex-1" data-testid="zone-fill-opacity" />
                        <span className="text-xs w-8 text-center font-mono">{Math.round((selectedZone.opacity ?? 0.4) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{isAr ? "لون الحدود" : "Stroke Color"}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={selectedZone.stroke_color || "#000000"} onChange={(e) => { setSelectedZone(p => ({ ...p, stroke_color: e.target.value })); handleUpdateZoneStyle(selectedZone.id, { stroke_color: e.target.value }); }} className="w-8 h-8 rounded cursor-pointer border-0" data-testid="zone-stroke-color" />
                        <span className="text-xs text-muted-foreground font-mono">{selectedZone.stroke_color || "#000000"}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{isAr ? "شفافية الحدود" : "Stroke Opacity"}</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Slider value={[Math.round((selectedZone.stroke_opacity ?? 1) * 100)]} min={0} max={100} step={5} onValueChange={([v]) => { const op = v / 100; setSelectedZone(p => ({ ...p, stroke_opacity: op })); handleUpdateZoneStyle(selectedZone.id, { stroke_opacity: op }); }} className="flex-1" data-testid="zone-stroke-opacity" />
                        <span className="text-xs w-8 text-center font-mono">{Math.round((selectedZone.stroke_opacity ?? 1) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{isAr ? "سُمك الحدود" : "Stroke Width"}</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Slider value={[selectedZone.stroke_width ?? 0.3]} min={0.1} max={2} step={0.1} onValueChange={([v]) => { setSelectedZone(p => ({ ...p, stroke_width: v })); handleUpdateZoneStyle(selectedZone.id, { stroke_width: v }); }} className="flex-1" data-testid="zone-stroke-width" />
                        <span className="text-xs w-8 text-center font-mono">{(selectedZone.stroke_width ?? 0.3).toFixed(1)}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{isAr ? "نوع الحدود" : "Stroke Style"}</Label>
                      <div className="flex items-center gap-1 mt-2">
                        {[
                          { value: "solid", label: isAr ? "متصل" : "Solid", preview: "none" },
                          { value: "dashed", label: isAr ? "مقطع" : "Dashed", preview: "4 2" },
                          { value: "dotted", label: isAr ? "نقطي" : "Dotted", preview: "1 1.5" },
                        ].map(s => (
                          <button key={s.value} onClick={() => { setSelectedZone(p => ({ ...p, stroke_style: s.value })); handleUpdateZoneStyle(selectedZone.id, { stroke_style: s.value }); }} className={`flex-1 flex flex-col items-center gap-1 p-1.5 rounded border text-[10px] transition-all ${(selectedZone.stroke_style || "dashed") === s.value ? "border-emerald-500 bg-emerald-50" : "hover:bg-slate-50"}`} data-testid={`stroke-style-${s.value}`}>
                            <svg width="32" height="6" viewBox="0 0 32 6"><line x1="2" y1="3" x2="30" y2="3" stroke={selectedZone.stroke_color || "#000"} strokeWidth="2" strokeDasharray={s.preview} /></svg>
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center p-3 bg-white rounded border">
                    <svg width="80" height="50" viewBox="0 0 80 50">
                      <rect x="5" y="5" width="70" height="40" rx="2" fill={selectedZone.fill_color} fillOpacity={selectedZone.opacity ?? 0.4} stroke={selectedZone.stroke_color || "#000"} strokeWidth={(selectedZone.stroke_width ?? 0.3) * 3} strokeOpacity={selectedZone.stroke_opacity ?? 1} strokeDasharray={(selectedZone.stroke_style || "dashed") === "solid" ? "none" : (selectedZone.stroke_style || "dashed") === "dotted" ? "2 3" : "8 4"} />
                    </svg>
                    <span className="text-[10px] text-muted-foreground mr-2">{isAr ? "معاينة" : "Preview"}</span>
                  </div>
                </div>
              )}

              {/* Capacity Calculator */}
              {activeSession?.status === "draft" && (
                <div className="space-y-3 p-3 border rounded-lg bg-blue-50/30" data-testid="capacity-calculator">
                  <h4 className="font-cairo font-semibold text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    {isAr ? "حساب السعة" : "Capacity Calculator"}
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">{isAr ? "المساحة (م²)" : "Area (m²)"}</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        className="mt-1 text-sm font-mono"
                        value={selectedZone.area_sqm ?? 0}
                        onChange={(e) => {
                          const area = parseFloat(e.target.value) || 0;
                          const pp = selectedZone.per_person_sqm || 0.8;
                          const cap = pp > 0 && area > 0 ? Math.round(area / pp) : selectedZone.max_capacity || 0;
                          setSelectedZone(p => ({ ...p, area_sqm: area, max_capacity: cap }));
                        }}
                        data-testid="zone-area-input"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{isAr ? "نصيب الفرد (م²)" : "Per Person (m²)"}</Label>
                      <Input
                        type="number"
                        min={0.1}
                        step={0.1}
                        className="mt-1 text-sm font-mono"
                        value={selectedZone.per_person_sqm ?? 0.8}
                        onChange={(e) => {
                          const pp = parseFloat(e.target.value) || 0.8;
                          const area = selectedZone.area_sqm || 0;
                          const cap = pp > 0 && area > 0 ? Math.round(area / pp) : selectedZone.max_capacity || 0;
                          setSelectedZone(p => ({ ...p, per_person_sqm: pp, max_capacity: cap }));
                        }}
                        data-testid="zone-perperson-input"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{isAr ? "السعة القصوى" : "Max Capacity"}</Label>
                      <Input
                        type="number"
                        min={0}
                        className="mt-1 text-sm font-mono font-bold"
                        value={selectedZone.max_capacity ?? 1000}
                        onChange={(e) => setSelectedZone(p => ({ ...p, max_capacity: parseInt(e.target.value) || 0 }))}
                        data-testid="zone-capacity-input"
                      />
                    </div>
                  </div>
                  {/* Visual Formula */}
                  {(selectedZone.area_sqm > 0 && selectedZone.per_person_sqm > 0) && (
                    <div className="p-3 bg-white rounded-lg border border-blue-100 text-center" data-testid="capacity-formula">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg font-bold font-mono">{selectedZone.area_sqm} {isAr ? "م²" : "m²"}</span>
                        <span className="text-slate-400 font-bold text-lg">&divide;</span>
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-bold font-mono">{selectedZone.per_person_sqm} {isAr ? "م²/فرد" : "m²/p"}</span>
                        <span className="text-slate-400 font-bold text-lg">=</span>
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg font-bold font-mono text-base">{Math.round(selectedZone.area_sqm / selectedZone.per_person_sqm).toLocaleString()} {isAr ? "مصلي" : "capacity"}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Daily note */}
              <div>
                <Label className="text-sm font-medium">{isAr ? "ملاحظة يومية" : "Daily Note"}</Label>
                <Textarea className="mt-1 text-sm" placeholder={isAr ? "أضف ملاحظة لهذا اليوم..." : "Add a note..."} value={selectedZone.daily_note || ""} onChange={(e) => setSelectedZone(p => ({ ...p, daily_note: e.target.value }))} rows={2} disabled={activeSession?.status === "completed"} data-testid="zone-daily-note" />
              </div>

              {/* Zone status - enhanced with 3 states */}
              {activeSession?.status === "draft" && (
                <div className="p-3 border rounded-lg space-y-2">
                  <Label className="text-sm font-medium">{isAr ? "حالة المنطقة" : "Zone Status"}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => { if (selectedZone.is_removed) { handleToggleRemove(selectedZone.id, true); setSelectedZone(p => ({ ...p, is_removed: false })); } }} className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-all ${!selectedZone.is_removed ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-slate-50"}`} data-testid="zone-status-active">
                      <CircleDot className="w-5 h-5 text-emerald-500" />
                      <span className="font-medium">{isAr ? "نشط" : "Active"}</span>
                    </button>
                    <button onClick={() => { if (!selectedZone.is_removed) { handleToggleRemove(selectedZone.id, false); setSelectedZone(p => ({ ...p, is_removed: true })); } }} className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-all ${selectedZone.is_removed ? "border-amber-500 bg-amber-50 ring-1 ring-amber-200" : "hover:bg-slate-50"}`} data-testid="zone-status-inactive">
                      <CircleOff className="w-5 h-5 text-amber-500" />
                      <span className="font-medium">{isAr ? "غير نشط" : "Inactive"}</span>
                    </button>
                    <button onClick={async () => {
                      try {
                        await axios.delete(`${API}/admin/map-sessions/${activeSession.id}/zones/${selectedZone.id}`, getAuthHeaders());
                        const res = await axios.get(`${API}/map-sessions/${activeSession.id}`);
                        setActiveSession(res.data);
                        setShowZoneDialog(false);
                        setSelectedZoneId(null);
                        toast.success(isAr ? "تم حذف المنطقة نهائياً" : "Zone permanently deleted");
                      } catch (e) { toast.error(isAr ? "تعذر الحذف" : "Delete failed"); }
                    }} className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-red-200 text-xs transition-all hover:bg-red-50 hover:border-red-400" data-testid="zone-status-delete">
                      <Trash2 className="w-5 h-5 text-red-500" />
                      <span className="font-medium text-red-600">{isAr ? "حذف نهائي" : "Delete"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {activeSession?.status === "draft" && selectedZone && (
              <Button onClick={() => {
                handleUpdateZone(selectedZone.id, {
                  name_ar: selectedZone.name_ar,
                  name_en: selectedZone.name_en,
                  zone_code: selectedZone.zone_code,
                  daily_note: selectedZone.daily_note,
                  area_sqm: selectedZone.area_sqm,
                  per_person_sqm: selectedZone.per_person_sqm,
                  max_capacity: selectedZone.max_capacity,
                });
                setShowZoneDialog(false);
              }} data-testid="save-zone-changes"><Save className="w-4 h-4 ml-1" />{isAr ? "حفظ" : "Save"}</Button>
            )}
            <Button variant="outline" onClick={() => setShowZoneDialog(false)}>{isAr ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Zone Dialog (for drawn zones) - matches Edit Zone dialog */}
      <Dialog open={showNewZoneDialog} onOpenChange={(open) => { setShowNewZoneDialog(open); if (!open) { setDrawingPoints([]); setMapMode("pan"); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />{isAr ? "إضافة منطقة جديدة" : "Add New Zone"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Shape confirmation */}
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: ZONE_TYPES.find(t => t.value === newZoneForm.zone_type)?.color || "#22c55e" }}>
                {ZONE_TYPES.find(t => t.value === newZoneForm.zone_type)?.icon || "?"}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-700">{newZoneForm.name_ar || (isAr ? "منطقة جديدة" : "New Zone")}</p>
                <p className="text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5 inline ml-1" />{isAr ? `تم رسم الشكل بـ ${drawingPoints.length} نقطة` : `Shape drawn with ${drawingPoints.length} points`}</p>
              </div>
            </div>

            {/* Name & Code */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">{isAr ? "اسم المنطقة" : "Zone Name"}</Label>
                <Input className="mt-1 text-sm" placeholder={isAr ? "مثال: مصلى رجال 5" : "e.g., Men Prayer 5"} value={newZoneForm.name_ar} onChange={(e) => setNewZoneForm(p => ({ ...p, name_ar: e.target.value }))} data-testid="new-zone-name" />
              </div>
              <div>
                <Label className="text-xs font-medium">{isAr ? "الترميز" : "Zone Code"}</Label>
                <Input className="mt-1 text-sm font-mono" placeholder={isAr ? "مثال: Z-001" : "e.g., Z-001"} value={newZoneForm.zone_code} onChange={(e) => setNewZoneForm(p => ({ ...p, zone_code: e.target.value }))} data-testid="new-zone-code" />
              </div>
            </div>

            {/* Category */}
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

            {/* Capacity Calculator */}
            <div className="space-y-3 p-3 border rounded-lg bg-blue-50/30" data-testid="new-zone-capacity-calculator">
              <h4 className="font-cairo font-semibold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                {isAr ? "حساب السعة" : "Capacity Calculator"}
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">{isAr ? "المساحة (م²)" : "Area (m²)"}</Label>
                  <Input type="number" min={0} className="mt-1 text-sm font-mono" value={newZoneForm.area_sqm} onChange={(e) => {
                    const area = parseFloat(e.target.value) || 0;
                    const pp = newZoneForm.per_person_sqm || 0.8;
                    const cap = pp > 0 && area > 0 ? Math.round(area / pp) : newZoneForm.max_capacity || 0;
                    setNewZoneForm(p => ({ ...p, area_sqm: area, max_capacity: cap }));
                  }} data-testid="new-zone-area" />
                </div>
                <div>
                  <Label className="text-xs">{isAr ? "نصيب الفرد (م²)" : "Per Person (m²)"}</Label>
                  <Input type="number" min={0.1} step={0.1} className="mt-1 text-sm font-mono" value={newZoneForm.per_person_sqm} onChange={(e) => {
                    const pp = parseFloat(e.target.value) || 0.8;
                    const area = newZoneForm.area_sqm || 0;
                    const cap = pp > 0 && area > 0 ? Math.round(area / pp) : newZoneForm.max_capacity || 0;
                    setNewZoneForm(p => ({ ...p, per_person_sqm: pp, max_capacity: cap }));
                  }} data-testid="new-zone-perperson" />
                </div>
                <div>
                  <Label className="text-xs">{isAr ? "السعة القصوى" : "Max Capacity"}</Label>
                  <Input type="number" min={0} className="mt-1 text-sm font-mono font-bold" value={newZoneForm.max_capacity} onChange={(e) => setNewZoneForm(p => ({ ...p, max_capacity: parseInt(e.target.value) || 0 }))} data-testid="new-zone-capacity" />
                </div>
              </div>
              {(newZoneForm.area_sqm > 0 && newZoneForm.per_person_sqm > 0) && (
                <div className="p-3 bg-white rounded-lg border border-blue-100 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg font-bold font-mono">{newZoneForm.area_sqm} {isAr ? "م²" : "m²"}</span>
                    <span className="text-slate-400 font-bold text-lg">&divide;</span>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-bold font-mono">{newZoneForm.per_person_sqm} {isAr ? "م²/فرد" : "m²/p"}</span>
                    <span className="text-slate-400 font-bold text-lg">=</span>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg font-bold font-mono text-base">{Math.round(newZoneForm.area_sqm / newZoneForm.per_person_sqm).toLocaleString()} {isAr ? "مصلي" : "cap"}</span>
                  </div>
                </div>
              )}
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
