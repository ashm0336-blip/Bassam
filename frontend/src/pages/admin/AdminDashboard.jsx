import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Users, Shield, Briefcase, Lock,
  CheckCircle2, ShieldAlert,
  KeyRound, Clock, Unlock, UserCheck, ShieldCheck,
  RefreshCw, TrendingUp, UserPlus, Building
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_COLORS = {
  system_admin: "#dc2626", general_manager: "#9333ea", department_manager: "#3b82f6",
  shift_supervisor: "#7c3aed", field_staff: "#22c55e", admin_staff: "#0ea5e9"
};
const ROLE_LABELS = {
  ar: { system_admin: "مسؤول النظام", general_manager: "المدير العام", department_manager: "مدير الإدارة", shift_supervisor: "مشرف الوردية", field_staff: "موظف ميداني", admin_staff: "موظف إداري" },
  en: { system_admin: "System Admin", general_manager: "General Manager", department_manager: "Dept Manager", shift_supervisor: "Shift Supervisor", field_staff: "Field Staff", admin_staff: "Admin Staff" }
};
const ROLE_ICONS = { system_admin: Shield, general_manager: Briefcase, department_manager: Building, shift_supervisor: UserCheck, field_staff: UserCheck, admin_staff: Briefcase };
const DEPT_LABELS = { gates: 'الأبواب', plazas: 'الساحات', planning: 'التخطيط', crowd_services: 'الحشود', mataf: 'المطاف', haram_map: 'المصليات' };
const DEPT_COLORS = { gates: '#1d4ed8', plazas: '#0d9488', planning: '#7c3aed', crowd_services: '#d97706', mataf: '#dc2626', haram_map: '#059669' };
const DEPT_ICONS = { gates: Lock, plazas: Building, planning: Briefcase, crowd_services: Users, mataf: TrendingUp, haram_map: Shield };

function AnimNum({ value: rawValue, duration = 600, language = 'ar' }) {
  const value = Number(rawValue) || 0;
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
  return <span>{d.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>;
}

function formatTimeAgo(timestamp, isAr = true) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return isAr ? 'الآن' : 'Now';
  if (diffMin < 60) return isAr ? `منذ ${diffMin} د` : `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return isAr ? `منذ ${diffH} س` : `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return isAr ? `منذ ${diffD} يوم` : `${diffD}d ago`;
}

function RingProgress({ value, max, color, size = 56, strokeWidth = 5 }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700" />
    </svg>
  );
}

