import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  Users, Clock, Coffee, Zap, ShieldCheck, ShieldX, ShieldOff, UserPlus,
  CalendarDays, TrendingUp, TrendingDown, AlertTriangle, Activity,
  UserCheck, UserX, RefreshCw, Briefcase, ArrowLeft, Award, Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

const MONTH_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAY_LETTERS = { "السبت":"س","الأحد":"ح","الإثنين":"ن","الثلاثاء":"ث","الأربعاء":"ر","الخميس":"خ","الجمعة":"ج" };
const WEEK_DAYS_ORDER = ["السبت","الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"];
const TODAY_AR = (() => {
  const map = { Saturday:"السبت", Sunday:"الأحد", Monday:"الإثنين", Tuesday:"الثلاثاء", Wednesday:"الأربعاء", Thursday:"الخميس", Friday:"الجمعة" };
  return map[new Date().toLocaleDateString("en-US",{weekday:"long"})] || "";
})();

const DEPT_CONFIG = {
  planning:       { color:"#6d28d9", accent:"#c4b5fd", bg:"from-violet-900 to-purple-900",    icon:"📋", label_ar:"إدارة التخطيط",           sessions_href:null },
  haram_map:      { color:"#004D38", accent:"#00C278", bg:"from-emerald-900 to-teal-900",    icon:"🕌", label_ar:"إدارة المصليات",           sessions_href:"/daily-sessions" },
  plazas:         { color:"#0f766e", accent:"#99f6e4", bg:"from-teal-900 to-cyan-900",       icon:"⛩️", label_ar:"إدارة الساحات",            sessions_href:null },
  squares:        { color:"#0f766e", accent:"#99f6e4", bg:"from-teal-900 to-cyan-900",       icon:"⛩️", label_ar:"إدارة الساحات",            sessions_href:null },
  gates:          { color:"#1d4ed8", accent:"#60a5fa", bg:"from-blue-900 to-indigo-900",     icon:"🚪", label_ar:"إدارة الأبواب",            sessions_href:"/daily-gates" },
  mataf:          { color:"#be123c", accent:"#fda4af", bg:"from-rose-900 to-red-900",        icon:"🕋", label_ar:"صحن المطاف",               sessions_href:null },
  crowd_services: { color:"#b45309", accent:"#fcd34d", bg:"from-amber-900 to-orange-900",    icon:"👥", label_ar:"خدمات الحشود",             sessions_href:null },
};

const SHIFT_COLORS = { "الأولى":"#3b82f6","الثانية":"#22c55e","الثالثة":"#f97316","الرابعة":"#8b5cf6","الأولى صبح":"#06b6d4" };

// ── Animated Number ──────────────────────────────────────────
function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0, step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.round(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{display}</span>;
}

