import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useRealtimeRefresh } from "@/context/WebSocketContext";
import {
  Plus, Trash2, Save, Upload, Layers, Edit2, Image as ImageIcon,
  ZoomIn, ZoomOut, Maximize2, Move, DoorOpen, DoorClosed, Wrench,
  ArrowUpRight, ArrowDownRight, ArrowLeftRight, Users, Crosshair,
  Check
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Progress } from "@/components/ui/progress";
import { toast as sonnerToast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  open: { color: "#22c55e", label_ar: "مفتوح", label_en: "Open", icon: DoorOpen },
  closed: { color: "#ef4444", label_ar: "مغلق", label_en: "Closed", icon: DoorClosed },
  crowded: { color: "#f97316", label_ar: "مزدحم", label_en: "Crowded", icon: DoorOpen },
  maintenance: { color: "#6b7280", label_ar: "صيانة", label_en: "Maintenance", icon: Wrench },
};

const DIRECTIONS_MAP = {
  entry: { label_ar: "دخول", label_en: "Entry" },
  exit: { label_ar: "خروج", label_en: "Exit" },
  both: { label_ar: "دخول وخروج", label_en: "Both" },
};

export default function GateMapPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const { canWrite } = useAuth();
  const canEditMaps = canWrite('manage_maps');

  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Floor dialog
  const [showFloorDialog, setShowFloorDialog] = useState(false);
  const [deleteFloorId, setDeleteFloorId] = useState(null);
  const [isDeletingFloor, setIsDeletingFloor] = useState(false);
  const [floorForm, setFloorForm] = useState({ name_ar: "", name_en: "", image_url: "", order: 0 });
  const [editingFloor, setEditingFloor] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localImagePreview, setLocalImagePreview] = useState(null);

  // Map interaction - Smart cursor (no mode toggle needed)
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [imgRatio, setImgRatio] = useState(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [draggingMarkerId, setDraggingMarkerId] = useState(null);
  const [hoveredMarker, setHoveredMarker] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const mapContainerRef = useRef(null);
  const svgRef = useRef(null);
  const hasDraggedRef = useRef(false);

  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

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

  const fetchFloors = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/gate-map/floors`);
      const normalized = res.data.map(f => ({ ...f, image_url: normalizeImageUrl(f.image_url) }));
      setFloors(normalized);
      normalized.forEach(f => { if (f.image_url) { const img = new Image(); img.src = f.image_url; } });
      if (!selectedFloor && normalized.length > 0) setSelectedFloor(normalized[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchMarkers = useCallback(async () => {
    if (!selectedFloor) return;
    try {
      const res = await axios.get(`${API}/gate-map/markers?floor_id=${selectedFloor.id}`);
      setMarkers(res.data);
    } catch (e) { console.error(e); }
  }, [selectedFloor]);

  useEffect(() => { fetchFloors(); }, [fetchFloors]);
  useRealtimeRefresh(["maps"], fetchFloors);
  useEffect(() => { if (selectedFloor) { fetchMarkers(); setSelectedMarkerId(null); } }, [selectedFloor, fetchMarkers]);
  useEffect(() => { return () => { if (localImagePreview) URL.revokeObjectURL(localImagePreview); }; }, [localImagePreview]);

  // Upload
  const uploadImageFile = async (file) => {
    if (!file || (file.type && !file.type.startsWith("image/"))) {
      toast({ title: isAr ? "نوع ملف غير مدعوم" : "Unsupported file", variant: "destructive" });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    if (localImagePreview) URL.revokeObjectURL(localImagePreview);
    setLocalImagePreview(previewUrl);
    setUploadingImage(true); setUploadProgress(0);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await axios.post(`${API}/admin/upload/map-image`, fd, {
        ...getAuthHeaders(), headers: { ...getAuthHeaders().headers, "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total))
      });
      setFloorForm(prev => ({ ...prev, image_url: res.data.url }));
      setLocalImagePreview(null);
      toast({ title: isAr ? "تم الرفع" : "Uploaded" });
    } catch (e) { toast({ title: isAr ? "تعذر الرفع" : "Error", variant: "destructive" }); }
    finally { setUploadingImage(false); setUploadProgress(0); }
  };

  const handleSaveFloor = async () => {
    try {
      if (editingFloor) {
        await axios.put(`${API}/admin/gate-map/floors/${editingFloor.id}`, floorForm, getAuthHeaders());
      } else {
        await axios.post(`${API}/admin/gate-map/floors`, floorForm, getAuthHeaders());
      }
      setShowFloorDialog(false); setFloorForm({ name_ar: "", name_en: "", image_url: "", order: 0 }); setEditingFloor(null);
      fetchFloors();
      toast({ title: isAr ? "تم الحفظ" : "Saved" });
    } catch (e) { toast({ title: isAr ? "تعذر الحفظ" : "Error", variant: "destructive" }); }
  };

  const handleDeleteFloor = async () => {
    if (!deleteFloorId) return;
    setIsDeletingFloor(true);
    try {
      await axios.delete(`${API}/admin/gate-map/floors/${deleteFloorId}`, getAuthHeaders());
      if (selectedFloor?.id === deleteFloorId) setSelectedFloor(null);
      fetchFloors();
      toast({ title: isAr ? "تم الحذف" : "Deleted" });
    } catch (e) { toast({ title: isAr ? "تعذر الحذف" : "Error", variant: "destructive" }); }
    finally { setIsDeletingFloor(false); setDeleteFloorId(null); }
  };

  const handleDeleteMarker = async (markerId) => {
    try {
      await axios.delete(`${API}/admin/gate-map/markers/${markerId}`, getAuthHeaders());
      setMarkers(prev => prev.filter(m => m.id !== markerId));
      if (selectedMarkerId === markerId) setSelectedMarkerId(null);
      sonnerToast.success(isAr ? "تم حذف النقطة" : "Marker deleted");
    } catch (e) { sonnerToast.error(isAr ? "تعذر الحذف" : "Error"); }
  };

  // Sync gates to markers
  const handleSyncGates = async () => {
    if (!selectedFloor) return;
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/admin/gate-map/sync-gates`, { floor_id: selectedFloor.id }, getAuthHeaders());
      if (res.data.created > 0) {
        sonnerToast.success(isAr ? `تم إضافة ${res.data.created} نقطة جديدة - حركها على الخريطة` : `Added ${res.data.created} new markers`);
        fetchMarkers();
      } else {
        sonnerToast.info(isAr ? "جميع الأبواب موجودة على الخريطة" : "All gates already on map");
      }
    } catch (e) { sonnerToast.error(isAr ? "تعذرت المزامنة" : "Sync failed"); }
    finally { setSyncing(false); }
  };

  // Update marker position
  const updateMarkerPosition = async (markerId, x, y) => {
    try {
      await axios.put(`${API}/admin/gate-map/markers/${markerId}`, { x, y }, getAuthHeaders());
      sonnerToast.success(isAr ? "تم حفظ الموقع" : "Position saved", { duration: 1500 });
    } catch (e) { sonnerToast.error(isAr ? "تعذر الحفظ" : "Save failed"); }
  };

  // SVG coordinate helper - handles both mouse and touch
  const getClientXY = (e) => {
    if (e.touches && e.touches.length > 0) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches.length > 0) return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const getMousePercent = (e) => {
    if (!mapContainerRef.current) return { x: 0, y: 0 };
    const { clientX, clientY } = getClientXY(e);
    const rect = mapContainerRef.current.getBoundingClientRect();
    const lx = clientX - rect.left;
    const ly = clientY - rect.top;
    const cx = (lx - panOffset.x) / zoom;
    const cy = (ly - panOffset.y) / zoom;
    const cw = rect.width;
    const ch = rect.height;
    let imgLeft = 0, imgTop = 0, imgW = cw, imgH = ch;
    if (imgRatio) {
      if (cw / ch > imgRatio) {
        imgW = ch * imgRatio; imgH = ch;
        imgLeft = (cw - imgW) / 2;
      } else {
        imgW = cw; imgH = cw / imgRatio;
        imgTop = (ch - imgH) / 2;
      }
    }
    const svgX = ((cx - imgLeft) / imgW) * 100;
    const svgY = ((cy - imgTop) / imgH) * 100;
    return { x: Math.max(0, Math.min(100, svgX)), y: Math.max(0, Math.min(100, svgY)) };
  };

  // Smart cursor: background = pan, marker = drag
  const handleMapMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMarkerMouseDown = (e, markerId) => {
    if (!canEditMaps) return;
    e.stopPropagation();
    e.preventDefault();
    hasDraggedRef.current = false;
    setSelectedMarkerId(markerId);
    setDraggingMarkerId(markerId);
  };

  const handleMapMouseMove = (e) => {
    if (draggingMarkerId) {
      hasDraggedRef.current = true;
      const pos = getMousePercent(e);
      setMarkers(prev => prev.map(m => m.id === draggingMarkerId ? { ...m, x: pos.x, y: pos.y } : m));
      return;
    }
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
    if (mapContainerRef.current) {
      const r = mapContainerRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - r.left + 16, y: e.clientY - r.top - 10 });
    }
  };

  const handleMapMouseUp = () => {
    if (draggingMarkerId) {
      const marker = markers.find(m => m.id === draggingMarkerId);
      if (marker) updateMarkerPosition(marker.id, marker.x, marker.y);
      setDraggingMarkerId(null);
      return;
    }
    setIsPanning(false);
  };

  // Touch handlers - smart cursor
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    // Do NOT call e.preventDefault() here - it prevents click events on tablet
    const { clientX, clientY } = getClientXY(e);
    setIsPanning(true);
    setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
  };

  const handleMarkerTouchStart = (e, markerId) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    e.preventDefault();
    hasDraggedRef.current = false;
    setSelectedMarkerId(markerId);
    setDraggingMarkerId(markerId);
  };

  const handleTouchMove = (e) => {
    if (e.touches.length !== 1) return;
    const { clientX, clientY } = getClientXY(e);
    if (draggingMarkerId) {
      e.preventDefault();
      hasDraggedRef.current = true;
      const pos = getMousePercent(e);
      setMarkers(prev => prev.map(m => m.id === draggingMarkerId ? { ...m, x: pos.x, y: pos.y } : m));
      return;
    }
    if (isPanning) {
      e.preventDefault();
      setPanOffset({ x: clientX - panStart.x, y: clientY - panStart.y });
    }
  };

  const handleTouchEnd = (e) => {
    // Do NOT call e.preventDefault() here - it prevents click events on tablet
    if (draggingMarkerId) {
      const marker = markers.find(m => m.id === draggingMarkerId);
      if (marker) updateMarkerPosition(marker.id, marker.x, marker.y);
      setDraggingMarkerId(null);
      return;
    }
    setIsPanning(false);
  };

  // Wheel zoom + pinch-to-zoom
  const wheelRef = useCallback((node) => {
    if (!node) return;
    mapContainerRef.current = node;
    const handler = (e) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const prev = zoomRef.current;
      const nz = Math.max(0.5, Math.min(6, prev * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      const s = nz / prev;
      zoomRef.current = nz; setZoom(nz);
      setPanOffset(p => ({ x: mx - s * (mx - p.x), y: my - s * (my - p.y) }));
    };
    // Pinch-to-zoom
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
        const nz = Math.max(0.5, Math.min(6, pinchZoom * (d / pinchDist)));
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
    return () => {
      node.removeEventListener("wheel", handler);
      node.removeEventListener("touchstart", onTs);
      node.removeEventListener("touchmove", onTm);
      node.removeEventListener("touchend", onTe);
    };
  }, []);

  const zoomTo = (factor) => {
    const c = mapContainerRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const cx = r.width / 2, cy = r.height / 2;
    const p = zoomRef.current;
    const nz = Math.max(0.5, Math.min(6, p * factor));
    const s = nz / p;
    zoomRef.current = nz; setZoom(nz);
    setPanOffset(o => ({ x: cx - s * (cx - o.x), y: cy - s * (cy - o.y) }));
  };

  const resetView = () => { zoomRef.current = 1; setZoom(1); setPanOffset({ x: 0, y: 0 }); };

  const floorPreviewUrl = localImagePreview || (floorForm.image_url ? normalizeImageUrl(floorForm.image_url) : "");
  const selectedMarkerData = selectedMarkerId ? markers.find(m => m.id === selectedMarkerId) : null;

  const getCursor = () => {
    if (draggingMarkerId) return "grabbing";
    return isPanning ? "grabbing" : "grab";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="gate-map-loading">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto flex items-center justify-center mb-3 animate-pulse"><Layers className="w-6 h-6 text-primary" /></div>
          <p className="text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="gate-map-page">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-l from-blue-50 via-white to-slate-50 p-5">
        <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-blue-200/30 blur-2xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200"><Layers className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="font-cairo font-bold text-2xl" data-testid="page-title">{isAr ? "إدارة خرائط الأبواب" : "Gate Map Management"}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{isAr ? "ارفع الخريطة وحدد مواقع الأبواب" : "Upload map and position gates"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEditMaps && <Button onClick={() => { setEditingFloor(null); setFloorForm({ name_ar: "", name_en: "", image_url: "", order: 0 }); setLocalImagePreview(null); setShowFloorDialog(true); }} className="bg-blue-600 hover:bg-blue-700" data-testid="add-gate-floor-btn">
              <Plus className="w-4 h-4 ml-2" />{isAr ? "إضافة طابق" : "Add Floor"}
            </Button>}
          </div>
        </div>
      </div>

      {/* Floor tabs + Sync */}
      {floors.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {floors.sort((a, b) => (a.order || 0) - (b.order || 0)).map(floor => (
            <div
              key={floor.id}
              onClick={() => { setSelectedFloor(floor); setZoom(1); setPanOffset({ x: 0, y: 0 }); zoomRef.current = 1; setImgRatio(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${selectedFloor?.id === floor.id ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-200" : "hover:border-slate-300 hover:bg-slate-50"}`}
              data-testid={`floor-tab-${floor.id}`}
            >
              <Layers className={`w-4 h-4 ${selectedFloor?.id === floor.id ? "text-blue-600" : "text-slate-400"}`} />
              <span className={`text-sm font-medium ${selectedFloor?.id === floor.id ? "text-blue-700" : ""}`}>{isAr ? floor.name_ar : (floor.name_en || floor.name_ar)}</span>
              {canEditMaps && <span role="button" tabIndex={0} className="h-5 w-5 flex items-center justify-center rounded text-slate-400 hover:text-blue-600 hover:bg-blue-100 transition-colors" onClick={(e) => { e.stopPropagation(); setEditingFloor(floor); setFloorForm({ name_ar: floor.name_ar, name_en: floor.name_en || "", image_url: normalizeImageUrl(floor.image_url) || "", order: floor.order || 0 }); setLocalImagePreview(null); setShowFloorDialog(true); }}>
                <Edit2 className="w-3 h-3" />
              </span>}
            </div>
          ))}
          <div className="flex-1" />
          {selectedFloor && canEditMaps && (
            <>
              <Button variant="outline" onClick={handleSyncGates} disabled={syncing} data-testid="sync-gates-btn">
                <RefreshCw className={`w-4 h-4 ml-1.5 ${syncing ? "animate-spin" : ""}`} />
                {isAr ? "مزامنة الأبواب" : "Sync Gates"}
              </Button>
              <Badge variant="secondary" className="text-xs px-2.5 py-1.5">
                <Crosshair className="w-3 h-3 ml-1" />
                {markers.length} {isAr ? "نقطة" : "markers"}
              </Badge>
            </>
          )}
        </div>
      )}

      {/* No floors */}
      {floors.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-4"><Layers className="w-8 h-8 text-slate-400" /></div>
            <h3 className="font-cairo font-semibold text-lg text-slate-600 mb-2">{isAr ? "لا توجد طوابق بعد" : "No floors yet"}</h3>
            {canEditMaps ? (
              <Button onClick={() => { setEditingFloor(null); setFloorForm({ name_ar: "", name_en: "", image_url: "", order: 0 }); setLocalImagePreview(null); setShowFloorDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 ml-2" />{isAr ? "إضافة أول طابق" : "Add First Floor"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">{isAr ? "ليس لديك صلاحية لإضافة طوابق" : "No permission"}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interactive Map */}
      {selectedFloor && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between bg-white border rounded-xl px-3 py-2">
            <div className="flex items-center gap-1.5">
              {/* Smart cursor hint */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-700 font-medium">
                <Crosshair className="w-3 h-3" />
                {isAr ? "اسحب النقطة لتغيير موقعها • اسحب الخلفية للتنقل" : "Drag marker to reposition • Drag background to pan"}
              </div>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-slate-50">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomTo(0.8)} data-testid="zoom-out"><ZoomOut className="w-3.5 h-3.5" /></Button>
              <span className="text-[11px] w-10 text-center font-medium text-slate-500">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomTo(1.25)} data-testid="zoom-in"><ZoomIn className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetView} data-testid="zoom-reset"><Maximize2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>

          {/* Map Canvas */}
          {selectedFloor.image_url ? (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div
                  ref={wheelRef}
                  className="relative bg-slate-100 overflow-hidden"
                  style={{ height: "600px", cursor: getCursor(), touchAction: "none" }}
                  onMouseDown={handleMapMouseDown}
                  onMouseMove={handleMapMouseMove}
                  onMouseUp={handleMapMouseUp}
                  onMouseLeave={() => { handleMapMouseUp(); setHoveredMarker(null); }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  data-testid="gate-map-canvas"
                >
                  <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: "0 0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {(() => {
                      const ce = mapContainerRef.current;
                      let ws = { position: "relative", width: "100%", height: "100%" };
                      if (imgRatio && ce) {
                        const cw = ce.clientWidth, ch = ce.clientHeight;
                        if (cw / ch > imgRatio) ws = { position: "relative", height: "100%", width: ch * imgRatio };
                        else ws = { position: "relative", width: "100%", height: cw / imgRatio };
                      }
                      return (
                        <div style={ws}>
                          <img src={selectedFloor.image_url} alt="" style={{ width: "100%", height: "100%", display: "block", imageRendering: "high-quality" }} draggable={false} className="pointer-events-none select-none" onLoad={(e) => setImgRatio(e.target.naturalWidth / e.target.naturalHeight)} />
                          <svg ref={svgRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }} viewBox="0 0 100 100" preserveAspectRatio="none" data-testid="gate-map-svg">
                            {markers.map(marker => {
                              const sc = STATUS_CONFIG[marker.status] || STATUS_CONFIG.open;
                              const isDragging = draggingMarkerId === marker.id;
                              const isSelected = selectedMarkerId === marker.id;
                              const isHovered = hoveredMarker?.id === marker.id;
                              const ar = imgRatio || 1;
                              const baseR = 0.7;
                              const r = isDragging ? baseR * 1.6 : (isSelected || isHovered) ? baseR * 1.3 : baseR;
                              const showLabel = isDragging || isSelected || isHovered;

                              return (
                                <g
                                  key={marker.id}
                                  data-marker-id={marker.id}
                                  data-testid={`gate-marker-${marker.id}`}
                                  style={{ cursor: canEditMaps ? (isDragging ? "grabbing" : "grab") : "default" }}
                                  onMouseDown={(e) => handleMarkerMouseDown(e, marker.id)}
                                  onTouchStart={(e) => handleMarkerTouchStart(e, marker.id)}
                                  onMouseEnter={() => { if (!draggingMarkerId) setHoveredMarker(marker); }}
                                  onMouseLeave={() => setHoveredMarker(null)}
                                >
                                  {/* Pulse animation */}
                                  <ellipse cx={marker.x} cy={marker.y} rx={r + 1.5} ry={(r + 1.5) * ar} fill={sc.color} fillOpacity="0">
                                    <animate attributeName="fill-opacity" values="0.12;0;0.12" dur="2s" repeatCount="indefinite" />
                                    <animate attributeName="rx" values={`${r + 0.5};${r + 2.5};${r + 0.5}`} dur="2s" repeatCount="indefinite" />
                                    <animate attributeName="ry" values={`${(r + 0.5) * ar};${(r + 2.5) * ar};${(r + 0.5) * ar}`} dur="2s" repeatCount="indefinite" />
                                  </ellipse>

                                  {/* Selection ring - shown when selected */}
                                  {isSelected && (
                                    <ellipse cx={marker.x} cy={marker.y} rx={r + 0.8} ry={(r + 0.8) * ar} fill="none" stroke="#3b82f6" strokeWidth="0.2" vectorEffect="non-scaling-stroke" strokeDasharray="1.5 0.8">
                                      <animate attributeName="stroke-dashoffset" values="0;4.6" dur="1s" repeatCount="indefinite" />
                                    </ellipse>
                                  )}

                                  {/* Hover ring */}
                                  {isHovered && !isSelected && (
                                    <ellipse cx={marker.x} cy={marker.y} rx={r + 0.4} ry={(r + 0.4) * ar} fill="none" stroke={sc.color} strokeWidth="0.15" vectorEffect="non-scaling-stroke" />
                                  )}

                                  {/* Main marker */}
                                  <ellipse
                                    cx={marker.x} cy={marker.y} rx={r} ry={r * ar}
                                    fill={isDragging ? "#3b82f6" : sc.color}
                                    stroke="white" strokeWidth={isSelected || isDragging ? "0.25" : "0.15"}
                                    vectorEffect="non-scaling-stroke"
                                    style={{ filter: isDragging ? "drop-shadow(0 0 4px rgba(59,130,246,0.5))" : isSelected ? "drop-shadow(0 0 3px rgba(59,130,246,0.4))" : "none", transition: isDragging ? "none" : "all 0.15s ease" }}
                                  />

                                  {/* Crosshair when hovered/selected */}
                                  {(isSelected || isHovered) && !isDragging && (
                                    <g transform={`translate(${marker.x}, ${marker.y})`} style={{ pointerEvents: "none" }}>
                                      <line x1="-0.25" y1="0" x2="0.25" y2="0" stroke="white" strokeWidth="0.06" vectorEffect="non-scaling-stroke" />
                                      <line x1="0" y1={-0.25 * ar} x2="0" y2={0.25 * ar} stroke="white" strokeWidth="0.06" vectorEffect="non-scaling-stroke" />
                                    </g>
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Legend */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-sm">
                    <div className="flex items-center gap-3">
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <span key={key} className="flex items-center gap-1 text-[10px]">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                          {isAr ? cfg.label_ar : cfg.label_en}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400">{markers.length} {isAr ? "نقطة" : "markers"}</span>
                  </div>

                  {/* Tooltip (when hovering, not panning) */}
                  {hoveredMarker && !draggingMarkerId && !isPanning && (() => {
                    const sc = STATUS_CONFIG[hoveredMarker.status] || STATUS_CONFIG.open;
                    const dir = DIRECTIONS_MAP[hoveredMarker.direction];
                    return (
                      <div className="absolute pointer-events-none z-50" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                        <div className="bg-white/97 backdrop-blur-md rounded-xl shadow-2xl border overflow-hidden min-w-[200px]" style={{ direction: "rtl" }}>
                          <div className="h-1.5" style={{ backgroundColor: sc.color }} />
                          <div className="p-3 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: sc.color }}>
                                <DoorOpen className="w-4 h-4 text-white" />
                              </span>
                              <div>
                                <span className="font-bold text-sm">{hoveredMarker.name_ar}</span>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <span style={{ color: sc.color }}>{isAr ? sc.label_ar : sc.label_en}</span>
                                  {dir && <span>{isAr ? dir.label_ar : dir.label_en}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد صورة خريطة - عدّل الطابق وارفع صورة" : "No map image"}</CardContent></Card>
          )}

          {/* Markers list */}
          {markers.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {markers.map(marker => {
                const sc = STATUS_CONFIG[marker.status] || STATUS_CONFIG.open;
                const isSelected = selectedMarkerId === marker.id;
                return (
                  <div
                    key={marker.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all group cursor-pointer ${isSelected ? "border-blue-400 bg-blue-50 shadow-sm" : "hover:shadow-sm"}`}
                    onClick={() => setSelectedMarkerId(marker.id)}
                    data-testid={`marker-item-${marker.id}`}
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${sc.color}15` }}>
                      <DoorOpen className="w-3.5 h-3.5" style={{ color: sc.color }} />
                    </div>
                    <span className="text-xs font-medium truncate flex-1">{marker.name_ar}</span>
                    {canEditMaps && <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleDeleteMarker(marker.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floor Dialog */}
      <Dialog open={showFloorDialog} onOpenChange={setShowFloorDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              {editingFloor ? <Edit2 className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
              {editingFloor ? (isAr ? "تعديل الطابق" : "Edit Floor") : (isAr ? "إضافة طابق جديد" : "Add Floor")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-sm font-medium">{isAr ? "الاسم بالعربية" : "Arabic Name"}</Label><Input value={floorForm.name_ar} onChange={e => setFloorForm(p => ({ ...p, name_ar: e.target.value }))} className="mt-1" data-testid="gate-floor-name-ar" /></div>
              <div><Label className="text-sm font-medium">{isAr ? "الاسم بالإنجليزية" : "English Name"}</Label><Input value={floorForm.name_en} onChange={e => setFloorForm(p => ({ ...p, name_en: e.target.value }))} className="mt-1" data-testid="gate-floor-name-en" /></div>
            </div>
            <div>
              <Label className="text-sm font-medium">{isAr ? "الترتيب" : "Order"}</Label>
              <Input type="number" value={floorForm.order} onChange={e => setFloorForm(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium">{isAr ? "صورة الطابق" : "Floor Image"}</Label>
              <label className={`mt-2 block rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); uploadImageFile(e.dataTransfer.files?.[0]); }}>
                <input type="file" accept="image/*" onChange={(e) => { uploadImageFile(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center"><Upload className="w-6 h-6 text-blue-500" /></div>
                  <p className="text-sm text-slate-600">{isAr ? "اسحب الصورة هنا أو انقر للاختيار" : "Drag & drop or click"}</p>
                  <p className="text-xs text-slate-400">PNG, JPG, WEBP</p>
                </div>
              </label>
              {uploadingImage && <Progress value={uploadProgress} className="h-2 mt-2" />}
              <Input value={floorForm.image_url} onChange={e => setFloorForm(p => ({ ...p, image_url: e.target.value }))} placeholder={isAr ? "أو أدخل رابط الصورة" : "Or enter image URL"} className="mt-2 text-xs" dir="ltr" />
              {floorPreviewUrl && <div className="mt-3 rounded-lg border overflow-hidden"><img src={floorPreviewUrl} alt="" className="w-full h-32 object-contain bg-slate-50" /></div>}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveFloor} disabled={!floorForm.name_ar || !floorForm.image_url} className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 ml-2" />{isAr ? "حفظ" : "Save"}</Button>
            <Button variant="outline" onClick={() => setShowFloorDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Floor Dialog */}
      <Dialog open={!!deleteFloorId} onOpenChange={(open) => { if (!open) setDeleteFloorId(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2 text-red-600"><Trash2 className="w-5 h-5" />{isAr ? "تأكيد حذف الطابق" : "Confirm Deletion"}</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-red-700">{isAr ? `هل تريد حذف الطابق "${floors.find(f => f.id === deleteFloorId)?.name_ar || ""}"؟` : `Delete "${floors.find(f => f.id === deleteFloorId)?.name_en || ""}"?`}</p>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDeleteFloor} disabled={isDeletingFloor}><Trash2 className="w-4 h-4 ml-2" />{isDeletingFloor ? (isAr ? "جاري الحذف..." : "Deleting...") : (isAr ? "حذف" : "Delete")}</Button>
            <Button variant="outline" onClick={() => setDeleteFloorId(null)}>{isAr ? "إلغاء" : "Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
