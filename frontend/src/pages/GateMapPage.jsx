import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Plus, Trash2, Save, X, Upload, Layers, Eye, RefreshCw, ZoomIn, ZoomOut,
  Maximize2, MapPin, DoorOpen, DoorClosed, Wrench, ArrowUpRight, ArrowDownRight,
  ArrowLeftRight, Edit2, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import { Progress } from "@/components/ui/progress";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const GATE_TYPES = [
  { value: "main", label_ar: "رئيسي", label_en: "Main" },
  { value: "secondary", label_ar: "فرعي", label_en: "Secondary" },
  { value: "escalator", label_ar: "سلم كهربائي", label_en: "Escalator" },
  { value: "elevator", label_ar: "مصعد", label_en: "Elevator" },
  { value: "stairs", label_ar: "درج", label_en: "Stairs" },
  { value: "bridge", label_ar: "جسر", label_en: "Bridge" },
  { value: "wheelchair", label_ar: "عربات", label_en: "Wheelchair" },
  { value: "emergency", label_ar: "طوارئ", label_en: "Emergency" },
];

const DIRECTIONS = [
  { value: "entry", label_ar: "دخول", label_en: "Entry", icon: ArrowDownRight },
  { value: "exit", label_ar: "خروج", label_en: "Exit", icon: ArrowUpRight },
  { value: "both", label_ar: "دخول وخروج", label_en: "Both", icon: ArrowLeftRight },
];

const CLASSIFICATIONS = [
  { value: "general", label_ar: "عام", label_en: "General" },
  { value: "men", label_ar: "رجال", label_en: "Men" },
  { value: "women", label_ar: "نساء", label_en: "Women" },
  { value: "umrah", label_ar: "معتمرين", label_en: "Umrah" },
  { value: "worshippers", label_ar: "مصلين", label_en: "Worshippers" },
  { value: "emergency", label_ar: "طوارئ", label_en: "Emergency" },
  { value: "funeral", label_ar: "جنائز", label_en: "Funeral" },
  { value: "disabled", label_ar: "ذوي إعاقة", label_en: "Disabled" },
];

const STATUS_CONFIG = {
  open: { color: "#22c55e", label_ar: "مفتوح", label_en: "Open", icon: DoorOpen },
  closed: { color: "#ef4444", label_ar: "مغلق", label_en: "Closed", icon: DoorClosed },
  crowded: { color: "#f97316", label_ar: "مزدحم", label_en: "Crowded", icon: DoorOpen },
  maintenance: { color: "#6b7280", label_ar: "صيانة", label_en: "Maintenance", icon: Wrench },
};

