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
  Move,
  Pencil,
  Hand
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

// Zone types
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

// Snap distance for closing polygon
const SNAP_DISTANCE = 2;
// Handle size for dragging points
const HANDLE_SIZE = 1;

// Drawing modes
const MODES = {
  PAN: 'pan',
  DRAW: 'draw',
  EDIT: 'edit'
};

export default function MapManagementPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // State
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("floors");

  // Floor form state
  const [showFloorDialog, setShowFloorDialog] = useState(false);
  const [floorForm, setFloorForm] = useState({
    name_ar: "",
    name_en: "",
    floor_number: 0,
    image_url: "",
    order: 0,
  });
  const [editingFloor, setEditingFloor] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Zone form state
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [zoneForm, setZoneForm] = useState({
    zone_code: "",
    name_ar: "",
    name_en: "",
    zone_type: "men_prayer",
    fill_color: "#22c55e",
    stroke_color: "#000000",
    opacity: 0.4,
    max_capacity: 1000,
    description_ar: "",
    description_en: "",
  });

  // Drawing state - PowerPoint style
  const [mode, setMode] = useState(MODES.PAN);
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [draggingPointIndex, setDraggingPointIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Zoom and pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [nearStartPoint, setNearStartPoint] = useState(false);

  // Get token from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Fetch floors
  const fetchFloors = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/floors`);
      setFloors(response.data);
      if (response.data.length > 0 && !selectedFloor) {
        setSelectedFloor(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching floors:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedFloor]);

  // Fetch zones for selected floor
  const fetchZones = useCallback(async () => {
    if (!selectedFloor) return;
    try {
      const response = await axios.get(`${API}/floors/${selectedFloor.id}/zones`);
      setZones(response.data);
    } catch (error) {
      console.error("Error fetching zones:", error);
    }
  }, [selectedFloor]);

  useEffect(() => {
    fetchFloors();
  }, [fetchFloors]);

  useEffect(() => {
    if (selectedFloor) {
      fetchZones();
    }
  }, [selectedFloor, fetchZones]);

  // Convert screen coordinates to percentage
  const screenToPercent = useCallback((clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    // Adjust for zoom and pan
    const adjustedX = (x - (pan.x / rect.width) * 100) / zoom;
    const adjustedY = (y - (pan.y / rect.height) * 100) / zoom;
    
    return {
      x: parseFloat(Math.max(0, Math.min(100, adjustedX)).toFixed(2)),
      y: parseFloat(Math.max(0, Math.min(100, adjustedY)).toFixed(2))
    };
  }, [pan, zoom]);

  // Calculate distance between two points
  const getDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  // Check if point is inside polygon
  const isPointInPolygon = (point, polygon) => {
    if (!polygon || polygon.length < 3) return false;
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Find which zone was clicked
  const findZoneAtPoint = (point) => {
    for (const zone of zones) {
      if (isPointInPolygon(point, zone.polygon_points)) {
        return zone;
      }
    }
    return null;
  };

  // Find which point handle was clicked
  const findPointHandleAtPosition = (point, zonePoints) => {
    if (!zonePoints) return -1;
    
    for (let i = 0; i < zonePoints.length; i++) {
      const handlePoint = zonePoints[i];
      const distance = getDistance(point, handlePoint);
      if (distance < HANDLE_SIZE * 2 / zoom) {
        return i;
      }
    }
    return -1;
  };

  // Handle canvas click
  const handleCanvasClick = (e) => {
    if (isDragging) return;
    
    const point = screenToPercent(e.clientX, e.clientY);
    
    if (mode === MODES.DRAW) {
      // Drawing mode - add points
      if (currentPolygon.length >= 3) {
        const startPoint = currentPolygon[0];
        const distance = getDistance(point, startPoint);
        
        if (distance < SNAP_DISTANCE) {
          // Close polygon and save
          setShowZoneDialog(true);
          return;
        }
      }
      
      setCurrentPolygon((prev) => [...prev, point]);
      
    } else if (mode === MODES.EDIT || mode === MODES.PAN) {
      // Check if clicking on an existing zone
      const clickedZone = findZoneAtPoint(point);
      
      if (clickedZone) {
        setSelectedZone(clickedZone);
        setEditingZoneId(clickedZone.id);
        setMode(MODES.EDIT);
      } else {
        // Deselect if clicking outside
        if (editingZoneId && mode === MODES.EDIT) {
          setSelectedZone(null);
          setEditingZoneId(null);
          setMode(MODES.PAN);
        }
      }
    }
  };

  // Handle mouse down
  const handleMouseDown = (e) => {
    const point = screenToPercent(e.clientX, e.clientY);
    
    if (mode === MODES.EDIT && editingZoneId) {
      // Check if clicking on a point handle
      const zone = zones.find(z => z.id === editingZoneId);
      if (zone) {
        const pointIndex = findPointHandleAtPosition(point, zone.polygon_points);
        if (pointIndex !== -1) {
          setDraggingPointIndex(pointIndex);
          setIsDragging(true);
          e.preventDefault();
          return;
        }
      }
    }
    
    if (mode === MODES.PAN && e.button === 0) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle mouse move
  const handleMouseMove = (e) => {
    const point = screenToPercent(e.clientX, e.clientY);
    setCursorPosition(point);
    
    // Handle point dragging
    if (isDragging && draggingPointIndex !== null && editingZoneId) {
      const zoneIndex = zones.findIndex(z => z.id === editingZoneId);
      if (zoneIndex !== -1) {
        const newZones = [...zones];
        const newPoints = [...newZones[zoneIndex].polygon_points];
        newPoints[draggingPointIndex] = point;
        newZones[zoneIndex] = { ...newZones[zoneIndex], polygon_points: newPoints };
        setZones(newZones);
      }
      return;
    }
    
    // Handle panning
    if (isPanning && mode === MODES.PAN) {
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Check if near start point when drawing
    if (mode === MODES.DRAW && currentPolygon.length >= 3) {
      const startPoint = currentPolygon[0];
      const distance = getDistance(point, startPoint);
      setNearStartPoint(distance < SNAP_DISTANCE);
    } else {
      setNearStartPoint(false);
    }
  };

  // Handle mouse up
  const handleMouseUp = async () => {
    // Save point position if was dragging
    if (isDragging && draggingPointIndex !== null && editingZoneId) {
      const zone = zones.find(z => z.id === editingZoneId);
      if (zone) {
        try {
          await axios.put(
            `${API}/admin/zones/${editingZoneId}`,
            { polygon_points: zone.polygon_points },
            getAuthHeaders()
          );
          toast({
            title: language === "ar" ? "تم الحفظ" : "Saved",
            description: language === "ar" ? "تم تحديث موقع النقطة" : "Point position updated",
          });
        } catch (error) {
          console.error("Error saving point:", error);
          fetchZones(); // Revert on error
        }
      }
    }
    
    setIsDragging(false);
    setDraggingPointIndex(null);
    setIsPanning(false);
  };

  // Handle wheel for zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    const newZoom = Math.max(0.5, Math.min(5, zoom + delta));
    setZoom(newZoom);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Undo last point
  const handleUndoPoint = () => {
    setCurrentPolygon((prev) => prev.slice(0, -1));
    setNearStartPoint(false);
  };

  // Clear polygon
  const handleClearPolygon = () => {
    setCurrentPolygon([]);
    setNearStartPoint(false);
  };

  // Delete selected zone
  const handleDeleteSelectedZone = async () => {
    if (!editingZoneId) return;
    
    if (!window.confirm(language === "ar" ? "هل أنت متأكد من حذف هذه المنطقة؟" : "Delete this zone?")) {
      return;
    }
    
    try {
      await axios.delete(`${API}/admin/zones/${editingZoneId}`, getAuthHeaders());
      toast({
        title: language === "ar" ? "تم الحذف" : "Deleted",
        description: language === "ar" ? "تم حذف المنطقة" : "Zone deleted",
      });
      setSelectedZone(null);
      setEditingZoneId(null);
      setMode(MODES.PAN);
      fetchZones();
    } catch (error) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.response?.data?.detail || "Failed to delete",
        variant: "destructive",
      });
    }
  };

  // Add point to existing zone
  const handleAddPointToZone = () => {
    if (!editingZoneId) return;
    
    const zone = zones.find(z => z.id === editingZoneId);
    if (zone) {
      // Add point at the end (before last point to maintain shape)
      const newPoints = [...zone.polygon_points];
      const lastPoint = newPoints[newPoints.length - 1];
      const secondLastPoint = newPoints[newPoints.length - 2] || newPoints[0];
      
      // Insert new point between last two points
      const newPoint = {
        x: (lastPoint.x + secondLastPoint.x) / 2,
        y: (lastPoint.y + secondLastPoint.y) / 2
      };
      newPoints.splice(newPoints.length - 1, 0, newPoint);
      
      const newZones = zones.map(z => 
        z.id === editingZoneId ? { ...z, polygon_points: newPoints } : z
      );
      setZones(newZones);
    }
  };

  // Remove selected point from zone
  const handleRemovePoint = async (pointIndex) => {
    if (!editingZoneId) return;
    
    const zone = zones.find(z => z.id === editingZoneId);
    if (zone && zone.polygon_points.length > 3) {
      const newPoints = zone.polygon_points.filter((_, i) => i !== pointIndex);
      
      try {
        await axios.put(
          `${API}/admin/zones/${editingZoneId}`,
          { polygon_points: newPoints },
          getAuthHeaders()
        );
        
        const newZones = zones.map(z => 
          z.id === editingZoneId ? { ...z, polygon_points: newPoints } : z
        );
        setZones(newZones);
        
        toast({
          title: language === "ar" ? "تم الحذف" : "Removed",
          description: language === "ar" ? "تم حذف النقطة" : "Point removed",
        });
      } catch (error) {
        console.error("Error removing point:", error);
      }
    }
  };

  // Get polygon path
  const getPolygonPath = (points, close = false) => {
    if (!points || points.length < 2) return "";
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return close && points.length > 2 ? path + " Z" : path;
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" 
          ? "نوع الملف غير مدعوم. استخدم PNG أو JPG أو WEBP" 
          : "File type not supported",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${API}/admin/upload/map-image`,
        formData,
        {
          ...getAuthHeaders(),
          headers: {
            ...getAuthHeaders().headers,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        }
      );

      const imageUrl = `${process.env.REACT_APP_BACKEND_URL}${response.data.url}`;
      setFloorForm({ ...floorForm, image_url: imageUrl });

      toast({
        title: language === "ar" ? "تم الرفع" : "Uploaded",
        description: language === "ar" ? "تم رفع الصورة بنجاح" : "Image uploaded successfully",
      });
    } catch (error) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.response?.data?.detail || "Failed to upload image",
        variant: "destructive",
      });
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
      toast({
        title: language === "ar" ? "تم الحفظ" : "Saved",
        description: language === "ar" ? "تم حفظ الطابق بنجاح" : "Floor saved successfully",
      });
      setShowFloorDialog(false);
      setFloorForm({ name_ar: "", name_en: "", floor_number: 0, image_url: "", order: 0 });
      setEditingFloor(null);
      fetchFloors();
    } catch (error) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.response?.data?.detail || "Failed to save floor",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFloor = async (floorId) => {
    if (!window.confirm(language === "ar" ? "هل أنت متأكد من حذف هذا الطابق؟" : "Delete this floor?")) {
      return;
    }
    try {
      await axios.delete(`${API}/admin/floors/${floorId}`, getAuthHeaders());
      if (selectedFloor?.id === floorId) setSelectedFloor(null);
      fetchFloors();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete floor", variant: "destructive" });
    }
  };

  // Save new zone
  const handleSaveZone = async () => {
    if (!selectedFloor || currentPolygon.length < 3) return;

    try {
      const payload = {
        ...zoneForm,
        floor_id: selectedFloor.id,
        polygon_points: currentPolygon,
      };

      await axios.post(`${API}/admin/zones`, payload, getAuthHeaders());
      
      toast({
        title: language === "ar" ? "تم الحفظ" : "Saved",
        description: language === "ar" ? "تم إضافة المنطقة بنجاح" : "Zone added successfully",
      });

      setShowZoneDialog(false);
      setZoneForm({
        zone_code: "",
        name_ar: "",
        name_en: "",
        zone_type: "men_prayer",
        fill_color: "#22c55e",
        stroke_color: "#000000",
        opacity: 0.4,
        max_capacity: 1000,
        description_ar: "",
        description_en: "",
      });
      setCurrentPolygon([]);
      setMode(MODES.PAN);
      fetchZones();
    } catch (error) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.response?.data?.detail || "Failed to save zone",
        variant: "destructive",
      });
    }
  };

  // Bulk update crowd data
  const [bulkUpdates, setBulkUpdates] = useState([]);

  const handleBulkUpdate = async () => {
    try {
      for (const update of bulkUpdates) {
        await axios.put(
          `${API}/admin/zones/${update.zone_id}`,
          { current_crowd: update.current_crowd },
          getAuthHeaders()
        );
      }
      toast({
        title: language === "ar" ? "تم التحديث" : "Updated",
        description: language === "ar" ? "تم تحديث بيانات الكثافة" : "Crowd data updated",
      });
      setBulkUpdates([]);
      fetchZones();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  // Get cursor style based on mode
  const getCursorStyle = () => {
    if (mode === MODES.DRAW) return "crosshair";
    if (mode === MODES.EDIT) return isDragging ? "grabbing" : "default";
    if (isPanning) return "grabbing";
    return "grab";
  };

  return (
    <div className="space-y-6" data-testid="map-management-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-cairo font-bold text-2xl">
            {language === "ar" ? "إدارة الخرائط التفاعلية" : "Interactive Map Management"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "ar"
              ? "إضافة وتعديل الطوابق والمناطق على الخريطة"
              : "Add and edit floors and zones on the map"}
          </p>
        </div>
        <Button variant="outline" onClick={fetchFloors}>
          <RefreshCw className="w-4 h-4 ml-2" />
          {language === "ar" ? "تحديث" : "Refresh"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="floors" data-testid="floors-tab">
            <Layers className="w-4 h-4 ml-2" />
            {language === "ar" ? "الطوابق" : "Floors"}
          </TabsTrigger>
          <TabsTrigger value="zones" data-testid="zones-tab">
            <MapPin className="w-4 h-4 ml-2" />
            {language === "ar" ? "المناطق" : "Zones"}
          </TabsTrigger>
          <TabsTrigger value="crowd" data-testid="crowd-tab">
            <Settings className="w-4 h-4 ml-2" />
            {language === "ar" ? "تحديث الكثافة" : "Update Crowd"}
          </TabsTrigger>
        </TabsList>

        {/* Floors Tab */}
        <TabsContent value="floors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-cairo font-semibold text-lg">
              {language === "ar" ? "قائمة الطوابق" : "Floor List"}
            </h2>
            <Button onClick={() => { setEditingFloor(null); setFloorForm({ name_ar: "", name_en: "", floor_number: 0, image_url: "", order: 0 }); setShowFloorDialog(true); }}>
              <Plus className="w-4 h-4 ml-2" />
              {language === "ar" ? "إضافة طابق" : "Add Floor"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {floors.map((floor) => (
              <Card key={floor.id} className={selectedFloor?.id === floor.id ? "border-primary" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-cairo">
                      {language === "ar" ? floor.name_ar : floor.name_en}
                    </CardTitle>
                    <Badge variant="outline">
                      {language === "ar" ? `الطابق ${floor.floor_number}` : `Floor ${floor.floor_number}`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {floor.image_url && (
                    <img src={floor.image_url} alt={floor.name_ar} className="w-full h-32 object-cover rounded-md mb-3" />
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedFloor(floor)}>
                      <Eye className="w-4 h-4 ml-1" />
                      {language === "ar" ? "عرض" : "View"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingFloor(floor);
                      setFloorForm({ name_ar: floor.name_ar, name_en: floor.name_en, floor_number: floor.floor_number, image_url: floor.image_url, order: floor.order });
                      setShowFloorDialog(true);
                    }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteFloor(floor.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {floors.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center">
                  <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {language === "ar" ? "لا توجد طوابق. أضف طابقاً جديداً." : "No floors. Add a new floor."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Zones Tab - PowerPoint style */}
        <TabsContent value="zones" className="space-y-4">
          {/* Toolbar */}
          <div className="flex justify-between items-center flex-wrap gap-4 bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-3">
              <Select
                value={selectedFloor?.id || ""}
                onValueChange={(val) => {
                  setSelectedFloor(floors.find((f) => f.id === val));
                  setCurrentPolygon([]);
                  setMode(MODES.PAN);
                  setEditingZoneId(null);
                  setSelectedZone(null);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={language === "ar" ? "اختر الطابق" : "Select Floor"} />
                </SelectTrigger>
                <SelectContent>
                  {floors.map((floor) => (
                    <SelectItem key={floor.id} value={floor.id}>
                      {language === "ar" ? floor.name_ar : floor.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-sm text-muted-foreground">
                {zones.length} {language === "ar" ? "منطقة" : "zones"}
              </span>
            </div>

            {/* Mode buttons */}
            <div className="flex items-center gap-2">
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={mode === MODES.PAN ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => { setMode(MODES.PAN); setCurrentPolygon([]); }}
                  title={language === "ar" ? "تحريك" : "Pan"}
                >
                  <Hand className="w-4 h-4" />
                </Button>
                <Button
                  variant={mode === MODES.DRAW ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none border-x"
                  onClick={() => { setMode(MODES.DRAW); setCurrentPolygon([]); setEditingZoneId(null); }}
                  disabled={!selectedFloor}
                  title={language === "ar" ? "رسم" : "Draw"}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant={mode === MODES.EDIT ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => { setMode(MODES.EDIT); setCurrentPolygon([]); }}
                  title={language === "ar" ? "تعديل" : "Edit"}
                >
                  <MousePointer className="w-4 h-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* Zoom controls */}
              <div className="flex items-center gap-1 border rounded-lg p-1 bg-white">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleResetView}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Context actions */}
            <div className="flex items-center gap-2">
              {mode === MODES.DRAW && currentPolygon.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={handleUndoPoint}>
                    <Undo2 className="w-4 h-4 ml-1" />
                    {language === "ar" ? "تراجع" : "Undo"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClearPolygon}>
                    <X className="w-4 h-4 ml-1" />
                    {language === "ar" ? "مسح" : "Clear"}
                  </Button>
                  {currentPolygon.length >= 3 && (
                    <Button size="sm" onClick={() => setShowZoneDialog(true)}>
                      <Check className="w-4 h-4 ml-1" />
                      {language === "ar" ? "حفظ" : "Save"}
                    </Button>
                  )}
                </>
              )}
              
              {mode === MODES.EDIT && editingZoneId && (
                <>
                  <Button variant="outline" size="sm" onClick={handleAddPointToZone}>
                    <Plus className="w-4 h-4 ml-1" />
                    {language === "ar" ? "إضافة نقطة" : "Add Point"}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDeleteSelectedZone}>
                    <Trash2 className="w-4 h-4 ml-1" />
                    {language === "ar" ? "حذف المنطقة" : "Delete Zone"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Instructions */}
          {mode === MODES.DRAW && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <div className="flex items-center gap-2 text-blue-700 font-medium">
                <Pencil className="w-4 h-4" />
                {language === "ar" ? "وضع الرسم" : "Drawing Mode"}
              </div>
              <p className="text-blue-600 mt-1">
                {language === "ar" 
                  ? `انقر لإضافة نقاط. عند الانتهاء، انقر على النقطة الأولى (الحمراء) لإغلاق الشكل. النقاط: ${currentPolygon.length}`
                  : `Click to add points. Click on the first point (red) to close. Points: ${currentPolygon.length}`}
              </p>
            </div>
          )}
          
          {mode === MODES.EDIT && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <div className="flex items-center gap-2 text-amber-700 font-medium">
                <MousePointer className="w-4 h-4" />
                {language === "ar" ? "وضع التعديل" : "Edit Mode"}
              </div>
              <p className="text-amber-600 mt-1">
                {language === "ar" 
                  ? "انقر على منطقة لتحديدها، ثم اسحب النقاط لتعديل الشكل. انقر مرتين على نقطة لحذفها."
                  : "Click a zone to select it, drag points to reshape. Double-click a point to delete it."}
              </p>
            </div>
          )}

          {/* Map Canvas */}
          {selectedFloor ? (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div
                  ref={containerRef}
                  className="relative w-full bg-gray-100 overflow-hidden select-none"
                  style={{ height: "600px", cursor: getCursorStyle() }}
                  onWheel={handleWheel}
                >
                  <div
                    ref={canvasRef}
                    className="absolute inset-0 transition-transform duration-75"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                      transformOrigin: "center center",
                    }}
                    onClick={handleCanvasClick}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {/* Background image */}
                    <img
                      src={selectedFloor.image_url}
                      alt={selectedFloor.name_ar}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />

                    {/* SVG Overlay */}
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {/* Existing zones */}
                      {zones.map((zone) => {
                        const isSelected = zone.id === editingZoneId;
                        
                        return (
                          <g key={zone.id}>
                            {/* Zone polygon */}
                            <path
                              d={getPolygonPath(zone.polygon_points, true)}
                              fill={zone.fill_color}
                              fillOpacity={zone.opacity}
                              stroke={isSelected ? "#3b82f6" : zone.stroke_color}
                              strokeWidth={isSelected ? 0.5 / zoom : 0.3 / zoom}
                              strokeDasharray={isSelected ? `${1/zoom} ${0.5/zoom}` : "none"}
                              className="transition-all"
                            />
                            
                            {/* Zone label */}
                            {zone.polygon_points?.length > 0 && (
                              <text
                                x={zone.polygon_points.reduce((s, p) => s + p.x, 0) / zone.polygon_points.length}
                                y={zone.polygon_points.reduce((s, p) => s + p.y, 0) / zone.polygon_points.length}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize={2 / zoom}
                                fill="#000"
                                fontWeight="bold"
                                style={{ pointerEvents: "none" }}
                              >
                                {zone.zone_code}
                              </text>
                            )}
                            
                            {/* Edit handles when selected */}
                            {isSelected && mode === MODES.EDIT && zone.polygon_points?.map((point, i) => (
                              <g key={`handle-${i}`}>
                                {/* Handle background */}
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={HANDLE_SIZE / zoom}
                                  fill="white"
                                  stroke="#3b82f6"
                                  strokeWidth={0.2 / zoom}
                                  style={{ cursor: "move" }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    handleRemovePoint(i);
                                  }}
                                />
                                {/* Handle fill */}
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={(HANDLE_SIZE * 0.6) / zoom}
                                  fill="#3b82f6"
                                  style={{ pointerEvents: "none" }}
                                />
                              </g>
                            ))}
                          </g>
                        );
                      })}

                      {/* Current drawing polygon */}
                      {mode === MODES.DRAW && currentPolygon.length > 0 && (
                        <>
                          {/* Lines */}
                          <path
                            d={getPolygonPath(currentPolygon, false)}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={0.4 / zoom}
                          />
                          
                          {/* Preview line to cursor */}
                          <line
                            x1={currentPolygon[currentPolygon.length - 1].x}
                            y1={currentPolygon[currentPolygon.length - 1].y}
                            x2={cursorPosition.x}
                            y2={cursorPosition.y}
                            stroke="#3b82f6"
                            strokeWidth={0.2 / zoom}
                            strokeDasharray={`${0.5 / zoom} ${0.3 / zoom}`}
                            opacity={0.6}
                          />
                          
                          {/* Fill preview when near start */}
                          {nearStartPoint && currentPolygon.length >= 3 && (
                            <path
                              d={getPolygonPath(currentPolygon, true)}
                              fill={zoneForm.fill_color}
                              fillOpacity={0.3}
                              stroke="#22c55e"
                              strokeWidth={0.5 / zoom}
                            />
                          )}
                          
                          {/* Points */}
                          {currentPolygon.map((point, i) => (
                            <circle
                              key={i}
                              cx={point.x}
                              cy={point.y}
                              r={(i === 0 ? (nearStartPoint ? 1.5 : 1) : 0.8) / zoom}
                              fill={i === 0 ? (nearStartPoint ? "#22c55e" : "#ef4444") : "#3b82f6"}
                              stroke="white"
                              strokeWidth={0.2 / zoom}
                              className={i === 0 && nearStartPoint ? "animate-pulse" : ""}
                            />
                          ))}
                        </>
                      )}
                    </svg>
                  </div>

                  {/* Status bar */}
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                    <div className="bg-black/70 text-white px-2 py-1 rounded text-xs font-mono">
                      X: {cursorPosition.x.toFixed(1)}% | Y: {cursorPosition.y.toFixed(1)}%
                      {nearStartPoint && <span className="text-green-400 mr-2"> • {language === "ar" ? "انقر للإغلاق" : "Click to close"}</span>}
                    </div>
                    <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                      {Math.round(zoom * 100)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {language === "ar" ? "الرجاء اختيار طابق" : "Please select a floor"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Zone list */}
          {selectedFloor && zones.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-cairo">
                  {language === "ar" ? "قائمة المناطق" : "Zone List"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                  {zones.map((zone) => (
                    <div
                      key={zone.id}
                      className={`p-2 border rounded cursor-pointer transition-all ${
                        editingZoneId === zone.id ? "border-blue-500 bg-blue-50" : "hover:border-gray-300"
                      }`}
                      onClick={() => {
                        setSelectedZone(zone);
                        setEditingZoneId(zone.id);
                        setMode(MODES.EDIT);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: zone.fill_color }} />
                        <span className="font-medium text-sm truncate">{zone.zone_code}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {language === "ar" ? zone.name_ar : zone.name_en}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Crowd Update Tab */}
        <TabsContent value="crowd" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-cairo">
                {language === "ar" ? "تحديث بيانات الكثافة" : "Update Crowd Data"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select
                  value={selectedFloor?.id || ""}
                  onValueChange={(val) => setSelectedFloor(floors.find((f) => f.id === val))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={language === "ar" ? "اختر الطابق" : "Select Floor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {floors.map((floor) => (
                      <SelectItem key={floor.id} value={floor.id}>
                        {language === "ar" ? floor.name_ar : floor.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFloor && zones.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {zones.map((zone) => (
                      <div key={zone.id} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: zone.fill_color }} />
                          <span className="font-medium">{zone.zone_code}</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">{language === "ar" ? "العدد الحالي" : "Current Crowd"}</Label>
                            <Input
                              type="number"
                              defaultValue={zone.current_crowd || 0}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                setBulkUpdates((prev) => {
                                  const existing = prev.find((u) => u.zone_id === zone.id);
                                  if (existing) {
                                    return prev.map((u) => u.zone_id === zone.id ? { ...u, current_crowd: value } : u);
                                  }
                                  return [...prev, { zone_id: zone.id, current_crowd: value }];
                                });
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{language === "ar" ? "الحد الأقصى:" : "Max:"} {zone.max_capacity}</span>
                            <span>{zone.percentage || 0}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleBulkUpdate} disabled={bulkUpdates.length === 0}>
                      <Save className="w-4 h-4 ml-2" />
                      {language === "ar" ? "حفظ التغييرات" : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {language === "ar" ? "اختر طابقاً" : "Select a floor"}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floor Dialog */}
      <Dialog open={showFloorDialog} onOpenChange={setShowFloorDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {editingFloor ? (language === "ar" ? "تعديل الطابق" : "Edit Floor") : (language === "ar" ? "إضافة طابق" : "Add Floor")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === "ar" ? "الاسم بالعربية" : "Name (Arabic)"}</Label>
                <Input value={floorForm.name_ar} onChange={(e) => setFloorForm({ ...floorForm, name_ar: e.target.value })} />
              </div>
              <div>
                <Label>{language === "ar" ? "الاسم بالإنجليزية" : "Name (English)"}</Label>
                <Input value={floorForm.name_en} onChange={(e) => setFloorForm({ ...floorForm, name_en: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === "ar" ? "رقم الطابق" : "Floor Number"}</Label>
                <Input type="number" value={floorForm.floor_number} onChange={(e) => setFloorForm({ ...floorForm, floor_number: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>{language === "ar" ? "الترتيب" : "Order"}</Label>
                <Input type="number" value={floorForm.order} onChange={(e) => setFloorForm({ ...floorForm, order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{language === "ar" ? "صورة الخريطة" : "Map Image"}</Label>
              <label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                <Button type="button" variant="outline" className="w-full" onClick={(e) => e.currentTarget.parentElement.querySelector('input').click()} disabled={uploadingImage}>
                  {uploadingImage ? <><RefreshCw className="w-4 h-4 ml-2 animate-spin" />{uploadProgress}%</> : <><Upload className="w-4 h-4 ml-2" />{language === "ar" ? "رفع صورة" : "Upload"}</>}
                </Button>
              </label>
              {uploadingImage && <Progress value={uploadProgress} className="h-2" />}
              <Input value={floorForm.image_url} onChange={(e) => setFloorForm({ ...floorForm, image_url: e.target.value })} placeholder="https://..." dir="ltr" />
            </div>
            
            {floorForm.image_url && (
              <div className="relative">
                <img src={floorForm.image_url} alt="Preview" className="w-full h-32 object-contain rounded border bg-gray-50" />
                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setFloorForm({ ...floorForm, image_url: "" })}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFloorDialog(false)}>{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveFloor} disabled={!floorForm.name_ar || !floorForm.image_url}>
              <Save className="w-4 h-4 ml-2" />{language === "ar" ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cairo">{language === "ar" ? "حفظ المنطقة" : "Save Zone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === "ar" ? "كود المنطقة" : "Zone Code"}</Label>
                <Input value={zoneForm.zone_code} onChange={(e) => setZoneForm({ ...zoneForm, zone_code: e.target.value })} placeholder="e.g., MEN-1" />
              </div>
              <div>
                <Label>{language === "ar" ? "نوع المنطقة" : "Zone Type"}</Label>
                <Select value={zoneForm.zone_type} onValueChange={(val) => {
                  const type = ZONE_TYPES.find((t) => t.value === val);
                  setZoneForm({ ...zoneForm, zone_type: val, fill_color: type?.color || zoneForm.fill_color });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ZONE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: type.color }} />
                          {language === "ar" ? type.label_ar : type.label_en}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === "ar" ? "الاسم بالعربية" : "Name (Arabic)"}</Label>
                <Input value={zoneForm.name_ar} onChange={(e) => setZoneForm({ ...zoneForm, name_ar: e.target.value })} />
              </div>
              <div>
                <Label>{language === "ar" ? "الاسم بالإنجليزية" : "Name (English)"}</Label>
                <Input value={zoneForm.name_en} onChange={(e) => setZoneForm({ ...zoneForm, name_en: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === "ar" ? "لون التعبئة" : "Fill Color"}</Label>
                <div className="flex gap-2">
                  <input type="color" value={zoneForm.fill_color} onChange={(e) => setZoneForm({ ...zoneForm, fill_color: e.target.value })} className="w-10 h-10 rounded border" />
                  <Input value={zoneForm.fill_color} onChange={(e) => setZoneForm({ ...zoneForm, fill_color: e.target.value })} className="flex-1" dir="ltr" />
                </div>
              </div>
              <div>
                <Label>{language === "ar" ? "السعة القصوى" : "Max Capacity"}</Label>
                <Input type="number" value={zoneForm.max_capacity} onChange={(e) => setZoneForm({ ...zoneForm, max_capacity: parseInt(e.target.value) || 1000 })} />
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">
                ✓ {language === "ar" ? `تم رسم ${currentPolygon.length} نقطة` : `${currentPolygon.length} points drawn`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowZoneDialog(false)}>{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveZone} disabled={!zoneForm.zone_code || !zoneForm.name_ar}>
              <Save className="w-4 h-4 ml-2" />{language === "ar" ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
