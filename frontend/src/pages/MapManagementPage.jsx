import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Plus,
  Trash2,
  Save,
  X,
  Upload,
  Layers,
  MapPin,
  Edit2,
  RefreshCw,
  Eye,
  Settings,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  MousePointer,
  Check,
  Pencil,
  Hand,
  Move,
  Circle,
  Square,
  Triangle,
  Spline
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import { Progress } from "@/components/ui/progress";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ZONE_TYPES = [
  { value: "men_prayer", label_ar: "مصلى رجال", label_en: "Men Prayer Area", color: "#22c55e" },
  { value: "women_prayer", label_ar: "مصلى نساء", label_en: "Women Prayer Area", color: "#3b82f6" },
  { value: "mataf", label_ar: "صحن المطاف", label_en: "Mataf", color: "#84cc16" },
  { value: "masaa", label_ar: "المسعى", label_en: "Masa'a", color: "#06b6d4" },
  { value: "service", label_ar: "منطقة خدمات", label_en: "Service Area", color: "#6b7280" },
  { value: "entry", label_ar: "مدخل", label_en: "Entry", color: "#10b981" },
  { value: "exit", label_ar: "مخرج", label_en: "Exit", color: "#ef4444" },
  { value: "escalator", label_ar: "سلم كهربائي", label_en: "Escalator", color: "#8b5cf6" },
  { value: "kaaba", label_ar: "الكعبة المشرفة", label_en: "Kaaba", color: "#1a1a1a" },
  { value: "expansion", label_ar: "توسعة", label_en: "Expansion", color: "#64748b" },
];

const CROWD_PRESETS = [
  { label_ar: "طبيعي", label_en: "Normal", ratio: 0.4 },
  { label_ar: "متوسط", label_en: "Medium", ratio: 0.65 },
  { label_ar: "مزدحم", label_en: "Crowded", ratio: 0.85 },
];

const SNAP_DISTANCE = 1.2;