export default function GateMapPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const mapContainerRef = useRef(null);
  const svgRef = useRef(null);

  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "map");
  const [imgRatio, setImgRatio] = useState(null);
  const [existingGates, setExistingGates] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Map state
  const zoomRef = useRef(1);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Interaction
  const [mode, setMode] = useState("view"); // view, place, edit
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [draggingMarker, setDraggingMarker] = useState(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Dialogs
  const [showFloorDialog, setShowFloorDialog] = useState(false);
  const [showMarkerDialog, setShowMarkerDialog] = useState(false);
  const [showEditMarkerDialog, setShowEditMarkerDialog] = useState(false);
  const [floorForm, setFloorForm] = useState({ name_ar: "", name_en: "", image_url: "", order: 0 });
  const [markerForm, setMarkerForm] = useState({ name_ar: "", name_en: "", gate_type: "main", direction: "both", classification: "general", max_flow: 5000 });
  const [editingMarker, setEditingMarker] = useState(null);
  const [pendingPoint, setPendingPoint] = useState(null);

  // Upload
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Daily logs removed - moved to DailyGateSessionsPage

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const normalizeImageUrl = (url) => {
    if (!url) return url;
    let v = url;
    if (v.includes(".preview.emergentagent.com") && !v.startsWith(process.env.REACT_APP_BACKEND_URL)) {
      const m = v.match(/\/(?:api\/)?uploads\/.+$/);
      if (m) v = `${process.env.REACT_APP_BACKEND_URL}${m[0].startsWith("/api") ? m[0] : "/api" + m[0]}`;
    }
    if (v.startsWith("/")) v = `${process.env.REACT_APP_BACKEND_URL}${v}`;
    else if (v.startsWith("uploads/")) v = `${process.env.REACT_APP_BACKEND_URL}/${v}`;
    if (v.includes("/uploads/") && !v.includes("/api/uploads/")) v = v.replace("/uploads/", "/api/uploads/");
    return v;
  };

  // Fetch
  const fetchFloors = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/gate-map/floors`);
      const normalized = res.data.map(f => ({ ...f, image_url: normalizeImageUrl(f.image_url) }));
      setFloors(normalized);
      // Preload images
      normalized.forEach(f => { if (f.image_url) { const img = new Image(); img.src = f.image_url; } });
      setSelectedFloor(prev => {
        if (prev) {
          const matched = normalized.find(f => f.id === prev.id);
          return matched || (normalized.length > 0 ? normalized[0] : null);
        }
        return normalized.length > 0 ? normalized[0] : null;
      });
    } catch (e) { console.error(e); }
  }, []);

  const fetchMarkers = useCallback(async () => {
    if (!selectedFloor) return;
    try {
      const res = await axios.get(`${API}/gate-map/markers?floor_id=${selectedFloor.id}`);
      setMarkers(res.data);
    } catch (e) { console.error(e); }
  }, [selectedFloor]);

  const fetchExistingGates = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/gates`, getAuthHeaders());
      setExistingGates(res.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/employees`, getAuthHeaders());
      setEmployees(res.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchFloors(); fetchExistingGates(); fetchEmployees(); }, [fetchFloors, fetchExistingGates, fetchEmployees]);
  useEffect(() => { if (selectedFloor) { fetchMarkers(); setImgRatio(null); } }, [selectedFloor, fetchMarkers]);

  // Map Arabic gate values to marker values
  const mapGateToMarker = (gate) => {
    const typeMap = { "رئيسي": "main", "فرعي": "secondary", "سلم كهربائي": "escalator", "مصعد": "elevator", "درج": "stairs", "جسر": "bridge", "عربات": "wheelchair", "طوارئ": "emergency" };
    const dirMap = { "دخول": "entry", "خروج": "exit", "دخول وخروج": "both" };
    const statusMap = { "مفتوح": "open", "متاح": "open", "مغلق": "closed", "مزدحم": "crowded", "صيانة": "maintenance", "متوسط": "crowded" };
    const classMap = { "عام": "general", "رجال": "men", "نساء": "women", "طوارئ": "emergency", "جنائز": "funeral", "خدمات": "general" };
    return {
      name_ar: gate.name || "",
      name_en: gate.name_en || "",
      gate_type: typeMap[gate.gate_type] || "main",
      direction: dirMap[gate.direction] || "both",
      classification: classMap[gate.classification] || "general",
      status: statusMap[gate.status] || statusMap[gate.current_indicator] || "open",
      current_flow: gate.current_flow || 0,
      max_flow: gate.max_flow || 5000,
      gate_id: gate.id,
    };
  };

  // SVG coordinate helper
  const getMousePercent = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const t = pt.matrixTransform(ctm.inverse());
    return { x: Math.max(0, Math.min(100, t.x)), y: Math.max(0, Math.min(100, t.y)) };
  };

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const container = mapContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.85 : 1.18;
    const prev = zoomRef.current;
    const nz = Math.max(0.5, Math.min(6, prev * factor));
    if (nz === prev) return;
    const s = nz / prev;
    zoomRef.current = nz;
    setZoom(nz);
    setPanOffset(p => ({ x: mx - s * (mx - p.x), y: my - s * (my - p.y) }));
  }, []);

  const prevNodeRef = useRef(null);
  const wheelRef = useCallback((node) => {
    if (prevNodeRef.current) {
      prevNodeRef.current.removeEventListener("wheel", handleWheel);
    }
    if (node) {
      node.addEventListener("wheel", handleWheel, { passive: false });
      mapContainerRef.current = node;
    }
    prevNodeRef.current = node;
  }, [handleWheel]);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Mouse handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (mode === "edit") {
      const pos = getMousePercent(e);
      // Find closest marker to drag
      let closest = null, minDist = 3;
      for (const m of markers) {
        const d = Math.hypot(m.x - pos.x, m.y - pos.y);
        if (d < minDist) { closest = m; minDist = d; }
      }
      if (closest) {
        setDraggingMarker(closest.id);
        setSelectedMarkerId(closest.id);
        return;
      }
    }
    if (mode === "view" || (mode === "edit" && !draggingMarker)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (draggingMarker) {
      const pos = getMousePercent(e);
      setMarkers(prev => prev.map(m => m.id === draggingMarker ? { ...m, x: pos.x, y: pos.y } : m));
      return;
    }
    // Hover
    const container = mapContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top - 10 });
    }
    const pos = getMousePercent(e);
    let found = null;
    for (const m of markers) {
      if (Math.hypot(m.x - pos.x, m.y - pos.y) < 2.5) { found = m.id; break; }
    }
    if (found !== hoveredMarkerId) setHoveredMarkerId(found);
  };

  const handleMouseUp = async () => {
    if (draggingMarker) {
      const m = markers.find(mk => mk.id === draggingMarker);
      if (m) {
        try {
          await axios.put(`${API}/admin/gate-map/markers/${m.id}`, { x: m.x, y: m.y }, getAuthHeaders());
        } catch (e) { fetchMarkers(); }
      }
    }
    setIsPanning(false);
    setDraggingMarker(null);
  };

  const handleMapClick = (e) => {
    if (isPanning || draggingMarker) return;
    e.preventDefault();
    const pos = getMousePercent(e);
    if (mode === "place") {
      setPendingPoint(pos);
      setShowMarkerDialog(true);
    } else if (mode === "edit") {
      let found = null;
      for (const m of markers) {
        if (Math.hypot(m.x - pos.x, m.y - pos.y) < 2.5) { found = m; break; }
      }
      setSelectedMarkerId(found?.id || null);
    }
  };

  // Save new marker
  const handleSaveMarker = async () => {
    if (!selectedFloor || !pendingPoint) return;
    try {
      const payload = { ...markerForm, floor_id: selectedFloor.id, x: pendingPoint.x, y: pendingPoint.y };
      if (!payload.gate_id) delete payload.gate_id;
      await axios.post(`${API}/admin/gate-map/markers`, payload, getAuthHeaders());
      toast({ title: language === "ar" ? "تم الإضافة" : "Added" });
      setShowMarkerDialog(false);
      setPendingPoint(null);
      setMarkerForm({ name_ar: "", name_en: "", gate_type: "main", direction: "both", classification: "general", max_flow: 5000, gate_id: null });
      fetchMarkers();
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  // Edit marker
  const openEditMarker = (marker) => { setEditingMarker({ ...marker }); setShowEditMarkerDialog(true); };

  const handleSaveEditMarker = async () => {
    if (!editingMarker) return;
    try {
      await axios.put(`${API}/admin/gate-map/markers/${editingMarker.id}`, editingMarker, getAuthHeaders());
      toast({ title: language === "ar" ? "تم الحفظ" : "Saved" });
      setShowEditMarkerDialog(false);
      setEditingMarker(null);
      fetchMarkers();
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const deleteMarker = async (id) => {
    try {
      await axios.delete(`${API}/admin/gate-map/markers/${id}`, getAuthHeaders());
      setMarkers(prev => prev.filter(m => m.id !== id));
      if (selectedMarkerId === id) setSelectedMarkerId(null);
      toast({ title: language === "ar" ? "تم الحذف" : "Deleted" });
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  // Floor CRUD
  const uploadImageFile = async (file) => {
    if (!file || (file.type && !file.type.startsWith("image/"))) return;
    setUploadingImage(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await axios.post(`${API}/admin/upload/map-image`, fd, { ...getAuthHeaders(), headers: { ...getAuthHeaders().headers, "Content-Type": "multipart/form-data" } });
      setFloorForm(p => ({ ...p, image_url: res.data.url }));
      toast({ title: language === "ar" ? "تم الرفع" : "Uploaded" });
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
    finally { setUploadingImage(false); }
  };

  const handleSaveFloor = async () => {
    try {
      await axios.post(`${API}/admin/gate-map/floors`, floorForm, getAuthHeaders());
      setShowFloorDialog(false);
      setFloorForm({ name_ar: "", name_en: "", image_url: "", order: 0 });
      fetchFloors();
      toast({ title: language === "ar" ? "تم الحفظ" : "Saved" });
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const deleteFloor = async (id) => {
    try {
      await axios.delete(`${API}/admin/gate-map/floors/${id}`, getAuthHeaders());
      if (selectedFloor?.id === id) setSelectedFloor(null);
      fetchFloors();
      toast({ title: language === "ar" ? "تم الحذف" : "Deleted" });
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  // Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") { setSelectedMarkerId(null); setMode("view"); setPendingPoint(null); } };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  // Resize
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const fn = () => forceUpdate(n => n + 1);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // Stats & helpers
  const getGateData = (marker) => marker.gate_id ? existingGates.find(g => g.id === marker.gate_id) : null;
  const getGateEmployees = (marker) => {
    const gate = getGateData(marker);
    if (!gate) return [];
    return employees.filter(e => e.location === gate.name || e.location === marker.name_ar);
  };
  const openGates = markers.filter(m => m.status === "open").length;
  const closedGates = markers.filter(m => m.status === "closed").length;
  const crowdedGates = markers.filter(m => m.status === "crowded").length;
  const totalFlow = markers.reduce((s, m) => s + (m.current_flow || 0), 0);
  const unstaffedOpen = markers.filter(m => m.status === "open" && getGateEmployees(m).length === 0).length;

  return (
    <div className="space-y-6" data-testid="gate-map-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-cairo font-bold text-2xl">{language === "ar" ? "إدارة خرائط الأبواب" : "Gate Map Management"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{language === "ar" ? "إدارة الطوابق ومواقع الأبواب على الخرائط" : "Manage floors and gate locations on maps"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => fetchFloors()} data-testid="refresh-btn"><RefreshCw className="w-4 h-4 ml-2" />{language === "ar" ? "تحديث" : "Refresh"}</Button>
          <Button onClick={() => { setFloorForm({ name_ar: "", name_en: "", image_url: "", order: 0 }); setShowFloorDialog(true); }} data-testid="add-gate-floor-btn">
            <Plus className="w-4 h-4 ml-2" />{language === "ar" ? "إضافة طابق" : "Add Floor"}
          </Button>
        </div>
      </div>

      {/* Floors Grid */}
      {floors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Layers className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="font-cairo font-semibold text-lg text-slate-500 mb-2">{language === "ar" ? "لا توجد طوابق بعد" : "No floors yet"}</h3>
            <p className="text-sm text-muted-foreground mb-4">{language === "ar" ? "أضف طابقاً وارفع صورة الخريطة لتبدأ بتحديد مواقع الأبواب" : "Add a floor and upload a map image to start placing gates"}</p>
            <Button onClick={() => { setFloorForm({ name_ar: "", name_en: "", image_url: "", order: 0 }); setShowFloorDialog(true); }}>
              <Plus className="w-4 h-4 ml-2" />{language === "ar" ? "إضافة طابق" : "Add Floor"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {floors.map(f => (
            <Card key={f.id} className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`floor-card-${f.id}`}>
              {f.image_url && (
                <div className="relative h-40 bg-slate-100">
                  <img src={f.image_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-[10px] bg-white/90 backdrop-blur-sm">
                      {language === "ar" ? `ترتيب: ${f.order || 0}` : `Order: ${f.order || 0}`}
                    </Badge>
                  </div>
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-cairo font-semibold text-base mb-1">{language === "ar" ? f.name_ar : f.name_en}</h3>
                {f.name_en && <p className="text-xs text-muted-foreground mb-3">{f.name_en}</p>}
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" className="text-xs" onClick={() => deleteFloor(f.id)}>
                    <Trash2 className="w-3.5 h-3.5 ml-1" />{language === "ar" ? "حذف" : "Delete"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Floor Dialog */}
      <Dialog open={showFloorDialog} onOpenChange={setShowFloorDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{language === "ar" ? "إضافة طابق" : "Add Floor"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{language === "ar" ? "الاسم بالعربية" : "Arabic"}</Label><Input value={floorForm.name_ar} onChange={e => setFloorForm(p => ({ ...p, name_ar: e.target.value }))} data-testid="gate-floor-name-ar" /></div>
              <div><Label>{language === "ar" ? "الاسم بالإنجليزية" : "English"}</Label><Input value={floorForm.name_en} onChange={e => setFloorForm(p => ({ ...p, name_en: e.target.value }))} data-testid="gate-floor-name-en" /></div>
            </div>
            <div><Label>{language === "ar" ? "الترتيب" : "Order"}</Label><Input type="number" value={floorForm.order} onChange={e => setFloorForm(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} /></div>
            <div>
              <Label>{language === "ar" ? "الصورة" : "Image"}</Label>
              <label className={`mt-2 block rounded-lg border-2 border-dashed p-4 text-center transition ${isDragOver ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); uploadImageFile(e.dataTransfer.files?.[0]); }}>
                <input type="file" accept="image/*" onChange={(e) => { uploadImageFile(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-slate-500" />
                  <p className="text-sm text-slate-600">{language === "ar" ? "اسحب الصورة هنا أو" : "Drag & drop or"}</p>
                  <Button type="button" variant="outline" className="w-full" disabled={uploadingImage}>{uploadingImage ? "..." : (language === "ar" ? "اختر صورة" : "Browse")}</Button>
                </div>
              </label>
              <Input value={floorForm.image_url} onChange={e => setFloorForm(p => ({ ...p, image_url: e.target.value }))} placeholder="URL" className="mt-2" dir="ltr" />
              {floorForm.image_url && <img src={normalizeImageUrl(floorForm.image_url)} alt="" className="w-full h-24 object-contain rounded border mt-2" />}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFloorDialog(false)}>{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveFloor} disabled={!floorForm.name_ar || !floorForm.image_url}><Save className="w-4 h-4 ml-2" />{language === "ar" ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Marker Dialog */}
      <Dialog open={showMarkerDialog} onOpenChange={(o) => { if (!o) { setShowMarkerDialog(false); setPendingPoint(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" />{language === "ar" ? "إضافة باب على الخريطة" : "Place Gate on Map"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Link to existing gate */}
            <div>
              <Label className="text-xs font-medium">{language === "ar" ? "ربط بباب من القائمة" : "Link to existing gate"}</Label>
              <Select value={markerForm.gate_id || "_manual"} onValueChange={v => {
                if (v === "_manual") {
                  setMarkerForm({ name_ar: "", name_en: "", gate_type: "main", direction: "both", classification: "general", max_flow: 5000, gate_id: null });
                } else {
                  const gate = existingGates.find(g => g.id === v);
                  if (gate) setMarkerForm(mapGateToMarker(gate));
                }
              }}>
                <SelectTrigger data-testid="gate-link-select"><SelectValue placeholder={language === "ar" ? "اختر باب أو أضف يدوي" : "Select gate or add manually"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_manual">{language === "ar" ? "إدخال يدوي (باب جديد)" : "Manual entry (new gate)"}</SelectItem>
                  {existingGates.filter(g => !markers.some(m => m.gate_id === g.id)).map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} {g.number ? `(${g.number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {markerForm.gate_id && (
                <div className="mt-2 p-2 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
                  {language === "ar" ? "مرتبط بقائمة الأبواب - البيانات ستتحدث تلقائياً" : "Linked to gates list - data syncs automatically"}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs">{language === "ar" ? "اسم الباب" : "Name"}</Label><Input value={markerForm.name_ar} onChange={e => setMarkerForm(p => ({ ...p, name_ar: e.target.value }))} data-testid="gate-marker-name" /></div>
              <div><Label className="text-xs">{language === "ar" ? "الاسم بالإنجليزية" : "English"}</Label><Input value={markerForm.name_en} onChange={e => setMarkerForm(p => ({ ...p, name_en: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label className="text-xs">{language === "ar" ? "النوع" : "Type"}</Label>
                <Select value={markerForm.gate_type} onValueChange={v => setMarkerForm(p => ({ ...p, gate_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{language === "ar" ? t.label_ar : t.label_en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">{language === "ar" ? "الاتجاه" : "Direction"}</Label>
                <Select value={markerForm.direction} onValueChange={v => setMarkerForm(p => ({ ...p, direction: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{language === "ar" ? d.label_ar : d.label_en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">{language === "ar" ? "التصنيف" : "Class"}</Label>
                <Select value={markerForm.classification} onValueChange={v => setMarkerForm(p => ({ ...p, classification: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLASSIFICATIONS.map(c => <SelectItem key={c.value} value={c.value}>{language === "ar" ? c.label_ar : c.label_en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">{language === "ar" ? "أقصى تدفق" : "Max Flow"}</Label><Input type="number" value={markerForm.max_flow} onChange={e => setMarkerForm(p => ({ ...p, max_flow: parseInt(e.target.value) || 5000 }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowMarkerDialog(false); setPendingPoint(null); }}>{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveMarker} disabled={!markerForm.name_ar}><Save className="w-4 h-4 ml-2" />{language === "ar" ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Marker Dialog */}
      <Dialog open={showEditMarkerDialog} onOpenChange={(o) => { if (!o) { setShowEditMarkerDialog(false); setEditingMarker(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit2 className="w-5 h-5" />{language === "ar" ? "تعديل بيانات الباب" : "Edit Gate"}</DialogTitle>
          </DialogHeader>
          {editingMarker && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: (STATUS_CONFIG[editingMarker.status] || STATUS_CONFIG.open).color, backgroundColor: `${(STATUS_CONFIG[editingMarker.status] || STATUS_CONFIG.open).color}10` }}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: (STATUS_CONFIG[editingMarker.status] || STATUS_CONFIG.open).color }}>
                  <DoorOpen className="w-4 h-4 text-white" />
                </span>
                <div>
                  <p className="font-bold text-sm">{editingMarker.name_ar}</p>
                  <p className="text-xs text-muted-foreground">{language === "ar" ? (STATUS_CONFIG[editingMarker.status] || STATUS_CONFIG.open).label_ar : (STATUS_CONFIG[editingMarker.status] || STATUS_CONFIG.open).label_en}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">{language === "ar" ? "اسم الباب" : "Name"}</Label><Input value={editingMarker.name_ar} onChange={e => setEditingMarker(p => ({ ...p, name_ar: e.target.value }))} /></div>
                <div><Label className="text-xs">{language === "ar" ? "الحالة" : "Status"}</Label>
                  <Select value={editingMarker.status} onValueChange={v => setEditingMarker(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{language === "ar" ? v.label_ar : v.label_en}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs">{language === "ar" ? "النوع" : "Type"}</Label>
                  <Select value={editingMarker.gate_type} onValueChange={v => setEditingMarker(p => ({ ...p, gate_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{language === "ar" ? t.label_ar : t.label_en}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">{language === "ar" ? "الاتجاه" : "Direction"}</Label>
                  <Select value={editingMarker.direction} onValueChange={v => setEditingMarker(p => ({ ...p, direction: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{language === "ar" ? d.label_ar : d.label_en}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">{language === "ar" ? "التصنيف" : "Class"}</Label>
                  <Select value={editingMarker.classification} onValueChange={v => setEditingMarker(p => ({ ...p, classification: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CLASSIFICATIONS.map(c => <SelectItem key={c.value} value={c.value}>{language === "ar" ? c.label_ar : c.label_en}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">{language === "ar" ? "التدفق الحالي" : "Current Flow"}</Label><Input type="number" value={editingMarker.current_flow ?? 0} onChange={e => setEditingMarker(p => ({ ...p, current_flow: parseInt(e.target.value) || 0 }))} /></div>
                <div><Label className="text-xs">{language === "ar" ? "أقصى تدفق" : "Max Flow"}</Label><Input type="number" value={editingMarker.max_flow ?? 5000} onChange={e => setEditingMarker(p => ({ ...p, max_flow: parseInt(e.target.value) || 5000 }))} /></div>
              </div>
              {/* Link info */}
              {editingMarker.gate_id ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="text-xs text-emerald-700">
                    <span className="font-medium">{language === "ar" ? "مرتبط بـ:" : "Linked to:"} </span>
                    {existingGates.find(g => g.id === editingMarker.gate_id)?.name || editingMarker.gate_id}
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                    const gate = existingGates.find(g => g.id === editingMarker.gate_id);
                    if (gate) { const mapped = mapGateToMarker(gate); setEditingMarker(p => ({ ...p, ...mapped })); }
                  }}><RefreshCw className="w-3 h-3 ml-1" />{language === "ar" ? "مزامنة" : "Sync"}</Button>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  {language === "ar" ? "غير مرتبط بقائمة الأبواب (إدخال يدوي)" : "Not linked (manual entry)"}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditMarkerDialog(false); setEditingMarker(null); }}>{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSaveEditMarker}><Save className="w-4 h-4 ml-2" />{language === "ar" ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
