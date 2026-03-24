import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useRealtimeRefresh } from "@/context/WebSocketContext";
import {
  Plus, Trash2, Save, X, Upload, Layers, Edit2, Image as ImageIcon,
  CheckCircle2, AlertTriangle, BarChart3, ArrowUpDown, Ruler, ZoomIn, ZoomOut, Maximize2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Progress } from "@/components/ui/progress";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MapManagementPage({ department = "plazas" }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const { canWrite } = useAuth();
  const canEditMaps = canWrite('manage_maps');

  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Calibration state
  const [calibFloor, setCalibFloor] = useState(null); // floor being calibrated
  const [calibPoints, setCalibPoints] = useState([]);
  const [calibDistance, setCalibDistance] = useState("");
  const [calibZoom, setCalibZoom] = useState(1);
  const [calibPan, setCalibPan] = useState({ x: 0, y: 0 });
  const [calibPanning, setCalibPanning] = useState(false);
  const [calibPanStart, setCalibPanStart] = useState({ x: 0, y: 0 });
  const [calibDragDist, setCalibDragDist] = useState(0);
  const calibZoomRef = useRef(1);
  const calibContainerRef = useRef(null);

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

  // Fetch floors — filtered by department
  const fetchFloors = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/floors?department=${department}`, getAuthHeaders());
      const normalized = res.data.map(f => ({ ...f, image_url: normalizeImageUrl(f.image_url) }));
      setFloors(normalized);
      normalized.forEach(f => { if (f.image_url) { const img = new Image(); img.src = f.image_url; } });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [department]);

  // Save calibration
  const handleSaveCalibration = async () => {
    if (!calibFloor || calibPoints.length !== 2 || !calibDistance) return;
    const dist = parseFloat(calibDistance);
    if (isNaN(dist) || dist <= 0) { toast({ title: isAr ? "أدخل مسافة صحيحة" : "Enter valid distance", variant: "destructive" }); return; }
    try {
      const calibData = { point1: calibPoints[0], point2: calibPoints[1], distance_meters: dist };
      await axios.put(`${API}/admin/floors/${calibFloor.id}`, { scale_calibration: calibData }, getAuthHeaders());
      setFloors(prev => prev.map(f => f.id === calibFloor.id ? { ...f, scale_calibration: calibData } : f));
      setCalibFloor(null);
      setCalibPoints([]);
      setCalibDistance("");
      toast({ title: isAr ? "تم حفظ المعايرة بنجاح" : "Calibration saved" });
    } catch { toast({ title: isAr ? "تعذر حفظ المعايرة" : "Failed", variant: "destructive" }); }
  };

  useEffect(() => { fetchFloors(); }, [fetchFloors]);
  useRealtimeRefresh(["maps"], fetchFloors);

  useEffect(() => {
    return () => { if (localImagePreview) URL.revokeObjectURL(localImagePreview); };
  }, [localImagePreview]);

  // Upload image
  const uploadImageFile = async (file) => {
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) {
      toast({ title: isAr ? "نوع ملف غير مدعوم" : "Unsupported file", variant: "destructive" });
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
      toast({ title: isAr ? "تم الرفع" : "Uploaded" });
    } catch (e) {
      toast({ title: isAr ? "تعذر الرفع" : "Error", variant: "destructive" });
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

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };

  // Floor CRUD
  const handleSaveFloor = async () => {
    try {
      if (editingFloor) {
        const res = await axios.put(`${API}/admin/floors/${editingFloor.id}`, floorForm, getAuthHeaders());
        const updated = { ...res.data, image_url: normalizeImageUrl(res.data.image_url) };
        setFloors(prev => prev.map(f => f.id === editingFloor.id ? updated : f));
      } else {
        await axios.post(`${API}/admin/floors`, { ...floorForm, department }, getAuthHeaders());
      }
      setShowFloorDialog(false);
      setFloorForm({ name_ar: "", name_en: "", floor_number: 0, image_url: "", order: 0 });
      setEditingFloor(null);
      fetchFloors();
      toast({ title: isAr ? "تم الحفظ" : "Saved" });
    } catch (e) { toast({ title: isAr ? "تعذر الحفظ" : "Error", variant: "destructive" }); }
  };

  const handleDeleteFloor = async (id) => {
    const floorId = id || deleteFloorId;
    if (!floorId) return;
    setIsDeletingFloor(true);
    try {
      await axios.delete(`${API}/admin/floors/${floorId}`, getAuthHeaders());
      setFloors(prev => prev.filter(f => f.id !== floorId));
      fetchFloors();
      toast({ title: isAr ? "تم الحذف" : "Deleted" });
    } catch (e) { toast({ title: isAr ? "تعذر الحذف" : "Error", variant: "destructive" }); }
    finally {
      setIsDeletingFloor(false);
      setDeleteFloorId(null);
    }
  };

  const floorPreviewUrl = localImagePreview || (floorForm.image_url ? normalizeImageUrl(floorForm.image_url) : "");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="map-management-loading">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto flex items-center justify-center mb-3 animate-pulse">
            <Layers className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="map-management-page">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-l from-blue-50 via-white to-slate-50 p-6">
        <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-blue-200/30 blur-2xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-cairo font-bold text-2xl" data-testid="page-title">
                {isAr ? "إدارة الخرائط" : "Map Management"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isAr ? "إدارة خرائط طوابق الحرم الشريف - رفع وتنظيم صور الأدوار" : "Manage Haram floor plans - upload and organize floor images"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEditMaps && <Button
              onClick={() => { setEditingFloor(null); setFloorForm({ name_ar: "", name_en: "", floor_number: 0, image_url: "", order: 0 }); setLocalImagePreview(null); setShowFloorDialog(true); }}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="add-floor-button"
            >
              <Plus className="w-4 h-4 ml-2" />{isAr ? "إضافة طابق" : "Add Floor"}
            </Button>}
          </div>
        </div>
      </div>

      {/* Floor Stats — تصميم خرافي */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: isAr ? "إجمالي الطوابق" : "Total Floors",
            value: floors.length,
            desc: isAr ? "كل الطوابق المضافة" : "All floors",
            color: "#2563eb", grad: "from-blue-50 to-indigo-50/60", border: "#bfdbfe",
            Icon: Layers, testId: "total-floors-count",
          },
          {
            label: isAr ? "بصورة" : "With Image",
            value: floors.filter(f => f.image_url).length,
            desc: isAr ? "طابق بخريطة محملة" : "Floors with map",
            color: "#059669", grad: "from-emerald-50 to-green-50/60", border: "#a7f3d0",
            Icon: CheckCircle2,
          },
          {
            label: isAr ? "بدون صورة" : "No Image",
            value: floors.filter(f => !f.image_url).length,
            desc: isAr ? "يحتاج تحميل خريطة" : "Needs map upload",
            color: "#d97706", grad: "from-amber-50 to-yellow-50/60", border: "#fcd34d",
            Icon: AlertTriangle,
          },
          {
            label: isAr ? "نطاق الأدوار" : "Floor Range",
            value: floors.length > 0
              ? `${Math.min(...floors.map(f=>f.floor_number))} ← ${Math.max(...floors.map(f=>f.floor_number))}`
              : "—",
            desc: isAr ? "من الأدنى للأعلى" : "Lowest to highest",
            color: "#7c3aed", grad: "from-violet-50 to-purple-50/60", border: "#c4b5fd",
            Icon: ArrowUpDown,
          },
        ].map((s, i) => {
          const pct = floors.length > 0 && typeof s.value === "number"
            ? Math.round((s.value / floors.length) * 100) : null;
          return (
            <div key={i}
              className={`group relative overflow-hidden rounded-2xl border p-4 bg-gradient-to-br ${s.grad}
                hover:scale-[1.02] hover:shadow-lg transition-all duration-200 cursor-default`}
              style={{ borderColor: s.color + "40" }}>

              {/* دائرة ديكورية */}
              <div className="absolute -left-4 -bottom-4 w-16 h-16 rounded-full opacity-[0.08] group-hover:opacity-[0.15] transition-opacity"
                style={{ backgroundColor: s.color }} />

              {/* أيقونة */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm mb-3"
                style={{ backgroundColor: s.color + "20" }}>
                <s.Icon className="w-4.5 h-4.5" style={{ color: s.color }} />
              </div>

              {/* العدد */}
              <p className="text-3xl font-black leading-none tabular-nums mb-1"
                style={{ color: s.color }}
                data-testid={s.testId}>
                {s.value}
              </p>

              {/* الاسم + الوصف */}
              <p className="text-[11px] font-bold text-slate-700 leading-tight">{s.label}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{s.desc}</p>

              {/* progress bar (فقط للأرقام) */}
              {pct !== null && (
                <div className="mt-2.5 h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: s.color }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Calibration tip */}
      {floors.length > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200" data-testid="calibration-tip">
          <Ruler className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-[11px] text-blue-700 leading-relaxed font-cairo">
            {isAr
              ? "يمكنك معايرة مقياس كل طابق بالضغط على زر \"معايرة\" في بطاقة الطابق. المعايرة اختيارية — بدونها تعمل الخرائط بشكل طبيعي، ومعها يتم حساب المساحات والطاقة الاستيعابية تلقائياً عند رسم المناطق."
              : "You can calibrate each floor's scale by clicking \"Calibrate\" on the floor card. Calibration is optional — maps work normally without it, but with it, areas and capacities are auto-calculated when drawing zones."}
          </p>
        </div>
      )}

      {/* Floors Grid */}
      {floors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-4">
              <Layers className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-cairo font-semibold text-lg text-slate-600 mb-2">
              {isAr ? "لا توجد طوابق بعد" : "No floors yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              {isAr ? "ابدأ بإضافة طوابق الحرم ورفع صور الأدوار لكل طابق" : "Start by adding Haram floors and uploading floor plan images"}
            </p>
            {canEditMaps ? (
              <Button onClick={() => { setEditingFloor(null); setFloorForm({ name_ar: "", name_en: "", floor_number: 0, image_url: "", order: 0 }); setLocalImagePreview(null); setShowFloorDialog(true); }} className="bg-blue-600 hover:bg-blue-700" data-testid="empty-add-floor-button">
                <Plus className="w-4 h-4 ml-2" />{isAr ? "إضافة أول طابق" : "Add First Floor"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">{isAr ? "ليس لديك صلاحية لإضافة طوابق" : "No permission to add floors"}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {floors.sort((a, b) => (a.order || a.floor_number) - (b.order || b.floor_number)).map(floor => (
            <Card key={floor.id}
              className="group overflow-hidden transition-all duration-300 hover:shadow-xl border-0 rounded-2xl"
              style={{ boxShadow: "0 2px 12px rgba(37,99,235,0.10)" }}
              data-testid={`floor-card-${floor.id}`}>

              {/* Image */}
              <div className="relative h-44 bg-gradient-to-br from-slate-100 to-blue-50 overflow-hidden">
                {floor.image_url ? (
                  <img src={normalizeImageUrl(floor.image_url)} alt=""
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    data-testid={`floor-image-${floor.id}`} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <div className="w-14 h-14 rounded-2xl bg-slate-200 flex items-center justify-center">
                      <ImageIcon className="w-7 h-7 text-slate-400" />
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{isAr ? "لا توجد صورة" : "No image"}</span>
                  </div>
                )}
                {/* overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Floor number badge */}
                <div className="absolute top-3 right-3">
                  <span className="bg-white/95 backdrop-blur-sm text-blue-700 border border-blue-200 shadow-sm text-xs font-bold px-2.5 py-1 rounded-lg">
                    {isAr ? `دور ${floor.floor_number}` : `Floor ${floor.floor_number}`}
                  </span>
                </div>
                {/* Image status */}
                <div className="absolute top-3 left-3">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full
                    ${floor.image_url ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {floor.image_url ? "✓ بصورة" : "⚠ بدون صورة"}
                  </span>
                </div>
              </div>

              {/* Content */}
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-cairo font-bold text-base truncate text-blue-900"
                      data-testid={`floor-name-${floor.id}`}>
                      {isAr ? floor.name_ar : floor.name_en}
                    </h3>
                    {floor.name_en && isAr && (
                      <p className="text-[11px] text-muted-foreground truncate">{floor.name_en}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
                    #{floor.order || floor.floor_number}
                  </span>
                </div>

                {canEditMaps && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                      onClick={() => { setEditingFloor(floor); setFloorForm({ ...floor, image_url: normalizeImageUrl(floor.image_url) }); setLocalImagePreview(null); setShowFloorDialog(true); }}
                      data-testid={`floor-edit-${floor.id}`}>
                      <Edit2 className="w-3.5 h-3.5 ml-1.5" />
                      {isAr ? "تعديل" : "Edit"}
                    </Button>
                    {floor.image_url && (
                      <Button variant="outline" size="sm"
                        className={`hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors ${floor.scale_calibration ? "border-emerald-300 text-emerald-700" : ""}`}
                        onClick={() => {
                          const existingPoints = floor.scale_calibration ? [floor.scale_calibration.point1, floor.scale_calibration.point2] : [];
                          setCalibFloor(floor);
                          setCalibPoints(existingPoints);
                          setCalibDistance(floor.scale_calibration?.distance_meters?.toString() || "");
                          setCalibZoom(1); calibZoomRef.current = 1; setCalibPan({ x: 0, y: 0 });
                        }}
                        data-testid={`floor-calibrate-${floor.id}`}>
                        <Ruler className="w-3.5 h-3.5 ml-1" />
                        {floor.scale_calibration ? (isAr ? "مُعاير" : "Cal'd") : (isAr ? "معايرة" : "Cal")}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                      onClick={() => setDeleteFloorId(floor.id)} data-testid={`floor-delete-${floor.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                {/* Calibration status badge */}
                {floor.scale_calibration && (
                  <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                    <Ruler className="w-3 h-3 text-emerald-600" />
                    <span className="text-[9px] font-bold text-emerald-700">{isAr ? "مُعاير" : "Calibrated"}: {floor.scale_calibration.distance_meters} {isAr ? "م" : "m"}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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
              <div>
                <Label className="text-sm font-medium">{isAr ? "الاسم بالعربية" : "Arabic Name"}</Label>
                <Input value={floorForm.name_ar} onChange={e => setFloorForm(p => ({ ...p, name_ar: e.target.value }))} className="mt-1" data-testid="floor-name-ar-input" />
              </div>
              <div>
                <Label className="text-sm font-medium">{isAr ? "الاسم بالإنجليزية" : "English Name"}</Label>
                <Input value={floorForm.name_en} onChange={e => setFloorForm(p => ({ ...p, name_en: e.target.value }))} className="mt-1" data-testid="floor-name-en-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">{isAr ? "رقم الطابق" : "Floor Number"}</Label>
                <Input type="number" inputMode="numeric" value={floorForm.floor_number} onChange={e => setFloorForm(p => ({ ...p, floor_number: parseInt(e.target.value) || 0 }))} className="mt-1" data-testid="floor-number-input" />
              </div>
              <div>
                <Label className="text-sm font-medium">{isAr ? "الترتيب" : "Order"}</Label>
                <Input type="number" inputMode="numeric" value={floorForm.order} onChange={e => setFloorForm(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} className="mt-1" data-testid="floor-order-input" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">{isAr ? "صورة الطابق" : "Floor Image"}</Label>
              <label
                className={`mt-2 block rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                data-testid="floor-image-dropzone"
              >
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" data-testid="floor-image-file-input" />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className="text-sm text-slate-600">
                    {isAr ? "اسحب الصورة هنا أو انقر للاختيار" : "Drag & drop or click to browse"}
                  </p>
                  <p className={`text-xs ${isDragOver ? "text-blue-600" : "text-slate-400"}`} data-testid="floor-image-dropzone-hint">
                    {isDragOver ? (isAr ? "أفلت الصورة للرفع" : "Drop to upload") : (isAr ? "PNG, JPG, WEBP" : "PNG, JPG, WEBP")}
                  </p>
                </div>
              </label>
              {uploadingImage && <Progress value={uploadProgress} className="h-2 mt-2" data-testid="floor-upload-progress" />}
              <Input value={floorForm.image_url} onChange={e => setFloorForm(p => ({ ...p, image_url: e.target.value }))} placeholder={isAr ? "أو أدخل رابط الصورة" : "Or enter image URL"} className="mt-2 text-xs" dir="ltr" data-testid="floor-image-url-input" />
              {floorPreviewUrl && (
                <div className="mt-3 rounded-lg border overflow-hidden">
                  <img src={floorPreviewUrl} alt="" className="w-full h-32 object-contain bg-slate-50" data-testid="floor-image-preview" />
                </div>
              )}
            </div>

            {/* Calibration note in edit mode */}
            {editingFloor && editingFloor.image_url && (
              <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ backgroundColor: editingFloor.scale_calibration ? "#ecfdf5" : "#f8fafc", borderColor: editingFloor.scale_calibration ? "#a7f3d0" : "#e2e8f0" }}>
                <Ruler className="w-4 h-4 flex-shrink-0" style={{ color: editingFloor.scale_calibration ? "#059669" : "#94a3b8" }} />
                <div className="flex-1">
                  <p className="text-[10px] font-bold" style={{ color: editingFloor.scale_calibration ? "#059669" : "#64748b" }}>
                    {editingFloor.scale_calibration
                      ? (isAr ? `مُعاير: ${editingFloor.scale_calibration.distance_meters} متر` : `Calibrated: ${editingFloor.scale_calibration.distance_meters}m`)
                      : (isAr ? "غير مُعاير — المعايرة اختيارية" : "Not calibrated — optional")}
                  </p>
                  <p className="text-[9px] text-slate-400">{isAr ? "يمكنك المعايرة من زر \"معايرة\" في بطاقة الطابق" : "Calibrate from the floor card button"}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveFloor} disabled={!floorForm.name_ar || !floorForm.image_url} className="bg-blue-600 hover:bg-blue-700" data-testid="floor-dialog-save-button">
              <Save className="w-4 h-4 ml-2" />{isAr ? "حفظ" : "Save"}
            </Button>
            <Button variant="outline" onClick={() => setShowFloorDialog(false)} data-testid="floor-dialog-cancel-button">{isAr ? "إلغاء" : "Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Floor Dialog */}
      <Dialog open={!!deleteFloorId} onOpenChange={(open) => { if (!open) setDeleteFloorId(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {isAr ? "تأكيد حذف الطابق" : "Confirm Floor Deletion"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100" data-testid="delete-floor-dialog-text">
            <p className="text-sm text-red-700">
              {isAr
                ? `هل تريد حذف الطابق "${floors.find(f => f.id === deleteFloorId)?.name_ar || ""}"؟ هذا الإجراء لا يمكن التراجع عنه.`
                : `Delete floor "${floors.find(f => f.id === deleteFloorId)?.name_en || ""}"? This cannot be undone.`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => handleDeleteFloor(deleteFloorId)} disabled={isDeletingFloor} data-testid="delete-floor-confirm-button">
              <Trash2 className="w-4 h-4 ml-2" />
              {isDeletingFloor ? (isAr ? "جاري الحذف..." : "Deleting...") : (isAr ? "حذف" : "Delete")}
            </Button>
            <Button variant="outline" onClick={() => setDeleteFloorId(null)} data-testid="delete-floor-cancel-button">{isAr ? "إلغاء" : "Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Calibration Dialog ── */}
      <Dialog open={!!calibFloor} onOpenChange={(open) => { if (!open) { setCalibFloor(null); setCalibPoints([]); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl" data-testid="calibration-dialog">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <Ruler className="w-5 h-5 text-blue-600" />
              {isAr ? `معايرة مقياس: ${calibFloor?.name_ar || ""}` : `Calibrate: ${calibFloor?.name_en || ""}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Instructions */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-700 leading-relaxed font-cairo">
              {calibPoints.length === 0 && (isAr ? "الخطوة 1: اضغط على النقطة الأولى على الخريطة (مثلاً: زاوية عمود أو بداية ممر)" : "Step 1: Click the first point on the map")}
              {calibPoints.length === 1 && (isAr ? "الخطوة 2: اضغط على النقطة الثانية (النقطة التي تعرف المسافة بينها وبين الأولى)" : "Step 2: Click the second point")}
              {calibPoints.length === 2 && (isAr ? "الخطوة 3: أدخل أو عدّل المسافة الحقيقية بين النقطتين بالأمتار — يمكنك إعادة تحديد النقاط أو تعديل المسافة فقط" : "Step 3: Enter/edit the real distance — you can reset points or just change the distance")}
            </div>

            {/* Map with zoom/pan + click-to-place-points */}
            {calibFloor?.image_url && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100" style={{ height: "420px" }}>
                {/* Zoom controls inside map */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1 border rounded-lg p-1 bg-white/90 backdrop-blur shadow-sm"
                  onMouseDown={e => e.stopPropagation()}>
                  <button onClick={() => { const nz = Math.max(0.3, calibZoomRef.current / 1.15); calibZoomRef.current = nz; setCalibZoom(nz); }} className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100"><ZoomOut className="w-4 h-4 text-slate-600" /></button>
                  <span className="text-[11px] w-10 text-center font-mono text-slate-500">{Math.round(calibZoom * 100)}%</span>
                  <button onClick={() => { const nz = Math.min(8, calibZoomRef.current * 1.15); calibZoomRef.current = nz; setCalibZoom(nz); }} className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100"><ZoomIn className="w-4 h-4 text-slate-600" /></button>
                  <button onClick={() => { calibZoomRef.current = 1; setCalibZoom(1); setCalibPan({ x: 0, y: 0 }); }} className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100"><Maximize2 className="w-4 h-4 text-slate-600" /></button>
                </div>

                {/* Status badge */}
                <div className="absolute top-3 right-3 z-20 bg-blue-600 text-white px-3 py-1.5 rounded-xl shadow-lg text-[11px] font-bold font-cairo flex items-center gap-2">
                  <Ruler className="w-3.5 h-3.5" />
                  {calibPoints.length === 0 ? (isAr ? "اضغط على النقطة الأولى" : "Click 1st point") :
                   calibPoints.length === 1 ? (isAr ? "اضغط على النقطة الثانية" : "Click 2nd point") :
                   (isAr ? "تم تحديد النقطتين" : "Both points set")}
                  <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{calibPoints.length}/2</span>
                </div>

                {/* Zoomable/pannable map container */}
                <div
                  ref={el => {
                    calibContainerRef.current = el;
                    if (!el) return;
                    const handler = (e) => {
                      e.preventDefault();
                      const rect = el.getBoundingClientRect();
                      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
                      const prev = calibZoomRef.current;
                      const delta = e.deltaY < 0 ? 1.06 : 1 / 1.06;
                      const nz = Math.max(0.3, Math.min(8, prev * delta));
                      const s = nz / prev;
                      calibZoomRef.current = nz;
                      setCalibZoom(nz);
                      setCalibPan(p => ({ x: mx - s * (mx - p.x), y: my - s * (my - p.y) }));
                    };
                    el.onwheel = null;
                    el.addEventListener("wheel", handler, { passive: false });
                  }}
                  className="relative w-full h-full overflow-hidden"
                  style={{ cursor: calibPanning ? "grabbing" : calibPoints.length >= 2 ? "default" : "crosshair", touchAction: "none" }}
                  onMouseDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    setCalibPanning(true);
                    setCalibDragDist(0);
                    setCalibPanStart({ x: e.clientX - calibPan.x, y: e.clientY - calibPan.y });
                  }}
                  onMouseMove={(e) => {
                    if (calibPanning) {
                      setCalibPan({ x: e.clientX - calibPanStart.x, y: e.clientY - calibPanStart.y });
                      setCalibDragDist(prev => prev + 1);
                    }
                  }}
                  onMouseUp={(e) => {
                    const wasClick = calibDragDist < 5;
                    setCalibPanning(false);
                    if (wasClick && calibPoints.length < 2) {
                      // Calculate click position relative to the image
                      const inner = calibContainerRef.current?.querySelector('[data-calib-inner]');
                      if (!inner) return;
                      const rect = inner.getBoundingClientRect();
                      const x = Math.round(((e.clientX - rect.left) / rect.width) * 10000) / 100;
                      const y = Math.round(((e.clientY - rect.top) / rect.height) * 10000) / 100;
                      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
                        setCalibPoints(prev => [...prev, { x, y }]);
                      }
                    }
                  }}
                  onMouseLeave={() => setCalibPanning(false)}
                  data-testid="calibration-map"
                >
                  <div style={{ transform: `translate(${calibPan.x}px, ${calibPan.y}px) scale(${calibZoom})`, transformOrigin: "0 0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ position: "relative", width: "100%", height: "100%" }} data-calib-inner="true">
                      <img src={normalizeImageUrl(calibFloor.image_url)} alt=""
                        className="w-full h-full object-contain pointer-events-none select-none" draggable={false} />
                      {/* Calibration points overlay — AutoCAD-style crosshair */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {calibPoints.map((pt, i) => {
                          const armLen = 0.8 / calibZoom; // ذراع الصليب — يصغر مع الزوم
                          const r = 0.15 / calibZoom;     // نقطة مركزية دقيقة
                          const fontSize = 1.5 / calibZoom;
                          return (
                            <g key={i}>
                              {/* Crosshair lines */}
                              <line x1={pt.x - armLen} y1={pt.y} x2={pt.x + armLen} y2={pt.y}
                                stroke={i === 0 ? "#dc2626" : "#2563eb"} strokeWidth={0.15 / calibZoom} vectorEffect="non-scaling-stroke" />
                              <line x1={pt.x} y1={pt.y - armLen} x2={pt.x} y2={pt.y + armLen}
                                stroke={i === 0 ? "#dc2626" : "#2563eb"} strokeWidth={0.15 / calibZoom} vectorEffect="non-scaling-stroke" />
                              {/* Center dot */}
                              <circle cx={pt.x} cy={pt.y} r={r} fill={i === 0 ? "#dc2626" : "#2563eb"} />
                              {/* Label */}
                              <text x={pt.x + armLen + 0.3 / calibZoom} y={pt.y - armLen} textAnchor="start"
                                fill={i === 0 ? "#dc2626" : "#1d4ed8"} fontSize={fontSize} fontWeight="800" fontFamily="Cairo">{i + 1}</text>
                            </g>
                          );
                        })}
                        {calibPoints.length === 2 && (
                          <line x1={calibPoints[0].x} y1={calibPoints[0].y} x2={calibPoints[1].x} y2={calibPoints[1].y}
                            stroke="#2563eb" strokeWidth={0.15 / calibZoom} strokeDasharray={`${0.6 / calibZoom} ${0.3 / calibZoom}`} vectorEffect="non-scaling-stroke" />
                        )}
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Points status */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2.5 rounded-xl border text-center ${calibPoints.length >= 1 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold mb-1 ${calibPoints.length >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>1</div>
                <p className="text-[9px] font-medium text-slate-600">{calibPoints.length >= 1 ? `${calibPoints[0].x.toFixed(1)}%, ${calibPoints[0].y.toFixed(1)}%` : (isAr ? "انتظار..." : "Waiting...")}</p>
              </div>
              <div className={`p-2.5 rounded-xl border text-center ${calibPoints.length >= 2 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold mb-1 ${calibPoints.length >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>2</div>
                <p className="text-[9px] font-medium text-slate-600">{calibPoints.length >= 2 ? `${calibPoints[1].x.toFixed(1)}%, ${calibPoints[1].y.toFixed(1)}%` : (isAr ? "انتظار..." : "Waiting...")}</p>
              </div>
            </div>

            {/* Distance input */}
            {calibPoints.length === 2 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <label className="text-sm font-cairo font-bold text-amber-800 flex-shrink-0">{isAr ? "المسافة الحقيقية:" : "Real distance:"}</label>
                <input type="number" inputMode="decimal" min="0.1" step="0.1" value={calibDistance} onChange={e => setCalibDistance(e.target.value)}
                  placeholder={isAr ? "مثال: 15.5" : "e.g. 15.5"} autoFocus
                  className="flex-1 h-10 text-lg font-mono text-center border-2 border-amber-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                  data-testid="calibration-distance-input" />
                <span className="text-sm font-bold text-amber-700">{isAr ? "متر" : "m"}</span>
              </div>
            )}

            {/* Existing calibration info */}
            {calibFloor?.scale_calibration && calibPoints.length === 2 && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-700 text-center font-cairo">
                {isAr ? `المعايرة الحالية: ${calibFloor.scale_calibration.distance_meters} متر — عدّل الرقم أعلاه واحفظ، أو أعد تحديد النقاط` : `Current: ${calibFloor.scale_calibration.distance_meters}m — edit above & save, or reset points`}
              </div>
            )}
          </div>

          <DialogFooter>
            {calibPoints.length === 2 && (
              <Button onClick={handleSaveCalibration} className="bg-blue-600 hover:bg-blue-700" disabled={!calibDistance} data-testid="save-calibration-btn">
                <Save className="w-4 h-4 ml-1" />{isAr ? "حفظ المعايرة" : "Save Calibration"}
              </Button>
            )}
            <Button variant="outline" onClick={() => { setCalibPoints([]); }}>
              {isAr ? "إعادة تحديد النقاط" : "Reset Points"}
            </Button>
            <Button variant="outline" onClick={() => { setCalibFloor(null); setCalibPoints([]); }}>
              {isAr ? "إغلاق" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
