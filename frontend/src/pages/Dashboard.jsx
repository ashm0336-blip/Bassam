import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import {
  Users, DoorOpen, AlertTriangle, TrendingUp, Clock, Activity,
  ShieldAlert, Calendar, Building, MapPin, RefreshCw,
  ChevronLeft, Eye, Zap, BarChart3, Bell, ArrowUp, ArrowDown,
  Volume2, VolumeX
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar
} from "recharts";
import { CrowdAlertMonitor } from "@/hooks/useAlertSound";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── Animated Number ──
function AnimNum({ value, duration = 600 }) {
  const [d, setD] = useState(0);
  useEffect(() => {
    let s = 0, step = value / (duration / 16);
    const t = setInterval(() => { s += step; if (s >= value) { setD(value); clearInterval(t); } else setD(Math.round(s)); }, 16);
    return () => clearInterval(t);
  }, [value, duration]);
  return <span>{d.toLocaleString('ar-SA')}</span>;
}

// ── KPI Gauge Card ──
function GaugeCard({ icon: Icon, label, value, total, unit, color, sub }) {
  const pct = total ? Math.round(value / total * 100) : 0;
  const gaugeData = [{ value: pct, fill: color }];
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg" data-testid={`gauge-${label}`}>
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-black" style={{ color }}><AnimNum value={value} /></p>
            {total && <p className="text-[10px] text-muted-foreground mt-0.5">من {total.toLocaleString('ar-SA')} {unit}</p>}
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="w-16 h-16 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={gaugeData} barSize={6}>
                <RadialBar background clockWise dataKey="value" cornerRadius={5} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Alert Type Config ──
const ALERT_STYLE = {
  danger: { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-400", icon: "text-red-500" },
  warning: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400", icon: "text-amber-500" },
  info: { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-400", icon: "text-blue-500" },
};
const ALERT_ICON_MAP = { DoorOpen, AlertTriangle, Calendar, ShieldAlert, Users, Bell };

// ── Heatmap Bar (plaza utilization) ──
function PlazaHeatmap({ data, navigate }) {
  const sorted = [...data].sort((a, b) => b.utilization - a.utilization);
  return (
    <div className="space-y-2">
      {sorted.map((p, i) => {
        const barColor = p.utilization > 80 ? '#ef4444' : p.utilization > 60 ? '#f59e0b' : '#22c55e';
        return (
          <div key={i} className="group cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-all" onClick={() => navigate('/gates?tab=dashboard')}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold truncate max-w-[60%]">{p.plaza}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{p.open}/{p.total}</span>
                <Badge variant="outline" className="text-[9px] px-1.5" style={{ borderColor: barColor, color: barColor }}>{p.utilization}%</Badge>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(p.utilization, 100)}%`, background: barColor }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Dashboard ──
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading || !ops) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Card key={i}><CardContent className="p-4 h-24" /></Card>)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <Card key={i}><CardContent className="p-4 h-48" /></Card>)}</div>
      </div>
    );
  }

  const { kpis, heatmap, smart_alerts, recent_alerts, timeline, plazas } = ops;

  // Shift chart data
  const shiftData = Object.entries(kpis.shift_distribution || {}).map(([name, count]) => ({
    name, count,
    fill: name === 'الأولى' ? '#3b82f6' : name === 'الثانية' ? '#22c55e' : name === 'الثالثة' ? '#f97316' : '#8b5cf6'
  }));

  // Dept pie
  const deptData = Object.entries(kpis.department_employees || {}).map(([dept, count]) => {
    const labels = { gates: 'الأبواب', plazas: 'الساحات', planning: 'التخطيط', crowd_services: 'الحشود', mataf: 'المطاف', haram_map: 'المصليات' };
    const colors = { gates: '#1d4ed8', plazas: '#0d9488', planning: '#7c3aed', crowd_services: '#d97706', mataf: '#dc2626', haram_map: '#059669' };
    return { name: labels[dept] || dept, value: count, fill: colors[dept] || '#666' };
  });

  return (
    <div className="space-y-4" data-testid="ops-dashboard">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-cairo font-bold text-lg">غرفة العمليات</h1>
            <p className="text-[10px] text-muted-foreground">آخر تحديث: {lastUpdate?.toLocaleTimeString('ar-SA') || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CrowdAlertMonitor />
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 text-xs" data-testid="refresh-dashboard">
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </Button>
        </div>
      </div>

      {/* ── KPI Gauges — حالة الموظفين حسب الوردية ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GaugeCard icon={DoorOpen} label="الأبواب المفتوحة" value={kpis.open_gates} total={kpis.total_gates} unit="باب" color="#059669" />
        <GaugeCard icon={Users} label="مداومون الآن" value={kpis.active_employees} total={kpis.total_employees} unit="موظف" color="#2563eb"
          sub={kpis.off_shift > 0 ? `${kpis.off_shift} خارج وردية` : "في الخدمة الآن"} />
        <GaugeCard icon={TrendingUp} label="نسبة الإشغال" value={Math.round(kpis.crowd_percentage)} total={100} unit="%" color={kpis.crowd_percentage > 80 ? '#ef4444' : kpis.crowd_percentage > 60 ? '#f59e0b' : '#22c55e'} sub={`${kpis.total_crowd?.toLocaleString('ar-SA')} زائر`} />
        <GaugeCard icon={AlertTriangle} label="التنبيهات النشطة" value={kpis.active_alerts} total={kpis.active_alerts + 5} unit="" color={kpis.critical_alerts > 0 ? '#ef4444' : '#f59e0b'} sub={kpis.critical_alerts > 0 ? `${kpis.critical_alerts} حرج` : 'لا توجد حالات حرجة'} />
      </div>

      {/* ── شريط تفصيلي للموظفين (يظهر فقط إذا يوجد بيانات) ── */}
      {(kpis.active_employees > 0 || kpis.off_shift > 0 || kpis.on_rest > 0) && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "مداوم الآن",    value: kpis.active_employees, color: "#059669", bg: "bg-emerald-50", border: "border-emerald-200", desc: "داخل ساعات وردیته" },
            { label: "خارج الوردية", value: kpis.off_shift || 0,   color: "#d97706", bg: "bg-amber-50",   border: "border-amber-200",   desc: "يوم عمل — خارج الوقت" },
            { label: "في راحة",       value: kpis.on_rest || 0,     color: "#6b7280", bg: "bg-slate-50",   border: "border-slate-200",   desc: "إجازة أسبوعية" },
          ].map((s, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${s.bg} ${s.border}`}>
              <span className="font-black text-2xl" style={{ color: s.color }}>{s.value}</span>
              <div>
                <p className="text-xs font-bold text-foreground">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Smart Alerts ── */}
      {smart_alerts.length > 0 && (
        <div className="space-y-2" data-testid="smart-alerts">
          {smart_alerts.map((alert, i) => {
            const style = ALERT_STYLE[alert.type] || ALERT_STYLE.info;
            const AlertIcon = ALERT_ICON_MAP[alert.icon] || AlertTriangle;
            return (
              <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${style.bg} ${style.border}`}>
                <div className="flex items-center gap-3">
                  <AlertIcon className={`w-5 h-5 flex-shrink-0 ${style.icon}`} />
                  <div>
                    <p className={`text-sm font-semibold ${style.text}`}>{alert.message}</p>
                  </div>
                </div>
                {alert.href && (
                  <Button variant="ghost" size="sm" className={`text-xs ${style.text}`} onClick={() => navigate(alert.href)}>
                    {alert.action} <ChevronLeft className="w-3 h-3 mr-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Main Grid (3 columns) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Heatmap */}
        <Card className="lg:col-span-1 border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-cairo">حالة البوابات حسب الساحة</CardTitle>
              <Badge variant="outline" className="text-[9px]">{heatmap.length} ساحة</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ScrollArea className="h-[320px]">
              <PlazaHeatmap data={heatmap} navigate={navigate} />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Column 2: Shift distribution + Department pie */}
        <Card className="lg:col-span-1 border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-cairo">توزيع الموظفين حسب الوردية</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={shiftData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v} موظف`} />
                <Bar dataKey="count" radius={[0,4,4,0]}>
                  {shiftData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          <Separator />
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-cairo">توزيع الموظفين حسب الإدارة</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={deptData} cx="50%" cy="50%" outerRadius={55} innerRadius={30} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {deptData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v} موظف`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Column 3: Alerts + Timeline */}
        <Card className="lg:col-span-1 border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-cairo">آخر التنبيهات</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/notifications')}>عرض الكل</Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-2">
            <ScrollArea className="h-[140px]">
              <div className="space-y-2">
                {recent_alerts.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد تنبيهات</p>}
                {recent_alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${a.priority === 'critical' ? 'bg-red-500' : a.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500'}`} />
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
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-cairo">آخر الأحداث</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ScrollArea className="h-[140px]">
              <div className="space-y-2">
                {timeline.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد أحداث</p>}
                {timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-transparent hover:border-border transition-all">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity className="w-3 h-3 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium">{t.user_name}: <span className="text-muted-foreground">{t.action}</span></p>
                      {t.details && <p className="text-[10px] text-muted-foreground truncate">{t.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ── Departments Status Cards ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-cairo font-bold text-base">ملخص الإدارات</h2>
            <p className="text-[10px] text-muted-foreground">اضغط على أي إدارة للانتقال لصفحتها</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => navigate('/reports')}>
            <BarChart3 className="w-3.5 h-3.5" /> تقرير مفصل
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {deptStats.map((dept, i) => {
            const DEPT_COLORS = {
              planning:       { accent: "#7c3aed", light: "#f5f3ff", border: "#c4b5fd" },
              gates:          { accent: "#047857", light: "#ecfdf5", border: "#a7f3d0" },
              plazas:         { accent: "#0f766e", light: "#f0fdfa", border: "#99f6e4" },
              haram_map:      { accent: "#047857", light: "#ecfdf5", border: "#a7f3d0" },
              crowd_services: { accent: "#b45309", light: "#fffbeb", border: "#fcd34d" },
              mataf:          { accent: "#be123c", light: "#fff1f2", border: "#fecdd3" },
            };
            const DEPT_ICONS = {
              planning: "📋", gates: "🚪", plazas: "⛩️",
              haram_map: "🕌", crowd_services: "👥", mataf: "🕋"
            };
            const clr = DEPT_COLORS[dept.id] || { accent: "#6b7280", light: "#f9fafb", border: "#e5e7eb" };
            const icon = DEPT_ICONS[dept.id] || "🏢";

            // حالة الجدول
            const schedStatus = dept.schedule_status;
            const schedBadge = schedStatus === "active"
              ? { label: "جدول معتمد ✓", bg: "#dcfce7", color: "#166534", border: "#86efac" }
              : schedStatus === "draft"
              ? { label: "مسودة", bg: "#fef9c3", color: "#854d0e", border: "#fde047" }
              : { label: "لا يوجد جدول", bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" };

            return (
              <Card
                key={i}
                className="border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.99]"
                style={{ borderColor: clr.border, borderWidth: "1.5px" }}
                onClick={() => navigate(dept.route)}
                data-testid={`dept-card-${dept.id}`}
              >
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2"
                    style={{ background: `linear-gradient(135deg, ${clr.light}, white)` }}>
                    <span className="text-2xl">{icon}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                      style={{ background: schedBadge.bg, color: schedBadge.color, borderColor: schedBadge.border }}>
                      {schedBadge.label}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="px-4 pb-2">
                    <h3 className="font-cairo font-bold text-sm leading-tight" style={{ color: clr.accent }}>
                      {dept.name}
                    </h3>
                  </div>

                  {/* Stats */}
                  <div className="px-4 pb-3 space-y-2">
                    {/* إجمالي الموظفين */}
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500">إجمالي الموظفين</span>
                      <span className="font-bold text-sm" style={{ color: clr.accent }}>{dept.total}</span>
                    </div>

                    {/* حالة الوردية الآن — من الجدول المعتمد */}
                    {schedStatus === "active" ? (
                      <div className="grid grid-cols-3 gap-1">
                        <div className="text-center py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                          <p className="text-[9px] text-slate-500">مداوم الآن</p>
                          <p className="font-bold text-sm text-emerald-700">{dept.on_duty_now || dept.working}</p>
                        </div>
                        <div className="text-center py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                          <p className="text-[9px] text-slate-500">خارج الوردية</p>
                          <p className="font-bold text-sm text-amber-600">{dept.off_shift || 0}</p>
                        </div>
                        <div className="text-center py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                          <p className="text-[9px] text-slate-500">في راحة</p>
                          <p className="font-bold text-sm text-slate-500">{dept.on_rest}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-[10px] text-slate-400">
                          {schedStatus === "draft" ? "⏳ في انتظار اعتماد الجدول" : "لم يُنشأ جدول بعد"}
                        </p>
                      </div>
                    )}

                    {/* مهام الإدارة */}
                    {dept.tasks && dept.tasks.total > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap px-1">
                        <span className="text-[9px] text-slate-400">المهام:</span>
                        {dept.tasks.progress > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{dept.tasks.progress} جارية</span>}
                        {dept.tasks.overdue > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">{dept.tasks.overdue} متأخرة</span>}
                        {dept.tasks.done > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{dept.tasks.done} منجزة</span>}
                        {dept.tasks.pending > 0 && !dept.tasks.progress && !dept.tasks.overdue && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{dept.tasks.pending} انتظار</span>}
                      </div>
                    )}
                  </div>

                  {/* Footer - نوع التوظيف */}
                  <div className="px-3 py-2 border-t flex items-center justify-between" style={{ borderColor: clr.border }}>
                    <div className="flex gap-2">
                      {dept.permanent > 0 && <span className="text-[9px] text-emerald-700 font-medium">دائم: {dept.permanent}</span>}
                      {dept.seasonal  > 0 && <span className="text-[9px] text-sky-700 font-medium">موسمي: {dept.seasonal}</span>}
                      {dept.temporary > 0 && <span className="text-[9px] text-purple-700 font-medium">مؤقت: {dept.temporary}</span>}
                      {dept.total === 0 && <span className="text-[9px] text-slate-400">لا يوجد موظفون</span>}
                    </div>
                    <span className="text-[9px] font-bold" style={{ color: clr.accent }}>نظرة عامة ←</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