// ── Big KPI Card ─────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, badge, trend }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border-0 shadow-lg bg-card`}
      style={{ boxShadow: `0 4px 24px ${color}22` }}>
      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl" style={{ background: color }}/>
      <div className="absolute -left-8 -top-8 w-24 h-24 rounded-full opacity-[0.06]" style={{ background: color }}/>
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
          style={{ background: `${color}20`, color }}>
          <Icon className="w-5 h-5"/>
        </div>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: `${color}15`, color }}>{badge}</span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-semibold text-muted-foreground mb-0.5">{label}</p>
        <p className="text-4xl font-black leading-none" style={{ color }}>
          <AnimatedNumber value={value}/>
        </p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>}
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-1.5">
            {trend >= 0
              ? <TrendingUp className="w-3 h-3 text-emerald-500"/>
              : <TrendingDown className="w-3 h-3 text-red-500"/>}
            <span className={`text-[10px] font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section Title ────────────────────────────────────────────
function SectionTitle({ icon: Icon, label, color }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
        style={{ background: `${color}20`, color }}>
        <Icon className="w-3.5 h-3.5"/>
      </div>
      <h3 className="font-cairo font-bold text-sm text-foreground">{label}</h3>
      <div className="flex-1 h-px bg-border/60 mr-1"/>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function DepartmentOverview({ department = "planning" }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const navigate = useNavigate();
  const cfg = DEPT_CONFIG[department] || DEPT_CONFIG.planning;

  const [employees, setEmployees] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [availSummary, setAvailSummary] = useState(null);
  const [taskStats, setTaskStats] = useState(null);

  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;
  const monthLabel = `${MONTH_AR[new Date().getMonth()]} ${new Date().getFullYear()}`;
  const dateStr = new Date().toLocaleDateString("ar-SA", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  const fetchData = useCallback(async (silent=false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [empRes, schedRes, availRes, tasksRes] = await Promise.allSettled([
        axios.get(`${API}/employees?department=${department}`, getAuth()),
        axios.get(`${API}/schedules/${department}/${monthKey}`, getAuth()),
        axios.get(`${API}/employees/availability?department=${department}`, getAuth()),
        axios.get(`${API}/tasks/stats?department=${department}`, getAuth()),
      ]);
      if (empRes.status === "fulfilled") setEmployees(empRes.value.data || []);
      if (schedRes.status === "fulfilled") setSchedule(schedRes.value.data);
      if (availRes.status === "fulfilled" && availRes.value.data?.summary) setAvailSummary(availRes.value.data.summary);
      if (tasksRes.status === "fulfilled") setTaskStats(tasksRes.value.data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); setLastRefresh(new Date()); }
  }, [department, monthKey]);

  useEffect(() => { fetchData(); const t = setInterval(() => fetchData(true), 60000); return () => clearInterval(t); }, [fetchData]);

  // ── Derived Stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    // ⚠️ القاعدة الأساسية:
    // الإحصائيات المرتبطة بالجدول (مداومون، راحة، تغطية، ورديات، مكلفون)
    // تُعرض فقط من الجدول المعتمد (active). إذا الجدول مسودة أو غير موجود → صفر.
    const isApproved = schedule?.status === 'active';
    const assignmentMap = {};
    if (isApproved && schedule?.assignments) {
      schedule.assignments.forEach(a => { assignmentMap[a.employee_id] = a; });
    }

    // البيانات الأساسية للموظف (غير مرتبطة بالجدول)
    const total = employees.length;
    const permanent = employees.filter(e => (e.employment_type||"permanent") === "permanent").length;
    const seasonal  = employees.filter(e => e.employment_type === "seasonal").length;
    const temporary = employees.filter(e => e.employment_type === "temporary").length;

    // حالة الحسابات — مستقلة عن الجدول
    const acStatus = { active: 0, pending: 0, frozen: 0, no_account: 0, terminated: 0 };
    employees.forEach(e => { const s = e.account_status || "no_account"; acStatus[s] = (acStatus[s] || 0) + 1; });

    // Roles — مستقلة عن الجدول
    const roleMap = {};
    employees.forEach(e => { const r = e.user_role || "field_staff"; roleMap[r] = (roleMap[r] || 0) + 1; });

    // العقود المنتهية — مستقلة عن الجدول
    const today = new Date();
    const in30 = new Date(today); in30.setDate(today.getDate() + 30);
    const expiring = employees.filter(e => {
      if (!e.contract_end) return false;
      const d = new Date(e.contract_end);
      return d >= today && d <= in30;
    }).sort((a,b) => new Date(a.contract_end) - new Date(b.contract_end)).slice(0, 5);

    // ── إحصائيات الجدول: صفر إذا لم يكن معتمداً ──
    let onRest = 0, working = 0, tasked = 0, availabilityPct = 0;
    let shiftStats = [];
    let coverage = WEEK_DAYS_ORDER.map(day => ({
      day, letter: DAY_LETTERS[day], avail: 0, resting: 0, pct: 0, isToday: day === TODAY_AR
    }));
    let merged = employees.map(emp => ({ ...emp, restDays: [], shift: "", isTasked: false, onRest: false }));

    if (isApproved) {
      merged = employees.map(emp => {
        const a = assignmentMap[emp.id];
        const restDays = a ? (a.rest_days || []) : [];
        const shift = a ? (a.shift || "") : "";
        const isTasked = a ? (a.is_tasked === true) : false;
        const empOnRest = restDays.includes(TODAY_AR);
        return { ...emp, restDays, shift, isTasked, onRest: empOnRest };
      });

      onRest = merged.filter(e => e.onRest).length;
      working = total - onRest;
      tasked = merged.filter(e => e.isTasked).length;
      availabilityPct = total > 0 ? Math.round((working / total) * 100) : 0;

      // Shifts — من الجدول المعتمد فقط
      const shiftMap = {};
      merged.forEach(e => { if (e.shift) shiftMap[e.shift] = (shiftMap[e.shift] || 0) + 1; });
      shiftStats = Object.entries(shiftMap).map(([k, v]) => ({
        name: k, count: v,
        pct: total > 0 ? Math.round(v/total*100) : 0,
        color: SHIFT_COLORS[k] || "#94a3b8"
      })).sort((a,b) => b.count - a.count);

      // التغطية الأسبوعية — من الجدول المعتمد فقط
      coverage = WEEK_DAYS_ORDER.map(day => {
        const resting = merged.filter(e => e.restDays.includes(day)).length;
        const avail = total - resting;
        const pct = total > 0 ? Math.round(avail / total * 100) : 0;
        return { day, letter: DAY_LETTERS[day], avail, resting, pct, isToday: day === TODAY_AR };
      });
    }

    return { total, onRest, working, tasked, availabilityPct, acStatus, permanent, seasonal, temporary, shiftStats, coverage, expiring, roleMap, merged, isApproved };
  }, [employees, schedule]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center animate-pulse shadow-lg"
          style={{ background: `${cfg.accent}20` }}>
          <span className="text-3xl">{cfg.icon}</span>
        </div>
        <p className="text-sm text-muted-foreground font-cairo">جاري تحميل البيانات...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl" data-testid="department-overview">

      {/* ══ HERO HEADER ═══════════════════════════════════════ */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-l ${cfg.bg} p-6 text-white shadow-xl`}>
        {/* Decorative circles */}
        <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full opacity-10 bg-white"/>
        <div className="absolute -left-4 -bottom-16 w-32 h-32 rounded-full opacity-[0.07] bg-white"/>
        <div className="absolute left-1/3 -top-8 w-24 h-24 rounded-full opacity-[0.05] bg-white"/>

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{cfg.icon}</span>
              <div>
                <h1 className="font-cairo font-black text-2xl leading-tight">{cfg.label_ar}</h1>
                <p className="text-white/70 text-xs mt-0.5">{dateStr}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full ${schedule ? "bg-emerald-500/30 text-emerald-200" : "bg-white/10 text-white/70"}`}>
                <CalendarDays className="w-3 h-3"/>
                {schedule ? `جدول ${monthLabel}: ${schedule.status === "active" ? "معتمد ✓" : "مسودة"}` : `جدول ${monthLabel}: غير موجود`}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full bg-white/10 text-white/80">
                <Activity className="w-3 h-3"/>
                {isAr?`آخر تحديث: ${lastRefresh.toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"})}`:lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchData(true)} disabled={refreshing}
              className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              title="تحديث">
              <RefreshCw className={`w-4 h-4 text-white ${refreshing?"animate-spin":""}`}/>
            </button>
            {cfg.sessions_href && (
              <Button onClick={() => navigate(cfg.sessions_href)} size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0 font-cairo font-semibold">
                <ArrowLeft className="w-4 h-4 ml-1.5"/>
                {isAr?"السجل اليومي":"Daily Log"}
              </Button>
            )}
          </div>
        </div>

        {/* Quick summary bar */}
        <div className="relative mt-5 grid grid-cols-4 gap-3">
          {[
            { label:"إجمالي", value:stats.total, icon:"👥" },
            { label: availSummary ? "مداوم الآن" : (TODAY_AR ? `مداومون (${TODAY_AR})` : "مداومون اليوم"),
              value: availSummary ? (availSummary.on_duty_now || 0) : stats.working, icon:"✅" },
            { label: availSummary ? "خارج الوردية" : "في راحة",
              value: availSummary ? (availSummary.off_shift || 0) : stats.onRest, icon: availSummary ? "⚠️" : "☕" },
            { label:"في راحة", value: availSummary ? (availSummary.on_rest || 0) : stats.onRest, icon:"☕" },
          ].map((item,i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
              <p className="text-xl mb-0.5">{item.icon}</p>
              <p className="text-2xl font-black leading-none">{item.value}</p>
              <p className="text-[10px] text-white/70 mt-0.5 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ KPI CARDS ════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="إجمالي الموظفين" value={stats.total}
          color="#004D38"
          sub={`${stats.permanent} دائم • ${stats.seasonal} موسمي • ${stats.temporary} مؤقت`}
          badge={stats.temporary > 0 ? `${stats.temporary} مؤقت` : undefined}/>
        <KpiCard icon={UserCheck}
          label={availSummary ? "مداوم الآن" : "مداومون اليوم"}
          value={availSummary ? (availSummary.on_duty_now || 0) : stats.working}
          color="#0f766e"
          sub={availSummary ? `${availSummary.off_shift||0} خارج الوردية` : `من أصل ${stats.total} موظف`}/>
        <KpiCard icon={Coffee} label="في راحة اليوم" value={availSummary ? (availSummary.on_rest||0) : stats.onRest}
          color="#d97706"
          sub={stats.onRest > 0 ? `${TODAY_AR} — يوم إجازتهم` : "لا إجازات اليوم"}/>
        <KpiCard icon={Zap} label="مكلفون هذا الشهر" value={stats.tasked}
          color="#7c3aed"
          badge={stats.tasked > 0 ? `${monthLabel}` : undefined}
          sub={stats.tasked > 0 ? "ساعات إضافية مكلفة" : "لا تكليفات هذا الشهر"}/>
      </div>

      {/* ══ مهام الإدارة ════════════════════════════════════ */}
      {taskStats && taskStats.total > 0 && (
        <div className="bg-card rounded-2xl p-5 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#7c3aed20" }}>
                <Tag className="w-4 h-4" style={{ color: "#7c3aed" }} />
              </div>
              <div>
                <h3 className="font-cairo font-bold text-sm">مهام الإدارة</h3>
                <p className="text-[10px] text-muted-foreground">{taskStats.total} مهمة إجمالاً</p>
              </div>
            </div>
            {taskStats.early > 0 && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                ⭐ {taskStats.early} مبكر
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label:"انتظار",  value: taskStats.pending||0,    color:"#64748b", bg:"#f8fafc" },
              { label:"جارية",   value: taskStats.in_progress||0, color:"#2563eb", bg:"#eff6ff" },
              { label:"منجزة",   value: taskStats.done||0,        color:"#059669", bg:"#ecfdf5" },
              { label:"متأخرة",  value: taskStats.overdue||0,     color:"#dc2626", bg:"#fef2f2" },
            ].map((s,i) => (
              <div key={i} className="text-center py-3 rounded-xl border" style={{ backgroundColor: s.bg }}>
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ MIDDLE ROW ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Shift Distribution */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border">
          <SectionTitle icon={Clock} label="توزيع الورديات" color="#7c3aed"/>
          {stats.shiftStats.length > 0 ? (
            <div className="space-y-3">
              {stats.shiftStats.map(s => (
                <div key={s.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }}/>
                      <span className="text-[11px] font-semibold text-foreground">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black" style={{ color: s.color }}>{s.count}</span>
                      <span className="text-[9px] text-muted-foreground">{s.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width:`${s.pct}%`, background: s.color, boxShadow:`0 0 8px ${s.color}60` }}/>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">لا يوجد جدول شهري</p>
          )}
        </div>

        {/* Account Status */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border">
          <SectionTitle icon={ShieldCheck} label="حالة حسابات الدخول" color="#047857"/>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { key:"active",     label:"نشط",         icon:ShieldCheck, color:"#047857", bg:"#ecfdf5" },
              { key:"pending",    label:"معلق",         icon:ShieldOff,   color:"#d97706", bg:"#fffbeb" },
              { key:"frozen",     label:"مجمَّد",        icon:ShieldX,     color:"#2563eb", bg:"#eff6ff" },
              { key:"no_account", label:"بدون حساب",   icon:UserPlus,    color:"#64748b", bg:"#f8fafc" },
            ].map(item => {
              const count = stats.acStatus[item.key] || 0;
              const Icon = item.icon;
              return (
                <div key={item.key} className="rounded-xl p-3 flex items-center gap-2.5 border"
                  style={{ background: item.bg, borderColor: `${item.color}30` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}20`, color: item.color }}>
                    <Icon className="w-4 h-4"/>
                  </div>
                  <div>
                    <p className="text-xl font-black leading-none" style={{ color: item.color }}>{count}</p>
                    <p className="text-[9px] font-medium mt-0.5" style={{ color: item.color }}>{item.label}</p>
                  </div>
                </div>
              );
            })}
            {stats.acStatus.terminated > 0 && (
              <div className="col-span-2 rounded-xl p-2.5 flex items-center gap-2 bg-red-50 border border-red-200">
                <ShieldX className="w-4 h-4 text-red-500 flex-shrink-0"/>
                <span className="text-[11px] text-red-700 font-semibold">{stats.acStatus.terminated} منتهي الخدمة</span>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Coverage Heatmap */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border">
          <SectionTitle icon={CalendarDays} label="التغطية الأسبوعية" color="#0284c7"/>
          <div className="space-y-2">
            {stats.coverage.map(day => {
              const isLow = day.pct < 60;
              const barColor = day.isToday ? "#004D38" : isLow ? "#ef4444" : "#22c55e";
              return (
                <div key={day.day} className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all
                  ${day.isToday ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/40"}`}>
                  <span className={`text-[11px] font-bold w-4 text-center flex-shrink-0 ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {day.letter}
                  </span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width:`${day.pct}%`, background: barColor, boxShadow: day.isToday ? `0 0 8px ${barColor}80` : "none" }}/>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] font-bold" style={{ color: barColor }}>{day.avail}</span>
                    <span className="text-[9px] text-muted-foreground">/{stats.total}</span>
                  </div>
                  {day.isToday && (
                    <span className="text-[8px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">اليوم</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ BOTTOM ROW ════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Expiring Contracts Alert */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border">
          <SectionTitle icon={AlertTriangle} label="تنبيه — عقود تنتهي قريباً" color="#d97706"/>
          {stats.expiring.length > 0 ? (
            <div className="space-y-2">
              {stats.expiring.map(emp => {
                const days = Math.ceil((new Date(emp.contract_end) - new Date()) / (1000*60*60*24));
                const isUrgent = days <= 7;
                return (
                  <div key={emp.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all
                    ${isUrgent ? "bg-red-50 border-red-200" : "bg-amber-50/60 border-amber-200"}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white`}
                        style={{ background: isUrgent ? "#ef4444" : "#d97706" }}>
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{emp.name}</p>
                        <p className="text-[9px] text-muted-foreground">{emp.job_title}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${isUrgent ? "text-red-600" : "text-amber-600"}`}>
                        {days} {isAr?"يوم":"days"}
                      </p>
                      <p className="text-[9px] text-muted-foreground">{emp.contract_end}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-2">
                <ShieldCheck className="w-6 h-6 text-emerald-600"/>
              </div>
              <p className="text-sm font-semibold text-emerald-700">{isAr?"لا توجد عقود تنتهي خلال 30 يوماً":"No expiring contracts"}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{isAr?"جميع العقود سارية المفعول":"All contracts valid"}</p>
            </div>
          )}
        </div>

        {/* Role Distribution */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border">
          <SectionTitle icon={Award} label="توزيع الصلاحيات والأدوار" color="#7c3aed"/>
          {Object.keys(stats.roleMap).length > 0 ? (
            <div className="space-y-2.5">
              {Object.entries({
                general_manager:    { label:"مدير عام",      color:"#7c3aed", icon:"👑" },
                department_manager: { label:"مدير إدارة",    color:"#1d4ed8", icon:"🏛️" },
                shift_supervisor:   { label:"مشرف وردية",   color:"#0f766e", icon:"🎯" },
                field_staff:        { label:"موظف ميداني",   color:"#047857", icon:"⛑️" },
                admin_staff:        { label:"موظف إداري",    color:"#64748b", icon:"💼" },
              }).filter(([k]) => stats.roleMap[k] > 0).map(([key, cfg2]) => {
                const count = stats.roleMap[key] || 0;
                const pct = stats.total > 0 ? Math.round(count/stats.total*100) : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-base w-6 text-center flex-shrink-0">{cfg2.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-semibold text-foreground">{cfg2.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black" style={{ color: cfg2.color }}>{count}</span>
                          <span className="text-[9px] text-muted-foreground">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width:`${pct}%`, background: cfg2.color, boxShadow:`0 0 6px ${cfg2.color}50` }}/>
                      </div>
                    </div>
                  </div>
                );
              })}
              {Object.keys(stats.roleMap).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">لا يوجد موظفون بحسابات نشطة</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6">
              <UserX className="w-10 h-10 text-muted-foreground mb-2"/>
              <p className="text-sm text-muted-foreground">لا يوجد موظفون مسجلون</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
