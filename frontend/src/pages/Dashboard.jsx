import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { useRealtimeRefresh } from "@/context/WebSocketContext";
import {
  Users, DoorOpen, AlertTriangle, TrendingUp, Clock, Activity,
  ShieldAlert, Calendar, Building, MapPin, RefreshCw,
  ChevronLeft, Eye, Zap, BarChart3, Bell, ArrowUp, ArrowDown,
  Volume2, VolumeX, ClipboardList, Map, Layers, CheckCircle2,
  XCircle, AlertCircle, Timer, ChevronRight, Wifi
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from "recharts";
import { CrowdAlertMonitor } from "@/hooks/useAlertSound";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function AnimNum({ value, duration = 700 }) {
  const [d, setD] = useState(0);
  useEffect(() => {
    let s = 0, step = value / (duration / 16);
    const t = setInterval(() => {
      s += step;
      if (s >= value) { setD(value); clearInterval(t); }
      else setD(Math.round(s));
    }, 16);
    return () => clearInterval(t);
  }, [value, duration]);
  return <span>{d.toLocaleString('ar-SA')}</span>;
}

const ALERT_STYLE = {
  danger:  { bg: "bg-red-50 dark:bg-red-950/30",   border: "border-red-200 dark:border-red-800",   text: "text-red-700 dark:text-red-400",   icon: "text-red-500",   dot: "bg-red-500" },
  warning: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400", icon: "text-amber-500", dot: "bg-amber-500" },
  info:    { bg: "bg-blue-50 dark:bg-blue-950/30",  border: "border-blue-200 dark:border-blue-800",  text: "text-blue-700 dark:text-blue-400",  icon: "text-blue-500",  dot: "bg-blue-500" },
};
const ALERT_ICON_MAP = { DoorOpen, AlertTriangle, Calendar, ShieldAlert, Users, Bell };

const DEPT_CONFIG = {
  planning:       { icon: ClipboardList, accent: "#7c3aed", bg: "bg-violet-50 dark:bg-violet-950/20", ring: "ring-violet-200 dark:ring-violet-800", text: "text-violet-700 dark:text-violet-400", bar: "#7c3aed" },
  gates:          { icon: DoorOpen,      accent: "#047857", bg: "bg-emerald-50 dark:bg-emerald-950/20", ring: "ring-emerald-200 dark:ring-emerald-800", text: "text-emerald-700 dark:text-emerald-400", bar: "#047857" },
  plazas:         { icon: Building,      accent: "#0f766e", bg: "bg-teal-50 dark:bg-teal-950/20", ring: "ring-teal-200 dark:ring-teal-800", text: "text-teal-700 dark:text-teal-400", bar: "#0f766e" },
  haram_map:      { icon: Map,           accent: "#0369a1", bg: "bg-sky-50 dark:bg-sky-950/20", ring: "ring-sky-200 dark:ring-sky-800", text: "text-sky-700 dark:text-sky-400", bar: "#0369a1" },
  crowd_services: { icon: Users,         accent: "#b45309", bg: "bg-amber-50 dark:bg-amber-950/20", ring: "ring-amber-200 dark:ring-amber-800", text: "text-amber-700 dark:text-amber-400", bar: "#b45309" },
  mataf:          { icon: Layers,        accent: "#be123c", bg: "bg-rose-50 dark:bg-rose-950/20", ring: "ring-rose-200 dark:ring-rose-800", text: "text-rose-700 dark:text-rose-400", bar: "#be123c" },
};

function KPICard({ icon: Icon, label, value, total, unit, color, sub, gradient }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const safeColor = color || "#6b7280";
  return (
    <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="absolute inset-0 opacity-[0.04]" style={{ background: `radial-gradient(circle at top left, ${safeColor}, transparent 70%)` }} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground mb-2 truncate">{label}</p>
            <p className="text-4xl font-black tracking-tight leading-none" style={{ color: safeColor }}>
              <AnimNum value={value} />
            </p>
            {total !== undefined && (
              <p className="text-xs text-muted-foreground mt-1.5">
                من <span className="font-semibold">{total.toLocaleString('ar-SA')}</span> {unit}
              </p>
            )}
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${safeColor}18` }}>
              <Icon className="w-5 h-5" style={{ color: safeColor }} />
            </div>
            {total !== undefined && (
              <div className="text-right">
                <p className="text-lg font-black" style={{ color: safeColor }}>{pct}%</p>
                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: safeColor }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeptCard({ dept, navigate, compact = false }) {
  const cfg = DEPT_CONFIG[dept.id] || { icon: Building, accent: "#6b7280", bg: "bg-slate-50 dark:bg-slate-900", ring: "ring-slate-200", text: "text-slate-600", bar: "#6b7280" };
  const Icon = cfg.icon;
  const schedStatus = dept.schedule_status;

  const schedBadge =
    schedStatus === "active" ? { label: "معتمد", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400", icon: CheckCircle2 }
    : schedStatus === "draft" ? { label: "مسودة",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",   icon: Timer }
    : { label: "لا جدول", cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400", icon: XCircle };

  const StatusIcon = schedBadge.icon;

  const totalTasks = dept.tasks?.total || 0;
  const doneTasks  = (dept.tasks?.done || 0) + (dept.tasks?.early || 0);
  const taskPct    = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <Card
      className={`border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:translate-y-[-2px] active:scale-[0.99] ring-1 ${cfg.ring} ${compact ? "w-[180px] flex-shrink-0" : ""}`}
      onClick={() => navigate(dept.route)}
      data-testid={`dept-card-${dept.id}`}
    >
      <CardContent className="p-0">
        <div className={`px-4 pt-4 pb-3 ${cfg.bg} rounded-t-xl`}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${cfg.accent}22` }}>
              <Icon className="w-5 h-5" style={{ color: cfg.accent }} />
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${schedBadge.cls}`}>
              <StatusIcon className="w-3 h-3" />
              {schedBadge.label}
            </div>
          </div>
          <h3 className={`font-cairo font-bold text-sm leading-snug ${cfg.text}`}>{dept.name}</h3>
        </div>

        <div className="px-4 py-3 space-y-3">
          {schedStatus === "active" ? (
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {[
                { label: "مداوم", val: dept.on_duty_now || dept.working, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "خارج",  val: dept.off_shift || 0,             color: "text-amber-600 dark:text-amber-400" },
                { label: "راحة",  val: dept.on_rest,                    color: "text-slate-400" },
              ].map((s, i) => (
                <div key={i} className="py-1.5 rounded-lg bg-muted/50">
                  <p className={`font-black text-base ${s.color}`}>{s.val}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2 text-center text-xs text-muted-foreground bg-muted/30 rounded-lg">
              {schedStatus === "draft" ? "الجدول في المسودة" : "لا يوجد جدول هذا الشهر"}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>الإجمالي: <span className="font-bold text-foreground">{dept.total}</span></span>
            {totalTasks > 0 && (
              <span className={dept.tasks?.overdue > 0 ? "text-red-500 font-semibold" : "text-emerald-600 font-semibold"}>
                {dept.tasks?.overdue > 0 ? `${dept.tasks.overdue} متأخرة` : `${doneTasks}/${totalTasks} مهام`}
              </span>
            )}
          </div>

          {totalTasks > 0 && (
            <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${taskPct}%`, background: cfg.bar }} />
            </div>
          )}
        </div>

        <div className="px-4 pb-3 flex items-center justify-end">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function PlazaBar({ data, navigate }) {
  const sorted = [...data].sort((a, b) => b.utilization - a.utilization);
  return (
    <div className="space-y-3">
      {sorted.map((p, i) => {
        const color = p.utilization > 80 ? '#ef4444' : p.utilization > 60 ? '#f59e0b' : '#22c55e';
        return (
          <div key={i} className="cursor-pointer group" onClick={() => navigate('/gates?tab=dashboard')}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold truncate max-w-[55%] group-hover:text-primary transition-colors">{p.plaza}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{p.open}/{p.total} باب</span>
                <span className="text-[10px] font-black" style={{ color }}>{p.utilization}%</span>
              </div>
            </div>
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(p.utilization, 100)}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [ops, setOps] = useState(null);
  const [deptStats, setDeptStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const navigate = useNavigate();
  const { language } = useLanguage();

  const fetchData = useCallback(async () => {
    try {
      const [opsRes, deptRes] = await Promise.all([
        axios.get(`${API}/dashboard/ops`),
        axios.get(`${API}/dashboard/departments`),
      ]);
      setOps(opsRes.data);
      setDeptStats(deptRes.data);
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeRefresh(["employees", "gate_sessions", "sessions", "tasks", "alerts", "dashboard"], fetchData);

  if (loading || !ops) {
    return (
      <div className="space-y-5 animate-pulse p-1">
        <div className="h-10 rounded-xl bg-muted w-1/3" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-5 h-28" /></Card>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Card key={i}><CardContent className="p-5 h-56" /></Card>)}
        </div>
      </div>
    );
  }

  const { kpis, heatmap, smart_alerts, recent_alerts, timeline, plazas } = ops;

  const crowdColor = kpis.crowd_percentage > 80 ? '#ef4444' : kpis.crowd_percentage > 60 ? '#f59e0b' : '#22c55e';

  const shiftData = Object.entries(kpis.shift_distribution || {}).map(([name, count]) => ({
    name, count,
    fill: name === 'الأولى' ? '#6366f1' : name === 'الثانية' ? '#22c55e' : name === 'الثالثة' ? '#f97316' : '#8b5cf6'
  }));

  const deptData = Object.entries(kpis.department_employees || {}).map(([dept, count]) => {
    const labels = { gates: 'الأبواب', plazas: 'الساحات', planning: 'التخطيط', crowd_services: 'الحشود', mataf: 'المطاف', haram_map: 'المصليات' };
    return { name: labels[dept] || dept, value: count, fill: DEPT_CONFIG[dept]?.bar || '#666' };
  });

  return (
    <div className="space-y-5" data-testid="ops-dashboard">

      {/* ── شريط الرأس ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-cairo font-black text-xl text-foreground">غرفة العمليات</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            آخر تحديث: {lastUpdate?.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CrowdAlertMonitor />
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={fetchData}>
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </Button>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800" data-testid="live-indicator">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            مباشر
          </div>
        </div>
      </div>

      {/* ── تنبيهات ذكية ── */}
      {smart_alerts.length > 0 && (
        <div className="space-y-2" data-testid="smart-alerts">
          {smart_alerts.map((alert, i) => {
            const style = ALERT_STYLE[alert.type] || ALERT_STYLE.info;
            const AlertIcon = ALERT_ICON_MAP[alert.icon] || AlertTriangle;
            return (
              <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${style.bg} ${style.border}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                  <AlertIcon className={`w-4 h-4 flex-shrink-0 ${style.icon}`} />
                  <p className={`text-sm font-semibold ${style.text}`}>{alert.message}</p>
                </div>
                {alert.href && (
                  <Button variant="ghost" size="sm" className={`text-xs gap-1 ${style.text}`} onClick={() => navigate(alert.href)}>
                    {alert.action} <ChevronLeft className="w-3 h-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={DoorOpen}      label="الأبواب المفتوحة"  value={kpis.open_gates}             total={kpis.total_gates}   unit="باب"   color="#059669" />
        <KPICard icon={Users}         label="مداومون الآن"       value={kpis.active_employees}        total={kpis.total_employees} unit="موظف" color="#2563eb"
          sub={kpis.off_shift > 0 ? `${kpis.off_shift} خارج الوردية` : "جميعهم في الخدمة"} />
        <KPICard icon={TrendingUp}    label="نسبة الإشغال"       value={Math.round(kpis.crowd_percentage)} total={100} unit="%" color={crowdColor}
          sub={`${(kpis.total_crowd || 0).toLocaleString('ar-SA')} زائر حالياً`} />
        <KPICard icon={AlertTriangle} label="التنبيهات النشطة"  value={kpis.active_alerts}           total={kpis.active_alerts + 5} unit=""   color={kpis.critical_alerts > 0 ? '#ef4444' : '#f59e0b'}
          sub={kpis.critical_alerts > 0 ? `${kpis.critical_alerts} حالة حرجة` : 'لا توجد حالات حرجة'} />
      </div>

      {/* ── شريط حالة الموظفين ── */}
      {(kpis.active_employees > 0 || kpis.off_shift > 0 || kpis.on_rest > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "مداوم الآن",    value: kpis.active_employees, color: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800", desc: "داخل ساعات الوردية" },
            { label: "خارج الوردية", value: kpis.off_shift || 0,   color: "text-amber-600 dark:text-amber-400",   bar: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",       desc: "يوم عمل — خارج الوقت" },
            { label: "في راحة",       value: kpis.on_rest || 0,     color: "text-slate-500 dark:text-slate-400",   bar: "bg-slate-400",   bg: "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700",       desc: "إجازة أسبوعية" },
          ].map((s, i) => (
            <div key={i} className={`flex items-center gap-4 px-5 py-4 rounded-xl border ${s.bg}`}>
              <div className={`w-1 h-10 rounded-full ${s.bar} flex-shrink-0`} />
              <div>
                <p className={`font-black text-3xl leading-none ${s.color}`}>{s.value}</p>
                <p className="text-xs font-semibold text-foreground mt-1">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── الشبكة الرئيسية ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* عمود 1: حالة البوابات */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-cairo font-bold">حالة البوابات حسب الساحة</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{heatmap.length} ساحة</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <ScrollArea className="h-[300px] pr-1">
              <PlazaBar data={heatmap} navigate={navigate} />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* عمود 2: توزيع الموظفين */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-1 pt-4 px-5">
            <CardTitle className="text-sm font-cairo font-bold">توزيع الموظفين حسب الوردية</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-2">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={shiftData} layout="vertical" margin={{ right: 10 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={45} tick={{ fontSize: 11, fill: 'currentColor' }} />
                <Tooltip
                  formatter={(v) => [`${v} موظف`, '']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {shiftData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          <Separator />
          <CardHeader className="pb-1 pt-3 px-5">
            <CardTitle className="text-sm font-cairo font-bold">توزيع الموظفين حسب الإدارة</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={deptData} cx="50%" cy="50%" outerRadius={52} innerRadius={28} dataKey="value" paddingAngle={2}>
                  {deptData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip
                  formatter={(v, n) => [`${v} موظف`, n]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
              {deptData.map((e, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.fill }} />
                  <span className="text-[10px] text-muted-foreground">{e.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* عمود 3: آخر التنبيهات والأحداث */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-cairo font-bold">آخر التنبيهات</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-primary" onClick={() => navigate('/notifications')}>
                عرض الكل <ChevronLeft className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-2">
            <ScrollArea className="h-[130px]">
              <div className="space-y-1.5">
                {recent_alerts.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mb-1 text-emerald-400" />
                    <p className="text-xs">لا توجد تنبيهات</p>
                  </div>
                )}
                {recent_alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${a.priority === 'critical' ? 'bg-red-500' : a.priority === 'high' ? 'bg-amber-500' : 'bg-blue-400'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{a.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{a.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <Separator />
          <CardHeader className="pb-2 pt-3 px-5">
            <CardTitle className="text-sm font-cairo font-bold">آخر الأحداث</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="h-[130px]">
              <div className="space-y-1.5">
                {timeline.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">لا توجد أحداث</p>
                )}
                {timeline.map((t, i) => {
                  const ACTION_LABELS = {
                    login: 'تسجيل دخول', employee_created: 'إضافة موظف', employee_updated: 'تحديث بيانات',
                    account_activated: 'تفعيل حساب', account_frozen: 'تجميد حساب', role_changed: 'تغيير صلاحيات',
                    pin_reset: 'إعادة تعيين PIN', schedule_created: 'إنشاء جدول', task_created: 'إنشاء مهمة',
                  };
                  return (
                    <div key={i} className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Activity className="w-3 h-3 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold truncate">{t.user_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{ACTION_LABELS[t.action] || t.action}{t.details ? ` — ${t.details}` : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ── ملخص الإدارات ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-cairo font-bold text-base">ملخص الإدارات</h2>
            <p className="text-xs text-muted-foreground mt-0.5">اضغط على أي إدارة للانتقال لصفحتها</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={() => navigate('/reports')}>
            <BarChart3 className="w-3.5 h-3.5" /> تقرير مفصل
          </Button>
        </div>
        <div className="sm:hidden overflow-x-auto pb-2 -mx-3 px-3">
          <div className="flex gap-3 min-w-max">
            {deptStats.map((dept, i) => <DeptCard key={i} dept={dept} navigate={navigate} compact />)}
          </div>
        </div>
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {deptStats.map((dept, i) => <DeptCard key={i} dept={dept} navigate={navigate} />)}
        </div>
      </div>
    </div>
  );
}
