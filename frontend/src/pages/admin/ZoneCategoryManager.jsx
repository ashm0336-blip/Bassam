import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useRealtimeRefresh } from "@/context/WebSocketContext";
import {
  Plus, Edit2, Trash2, Save, Palette, Layers,
  ChevronDown, ChevronUp, Eye, Sparkles, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";
import { getPatternContent, PatternPreviewSvg } from "@/pages/DailySessions/components/ZonePatterns";
import { PATTERN_TYPES } from "@/pages/DailySessions/constants";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QUICK_COLORS = [
  "#22c55e","#16a34a","#4ade80",
  "#3b82f6","#60a5fa","#1d4ed8","#1e3a5f",
  "#93c5fd","#ec4899","#be123c",
  "#f59e0b","#fdba74","#ea580c",
  "#8b5cf6","#9ca3af","#78350f",
  "#374151","#a8a29e","#b0b0b0",
];

// Live zone polygon preview
function ZonePreview({ cat, size = 120 }) {
  const fillType = cat.fill_type || "solid";
  const patternType = cat.pattern_type;
  const fg = cat.pattern_fg_color || "#000000";
  const bg = cat.pattern_bg_color || "#ffffff";
  const color = cat.color || "#22c55e";
  const patternId = `cat-preview-${cat.value || "new"}-${patternType}`;
  const tileSize = 6;

  const points = "30,8 80,8 95,35 95,75 70,92 30,92 5,75 5,35";

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        {fillType === "pattern" && patternType && (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width={tileSize} height={tileSize}>
            <rect width={tileSize} height={tileSize} fill={bg} />
            {getPatternContent(patternType, fg, tileSize)}
          </pattern>
        )}
      </defs>
      {/* Shadow */}
      <polygon points={points} fill="#00000015" transform="translate(3,3)" />
      {/* Zone polygon */}
      <polygon
        points={points}
        fill={fillType === "pattern" && patternType ? `url(#${patternId})` : color}
        fillOpacity={fillType === "pattern" ? 0.9 : 0.45}
        stroke={cat.stroke_color || color}
        strokeWidth={Math.max((cat.stroke_width || 0.3) * 8, 1.5)}
        strokeOpacity={cat.stroke_opacity ?? 0.9}
        strokeDasharray={
          (cat.stroke_style || "dashed") === "solid" ? "none"
          : (cat.stroke_style || "dashed") === "dotted" ? "3 4"
          : (cat.stroke_style || "dashed") === "dash-dot" ? "10 4 2 4"
          : "8 4"
        }
      />
      {/* Icon label */}
      <circle cx="50" cy="50" r="14" fill={color} fillOpacity="0.9" />
      <text x="50" y="55" textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize="12" fontWeight="800" fontFamily="Cairo, sans-serif">
        {cat.icon || "?"}
      </text>
    </svg>
  );
}

