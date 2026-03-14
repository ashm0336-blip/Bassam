import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeRefresh } from "@/context/WebSocketContext";
import { PLAZA_COLORS, GATE_TYPES, DIRECTIONS, CATEGORIES, CLASSIFICATIONS, GATE_STATUSES, CURRENT_INDICATORS } from "@/constants/gateData";
import {
  Plus, Edit, Trash2, Loader2,
  DoorOpen, DoorClosed, Users, AlertTriangle, Activity,
  MapPin, ArrowUpDown, Tag, Shield, Hash, MoreVertical,
  Search, LayoutGrid, List, Download, Upload, FileText, ChevronDown, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GatesDataManagement() {
  const { language } = useLanguage();
  const { isReadOnly, canWrite } = useAuth();
  const [gates, setGates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedGate, setSelectedGate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    plaza: "الساحة الشرقية",
    gate_type: "رئيسي",
    direction: "دخول",
    category: [],
    classification: "عام",
    status: "مفتوح",
    current_indicator: "خفيف",
    current_flow: 0,
    max_flow: 5000
  });

  // Toolbar state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterPlaza, setFilterPlaza] = useState("all");
  const [view, setView] = useState("list");

  useEffect(() => {
    fetchGates();
    fetchEmployees();
  }, []);

  useRealtimeRefresh(["gate_sessions", "maps", "employees"], useCallback(() => { fetchGates(); fetchEmployees(); }, []));

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/employees?department=gates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchGates = async () => {
    try {
      const response = await axios.get(`${API}/gates`);
      setGates(response.data);
    } catch (error) {
      console.error("Error fetching gates:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeesAtGate = (gateName) => {
    return employees.filter(emp => emp.location === gateName && emp.is_active);
  };

  // Filtered gates
  const filtered = useMemo(() => {
    return gates.filter(g => {
      if (search && !g.name?.includes(search) && !g.number?.toString().includes(search)) return false;
      if (filterStatus !== "all" && g.status !== filterStatus) return false;
      if (filterType !== "all" && g.gate_type !== filterType) return false;
      if (filterPlaza !== "all" && g.plaza !== filterPlaza) return false;
      return true;
    });
  }, [gates, search, filterStatus, filterType, filterPlaza]);

  // Unique plazas for filter
  const plazas = useMemo(() => [...new Set(gates.map(g => g.plaza).filter(Boolean))], [gates]);

  const handleOpenDialog = (gate = null) => {
    if (gate) {
      setEditMode(true);
      setSelectedGate(gate);
      setFormData({
        name: gate.name,
        number: gate.number,
        plaza: gate.plaza,
        gate_type: gate.gate_type,
        direction: gate.direction,
        category: Array.isArray(gate.category) ? gate.category : [gate.category],
        classification: gate.classification,
        status: gate.status,
        current_indicator: gate.current_indicator,
        current_flow: gate.current_flow,
        max_flow: gate.max_flow
      });
    } else {
      setEditMode(false);
      setSelectedGate(null);
      setFormData({
        name: "",
        number: "",
        plaza: "الساحة الشرقية",
        gate_type: "رئيسي",
        direction: "دخول",
        category: [],
        classification: "عام",
        status: "مفتوح",
        current_indicator: "خفيف",
        current_flow: 0,
        max_flow: 5000
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
        number: parseInt(formData.number),
        current_flow: parseInt(formData.current_flow),
        max_flow: parseInt(formData.max_flow),
        plaza_color: PLAZA_COLORS[formData.plaza]
      };

      if (editMode) {
        await axios.put(`${API}/admin/gates/${selectedGate.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم تحديث الباب بنجاح" : "Gate updated successfully");
      } else {
        await axios.post(`${API}/admin/gates`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم إضافة الباب بنجاح" : "Gate added successfully");
      }

      setDialogOpen(false);
      fetchGates();
    } catch (error) {
      console.error("Error saving gate:", error);
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "Error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGate) return;
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/gates/${selectedGate.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? "تم حذف الباب بنجاح" : "Gate deleted successfully");
      setDeleteDialogOpen(false);
      fetchGates();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "Error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-full">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-emerald-500 to-teal-600">
            <DoorOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-cairo font-bold text-xl">
              {language === 'ar' ? 'إدارة الأبواب' : 'Gates Management'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {language === 'ar' ? 'إضافة وتعديل بيانات الأبواب وإسناد الموظفين' : 'Add and edit gates data'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canWrite("manage_gates") && (
            <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 h-9">
              <Plus className="w-4 h-4" />
              {language === 'ar' ? 'إضافة باب جديد' : 'Add New Gate'}
            </Button>
          )}
        </div>
      </div>

      {/* ══ ANALYTICS DASHBOARD — chip-based ═══════════════════ */}
      {gates.length > 0 && (() => {
        const total   = gates.length;
        const noStaff = gates.filter(g => g.status === 'مفتوح' && getEmployeesAtGate(g.name).length === 0).length;

        // helper: حساب عدد الأبواب بقيمة معينة
        const count = (field, val) => gates.filter(g =>
          Array.isArray(g[field]) ? g[field].includes(val) : g[field] === val
        ).length;

        // ألوان ثابتة لكل مجموعة
        const STATUS_COLORS   = { "مفتوح":"#059669", "مغلق":"#6b7280" };
        const TYPE_COLORS     = ["#6d28d9","#0284c7","#0f766e","#b45309","#7c3aed","#be185d","#0e7490","#65a30d","#9a3412"];
        const DIR_COLORS      = { "دخول":"#2563eb","خروج":"#dc2626","دخول وخروج":"#7c3aed" };
        const CLASS_COLORS    = { "عام":"#0f766e","رجال":"#1d4ed8","نساء":"#be185d","طوارئ":"#dc2626","خدمات":"#d97706","جنائز":"#374151" };
        const CAT_COLORS      = { "محرمين":"#7c3aed","مصلين":"#059669","عربات":"#b45309" };
        const INDICATOR_COLORS= { "خفيف":"#22c55e","متوسط":"#f97316","مزدحم":"#ef4444" };

        // chip component
        const Chip = ({ label, cnt, color, warn }) => {
          const pct = total > 0 ? Math.round(cnt/total*100) : 0;
          return (
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all
              ${cnt === 0 ? "opacity-40" : ""}
              ${warn && cnt > 0 ? "animate-pulse border-red-300 bg-red-50" : ""}`}
              style={ cnt > 0 && !warn
                ? { backgroundColor: color+"12", borderColor: color+"35" }
                : cnt > 0 && warn
                ? {}
                : { backgroundColor:"#f8fafc", borderColor:"#e2e8f0" }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cnt>0 ? color : "#cbd5e1" }}/>
              <span className="text-[10px] font-bold leading-none" style={{ color: cnt>0 ? color : "#94a3b8" }}>{label}</span>
              <span className="text-[11px] font-black tabular-nums leading-none" style={{ color: cnt>0 ? color : "#cbd5e1" }}>{cnt}</span>
              {cnt > 0 && pct < 100 && <span className="text-[8px] text-slate-400 leading-none">({pct}%)</span>}
            </div>
          );
        };

        // section card component
        const Section = ({ icon: Icon, title, iconBg, iconColor, children, warning }) => (
          <div className="rounded-2xl border bg-white p-3 hover:shadow-md transition-all duration-200 space-y-2.5"
            style={{ borderColor: iconColor+"25" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: iconBg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: iconColor }}/>
                </div>
                <span className="text-[11px] font-bold text-slate-700">{title}</span>
              </div>
              {warning && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5"/>{warning}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">{children}</div>
          </div>
        );

        return (
          <div className="space-y-3">

            {/* الصف ١: KPIs مدمجة */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label:"إجمالي",        value:total,   color:"#2563eb", Icon:DoorOpen,     desc:"باب مسجل" },
                { label:"مفتوحة",        value:count('status','مفتوح'), color:"#059669", Icon:DoorOpen,  desc:"الآن" },
                { label:"مغلقة",         value:count('status','مغلق'),  color:"#6b7280", Icon:DoorClosed,desc:"موقوف" },
                { label:"بلا موظف",      value:noStaff, color:noStaff>0?"#dc2626":"#059669", Icon:noStaff>0?AlertTriangle:Users, desc:noStaff>0?"⚠️ مفتوح":"كل مغطى" },
              ].map((s,i)=>(
                <div key={i} className="rounded-2xl border p-2.5 flex items-center gap-2.5 transition-all hover:shadow-sm"
                  style={{ backgroundColor:s.color+"08", borderColor:s.color+"30" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor:s.color+"20" }}>
                    <s.Icon className="w-4 h-4" style={{ color:s.color }}/>
                  </div>
                  <div>
                    <p className="text-xl font-black leading-none tabular-nums" style={{ color:s.color }}>{s.value}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{s.label} · {s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* الصف ٢: chips المنطقة + الحالة + المؤشر */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">

              {/* المناطق */}
              <Section icon={MapPin} title="توزيع المناطق" iconBg="#e0f2fe" iconColor="#0284c7">
                {Object.entries(PLAZA_COLORS).map(([name, color]) => (
                  <Chip key={name} label={name} cnt={count('plaza', name)} color={color}/>
                ))}
              </Section>

              {/* الحالة */}
              <Section icon={Activity} title="حالة الأبواب" iconBg="#ecfdf5" iconColor="#059669"
                warning={noStaff > 0 ? `${noStaff} مفتوح بلا غطاء` : undefined}>
                {GATE_STATUSES.map(s => (
                  <Chip key={s} label={s} cnt={count('status', s)} color={STATUS_COLORS[s]||"#6b7280"}
                    warn={s==='مفتوح' && noStaff > 0}/>
                ))}
              </Section>

              {/* المؤشر */}
              <Section icon={Activity} title="مؤشر الازدحام" iconBg="#fff7ed" iconColor="#f97316">
                {CURRENT_INDICATORS.map(ind => (
                  <Chip key={ind.value} label={ind.label} cnt={count('current_indicator', ind.value)} color={ind.color}/>
                ))}
                <Chip label="غير محدد" cnt={gates.filter(g=>!g.current_indicator).length} color="#94a3b8"/>
              </Section>
            </div>

            {/* الصف ٣: chips النوع + المسار + الفئة + التصنيف */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">

              {/* النوع */}
              <Section icon={Tag} title="نوع الباب" iconBg="#f5f3ff" iconColor="#7c3aed">
                {GATE_TYPES.map((t,i) => (
                  <Chip key={t} label={t} cnt={count('gate_type', t)} color={TYPE_COLORS[i%TYPE_COLORS.length]}/>
                ))}
              </Section>

              {/* المسار */}
              <Section icon={ArrowUpDown} title="المسار" iconBg="#fffbeb" iconColor="#d97706">
                {DIRECTIONS.map(d => (
                  <Chip key={d} label={d} cnt={count('direction', d)} color={DIR_COLORS[d]||"#6b7280"}/>
                ))}
              </Section>

              {/* الفئة */}
              <Section icon={Users} title="الفئة" iconBg="#fdf4ff" iconColor="#a21caf">
                {CATEGORIES.map(c => (
                  <Chip key={c} label={c} cnt={count('category', c)} color={CAT_COLORS[c]||"#7c3aed"}/>
                ))}
              </Section>

              {/* التصنيف */}
              <Section icon={Shield} title="التصنيف" iconBg="#fef2f2" iconColor="#dc2626">
                {CLASSIFICATIONS.map(c => (
                  <Chip key={c} label={c} cnt={count('classification', c)} color={CLASS_COLORS[c]||"#6b7280"}/>
                ))}
              </Section>
            </div>
          </div>
        );
      })()}

      {/* ── Toolbar — same design as employees ──────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            className="h-9 pr-9 text-sm" placeholder={language === 'ar' ? "بحث بالاسم أو الرقم..." : "Search..."} />
        </div>

        {/* Filter: Status */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-28 text-xs">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="مفتوح">مفتوح</SelectItem>
            <SelectItem value="مغلق">مغلق</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter: Type */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-28 text-xs">
            <SelectValue placeholder="النوع" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">كل الأنواع</SelectItem>
            {GATE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Filter: Plaza */}
        {plazas.length > 1 && (
          <Select value={filterPlaza} onValueChange={setFilterPlaza}>
            <SelectTrigger className="h-9 w-32 text-xs">
              <SelectValue placeholder="المنطقة" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">كل المناطق</SelectItem>
              {plazas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* View toggle */}
        <div className="flex border rounded-lg overflow-hidden">
          <button onClick={() => setView("cards")}
            className={`px-3 py-2 transition-colors ${view === "cards" ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView("list")}
            className={`px-3 py-2 transition-colors ${view === "list" ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />{language === 'ar' ? 'ملفات' : 'Files'}<ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" dir="rtl">
            <DropdownMenuItem onClick={() => {
              const csv = ["رقم,اسم,المنطقة,النوع,المسار,التصنيف,الحالة", ...gates.map(g =>
                `${g.number},${g.name},${g.plaza},${g.gate_type},${g.direction},${g.classification},${g.status}`)].join("\n");
              const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
              const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = "gates.csv"; a.click(); URL.revokeObjectURL(u);
              toast.success(language === 'ar' ? "تم التصدير" : "Exported");
            }}>
              <Download className="w-4 h-4 ml-2" />{language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add Gate */}
        {canWrite("manage_gates") && (
          <Button size="sm" className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleOpenDialog()}
            data-testid="add-gate-btn">
            <Plus className="w-4 h-4" />{language === 'ar' ? 'باب جديد' : 'New Gate'}
          </Button>
        )}
      </div>
      {/* ── Empty ──────────────────────────────────────────── */}
      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center mx-auto">
            <DoorOpen className="w-10 h-10 text-emerald-300"/>
          </div>
          <p className="font-cairo font-bold text-muted-foreground">
            {gates.length === 0 ? "لا توجد أبواب مسجلة بعد" : "لا نتائج تطابق البحث"}
          </p>
          {canWrite("manage_gates") && gates.length === 0 && (
            <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 mt-2">
              <Plus className="w-4 h-4"/>إضافة أول باب
            </Button>
          )}
        </div>
      )}

      {/* ── CARDS VIEW ────────────────────────────────────── */}
      {view === "cards" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(gate => {
            const gateEmployees = getEmployeesAtGate(gate.name);
            const isOpen = gate.status === 'مفتوح';
            const indicatorColors = { خفيف:'#22c55e', متوسط:'#f97316', مزدحم:'#ef4444' };
            const indicatorColor = indicatorColors[gate.current_indicator] || '#94a3b8';
            return (
              <div key={gate.id} className="group rounded-2xl border bg-white p-4 hover:shadow-lg transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isOpen ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      {isOpen ? <DoorOpen className="w-5 h-5 text-emerald-600"/> : <DoorClosed className="w-5 h-5 text-slate-400"/>}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{gate.name}</p>
                      <p className="text-[10px] text-muted-foreground">#{gate.number} · {gate.plaza}</p>
                    </div>
                  </div>
                  {canWrite("manage_gates") && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(gate)}><Edit className="w-3.5 h-3.5"/></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setSelectedGate(gate); setDeleteDialogOpen(true); }}><Trash2 className="w-3.5 h-3.5"/></Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{gate.status}</span>
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">{gate.gate_type}</span>
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">{gate.direction}</span>
                  {gate.current_indicator && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: indicatorColor+'15', color: indicatorColor }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: indicatorColor }}/>{gate.current_indicator}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 border-t">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500"/>
                    <span className="text-[11px] font-bold">{gateEmployees.length} موظف</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground">{gate.classification}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW (Table) ────────────────────────────── */}
      {view === "list" && filtered.length > 0 && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 border-b-2 border-primary/25 [&>th:not(:last-child)]:border-l [&>th:not(:last-child)]:border-primary/10">
                  {/* رقم الباب */}
                  <TableHead className="text-right py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shadow-sm">
                        <Hash className="w-4 h-4 text-primary"/>
                      </div>
                      <span className="font-bold text-foreground text-sm">رقم الباب</span>
                    </div>
                  </TableHead>
                  {/* اسم الباب */}
                  <TableHead className="text-right py-2.5">
                    <div className="flex flex-col items-start gap-1">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
                        <DoorOpen className="w-4 h-4 text-emerald-600"/>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">اسم الباب</span>
                    </div>
                  </TableHead>
                  {/* المنطقة */}
                  <TableHead className="text-center py-2.5 w-28">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center shadow-sm">
                        <MapPin className="w-4 h-4 text-sky-600"/>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">المنطقة</span>
                    </div>
                  </TableHead>
                  {/* النوع */}
                  <TableHead className="text-center py-2.5 w-28">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shadow-sm">
                        <Tag className="w-4 h-4 text-violet-600"/>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">النوع</span>
                    </div>
                  </TableHead>
                  {/* المسار */}
                  <TableHead className="text-center py-2.5 w-24">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shadow-sm">
                        <ArrowUpDown className="w-4 h-4 text-amber-600"/>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">المسار</span>
                    </div>
                  </TableHead>
                  {/* الفئة */}
                  <TableHead className="text-center py-2.5 w-32">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center shadow-sm">
                        <Shield className="w-4 h-4 text-rose-600"/>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">الفئة</span>
                    </div>
                  </TableHead>
                  {/* الحالة */}
                  <TableHead className="text-center py-2.5 w-24">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
                        <Activity className="w-4 h-4 text-emerald-600"/>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">الحالة</span>
                    </div>
                  </TableHead>
                  {/* المؤشر */}
                  <TableHead className="text-center py-2.5 w-24">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shadow-sm">
                        <Activity className="w-4 h-4 text-orange-500"/>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">المؤشر</span>
                    </div>
                  </TableHead>
                  {/* الموظفين */}
                  <TableHead className="text-center py-2.5 w-32">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shadow-sm">
                        <Users className="w-4 h-4 text-blue-600"/>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">الموظفين</span>
                    </div>
                  </TableHead>
                  {/* الإجراءات */}
                  <TableHead className="text-center py-2.5 w-20">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shadow-sm">
                        <MoreVertical className="w-4 h-4 text-slate-500"/>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">⋯</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((gate) => {
                  const gateEmployees = getEmployeesAtGate(gate.name);
                  const isOpen = gate.status === 'مفتوح';
                  const noStaff = gateEmployees.length === 0;
                  const indicatorColors = { خفيف:'#22c55e', متوسط:'#f97316', مزدحم:'#ef4444' };
                  const indicatorColor = indicatorColors[gate.current_indicator] || '#94a3b8';

                  return (
                    <TableRow key={gate.id}
                      className={`hover:bg-muted/40 transition-colors [&>td]:py-2 ${noStaff && isOpen ? 'bg-red-50/30' : ''}`}>
                      {/* رقم الباب */}
                      <TableCell className="text-right font-black text-primary text-base">{gate.number}</TableCell>
                      {/* اسم الباب */}
                      <TableCell className="text-right">
                        <p className="font-bold text-sm">{gate.name}</p>
                        {gate.classification && <p className="text-[10px] text-muted-foreground">{gate.classification}</p>}
                      </TableCell>
                      {/* المنطقة */}
                      <TableCell className="text-center">
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: gate.plaza_color || PLAZA_COLORS[gate.plaza] || '#94a3b8' }}/>
                          <span className="text-[11px] font-medium">{gate.plaza}</span>
                        </div>
                      </TableCell>
                      {/* النوع */}
                      <TableCell className="text-center">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">{gate.gate_type}</span>
                      </TableCell>
                      {/* المسار */}
                      <TableCell className="text-center text-[11px] text-slate-500 font-medium">{gate.direction}</TableCell>
                      {/* الفئة */}
                      <TableCell className="text-center">
                        <span className="text-[10px] font-medium">{Array.isArray(gate.category) ? gate.category.join(' + ') : gate.category}</span>
                      </TableCell>
                      {/* الحالة */}
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
                          ${isOpen ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-slate-400'}`}/>
                          {gate.status}
                        </span>
                      </TableCell>
                      {/* المؤشر */}
                      <TableCell className="text-center">
                        {gate.current_indicator && (
                          <div className="flex items-center gap-1 justify-center">
                            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: indicatorColor }}/>
                            <span className="text-[10px] font-semibold" style={{ color: indicatorColor }}>{gate.current_indicator}</span>
                          </div>
                        )}
                      </TableCell>
                      {/* الموظفين */}
                      <TableCell className="text-center">
                        <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
                          ${noStaff && isOpen ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse' :
                            gateEmployees.length <= 2 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                          {noStaff && isOpen && <AlertTriangle className="w-3 h-3"/>}
                          {gateEmployees.length} موظف
                        </div>
                        {gateEmployees.length > 0 && (
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {gateEmployees.slice(0,2).map(e=>e.name.split(' ')[0]).join('، ')}{gateEmployees.length>2?` +${gateEmployees.length-2}`:''}
                          </p>
                        )}
                      </TableCell>
                      {/* الإجراءات */}
                      <TableCell className="text-center">
                        {canWrite("manage_gates") ? (
                          <div className="flex gap-1 justify-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleOpenDialog(gate)}>
                              <Edit className="w-3.5 h-3.5"/>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-red-50 hover:text-destructive"
                              onClick={() => { setSelectedGate(gate); setDeleteDialogOpen(true); }}>
                              <Trash2 className="w-3.5 h-3.5"/>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400">قراءة</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo">{editMode ? (language === 'ar' ? 'تعديل الباب' : 'Edit Gate') : (language === 'ar' ? 'إضافة باب جديد' : 'Add New Gate')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{language === 'ar' ? 'رقم الباب' : 'Number'}</Label><Input type="number" value={formData.number} onChange={(e) => setFormData({...formData, number: e.target.value})} required className="mt-1" /></div>
                <div><Label>{language === 'ar' ? 'اسم الباب' : 'Name'}</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'المنطقة' : 'Plaza'}</Label>
                  <Select value={formData.plaza} onValueChange={(value) => setFormData({...formData, plaza: value})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">{Object.keys(PLAZA_COLORS).map(plaza => (<SelectItem key={plaza} value={plaza}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAZA_COLORS[plaza] }} />{plaza}</div></SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                  <Select value={formData.gate_type} onValueChange={(value) => setFormData({...formData, gate_type: value})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">{GATE_TYPES.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'المسار' : 'Direction'}</Label>
                  <Select value={formData.direction} onValueChange={(value) => setFormData({...formData, direction: value})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">{DIRECTIONS.map(dir => (<SelectItem key={dir} value={dir}>{dir}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'التصنيف' : 'Classification'}</Label>
                  <Select value={formData.classification} onValueChange={(value) => setFormData({...formData, classification: value})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">{CLASSIFICATIONS.map(cls => (<SelectItem key={cls} value={cls}>{cls}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{language === 'ar' ? 'الفئة (يمكن اختيار أكثر من فئة)' : 'Category'}</Label>
                <div className="mt-2 flex flex-wrap gap-2">{CATEGORIES.map(cat => {const isSelected = Array.isArray(formData.category) && formData.category.includes(cat);return (<Button key={cat} type="button" variant={isSelected ? "default" : "outline"} size="sm" onClick={() => {const current = Array.isArray(formData.category) ? formData.category : [];if (isSelected) {setFormData({...formData, category: current.filter(c => c !== cat)});} else {setFormData({...formData, category: [...current, cat]});}}}>{cat}</Button>);})}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper">{GATE_STATUSES.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'المؤشر (الازدحام)' : 'Indicator'}</Label>
                  <div className="mt-2 flex gap-2">{CURRENT_INDICATORS.map(ind => {const isSelected = formData.current_indicator === ind.value;return (<Button key={ind.value} type="button" variant={isSelected ? "default" : "outline"} size="sm" onClick={() => setFormData({...formData, current_indicator: ind.value})} style={isSelected ? { backgroundColor: ind.color, borderColor: ind.color } : {}}><div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />{ind.label}</div></Button>);})}</div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
              <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}{editMode ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo">{language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</DialogTitle>
            <DialogDescription>{language === 'ar' ? `هل أنت متأكد من حذف "${selectedGate?.name}"؟` : `Delete "${selectedGate?.name}"?`}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}{language === 'ar' ? 'حذف' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
