import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Plus, Trash2, Save, Upload, Layers, Edit2, RefreshCw, Image as ImageIcon
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import { Progress } from "@/components/ui/progress";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GateMapPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();

  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFloorDialog, setShowFloorDialog] = useState(false);
  const [deleteFloorId, setDeleteFloorId] = useState(null);
  const [isDeletingFloor, setIsDeletingFloor] = useState(false);
  const [floorForm, setFloorForm] = useState({ name_ar: "", name_en: "", image_url: "", order: 0 });
  const [editingFloor, setEditingFloor] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localImagePreview, setLocalImagePreview] = useState(null);

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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFloors(); }, [fetchFloors]);
  useEffect(() => { return () => { if (localImagePreview) URL.revokeObjectURL(localImagePreview); }; }, [localImagePreview]);

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
      fetchFloors();
      toast({ title: isAr ? "تم الحذف" : "Deleted" });
    } catch (e) { toast({ title: isAr ? "تعذر الحذف" : "Error", variant: "destructive" }); }
    finally { setIsDeletingFloor(false); setDeleteFloorId(null); }
  };

  const floorPreviewUrl = localImagePreview || (floorForm.image_url ? normalizeImageUrl(floorForm.image_url) : "");

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
    <div className="space-y-6" data-testid="gate-map-page">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-l from-blue-50 via-white to-slate-50 p-6">
        <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-blue-200/30 blur-2xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200"><Layers className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="font-cairo font-bold text-2xl" data-testid="page-title">{isAr ? "إدارة خرائط الأبواب" : "Gate Map Management"}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{isAr ? "إدارة طوابق خرائط الأبواب - رفع وتنظيم صور الأدوار" : "Manage gate map floors - upload and organize floor images"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchFloors} data-testid="refresh-btn"><RefreshCw className="w-4 h-4 ml-2" />{isAr ? "تحديث" : "Refresh"}</Button>
            <Button onClick={() => { setEditingFloor(null); setFloorForm({ name_ar: "", name_en: "", image_url: "", order: 0 }); setLocalImagePreview(null); setShowFloorDialog(true); }} className="bg-blue-600 hover:bg-blue-700" data-testid="add-gate-floor-btn">
              <Plus className="w-4 h-4 ml-2" />{isAr ? "إضافة طابق" : "Add Floor"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-muted-foreground">{isAr ? "إجمالي الطوابق" : "Total Floors"}</p><p className="text-2xl font-bold mt-1">{floors.length}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-muted-foreground">{isAr ? "بصورة" : "With Image"}</p><p className="text-2xl font-bold mt-1 text-emerald-600">{floors.filter(f => f.image_url).length}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-muted-foreground">{isAr ? "بدون صورة" : "No Image"}</p><p className="text-2xl font-bold mt-1 text-amber-600">{floors.filter(f => !f.image_url).length}</p></div>
      </div>

      {/* Floors Grid */}
      {floors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-4"><Layers className="w-8 h-8 text-slate-400" /></div>
            <h3 className="font-cairo font-semibold text-lg text-slate-600 mb-2">{isAr ? "لا توجد طوابق بعد" : "No floors yet"}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">{isAr ? "ابدأ بإضافة طوابق خرائط الأبواب ورفع صور الأدوار" : "Start by adding gate map floors and uploading images"}</p>
            <Button onClick={() => { setEditingFloor(null); setFloorForm({ name_ar: "", name_en: "", image_url: "", order: 0 }); setLocalImagePreview(null); setShowFloorDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 ml-2" />{isAr ? "إضافة أول طابق" : "Add First Floor"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {floors.sort((a, b) => (a.order || 0) - (b.order || 0)).map(floor => (
            <Card key={floor.id} className="group overflow-hidden transition-all hover:shadow-lg hover:border-blue-200" data-testid={`floor-card-${floor.id}`}>
              <div className="relative h-44 bg-slate-100 overflow-hidden">
                {floor.image_url ? (
                  <img src={normalizeImageUrl(floor.image_url)} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300"><ImageIcon className="w-12 h-12 mb-2" /><span className="text-xs">{isAr ? "لا توجد صورة" : "No image"}</span></div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-white/90 backdrop-blur-sm text-slate-700 border shadow-sm text-xs font-bold px-2.5">
                    {isAr ? `ترتيب ${floor.order || 0}` : `Order ${floor.order || 0}`}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-cairo font-bold text-base">{isAr ? floor.name_ar : (floor.name_en || floor.name_ar)}</h3>
                    {floor.name_en && isAr && <p className="text-xs text-muted-foreground">{floor.name_en}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingFloor(floor); setFloorForm({ name_ar: floor.name_ar, name_en: floor.name_en || "", image_url: normalizeImageUrl(floor.image_url) || "", order: floor.order || 0 }); setLocalImagePreview(null); setShowFloorDialog(true); }} data-testid={`floor-edit-${floor.id}`}>
                    <Edit2 className="w-3.5 h-3.5 ml-1.5" />{isAr ? "تعديل" : "Edit"}
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteFloorId(floor.id)} data-testid={`floor-delete-${floor.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
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
                  <p className="text-sm text-slate-600">{isAr ? "اسحب الصورة هنا أو انقر للاختيار" : "Drag & drop or click to browse"}</p>
                  <p className="text-xs text-slate-400">{isDragOver ? (isAr ? "أفلت الصورة للرفع" : "Drop to upload") : "PNG, JPG, WEBP"}</p>
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
            <p className="text-sm text-red-700">{isAr ? `هل تريد حذف الطابق "${floors.find(f => f.id === deleteFloorId)?.name_ar || ""}"؟ لا يمكن التراجع عن هذا الإجراء.` : `Delete "${floors.find(f => f.id === deleteFloorId)?.name_en || ""}"? This cannot be undone.`}</p>
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
