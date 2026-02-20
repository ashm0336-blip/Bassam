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
  Image as ImageIcon
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

// Snap distance in percentage (for closing polygon)
const SNAP_DISTANCE = 2;

export default function MapManagementPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // State
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
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
  const [editingZone, setEditingZone] = useState(null);

  // Drawing state - Enhanced
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [drawMode, setDrawMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [nearStartPoint, setNearStartPoint] = useState(false);

  // Get token from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      headers: { Authorization: `Bearer ${token}` },
    };
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

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" 
          ? "نوع الملف غير مدعوم. استخدم PNG أو JPG أو WEBP" 
          : "File type not supported. Use PNG, JPG, or WEBP",
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

      // Construct full URL
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
        await axios.put(
          `${API}/admin/floors/${editingFloor.id}`,
          floorForm,
          getAuthHeaders()
        );
        toast({
          title: language === "ar" ? "تم التحديث" : "Updated",
          description: language === "ar" ? "تم تحديث الطابق بنجاح" : "Floor updated successfully",
        });
      } else {
        await axios.post(`${API}/admin/floors`, floorForm, getAuthHeaders());
        toast({
          title: language === "ar" ? "تم الإضافة" : "Added",
          description: language === "ar" ? "تم إضافة الطابق بنجاح" : "Floor added successfully",
        });
      }
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
    if (!window.confirm(language === "ar" ? "هل أنت متأكد من حذف هذا الطابق؟" : "Are you sure you want to delete this floor?")) {
      return;
    }
    try {
      await axios.delete(`${API}/admin/floors/${floorId}`, getAuthHeaders());
      toast({
        title: language === "ar" ? "تم الحذف" : "Deleted",
        description: language === "ar" ? "تم حذف الطابق بنجاح" : "Floor deleted successfully",
      });
      if (selectedFloor?.id === floorId) {
        setSelectedFloor(null);
      }
      fetchFloors();
    } catch (error) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.response?.data?.detail || "Failed to delete floor",
        variant: "destructive",
      });
    }
  };

  // Zone CRUD
  const handleSaveZone = async () => {
    if (!selectedFloor) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "الرجاء اختيار طابق أولاً" : "Please select a floor first",
        variant: "destructive",
      });
      return;
    }

    if (currentPolygon.length < 3 && !editingZone) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "الرجاء رسم منطقة بثلاث نقاط على الأقل" : "Please draw a polygon with at least 3 points",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        ...zoneForm,
        floor_id: selectedFloor.id,
        polygon_points: editingZone ? editingZone.polygon_points : currentPolygon,
      };

      if (editingZone) {
        await axios.put(
          `${API}/admin/zones/${editingZone.id}`,
          payload,
          getAuthHeaders()
        );
        toast({
          title: language === "ar" ? "تم التحديث" : "Updated",
          description: language === "ar" ? "تم تحديث المنطقة بنجاح" : "Zone updated successfully",
        });
      } else {
        await axios.post(`${API}/admin/zones`, payload, getAuthHeaders());
        toast({
          title: language === "ar" ? "تم الإضافة" : "Added",
          description: language === "ar" ? "تم إضافة المنطقة بنجاح" : "Zone added successfully",
        });
      }

      setShowZoneDialog(false);
      resetZoneForm();
      fetchZones();
    } catch (error) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.response?.data?.detail || "Failed to save zone",
        variant: "destructive",
      });
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm(language === "ar" ? "هل أنت متأكد من حذف هذه المنطقة؟" : "Are you sure you want to delete this zone?")) {
      return;
    }
    try {
      await axios.delete(`${API}/admin/zones/${zoneId}`, getAuthHeaders());
      toast({
        title: language === "ar" ? "تم الحذف" : "Deleted",
        description: language === "ar" ? "تم حذف المنطقة بنجاح" : "Zone deleted successfully",
      });
      fetchZones();
    } catch (error) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.response?.data?.detail || "Failed to delete zone",
        variant: "destructive",
      });
    }
  };

  const resetZoneForm = () => {
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
    setEditingZone(null);
    setCurrentPolygon([]);
    setDrawMode(false);
  };

  // Calculate distance between two points
  const getDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  // Convert screen coordinates to percentage
  const screenToPercent = (clientX, clientY) => {
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
  };

  // Canvas click handler - add point
  const handleCanvasClick = (e) => {
    if (!drawMode || !canvasRef.current) return;
    
    const point = screenToPercent(e.clientX, e.clientY);
    
    // Check if near start point (to close polygon)
    if (currentPolygon.length >= 3) {
      const startPoint = currentPolygon[0];
      const distance = getDistance(point, startPoint);
      
      if (distance < SNAP_DISTANCE) {
        // Close the polygon - open save dialog
        setShowZoneDialog(true);
        setDrawMode(false);
        return;
      }
    }
    
    // Add new point
    setCurrentPolygon((prev) => [...prev, point]);
  };

  // Mouse move handler - track cursor and check proximity to start
  const handleCanvasMouseMove = (e) => {
    if (!canvasRef.current) return;
    
    const point = screenToPercent(e.clientX, e.clientY);
    setCursorPosition(point);
    
    // Check if near start point
    if (drawMode && currentPolygon.length >= 3) {
      const startPoint = currentPolygon[0];
      const distance = getDistance(point, startPoint);
      setNearStartPoint(distance < SNAP_DISTANCE);
    } else {
      setNearStartPoint(false);
    }
    
    // Handle panning
    if (isPanning && !drawMode) {
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  // Mouse down for panning
  const handleMouseDown = (e) => {
    if (drawMode) return;
    if (e.button === 0) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Wheel handler for zoom
  const handleWheel = (e) => {
    if (!containerRef.current) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
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

  const handleUndoPoint = () => {
    setCurrentPolygon((prev) => prev.slice(0, -1));
    setNearStartPoint(false);
  };

  const handleClearPolygon = () => {
    setCurrentPolygon([]);
    setNearStartPoint(false);
  };

  const getPolygonPath = (points, close = false) => {
    if (!points || points.length < 2) return "";
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return close && points.length > 2 ? path + " Z" : path;
  };

  // Bulk update crowd data
  const [bulkUpdates, setBulkUpdates] = useState([]);

  const handleBulkUpdate = async () => {
    try {
      // Update each zone individually
      for (const update of bulkUpdates) {
        await axios.put(
          `${API}/admin/zones/${update.zone_id}`,
          { current_crowd: update.current_crowd },
          getAuthHeaders()
        );
      }
      toast({
        title: language === "ar" ? "تم التحديث" : "Updated",
        description: language === "ar" ? "تم تحديث بيانات الكثافة بنجاح" : "Crowd data updated successfully",
      });
      setBulkUpdates([]);
      fetchZones();
    } catch (error) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.response?.data?.detail || "Failed to update",
        variant: "destructive",
      });
    }
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchFloors}>
            <RefreshCw className="w-4 h-4 ml-2" />
            {language === "ar" ? "تحديث" : "Refresh"}
          </Button>
        </div>
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
                    <img
                      src={floor.image_url}
                      alt={floor.name_ar}
                      className="w-full h-32 object-cover rounded-md mb-3"
                    />
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedFloor(floor)}
                    >
                      <Eye className="w-4 h-4 ml-1" />
                      {language === "ar" ? "عرض" : "View"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingFloor(floor);
                        setFloorForm({
                          name_ar: floor.name_ar,
                          name_en: floor.name_en,
                          floor_number: floor.floor_number,
                          image_url: floor.image_url,
                          order: floor.order,
                        });
                        setShowFloorDialog(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFloor(floor.id)}
                    >
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

        {/* Zones Tab - Enhanced with zoom and precise drawing */}
        <TabsContent value="zones" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Select
                value={selectedFloor?.id || ""}
                onValueChange={(val) => {
                  setSelectedFloor(floors.find((f) => f.id === val));
                  setCurrentPolygon([]);
                  setDrawMode(false);
                }}
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
              <span className="text-sm text-muted-foreground">
                {zones.length} {language === "ar" ? "منطقة" : "zones"}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs w-14 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleResetView} title="Reset View">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                variant={drawMode ? "default" : "outline"}
                onClick={() => {
                  setDrawMode(!drawMode);
                  if (!drawMode) {
                    setCurrentPolygon([]);
                    setNearStartPoint(false);
                  }
                }}
                disabled={!selectedFloor}
              >
                <MousePointer className="w-4 h-4 ml-2" />
                {drawMode
                  ? language === "ar" ? "إيقاف الرسم" : "Stop Drawing"
                  : language === "ar" ? "رسم منطقة" : "Draw Zone"}
              </Button>
              
              {drawMode && currentPolygon.length > 0 && (
                <>
                  <Button variant="outline" onClick={handleUndoPoint}>
                    <Undo2 className="w-4 h-4 ml-1" />
                    {language === "ar" ? "تراجع" : "Undo"}
                  </Button>
                  <Button variant="outline" onClick={handleClearPolygon}>
                    <X className="w-4 h-4 ml-1" />
                    {language === "ar" ? "مسح" : "Clear"}
                  </Button>
                </>
              )}
              
              {currentPolygon.length >= 3 && (
                <Button onClick={() => setShowZoneDialog(true)}>
                  <Check className="w-4 h-4 ml-2" />
                  {language === "ar" ? "حفظ المنطقة" : "Save Zone"}
                </Button>
              )}
            </div>
          </div>

          {/* Drawing instructions */}
          {drawMode && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <MousePointer className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {language === "ar" ? "وضع الرسم نشط" : "Drawing Mode Active"}
                </span>
              </div>
              <ul className="text-xs text-blue-600 mt-2 space-y-1 list-disc list-inside">
                <li>{language === "ar" ? "انقر لإضافة نقطة جديدة" : "Click to add a new point"}</li>
                <li>{language === "ar" ? "استخدم عجلة الماوس للتكبير والتصغير" : "Use mouse wheel to zoom in/out"}</li>
                <li>{language === "ar" ? "عند الانتهاء، انقر على النقطة الأولى لإغلاق المنطقة" : "When done, click on the first point to close the zone"}</li>
                <li>{language === "ar" ? `النقاط الحالية: ${currentPolygon.length}` : `Current points: ${currentPolygon.length}`}</li>
              </ul>
            </div>
          )}

          {/* Map Canvas - Enhanced */}
          {selectedFloor ? (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div
                  ref={containerRef}
                  className={`relative w-full bg-gray-100 overflow-hidden ${
                    drawMode ? "cursor-crosshair" : isPanning ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  style={{ height: "600px" }}
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div
                    ref={canvasRef}
                    className="absolute inset-0 transition-transform duration-100"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                      transformOrigin: "center center",
                    }}
                    onClick={handleCanvasClick}
                    onMouseMove={handleCanvasMouseMove}
                  >
                    <img
                      src={selectedFloor.image_url}
                      alt={selectedFloor.name_ar}
                      className="w-full h-full object-contain pointer-events-none select-none"
                      draggable={false}
                    />

                    {/* Existing Zones */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {zones.map((zone) => (
                        <g key={zone.id}>
                          <path
                            d={getPolygonPath(zone.polygon_points, true)}
                            fill={zone.fill_color}
                            fillOpacity={zone.opacity}
                            stroke={zone.stroke_color}
                            strokeWidth={0.3 / zoom}
                            style={{ pointerEvents: drawMode ? "none" : "auto", cursor: drawMode ? "crosshair" : "pointer" }}
                            onClick={(e) => {
                              if (!drawMode) {
                                e.stopPropagation();
                                setSelectedZone(zone);
                              }
                            }}
                          />
                          <text
                            x={zone.polygon_points?.length > 0 ? zone.polygon_points.reduce((s, p) => s + p.x, 0) / zone.polygon_points.length : 0}
                            y={zone.polygon_points?.length > 0 ? zone.polygon_points.reduce((s, p) => s + p.y, 0) / zone.polygon_points.length : 0}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={2 / zoom}
                            fill="#000"
                            fontWeight="bold"
                            style={{ pointerEvents: "none" }}
                          >
                            {zone.zone_code}
                          </text>
                        </g>
                      ))}

                      {/* Current drawing polygon */}
                      {drawMode && currentPolygon.length > 0 && (
                        <>
                          {/* Lines */}
                          <path
                            d={getPolygonPath(currentPolygon, false)}
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth={0.4 / zoom}
                            strokeDasharray={`${1 / zoom} ${0.5 / zoom}`}
                          />
                          
                          {/* Preview line to cursor */}
                          {currentPolygon.length > 0 && (
                            <line
                              x1={currentPolygon[currentPolygon.length - 1].x}
                              y1={currentPolygon[currentPolygon.length - 1].y}
                              x2={cursorPosition.x}
                              y2={cursorPosition.y}
                              stroke="#fbbf24"
                              strokeWidth={0.2 / zoom}
                              strokeDasharray={`${0.5 / zoom} ${0.3 / zoom}`}
                              opacity={0.6}
                            />
                          )}
                          
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
                              r={i === 0 && nearStartPoint ? 1.2 / zoom : 0.8 / zoom}
                              fill={i === 0 ? (nearStartPoint ? "#22c55e" : "#ef4444") : "#fbbf24"}
                              stroke="#000"
                              strokeWidth={0.15 / zoom}
                              className={i === 0 && nearStartPoint ? "animate-pulse" : ""}
                            />
                          ))}
                          
                          {/* Point numbers */}
                          {currentPolygon.map((point, i) => (
                            <text
                              key={`num-${i}`}
                              x={point.x + 1.5 / zoom}
                              y={point.y - 1 / zoom}
                              fontSize={1.5 / zoom}
                              fill="#000"
                              fontWeight="bold"
                            >
                              {i + 1}
                            </text>
                          ))}
                        </>
                      )}
                    </svg>
                  </div>

                  {/* Coordinates display */}
                  {drawMode && (
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono">
                      X: {cursorPosition.x.toFixed(1)}% | Y: {cursorPosition.y.toFixed(1)}%
                      {nearStartPoint && (
                        <span className="text-green-400 mr-2"> • انقر للإغلاق</span>
                      )}
                    </div>
                  )}

                  {/* Zoom indicator */}
                  <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    {Math.round(zoom * 100)}%
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {language === "ar" ? "الرجاء اختيار طابق لعرض المناطق" : "Please select a floor to view zones"}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {zones.map((zone) => (
                    <div
                      key={zone.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedZone?.id === zone.id ? "border-primary bg-primary/5" : "hover:border-gray-300"}`}
                      onClick={() => setSelectedZone(zone)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: zone.fill_color }}
                          />
                          <span className="font-medium text-sm">{zone.zone_code}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingZone(zone);
                              setZoneForm({
                                zone_code: zone.zone_code,
                                name_ar: zone.name_ar,
                                name_en: zone.name_en,
                                zone_type: zone.zone_type,
                                fill_color: zone.fill_color,
                                stroke_color: zone.stroke_color,
                                opacity: zone.opacity,
                                max_capacity: zone.max_capacity,
                                description_ar: zone.description_ar || "",
                                description_en: zone.description_en || "",
                              });
                              setShowZoneDialog(true);
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteZone(zone.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {language === "ar" ? zone.name_ar : zone.name_en}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {zone.polygon_points?.length || 0} {language === "ar" ? "نقطة" : "points"}
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
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: zone.fill_color }}
                          />
                          <span className="font-medium">{zone.zone_code}</span>
                          <span className="text-xs text-muted-foreground">
                            ({language === "ar" ? zone.name_ar : zone.name_en})
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">
                              {language === "ar" ? "العدد الحالي" : "Current Crowd"}
                            </Label>
                            <Input
                              type="number"
                              defaultValue={zone.current_crowd || 0}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                setBulkUpdates((prev) => {
                                  const existing = prev.find((u) => u.zone_id === zone.id);
                                  if (existing) {
                                    return prev.map((u) =>
                                      u.zone_id === zone.id ? { ...u, current_crowd: value } : u
                                    );
                                  }
                                  return [...prev, { zone_id: zone.id, current_crowd: value }];
                                });
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {language === "ar" ? "الحد الأقصى:" : "Max:"} {zone.max_capacity}
                            </span>
                            <span>
                              {language === "ar" ? "الإشغال:" : "Occupancy:"} {zone.percentage || 0}%
                            </span>
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
                  {language === "ar" ? "اختر طابقاً لتحديث بيانات الكثافة" : "Select a floor to update crowd data"}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floor Dialog - Enhanced with upload */}
      <Dialog open={showFloorDialog} onOpenChange={setShowFloorDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {editingFloor
                ? language === "ar" ? "تعديل الطابق" : "Edit Floor"
                : language === "ar" ? "إضافة طابق جديد" : "Add New Floor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === "ar" ? "الاسم بالعربية" : "Name (Arabic)"}</Label>
                <Input
                  value={floorForm.name_ar}
                  onChange={(e) => setFloorForm({ ...floorForm, name_ar: e.target.value })}
                  placeholder="مثال: دور البدروم"
                />
              </div>
              <div>
                <Label>{language === "ar" ? "الاسم بالإنجليزية" : "Name (English)"}</Label>
                <Input
                  value={floorForm.name_en}
                  onChange={(e) => setFloorForm({ ...floorForm, name_en: e.target.value })}
                  placeholder="e.g., Basement Floor"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === "ar" ? "رقم الطابق" : "Floor Number"}</Label>
                <Input
                  type="number"
                  value={floorForm.floor_number}
                  onChange={(e) => setFloorForm({ ...floorForm, floor_number: parseInt(e.target.value) || 0 })}
                  placeholder="-1, 0, 1, 2..."
                />
              </div>
              <div>
                <Label>{language === "ar" ? "الترتيب" : "Order"}</Label>
                <Input
                  type="number"
                  value={floorForm.order}
                  onChange={(e) => setFloorForm({ ...floorForm, order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "صورة الخريطة" : "Map Image"}</Label>
              
              {/* Upload button */}
              <div className="flex gap-2">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={(e) => e.currentTarget.parentElement.querySelector('input').click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <>
                        <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                        {language === "ar" ? "جاري الرفع..." : "Uploading..."}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 ml-2" />
                        {language === "ar" ? "رفع صورة" : "Upload Image"}
                      </>
                    )}
                  </Button>
                </label>
              </div>
              
              {/* Upload progress */}
              {uploadingImage && (
                <div className="space-y-1">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
                </div>
              )}
              
              {/* Or enter URL */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {language === "ar" ? "أو أدخل رابط" : "or enter URL"}
                  </span>
                </div>
              </div>
              
              <Input
                value={floorForm.image_url}
                onChange={(e) => setFloorForm({ ...floorForm, image_url: e.target.value })}
                placeholder="https://..."
                dir="ltr"
              />
            </div>
            
            {/* Image preview */}
            {floorForm.image_url && (
              <div className="relative">
                <img
                  src={floorForm.image_url}
                  alt="Preview"
                  className="w-full h-40 object-contain rounded border bg-gray-50"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => setFloorForm({ ...floorForm, image_url: "" })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFloorDialog(false)}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSaveFloor} disabled={!floorForm.name_ar || !floorForm.image_url}>
              <Save className="w-4 h-4 ml-2" />
              {language === "ar" ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={(open) => {
        setShowZoneDialog(open);
        if (!open && !editingZone) {
          // Don't clear polygon when closing if editing
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {editingZone
                ? language === "ar" ? "تعديل المنطقة" : "Edit Zone"
                : language === "ar" ? "حفظ المنطقة الجديدة" : "Save New Zone"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === "ar" ? "كود المنطقة" : "Zone Code"}</Label>
                <Input
                  value={zoneForm.zone_code}
                  onChange={(e) => setZoneForm({ ...zoneForm, zone_code: e.target.value })}
                  placeholder="مثال: 1-0-2"
                />
              </div>
              <div>
                <Label>{language === "ar" ? "نوع المنطقة" : "Zone Type"}</Label>
                <Select
                  value={zoneForm.zone_type}
                  onValueChange={(val) => {
                    const type = ZONE_TYPES.find((t) => t.value === val);
                    setZoneForm({
                      ...zoneForm,
                      zone_type: val,
                      fill_color: type?.color || zoneForm.fill_color,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Input
                  value={zoneForm.name_ar}
                  onChange={(e) => setZoneForm({ ...zoneForm, name_ar: e.target.value })}
                  placeholder="مثال: مصلى رجال 1"
                />
              </div>
              <div>
                <Label>{language === "ar" ? "الاسم بالإنجليزية" : "Name (English)"}</Label>
                <Input
                  value={zoneForm.name_en}
                  onChange={(e) => setZoneForm({ ...zoneForm, name_en: e.target.value })}
                  placeholder="e.g., Men Prayer 1"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{language === "ar" ? "لون التعبئة" : "Fill Color"}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={zoneForm.fill_color}
                    onChange={(e) => setZoneForm({ ...zoneForm, fill_color: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={zoneForm.fill_color}
                    onChange={(e) => setZoneForm({ ...zoneForm, fill_color: e.target.value })}
                    className="flex-1"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <Label>{language === "ar" ? "لون الحد" : "Stroke Color"}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={zoneForm.stroke_color}
                    onChange={(e) => setZoneForm({ ...zoneForm, stroke_color: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={zoneForm.stroke_color}
                    onChange={(e) => setZoneForm({ ...zoneForm, stroke_color: e.target.value })}
                    className="flex-1"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <Label>{language === "ar" ? "الشفافية" : "Opacity"}</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={zoneForm.opacity}
                  onChange={(e) => setZoneForm({ ...zoneForm, opacity: parseFloat(e.target.value) || 0.4 })}
                />
              </div>
            </div>
            <div>
              <Label>{language === "ar" ? "السعة القصوى" : "Max Capacity"}</Label>
              <Input
                type="number"
                value={zoneForm.max_capacity}
                onChange={(e) => setZoneForm({ ...zoneForm, max_capacity: parseInt(e.target.value) || 1000 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === "ar" ? "الوصف بالعربية" : "Description (Arabic)"}</Label>
                <Input
                  value={zoneForm.description_ar}
                  onChange={(e) => setZoneForm({ ...zoneForm, description_ar: e.target.value })}
                />
              </div>
              <div>
                <Label>{language === "ar" ? "الوصف بالإنجليزية" : "Description (English)"}</Label>
                <Input
                  value={zoneForm.description_en}
                  onChange={(e) => setZoneForm({ ...zoneForm, description_en: e.target.value })}
                />
              </div>
            </div>
            {!editingZone && currentPolygon.length > 0 && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 font-medium">
                  {language === "ar"
                    ? `✓ تم رسم ${currentPolygon.length} نقطة`
                    : `✓ ${currentPolygon.length} points drawn`}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowZoneDialog(false); if (!editingZone) resetZoneForm(); }}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSaveZone} disabled={!zoneForm.zone_code || !zoneForm.name_ar}>
              <Save className="w-4 h-4 ml-2" />
              {language === "ar" ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
