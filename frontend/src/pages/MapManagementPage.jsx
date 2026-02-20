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
  Move
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

const SNAP_DISTANCE = 3;

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
  const [floorForm, setFloorForm] = useState({ name_ar: "", name_en: "", floor_number: 0, image_url: "", order: 0 });
  const [editingFloor, setEditingFloor] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Zone dialog
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [zoneForm, setZoneForm] = useState({
    zone_code: "", name_ar: "", name_en: "", zone_type: "men_prayer",
    fill_color: "#22c55e", stroke_color: "#000000", opacity: 0.4, max_capacity: 1000
  });

  // Drawing state
  const [mode, setMode] = useState("pan"); // pan, draw, edit
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [nearStart, setNearStart] = useState(false);

  // Zoom/Pan
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Fetch data
  const fetchFloors = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/floors`);
      setFloors(res.data);
      if (res.data.length > 0 && !selectedFloor) setSelectedFloor(res.data[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedFloor]);

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
    
    const pos = getMousePercent(e);
    
    if (mode === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } 
    else if (mode === "edit" && selectedZoneId) {
      // Check if clicking on a point handle
      const zone = zones.find(z => z.id === selectedZoneId);
      const hitIndex = getHitPointIndex(zone?.polygon_points, pos);
      if (hitIndex !== -1) {
        setDraggingPoint(hitIndex);
        setHoveredPoint(hitIndex);
        return;
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
      // Select zone by clicking inside it
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

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(4, prev + delta)));
  };

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
      setZoneForm({ zone_code: "", name_ar: "", name_en: "", zone_type: "men_prayer", fill_color: "#22c55e", stroke_color: "#000000", opacity: 0.4, max_capacity: 1000 });
      setMode("pan");
      fetchZones();
    } catch (e) {
      toast({ title: "Error", description: e.response?.data?.detail, variant: "destructive" });
    }
  };

  // Delete zone
  const handleDeleteZone = async () => {
    if (!selectedZoneId) return;
    if (!window.confirm(language === "ar" ? "حذف هذه المنطقة؟" : "Delete this zone?")) return;
    try {
      await axios.delete(`${API}/admin/zones/${selectedZoneId}`, getAuthHeaders());
      setSelectedZoneId(null);
      setMode("pan");
      fetchZones();
    } catch (e) { console.error(e); }
  };

  // Upload image
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/admin/upload/map-image`, formData, {
        ...getAuthHeaders(),
        headers: { ...getAuthHeaders().headers, "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total))
      });
      setFloorForm(prev => ({ ...prev, image_url: `${process.env.REACT_APP_BACKEND_URL}${res.data.url}` }));
      toast({ title: language === "ar" ? "تم الرفع" : "Uploaded" });
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  // Floor CRUD
  const handleSaveFloor = async () => {
    try {
      if (editingFloor) {
        await axios.put(`${API}/admin/floors/${editingFloor.id}`, floorForm, getAuthHeaders());
      } else {
        await axios.post(`${API}/admin/floors`, floorForm, getAuthHeaders());
      }
      setShowFloorDialog(false);
      setFloorForm({ name_ar: "", name_en: "", floor_number: 0, image_url: "", order: 0 });
      setEditingFloor(null);
      fetchFloors();
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDeleteFloor = async (id) => {
    if (!window.confirm(language === "ar" ? "حذف؟" : "Delete?")) return;
    try {
      await axios.delete(`${API}/admin/floors/${id}`, getAuthHeaders());
      if (selectedFloor?.id === id) setSelectedFloor(null);
      fetchFloors();
    } catch (e) { console.error(e); }
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
              <Card key={floor.id} className={selectedFloor?.id === floor.id ? "border-primary" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{language === "ar" ? floor.name_ar : floor.name_en}</CardTitle>
                </CardHeader>
                <CardContent>
                  {floor.image_url && <img src={floor.image_url} alt="" className="w-full h-24 object-cover rounded mb-2" />}
                  <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedFloor(floor)} data-testid={`floor-view-${floor.id}`}><Eye className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => { setEditingFloor(floor); setFloorForm({ ...floor }); setShowFloorDialog(true); }} data-testid={`floor-edit-${floor.id}`}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteFloor(floor.id)} data-testid={`floor-delete-${floor.id}`}><Trash2 className="w-4 h-4 text-red-500" /></Button> 
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
                [?2004l[?2004l[?2004l<Button variant={mode === "draw" ? "default" : "ghost"} size="sm" className="rounded-none border-x" onClick={() => { setMode("draw"); setDrawingPoints([]); setSelectedZoneId(null); }} disabled={!selectedFloor} data-testid="mode-draw-button">
                  <Pencil className="w-4 h-4" />
                </Button>[?2004l
                <Button variant={mode === "edit" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => { setMode("edit"); setDrawingPoints([]); }} data-testid="mode-edit-button">
                  <MousePointer className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1 border rounded-lg p-1 bg-white">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} data-testid="zoom-out-button"><ZoomOut className="w-4 h-4" /></Button>
                <span className="text-xs w-12 text-center" data-testid="zoom-percent-label">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(4, z + 0.2))} data-testid="zoom-in-button"><ZoomIn className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} data-testid="zoom-reset-button"><Maximize2 className="w-4 h-4" /></Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {mode === "draw" && drawingPoints.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setDrawingPoints(p => p.slice(0, -1))} data-testid="drawing-undo-button"><Undo2 className="w-4 h-4 ml-1" />{language === "ar" ? "تراجع" : "Undo"}</Button>
                  <Button variant="outline" size="sm" onClick={() => setDrawingPoints([])} data-testid="drawing-clear-button"><X className="w-4 h-4 ml-1" />{language === "ar" ? "مسح" : "Clear"}</Button>
                  {drawingPoints.length >= 3 && <Button size="sm" onClick={() => setShowZoneDialog(true)} data-testid="drawing-save-button"><Check className="w-4 h-4 ml-1" />{language === "ar" ? "حفظ" : "Save"}</Button>}
                </>
              )}
              {mode === "edit" && selectedZoneId && (
                [?2004l[?2004l[?2004l<Button variant="destructive" size="sm" onClick={handleDeleteZone} data-testid="zone-delete-button"><Trash2 className="w-4 h-4 ml-1" />{language === "ar" ? "حذف" : "Delete"}</Button>[?2004l
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
                {language === "ar" ? "انقر على منطقة لتحديدها، ثم اسحب النقاط لتعديلها" : "Click a zone to select, then drag points to edit"}
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
                  onWheel={handleWheel}
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
                              d={getPath(zone.polygon_points)}
                              fill={zone.fill_color}
                              fillOpacity={zone.opacity}
                              stroke={isSelected ? "#3b82f6" : zone.stroke_color}
                              strokeWidth={isSelected ? 0.6 : 0.3}
                              strokeDasharray={isSelected ? "1 0.5" : "none"}
                              vectorEffect="non-scaling-stroke"
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
                              >
                                {zone.zone_code}
                              </text>
                            )}
                            {isSelected && mode === "edit" && zone.polygon_points?.map((pt, i) => {
                              const isActive = i === draggingPoint || i === hoveredPoint;
                              return (
                                <g key={i} data-testid={`zone-handle-${zone.id}-${i}`}>
                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={isActive ? "1.6" : "1.2"}
                                    fill="white"
                                    stroke="#0ea5e9"
                                    strokeWidth="0.35"
                                  />
                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={isActive ? "0.9" : "0.7"}
                                    fill="#0ea5e9"
                                    stroke="white"
                                    strokeWidth="0.2"
                                  />
                                  <text
                                    x={pt.x}
                                    y={pt.y - 1.6}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize="1.4"
                                    fill="#0f172a"
                                    fontWeight="600"
                                  >
                                    {i + 1}
                                  </text>
                                </g>
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
                          {drawingPoints.map((pt, i) => (
                            <g key={i} data-testid={`drawing-point-${i}`}>
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={i === 0 ? (nearStart ? "1.6" : "1.2") : "1"}
                                fill={i === 0 ? (nearStart ? "#22c55e" : "#ef4444") : "#3b82f6"}
                                stroke="white"
                                strokeWidth="0.2"
                              />
                              <text
                                x={pt.x}
                                y={pt.y - 1.6}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="1.4"
                                fill="#0f172a"
                                fontWeight="600"
                              >
                                {i + 1}
                              </text>
                            </g>
                          ))}
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
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {zones.map(zone => (
                <div
                  key={zone.id}
                  data-testid={`zone-list-item-${zone.id}`}
                  className={`p-2 border rounded cursor-pointer text-center ${selectedZoneId === zone.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
                  onClick={() => { setSelectedZoneId(zone.id); setMode("edit"); }}
                >
                  <div className="w-4 h-4 rounded mx-auto mb-1" style={{ backgroundColor: zone.fill_color }} />
                  <span className="text-sm font-medium">{zone.zone_code}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Crowd Tab */}
        <TabsContent value="crowd" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{language === "ar" ? "تحديث الكثافة" : "Update Crowd"}</CardTitle></CardHeader>
            <CardContent>
              <Select value={selectedFloor?.id || ""} onValueChange={(v) => setSelectedFloor(floors.find(f => f.id === v))}>
                <SelectTrigger className="w-48 mb-4"><SelectValue placeholder={language === "ar" ? "اختر" : "Select"} /></SelectTrigger>
                <SelectContent>{floors.map(f => <SelectItem key={f.id} value={f.id}>{language === "ar" ? f.name_ar : f.name_en}</SelectItem>)}</SelectContent>
              </Select>
              {selectedFloor && zones.length > 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {zones.map(zone => (
                      <div key={zone.id} className="p-3 border rounded">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: zone.fill_color }} />
                          <span className="font-medium">{zone.zone_code}</span>
                        </div>
                        <Input
                          type="number"
                          defaultValue={zone.current_crowd || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setBulkUpdates(prev => {
                              const exists = prev.find(u => u.zone_id === zone.id);
                              if (exists) return prev.map(u => u.zone_id === zone.id ? { ...u, current_crowd: val } : u);
                              return [...prev, { zone_id: zone.id, current_crowd: val }];
                            });
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Max: {zone.max_capacity}</p>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleBulkUpdate} disabled={bulkUpdates.length === 0}>
                    <Save className="w-4 h-4 ml-2" />{language === "ar" ? "حفظ" : "Save"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floor Dialog */}
      <Dialog open={showFloorDialog} onOpenChange={setShowFloorDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingFloor ? (language === "ar" ? "تعديل" : "Edit") : (language === "ar" ? "إضافة" : "Add")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{language === "ar" ? "الاسم بالعربية" : "Arabic"}</Label><Input value={floorForm.name_ar} onChange={e => setFloorForm(p => ({ ...p, name_ar: e.target.value }))} /></div>
              <div><Label>{language === "ar" ? "الاسم بالإنجليزية" : "English"}</Label><Input value={floorForm.name_en} onChange={e => setFloorForm(p => ({ ...p, name_en: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{language === "ar" ? "رقم الطابق" : "Floor #"}</Label><Input type="number" value={floorForm.floor_number} onChange={e => setFloorForm(p => ({ ...p, floor_number: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>{language === "ar" ? "الترتيب" : "Order"}</Label><Input type="number" value={floorForm.order} onChange={e => setFloorForm(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <div>
              <Label>{language === "ar" ? "الصورة" : "Image"}</Label>
              <label className="block">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <Button type="button" variant="outline" className="w-full" onClick={e => e.currentTarget.parentElement.querySelector('input').click()} disabled={uploadingImage}>
                  {uploadingImage ? `${uploadProgress}%` : <><Upload className="w-4 h-4 ml-2" />{language === "ar" ? "رفع" : "Upload"}</>}
                </Button>
              </label>
              {uploadingImage && <Progress value={uploadProgress} className="h-2 mt-2" />}
              <Input value={floorForm.image_url} onChange={e => setFloorForm(p => ({ ...p, image_url: e.target.value }))} placeholder="URL" className="mt-2" dir="ltr" />
              {floorForm.image_url && <img src={floorForm.image_url} alt="" className="w-full h-24 object-contain rounded border mt-2" />}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFloorDialog(false)}>{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveFloor} disabled={!floorForm.name_ar || !floorForm.image_url}><Save className="w-4 h-4 ml-2" />{language === "ar" ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{language === "ar" ? "حفظ المنطقة" : "Save Zone"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{language === "ar" ? "الكود" : "Code"}</Label><Input value={zoneForm.zone_code} onChange={e => setZoneForm(p => ({ ...p, zone_code: e.target.value }))} /></div>
              <div>
                <Label>{language === "ar" ? "النوع" : "Type"}</Label>
                <Select value={zoneForm.zone_type} onValueChange={v => { const t = ZONE_TYPES.find(x => x.value === v); setZoneForm(p => ({ ...p, zone_type: v, fill_color: t?.color || p.fill_color })); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ZONE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{language === "ar" ? t.label_ar : t.label_en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{language === "ar" ? "الاسم بالعربية" : "Arabic"}</Label><Input value={zoneForm.name_ar} onChange={e => setZoneForm(p => ({ ...p, name_ar: e.target.value }))} /></div>
              <div><Label>{language === "ar" ? "الاسم بالإنجليزية" : "English"}</Label><Input value={zoneForm.name_en} onChange={e => setZoneForm(p => ({ ...p, name_en: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{language === "ar" ? "اللون" : "Color"}</Label><div className="flex gap-2"><input type="color" value={zoneForm.fill_color} onChange={e => setZoneForm(p => ({ ...p, fill_color: e.target.value }))} className="w-10 h-10 rounded" /><Input value={zoneForm.fill_color} onChange={e => setZoneForm(p => ({ ...p, fill_color: e.target.value }))} /></div></div>
              <div><Label>{language === "ar" ? "السعة" : "Capacity"}</Label><Input type="number" value={zoneForm.max_capacity} onChange={e => setZoneForm(p => ({ ...p, max_capacity: parseInt(e.target.value) || 1000 }))} /></div>
            </div>
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <p className="text-sm text-green-700">✓ {drawingPoints.length} {language === "ar" ? "نقطة" : "points"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowZoneDialog(false)}>{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveZone} disabled={!zoneForm.zone_code || !zoneForm.name_ar}><Save className="w-4 h-4 ml-2" />{language === "ar" ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
