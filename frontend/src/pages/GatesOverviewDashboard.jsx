import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useSidebar } from "@/context/SidebarContext";
import {
  DoorOpen, DoorClosed, Wrench, Users, UserCheck, UserX, Calendar, Clock,
  ArrowLeft, CheckCircle2, AlertCircle, TrendingUp, Gauge, Shield,
  ArrowUpRight, ArrowDownRight, ArrowLeftRight, MapPin, BarChart3, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLAZA_LABELS = {
  "الساحة الشرقية": { short: "الشرقية", color: "#BC9661" },
  "الساحة الشمالية": { short: "الشمالية", color: "#1A4782" },
  "الساحة الجنوبية": { short: "الجنوبية", color: "#0E573A" },
  "الساحة الغربية": { short: "الغربية", color: "#700D21" },
};

export default function GatesOverviewDashboard() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const navigate = useNavigate();
  const { menuItems } = useSidebar();

  const [gates, setGates] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const pageInfo = menuItems.find(item => item.href === '/gates' && !item.parent_id);
  const pageTitle = pageInfo ? (isAr ? pageInfo.name_ar : pageInfo.name_en) : (isAr ? 'إدارة الأبواب' : 'Gates Management');

  useEffect(() => {
    const fetchAll = async () => {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [gatesRes, sessionsRes, empRes, empStatsRes] = await Promise.all([
          axios.get(`${API}/gates`),
          axios.get(`${API}/gate-sessions`),
          axios.get(`${API}/employees?department=gates`, { headers }),
          axios.get(`${API}/employees/stats/gates`, { headers }),
        ]);
        setGates(gatesRes.data);
        setSessions(sessionsRes.data);
        setEmployees(empRes.data.filter(e => e.is_active));
        setEmployeeStats(empStatsRes.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const openGates = gates.filter(g => g.status === 'مفتوح' || g.status === 'open');
  const closedGates = gates.filter(g => g.status === 'مغلق' || g.status === 'closed');
  const totalFlow = gates.reduce((sum, g) => sum + (g.current_flow || 0), 0);
  const totalMaxFlow = gates.reduce((sum, g) => sum + (g.max_flow || 0), 0);
  const flowPct = totalMaxFlow > 0 ? Math.round((totalFlow / totalMaxFlow) * 100) : 0;

  const latestSession = sessions.length > 0 ? sessions[0] : null;
  const latestGates = latestSession?.gates || [];
  const latestActiveGates = latestGates.filter(g => !g.is_removed);

  const activeEmps = employees;
  const assignedEmps = activeEmps.filter(e => e.location);

  const today = new Date().toISOString().split("T")[0];
  const todaySession = sessions.find(s => s.date === today);
  const completedSessions = sessions.filter(s => s.status === "completed").length;

  const recentSessions = sessions.slice(0, 7).reverse();
  const maxGatesInSession = Math.max(...recentSessions.map(s => (s.gates || []).filter(g => !g.is_removed).length), 1);

  // Gate type stats
  const typeStats = useMemo(() => {
    const types = {};
    gates.forEach(g => { const t = g.gate_type || "?"; types[t] = (types[t] || 0) + 1; });
    return Object.entries(types).sort((a, b) => b[1] - a[1]);
  }, [gates]);

  // Direction stats
  const dirStats = useMemo(() => {
    const dirs = { "دخول": 0, "خروج": 0, "دخول وخروج": 0 };
    gates.forEach(g => { if (dirs[g.direction] !== undefined) dirs[g.direction]++; });
    return dirs;
  }, [gates]);

  const SHIFT_COLORS = { "الأولى": "#3b82f6", "الثانية": "#22c55e", "الثالثة": "#f97316", "الرابعة": "#8b5cf6" };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-100 mx-auto flex items-center justify-center mb-3 animate-pulse"><DoorOpen className="w-6 h-6 text-blue-600" /></div>
          <p className="text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="gates-overview-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-cairo font-bold text-2xl" data-testid="gates-title">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">{isAr ? "نظرة شاملة على حالة الأبواب والموظفين" : "Overview of gates and employees"}</p>
        </div>
        <div className="flex items-center gap-2">
          {!todaySession && (
            <Button onClick={() => navigate("/daily-gates")} className="bg-blue-600 hover:bg-blue-700" data-testid="start-today-btn">
              <Calendar className="w-4 h-4 ml-1.5" />{isAr ? "ابدأ جولة اليوم" : "Start Today's Tour"}
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/daily-gates")}>
            <ArrowLeft className="w-4 h-4 ml-1.5" />{isAr ? "السجل اليومي" : "Daily Log"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="gates-kpi-row">
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-blue-50 to-white p-4">
          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-blue-200/30 blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">{isAr ? "إجمالي الأبواب" : "Total"}</span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><DoorOpen className="w-4 h-4 text-blue-600" /></div>
            </div>
            <p className="text-3xl font-bold text-blue-700">{gates.length}</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-emerald-50 to-white p-4">
          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-emerald-200/30 blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">{isAr ? "مفتوحة" : "Open"}</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><DoorOpen className="w-4 h-4 text-emerald-600" /></div>
            </div>
            <p className="text-3xl font-bold text-emerald-700">{openGates.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{gates.length > 0 ? Math.round((openGates.length / gates.length) * 100) : 0}%</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-red-50 to-white p-4">
          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-red-200/30 blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">{isAr ? "مغلقة" : "Closed"}</span>
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><DoorClosed className="w-4 h-4 text-red-500" /></div>
            </div>
            <p className="text-3xl font-bold text-red-600">{closedGates.length}</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-violet-50 to-white p-4">
          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-violet-200/30 blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">{isAr ? "الموظفين" : "Staff"}</span>
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center"><Users className="w-4 h-4 text-violet-600" /></div>
            </div>
            <p className="text-3xl font-bold text-violet-700">{activeEmps.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{assignedEmps.length} {isAr ? "معيّن" : "assigned"}</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-cyan-50 to-white p-4">
          <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-cyan-200/30 blur-xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">{isAr ? "الجولات" : "Tours"}</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center"><Calendar className="w-4 h-4 text-cyan-600" /></div>
            </div>
            <p className="text-3xl font-bold text-cyan-700">{sessions.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{completedSessions} {isAr ? "مكتمل" : "done"}</p>
          </div>
        </div>
      </div>

      {/* Row 2: Plaza + Type + Direction */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By Plaza */}
        <Card data-testid="plaza-card">
          <CardHeader className="pb-3"><CardTitle className="font-cairo text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-600" />{isAr ? "حسب الساحة" : "By Plaza"}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PLAZA_LABELS).map(([plaza, cfg]) => {
                const count = gates.filter(g => g.plaza === plaza).length;
                const openCount = gates.filter(g => g.plaza === plaza && (g.status === 'مفتوح' || g.status === 'open')).length;
                return (
                  <div key={plaza} className="rounded-xl border p-3 transition-all hover:shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
                      <span className="text-xs font-semibold">{cfg.short}</span>
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
              {typeStats.map(([type, count]) => {
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
                const count = dirStats[dir.key] || 0;
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

      {/* Row 3: Session Activity + Employees + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Session Activity */}
        <Card data-testid="session-activity-card">
          <CardHeader className="pb-3"><CardTitle className="font-cairo text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-600" />{isAr ? "نشاط الجولات" : "Tour Activity"}</CardTitle></CardHeader>
          <CardContent>
            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-end gap-2 h-28">
                  {recentSessions.map((s, i) => {
                    const gCount = (s.gates || []).filter(g => !g.is_removed).length;
                    const h = Math.max((gCount / maxGatesInSession) * 100, 8);
                    return (
                      <div key={s.id || i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-slate-500">{gCount}</span>
                        <div className="w-full rounded-t-md transition-all" style={{ height: `${h}%`, backgroundColor: s.status === "completed" ? "#3b82f6" : "#f59e0b", opacity: 0.8 }} />
                        <span className="text-[8px] text-slate-400">{new Date(s.date + "T00:00:00").getDate()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-4 pt-2 border-t">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-blue-500" />{isAr ? "مكتمل" : "Done"}</span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-amber-400" />{isAr ? "مسودة" : "Draft"}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8"><Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" /><p className="text-xs text-muted-foreground">{isAr ? "لا توجد جولات" : "No tours"}</p></div>
            )}
          </CardContent>
        </Card>

        {/* Employees */}
        <Card data-testid="employee-stats-card">
          <CardHeader className="pb-3"><CardTitle className="font-cairo text-sm flex items-center gap-2"><Users className="w-4 h-4 text-violet-600" />{isAr ? "حالة الموظفين" : "Staff"}</CardTitle></CardHeader>
          <CardContent>
            {activeEmps.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2.5 rounded-xl bg-violet-50 border"><p className="text-xl font-bold text-violet-700">{activeEmps.length}</p><p className="text-[9px] text-muted-foreground">{isAr ? "إجمالي" : "Total"}</p></div>
                  <div className="text-center p-2.5 rounded-xl bg-emerald-50 border"><p className="text-xl font-bold text-emerald-700">{assignedEmps.length}</p><p className="text-[9px] text-muted-foreground">{isAr ? "معيّن" : "Assigned"}</p></div>
                  <div className="text-center p-2.5 rounded-xl bg-amber-50 border"><p className="text-xl font-bold text-amber-700">{activeEmps.length - assignedEmps.length}</p><p className="text-[9px] text-muted-foreground">{isAr ? "غير معيّن" : "Free"}</p></div>
                </div>
                {employeeStats?.shifts && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-[10px] text-muted-foreground">{isAr ? "الورديات:" : "Shifts:"}</span>
                    {[
                      { label: isAr ? "الأولى" : "1st", value: employeeStats.shifts.shift_1, color: "#3b82f6" },
                      { label: isAr ? "الثانية" : "2nd", value: employeeStats.shifts.shift_2, color: "#22c55e" },
                      { label: isAr ? "الثالثة" : "3rd", value: employeeStats.shifts.shift_3, color: "#f97316" },
                      { label: isAr ? "الرابعة" : "4th", value: employeeStats.shifts.shift_4, color: "#8b5cf6" },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-1 px-2 py-1 rounded-full border text-[10px]">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="font-semibold">{s.value || 0}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8"><Users className="w-8 h-8 mx-auto text-slate-300 mb-2" /><p className="text-xs text-muted-foreground">{isAr ? "لا يوجد موظفين" : "No staff"}</p></div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card data-testid="recent-sessions-card">
          <CardHeader className="pb-3"><CardTitle className="font-cairo text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-600" />{isAr ? "آخر الجولات" : "Recent"}</CardTitle></CardHeader>
          <CardContent>
            {sessions.length > 0 ? (
              <div className="space-y-2">
                {sessions.slice(0, 4).map(s => {
                  const gCount = (s.gates || []).filter(g => !g.is_removed).length;
                  const dateStr = (() => { try { return new Date(s.date + "T00:00:00").toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" }); } catch { return s.date; } })();
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl border hover:shadow-sm transition-all cursor-pointer" onClick={() => navigate("/daily-gates")}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.status === "completed" ? "bg-blue-100" : "bg-amber-100"}`}>
                        {s.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-blue-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold">{dateStr}</span>
                        <p className="text-[10px] text-muted-foreground">{gCount} {isAr ? "باب" : "gates"}</p>
                      </div>
                      <Badge className={`text-[9px] ${s.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                        {s.status === "completed" ? (isAr ? "مكتمل" : "Done") : (isAr ? "مسودة" : "Draft")}
                      </Badge>
                    </div>
                  );
                })}
                <Button variant="ghost" className="w-full text-xs text-blue-600" onClick={() => navigate("/daily-gates")}>{isAr ? "عرض الكل" : "View All"} →</Button>
              </div>
            ) : (
              <div className="text-center py-8"><Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" /><p className="text-xs text-muted-foreground">{isAr ? "لا توجد جولات" : "No tours"}</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {!todaySession && (
        <Card className="border-amber-200 bg-amber-50/30" data-testid="alerts-card">
          <CardContent className="p-4">
            <h3 className="font-cairo font-semibold text-sm flex items-center gap-2 text-amber-700 mb-2"><AlertCircle className="w-4 h-4" />{isAr ? "تنبيهات" : "Alerts"}</h3>
            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-amber-700">{isAr ? "جولة اليوم لم تبدأ بعد" : "Today's tour not started"}</span>
              <Button size="sm" variant="outline" className="mr-auto h-6 text-[10px] border-amber-300 text-amber-700" onClick={() => navigate("/daily-gates")}>
                {isAr ? "ابدأ الآن" : "Start"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
