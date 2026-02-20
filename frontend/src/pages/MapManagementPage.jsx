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
  ChevronDown,
  Palette,
  Move,
  Maximize2
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
  DialogTrigger,
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

export default function MapManagementPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

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

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [drawMode, setDrawMode] = useState(false);

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

  // Canvas drawing handlers
  const handleCanvasClick = (e) => {
    if (!drawMode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setCurrentPolygon((prev) => [...prev, { x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) }]);
  };

  const handleUndoPoint = () => {
    setCurrentPolygon((prev) => prev.slice(0, -1));
  };

  const handleClearPolygon = () => {
    setCurrentPolygon([]);
  };

  const getPolygonPath = (points) => {
    if (!points || points.length < 2) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + (points.length > 2 ? " Z" : "");
  };

  // Bulk update crowd data
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false);
  const [bulkUpdates, setBulkUpdates] = useState([]);

  const handleBulkUpdate = async () => {
    try {
      await axios.put(`${API}/admin/zones/bulk-update-crowd`, bulkUpdates, getAuthHeaders());
      toast({
        title: language === "ar" ? "تم التحديث" : "Updated",
        description: language === "ar" ? "تم تحديث بيانات الكثافة بنجاح" : "Crowd data updated successfully",
      });
      setShowBulkUpdateDialog(false);
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

        {/* Zones Tab */}
        <TabsContent value="zones" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
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
              <span className="text-sm text-muted-foreground">
                {zones.length} {language === "ar" ? "منطقة" : "zones"}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant={drawMode ? "default" : "outline"}
                onClick={() => {
                  setDrawMode(!drawMode);
                  if (!drawMode) setCurrentPolygon([]);
                }}
                disabled={!selectedFloor}
              >
                <MapPin className="w-4 h-4 ml-2" />
                {drawMode
                  ? language === "ar" ? "إيقاف الرسم" : "Stop Drawing"
                  : language === "ar" ? "رسم منطقة" : "Draw Zone"}
              </Button>
              {drawMode && currentPolygon.length >= 3 && (
                <Button onClick={() => setShowZoneDialog(true)}>
                  <Save className="w-4 h-4 ml-2" />
                  {language === "ar" ? "حفظ المنطقة" : "Save Zone"}
                </Button>
              )}
            </div>
          </div>

          {/* Map Canvas */}
          {selectedFloor ? (
            <Card>
              <CardContent className="p-0">
                <div
                  ref={canvasRef}
                  className={`relative w-full bg-gray-100 overflow-hidden ${drawMode ? "cursor-crosshair" : "cursor-default"}`}
                  style={{ height: "500px" }}
                  onClick={handleCanvasClick}
                >
                  <img
                    ref={imageRef}
                    src={selectedFloor.image_url}
                    alt={selectedFloor.name_ar}
                    className="w-full h-full object-contain pointer-events-none"
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
                          d={getPolygonPath(zone.polygon_points)}
                          fill={zone.fill_color}
                          fillOpacity={zone.opacity}
                          stroke={zone.stroke_color}
                          strokeWidth="0.2"
                          style={{ pointerEvents: "auto", cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!drawMode) {
                              setSelectedZone(zone);
                            }
                          }}
                        />
                        <text
                          x={zone.polygon_points?.length > 0 ? zone.polygon_points.reduce((s, p) => s + p.x, 0) / zone.polygon_points.length : 0}
                          y={zone.polygon_points?.length > 0 ? zone.polygon_points.reduce((s, p) => s + p.y, 0) / zone.polygon_points.length : 0}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="2"
                          fill="#000"
                          fontWeight="bold"
                        >
                          {zone.zone_code}
                        </text>
                      </g>
                    ))}

                    {/* Current drawing polygon */}
                    {drawMode && currentPolygon.length > 0 && (
                      <>
                        <path
                          d={getPolygonPath(currentPolygon)}
                          fill={zoneForm.fill_color}
                          fillOpacity={0.3}
                          stroke="#fbbf24"
                          strokeWidth="0.3"
                          strokeDasharray="1 0.5"
                        />
                        {currentPolygon.map((point, i) => (
                          <circle
                            key={i}
                            cx={point.x}
                            cy={point.y}
                            r="0.8"
                            fill="#fbbf24"
                            stroke="#000"
                            strokeWidth="0.1"
                          />
                        ))}
                      </>
                    )}
                  </svg>
                </div>

                {/* Drawing controls */}
                {drawMode && (
                  <div className="p-3 bg-yellow-50 border-t flex items-center gap-4">
                    <span className="text-sm">
                      {language === "ar" ? `النقاط: ${currentPolygon.length}` : `Points: ${currentPolygon.length}`}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleUndoPoint} disabled={currentPolygon.length === 0}>
                      {language === "ar" ? "تراجع" : "Undo"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearPolygon} disabled={currentPolygon.length === 0}>
                      {language === "ar" ? "مسح الكل" : "Clear All"}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {language === "ar" ? "اضغط على الخريطة لإضافة نقاط. 3 نقاط على الأقل لحفظ المنطقة." : "Click on the map to add points. At least 3 points to save."}
                    </span>
                  </div>
                )}
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

      {/* Floor Dialog */}
      <Dialog open={showFloorDialog} onOpenChange={setShowFloorDialog}>
        <DialogContent>
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
            <div>
              <Label>{language === "ar" ? "رابط الصورة" : "Image URL"}</Label>
              <Input
                value={floorForm.image_url}
                onChange={(e) => setFloorForm({ ...floorForm, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            {floorForm.image_url && (
              <img
                src={floorForm.image_url}
                alt="Preview"
                className="w-full h-32 object-contain rounded border"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFloorDialog(false)}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSaveFloor}>
              <Save className="w-4 h-4 ml-2" />
              {language === "ar" ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {editingZone
                ? language === "ar" ? "تعديل المنطقة" : "Edit Zone"
                : language === "ar" ? "إضافة منطقة جديدة" : "Add New Zone"}
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
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  {language === "ar"
                    ? `تم رسم ${currentPolygon.length} نقطة`
                    : `${currentPolygon.length} points drawn`}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowZoneDialog(false); resetZoneForm(); }}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSaveZone}>
              <Save className="w-4 h-4 ml-2" />
              {language === "ar" ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
