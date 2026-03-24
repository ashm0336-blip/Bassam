import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useRealtimeRefresh } from "@/context/WebSocketContext";
import {
  Users,
  DoorOpen,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  Building2,
  TrendingUp,
  Activity,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Shield,
  Upload,
  Settings,
  BarChart3,
  Lock,
  Unlock,
  Key,
  Calendar,
  Eye,
  Clipboard,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ACTION_CONFIG = {
  login:                          { icon: LogIn,          color: "#6366f1", label: { ar: "تسجيل دخول",           en: "Login" } },
  logout:                         { icon: LogOut,         color: "#6b7280", label: { ar: "تسجيل خروج",           en: "Logout" } },
  employee_created:               { icon: UserPlus,       color: "#22c55e", label: { ar: "إضافة موظف",            en: "Employee Created" } },
  employee_updated:               { icon: Edit,           color: "#3b82f6", label: { ar: "تعديل موظف",            en: "Employee Updated" } },
  employee_deleted:               { icon: UserMinus,      color: "#ef4444", label: { ar: "حذف موظف",             en: "Employee Deleted" } },
  account_activated:              { icon: CheckCircle,    color: "#22c55e", label: { ar: "تفعيل حساب",            en: "Account Activated" } },
  account_frozen:                 { icon: Lock,           color: "#f59e0b", label: { ar: "تجميد حساب",            en: "Account Frozen" } },
  account_terminated:             { icon: UserMinus,      color: "#ef4444", label: { ar: "إنهاء خدمة",           en: "Account Terminated" } },
  reset_pin:                      { icon: Key,            color: "#8b5cf6", label: { ar: "إعادة تعيين رمز",       en: "PIN Reset" } },
  change_pin:                     { icon: Key,            color: "#8b5cf6", label: { ar: "تغيير رمز الدخول",      en: "PIN Changed" } },
  schedule_created:               { icon: Calendar,       color: "#0ea5e9", label: { ar: "إنشاء جدول",            en: "Schedule Created" } },
  schedule_status:                { icon: CheckCircle,    color: "#0ea5e9", label: { ar: "حالة جدول",             en: "Schedule Status" } },
  schedule_unlocked:              { icon: Unlock,         color: "#f59e0b", label: { ar: "فتح جدول",              en: "Schedule Unlocked" } },
  schedule_deleted:               { icon: Trash2,         color: "#ef4444", label: { ar: "حذف جدول",              en: "Schedule Deleted" } },
  setting_created:                { icon: Settings,       color: "#7c3aed", label: { ar: "إضافة إعداد",           en: "Setting Created" } },
  setting_updated:                { icon: Settings,       color: "#3b82f6", label: { ar: "تحديث إعداد",           en: "Setting Updated" } },
  setting_deleted:                { icon: Settings,       color: "#ef4444", label: { ar: "حذف إعداد",             en: "Setting Deleted" } },
  task_created:                   { icon: Clipboard,      color: "#0ea5e9", label: { ar: "إنشاء مهمة",            en: "Task Created" } },
  "استيراد موظفين":               { icon: Upload,         color: "#0ea5e9", label: { ar: "استيراد موظفين",         en: "Employee Import" } },
  "إضافة خيار قائمة":             { icon: Settings,       color: "#7c3aed", label: { ar: "إضافة خيار قائمة",      en: "Dropdown Added" } },
  "تعديل خيار قائمة":             { icon: Edit,           color: "#3b82f6", label: { ar: "تعديل خيار قائمة",      en: "Dropdown Updated" } },
  "حذف خيار قائمة":               { icon: Trash2,         color: "#ef4444", label: { ar: "حذف خيار قائمة",       en: "Dropdown Deleted" } },
  "تهيئة القوائم":                { icon: Settings,       color: "#7c3aed", label: { ar: "تهيئة القوائم",         en: "Dropdowns Init" } },
  "تحديث إعدادات شاشة الدخول":    { icon: Settings,       color: "#3b82f6", label: { ar: "تحديث شاشة الدخول",     en: "Login Settings" } },
  "تحديث إعدادات Header":         { icon: Settings,       color: "#3b82f6", label: { ar: "تحديث Header",         en: "Header Settings" } },
  "تحديث إعدادات الجوال":          { icon: Settings,       color: "#3b82f6", label: { ar: "تحديث إعدادات الجوال",  en: "PWA Settings" } },
  "إضافة قسم للقائمة":            { icon: Settings,       color: "#22c55e", label: { ar: "إضافة قسم للقائمة",     en: "Menu Item Added" } },
  "تعديل قسم في القائمة":          { icon: Edit,           color: "#3b82f6", label: { ar: "تعديل قسم في القائمة",  en: "Menu Item Updated" } },
  "حذف قسم من القائمة":            { icon: Trash2,         color: "#ef4444", label: { ar: "حذف قسم من القائمة",   en: "Menu Item Deleted" } },
  "تهيئة القائمة الجانبية":        { icon: Settings,       color: "#7c3aed", label: { ar: "تهيئة القائمة الجانبية", en: "Sidebar Init" } },
  "إضافة فئة منطقة":              { icon: Building2,      color: "#22c55e", label: { ar: "إضافة فئة منطقة",      en: "Zone Category Added" } },
  "حذف فئة منطقة":                { icon: Trash2,         color: "#ef4444", label: { ar: "حذف فئة منطقة",       en: "Zone Category Deleted" } },
  "تغيير الموسم":                 { icon: Calendar,       color: "#f59e0b", label: { ar: "تغيير الموسم",          en: "Season Changed" } },
  "إضافة عنصر ممنوع":             { icon: AlertTriangle,  color: "#ef4444", label: { ar: "إضافة عنصر ممنوع",     en: "Prohibited Item Added" } },
  "حذف عنصر ممنوع":               { icon: Trash2,         color: "#ef4444", label: { ar: "حذف عنصر ممنوع",      en: "Prohibited Item Deleted" } },
  "تعديل عنصر ممنوع":             { icon: Edit,           color: "#f59e0b", label: { ar: "تعديل عنصر ممنوع",     en: "Prohibited Item Updated" } },
  "إنشاء مجموعة صلاحيات":         { icon: Shield,         color: "#22c55e", label: { ar: "إنشاء مجموعة صلاحيات", en: "Permission Group Created" } },
  "تحديث مجموعة صلاحيات":         { icon: Shield,         color: "#3b82f6", label: { ar: "تحديث مجموعة صلاحيات", en: "Permission Group Updated" } },
  "حذف مجموعة صلاحيات":           { icon: Shield,         color: "#ef4444", label: { ar: "حذف مجموعة صلاحيات",  en: "Permission Group Deleted" } },
  "تغيير مجموعة صلاحيات":         { icon: Users,          color: "#8b5cf6", label: { ar: "تغيير مجموعة صلاحيات", en: "Permission Group Changed" } },
  "إنشاء بلاغ":                   { icon: AlertTriangle,  color: "#f59e0b", label: { ar: "إنشاء بلاغ",           en: "Report Created" } },
  "تحديث بلاغ":                   { icon: Edit,           color: "#3b82f6", label: { ar: "تحديث بلاغ",           en: "Report Updated" } },
  "إنشاء إحصائية يومية":          { icon: BarChart3,      color: "#22c55e", label: { ar: "إنشاء إحصائية يومية",  en: "Daily Stats Created" } },
  "استيراد إحصائيات يومية":        { icon: Upload,         color: "#0ea5e9", label: { ar: "استيراد إحصائيات",     en: "Stats Imported" } },
  "حذف إحصائية يومية":            { icon: Trash2,         color: "#ef4444", label: { ar: "حذف إحصائية يومية",   en: "Daily Stats Deleted" } },
};

const DEFAULT_CONFIG = { icon: Activity, color: "#6b7280", label: { ar: "عملية أخرى", en: "Other Action" } };

function getConfig(action) {
  return ACTION_CONFIG[action] || DEFAULT_CONFIG;
}

function formatTimeAgo(timestamp, isAr) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return isAr ? "الآن" : "Just now";
  if (diffMins < 60) return isAr ? `منذ ${diffMins} د` : `${diffMins}m ago`;
  if (diffHours < 24) return isAr ? `منذ ${diffHours} س` : `${diffHours}h ago`;
  if (diffDays < 7) return isAr ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  return then.toLocaleDateString(isAr ? "ar-SA" : "en-US", { month: "short", day: "numeric" });
}

