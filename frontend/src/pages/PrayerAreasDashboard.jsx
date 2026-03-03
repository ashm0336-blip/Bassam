import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import {
  MapPin, Users, UserCheck, UserX, Layers, Calendar, ArrowLeft,
  CheckCircle2, Clock, AlertCircle, TrendingUp, Maximize2, BarChart3,
  ZoomIn, ZoomOut
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ZONE_TYPE_CONFIG = {
  men_prayer: { label_ar: "مصليات رجال", label_en: "Men Prayer", color: "#22c55e" },
  women_prayer: { label_ar: "مصليات نساء", label_en: "Women Prayer", color: "#60a5fa" },
  service: { label_ar: "خدمات", label_en: "Services", color: "#374151" },
  reserve_fard: { label_ar: "احتياطي فرض", label_en: "Reserve", color: "#f59e0b" },
  men_rakatayn: { label_ar: "ركعتين رجال", label_en: "Men Rak.", color: "#10b981" },
  women_rakatayn: { label_ar: "ركعتين نساء", label_en: "Women Rak.", color: "#818cf8" },
  vip: { label_ar: "كبار الشخصيات", label_en: "VIP", color: "#a855f7" },
  women_tasks: { label_ar: "مهام نساء", label_en: "Women Tasks", color: "#ec4899" },
  men_tasks: { label_ar: "مهام رجال", label_en: "Men Tasks", color: "#14b8a6" },
};

export default function PrayerAreasDashboard() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const navigate = useNavigate();

  const [floors, setFloors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [floorsRes, sessionsRes, empRes] = await Promise.all([
          axios.get(`${API}/floors`),
          axios.get(`${API}/map-sessions`),
          axios.get(`${API}/employees?department=plazas`, { headers }),
        ]);
        setFloors(floorsRes.data);
        setSessions(sessionsRes.data);
        setEmployees(empRes.data.filter(e => e.is_active));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  // Latest session stats
  const latestSession = sessions.length > 0 ? sessions[0] : null;
  const latestZones = latestSession?.zones || [];
  const activeZones = latestZones.filter(z => !z.is_removed);

  const stats = useMemo(() => {
    const types = {};
    let totalArea = 0, totalCap = 0;
    activeZones.forEach(z => {
      const t = z.zone_type || "other";
      types[t] = (types[t] || 0) + 1;
      totalArea += (z.area_sqm || 0);
      totalCap += (z.max_capacity || 0);
    });
    return { totalZones: activeZones.length, types, totalArea, totalCap };
  }, [activeZones]);

  // Session history for chart
  const recentSessions = sessions.slice(0, 7).reverse();
  const maxZones = Math.max(...recentSessions.map(s => (s.zones || []).filter(z => !z.is_removed).length), 1);

  // Employee stats
  const activeEmps = employees.filter(e => e.is_active);
  const assignedEmps = activeEmps.filter(e => e.location);
  const unassignedEmps = activeEmps.filter(e => !e.location);

  const shiftStats = useMemo(() => {
    const shifts = {};
    activeEmps.forEach(e => { const s = e.shift || "?"; shifts[s] = (shifts[s] || 0) + 1; });
    return shifts;
  }, [activeEmps]);

  const SHIFT_COLORS = { "الأولى": "#3b82f6", "الثانية": "#22c55e", "الثالثة": "#f97316", "الرابعة": "#8b5cf6" };

  const today = new Date().toISOString().split("T")[0];
  const todaySession = sessions.find(s => s.date === today);
  const completedSessions = sessions.filter(s => s.status === "completed").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 mx-auto flex items-center justify-center mb-3 animate-pulse"><MapPin className="w-6 h-6 text-emerald-600" /></div>
          <p className="text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="prayer-areas-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-cairo font-bold text-2xl" data-testid="page-title">{isAr ? "إدارة المصليات" : "Prayer Areas"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{isAr ? "نظرة عامة شاملة على المصليات والمناطق والموظفين" : "Comprehensive overview"}</p>
        </div>
        <div className="flex items-center gap-2">
          {!todaySession && (
            <Button onClick={() => navigate("/daily-sessions")} className="bg-emerald-600 hover:bg-emerald-700" data-testid="start-today-btn">
              <Calendar className="w-4 h-4 ml-1.5" />{isAr ? "ابدأ جولة اليوم" : "Start Today's Tour"}
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/daily-sessions")}>
            <ArrowLeft className="w-4 h-4 ml-1.5" />{isAr ? "السجل اليومي" : "Daily Log"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3" data-testid="kpi-cards">
        {/* Zones */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-emerald-50 to-white p-4">
          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-emerald-200/30 blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-medium">{isAr ? "المناطق" : "Zones"}</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><MapPin className="w-4 h-4 text-emerald-600" /></div>
            </div>
            <p className="text-3xl font-bold text-emerald-700">{stats.totalZones}</p>
          </div>
        </div>

        {/* Floors */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-indigo-50 to-white p-4">
          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-indigo-200/30 blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-medium">{isAr ? "الأدوار" : "Floors"}</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center"><Layers className="w-4 h-4 text-indigo-600" /></div>
            </div>
            <p className="text-3xl font-bold text-indigo-700">{floors.length}</p>
          </div>
        </div>

        {/* Area */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-blue-50 to-white p-4">
          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-blue-200/30 blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-medium">{isAr ? "المساحة" : "Area"}</span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Maximize2 className="w-4 h-4 text-blue-600" /></div>
            </div>
            <p className="text-3xl font-bold text-blue-700">{stats.totalArea.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{isAr ? "م²" : "m²"}</p>
          </div>
        </div>

        {/* Capacity */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-amber-50 to-white p-4">
          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-amber-200/30 blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-medium">{isAr ? "السعة" : "Capacity"}</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><Users className="w-4 h-4 text-amber-600" /></div>
            </div>
            <p className="text-3xl font-bold text-amber-700">{stats.totalCap.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{isAr ? "مصلي" : "worshippers"}</p>
          </div>
        </div>

        {/* Employees */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-violet-50 to-white p-4">
          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-violet-200/30 blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-medium">{isAr ? "الموظفين" : "Staff"}</span>
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center"><UserCheck className="w-4 h-4 text-violet-600" /></div>
            </div>
            <p className="text-3xl font-bold text-violet-700">{activeEmps.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{assignedEmps.length} {isAr ? "معيّن" : "assigned"}</p>
          </div>
        </div>

        {/* Sessions */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-cyan-50 to-white p-4">
          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-cyan-200/30 blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-medium">{isAr ? "الجولات" : "Tours"}</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center"><Calendar className="w-4 h-4 text-cyan-600" /></div>
            </div>
            <p className="text-3xl font-bold text-cyan-700">{sessions.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{completedSessions} {isAr ? "مكتمل" : "completed"}</p>
          </div>
        </div>
      </div>

      {/* Row 2: Zone Types + Session Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Zone Types Distribution */}
        <Card data-testid="zone-types-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-cairo text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-600" />{isAr ? "توزيع المناطق حسب النوع" : "Zones by Type"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {Object.entries(stats.types).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const cfg = ZONE_TYPE_CONFIG[type] || { label_ar: type, label_en: type, color: "#94a3b8" };
                const pct = stats.totalZones > 0 ? Math.round((count / stats.totalZones) * 100) : 0;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    <span className="text-xs font-medium w-28 truncate">{isAr ? cfg.label_ar : cfg.label_en}</span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                    </div>
                    <span className="text-xs font-bold w-8 text-left">{count}</span>
                    <span className="text-[10px] text-slate-400 w-8">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Session Activity Chart */}
        <Card data-testid="session-activity-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-cairo text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-600" />{isAr ? "نشاط الجولات" : "Tour Activity"}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-end gap-2 h-32">
                  {recentSessions.map((s, i) => {
                    const zCount = (s.zones || []).filter(z => !z.is_removed).length;
                    const h = Math.max((zCount / maxZones) * 100, 8);
                    const isCompleted = s.status === "completed";
                    return (
                      <div key={s.id || i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-slate-500">{zCount}</span>
                        <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${h}%`, backgroundColor: isCompleted ? "#10b981" : "#f59e0b", opacity: 0.8 }} />
                        <span className="text-[8px] text-slate-400">{new Date(s.date + "T00:00:00").getDate()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-4 pt-2 border-t">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-emerald-500" />{isAr ? "مكتمل" : "Done"}</span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-amber-400" />{isAr ? "مسودة" : "Draft"}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8"><Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" /><p className="text-xs text-muted-foreground">{isAr ? "لا توجد جولات بعد" : "No tours yet"}</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2.5: Density Heatmap - Interactive */}
      {latestSession && activeZones.length > 0 && floors.length > 0 && <HeatmapCard floors={floors} activeZones={activeZones} latestSession={latestSession} isAr={isAr} navigate={navigate} />}

      {/* Row 3: Employees + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Employee Distribution */}
        <Card data-testid="employee-stats-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-cairo text-sm flex items-center gap-2"><Users className="w-4 h-4 text-violet-600" />{isAr ? "حالة الموظفين" : "Staff Status"}</CardTitle>
          </CardHeader>
          <CardContent>
            {activeEmps.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 rounded-xl bg-violet-50 border"><Users className="w-4 h-4 mx-auto text-violet-600 mb-1" /><p className="text-xl font-bold text-violet-700">{activeEmps.length}</p><p className="text-[9px] text-muted-foreground">{isAr ? "إجمالي" : "Total"}</p></div>
                  <div className="text-center p-3 rounded-xl bg-emerald-50 border"><UserCheck className="w-4 h-4 mx-auto text-emerald-600 mb-1" /><p className="text-xl font-bold text-emerald-700">{assignedEmps.length}</p><p className="text-[9px] text-muted-foreground">{isAr ? "معيّن" : "Assigned"}</p></div>
                  <div className="text-center p-3 rounded-xl bg-amber-50 border"><UserX className="w-4 h-4 mx-auto text-amber-600 mb-1" /><p className="text-xl font-bold text-amber-700">{unassignedEmps.length}</p><p className="text-[9px] text-muted-foreground">{isAr ? "غير معيّن" : "Free"}</p></div>
                </div>
                {/* Shifts */}
                <div className="space-y-1.5 pt-2 border-t">
                  <span className="text-[10px] text-muted-foreground font-medium">{isAr ? "الورديات" : "Shifts"}</span>
                  {Object.entries(shiftStats).map(([shift, count]) => (
                    <div key={shift} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SHIFT_COLORS[shift] || "#94a3b8" }} />
                      <span className="text-xs w-20">{shift}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.round((count / Math.max(activeEmps.length, 1)) * 100)}%`, backgroundColor: SHIFT_COLORS[shift] || "#94a3b8" }} /></div>
                      <span className="text-xs font-bold w-6">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8"><Users className="w-8 h-8 mx-auto text-slate-300 mb-2" /><p className="text-xs text-muted-foreground">{isAr ? "لا يوجد موظفين - أضف من إعدادات القسم" : "No staff"}</p></div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card data-testid="recent-sessions-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-cairo text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-600" />{isAr ? "آخر الجولات" : "Recent Tours"}</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length > 0 ? (
              <div className="space-y-2">
                {sessions.slice(0, 5).map(s => {
                  const zCount = (s.zones || []).filter(z => !z.is_removed).length;
                  const changes = s.changes_summary || {};
                  const totalChanges = (changes.added || 0) + (changes.removed || 0) + (changes.modified || 0);
                  const dateStr = (() => { try { return new Date(s.date + "T00:00:00").toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" }); } catch { return s.date; } })();
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl border hover:shadow-sm transition-all cursor-pointer" onClick={() => navigate("/daily-sessions")} data-testid={`recent-session-${s.id}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.status === "completed" ? "bg-emerald-100" : "bg-amber-100"}`}>
                        {s.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{dateStr}</span>
                          <Badge className={`text-[9px] px-1.5 py-0 ${s.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {s.status === "completed" ? (isAr ? "مكتمل" : "Done") : (isAr ? "مسودة" : "Draft")}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{zCount} {isAr ? "منطقة" : "zones"}{totalChanges > 0 ? ` | ${totalChanges} ${isAr ? "تغيير" : "changes"}` : ""}</p>
                      </div>
                    </div>
                  );
                })}
                <Button variant="ghost" className="w-full text-xs text-emerald-600 hover:text-emerald-700" onClick={() => navigate("/daily-sessions")}>
                  {isAr ? "عرض كل الجولات" : "View All"} →
                </Button>
              </div>
            ) : (
              <div className="text-center py-8"><Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" /><p className="text-xs text-muted-foreground">{isAr ? "لا توجد جولات" : "No tours"}</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(unassignedEmps.length > 0 || !todaySession) && (
        <Card className="border-amber-200 bg-amber-50/30" data-testid="alerts-card">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-cairo font-semibold text-sm flex items-center gap-2 text-amber-700"><AlertCircle className="w-4 h-4" />{isAr ? "تنبيهات" : "Alerts"}</h3>
            {!todaySession && (
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs text-amber-700">{isAr ? "جولة اليوم لم تبدأ بعد" : "Today's tour not started"}</span>
                <Button size="sm" variant="outline" className="mr-auto h-6 text-[10px] border-amber-300 text-amber-700" onClick={() => navigate("/daily-sessions")}>
                  {isAr ? "ابدأ الآن" : "Start Now"}
                </Button>
              </div>
            )}
            {unassignedEmps.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-amber-700">{unassignedEmps.length} {isAr ? "موظفين غير معيّنين على مناطق" : "unassigned staff"}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Interactive Heatmap Component with zoom/pan
function HeatmapCard({ floors, activeZones, latestSession, isAr, navigate }) {
  const [heatZoom, setHeatZoom] = useState(1);
  const [heatPan, setHeatPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [imgRatio, setImgRatio] = useState(null);
  const [hoveredZone, setHoveredZone] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const containerRef = useRef(null);

  const floor = floors[0];
  const floorImageUrl = (() => {
    let url = floor.image_url || "";
    if (url.startsWith("/")) url = `${process.env.REACT_APP_BACKEND_URL}${url}`;
    if (url.includes("/uploads/") && !url.includes("/api/uploads/")) url = url.replace("/uploads/", "/api/uploads/");
    return url;
  })();

  const getDensityColor = (z) => {
    const curr = z.current_count || 0;
    const max = z.max_capacity || 0;
    if (max === 0) return { color: "#94a3b8", label: isAr ? "غير محدد" : "N/A" };
    const pct = (curr / max) * 100;
    if (pct >= 80) return { color: "#ef4444", label: isAr ? "مزدحم" : "Crowded" };
    if (pct >= 50) return { color: "#f59e0b", label: isAr ? "متوسط" : "Medium" };
    return { color: "#22c55e", label: isAr ? "خفيف" : "Light" };
  };

  const densityCounts = useMemo(() => {
    const c = { light: 0, medium: 0, crowded: 0, na: 0 };
    activeZones.forEach(z => {
      const curr = z.current_count || 0;
      const max = z.max_capacity || 0;
      if (max === 0) { c.na++; return; }
      const pct = (curr / max) * 100;
      if (pct >= 80) c.crowded++;
      else if (pct >= 50) c.medium++;
      else c.light++;
    });
    return c;
  }, [activeZones]);

  const getPath = (pts) => {
    if (!pts || pts.length < 2) return "";
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ") + " Z";
  };

  // Wheel zoom
  const wheelHandler = useCallback((node) => {
    if (!node) return;
    containerRef.current = node;
    const handler = (e) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const prev = zoomRef.current;
      const nz = Math.max(0.5, Math.min(8, prev * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      const s = nz / prev;
      zoomRef.current = nz; setHeatZoom(nz);
      setHeatPan(p => ({ x: mx - s * (mx - p.x), y: my - s * (my - p.y) }));
    };
    node.addEventListener("wheel", handler, { passive: false });
  }, []);

  const handleMouseDown = (e) => { if (e.button === 0) { setIsPanning(true); setPanStart({ x: e.clientX - heatPan.x, y: e.clientY - heatPan.y }); } };
  const handleMouseMove = (e) => {
    if (isPanning) setHeatPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - r.left + 14, y: e.clientY - r.top - 10 });
    }
  };
  const handleMouseUp = () => setIsPanning(false);

  const zoomTo = (factor) => {
    const c = containerRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const cx = r.width / 2, cy = r.height / 2;
    const p = zoomRef.current;
    const nz = Math.max(0.5, Math.min(8, p * factor));
    const s = nz / p;
    zoomRef.current = nz; setHeatZoom(nz);
    setHeatPan(o => ({ x: cx - s * (cx - o.x), y: cy - s * (cy - o.y) }));
  };
  const resetView = () => { zoomRef.current = 1; setHeatZoom(1); setHeatPan({ x: 0, y: 0 }); };

  return (
    <Card data-testid="density-heatmap-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-cairo text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" />{isAr ? "مؤشر الكثافة - آخر جولة" : "Density - Latest Tour"}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">{latestSession.date}</Badge>
            <div className="flex items-center gap-0.5 border rounded-lg p-0.5 bg-slate-50">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => zoomTo(0.8)}><ZoomOut className="w-3 h-3" /></Button>
              <span className="text-[10px] w-8 text-center font-medium text-slate-500">{Math.round(heatZoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => zoomTo(1.25)}><ZoomIn className="w-3 h-3" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={resetView}><Maximize2 className="w-3 h-3" /></Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Interactive Map */}
          <div className="lg:col-span-3 relative rounded-xl overflow-hidden border bg-slate-100" style={{ height: "340px" }}>
            <div
              ref={wheelHandler}
              className="relative w-full h-full overflow-hidden"
              style={{ cursor: isPanning ? "grabbing" : "grab" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { handleMouseUp(); setHoveredZone(null); }}
              data-testid="heatmap-canvas"
            >
              <div style={{ transform: `translate(${heatPan.x}px, ${heatPan.y}px) scale(${heatZoom})`, transformOrigin: "0 0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(() => {
                  const ce = containerRef.current;
                  let ws = { position: "relative", width: "100%", height: "100%" };
                  if (imgRatio && ce) {
                    const cw = ce.clientWidth, ch = ce.clientHeight;
                    if (cw / ch > imgRatio) ws = { position: "relative", height: "100%", width: ch * imgRatio };
                    else ws = { position: "relative", width: "100%", height: cw / imgRatio };
                  }
                  return (
                    <div style={ws}>
                      {floorImageUrl && <img src={floorImageUrl} alt="" style={{ width: "100%", height: "100%", display: "block", imageRendering: "high-quality" }} draggable={false} className="pointer-events-none select-none" onLoad={(e) => setImgRatio(e.target.naturalWidth / e.target.naturalHeight)} />}
                      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }} viewBox="0 0 100 100" preserveAspectRatio="none">
                        {activeZones.filter(z => z.polygon_points?.length > 2).map(zone => {
                          const dc = getDensityColor(zone);
                          const isHov = hoveredZone?.id === zone.id;
                          return (
                            <g key={zone.id}
                              onMouseEnter={() => setHoveredZone(zone)}
                              onMouseLeave={() => setHoveredZone(null)}
                              style={{ cursor: "pointer" }}>
                              <path d={getPath(zone.polygon_points)} fill={dc.color} fillOpacity={isHov ? 0.7 : 0.45} stroke={isHov ? "#1e293b" : dc.color} strokeWidth={isHov ? "0.5" : "0.2"} strokeOpacity={isHov ? 1 : 0.7} vectorEffect="non-scaling-stroke" />
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
              {/* Floor label */}
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] font-medium text-slate-600 border">{floor.name_ar}</div>
              {/* Legend */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border shadow-sm">
                {[
                  { label: isAr ? "خفيف" : "Light", color: "#22c55e" },
                  { label: isAr ? "متوسط" : "Medium", color: "#f59e0b" },
                  { label: isAr ? "مزدحم" : "Crowded", color: "#ef4444" },
                  { label: isAr ? "غير محدد" : "N/A", color: "#94a3b8" },
                ].map(l => <span key={l.label} className="flex items-center gap-1 text-[9px]"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />{l.label}</span>)}
              </div>
              {/* Tooltip */}
              {hoveredZone && !isPanning && (() => {
                const dc = getDensityColor(hoveredZone);
                const curr = hoveredZone.current_count || 0;
                const max = hoveredZone.max_capacity || 0;
                const pct = max > 0 ? Math.round((curr / max) * 100) : 0;
                return (
                  <div className="absolute pointer-events-none z-50" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                    <div className="bg-white/97 backdrop-blur-md rounded-xl shadow-2xl border overflow-hidden min-w-[180px]" style={{ direction: "rtl" }}>
                      <div className="h-1" style={{ backgroundColor: dc.color }} />
                      <div className="p-2.5 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: hoveredZone.fill_color }}>{hoveredZone.zone_code?.split("-").pop()}</span>
                          <span className="font-bold text-xs">{hoveredZone.zone_code}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium mr-auto" style={{ backgroundColor: `${dc.color}20`, color: dc.color }}>{dc.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-600">{isAr ? hoveredZone.name_ar : hoveredZone.name_en}</p>
                        {max > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: dc.color }} /></div>
                            <span className="text-[10px] font-bold" style={{ color: dc.color }}>{pct}%</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500">{curr.toLocaleString()} / {max.toLocaleString()} {isAr ? "مصلي" : "cap"}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          {/* Density Stats */}
          <div className="space-y-3">
            {[
              { key: "light", label: isAr ? "خفيف" : "Light", color: "#22c55e", count: densityCounts.light },
              { key: "medium", label: isAr ? "متوسط" : "Medium", color: "#f59e0b", count: densityCounts.medium },
              { key: "crowded", label: isAr ? "مزدحم" : "Crowded", color: "#ef4444", count: densityCounts.crowded },
              { key: "na", label: isAr ? "غير محدد" : "N/A", color: "#94a3b8", count: densityCounts.na },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-2 p-2.5 rounded-xl border bg-white">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-medium flex-1">{item.label}</span>
                <span className="text-lg font-bold" style={{ color: item.color }}>{item.count}</span>
              </div>
            ))}
            <Button variant="outline" className="w-full text-xs" onClick={() => navigate("/daily-sessions")}>
              {isAr ? "فتح السجل اليومي" : "Open Daily Log"} →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
