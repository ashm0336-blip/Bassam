import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Edit2, Trash2, Save, X, RefreshCw, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ZoneCategoryManager() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ value: "", label_ar: "", label_en: "", color: "#22c55e", icon: "M", order: 0 });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/admin/zone-categories`, getAuthHeaders());
      setCategories(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSave = async () => {
    if (!form.value || !form.label_ar) return;
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/admin/zone-categories/${editing.id}`, form, getAuthHeaders());
        toast.success(isAr ? "تم تحديث الفئة" : "Category updated");
      } else {
        await axios.post(`${API}/admin/zone-categories`, form, getAuthHeaders());
        toast.success(isAr ? "تم إضافة الفئة" : "Category added");
      }
      setShowDialog(false);
      setEditing(null);
      fetchCategories();
    } catch (e) {
      toast.error(e.response?.data?.detail || (isAr ? "حدث خطأ" : "Error"));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`${API}/admin/zone-categories/${deleteId}`, getAuthHeaders());
      toast.success(isAr ? "تم حذف الفئة" : "Category deleted");
      setDeleteId(null);
      fetchCategories();
    } catch (e) { toast.error(isAr ? "تعذر الحذف" : "Delete failed"); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ value: "", label_ar: "", label_en: "", color: "#22c55e", icon: "M", order: categories.length + 1 });
    setShowDialog(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ value: cat.value, label_ar: cat.label_ar, label_en: cat.label_en, color: cat.color, icon: cat.icon, order: cat.order });
    setShowDialog(true);
  };

  const handleSeed = async () => {
    try {
      const res = await axios.post(`${API}/admin/zone-categories/seed`, {}, getAuthHeaders());
      toast.success(res.data.message);
      fetchCategories();
    } catch (e) { toast.error(isAr ? "حدث خطأ" : "Error"); }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</div>;
  }

  return (
    <div className="space-y-5" data-testid="zone-category-manager">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-cairo font-bold text-lg">{isAr ? "إدارة فئات المناطق" : "Zone Categories"}</h2>
          <p className="text-sm text-muted-foreground">{isAr ? "إضافة وتعديل وحذف فئات المصليات والمناطق" : "Add, edit, and delete zone categories"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCategories} data-testid="refresh-categories">
            <RefreshCw className="w-4 h-4 ml-1" />{isAr ? "تحديث" : "Refresh"}
          </Button>
          {categories.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeed} data-testid="seed-categories">
              {isAr ? "تهيئة افتراضية" : "Seed Defaults"}
            </Button>
          )}
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={openAdd} data-testid="add-category-btn">
            <Plus className="w-4 h-4 ml-1" />{isAr ? "إضافة فئة" : "Add Category"}
          </Button>
        </div>
      </div>

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            {isAr ? "لا توجد فئات. اضغط 'تهيئة افتراضية' لإضافة الفئات الأساسية." : "No categories. Click 'Seed Defaults' to add basic categories."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className={`group rounded-xl border p-4 transition-all hover:shadow-md ${!cat.is_active ? "opacity-50" : ""}`}
              data-testid={`category-card-${cat.value}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm">{cat.label_ar}</p>
                    <p className="text-xs text-muted-foreground">{cat.label_en}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[9px] px-1.5 font-mono">{cat.value}</Badge>
                      <span className="text-[9px] text-muted-foreground">#{cat.order}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)} data-testid={`edit-cat-${cat.value}`}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => setDeleteId(cat.id)} data-testid={`delete-cat-${cat.value}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {/* Color preview bar */}
              <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              {editing ? <Edit2 className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
              {editing ? (isAr ? "تعديل الفئة" : "Edit Category") : (isAr ? "إضافة فئة جديدة" : "Add Category")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow" style={{ backgroundColor: form.color }}>
                {form.icon || "?"}
              </div>
              <div>
                <p className="font-bold text-sm">{form.label_ar || (isAr ? "اسم الفئة" : "Category name")}</p>
                <p className="text-xs text-muted-foreground">{form.label_en || "English name"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">{isAr ? "الاسم بالعربية" : "Arabic Name"}</Label>
                <Input className="mt-1" value={form.label_ar} onChange={(e) => setForm(p => ({ ...p, label_ar: e.target.value }))} data-testid="cat-name-ar" />
              </div>
              <div>
                <Label className="text-xs font-medium">{isAr ? "الاسم بالإنجليزية" : "English Name"}</Label>
                <Input className="mt-1" value={form.label_en} onChange={(e) => setForm(p => ({ ...p, label_en: e.target.value }))} data-testid="cat-name-en" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-medium">{isAr ? "المعرّف" : "Key"}</Label>
                <Input className="mt-1 font-mono text-xs" dir="ltr" value={form.value} onChange={(e) => setForm(p => ({ ...p, value: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} disabled={!!editing} data-testid="cat-value" />
              </div>
              <div>
                <Label className="text-xs font-medium">{isAr ? "الرمز" : "Icon"}</Label>
                <Input className="mt-1 text-center font-bold" maxLength={2} value={form.icon} onChange={(e) => setForm(p => ({ ...p, icon: e.target.value }))} data-testid="cat-icon" />
              </div>
              <div>
                <Label className="text-xs font-medium">{isAr ? "الترتيب" : "Order"}</Label>
                <Input type="number" className="mt-1" value={form.order} onChange={(e) => setForm(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} data-testid="cat-order" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">{isAr ? "اللون" : "Color"}</Label>
              <div className="flex items-center gap-3 mt-1">
                <input type="color" value={form.color} onChange={(e) => setForm(p => ({ ...p, color: e.target.value }))} className="w-10 h-10 rounded-lg cursor-pointer border-0" data-testid="cat-color" />
                <Input value={form.color} onChange={(e) => setForm(p => ({ ...p, color: e.target.value }))} className="font-mono text-xs flex-1" dir="ltr" data-testid="cat-color-hex" />
                {/* Quick color presets */}
                <div className="flex gap-1">
                  {["#22c55e","#93c5fd","#16a34a","#60a5fa","#9ca3af","#fdba74","#78350f","#1e3a5f","#ea580c","#be123c","#1d4ed8","#374151","#4ade80","#a8a29e","#b0b0b0"].map(c => (
                    <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))} className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 ${form.color === c ? "border-slate-900 scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving || !form.value || !form.label_ar} className="bg-emerald-600 hover:bg-emerald-700" data-testid="save-category-btn">
              {saving ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
              {isAr ? "حفظ" : "Save"}
            </Button>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />{isAr ? "تأكيد حذف الفئة" : "Confirm Delete"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-red-700">
              {isAr
                ? `هل تريد حذف الفئة "${categories.find(c => c.id === deleteId)?.label_ar || ""}"؟`
                : `Delete category "${categories.find(c => c.id === deleteId)?.label_en || ""}"?`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDelete} data-testid="confirm-delete-cat">
              <Trash2 className="w-4 h-4 ml-1" />{isAr ? "حذف" : "Delete"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{isAr ? "إلغاء" : "Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
