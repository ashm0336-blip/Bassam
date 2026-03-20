import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Users, Activity, Shield, Briefcase, Lock, Calendar,
  CheckCircle2, UserX, AlertTriangle, ShieldAlert, Eye,
  KeyRound, Clock, Unlock, UserCheck, ShieldCheck, Ban,
  ArrowUpDown, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
const ROLE_ICONS = { system_admin: Shield, general_manager: Briefcase, department_manager: Briefcase, shift_supervisor: UserCheck, field_staff: UserCheck, admin_staff: Briefcase };
const DEPT_LABELS = { gates: 'الأبواب', plazas: 'الساحات', planning: 'التخطيط', crowd_services: 'الحشود', mataf: 'المطاف', haram_map: 'المصليات' };
const DEPT_COLORS = { gates: '#1d4ed8', plazas: '#0d9488', planning: '#7c3aed', crowd_services: '#d97706', mataf: '#dc2626', haram_map: '#059669' };

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} د`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `منذ ${diffH} س`;
  const diffD = Math.floor(diffH / 24);
  return `منذ ${diffD} يوم`;
}

function formatDateTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleString('ar-SA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AdminDashboard() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, frozen: 0, byRole: {}, byDept: {} });
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
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-center">
        <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    </div>
  );

  const sec = securityData || {};

  return (
    <div className="space-y-5" data-testid="admin-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-cairo font-bold text-xl">{isAr ? 'لوحة تحكم مسؤول النظام' : 'System Admin Dashboard'}</h2>
          <p className="text-sm text-muted-foreground mt-1">{isAr ? 'نظرة عامة على المستخدمين والمراقبة الأمنية' : 'Users overview & security monitoring'}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setLoading(true); fetchData(); }} data-testid="refresh-dashboard">
          <RefreshCw className="w-3.5 h-3.5" />
          {isAr ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {/* KPI Cards - System Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: isAr ? 'إجمالي المستخدمين' : 'Total Users', value: stats.total, icon: Users, color: '#2563eb' },
          { label: isAr ? 'حسابات نشطة' : 'Active', value: stats.active, icon: CheckCircle2, color: '#22c55e' },
          { label: isAr ? 'حسابات مجمّدة' : 'Frozen', value: stats.frozen, icon: Lock, color: stats.frozen > 0 ? '#ef4444' : '#6b7280' },
          { label: isAr ? 'إجمالي الموظفين' : 'Total Employees', value: stats.totalEmployees, icon: Briefcase, color: '#7c3aed' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i} className="border-0 shadow-md" data-testid={`kpi-card-${i}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}15`, color: kpi.color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Security Monitoring Section */}
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
          {/* Security KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border rtl:divide-x-reverse">
            {[
              { label: isAr ? 'محاولات دخول فاشلة اليوم' : 'Failed Logins Today', value: sec.failed_logins_today || 0, icon: KeyRound, color: sec.failed_logins_today > 0 ? '#ef4444' : '#22c55e', bgColor: sec.failed_logins_today > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-green-50 dark:bg-green-950/20' },
              { label: isAr ? 'حسابات مجمّدة' : 'Frozen Accounts', value: sec.frozen_count || 0, icon: Lock, color: sec.frozen_count > 0 ? '#f59e0b' : '#22c55e', bgColor: sec.frozen_count > 0 ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-green-50 dark:bg-green-950/20' },
              { label: isAr ? 'تغييرات الصلاحيات (24 س)' : 'Perm Changes (24h)', value: sec.perm_changes_24h || 0, icon: ShieldCheck, color: '#3b82f6', bgColor: 'bg-blue-50 dark:bg-blue-950/20' },
              { label: isAr ? 'حسابات معلّقة' : 'Pending Accounts', value: sec.pending_count || 0, icon: Clock, color: sec.pending_count > 0 ? '#f59e0b' : '#6b7280', bgColor: sec.pending_count > 0 ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-slate-50 dark:bg-slate-950/20' },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className={`p-4 ${kpi.bgColor}`} data-testid={`sec-kpi-${i}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                    <span className="text-[10px] text-muted-foreground font-medium">{kpi.label}</span>
                  </div>
                  <p className="text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</p>
                </div>
              );
            })}
          </div>

          {/* Security Detail Tabs */}
          <div className="p-4 pt-3">
            <Tabs value={securityTab} onValueChange={setSecurityTab} dir="rtl">
              <TabsList className="grid w-full grid-cols-4 h-9">
                <TabsTrigger value="frozen" className="text-[10px] gap-1 data-[state=active]:bg-amber-600 data-[state=active]:text-white" data-testid="sec-tab-frozen">
                  <Lock className="w-3 h-3" />
                  {isAr ? 'مجمّدة' : 'Frozen'}
                  {(sec.frozen_count || 0) > 0 && <Badge variant="destructive" className="text-[8px] px-1 py-0 h-4 mr-1">{sec.frozen_count}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="failed" className="text-[10px] gap-1 data-[state=active]:bg-red-600 data-[state=active]:text-white" data-testid="sec-tab-failed">
                  <KeyRound className="w-3 h-3" />
                  {isAr ? 'دخول فاشل' : 'Failed'}
                </TabsTrigger>
                <TabsTrigger value="permissions" className="text-[10px] gap-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white" data-testid="sec-tab-perms">
                  <ShieldCheck className="w-3 h-3" />
                  {isAr ? 'صلاحيات' : 'Perms'}
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-[10px] gap-1 data-[state=active]:bg-yellow-600 data-[state=active]:text-white" data-testid="sec-tab-pending">
                  <Clock className="w-3 h-3" />
                  {isAr ? 'معلّقة' : 'Pending'}
                </TabsTrigger>
              </TabsList>

              {/* Frozen Accounts Tab */}
              <TabsContent value="frozen" className="mt-3">
                <ScrollArea className="h-[200px]">
                  {(sec.frozen_users || []).length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد حسابات مجمّدة' : 'No frozen accounts'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(sec.frozen_users || []).map((u, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800" data-testid={`frozen-user-${i}`}>
                          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {u.email || u.national_id} {u.department ? `— ${DEPT_LABELS[u.department] || u.department}` : ''}
                            </p>
                            <p className="text-[10px] text-red-500">{u.failed_attempts || 0} {isAr ? 'محاولة فاشلة' : 'failed attempts'}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-[10px] h-7 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
                            onClick={() => handleUnfreeze(u.id, u.name)}
                            disabled={unfreezing === u.id}
                            data-testid={`unfreeze-btn-${i}`}
                          >
                            {unfreezing === u.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
                            {isAr ? 'فك التجميد' : 'Unfreeze'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Failed Login Attempts Tab */}
              <TabsContent value="failed" className="mt-3">
                <ScrollArea className="h-[200px]">
                  {(sec.failed_login_logs || []).length === 0 ? (
                    <div className="text-center py-8">
                      <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد محاولات فاشلة هذا الأسبوع' : 'No failed attempts this week'}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {(sec.failed_login_logs || []).map((log, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-red-100 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900" data-testid={`failed-log-${i}`}>
                          <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                            <KeyRound className="w-3.5 h-3.5 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{log.user_name || log.target || '—'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{log.details}</p>
                          </div>
                          <span className="text-[9px] text-muted-foreground whitespace-nowrap">{formatTimeAgo(log.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Permission Changes Tab */}
              <TabsContent value="permissions" className="mt-3">
                <ScrollArea className="h-[200px]">
                  {(sec.permission_change_logs || []).length === 0 ? (
                    <div className="text-center py-8">
                      <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد تغييرات في الصلاحيات آخر 24 ساعة' : 'No permission changes in 24h'}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {(sec.permission_change_logs || []).map((log, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-blue-100 bg-blue-50/30 dark:bg-blue-950/10 dark:border-blue-900" data-testid={`perm-log-${i}`}>
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {log.user_name}: <span className="text-muted-foreground font-normal">{
                                { 'تغيير مجموعة صلاحيات': 'غيّر مجموعة صلاحيات', 'تخصيص صلاحيات فردية': 'خصّص صلاحيات فردية', 'نسخ صلاحيات': 'نسخ صلاحيات', 'role_changed': 'غيّر الدور' }[log.action] || log.action
                              }</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">{log.details}</p>
                          </div>
                          <span className="text-[9px] text-muted-foreground whitespace-nowrap">{formatTimeAgo(log.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Pending Accounts Tab */}
              <TabsContent value="pending" className="mt-3">
                <ScrollArea className="h-[200px]">
                  {(sec.pending_users || []).length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد حسابات معلّقة' : 'No pending accounts'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(sec.pending_users || []).map((u, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10 dark:border-yellow-800" data-testid={`pending-user-${i}`}>
                          <div className="w-9 h-9 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-yellow-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {u.national_id || u.email} {u.department ? `— ${DEPT_LABELS[u.department] || u.department}` : ''}
                            </p>
                            <p className="text-[10px] text-yellow-600">{isAr ? 'بانتظار التفعيل' : 'Awaiting activation'} — {formatTimeAgo(u.created_at)}</p>
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

      {/* Two columns: Roles + Departments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Role Distribution */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-cairo">{isAr ? 'توزيع المستخدمين حسب الدور' : 'Users by Role'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(ROLE_LABELS[language]).map(([key, label]) => {
              const count = stats.byRole[key] || 0;
              const pct = stats.total > 0 ? Math.round(count / stats.total * 100) : 0;
              const Icon = ROLE_ICONS[key] || Users;
              const color = ROLE_COLORS[key] || '#666';
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold">{count}</span>
                      <span className="font-medium">{label}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-cairo">{isAr ? 'توزيع الموظفين حسب الإدارة' : 'Employees by Department'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.byDept || {}).map(([dept, count]) => {
              const pct = stats.totalEmployees > 0 ? Math.round(count / stats.totalEmployees * 100) : 0;
              const color = DEPT_COLORS[dept] || '#666';
              return (
                <div key={dept} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, color }}>
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold">{count}</span>
                      <span className="font-medium">{DEPT_LABELS[dept] || dept}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent Users */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-cairo">{isAr ? 'آخر المستخدمين المضافين' : 'Recently Added Users'}</CardTitle>
            <Badge variant="outline" className="text-[9px]"><Clock className="w-3 h-3 ml-1" />{isAr ? 'الأحدث' : 'Latest'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6).map((user, i) => {
              const Icon = ROLE_ICONS[user.role] || Users;
              const color = ROLE_COLORS[user.role] || '#666';
              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ background: color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[language][user.role] || user.role}</p>
                  </div>
                  <div className="text-left">
                    <Badge variant={user.account_status === 'frozen' ? 'destructive' : user.account_status === 'pending' ? 'secondary' : 'outline'} className="text-[9px]">
                      {user.account_status === 'frozen' ? (isAr ? 'مجمّد' : 'Frozen') : user.account_status === 'pending' ? (isAr ? 'معلّق' : 'Pending') : (isAr ? 'نشط' : 'Active')}
                    </Badge>
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
