import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { PLAZA_COLORS, GATE_TYPES, DIRECTIONS, CATEGORIES, CLASSIFICATIONS, GATE_STATUSES, CURRENT_INDICATORS } from "@/constants/gateData";
import {
  Plus, Edit, Trash2, Loader2,
  DoorOpen, DoorClosed, Users, AlertTriangle, Activity,
  MapPin, ArrowUpDown, Tag, Shield, Hash, RefreshCw, MoreVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GatesDataManagement() {
  const { language } = useLanguage();
  const { isReadOnly } = useAuth();
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

  useEffect(() => {
    fetchGates();
    fetchEmployees();
  }, []);

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
          <Button variant="outline" size="sm" onClick={fetchGates} className="gap-1.5 h-9">
            <RefreshCw className="w-3.5 h-3.5" />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
          {!isReadOnly() && (
            <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 h-9">
              <Plus className="w-4 h-4" />
              {language === 'ar' ? 'إضافة باب جديد' : 'Add New Gate'}
            </Button>
          )}
        </div>
      </div>

      {/* ══ ANALYTICS DASHBOARD ══════════════════════════════ */}
      {gates.length > 0 && (() => {
        const total   = gates.length;
        const open    = gates.filter(g => g.status === 'مفتوح').length;
        const closed  = gates.filter(g => g.status !== 'مفتوح').length;
        const noStaff = gates.filter(g => getEmployeesAtGate(g.name).length === 0 && g.status === 'مفتوح').length;

        // توزيعات
        const byPlaza     = Object.entries(gates.reduce((a,g)=>{ a[g.plaza]=(a[g.plaza]||0)+1; return a; },{})).sort((a,b)=>b[1]-a[1]);
        const byType      = Object.entries(gates.reduce((a,g)=>{ const k=g.gate_type||'غير محدد'; a[k]=(a[k]||0)+1; return a; },{})).sort((a,b)=>b[1]-a[1]);
        const byDirection = Object.entries(gates.reduce((a,g)=>{ const k=g.direction||'غير محدد'; a[k]=(a[k]||0)+1; return a; },{})).sort((a,b)=>b[1]-a[1]);
        const byCategory  = Object.entries(gates.reduce((a,g)=>{ const cats=Array.isArray(g.category)?g.category:[g.category||'غير محدد']; cats.forEach(c=>{ if(c) a[c]=(a[c]||0)+1; }); return a; },{})).sort((a,b)=>b[1]-a[1]);
        const byIndicator = [
          { label:'خفيف',  color:'#22c55e', count:gates.filter(g=>g.current_indicator==='خفيف').length  },
          { label:'متوسط', color:'#f97316', count:gates.filter(g=>g.current_indicator==='متوسط').length },
          { label:'مزدحم', color:'#ef4444', count:gates.filter(g=>g.current_indicator==='مزدحم').length },
          { label:'غير محدد',color:'#94a3b8',count:gates.filter(g=>!g.current_indicator).length         },
        ].filter(x=>x.count>0);
        const staffBands  = [
          { label:'0 موظف',  color:'#dc2626', bg:'#fef2f2', count:gates.filter(g=>getEmployeesAtGate(g.name).length===0).length, icon:'🚫' },
          { label:'1-2 موظف',color:'#f97316', bg:'#fff7ed', count:gates.filter(g=>{ const c=getEmployeesAtGate(g.name).length; return c>=1&&c<=2; }).length, icon:'⚡' },
          { label:'3+ موظف', color:'#059669', bg:'#ecfdf5', count:gates.filter(g=>getEmployeesAtGate(g.name).length>=3).length, icon:'✅' },
        ];

        // helper: mini bar
        const MiniBar = ({ label, count, total:t, color, extra }) => {
          const pct = t>0 ? Math.round(count/t*100) : 0;
          return (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-slate-600 truncate max-w-[100px]">{label}</span>
                <span className="text-[10px] font-bold tabular-nums flex-shrink-0 mr-1" style={{ color }}>
                  {count} <span className="text-[9px] text-slate-400">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, backgroundColor:color }}/>
              </div>
              {extra}
            </div>
          );
        };

        return (
          <div className="space-y-3">

            {/* ── الصف ١: KPIs ───────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { label:"إجمالي الأبواب",  value:total,   desc:"كل الأبواب المسجلة",          color:"#2563eb", grad:"from-blue-50 to-indigo-50/60",   border:"#bfdbfe", Icon:DoorOpen     },
                { label:"مفتوحة الآن",     value:open,    desc:`${Math.round(open/total*100)}% من الإجمالي`, color:"#059669", grad:"from-emerald-50 to-green-50/60", border:"#a7f3d0", Icon:DoorOpen     },
                { label:"مغلقة / موقوفة",  value:closed,  desc:"باب مغلق أو موقوف",            color:"#6b7280", grad:"from-slate-50 to-gray-50/60",    border:"#e2e8f0", Icon:DoorClosed   },
                { label:"مفتوح بلا موظف",  value:noStaff, desc:noStaff>0?"⚠️ تحتاج تغطية فورية!":"✅ كل الأبواب مغطاة", color:noStaff>0?"#dc2626":"#059669", grad:noStaff>0?"from-red-50 to-rose-50/60":"from-emerald-50 to-green-50/60", border:noStaff>0?"#fca5a5":"#a7f3d0", Icon:noStaff>0?AlertTriangle:Users },
              ].map((s,i)=>{
                const pct = Math.round(s.value/total*100);
                return (
                  <div key={i} className={`group relative overflow-hidden rounded-2xl border p-3 bg-gradient-to-br ${s.grad} hover:shadow-lg hover:scale-[1.02] transition-all duration-200`}
                    style={{ borderColor:s.color+"40" }}>
                    <div className="absolute -left-3 -bottom-3 w-12 h-12 rounded-full opacity-[0.07]" style={{ backgroundColor:s.color }}/>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm mb-2" style={{ backgroundColor:s.color+"20" }}>
                      <s.Icon className="w-4 h-4" style={{ color:s.color }}/>
                    </div>
                    <p className="text-2xl font-black leading-none mb-0.5 tabular-nums" style={{ color:s.color }}>{s.value}</p>
                    <p className="text-[11px] font-bold text-slate-700">{s.label}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{s.desc}</p>
                    <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, backgroundColor:s.color }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── الصف ٢: المنطقة + الحالة + المؤشر ─────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              {/* ① توزيع المناطق */}
              <div className="rounded-2xl border p-4 bg-gradient-to-br from-sky-50/80 to-blue-50/40 hover:shadow-md transition-all" style={{ borderColor:"#bae6fd" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-sky-600"/>
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-700">توزيع المناطق</p>
                    <p className="text-[9px] text-slate-400">{byPlaza.length} منطقة مختلفة</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {byPlaza.length===0 ? <p className="text-[10px] text-slate-400 text-center py-2">لا بيانات</p> :
                    byPlaza.map(([name, count], i) => {
                      const colors=["#0284c7","#0891b2","#0d9488","#0f766e","#059669","#16a34a"];
                      return <MiniBar key={i} label={name} count={count} total={total} color={colors[i%colors.length]}/>;
                    })
                  }
                </div>
              </div>

              {/* ② حالة الأبواب */}
              <div className="rounded-2xl border p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 hover:shadow-md transition-all" style={{ borderColor:"#a7f3d0" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-emerald-600"/>
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-700">حالة الأبواب</p>
                    <p className="text-[9px] text-slate-400">{Math.round(open/total*100)}% مفتوحة الآن</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <MiniBar label="مفتوح" count={open} total={total} color="#059669"/>
                  <MiniBar label="مغلق" count={closed} total={total} color="#6b7280"/>
                  {/* open with no staff warning */}
                  {noStaff>0 && (
                    <div className="mt-2 p-2 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0"/>
                      <span className="text-[10px] font-bold text-red-600">{noStaff} باب مفتوح بلا تغطية</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ③ مؤشر الازدحام */}
              <div className="rounded-2xl border p-4 bg-gradient-to-br from-orange-50/80 to-amber-50/40 hover:shadow-md transition-all" style={{ borderColor:"#fed7aa" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-orange-500"/>
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-700">مؤشر الازدحام</p>
                    <p className="text-[9px] text-slate-400">حالة التدفق الحالية</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {byIndicator.length===0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-3">لا يوجد قراءات مؤشر</p>
                  ) : byIndicator.map((ind,i)=>(
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor:ind.color }}/>
                      <div className="flex-1"><MiniBar label={ind.label} count={ind.count} total={total} color={ind.color}/></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── الصف ٣: النوع + المسار + الفئة + الموظفون ──── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">

              {/* ④ النوع */}
              <div className="rounded-2xl border p-4 bg-gradient-to-br from-violet-50/80 to-purple-50/40 hover:shadow-md transition-all" style={{ borderColor:"#c4b5fd" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-violet-600"/>
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-700">نوع الباب</p>
                    <p className="text-[9px] text-slate-400">{byType.length} نوع</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {byType.length===0 ? <p className="text-[10px] text-slate-400 text-center py-2">لا بيانات</p> :
                    byType.map(([name,count],i)=>{
                      const c=["#7c3aed","#6d28d9","#5b21b6","#4c1d95"][i]||"#7c3aed";
                      return <MiniBar key={i} label={name} count={count} total={total} color={c}/>;
                    })
                  }
                </div>
              </div>

              {/* ⑤ المسار */}
              <div className="rounded-2xl border p-4 bg-gradient-to-br from-amber-50/80 to-yellow-50/40 hover:shadow-md transition-all" style={{ borderColor:"#fcd34d" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                    <ArrowUpDown className="w-4 h-4 text-amber-600"/>
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-700">المسار</p>
                    <p className="text-[9px] text-slate-400">دخول / خروج / مشترك</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {byDirection.length===0 ? <p className="text-[10px] text-slate-400 text-center py-2">لا بيانات</p> :
                    byDirection.map(([name,count],i)=>{
                      const c=["#d97706","#b45309","#92400e","#78350f"][i]||"#d97706";
                      return <MiniBar key={i} label={name} count={count} total={total} color={c}/>;
                    })
                  }
                </div>
              </div>

              {/* ⑥ الفئة */}
              <div className="rounded-2xl border p-4 bg-gradient-to-br from-rose-50/80 to-pink-50/40 hover:shadow-md transition-all" style={{ borderColor:"#fda4af" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-rose-500"/>
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-700">الفئة</p>
                    <p className="text-[9px] text-slate-400">رجال / نساء / مشترك</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {byCategory.length===0 ? <p className="text-[10px] text-slate-400 text-center py-2">لا بيانات</p> :
                    byCategory.slice(0,5).map(([name,count],i)=>{
                      const c=["#e11d48","#be185d","#9d174d","#831843","#f43f5e"][i]||"#e11d48";
                      return <MiniBar key={i} label={name} count={count} total={total} color={c}/>;
                    })
                  }
                </div>
              </div>

              {/* ⑦ تغطية الموظفين */}
              <div className="rounded-2xl border p-4 bg-gradient-to-br from-indigo-50/80 to-blue-50/40 hover:shadow-md transition-all" style={{ borderColor:"#a5b4fc" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-indigo-600"/>
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-700">تغطية الموظفين</p>
                    <p className="text-[9px] text-slate-400">توزيع الكثافة التشغيلية</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {staffBands.map((b,i)=>(
                    <div key={i}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-medium text-slate-600 flex items-center gap-1">
                          <span>{b.icon}</span>{b.label}
                        </span>
                        <span className="text-[10px] font-bold tabular-nums" style={{ color:b.color }}>
                          {b.count} <span className="text-[9px] text-slate-400">({total>0?Math.round(b.count/total*100):0}%)</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor:b.color+"20" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width:total>0?`${Math.round(b.count/total*100)}%`:"0%", backgroundColor:b.color }}/>
                      </div>
                    </div>
                  ))}
                  <div className="pt-1 border-t border-slate-100 mt-2">
                    <p className="text-[9px] text-slate-500 flex items-center justify-between">
                      <span>متوسط التغطية:</span>
                      <span className="font-bold">
                        {total>0 ? (employees.filter(e=>e.location).length/total).toFixed(1) : "0"} موظف/باب
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Gates Table ──────────────────────────────────────── */}
      <Card className="border-0 shadow-sm overflow-hidden">
        {gates.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center mx-auto">
              <DoorOpen className="w-10 h-10 text-emerald-300"/>
            </div>
            <div>
              <p className="font-cairo font-bold text-lg text-muted-foreground">لا توجد أبواب مسجلة بعد</p>
              <p className="text-sm text-slate-400 mt-1">ابدأ بإضافة أول باب من زر "إضافة باب جديد"</p>
            </div>
            {!isReadOnly() && (
              <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 mt-2">
                <Plus className="w-4 h-4"/>إضافة أول باب
              </Button>
            )}
          </div>
        ) : (
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
                {gates.map((gate) => {
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
                        {!isReadOnly() ? (
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
        )}
      </Card>

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