const ACTIVITY_PAGE_SIZE = 10;

export default function ManagerDashboard() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [stats, setStats] = useState({
    gates: { total: 0, open: 0, closed: 0 },
    employees: { total: 0, active: 0, inactive: 0, byDepartment: {} },
    transactions: { total: 0, pending: 0, inProgress: 0, completed: 0 },
    alerts: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [activityPage, setActivityPage] = useState(1);
  const [activityFilter, setActivityFilter] = useState("all");

  useEffect(() => {
    fetchAllStats();
  }, []);

  useRealtimeRefresh(["employees", "gate_sessions", "tasks", "dashboard"], fetchAllStats);

  const fetchAllStats = async () => {
    try {
      const token = localStorage.getItem("token");

      const [gatesRes, employeesRes, tasksRes, activityRes] = await Promise.all([
        axios.get(`${API}/gates`),
        axios.get(`${API}/employees`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/tasks/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/manager/activity-logs`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 100 }
        })
      ]);

      const gates = gatesRes.data;
      const employees = employeesRes.data;

      const openGates = gates.filter(g => g.status === "مفتوح");
      const gatesWithoutStaff = openGates.filter(gate => {
        const staffAtGate = employees.filter(emp => emp.location === gate.name && emp.is_active);
        return staffAtGate.length === 0;
      });

      const activeEmployees = employees.filter(e => e.is_active);
      const byDepartment = employees.reduce((acc, emp) => {
        const dept = emp.department || "غير محدد";
        if (!acc[dept]) acc[dept] = { total: 0, active: 0 };
        acc[dept].total++;
        if (emp.is_active) acc[dept].active++;
        return acc;
      }, {});

      const tasksData = tasksRes.data;
      setStats({
        gates: {
          total: gates.length,
          open: openGates.length,
          closed: gates.length - openGates.length,
          withoutStaff: gatesWithoutStaff.length
        },
        employees: {
          total: employees.length,
          active: activeEmployees.length,
          inactive: employees.length - activeEmployees.length,
          byDepartment
        },
        transactions: {
          total: tasksData.total || 0,
          pending: tasksData.pending || 0,
          in_progress: tasksData.in_progress || 0,
          completed: tasksData.done || 0,
          overdue: tasksData.overdue || 0,
        },
        alerts: gatesWithoutStaff.map(g => ({
          type: "warning",
          message: `${g.name} - باب مفتوح بدون موظفين`
        })),
        recentActivity: activityRes.data
      });

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivity = useMemo(() => {
    if (activityFilter === "all") return stats.recentActivity;
    return stats.recentActivity.filter(a => a.action === activityFilter);
  }, [stats.recentActivity, activityFilter]);

  const activityTotalPages = Math.ceil(filteredActivity.length / ACTIVITY_PAGE_SIZE);
  const paginatedActivity = filteredActivity.slice(
    (activityPage - 1) * ACTIVITY_PAGE_SIZE,
    activityPage * ACTIVITY_PAGE_SIZE
  );

  const activityActionCounts = useMemo(() => {
    const counts = {};
    stats.recentActivity.forEach(a => {
      counts[a.action] = (counts[a.action] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [stats.recentActivity]);

  const todayActivityCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return stats.recentActivity.filter(a => new Date(a.timestamp).toDateString() === todayStr).length;
  }, [stats.recentActivity]);

  const departments = ["gates", "plazas", "mataf", "planning", "crowd_services"];
  const deptNames = {
    gates: "إدارة الأبواب",
    plazas: "إدارة الساحات",
    mataf: "صحن المطاف",
    planning: "التخطيط",
    crowd_services: "خدمات الحشود"
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" data-testid="manager-dashboard">
        <div className="h-10 rounded-xl bg-muted w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-6 h-28" /></Card>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="manager-dashboard">
      <div className={isAr ? "text-right" : "text-left"}>
        <h1 className="font-cairo font-bold text-3xl">
          {isAr ? "لوحة تحكم المدير العام" : "General Manager Dashboard"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isAr ? "نظرة شاملة على جميع الإدارات والعمليات" : "Comprehensive overview of all departments"}
        </p>
      </div>

      {stats.alerts.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className={`font-cairo text-base ${isAr ? "text-right" : "text-left"} flex items-center gap-2 ${isAr ? "justify-end" : "justify-start"} text-destructive`}>
              <AlertTriangle className="w-5 h-5" />
              {isAr ? "تنبيهات عاجلة" : "Critical Alerts"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.alerts.map((alert, idx) => (
                <div key={idx} className={`p-3 bg-white dark:bg-card rounded-lg border border-destructive/20 ${isAr ? "text-right" : "text-left"}`}>
                  <p className="text-sm font-medium text-destructive">{alert.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className={isAr ? "text-right" : "text-left"}>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {isAr ? "الأبواب" : "Gates"}
                </p>
                <p className="text-3xl font-cairo font-bold text-blue-900 dark:text-blue-100">
                  {stats.gates.open}/{stats.gates.total}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {stats.gates.open} {isAr ? "مفتوح" : "open"}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                <DoorOpen className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className={isAr ? "text-right" : "text-left"}>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {isAr ? "الموظفين النشطين" : "Active Staff"}
                </p>
                <p className="text-3xl font-cairo font-bold text-green-900 dark:text-green-100">
                  {stats.employees.active}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {isAr ? `من ${stats.employees.total} إجمالي` : `of ${stats.employees.total} total`}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className={isAr ? "text-right" : "text-left"}>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {isAr ? "المعاملات قيد التنفيذ" : "Active Transactions"}
                </p>
                <p className="text-3xl font-cairo font-bold text-orange-900 dark:text-orange-100">
                  {stats.transactions.in_progress + stats.transactions.pending}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {stats.transactions.pending} {isAr ? "قيد الانتظار" : "pending"}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className={isAr ? "text-right" : "text-left"}>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {isAr ? "التنبيهات" : "Alerts"}
                </p>
                <p className="text-3xl font-cairo font-bold text-red-900 dark:text-red-100">
                  {stats.alerts.length}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {isAr ? "تحتاج انتباه" : "need attention"}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className={`font-cairo text-base ${isAr ? "text-right" : "text-left"} flex items-center gap-2 ${isAr ? "justify-end" : "justify-start"}`}>
              <Building2 className="w-5 h-5" />
              {isAr ? "حالة الإدارات" : "Departments Status"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {departments.map(dept => {
              const deptStats = stats.employees.byDepartment[dept] || { total: 0, active: 0 };
              const percentage = deptStats.total > 0 ? (deptStats.active / deptStats.total) * 100 : 0;

              return (
                <div key={dept}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`${isAr ? "text-right" : "text-left"} flex-1`}>
                      <p className="font-medium text-sm">{deptNames[dept]}</p>
                      <p className="text-xs text-muted-foreground">
                        {deptStats.active} {isAr ? "نشط من" : "active of"} {deptStats.total}
                      </p>
                    </div>
                    <Badge variant={deptStats.active > 0 ? "default" : "secondary"}>
                      {Math.round(percentage)}%
                    </Badge>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={`font-cairo text-base ${isAr ? "text-right" : "text-left"} flex items-center gap-2 ${isAr ? "justify-end" : "justify-start"}`}>
              <FileText className="w-5 h-5" />
              {isAr ? "حالة المعاملات" : "Transactions Status"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className={`${isAr ? "text-right" : "text-left"} flex-1`}>
                  <p className="text-sm font-medium">{isAr ? "قيد الانتظار" : "Pending"}</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.transactions.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className={`${isAr ? "text-right" : "text-left"} flex-1`}>
                  <p className="text-sm font-medium">{isAr ? "تحت الإجراء" : "In Progress"}</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.transactions.in_progress}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className={`${isAr ? "text-right" : "text-left"} flex-1`}>
                  <p className="text-sm font-medium">{isAr ? "مكتملة" : "Completed"}</p>
                  <p className="text-2xl font-bold text-green-700">{stats.transactions.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <h3 className="font-cairo font-bold text-sm">
                  {isAr ? "سجل العمليات والتعديلات" : "Operations & Changes Log"}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {isAr
                    ? `${stats.recentActivity.length} عملية مسجلة — ${todayActivityCount} اليوم`
                    : `${stats.recentActivity.length} logged — ${todayActivityCount} today`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => { setActivityFilter("all"); setActivityPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  activityFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {isAr ? "الكل" : "All"} ({stats.recentActivity.length})
              </button>
              {activityActionCounts.map(([action, count]) => {
                const config = getConfig(action);
                const isActive = activityFilter === action;
                return (
                  <button
                    key={action}
                    onClick={() => { setActivityFilter(isActive ? "all" : action); setActivityPage(1); }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all inline-flex items-center gap-1 ${
                      isActive
                        ? "text-white shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                    style={isActive ? { backgroundColor: config.color } : undefined}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: isActive ? "#fff" : config.color }} />
                    {config.label[language]}
                    <span className={`text-[9px] px-1 py-px rounded ${isActive ? "bg-white/20" : "bg-background"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="divide-y">
          {paginatedActivity.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">
                {isAr ? "لا توجد عمليات مسجلة" : "No activities recorded"}
              </p>
            </div>
          ) : (
            paginatedActivity.map((log, idx) => {
              const config = getConfig(log.action);
              const Icon = config.icon;
              return (
                <div
                  key={log.id || idx}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${config.color}12` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-white"
                        style={{ backgroundColor: config.color }}
                      >
                        {config.label[language]}
                      </span>
                      {log.department && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                          <Building2 className="w-3 h-3" />
                          {log.department}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center font-cairo font-bold text-[9px] text-primary flex-shrink-0">
                        {log.user_name?.charAt(0) || "؟"}
                      </div>
                      <span className="text-xs font-semibold truncate">{log.user_name}</span>
                      {log.user_email && (
                        <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">{log.user_email}</span>
                      )}
                    </div>

                    {log.details && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed truncate">{log.details}</p>
                    )}

                    {log.target && (
                      <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-0.5">
                        <Eye className="w-2.5 h-2.5" />
                        {log.target}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0 pt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(log.timestamp, isAr)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {activityTotalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              {isAr
                ? `صفحة ${activityPage} من ${activityTotalPages}`
                : `Page ${activityPage} of ${activityTotalPages}`
              }
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={activityPage === 1} onClick={() => setActivityPage(p => p - 1)}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-semibold px-2">{activityPage}</span>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={activityPage === activityTotalPages} onClick={() => setActivityPage(p => p + 1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}