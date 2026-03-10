import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Users, Activity, TrendingUp, UserPlus, Clock, Shield, Eye, Briefcase,
  UserCheck, AlertTriangle, FileWarning, UserX, Lock, Calendar,
  CheckCircle2, XCircle, RefreshCw, ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_COLORS = {
  system_admin: "#dc2626", general_manager: "#9333ea", department_manager: "#3b82f6",
  shift_supervisor: "#7c3aed", field_staff: "#22c55e", admin_staff: "#0ea5e9", monitoring_team: "#f97316"
};
const ROLE_LABELS = {
  ar: { system_admin: "مسؤول النظام", general_manager: "المدير العام", department_manager: "مدير الإدارة", shift_supervisor: "مشرف الوردية", field_staff: "موظف ميداني", admin_staff: "موظف إداري", monitoring_team: "فريق المراقبة" },
  en: { system_admin: "System Admin", general_manager: "General Manager", department_manager: "Dept Manager", shift_supervisor: "Shift Supervisor", field_staff: "Field Staff", admin_staff: "Admin Staff", monitoring_team: "Monitoring" }
};
const ROLE_ICONS = { system_admin: Shield, general_manager: Briefcase, department_manager: Briefcase, shift_supervisor: UserCheck, field_staff: UserCheck, admin_staff: Briefcase, monitoring_team: Eye };

export default function AdminDashboard() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [smartAlerts, setSmartAlerts] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, frozen: 0, newThisWeek: 0, byRole: {}, byDept: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, employeesRes] = await Promise.all([
        axios.get(`${API}/users`, { headers }),
        axios.get(`${API}/employees`, { headers }),
      ]);

      const usersData = usersRes.data;
      const empsData = employeesRes.data;
      setUsers(usersData);
      setEmployees(empsData);

      // Stats
      const byRole = {}, byDept = {};
      usersData.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1; });
      empsData.forEach(e => { const d = e.department || 'other'; byDept[d] = (byDept[d] || 0) + 1; });

      const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const frozen = usersData.filter(u => u.account_status === 'frozen').length;
      const active = usersData.filter(u => u.account_status === 'active' || !u.account_status).length;

      setStats({
        total: usersData.length, active, frozen,
        newThisWeek: usersData.filter(u => new Date(u.created_at) > oneWeekAgo).length,
        byRole, byDept,
        totalEmployees: empsData.length,
        activeEmployees: empsData.filter(e => e.is_active).length,
      });

      // Smart alerts
      const alerts = [];
      // Frozen accounts
      const frozenUsers = usersData.filter(u => u.account_status === 'frozen');
      if (frozenUsers.length > 0) {
        alerts.push({ type: "warning", icon: Lock, message: isAr ? `${frozenUsers.length} حساب مجمّد بسبب محاولات دخول خاطئة` : `${frozenUsers.length} frozen accounts`, action: isAr ? "مراجعة" : "Review", count: frozenUsers.length });
      }
      // Expiring contracts
      const soon = new Date(); soon.setDate(soon.getDate() + 30);
      const expiring = empsData.filter(e => e.contract_end && new Date(e.contract_end) <= soon && new Date(e.contract_end) > new Date());
      if (expiring.length > 0) {
        alerts.push({ type: "danger", icon: Calendar, message: isAr ? `${expiring.length} موظف تنتهي عقودهم خلال 30 يوماً` : `${expiring.length} contracts expiring in 30 days`, count: expiring.length });
      }
      // Users without department
      const noDept = usersData.filter(u => !u.department && u.role !== 'system_admin' && u.role !== 'general_manager');
      if (noDept.length > 0) {
        alerts.push({ type: "info", icon: UserX, message: isAr ? `${noDept.length} مستخدم بدون إدارة محددة` : `${noDept.length} users without department`, count: noDept.length });
      }
      // Inactive employees
      const inactive = empsData.filter(e => !e.is_active);
      if (inactive.length > 0) {
        alerts.push({ type: "info", icon: UserX, message: isAr ? `${inactive.length} موظف غير نشط في النظام` : `${inactive.length} inactive employees`, count: inactive.length });
      }
      setSmartAlerts(alerts);

    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-center">
        <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    </div>
  );

  const DEPT_LABELS = { gates: 'الأبواب', plazas: 'الساحات', planning: 'التخطيط', crowd_services: 'الحشود', mataf: 'المطاف', haram_map: 'المصليات' };
  const DEPT_COLORS = { gates: '#1d4ed8', plazas: '#0d9488', planning: '#7c3aed', crowd_services: '#d97706', mataf: '#dc2626', haram_map: '#059669' };

  return (
    <div className="space-y-5" data-testid="admin-dashboard">
      <div>
        <h2 className="font-cairo font-bold text-xl">{isAr ? 'لوحة تحكم مسؤول النظام' : 'System Admin Dashboard'}</h2>
        <p className="text-sm text-muted-foreground mt-1">{isAr ? 'نظرة عامة على المستخدمين والموظفين والنظام' : 'Users, employees & system overview'}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: isAr ? 'إجمالي المستخدمين' : 'Total Users', value: stats.total, icon: Users, color: '#2563eb' },
          { label: isAr ? 'حسابات نشطة' : 'Active', value: stats.active, icon: CheckCircle2, color: '#22c55e' },
          { label: isAr ? 'حسابات مجمّدة' : 'Frozen', value: stats.frozen, icon: Lock, color: stats.frozen > 0 ? '#ef4444' : '#6b7280' },
          { label: isAr ? 'إجمالي الموظفين' : 'Total Employees', value: stats.totalEmployees, icon: Briefcase, color: '#7c3aed' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i} className="border-0 shadow-md">
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

      {/* Smart Alerts / Recommendations */}
      {smartAlerts.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-cairo flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {isAr ? 'توصيات وتنبيهات ذكية' : 'Smart Recommendations'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {smartAlerts.map((alert, i) => {
              const Icon = alert.icon;
              const colors = { danger: 'border-red-200 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400', warning: 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400', info: 'border-blue-200 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400' };
              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${colors[alert.type]}`}>
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium flex-1">{alert.message}</p>
                  <Badge variant="outline" className="text-[10px]">{alert.count}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

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
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
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
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
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
                    <Badge variant={user.account_status === 'frozen' ? 'destructive' : 'outline'} className="text-[9px]">
                      {user.account_status === 'frozen' ? (isAr ? 'مجمّد' : 'Frozen') : (isAr ? 'نشط' : 'Active')}
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