export default function MapManagementPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const mapContainerRef = useRef(null);
  const imageRef = useRef(null);
  const svgRef = useRef(null);

  // Data state
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("floors");

  // Floor dialog
  const [showFloorDialog, setShowFloorDialog] = useState(false);
  const [deleteFloorId, setDeleteFloorId] = useState(null);
  const [isDeletingFloor, setIsDeletingFloor] = useState(false);
  const [floorForm, setFloorForm] = useState({ name_ar: "", name_en: "", floor_number: 0, image_url: "", order: 0 });
  const [editingFloor, setEditingFloor] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localImagePreview, setLocalImagePreview] = useState(null);

  // Zone dialog
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [zoneForm, setZoneForm] = useState({
    zone_code: "", name_ar: "", name_en: "", zone_type: "men_prayer",
    fill_color: "#22c55e", stroke_color: "#000000", opacity: 0.4, max_capacity: 1000, area_sqm: 0
  });

  // Zone edit dialog
  const [showEditZoneDialog, setShowEditZoneDialog] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  // Drawing state
  const [mode, setMode] = useState("pan"); // pan, draw, edit
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [nearStart, setNearStart] = useState(false);
  const DRAW_POINT_RADIUS = 0.08;

  // Zoom/Pan
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const normalizeImageUrl = (url) => {
    if (!url) return url;
    let value = url;
    // Replace old preview domain URLs with current domain
    if (value.includes(".preview.emergentagent.com") && !value.startsWith(process.env.REACT_APP_BACKEND_URL)) {
      const pathMatch = value.match(/\/(?:api\/)?uploads\/.+$/);
      if (pathMatch) value = `${process.env.REACT_APP_BACKEND_URL}${pathMatch[0].startsWith("/api") ? pathMatch[0] : "/api" + pathMatch[0]}`;
    }
    if (value.startsWith("/")) {
      value = `${process.env.REACT_APP_BACKEND_URL}${value}`;
    } else if (value.startsWith("uploads/")) {
      value = `${process.env.REACT_APP_BACKEND_URL}/${value}`;
    }
    if (value.includes("/uploads/") && !value.includes("/api/uploads/")) {
      value = value.replace("/uploads/", "/api/uploads/");
    }
    return value;
  };

  // Fetch data
  const fetchFloors = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/floors`);
      const normalized = res.data.map(f => ({ ...f, image_url: normalizeImageUrl(f.image_url) }));
      setFloors(normalized);
      setSelectedFloor(prev => {
        if (prev) {
          const matched = normalized.find(f => f.id === prev.id);
          return matched || (normalized.length > 0 ? normalized[0] : null);
        }
        return normalized.length > 0 ? normalized[0] : null;
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchZones = useCallback(async () => {
    if (!selectedFloor) return;
    try {
      const res = await axios.get(`${API}/floors/${selectedFloor.id}/zones`);
      setZones(res.data);
    } catch (e) { console.error(e); }
  }, [selectedFloor]);

  useEffect(() => { fetchFloors(); }, [fetchFloors]);
  useEffect(() => { if (selectedFloor) fetchZones(); }, [selectedFloor, fetchZones]);

  useEffect(() => {
    setBulkUpdates([]);
    setCrowdEdits({});
  }, [selectedFloor?.id]);

  useEffect(() => {
    return () => {
      if (localImagePreview) {
        URL.revokeObjectURL(localImagePreview);
      }
    };
  }, [localImagePreview]);

  useEffect(() => {
    if (!zones.length) return;
    setCrowdEdits(prev => {
      const next = { ...prev };
      zones.forEach(z => {
        if (next[z.id] === undefined) {
          next[z.id] = z.current_crowd || 0;
        }
      });
      return next;
    });
  }, [zones]);

  // Convert mouse event to SVG coordinates (0-100)
  const getMousePercent = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const transformed = point.matrixTransform(ctm.inverse());
    return {
      x: Math.max(0, Math.min(100, transformed.x)),
      y: Math.max(0, Math.min(100, transformed.y))
    };
  };

  const getDistance = (p1, p2) => Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);

  const getHitPointIndex = (points, pos) => {
    if (!points?.length) return -1;
    const radius = 2 / Math.max(zoom, 0.5);
    return points.findIndex((p) => getDistance(pos, p) < radius);
  };

  const getCrowdStatus = (current, max) => {
    const ratio = max > 0 ? current / max : 0;
    if (ratio < 0.5) return { label_ar: "طبيعي", label_en: "Normal", color: "#22c55e" };
    if (ratio < 0.7) return { label_ar: "متوسط", label_en: "Medium", color: "#f59e0b" };
    if (ratio < 0.85) return { label_ar: "مزدحم", label_en: "Crowded", color: "#f97316" };
    return { label_ar: "حرج", label_en: "Critical", color: "#ef4444" };
  };

  // Mouse handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    
    const pos = getMousePercent(e);
    
    if (mode === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } 
    else if (mode === "edit" && selectedZoneId) {
      const zone = zones.find(z => z.id === selectedZoneId);
      if (!zone?.polygon_points) return;
      // Check vertex handles first
      const hitIndex = getHitPointIndex(zone.polygon_points, pos);
      if (hitIndex !== -1) {
        setDraggingPoint(hitIndex);
        setHoveredPoint(hitIndex);
        return;
      }
      // Check midpoint handles - clicking inserts a new vertex
      const pts = zone.polygon_points;
      const midRadius = 1.5 / Math.max(zoom, 0.5);
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        const mx = (pts[i].x + pts[j].x) / 2;
        const my = (pts[i].y + pts[j].y) / 2;
        if (getDistance(pos, { x: mx, y: my }) < midRadius) {
          const newPoints = [...pts];
          newPoints.splice(j, 0, { x: pos.x, y: pos.y });
          const newZones = zones.map(z => z.id === selectedZoneId ? { ...z, polygon_points: newPoints } : z);
          setZones(newZones);
          setDraggingPoint(j);
          setHoveredPoint(j);
          return;
        }
      }
    }
  };

  const handleMouseMove = (e) => {
    const pos = getMousePercent(e);
    setMousePos(pos);
    
    // Panning
    if (isPanning && mode === "pan") {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }
    
    // Dragging point
    if (draggingPoint !== null && selectedZoneId) {
      const newZones = zones.map(z => {
        if (z.id === selectedZoneId) {
          const newPoints = [...z.polygon_points];
          newPoints[draggingPoint] = { x: pos.x, y: pos.y };
          return { ...z, polygon_points: newPoints };
        }
        return z;
      });
      setZones(newZones);
      return;
    }

    // Hover highlight for edit handles
    if (mode === "edit" && selectedZoneId) {
      const zone = zones.find(z => z.id === selectedZoneId);
      const hitIndex = getHitPointIndex(zone?.polygon_points, pos);
      setHoveredPoint(hitIndex !== -1 ? hitIndex : null);
    } else if (hoveredPoint !== null) {
      setHoveredPoint(null);
    }
    
    // Check near start point when drawing
    if (mode === "draw" && drawingPoints.length >= 3) {
      setNearStart(getDistance(pos, drawingPoints[0]) < SNAP_DISTANCE);
    }
  };

  const handleMouseUp = async () => {
    // Save dragged point
    if (draggingPoint !== null && selectedZoneId) {
      const zone = zones.find(z => z.id === selectedZoneId);
      if (zone) {
        try {
          await axios.put(`${API}/admin/zones/${selectedZoneId}`, 
            { polygon_points: zone.polygon_points }, getAuthHeaders());
          toast({ title: language === "ar" ? "تم الحفظ" : "Saved" });
        } catch (e) { fetchZones(); }
      }
    }
    
    setIsPanning(false);
    setDraggingPoint(null);
    setHoveredPoint(null);
  };

  const handleMapClick = (e) => {
    if (isPanning || draggingPoint !== null) return;
    e.preventDefault();
    
    const pos = getMousePercent(e);
    
    if (mode === "draw") {
      // Close polygon if near start
      if (drawingPoints.length >= 3 && nearStart) {
        setShowZoneDialog(true);
        return;
      }
      // Add point
      setDrawingPoints(prev => [...prev, { x: pos.x, y: pos.y }]);
    }
    else if (mode === "edit") {
      if (e.target?.closest && e.target.closest("[data-zone-id]")) return;
      let found = null;
      for (const zone of zones) {
        if (isPointInPolygon(pos, zone.polygon_points)) {
          found = zone;
          break;
        }
      }
      setSelectedZoneId(found?.id || null);
    }
  };

  const isPointInPolygon = (point, polygon) => {
    if (!polygon || polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Shape generators
  const generateShape = (type) => {
    const cx = 50, cy = 50;
    let points;
    if (type === "circle") {
      const r = 15;
      points = Array.from({ length: 36 }, (_, i) => {
        const a = (2 * Math.PI * i) / 36;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      });
    } else if (type === "rectangle") {
      points = [
        { x: cx - 20, y: cy - 15 }, { x: cx + 20, y: cy - 15 },
        { x: cx + 20, y: cy + 15 }, { x: cx - 20, y: cy + 15 }
      ];
    } else if (type === "triangle") {
      const r = 18;
      points = Array.from({ length: 3 }, (_, i) => {
        const a = (2 * Math.PI * i) / 3 - Math.PI / 2;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      });
    }
    if (points) {
      setDrawingPoints(points);
      setShowZoneDialog(true);
    }
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const container = mapContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    // Google Maps style: multiplicative zoom
    const factor = e.deltaY > 0 ? 0.85 : 1.18;
    const prevZoom = zoomRef.current;
    const newZoom = Math.max(0.5, Math.min(6, prevZoom * factor));
    if (newZoom === prevZoom) return;
    const scale = newZoom / prevZoom;
    zoomRef.current = newZoom;
    setZoom(newZoom);
    setPanOffset(prev => ({
      x: mouseX - scale * (mouseX - prev.x),
      y: mouseY - scale * (mouseY - prev.y)
    }));
  }, []);

  // Attach wheel listener - re-run when selectedFloor changes (container mounts/unmounts)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel, selectedFloor, activeTab]);

  // Escape key resets drawing / deselects zone
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (drawingPoints.length > 0) {
          setDrawingPoints([]);
          setNearStart(false);
        } else if (selectedZoneId) {
          setSelectedZoneId(null);
        } else if (mode !== "pan") {
          setMode("pan");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawingPoints.length, selectedZoneId, mode]);

  // Keep zoomRef in sync
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Save new zone
  const handleSaveZone = async () => {
    if (!selectedFloor || drawingPoints.length < 3) return;
    try {
      await axios.post(`${API}/admin/zones`, {
        ...zoneForm,
        floor_id: selectedFloor.id,
        polygon_points: drawingPoints
      }, getAuthHeaders());
      
      toast({ title: language === "ar" ? "تم الحفظ" : "Saved" });
      setShowZoneDialog(false);
      setDrawingPoints([]);
      setZoneForm({ zone_code: "", name_ar: "", name_en: "", zone_type: "men_prayer", fill_color: "#22c55e", stroke_color: "#000000", opacity: 0.4, max_capacity: 1000, area_sqm: 0 });
      setMode("pan");
      fetchZones();
    } catch (e) {
      toast({ title: "Error", description: e.response?.data?.detail, variant: "destructive" });
    }
  };

  // Open zone edit dialog
  const openEditZone = (zone) => {
    setEditingZone({ ...zone });
    setShowEditZoneDialog(true);
  };

  // Save zone edits
  const handleSaveEditZone = async () => {
    if (!editingZone) return;
    try {
      const { id, ...data } = editingZone;
      await axios.put(`${API}/admin/zones/${id}`, {
        zone_code: data.zone_code, name_ar: data.name_ar, name_en: data.name_en,
        zone_type: data.zone_type, fill_color: data.fill_color, stroke_color: data.stroke_color,
        opacity: data.opacity, max_capacity: data.max_capacity, area_sqm: data.area_sqm
      }, getAuthHeaders());
      toast({ title: language === "ar" ? "تم الحفظ" : "Saved" });
      setShowEditZoneDialog(false);
      setEditingZone(null);
      fetchZones();
    } catch (e) {
      toast({ title: "Error", description: e.response?.data?.detail, variant: "destructive" });
    }
  };

  const deleteZoneById = async (zoneId) => {
    toast({ title: language === "ar" ? "جارٍ الحذف..." : "Deleting..." });
    try {
      await axios.delete(`${API}/admin/zones/${zoneId}`, getAuthHeaders());
      setZones(prev => prev.filter(z => z.id !== zoneId));
      if (selectedZoneId === zoneId) {
        setSelectedZoneId(null);
        setMode("pan");
      }
      fetchZones();
      toast({ title: language === "ar" ? "تم الحذف" : "Deleted" });
    } catch (e) { 
      toast({ title: language === "ar" ? "تعذر الحذف" : "Error", description: e.response?.data?.detail || e.message, variant: "destructive" });
    }
  };

  // Delete zone
  const handleDeleteZone = async () => {
    if (!selectedZoneId) {
      toast({ title: language === "ar" ? "اختر منطقة أولاً" : "Select a zone first", variant: "destructive" });
      return;
    }
    await deleteZoneById(selectedZoneId);
  };

  // Upload image
  const uploadImageFile = async (file) => {
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) {
      toast({ title: language === "ar" ? "نوع ملف غير مدعوم" : "Unsupported file", variant: "destructive" });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    if (localImagePreview) URL.revokeObjectURL(localImagePreview);
    setLocalImagePreview(previewUrl);
    setUploadingImage(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/admin/upload/map-image`, formData, {
        ...getAuthHeaders(),
        headers: { ...getAuthHeaders().headers, "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total))
      });
      setFloorForm(prev => ({ ...prev, image_url: res.data.url }));
      setLocalImagePreview(null);
      toast({ title: language === "ar" ? "تم الرفع" : "Uploaded" });
    } catch (e) {
      toast({ title: language === "ar" ? "تعذر الرفع" : "Error", variant: "destructive" });
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
    e.target.value = "";
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Floor CRUD
  const handleSaveFloor = async () => {
    try {
      if (editingFloor) {
        const res = await axios.put(`${API}/admin/floors/${editingFloor.id}`, floorForm, getAuthHeaders());
        const updated = { ...res.data, image_url: normalizeImageUrl(res.data.image_url) };
        setFloors(prev => prev.map(f => f.id === editingFloor.id ? updated : f));
        setSelectedFloor(prev => prev?.id === editingFloor.id ? updated : prev);
      } else {
        const res = await axios.post(`${API}/admin/floors`, floorForm, getAuthHeaders());
        const created = { ...res.data, image_url: normalizeImageUrl(res.data.image_url) };
        setFloors(prev => [created, ...prev]);
        setSelectedFloor(created);
      }
      setShowFloorDialog(false);
      setFloorForm({ name_ar: "", name_en: "", floor_number: 0, image_url: "", order: 0 });
      setEditingFloor(null);
      fetchFloors();
      toast({ title: language === "ar" ? "تم الحفظ" : "Saved" });
    } catch (e) { toast({ title: language === "ar" ? "تعذر الحفظ" : "Error", variant: "destructive" }); }
  };

  const handleDeleteFloor = async (id) => {
    const floorId = id || deleteFloorId;
    if (!floorId) return;
    setIsDeletingFloor(true);
    try {
      await axios.delete(`${API}/admin/floors/${floorId}`, getAuthHeaders());
      setFloors(prev => prev.filter(f => f.id !== floorId));
      if (selectedFloor?.id === floorId) setSelectedFloor(null);
      fetchFloors();
      toast({ title: language === "ar" ? "تم الحذف" : "Deleted" });
    } catch (e) { toast({ title: language === "ar" ? "تعذر الحذف" : "Error", variant: "destructive" }); }
    finally {
      setIsDeletingFloor(false);
      setDeleteFloorId(null);
    }
  };

  const requestDeleteFloor = (id) => {
    setDeleteFloorId(id);
  };

  // Bulk crowd update
  const [bulkUpdates, setBulkUpdates] = useState([]);
  const [crowdEdits, setCrowdEdits] = useState({});
  const handleCrowdChange = (zoneId, value) => {
    setCrowdEdits(prev => ({ ...prev, [zoneId]: value }));
    setBulkUpdates(prev => {
      const exists = prev.find(u => u.zone_id === zoneId);
      if (exists) {
        return prev.map(u => u.zone_id === zoneId ? { ...u, current_crowd: value } : u);
      }
      return [...prev, { zone_id: zoneId, current_crowd: value }];
    });
  };
  const handleBulkUpdate = async () => {
    for (const u of bulkUpdates) {
      await axios.put(`${API}/admin/zones/${u.zone_id}`, { current_crowd: u.current_crowd }, getAuthHeaders());
    }
    setBulkUpdates([]);
    fetchZones();
    toast({ title: language === "ar" ? "تم التحديث" : "Updated" });
  };

  // Get SVG path from points
  const getPath = (points, close = true) => {
    if (!points || points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    if (close && points.length > 2) d += " Z";
    return d;
  };

  const floorPreviewUrl = localImagePreview || (floorForm.image_url ? normalizeImageUrl(floorForm.image_url) : "");

  const totalCrowd = zones.reduce((sum, z) => sum + (crowdEdits[z.id] ?? z.current_crowd ?? 0), 0);
  const totalCapacity = zones.reduce((sum, z) => sum + (z.max_capacity || 0), 0);
  const overallPercent = totalCapacity ? Math.round((totalCrowd / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6" data-testid="map-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-cairo font-bold text-2xl">{language === "ar" ? "إدارة الخرائط التفاعلية" : "Interactive Map Management"}</h1>
        </div>
        <Button variant="outline" onClick={fetchFloors} data-testid="refresh-floors-button"><RefreshCw className="w-4 h-4 ml-2" />{language === "ar" ? "تحديث" : "Refresh"}</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="floors" data-testid="floors-tab"><Layers className="w-4 h-4 ml-2" />{language === "ar" ? "الطوابق" : "Floors"}</TabsTrigger>
          <TabsTrigger value="zones" data-testid="zones-tab"><MapPin className="w-4 h-4 ml-2" />{language === "ar" ? "المناطق" : "Zones"}</TabsTrigger>
          <TabsTrigger value="crowd" data-testid="crowd-tab"><Settings className="w-4 h-4 ml-2" />{language === "ar" ? "تحديث الكثافة" : "Crowd"}</TabsTrigger>
        </TabsList>

        {/* Floors Tab */}
        <TabsContent value="floors" className="space-y-4">
          <div className="flex justify-between">
            <h2 className="font-cairo font-semibold">{language === "ar" ? "قائمة الطوابق" : "Floors"}</h2>
            <Button data-testid="add-floor-button" onClick={() => { setEditingFloor(null); setFloorForm({ name_ar: "", name_en: "", floor_number: 0, image_url: "", order: 0 }); setShowFloorDialog(true); }}>
              <Plus className="w-4 h-4 ml-2" />{language === "ar" ? "إضافة" : "Add"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {floors.map(floor => (
              <Card key={floor.id} className={selectedFloor?.id === floor.id ? "border-primary" : ""} data-testid={`floor-card-${floor.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base" data-testid={`floor-name-${floor.id}`}>{language === "ar" ? floor.name_ar : floor.name_en}</CardTitle>
                </CardHeader>
                <CardContent>
                  {floor.image_url && <img src={normalizeImageUrl(floor.image_url)} alt="" className="w-full h-24 object-cover rounded mb-2" data-testid={`floor-image-${floor.id}`} />}
                  <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedFloor(floor); setActiveTab("zones"); }} data-testid={`floor-view-${floor.id}`}><Eye className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => { setEditingFloor(floor); setFloorForm({ ...floor, image_url: normalizeImageUrl(floor.image_url) }); setShowFloorDialog(true); }} data-testid={`floor-edit-${floor.id}`}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => requestDeleteFloor(floor.id)} data-testid={`floor-delete-${floor.id}`}><Trash2 className="w-4 h-4 text-red-500" /></Button> 
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Zones Tab */}
        <TabsContent value="zones" className="space-y-4">
          {/* Toolbar */}
          <div className="flex justify-between items-center flex-wrap gap-3 bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-3">
                <Select value={selectedFloor?.id || ""} onValueChange={(v) => { setSelectedFloor(floors.find(f => f.id === v)); setDrawingPoints([]); setMode("pan"); }}>
                <SelectTrigger className="w-40" data-testid="zones-floor-select"><SelectValue placeholder={language === "ar" ? "اختر الطابق" : "Select"} /></SelectTrigger>
                <SelectContent>
                  {floors.map(f => <SelectItem key={f.id} value={f.id} data-testid={`zones-floor-option-${f.id}`}>{language === "ar" ? f.name_ar : f.name_en}</SelectItem>)}
                </SelectContent>
              </Select> 
              <Badge variant="secondary">{zones.length} {language === "ar" ? "منطقة" : "zones"}</Badge>
            </div>

            {/* Mode buttons */}
            <div className="flex items-center gap-2">
              <div className="flex border rounded-lg overflow-hidden">
                <Button variant={mode === "pan" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => { setMode("pan"); setDrawingPoints([]); setSelectedZoneId(null); }} data-testid="mode-pan-button">
                  <Hand className="w-4 h-4" />
                </Button>
                   <Button variant={mode === "draw" ? "default" : "ghost"} size="sm" className="rounded-none border-x" onClick={() => { setMode("draw"); setDrawingPoints([]); setSelectedZoneId(null); }} disabled={!selectedFloor} data-testid="mode-draw-button">
                  <Pencil className="w-4 h-4" />
                </Button> 
                <Button variant={mode === "edit" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => { setMode("edit"); setDrawingPoints([]); }} data-testid="mode-edit-button">
                  <MousePointer className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1 border rounded-lg p-1 bg-white">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                  const container = mapContainerRef.current;
                  if (!container) return;
                  const rect = container.getBoundingClientRect();
                  const cx = rect.width / 2, cy = rect.height / 2;
                  const prev = zoomRef.current;
                  const nz = Math.max(0.5, prev * 0.8);
                  const s = nz / prev;
                  zoomRef.current = nz;
                  setZoom(nz);
                  setPanOffset(p => ({ x: cx - s * (cx - p.x), y: cy - s * (cy - p.y) }));
                }} data-testid="zoom-out-button"><ZoomOut className="w-4 h-4" /></Button>
                <span className="text-xs w-12 text-center" data-testid="zoom-percent-label">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                  const container = mapContainerRef.current;
                  if (!container) return;
                  const rect = container.getBoundingClientRect();
                  const cx = rect.width / 2, cy = rect.height / 2;
                  const prev = zoomRef.current;
                  const nz = Math.min(6, prev * 1.25);
                  const s = nz / prev;
                  zoomRef.current = nz;
                  setZoom(nz);
                  setPanOffset(p => ({ x: cx - s * (cx - p.x), y: cy - s * (cy - p.y) }));
                }} data-testid="zoom-in-button"><ZoomIn className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { zoomRef.current = 1; setZoom(1); setPanOffset({ x: 0, y: 0 }); }} data-testid="zoom-reset-button"><Maximize2 className="w-4 h-4" /></Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {mode === "draw" && (
                <>
                  {drawingPoints.length === 0 && (
                    <div className="flex border rounded-lg overflow-hidden">
                      <Button variant="ghost" size="sm" className="rounded-none" onClick={() => generateShape("circle")} title={language === "ar" ? "دائرة" : "Circle"} data-testid="shape-circle-button">
                        <Circle className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-none border-x" onClick={() => generateShape("rectangle")} title={language === "ar" ? "مربع" : "Rectangle"} data-testid="shape-rect-button">
                        <Square className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-none" onClick={() => generateShape("triangle")} title={language === "ar" ? "مثلث" : "Triangle"} data-testid="shape-triangle-button">
                        <Triangle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  {drawingPoints.length > 0 && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setDrawingPoints(p => p.slice(0, -1))} data-testid="drawing-undo-button"><Undo2 className="w-4 h-4 ml-1" />{language === "ar" ? "تراجع" : "Undo"}</Button>
                      <Button variant="outline" size="sm" onClick={() => setDrawingPoints([])} data-testid="drawing-clear-button"><X className="w-4 h-4 ml-1" />{language === "ar" ? "مسح" : "Clear"}</Button>
                      {drawingPoints.length >= 3 && <Button size="sm" onClick={() => setShowZoneDialog(true)} data-testid="drawing-save-button"><Check className="w-4 h-4 ml-1" />{language === "ar" ? "حفظ" : "Save"}</Button>}
                    </>
                  )}
                </>
              )}
              {mode === "edit" && selectedZoneId && (
                <Button variant="destructive" size="sm" onClick={handleDeleteZone} data-testid="zone-delete-button">
                  <Trash2 className="w-4 h-4 ml-1" />{language === "ar" ? "حذف" : "Delete"}
                </Button>
              )}
            </div>
          </div>

          {/* Instructions */}
          {mode === "draw" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <Pencil className="w-4 h-4 inline ml-1" />
                {language === "ar" 
                  ? `انقر على الخريطة لإضافة نقاط. عند الانتهاء انقر على النقطة الأولى. (${drawingPoints.length} نقطة)`
                  : `Click on map to add points. Click first point to close. (${drawingPoints.length} points)`}
              </p>
            </div>
          )}
          {mode === "edit" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                <MousePointer className="w-4 h-4 inline ml-1" />
                {language === "ar" ? "انقر على منطقة لتحديدها، اسحب النقاط لتعديلها، أو اسحب نقاط الوسط (◇) لإضافة تفاصيل ومنحنيات" : "Click a zone to select, drag points to edit, or drag midpoints (◇) to add detail and curves"}
              </p>
            </div>
          )}

          {/* Map */}
          {selectedFloor ? (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div
                  ref={mapContainerRef}
                  data-testid="map-editor-container"
                  className="relative bg-gray-100 overflow-hidden"
                  style={{ 
                    height: "600px",
                    cursor: mode === "draw" ? "crosshair" : mode === "edit" ? "default" : (isPanning ? "grabbing" : "grab")
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onClick={handleMapClick}
                >
                  {/* Transformed container */}
                  <div
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                      transformOrigin: "0 0",
                      width: "100%",
                      height: "100%",
                      position: "relative"
                    }}
                  >
                    {/* Background image */}
                    <img
                      ref={imageRef}
                      src={selectedFloor.image_url}
                      alt=""
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />

                    {/* SVG overlay */}
                    <svg
                      ref={svgRef}
                      data-testid="map-editor-svg"
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      style={{ overflow: "visible" }}
                    >
                      {/* Existing zones */}
                      {zones.map(zone => {
                        const isSelected = zone.id === selectedZoneId;
                        return (
                          <g key={zone.id} data-testid={`zone-shape-${zone.id}`}>
                            <path
                              data-zone-id={zone.id}
                              d={getPath(zone.polygon_points)}
                              fill={zone.fill_color}
                              fillOpacity={zone.opacity}
                              stroke={isSelected ? "#3b82f6" : zone.stroke_color}
                              strokeWidth={isSelected ? 0.6 : 0.3}
                              strokeOpacity={isSelected ? 1 : (zone.stroke_opacity ?? 1)}
                              strokeDasharray={isSelected ? "1 0.5" : "none"}
                              vectorEffect="non-scaling-stroke"
                              style={{ cursor: "pointer" }}
                              onClick={(e) => {
                                if (mode === "edit") {
                                  e.stopPropagation();
                                  setSelectedZoneId(zone.id);
                                }
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setMode("edit");
                                setDrawingPoints([]);
                                setSelectedZoneId(zone.id);
                              }}
                            />
                            {isSelected && mode === "edit" && (
                              <path
                                d={getPath(zone.polygon_points)}
                                fill="none"
                                stroke="#0ea5e9"
                                strokeWidth="0.6"
                                strokeDasharray="1.5 1"
                                vectorEffect="non-scaling-stroke"
                              />
                            )}
                            {zone.polygon_points?.length > 0 && (
                              <text
                                x={zone.polygon_points.reduce((s, p) => s + p.x, 0) / zone.polygon_points.length}
                                y={zone.polygon_points.reduce((s, p) => s + p.y, 0) / zone.polygon_points.length}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="2"
                                fill="#000"
                                fontWeight="bold"
                                data-testid={`zone-label-${zone.id}`}
                                pointerEvents="none"
                              >
                                {zone.zone_code}
                              </text>
                            )}
                            {isSelected && mode === "edit" && zone.polygon_points?.map((pt, i) => {
                              const isActive = i === draggingPoint || i === hoveredPoint;
                              return (
                                <circle key={`v-${i}`} data-testid={`zone-handle-${zone.id}-${i}`} pointerEvents="none"
                                  cx={pt.x} cy={pt.y} r={isActive ? "0.18" : "0.1"}
                                  fill="#ef4444" stroke="white" strokeWidth="0.04" vectorEffect="non-scaling-stroke" />
                              );
                            })}
                            {/* Midpoint handles for subdivision / curve creation */}
                            {isSelected && mode === "edit" && zone.polygon_points?.map((pt, i) => {
                              const j = (i + 1) % zone.polygon_points.length;
                              const nx = zone.polygon_points[j];
                              const mx = (pt.x + nx.x) / 2;
                              const my = (pt.y + nx.y) / 2;
                              return (
                                <rect key={`m-${i}`} x={mx - 0.07} y={my - 0.07} width="0.14" height="0.14"
                                  transform={`rotate(45 ${mx} ${my})`}
                                  fill="#ef4444" stroke="white" strokeWidth="0.03"
                                  vectorEffect="non-scaling-stroke" opacity="0.4" pointerEvents="none"
                                  data-testid={`zone-midpoint-${zone.id}-${i}`}
                                />
                              );
                            })}
                          </g>
                        );
                      })}

                      {/* Drawing polygon */}
                      {mode === "draw" && drawingPoints.length > 0 && (
                        <g data-testid="drawing-layer">
                          {/* Lines between points */}
                          <path
                            d={getPath(drawingPoints, false)}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="0.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            data-testid="drawing-polyline"
                          />
                          
                          {/* Preview line to mouse */}
                          <line
                            x1={drawingPoints[drawingPoints.length - 1].x}
                            y1={drawingPoints[drawingPoints.length - 1].y}
                            x2={mousePos.x}
                            y2={mousePos.y}
                            stroke="#3b82f6"
                            strokeWidth="0.4"
                            strokeDasharray="1 0.5"
                            vectorEffect="non-scaling-stroke"
                            data-testid="drawing-preview-line"
                          />
                          
                          {/* Close preview when near start */}
                          {nearStart && drawingPoints.length >= 3 && (
                            <path
                              d={getPath(drawingPoints)}
                              fill={zoneForm.fill_color}
                              fillOpacity={0.3}
                              stroke="#22c55e"
                              strokeWidth="0.6"
                              vectorEffect="non-scaling-stroke"
                            />
                          )}
                          
                          {/* Points */}
                          {drawingPoints.map((pt, i) => {
                            const isStart = i === 0;
                            const radius = isStart ? (nearStart ? 0.3 : 0.15) : DRAW_POINT_RADIUS;
                            return (
                              <circle
                                key={i}
                                cx={pt.x}
                                cy={pt.y}
                                r={radius}
                                fill={isStart ? (nearStart ? "#22c55e" : "#ef4444") : "#3b82f6"}
                                fillOpacity={isStart ? 0.8 : 0.25}
                                stroke="white"
                                strokeWidth="0.08"
                                vectorEffect="non-scaling-stroke"
                                data-testid={`drawing-point-${i}`}
                              />
                            );
                          })}
                        </g>
                      )}
                    </svg>
                  </div>

                  {/* Info bar */}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono" data-testid="map-editor-coordinates">
                    X: {mousePos.x.toFixed(1)}% | Y: {mousePos.y.toFixed(1)}%
                    {nearStart && <span className="text-green-400 mr-2"> • {language === "ar" ? "انقر للإغلاق" : "Click to close"}</span>}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs" data-testid="map-editor-zoom">
                    {Math.round(zoom * 100)}%
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{language === "ar" ? "اختر طابقاً" : "Select a floor"}</CardContent></Card>
          )}

          {/* Zone list */}
          {zones.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
              {zones.map(zone => {
                const typeInfo = ZONE_TYPES.find(t => t.value === zone.zone_type);
                return (
                  <div
                    key={zone.id}
                    data-testid={`zone-list-item-${zone.id}`}
                    className={`relative p-3 border rounded-lg cursor-pointer transition-all ${selectedZoneId === zone.id ? "border-blue-500 bg-blue-50 shadow-sm" : "hover:bg-gray-50 hover:border-gray-300"}`}
                    onClick={() => openEditZone(zone)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 left-1 h-5 w-5 text-red-400 hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); deleteZoneById(zone.id); }}
                      data-testid={`zone-list-delete-${zone.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: zone.fill_color, borderColor: zone.stroke_color }} />
                      <span className="text-sm font-bold">{zone.zone_code}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{language === "ar" ? zone.name_ar : zone.name_en}</p>
                    {typeInfo && <p className="text-[10px] text-muted-foreground mt-0.5">{language === "ar" ? typeInfo.label_ar : typeInfo.label_en}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Crowd Tab */}
        <TabsContent value="crowd" className="space-y-6" data-testid="crowd-tab-content">
          <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6">
            <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-amber-200/50 blur-3xl" />
            <div className="absolute -bottom-20 -right-16 h-52 w-52 rounded-full bg-emerald-200/40 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-cairo text-2xl font-bold text-slate-900">
                  {language === "ar" ? "لوحة التحكم بالكثافة" : "Crowd Control Center"}
                </h3>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "تحكم مباشر في كثافة المناطق مع مؤشرات واضحة للحالة." 
                    : "Fine-tune zone density with clear status signals."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={selectedFloor?.id || ""} onValueChange={(v) => setSelectedFloor(floors.find(f => f.id === v))}>
                  <SelectTrigger className="w-52" data-testid="crowd-floor-select">
                    <SelectValue placeholder={language === "ar" ? "اختر الطابق" : "Select floor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {floors.map(f => (
                      <SelectItem key={f.id} value={f.id} data-testid={`crowd-floor-option-${f.id}`}>
                        {language === "ar" ? f.name_ar : f.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleBulkUpdate} disabled={bulkUpdates.length === 0} data-testid="crowd-save-button">
                  <Save className="w-4 h-4 ml-2" />{language === "ar" ? "حفظ التغييرات" : "Save changes"}
                </Button>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-white/70 p-4 shadow-sm">
                <p className="text-xs text-slate-500">{language === "ar" ? "إجمالي المناطق" : "Total zones"}</p>
                <p className="text-2xl font-bold text-slate-900" data-testid="crowd-total-zones">{zones.length}</p>
              </div>
              <div className="rounded-xl border bg-white/70 p-4 shadow-sm">
                <p className="text-xs text-slate-500">{language === "ar" ? "إجمالي الحشود" : "Total crowd"}</p>
                <p className="text-2xl font-bold text-slate-900" data-testid="crowd-total-current">{totalCrowd.toLocaleString("ar-SA")}</p>
              </div>
              <div className="rounded-xl border bg-white/70 p-4 shadow-sm">
                <p className="text-xs text-slate-500">{language === "ar" ? "معدل الإشغال العام" : "Overall occupancy"}</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold text-slate-900" data-testid="crowd-overall-percent">{overallPercent}%</p>
                  <span className="text-xs text-slate-500">/ 100%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.min(overallPercent, 100)}%`,
                      background: "linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)"
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {selectedFloor && zones.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {zones.map(zone => {
                const currentValue = crowdEdits[zone.id] ?? zone.current_crowd ?? 0;
                const maxCap = zone.max_capacity || 0;
                const safeValue = Math.max(0, Math.min(currentValue, maxCap || currentValue));
                const percent = maxCap ? Math.min(100, Math.round((safeValue / maxCap) * 100)) : 0;
                const status = getCrowdStatus(safeValue, maxCap);
                const step = Math.max(10, Math.round((maxCap || 1000) * 0.01));

                return (
                  <div key={zone.id} className="relative overflow-hidden rounded-2xl border bg-white/90 p-4 shadow-sm" data-testid={`crowd-zone-card-${zone.id}`}>
                    <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: status.color }} />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500">{language === "ar" ? zone.name_ar : zone.name_en}</p>
                        <p className="text-lg font-bold text-slate-900" data-testid={`crowd-zone-code-${zone.id}`}>{zone.zone_code}</p>
                      </div>
                      <Badge
                        className="border"
                        style={{ backgroundColor: `${status.color}1A`, color: status.color, borderColor: `${status.color}40` }}
                        data-testid={`crowd-status-${zone.id}`}
                      >
                        {language === "ar" ? status.label_ar : status.label_en}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-3xl font-semibold text-slate-900" data-testid={`crowd-current-${zone.id}`}>{safeValue}</span>
                      <span className="text-xs text-slate-500">/ {maxCap.toLocaleString("ar-SA")}</span>
                      <span className="text-xs text-slate-500">({percent}%)</span>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCrowdChange(zone.id, Math.max(0, safeValue - step))}
                          data-testid={`crowd-decrement-${zone.id}`}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          dir="ltr"
                          value={safeValue}
                          min={0}
                          max={maxCap || 100000}
                          onChange={(e) => {
                            const val = Math.min(maxCap || 100000, Math.max(0, parseInt(e.target.value) || 0));
                            handleCrowdChange(zone.id, val);
                          }}
                          data-testid={`crowd-input-${zone.id}`}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCrowdChange(zone.id, Math.min(maxCap || safeValue + step, safeValue + step))}
                          data-testid={`crowd-increment-${zone.id}`}
                        >
                          +
                        </Button>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={maxCap || 100000}
                        value={safeValue}
                        onChange={(e) => handleCrowdChange(zone.id, parseInt(e.target.value))}
                        className="w-full accent-emerald-600"
                        data-testid={`crowd-range-${zone.id}`}
                      />
                      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full" style={{ width: `${percent}%`, backgroundColor: status.color }} />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {CROWD_PRESETS.map((preset) => (
                        <Button
                          key={preset.label_en}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleCrowdChange(zone.id, Math.round((maxCap || 0) * preset.ratio))}
                          data-testid={`crowd-preset-${preset.label_en.toLowerCase()}-${zone.id}`}
                        >
                          {language === "ar" ? preset.label_ar : preset.label_en}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground" data-testid="crowd-empty-state">
                {language === "ar" ? "اختر طابقاً لعرض المناطق" : "Select a floor to view zones"}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Floor Dialog */}
      <Dialog open={showFloorDialog} onOpenChange={setShowFloorDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingFloor ? (language === "ar" ? "تعديل" : "Edit") : (language === "ar" ? "إضافة" : "Add")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{language === "ar" ? "الاسم بالعربية" : "Arabic"}</Label><Input value={floorForm.name_ar} onChange={e => setFloorForm(p => ({ ...p, name_ar: e.target.value }))} data-testid="floor-name-ar-input" /></div>
              <div><Label>{language === "ar" ? "الاسم بالإنجليزية" : "English"}</Label><Input value={floorForm.name_en} onChange={e => setFloorForm(p => ({ ...p, name_en: e.target.value }))} data-testid="floor-name-en-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{language === "ar" ? "رقم الطابق" : "Floor #"}</Label><Input type="number" value={floorForm.floor_number} onChange={e => setFloorForm(p => ({ ...p, floor_number: parseInt(e.target.value) || 0 }))} data-testid="floor-number-input" /></div>
              <div><Label>{language === "ar" ? "الترتيب" : "Order"}</Label><Input type="number" value={floorForm.order} onChange={e => setFloorForm(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} data-testid="floor-order-input" /></div>
            </div>
            <div>
              <Label>{language === "ar" ? "الصورة" : "Image"}</Label>
              <label
                className={`mt-2 block rounded-lg border-2 border-dashed p-4 text-center transition ${isDragOver ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                data-testid="floor-image-dropzone"
              >
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" data-testid="floor-image-file-input" />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-slate-500" />
                  <p className="text-sm text-slate-600">
                    {language === "ar" ? "اسحب الصورة هنا أو" : "Drag & drop here or"}
                  </p>
                  <Button type="button" variant="outline" className="w-full" disabled={uploadingImage} data-testid="floor-image-browse-button">
                    {uploadingImage ? `${uploadProgress}%` : (language === "ar" ? "اختر صورة" : "Browse image")}
                  </Button>
                  <p className={`text-xs ${isDragOver ? "text-emerald-600" : "text-slate-400"}`} data-testid="floor-image-dropzone-hint">
                    {isDragOver ? (language === "ar" ? "أفلت الصورة للرفع" : "Drop to upload") : (language === "ar" ? "يدعم جميع امتدادات الصور" : "All image extensions supported")}
                  </p>
                </div>
              </label>
              {uploadingImage && <Progress value={uploadProgress} className="h-2 mt-2" data-testid="floor-upload-progress" />}
              <Input value={floorForm.image_url} onChange={e => setFloorForm(p => ({ ...p, image_url: e.target.value }))} placeholder="URL" className="mt-2" dir="ltr" data-testid="floor-image-url-input" />
              {floorPreviewUrl && <img src={floorPreviewUrl} alt="" className="w-full h-24 object-contain rounded border mt-2" data-testid="floor-image-preview" />}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFloorDialog(false)} data-testid="floor-dialog-cancel-button">{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveFloor} disabled={!floorForm.name_ar || !floorForm.image_url} data-testid="floor-dialog-save-button"><Save className="w-4 h-4 ml-2" />{language === "ar" ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Floor Dialog */}
      <Dialog open={!!deleteFloorId} onOpenChange={(open) => { if (!open) setDeleteFloorId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "تأكيد حذف الطابق" : "Confirm floor deletion"}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground" data-testid="delete-floor-dialog-text">
            {language === "ar" ? `هل تريد حذف الطابق ${floors.find(f => f.id === deleteFloorId)?.name_ar || ""}؟ سيتم حذف المناطق التابعة له.` : "Delete this floor and all its zones?"}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFloorId(null)} data-testid="delete-floor-cancel-button">{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button variant="destructive" onClick={() => handleDeleteFloor(deleteFloorId)} disabled={isDeletingFloor} data-testid="delete-floor-confirm-button">
              {isDeletingFloor ? (language === "ar" ? "جاري الحذف" : "Deleting") : (language === "ar" ? "حذف" : "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{language === "ar" ? "حفظ المنطقة" : "Save Zone"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{language === "ar" ? "الكود" : "Code"}</Label><Input value={zoneForm.zone_code} onChange={e => setZoneForm(p => ({ ...p, zone_code: e.target.value }))} data-testid="zone-code-input" /></div>
              <div>
                <Label>{language === "ar" ? "النوع" : "Type"}</Label>
                      <Select value={zoneForm.zone_type} onValueChange={v => { const t = ZONE_TYPES.find(x => x.value === v); setZoneForm(p => ({ ...p, zone_type: v, fill_color: t?.color || p.fill_color })); }}>
                  <SelectTrigger data-testid="zone-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{ZONE_TYPES.map(t => <SelectItem key={t.value} value={t.value} data-testid={`zone-type-option-${t.value}`}>{language === "ar" ? t.label_ar : t.label_en}</SelectItem>)}</SelectContent>
                </Select> 
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{language === "ar" ? "الاسم بالعربية" : "Arabic"}</Label><Input value={zoneForm.name_ar} onChange={e => setZoneForm(p => ({ ...p, name_ar: e.target.value }))} data-testid="zone-name-ar-input" /></div>
              <div><Label>{language === "ar" ? "الاسم بالإنجليزية" : "English"}</Label><Input value={zoneForm.name_en} onChange={e => setZoneForm(p => ({ ...p, name_en: e.target.value }))} data-testid="zone-name-en-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{language === "ar" ? "اللون" : "Color"}</Label><div className="flex gap-2"><input type="color" value={zoneForm.fill_color} onChange={e => setZoneForm(p => ({ ...p, fill_color: e.target.value }))} className="w-10 h-10 rounded" data-testid="zone-color-picker" /><Input value={zoneForm.fill_color} onChange={e => setZoneForm(p => ({ ...p, fill_color: e.target.value }))} data-testid="zone-color-hex-input" /></div></div>
              <div><Label>{language === "ar" ? "السعة" : "Capacity"}</Label><Input type="number" value={zoneForm.max_capacity} onChange={e => setZoneForm(p => ({ ...p, max_capacity: parseInt(e.target.value) || 1000 }))} data-testid="zone-capacity-input" /></div>
            </div>
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <p className="text-sm text-green-700">✓ {drawingPoints.length} {language === "ar" ? "نقطة" : "points"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowZoneDialog(false)} data-testid="zone-dialog-cancel-button">{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveZone} disabled={!zoneForm.zone_code || !zoneForm.name_ar} data-testid="zone-dialog-save-button"><Save className="w-4 h-4 ml-2" />{language === "ar" ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Zone Dialog - Professional */}
      <Dialog open={showEditZoneDialog} onOpenChange={(open) => { if (!open) { setShowEditZoneDialog(false); setEditingZone(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              {language === "ar" ? "تعديل بيانات المنطقة" : "Edit Zone"}
            </DialogTitle>
          </DialogHeader>
          {editingZone && (
            <div className="space-y-5">
              {/* Preview bar */}
              <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: editingZone.stroke_color, backgroundColor: `${editingZone.fill_color}15` }}>
                <div className="w-8 h-8 rounded-lg border-2" style={{ backgroundColor: editingZone.fill_color, borderColor: editingZone.stroke_color }} />
                <div>
                  <p className="font-bold text-sm">{editingZone.zone_code}</p>
                  <p className="text-xs text-muted-foreground">{language === "ar" ? editingZone.name_ar : editingZone.name_en}</p>
                </div>
              </div>

              {/* Code & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium">{language === "ar" ? "الكود" : "Code"}</Label>
                  <Input value={editingZone.zone_code} onChange={e => setEditingZone(p => ({ ...p, zone_code: e.target.value }))} data-testid="edit-zone-code" />
                </div>
                <div>
                  <Label className="text-xs font-medium">{language === "ar" ? "النوع" : "Type"}</Label>
                  <Select value={editingZone.zone_type} onValueChange={v => setEditingZone(p => ({ ...p, zone_type: v }))}>
                    <SelectTrigger data-testid="edit-zone-type"><SelectValue /></SelectTrigger>
                    <SelectContent>{ZONE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{language === "ar" ? t.label_ar : t.label_en}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium">{language === "ar" ? "الاسم بالعربية" : "Arabic Name"}</Label>
                  <Input value={editingZone.name_ar} onChange={e => setEditingZone(p => ({ ...p, name_ar: e.target.value }))} data-testid="edit-zone-name-ar" />
                </div>
                <div>
                  <Label className="text-xs font-medium">{language === "ar" ? "الاسم بالإنجليزية" : "English Name"}</Label>
                  <Input value={editingZone.name_en} onChange={e => setEditingZone(p => ({ ...p, name_en: e.target.value }))} data-testid="edit-zone-name-en" />
                </div>
              </div>

              {/* Colors */}
              <div>
                <Label className="text-xs font-medium mb-2 block">{language === "ar" ? "الألوان" : "Colors"}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-muted-foreground">{language === "ar" ? "لون التعبئة" : "Fill"}</span>
                    <div className="flex items-center gap-2">
                      <input type="color" value={editingZone.fill_color} onChange={e => setEditingZone(p => ({ ...p, fill_color: e.target.value }))} className="w-9 h-9 rounded border cursor-pointer" data-testid="edit-zone-fill-color" />
                      <Input value={editingZone.fill_color} onChange={e => setEditingZone(p => ({ ...p, fill_color: e.target.value }))} className="font-mono text-xs" dir="ltr" data-testid="edit-zone-fill-hex" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-muted-foreground">{language === "ar" ? "لون الحدود" : "Stroke"}</span>
                    <div className="flex items-center gap-2">
                      <input type="color" value={editingZone.stroke_color} onChange={e => setEditingZone(p => ({ ...p, stroke_color: e.target.value }))} className="w-9 h-9 rounded border cursor-pointer" data-testid="edit-zone-stroke-color" />
                      <Input value={editingZone.stroke_color} onChange={e => setEditingZone(p => ({ ...p, stroke_color: e.target.value }))} className="font-mono text-xs" dir="ltr" data-testid="edit-zone-stroke-hex" />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-[11px] text-muted-foreground">{language === "ar" ? "الشفافية" : "Opacity"}: {Math.round((editingZone.opacity ?? 0.4) * 100)}%</span>
                  <input type="range" min="0" max="100" value={Math.round((editingZone.opacity ?? 0.4) * 100)} onChange={e => setEditingZone(p => ({ ...p, opacity: parseInt(e.target.value) / 100 }))} className="w-full accent-emerald-600 mt-1" data-testid="edit-zone-opacity" />
                </div>
              </div>

              {/* Capacity & Area */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium">{language === "ar" ? "السعة القصوى" : "Max Capacity"}</Label>
                  <Input type="number" value={editingZone.max_capacity ?? 0} onChange={e => setEditingZone(p => ({ ...p, max_capacity: parseInt(e.target.value) || 0 }))} data-testid="edit-zone-capacity" />
                </div>
                <div>
                  <Label className="text-xs font-medium">{language === "ar" ? "المساحة (م²)" : "Area (m²)"}</Label>
                  <Input type="number" value={editingZone.area_sqm ?? 0} onChange={e => setEditingZone(p => ({ ...p, area_sqm: parseFloat(e.target.value) || 0 }))} data-testid="edit-zone-area" />
                </div>
              </div>

              {/* Info */}
              <div className="text-xs text-muted-foreground flex items-center gap-4">
                <span>{language === "ar" ? "النقاط" : "Points"}: {editingZone.polygon_points?.length || 0}</span>
                {editingZone.current_crowd != null && <span>{language === "ar" ? "الحشود الحالية" : "Current"}: {editingZone.current_crowd}</span>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditZoneDialog(false); setEditingZone(null); }} data-testid="edit-zone-cancel">{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveEditZone} disabled={!editingZone?.zone_code || !editingZone?.name_ar} data-testid="edit-zone-save">
              <Save className="w-4 h-4 ml-2" />{language === "ar" ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
