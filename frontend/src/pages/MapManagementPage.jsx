import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Plus, Trash2, Save, X, Upload, Layers, Edit2, RefreshCw, Image as ImageIcon,
  CheckCircle2, AlertTriangle, BarChart3, ArrowUpDown,
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

  useEffect(() => { fetchFloors(); }, [fetchFloors]);

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
            <Button variant="outline" onClick={fetchFloors} data-testid="refresh-floors-button">
              <RefreshCw className="w-4 h-4 ml-2" />{isAr ? "تحديث" : "Refresh"}
            </Button>
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
                    <Button variant="outline" size="sm" className="hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                      onClick={() => setDeleteFloorId(floor.id)} data-testid={`floor-delete-${floor.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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
                <Input type="number" value={floorForm.floor_number} onChange={e => setFloorForm(p => ({ ...p, floor_number: parseInt(e.target.value) || 0 }))} className="mt-1" data-testid="floor-number-input" />
              </div>
              <div>
                <Label className="text-sm font-medium">{isAr ? "الترتيب" : "Order"}</Label>
                <Input type="number" value={floorForm.order} onChange={e => setFloorForm(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} className="mt-1" data-testid="floor-order-input" />
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
    </div>
  );
}