// Category card
function CategoryCard({ cat, onEdit, onDelete }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const hasPattern = cat.fill_type === "pattern" && cat.pattern_type;
  const fg = cat.pattern_fg_color || "#000";
  const bg = cat.pattern_bg_color || "#fff";

  return (
    <div
      className="group relative rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden bg-white hover:-translate-y-0.5"
      style={{ boxShadow: `0 2px 12px ${cat.color}22` }}
      data-testid={`category-card-${cat.value}`}
    >
      {/* شريط علوي ملون */}
      <div className="h-1.5 w-full" style={{ background: cat.color }} />

      {/* خلفية gradient خفيفة */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ background: `radial-gradient(circle at top right, ${cat.color}, transparent 70%)` }} />

      <div className="relative p-4">
        {/* الصف الأول: المعاينة البصرية + الاسم + الإجراءات */}
        <div className="flex items-center gap-3.5 mb-3">
          {/* ZonePreview — البطل البصري */}
          <div className="flex-shrink-0 rounded-xl overflow-hidden border-2 shadow-md"
            style={{ borderColor: cat.color + "40" }}>
            <ZonePreview cat={cat} size={68} />
          </div>

          {/* الاسم والكود */}
          <div className="flex-1 min-w-0">
            <h3 className="font-cairo font-bold text-base leading-tight truncate" style={{ color: cat.color }}>
              {cat.label_ar}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{cat.label_en}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: cat.color + "15", color: cat.color, border: `1px solid ${cat.color}30` }}>
                {cat.value}
              </span>
              {!cat.is_active && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">
                  معطّلة
                </span>
              )}
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0">
            <button onClick={() => onEdit(cat)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
              style={{ backgroundColor: cat.color + "15", color: cat.color }}
              data-testid={`edit-cat-${cat.value}`}>
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(cat.id)}
              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-all hover:scale-110"
              data-testid={`delete-cat-${cat.value}`}>
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </div>

        {/* Footer: لون + نقش + ترتيب */}
        <div className="flex items-center justify-between pt-2.5 border-t" style={{ borderColor: cat.color + "20" }}>
          <div className="flex items-center gap-2">
            {/* لون الـ fill */}
            <div className="w-6 h-6 rounded-lg shadow-sm border-2 border-white"
              style={{ backgroundColor: cat.color }} />
            {hasPattern && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{ backgroundColor: cat.color + "15", color: cat.color }}>
                <Sparkles className="w-2.5 h-2.5" />
                نقش
              </div>
            )}
            {/* mini pattern preview */}
            {hasPattern && (
              <div className="w-10 h-4 rounded border border-slate-200 overflow-hidden">
                <svg width="100%" height="16" viewBox="0 0 40 16">
                  <defs>
                    <pattern id={`mini-${cat.value}`} patternUnits="userSpaceOnUse" width="6" height="6">
                      <rect width="6" height="6" fill={bg} />
                      {getPatternContent(cat.pattern_type, fg, 6)}
                    </pattern>
                  </defs>
                  <rect width="40" height="16" fill={`url(#mini-${cat.value})`} />
                  <rect width="40" height="16" fill={cat.color} fillOpacity="0.2" />
                </svg>
              </div>
            )}
          </div>
          <span className="text-[10px] font-black tabular-nums"
            style={{ color: cat.color + "aa" }}>
            #{String(cat.order).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export default function ZoneCategoryManager() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showPatternSection, setShowPatternSection] = useState(false);

  const emptyForm = {
    value: "", label_ar: "", label_en: "", color: "#22c55e", icon: "M", order: 0,
    fill_type: "solid", pattern_type: null, pattern_fg_color: "#000000", pattern_bg_color: "#ffffff",
    stroke_color: "#000000", stroke_width: 0.3, stroke_style: "dashed", stroke_opacity: 1.0
  };
  const [form, setForm] = useState(emptyForm);

  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/zone-categories`, getAuthHeaders());
      setCategories(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useRealtimeRefresh(["settings"], fetchCategories);

  const handleSave = async () => {
    if (!form.value || !form.label_ar) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.fill_type === "solid") {
        payload.pattern_type = null;
        payload.pattern_fg_color = null;
        payload.pattern_bg_color = null;
      }
      if (editing) {
        await axios.put(`${API}/admin/zone-categories/${editing.id}`, payload, getAuthHeaders());
        toast.success(isAr ? "✅ تم تطبيق التغييرات على جميع المناطق — أعد فتح الجلسة من التقويم لرؤية التحديث" : "✅ Changes applied to all zones — reopen session from calendar to see updates", { duration: 5000 });
      } else {
        await axios.post(`${API}/admin/zone-categories`, payload, getAuthHeaders());
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
    setForm({ ...emptyForm, order: categories.length + 1 });
    setShowPatternSection(false);
    setShowDialog(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({
      value: cat.value, label_ar: cat.label_ar, label_en: cat.label_en,
      color: cat.color, icon: cat.icon, order: cat.order,
      fill_type: cat.fill_type || "solid",
      pattern_type: cat.pattern_type || null,
      pattern_fg_color: cat.pattern_fg_color || "#000000",
      pattern_bg_color: cat.pattern_bg_color || "#ffffff",
      stroke_color: cat.stroke_color || "#000000",
      stroke_width: cat.stroke_width ?? 0.3,
      stroke_style: cat.stroke_style || "dashed",
      stroke_opacity: cat.stroke_opacity ?? 1.0,
    });
    setShowPatternSection(cat.fill_type === "pattern");
    setShowDialog(true);
  };

  const handleSeed = async () => {
    try {
      const res = await axios.post(`${API}/admin/zone-categories/seed`, {}, getAuthHeaders());
      toast.success(res.data.message);
      fetchCategories();
    } catch (e) { toast.error(isAr ? "حدث خطأ" : "Error"); }
  };

  const setF = (upd) => setForm(p => ({ ...p, ...upd }));

  if (loading) return <div className="text-center py-12 text-muted-foreground animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

  return (
    <div className="space-y-6" data-testid="zone-category-manager">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-cairo font-bold text-xl flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Layers className="w-4 h-4 text-emerald-600" />
            </div>
            {isAr ? "إدارة فئات المناطق" : "Zone Categories"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5 mr-10">{isAr ? "إضافة وتعديل فئات المصليات مع اللون والنقش — تنعكس مباشرة على الخرائط" : "Manage prayer area categories with color & pattern — reflected live on maps"}</p>
        </div>
        <div className="flex gap-2">
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

      {/* ── Summary stats — تصميم خرافي ─────────────────────── */}
      {categories.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: isAr ? "إجمالي الفئات" : "Total",
              value: categories.length,
              desc: isAr ? "كل أنواع المصليات" : "All categories",
              color: "#2563eb", grad: "from-blue-50 to-indigo-50/60", border: "#bfdbfe",
              Icon: Layers,
            },
            {
              label: isAr ? "بنقش" : "With Pattern",
              value: categories.filter(c => c.fill_type === "pattern").length,
              desc: isAr ? "فئات بتصميم نقشي" : "Patterned categories",
              color: "#8b5cf6", grad: "from-violet-50 to-purple-50/60", border: "#c4b5fd",
              Icon: Sparkles,
            },
            {
              label: isAr ? "نشطة" : "Active",
              value: categories.filter(c => c.is_active !== false).length,
              desc: isAr ? "تظهر على الخرائط" : "Visible on maps",
              color: "#059669", grad: "from-emerald-50 to-green-50/60", border: "#a7f3d0",
              Icon: CheckCircle2,
            },
          ].map((s, i) => {
            const pct = categories.length > 0 ? Math.round(s.value / categories.length * 100) : 0;
            return (
              <div key={i}
                className={`group relative overflow-hidden rounded-2xl border p-4 bg-gradient-to-br ${s.grad} hover:shadow-md hover:scale-[1.01] transition-all duration-200`}
                style={{ borderColor: s.color + "40" }}>
                <div className="absolute -left-4 -bottom-4 w-16 h-16 rounded-full opacity-[0.07]"
                  style={{ backgroundColor: s.color }} />
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm mb-3"
                  style={{ backgroundColor: s.color + "20" }}>
                  <s.Icon className="w-4.5 h-4.5" style={{ color: s.color }} />
                </div>
                <p className="text-3xl font-black leading-none tabular-nums mb-1" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="text-[11px] font-bold text-slate-700">{s.label}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{s.desc}</p>
                <div className="mt-2.5 h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: s.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Categories Grid ────────────────────────────────── */}
      {categories.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-16 text-center">
          <Layers className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-muted-foreground text-sm">{isAr ? "لا توجد فئات. اضغط 'تهيئة افتراضية' لإضافة الفئات الأساسية." : "No categories yet."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {categories.map(cat => (
            <CategoryCard key={cat.id} cat={cat} onEdit={openEdit} onDelete={setDeleteId} />
          ))}
        </div>
      )}

      {/* ── Add/Edit Dialog ────────────────────────────────── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2 text-base">
              {editing ? <Edit2 className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-emerald-600" />}
              {editing ? (isAr ? "تعديل الفئة" : "Edit Category") : (isAr ? "إضافة فئة جديدة" : "Add Category")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Live Preview + Inputs side by side */}
            <div className="flex gap-4 p-3 rounded-xl border bg-gradient-to-br from-slate-50 to-white">
              {/* Live map zone preview */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <ZonePreview cat={form} size={90} />
                <span className="text-[9px] text-slate-400">{isAr ? "معاينة" : "Preview"}</span>
              </div>
              {/* Names */}
              <div className="flex-1 space-y-2.5">
                <div>
                  <Label className="text-[10px] text-slate-500 font-medium">{isAr ? "الاسم بالعربية *" : "Arabic Name *"}</Label>
                  <Input className="mt-1 h-8 text-sm" value={form.label_ar} onChange={(e) => setF({ label_ar: e.target.value })} data-testid="cat-name-ar" />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500 font-medium">{isAr ? "الاسم بالإنجليزية" : "English Name"}</Label>
                  <Input className="mt-1 h-8 text-sm" value={form.label_en} onChange={(e) => setF({ label_en: e.target.value })} data-testid="cat-name-en" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] text-slate-500 font-medium">{isAr ? "المعرّف *" : "Key *"}</Label>
                    <Input className="mt-1 h-8 text-xs font-mono" dir="ltr" value={form.value} disabled={!!editing}
                      onChange={(e) => setF({ value: e.target.value.toLowerCase().replace(/\s+/g, "_") })} data-testid="cat-value" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500 font-medium">{isAr ? "الرمز" : "Icon"}</Label>
                    <Input className="mt-1 h-8 text-center font-bold text-base" maxLength={2} value={form.icon}
                      onChange={(e) => setF({ icon: e.target.value })} data-testid="cat-icon" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-500 font-medium">{isAr ? "الترتيب" : "Order"}</Label>
                    <Input type="number" className="mt-1 h-8 text-sm" value={form.order}
                      onChange={(e) => setF({ order: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Color Section ──────────────── */}
            <div className="rounded-xl border p-3 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-4 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-700 font-cairo">{isAr ? "اللون الأساسي" : "Primary Color"}</span>
              </div>
              {/* Quick swatches */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_COLORS.map(c => (
                  <button key={c} onClick={() => setF({ color: c })}
                    className="w-6 h-6 rounded-md border-2 transition-all hover:scale-110 flex-shrink-0"
                    style={{ backgroundColor: c, borderColor: form.color === c ? "#1e293b" : "transparent" }} />
                ))}
                <input type="color" value={form.color} onChange={(e) => setF({ color: e.target.value })}
                  className="w-6 h-6 rounded-md cursor-pointer border border-slate-200 p-0" title={isAr ? "لون مخصص" : "Custom color"} data-testid="cat-color" />
              </div>
              <div className="flex items-center gap-2">
                <Input value={form.color} onChange={(e) => setF({ color: e.target.value })}
                  className="font-mono text-xs h-7 flex-1" dir="ltr" data-testid="cat-color-hex" />
                <span className="text-[10px] text-slate-400">{isAr ? "أو أدخل رمز اللون" : "or enter hex"}</span>
              </div>
            </div>

            {/* ── Pattern Section ────────────── */}
            <div className="rounded-xl border overflow-hidden">
              <button
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold font-cairo transition-all ${showPatternSection ? "bg-violet-50 text-violet-700" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                onClick={() => {
                  const next = !showPatternSection;
                  setShowPatternSection(next);
                  if (!next) setF({ fill_type: "solid", pattern_type: null });
                  else setF({ fill_type: "pattern", pattern_type: form.pattern_type || "diagonal-right" });
                }}
                data-testid="toggle-pattern-section"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-3.5 h-3.5 ${showPatternSection ? "text-violet-500" : "text-slate-400"}`} />
                  {isAr ? "تفعيل نقش للفئة" : "Enable Pattern Fill"}
                  {showPatternSection && <Badge className="text-[8px] px-1.5 h-4 bg-violet-500 text-white">{isAr ? "مفعّل" : "ON"}</Badge>}
                </div>
                {showPatternSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showPatternSection && (
                <div className="p-3 space-y-3 bg-white">
                  {/* Pattern grid */}
                  <div>
                    <Label className="text-[10px] text-slate-500 mb-1.5 block">{isAr ? "نوع النقش" : "Pattern Type"}</Label>
                    <div className="grid grid-cols-6 gap-1 p-2 bg-slate-50 rounded-lg border">
                      {PATTERN_TYPES.map(pt => (
                        <PatternPreviewSvg
                          key={pt.value}
                          patternType={pt.value}
                          fgColor={form.pattern_fg_color || "#000"}
                          bgColor={form.pattern_bg_color || "#fff"}
                          size={36}
                          selected={form.pattern_type === pt.value}
                          onClick={() => setF({ pattern_type: pt.value })}
                          label={isAr ? pt.label_ar : pt.label_en}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Pattern colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] text-slate-500">{isAr ? "لون النقش" : "Pattern Color"}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={form.pattern_fg_color || "#000000"}
                          onChange={(e) => setF({ pattern_fg_color: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5" data-testid="cat-pattern-fg" />
                        <span className="text-[9px] font-mono text-slate-400">{form.pattern_fg_color || "#000000"}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500">{isAr ? "لون الخلفية" : "Background Color"}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={form.pattern_bg_color || "#ffffff"}
                          onChange={(e) => setF({ pattern_bg_color: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5" data-testid="cat-pattern-bg" />
                        <span className="text-[9px] font-mono text-slate-400">{form.pattern_bg_color || "#ffffff"}</span>
                      </div>
                    </div>
                  </div>
                  {/* Pattern info */}
                  <div className="flex items-start gap-2 p-2 bg-violet-50 rounded-lg border border-violet-100">
                    <Eye className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-violet-700">{isAr ? "النقش سينعكس تلقائياً على المنطقة عند اختيار هذه الفئة في الخريطة." : "The pattern will automatically apply to zones when this category is selected on the map."}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Border Section ─────────────── */}
            <div className="rounded-xl border p-3 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-4 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-slate-700 font-cairo">{isAr ? "الإطار" : "Border"}</span>
              </div>
              {/* Color + Width */}
              <div className="flex items-center gap-2">
                <input type="color" value={form.stroke_color || "#000000"}
                  onChange={(e) => setF({ stroke_color: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 flex-shrink-0"
                  data-testid="cat-stroke-color" />
                <div className="flex-1">
                  <Label className="text-[9px] text-slate-400 mb-1 block">{isAr ? "السماكة" : "Width"} {(form.stroke_width ?? 0.3).toFixed(1)}</Label>
                  <Slider value={[form.stroke_width ?? 0.3]} min={0.1} max={3} step={0.1}
                    onValueChange={([v]) => setF({ stroke_width: v })} />
                </div>
                <div className="flex-1">
                  <Label className="text-[9px] text-slate-400 mb-1 block">{isAr ? "الشفافية" : "Opacity"} {Math.round((form.stroke_opacity ?? 1) * 100)}%</Label>
                  <Slider value={[Math.round((form.stroke_opacity ?? 1) * 100)]} min={0} max={100} step={10}
                    onValueChange={([v]) => setF({ stroke_opacity: v / 100 })} />
                </div>
              </div>
              {/* Border style */}
              <div className="grid grid-cols-4 gap-1">
                {[
                  { v: "solid",    dash: "none",      label_ar: "متصل",    label_en: "Solid" },
                  { v: "dashed",   dash: "6 3",       label_ar: "متقطع",   label_en: "Dashed" },
                  { v: "dotted",   dash: "1 2",       label_ar: "نقطي",    label_en: "Dotted" },
                  { v: "dash-dot", dash: "6 2 1 2",   label_ar: "شرطة-نقطة", label_en: "Dash·Dot" },
                ].map(s => (
                  <button key={s.v} onClick={() => setF({ stroke_style: s.v })}
                    className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg border text-[9px] font-medium transition-all ${
                      (form.stroke_style || "dashed") === s.v
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                        : "border-slate-200 hover:bg-slate-50 text-slate-400"
                    }`}
                    data-testid={`cat-stroke-${s.v}`}
                  >
                    <svg width="28" height="4" viewBox="0 0 28 4">
                      <line x1="1" y1="2" x2="27" y2="2"
                        stroke={(form.stroke_style || "dashed") === s.v ? "#3b82f6" : "#94a3b8"}
                        strokeWidth="2.5" strokeDasharray={s.dash} />
                    </svg>
                    <span>{isAr ? s.label_ar : s.label_en}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button onClick={handleSave} disabled={saving || !form.value || !form.label_ar} className="bg-emerald-600 hover:bg-emerald-700" data-testid="save-category-btn">
              {saving ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
              {isAr ? "حفظ الفئة وتطبيق التغييرات" : "Save & Apply to All Zones"}
            </Button>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-cairo text-red-600 flex items-center gap-2 text-sm">
              <Trash2 className="w-4 h-4" />{isAr ? "تأكيد حذف الفئة" : "Confirm Delete"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-sm text-red-700">
              {isAr ? `هل تريد حذف الفئة "${categories.find(c => c.id === deleteId)?.label_ar || ""}"؟` : `Delete category "${categories.find(c => c.id === deleteId)?.label_en || ""}"?`}
            </p>
            <p className="text-[10px] text-red-400 mt-1">{isAr ? "لن تتأثر المناطق الموجودة حالياً." : "Existing zones won't be affected."}</p>
          </div>
          <DialogFooter>
            <Button variant="destructive" size="sm" onClick={handleDelete} data-testid="confirm-delete-cat">
              <Trash2 className="w-3.5 h-3.5 ml-1" />{isAr ? "حذف" : "Delete"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>{isAr ? "إلغاء" : "Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