export default function AdminDashboard() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, frozen: 0, byRole: {}, byDept: {}, totalEmployees: 0 });
  const [securityData, setSecurityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [securityTab, setSecurityTab] = useState("frozen");
  const [unfreezing, setUnfreezing] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, employeesRes, secRes] = await Promise.all([
        axios.get(`${API}/users`, { headers }),
        axios.get(`${API}/employees`, { headers }),
        axios.get(`${API}/admin/security-stats`, { headers }),
      ]);

      const usersData = usersRes.data;
      const empsData = employeesRes.data;
      setUsers(usersData);
      setEmployees(empsData);
      setSecurityData(secRes.data);

      const byRole = {}, byDept = {};
      usersData.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1; });
      empsData.forEach(e => { const d = e.department || 'other'; byDept[d] = (byDept[d] || 0) + 1; });

      const frozen = usersData.filter(u => u.account_status === 'frozen').length;
      const active = usersData.filter(u => u.account_status === 'active' || !u.account_status).length;

      setStats({
        total: usersData.length, active, frozen,
        byRole, byDept,
        totalEmployees: empsData.length,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUnfreeze = async (userId, userName) => {
    setUnfreezing(userId);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/admin/security/unfreeze/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`تم فك تجميد حساب ${userName}`);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشلت العملية');
    } finally { setUnfreezing(null); }
  };

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 rounded-xl bg-muted w-1/3" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-6 h-32" /></Card>)}
      </div>
      <Card><CardContent className="p-6 h-64" /></Card>
    </div>
  );

  const sec = securityData || {};
  const activePct = stats.total > 0 ? Math.round(stats.active / stats.total * 100) : 0;
  const frozenPct = stats.total > 0 ? Math.round(stats.frozen / stats.total * 100) : 0;

  const kpis = [
    { label: isAr ? 'إجمالي المستخدمين' : 'Total Users', value: stats.total, icon: Users, color: '#2563eb', sub: isAr ? 'مسجلون في النظام' : 'Registered' },
    { label: isAr ? 'حسابات نشطة' : 'Active Accounts', value: stats.active, icon: CheckCircle2, color: '#22c55e', pct: activePct, sub: isAr ? `${activePct}% من الإجمالي` : `${activePct}% of total` },
    { label: isAr ? 'حسابات مجمّدة' : 'Frozen Accounts', value: stats.frozen, icon: Lock, color: stats.frozen > 0 ? '#ef4444' : '#6b7280', pct: frozenPct, sub: stats.frozen > 0 ? (isAr ? 'تحتاج مراجعة' : 'Needs review') : (isAr ? 'لا توجد مجمّدة' : 'None frozen') },
    { label: isAr ? 'إجمالي الموظفين' : 'Total Employees', value: stats.totalEmployees, icon: Briefcase, color: '#7c3aed', sub: isAr ? 'في جميع الإدارات' : 'All departments' },
  ];

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-cairo font-bold text-xl">{isAr ? 'نظرة عامة على النظام' : 'System Overview'}</h2>
          <p className="text-sm text-muted-foreground mt-1">{isAr ? 'المستخدمون والمراقبة الأمنية' : 'Users & security monitoring'}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {isAr ? 'مباشر' : 'Live'}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i} className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-200" data-testid={`kpi-card-${i}`}>
              <div className="absolute inset-0 opacity-[0.04]" style={{ background: `radial-gradient(circle at top left, ${kpi.color}, transparent 70%)` }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 truncate">{kpi.label}</p>
                    <p className="text-4xl font-black tracking-tight leading-none" style={{ color: kpi.color }}>
                      <AnimNum value={kpi.value} language={language} />
                    </p>
                    {kpi.sub && <p className="text-[11px] text-muted-foreground mt-2">{kpi.sub}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                      <Icon className="w-5 h-5" style={{ color: kpi.color }} />
                    </div>
                    {kpi.pct !== undefined && (
                      <div className="text-right">
                        <p className="text-base font-black" style={{ color: kpi.color }}>{kpi.pct}%</p>
                        <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden mt-0.5">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(kpi.pct, 100)}%`, background: kpi.color }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-0 shadow-lg overflow-hidden" data-testid="security-monitor">
        <CardHeader className="pb-3 bg-gradient-to-l from-slate-900 to-slate-800 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-cairo flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              {isAr ? 'المراقبة الأمنية' : 'Security Monitoring'}
            </CardTitle>
            <Badge variant="outline" className="text-[9px] border-white/30 text-white/80">
              {isAr ? 'مباشر' : 'Live'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
            {[
              { label: isAr ? 'محاولات دخول فاشلة' : 'Failed Logins', value: sec.failed_logins_today || 0, icon: KeyRound, color: sec.failed_logins_today > 0 ? '#ef4444' : '#22c55e', bgColor: sec.failed_logins_today > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-green-50 dark:bg-green-950/20', desc: isAr ? 'اليوم' : 'Today' },
              { label: isAr ? 'حسابات مجمّدة' : 'Frozen', value: sec.frozen_count || 0, icon: Lock, color: sec.frozen_count > 0 ? '#f59e0b' : '#22c55e', bgColor: sec.frozen_count > 0 ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-green-50 dark:bg-green-950/20', desc: isAr ? 'تحتاج إجراء' : 'Need action' },
              { label: isAr ? 'تغييرات صلاحيات' : 'Perm Changes', value: sec.perm_changes_24h || 0, icon: ShieldCheck, color: '#3b82f6', bgColor: 'bg-blue-50 dark:bg-blue-950/20', desc: isAr ? 'آخر 24 ساعة' : 'Last 24h' },
              { label: isAr ? 'حسابات معلّقة' : 'Pending', value: sec.pending_count || 0, icon: Clock, color: sec.pending_count > 0 ? '#f59e0b' : '#6b7280', bgColor: sec.pending_count > 0 ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-slate-50 dark:bg-slate-950/20', desc: isAr ? 'بانتظار التفعيل' : 'Awaiting activation' },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className={`p-5 ${kpi.bgColor} ${i < 3 ? 'border-l border-border rtl:border-l-0 rtl:border-r rtl:first:border-r-0' : ''}`} data-testid={`sec-kpi-${i}`}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                      <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium leading-tight">{kpi.label}</span>
                  </div>
                  <p className="text-3xl font-black leading-none" style={{ color: kpi.color }}>{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{kpi.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="p-4 pt-3 border-t border-border">
            <Tabs value={securityTab} onValueChange={setSecurityTab} dir="rtl">
              <TabsList className="grid w-full grid-cols-4 h-10">
                <TabsTrigger value="frozen" className="text-[11px] gap-1.5 data-[state=active]:bg-amber-600 data-[state=active]:text-white" data-testid="sec-tab-frozen">
                  <Lock className="w-3.5 h-3.5" />
                  {isAr ? 'مجمّدة' : 'Frozen'}
                  {(sec.frozen_count || 0) > 0 && <Badge variant="destructive" className="text-[8px] px-1.5 py-0 h-4 mr-1">{sec.frozen_count}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="failed" className="text-[11px] gap-1.5 data-[state=active]:bg-red-600 data-[state=active]:text-white" data-testid="sec-tab-failed">
                  <KeyRound className="w-3.5 h-3.5" />
                  {isAr ? 'دخول فاشل' : 'Failed'}
                </TabsTrigger>
                <TabsTrigger value="permissions" className="text-[11px] gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white" data-testid="sec-tab-perms">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isAr ? 'صلاحيات' : 'Perms'}
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-[11px] gap-1.5 data-[state=active]:bg-yellow-600 data-[state=active]:text-white" data-testid="sec-tab-pending">
                  <Clock className="w-3.5 h-3.5" />
                  {isAr ? 'معلّقة' : 'Pending'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="frozen" className="mt-3">
                <ScrollArea className="h-[220px]">
                  {(sec.frozen_users || []).length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-7 h-7 text-green-500" />
                      </div>
                      <p className="text-sm font-semibold">{isAr ? 'لا توجد حسابات مجمّدة' : 'No frozen accounts'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{isAr ? 'جميع الحسابات تعمل بشكل طبيعي' : 'All accounts operating normally'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(sec.frozen_users || []).map((u, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800" data-testid={`frozen-user-${i}`}>
                          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center font-cairo font-bold text-amber-700">
                            {u.name?.charAt(0) || '؟'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {u.email || u.national_id} {u.department ? `— ${DEPT_LABELS[u.department] || u.department}` : ''}
                            </p>
                            <p className="text-[10px] text-red-500 font-medium">{u.failed_attempts || 0} {isAr ? 'محاولة فاشلة' : 'failed attempts'}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-[11px] h-8 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
                            onClick={() => handleUnfreeze(u.id, u.name)}
                            disabled={unfreezing === u.id}
                            data-testid={`unfreeze-btn-${i}`}
                          >
                            {unfreezing === u.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                            {isAr ? 'فك التجميد' : 'Unfreeze'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="failed" className="mt-3">
                <ScrollArea className="h-[220px]">
                  {(sec.failed_login_logs || []).length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                        <ShieldCheck className="w-7 h-7 text-green-500" />
                      </div>
                      <p className="text-sm font-semibold">{isAr ? 'لا توجد محاولات فاشلة' : 'No failed attempts'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{isAr ? 'النظام آمن هذا الأسبوع' : 'System secure this week'}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {(sec.failed_login_logs || []).map((log, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-red-100 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900" data-testid={`failed-log-${i}`}>
                          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                            <KeyRound className="w-4 h-4 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{log.user_name || log.target || '—'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{log.details}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">{formatTimeAgo(log.timestamp, isAr)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="permissions" className="mt-3">
                <ScrollArea className="h-[220px]">
                  {(sec.permission_change_logs || []).length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                        <Shield className="w-7 h-7 text-blue-400" />
                      </div>
                      <p className="text-sm font-semibold">{isAr ? 'لا توجد تغييرات' : 'No changes'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{isAr ? 'الصلاحيات مستقرة آخر 24 ساعة' : 'Permissions stable last 24h'}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {(sec.permission_change_logs || []).map((log, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-blue-100 bg-blue-50/30 dark:bg-blue-950/10 dark:border-blue-900" data-testid={`perm-log-${i}`}>
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">
                              {log.user_name}: <span className="text-muted-foreground font-normal">{
                                { 'تغيير مجموعة صلاحيات': 'غيّر مجموعة صلاحيات', 'تخصيص صلاحيات فردية': 'خصّص صلاحيات فردية', 'نسخ صلاحيات': 'نسخ صلاحيات', 'role_changed': 'غيّر الدور' }[log.action] || log.action
                              }</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">{log.details}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">{formatTimeAgo(log.timestamp, isAr)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pending" className="mt-3">
                <ScrollArea className="h-[220px]">
                  {(sec.pending_users || []).length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-7 h-7 text-green-500" />
                      </div>
                      <p className="text-sm font-semibold">{isAr ? 'لا توجد حسابات معلّقة' : 'No pending accounts'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{isAr ? 'جميع الحسابات مفعّلة' : 'All accounts activated'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(sec.pending_users || []).map((u, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10 dark:border-yellow-800" data-testid={`pending-user-${i}`}>
                          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center font-cairo font-bold text-yellow-700">
                            {u.name?.charAt(0) || '؟'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {u.national_id || u.email} {u.department ? `— ${DEPT_LABELS[u.department] || u.department}` : ''}
                            </p>
                            <p className="text-[10px] text-yellow-600 font-medium">{isAr ? 'بانتظار التفعيل' : 'Awaiting activation'} — {formatTimeAgo(u.created_at, isAr)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-l from-blue-50 to-white dark:from-blue-950/20 dark:to-background border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-cairo flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                {isAr ? 'توزيع المستخدمين حسب الدور' : 'Users by Role'}
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">{stats.total} {isAr ? 'مستخدم' : 'users'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {Object.entries(ROLE_LABELS[language]).map(([key, label]) => {
              const count = stats.byRole[key] || 0;
              const pct = stats.total > 0 ? Math.round(count / stats.total * 100) : 0;
              const Icon = ROLE_ICONS[key] || Users;
              const color = ROLE_COLORS[key] || '#666';
              return (
                <div key={key} className="flex items-center gap-3 group">
                  <div className="relative flex-shrink-0">
                    <RingProgress value={count} max={stats.total} color={color} size={44} strokeWidth={4} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-cairo font-bold truncate">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm" style={{ color }}>{count}</span>
                        <span className="text-muted-foreground text-[10px]">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-l from-violet-50 to-white dark:from-violet-950/20 dark:to-background border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-cairo flex items-center gap-2">
                <Building className="w-4 h-4 text-violet-600" />
                {isAr ? 'توزيع الموظفين حسب الإدارة' : 'Employees by Department'}
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">{stats.totalEmployees} {isAr ? 'موظف' : 'employees'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {Object.entries(stats.byDept || {}).length === 0 ? (
              <div className="text-center py-6">
                <Building className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد بيانات' : 'No data'}</p>
              </div>
            ) : (
              Object.entries(stats.byDept || {}).map(([dept, count]) => {
                const pct = stats.totalEmployees > 0 ? Math.round(count / stats.totalEmployees * 100) : 0;
                const color = DEPT_COLORS[dept] || '#666';
                const DeptIcon = DEPT_ICONS[dept] || Building;
                return (
                  <div key={dept} className="flex items-center gap-3 group">
                    <div className="relative flex-shrink-0">
                      <RingProgress value={count} max={stats.totalEmployees} color={color} size={44} strokeWidth={4} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <DeptIcon className="w-4 h-4" style={{ color }} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-cairo font-bold truncate">{DEPT_LABELS[dept] || dept}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm" style={{ color }}>{count}</span>
                          <span className="text-muted-foreground text-[10px]">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-l from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-cairo flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              {isAr ? 'آخر المستخدمين المضافين' : 'Recently Added Users'}
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              <Clock className="w-3 h-3 ml-1" />{isAr ? 'الأحدث' : 'Latest'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {[...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6).map((user, i) => {
              const Icon = ROLE_ICONS[user.role] || Users;
              const color = ROLE_COLORS[user.role] || '#666';
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-cairo font-bold text-white" style={{ background: color }}>
                    {user.name?.charAt(0) || '؟'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{user.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}15`, color }}>{ROLE_LABELS[language][user.role] || user.role}</span>
                      {user.department && <span className="text-[10px] text-muted-foreground">{DEPT_LABELS[user.department] || user.department}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={user.account_status === 'frozen' ? 'destructive' : user.account_status === 'pending' ? 'secondary' : 'outline'} className="text-[9px]">
                      {user.account_status === 'frozen' ? (isAr ? 'مجمّد' : 'Frozen') : user.account_status === 'pending' ? (isAr ? 'معلّق' : 'Pending') : (isAr ? 'نشط' : 'Active')}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">{formatTimeAgo(user.created_at, isAr)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
