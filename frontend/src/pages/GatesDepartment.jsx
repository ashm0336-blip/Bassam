import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import EmployeeManagement from "@/components/EmployeeManagement";
import GatesDataManagement from "@/components/GatesDataManagement";
import TransactionsPage from "@/pages/TransactionsPage";
import DepartmentSettings from "@/pages/DepartmentSettings";
import {
  DoorOpen, DoorClosed, Wrench,
  ArrowUpRight, ArrowDownRight, ArrowLeftRight,
  Users, Activity, MapPin, UserCheck, UserX,
  TrendingUp, Gauge, Shield, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GatesDepartment() {
  const [searchParams] = useSearchParams();
  const { menuItems } = useSidebar();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const activeTab = searchParams.get('tab') || 'dashboard';

  const [gates, setGates] = useState([]);
  const [stats, setStats] = useState(null);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const pageInfo = menuItems.find(item => item.href === '/gates' && !item.parent_id);
  const pageTitle = pageInfo ? (isAr ? pageInfo.name_ar : pageInfo.name_en) : (isAr ? 'إدارة الأبواب' : 'Gates Management');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [gatesRes, statsRes, empStatsRes] = await Promise.all([
          axios.get(`${API}/gates`),
          axios.get(`${API}/gates/stats`),
          axios.get(`${API}/employees/stats/gates`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setGates(gatesRes.data);
        setStats(statsRes.data);
        setEmployeeStats(empStatsRes.data);
      } catch (error) { console.error("Error fetching gates data:", error); }
      finally { setLoading(false); }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="gates-loading">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto flex items-center justify-center mb-3 animate-pulse"><DoorOpen className="w-6 h-6 text-primary" /></div>
          <p className="text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  const openGates = gates.filter(g => g.status === 'مفتوح' || g.status === 'open');
  const closedGates = gates.filter(g => g.status === 'مغلق' || g.status === 'closed');
  const totalFlow = gates.reduce((sum, g) => sum + (g.current_flow || 0), 0);
  const totalMaxFlow = gates.reduce((sum, g) => sum + (g.max_flow || 0), 0);
  const flowPct = totalMaxFlow > 0 ? Math.round((totalFlow / totalMaxFlow) * 100) : 0;
  const lightGates = gates.filter(g => g.current_indicator === 'خفيف');
  const mediumGates = gates.filter(g => g.current_indicator === 'متوسط');
  const crowdedGates = gates.filter(g => g.current_indicator === 'مزدحم');

  const plazas = [
    { name: "الشرقية", key: "الساحة الشرقية", color: "#BC9661" },
    { name: "الشمالية", key: "الساحة الشمالية", color: "#1A4782" },
    { name: "الجنوبية", key: "الساحة الجنوبية", color: "#0E573A" },
    { name: "الغربية", key: "الساحة الغربية", color: "#700D21" },
  ];

  return (
    <div className="space-y-6" data-testid="gates-page">
      {activeTab === 'dashboard' && (
        <>
          {/* Header */}
          <div>
            <h1 className="font-cairo font-bold text-2xl" data-testid="gates-title">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">{isAr ? "نظرة شاملة على حالة الأبواب والموظفين" : "Overview of gates and employees"}</p>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="gates-kpi-row">
            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-blue-50 to-white p-4">
              <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-blue-200/30 blur-xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{isAr ? "إجمالي الأبواب" : "Total Gates"}</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><DoorOpen className="w-4 h-4 text-blue-600" /></div>
                </div>
                <p className="text-3xl font-bold text-blue-700" data-testid="gates-total">{gates.length}</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-emerald-50 to-white p-4">
              <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-emerald-200/30 blur-xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{isAr ? "مفتوحة" : "Open"}</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><DoorOpen className="w-4 h-4 text-emerald-600" /></div>
                </div>
                <p className="text-3xl font-bold text-emerald-700" data-testid="gates-open">{openGates.length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{gates.length > 0 ? Math.round((openGates.length / gates.length) * 100) : 0}% {isAr ? "من الإجمالي" : "of total"}</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-red-50 to-white p-4">
              <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-red-200/30 blur-xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{isAr ? "مغلقة" : "Closed"}</span>
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><DoorClosed className="w-4 h-4 text-red-500" /></div>
                </div>
                <p className="text-3xl font-bold text-red-600" data-testid="gates-closed">{closedGates.length}</p>
                {closedGates.length > 0 && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{isAr ? "تحتاج متابعة" : "Need attention"}</p>}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border p-4" style={{ background: `linear-gradient(135deg, ${flowPct > 80 ? '#fef2f2' : flowPct > 50 ? '#fffbeb' : '#f0fdf4'}, white)` }}>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{isAr ? "نسبة التدفق" : "Flow Rate"}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: (flowPct > 80 ? '#dc2626' : flowPct > 50 ? '#f59e0b' : '#16a34a') + '15' }}>
                    <Gauge className="w-4 h-4" style={{ color: flowPct > 80 ? '#dc2626' : flowPct > 50 ? '#f59e0b' : '#16a34a' }} />
                  </div>
                </div>
                <p className="text-3xl font-bold" style={{ color: flowPct > 80 ? '#dc2626' : flowPct > 50 ? '#f59e0b' : '#16a34a' }} data-testid="gates-flow-pct">{flowPct}%</p>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(flowPct, 100)}%`, backgroundColor: flowPct > 80 ? '#dc2626' : flowPct > 50 ? '#f59e0b' : '#16a34a' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Employees + Congestion */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Employee Stats */}
            <Card data-testid="employee-stats-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-cairo text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />{isAr ? "إحصائيات الموظفين" : "Employee Stats"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: isAr ? "إجمالي" : "Total", value: employeeStats?.total_employees || 0, icon: Users, color: "text-slate-600", bg: "bg-slate-50" },
                    { label: isAr ? "نشطون" : "Active", value: employeeStats?.active_employees || 0, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: isAr ? "غير نشطين" : "Inactive", value: employeeStats?.inactive_employees || 0, icon: UserX, color: "text-slate-400", bg: "bg-slate-50" },
                    { label: isAr ? "المواقع" : "Locations", value: employeeStats?.locations_count || 0, icon: MapPin, color: "text-blue-600", bg: "bg-blue-50" },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className={`text-center p-3 rounded-xl ${item.bg} border`}>
                        <Icon className={`w-4 h-4 mx-auto ${item.color} mb-1`} />
                        <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                        <p className="text-[9px] text-muted-foreground">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
                {/* Shifts */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <span className="text-[10px] text-muted-foreground font-medium">{isAr ? "الورديات:" : "Shifts:"}</span>
                  {[
                    { label: isAr ? "الأولى" : "1st", value: employeeStats?.shifts?.shift_1 || 0, color: "#3b82f6" },
                    { label: isAr ? "الثانية" : "2nd", value: employeeStats?.shifts?.shift_2 || 0, color: "#22c55e" },
                    { label: isAr ? "الثالثة" : "3rd", value: employeeStats?.shifts?.shift_3 || 0, color: "#f97316" },
                    { label: isAr ? "الرابعة" : "4th", value: employeeStats?.shifts?.shift_4 || 0, color: "#8b5cf6" },
                  ].map(shift => (
                    <div key={shift.label} className="flex items-center gap-1 px-2 py-1 rounded-full border text-[10px]">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shift.color }} />
                      <span className="font-semibold">{shift.value}</span>
                      <span className="text-muted-foreground">{shift.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Congestion */}
            <Card data-testid="congestion-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-cairo text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-amber-600" />{isAr ? "مؤشر الازدحام" : "Congestion Indicator"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: isAr ? "خفيف" : "Light", count: lightGates.length, color: "#22c55e", bg: "from-emerald-50" },
                    { label: isAr ? "متوسط" : "Medium", count: mediumGates.length, color: "#f97316", bg: "from-orange-50" },
                    { label: isAr ? "مزدحم" : "Crowded", count: crowdedGates.length, color: "#ef4444", bg: "from-red-50" },
                  ].map(item => (
                    <div key={item.label} className={`relative overflow-hidden rounded-xl border bg-gradient-to-bl ${item.bg} to-white p-4 text-center`}>
                      <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: item.color }} />
                      <p className="text-2xl font-bold" style={{ color: item.color }}>{item.count}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                      {gates.length > 0 && <p className="text-[9px] text-muted-foreground">{Math.round((item.count / gates.length) * 100)}%</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plaza + Type + Direction */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* By Plaza */}
            <Card data-testid="plaza-card">
              <CardHeader className="pb-3"><CardTitle className="font-cairo text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-600" />{isAr ? "حسب الساحة" : "By Plaza"}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {plazas.map(plaza => {
                    const count = gates.filter(g => g.plaza === plaza.key).length;
                    const openCount = gates.filter(g => g.plaza === plaza.key && (g.status === 'مفتوح' || g.status === 'open')).length;
                    return (
                      <div key={plaza.key} className="rounded-xl border p-3 transition-all hover:shadow-md" data-testid={`plaza-${plaza.name}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: plaza.color }} />
                          <span className="text-xs font-semibold">{plaza.name}</span>
                        </div>
                        <p className="text-2xl font-bold">{count}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] text-muted-foreground">{openCount} {isAr ? "مفتوح" : "open"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* By Type */}
            <Card data-testid="type-card">
              <CardHeader className="pb-3"><CardTitle className="font-cairo text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" />{isAr ? "حسب النوع" : "By Type"}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['رئيسي', 'فرعي', 'سلم كهربائي', 'مصعد', 'درج', 'جسر', 'مشابة', 'عبارة'].map(type => {
                    const count = gates.filter(g => g.gate_type === type).length;
                    if (count === 0) return null;
                    const pct = gates.length > 0 ? Math.round((count / gates.length) * 100) : 0;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-xs font-medium w-20 text-right truncate">{type}</span>
                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold w-6 text-left">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* By Direction */}
            <Card data-testid="direction-card">
              <CardHeader className="pb-3"><CardTitle className="font-cairo text-sm flex items-center gap-2"><ArrowLeftRight className="w-4 h-4 text-violet-600" />{isAr ? "حسب المسار" : "By Direction"}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { key: "دخول", label: isAr ? "دخول" : "Entry", icon: ArrowDownRight, color: "#3b82f6" },
                    { key: "خروج", label: isAr ? "خروج" : "Exit", icon: ArrowUpRight, color: "#8b5cf6" },
                    { key: "دخول وخروج", label: isAr ? "دخول وخروج" : "Both", icon: ArrowLeftRight, color: "#22c55e" },
                  ].map(dir => {
                    const count = gates.filter(g => g.direction === dir.key).length;
                    const Icon = dir.icon;
                    return (
                      <div key={dir.key} className="flex items-center gap-3 p-2.5 rounded-xl border hover:shadow-sm transition-all">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: dir.color + "15" }}>
                          <Icon className="w-4 h-4" style={{ color: dir.color }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium">{dir.label}</p>
                          <p className="text-[10px] text-muted-foreground">{gates.length > 0 ? Math.round((count / gates.length) * 100) : 0}%</p>
                        </div>
                        <span className="text-lg font-bold" style={{ color: dir.color }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category + Classification */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="category-card">
              <CardHeader className="pb-3"><CardTitle className="font-cairo text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-teal-600" />{isAr ? "حسب الفئة" : "By Category"}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "محرمين", color: "#0ea5e9", bg: "from-sky-50" },
                    { key: "مصلين", color: "#22c55e", bg: "from-emerald-50" },
                    { key: "عربات", color: "#f59e0b", bg: "from-amber-50" },
                  ].map(cat => {
                    const count = gates.filter(g => Array.isArray(g.category) ? g.category.includes(cat.key) : g.category === cat.key).length;
                    return (
                      <div key={cat.key} className={`text-center p-4 rounded-xl border bg-gradient-to-bl ${cat.bg} to-white`}>
                        <p className="text-2xl font-bold" style={{ color: cat.color }}>{count}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{cat.key}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="classification-card">
              <CardHeader className="pb-3"><CardTitle className="font-cairo text-sm flex items-center gap-2"><Users className="w-4 h-4 text-rose-600" />{isAr ? "حسب التصنيف" : "By Classification"}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {['عام', 'رجال', 'نساء', 'طوارئ', 'خدمات', 'جنائز'].map(cls => {
                    const count = gates.filter(g => g.classification === cls).length;
                    if (count === 0) return null;
                    const colors = { 'عام': '#64748b', 'رجال': '#3b82f6', 'نساء': '#ec4899', 'طوارئ': '#ef4444', 'خدمات': '#22c55e', 'جنائز': '#8b5cf6' };
                    return (
                      <div key={cls} className="flex items-center gap-2 px-3 py-2 rounded-xl border hover:shadow-sm transition-all">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: colors[cls] || '#64748b' }}>{count}</div>
                        <span className="text-xs font-medium">{cls}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'data' && <DepartmentSettings department="gates" />}
      {activeTab === 'employees' && <DepartmentSettings department="gates" />}
      {activeTab === 'transactions' && <TransactionsPage department="gates" />}
      {activeTab === 'settings' && <DepartmentSettings department="gates" />}
    </div>
  );
}
