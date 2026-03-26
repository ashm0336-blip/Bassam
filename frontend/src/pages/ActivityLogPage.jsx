import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeRefresh, useWsConnected } from "@/context/WebSocketContext";
import {
  Activity, UserPlus, UserMinus, Edit, Trash2, LogIn, LogOut,
  Filter, Calendar, Search, Clock, TrendingUp,
  ChevronLeft, ChevronRight, X, Shield, Upload,
  Settings, FileText, BarChart3, AlertTriangle,
  CheckCircle, Lock, Unlock, Key, Users,
  Building2, Eye, LayoutList, LayoutGrid,
  Clipboard, Radio
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

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

const CATEGORY_GROUPS = {
  auth:     { label: { ar: "الدخول والخروج",  en: "Auth" },        color: "#6366f1", actions: ["login", "logout"] },
  employee: { label: { ar: "إدارة الموظفين",   en: "Employees" },   color: "#22c55e", actions: ["employee_created", "employee_updated", "employee_deleted", "account_activated", "account_frozen", "account_terminated", "reset_pin", "change_pin", "استيراد موظفين"] },
  schedule: { label: { ar: "الجداول",          en: "Schedules" },   color: "#0ea5e9", actions: ["schedule_created", "schedule_status", "schedule_unlocked", "schedule_deleted"] },
  settings: { label: { ar: "الإعدادات",        en: "Settings" },    color: "#7c3aed", actions: ["setting_created", "setting_updated", "setting_deleted", "إضافة خيار قائمة", "تعديل خيار قائمة", "حذف خيار قائمة", "تهيئة القوائم", "تحديث إعدادات شاشة الدخول", "تحديث إعدادات Header", "تحديث إعدادات الجوال", "إضافة قسم للقائمة", "تعديل قسم في القائمة", "حذف قسم من القائمة", "تهيئة القائمة الجانبية", "تغيير الموسم"] },
  security: { label: { ar: "الأمان والصلاحيات", en: "Security" },   color: "#f59e0b", actions: ["إنشاء مجموعة صلاحيات", "تحديث مجموعة صلاحيات", "حذف مجموعة صلاحيات", "تغيير مجموعة صلاحيات"] },
  reports:  { label: { ar: "البلاغات",          en: "Reports" },     color: "#ef4444", actions: ["إنشاء بلاغ", "تحديث بلاغ", "إنشاء إحصائية يومية", "استيراد إحصائيات يومية", "حذف إحصائية يومية"] },
  other:    { label: { ar: "أخرى",             en: "Other" },       color: "#6b7280", actions: ["task_created", "إضافة فئة منطقة", "حذف فئة منطقة", "إضافة عنصر ممنوع", "حذف عنصر ممنوع", "تعديل عنصر ممنوع"] },
};

const DEFAULT_CONFIG = { icon: Activity, color: "#6b7280", label: { ar: "عملية أخرى", en: "Other Action" } };
const PAGE_SIZE = 20;

function getConfig(action) {
  return ACTION_CONFIG[action] || DEFAULT_CONFIG;
}

function getCategoryForAction(action) {
  for (const [catKey, cat] of Object.entries(CATEGORY_GROUPS)) {
    if (cat.actions.includes(action)) return catKey;
  }
  return "other";
}

function getActionTypeColor(action) {
  const cat = getCategoryForAction(action);
  return CATEGORY_GROUPS[cat]?.color || "#6b7280";
}

function formatTimeAgo(timestamp, isAr) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return isAr ? "الآن" : "Just now";
  if (diffMins < 60) return isAr ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
  if (diffHours < 24) return isAr ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
  if (diffDays < 7) return isAr ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  return then.toLocaleDateString(isAr ? "ar-SA" : "en-US", { month: "short", day: "numeric" });
}

function groupByDate(logs, isAr) {
  const groups = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  logs.forEach(log => {
    const d = new Date(log.timestamp).toDateString();
    let label;
    if (d === today) label = isAr ? "اليوم" : "Today";
    else if (d === yesterday) label = isAr ? "أمس" : "Yesterday";
    else label = new Date(log.timestamp).toLocaleDateString(isAr ? "ar-SA" : "en-US", { weekday: "long", month: "long", day: "numeric" });

    if (!groups[label]) groups[label] = [];
    groups[label].push(log);
  });
  return groups;
}

export default function ActivityLogPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === "ar";
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterUser, setFilterUser] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("timeline");

  const isAdminOrGM = user?.role === "system_admin" || user?.role === "general_manager";
  const wsConnected = useWsConnected();

  const fetchLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const endpoint = isAdminOrGM ? `${API}/admin/activity-logs` : `${API}/manager/activity-logs`;
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 500 }
      });
      setLogs(response.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [isAdminOrGM]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useRealtimeRefresh(["activity_logs", "employees", "settings", "permissions", "schedules", "alerts", "tasks"], fetchLogs);

  const computedFiltered = useMemo(() => {
    let filtered = [...logs];
    if (filterAction !== "all") {
      filtered = filtered.filter(log => log.action === filterAction);
    }
    if (filterCategory !== "all") {
      const catActions = CATEGORY_GROUPS[filterCategory]?.actions || [];
      filtered = filtered.filter(log => catActions.includes(log.action));
    }
    if (filterUser) {
      const q = filterUser.toLowerCase();
      filtered = filtered.filter(log =>
        (log.user_name || "").toLowerCase().includes(q) ||
        (log.user_email || "").toLowerCase().includes(q)
      );
    }
    if (filterDate) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split("T")[0];
        return logDate === filterDate;
      });
    }
    return filtered;
  }, [logs, filterAction, filterCategory, filterUser, filterDate]);

  useEffect(() => { setCurrentPage(1); }, [computedFiltered]);

  const clearFilters = () => {
    setFilterAction("all");
    setFilterCategory("all");
    setFilterUser("");
    setFilterDate("");
  };
  const hasFilters = filterAction !== "all" || filterCategory !== "all" || filterUser || filterDate;

  const totalPages = Math.ceil(computedFiltered.length / PAGE_SIZE);
  const paginatedLogs = computedFiltered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const dateGroups = groupByDate(paginatedLogs, isAr);

  const todayLogs = useMemo(() => {
    const todayStr = new Date().toDateString();
    return logs.filter(log => new Date(log.timestamp).toDateString() === todayStr);
  }, [logs]);

  const uniqueUsersToday = useMemo(() => new Set(todayLogs.map(l => l.user_id)).size, [todayLogs]);

  const stats = useMemo(() => {
    const userCounts = {};
    logs.forEach(log => {
      if (log.user_name) userCounts[log.user_name] = (userCounts[log.user_name] || 0) + 1;
    });
    const mostActive = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0];
    return { mostActive };
  }, [logs]);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(l => l.action));
    return Array.from(actions).sort();
  }, [logs]);

  const scopeLabel = useMemo(() => {
    if (isAdminOrGM) return isAr ? "جميع الإدارات" : "All departments";
    if (user?.department) return user.department;
    return "";
  }, [isAdminOrGM, user, isAr]);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 rounded-xl bg-muted w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-5 h-24" /></Card>)}
        </div>
        <Card><CardContent className="p-5 h-64" /></Card>
      </div>
    );
  }

  const summaryCards = [
    {
      label: isAr ? "إجمالي العمليات" : "Total Actions",
      value: logs.length,
      icon: Activity,
      color: "#6366f1",
      sub: scopeLabel
    },
    {
      label: isAr ? "عمليات اليوم" : "Today's Actions",
      value: todayLogs.length,
      icon: Calendar,
      color: "#22c55e",
      sub: isAr ? new Date().toLocaleDateString("ar-SA", { weekday: "long" }) : new Date().toLocaleDateString("en-US", { weekday: "long" })
    },
    {
      label: isAr ? "مستخدمون نشطون اليوم" : "Active Users Today",
      value: uniqueUsersToday,
      icon: Users,
      color: "#3b82f6",
      sub: isAr ? "مستخدم فريد" : "Unique users"
    },
    {
      label: isAr ? "الأكثر نشاطاً" : "Most Active User",
      value: stats.mostActive ? stats.mostActive[1] : 0,
      icon: TrendingUp,
      color: "#f59e0b",
      sub: stats.mostActive ? stats.mostActive[0] : "—"
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-cairo font-bold text-sm sm:text-xl flex items-center gap-1.5 sm:gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
              <Activity className="w-3 h-3 sm:w-4.5 sm:h-4.5 text-indigo-500" />
            </div>
            {isAr ? "سجل العمليات" : "Activity Log"}
          </h2>
          <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
            {isAr
              ? `تتبع جميع الإجراءات — ${scopeLabel}`
              : `Track all actions — ${scopeLabel}`
            }
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("timeline")}
              className={`p-1.5 sm:p-2 transition-colors ${viewMode === "timeline" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              aria-label={isAr ? "عرض زمني" : "Timeline view"}
            >
              <LayoutList className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 sm:p-2 transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              aria-label={isAr ? "عرض جدول" : "Table view"}
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
          <div className={`h-7 sm:h-9 px-2.5 sm:px-3 rounded-md border flex items-center gap-1.5 text-[10px] sm:text-xs font-medium ${wsConnected ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-600"}`}>
            <span className="relative flex h-2 w-2">
              {wsConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${wsConnected ? "bg-emerald-500" : "bg-red-400"}`} />
            </span>
            <span>{wsConnected ? (isAr ? "مباشر" : "Live") : (isAr ? "غير متصل" : "Offline")}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
              <div className="absolute inset-0 opacity-[0.04]" style={{ background: `radial-gradient(circle at top ${isAr ? "right" : "left"}, ${card.color}, transparent 70%)` }} />
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[11px] font-semibold text-muted-foreground truncate">{card.label}</p>
                    <p className="text-xl sm:text-3xl font-black leading-none mt-1" style={{ color: card.color }}>{card.value}</p>
                    <p className="text-[8px] sm:text-[10px] text-muted-foreground mt-0.5 sm:mt-1 truncate">{card.sub}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${card.color}15` }}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: card.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.entries(CATEGORY_GROUPS).map(([key, cat]) => {
          const count = logs.filter(l => cat.actions.includes(l.action)).length;
          if (count === 0) return null;
          const isActive = filterCategory === key;
          return (
            <button
              key={key}
              onClick={() => { setFilterCategory(isActive ? "all" : key); setFilterAction("all"); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive ? "text-white shadow-md scale-[1.02]" : "bg-muted/60 text-muted-foreground hover:bg-muted border border-transparent hover:border-border"
              }`}
              style={isActive ? { backgroundColor: cat.color } : undefined}
            >
              <span>{cat.label[language]}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-background text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="border-0 shadow-md overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Filter className="w-4 h-4" />
              {isAr ? "تصفية" : "Filter"}
            </div>

            <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setFilterCategory("all"); }}>
              <SelectTrigger className="w-48 h-9 text-xs">
                <SelectValue placeholder={isAr ? "نوع العملية" : "Action Type"} />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-64">
                <SelectItem value="all">{isAr ? "جميع العمليات" : "All Actions"}</SelectItem>
                {uniqueActions.map((action) => {
                  const config = getConfig(action);
                  return (
                    <SelectItem key={action} value={action}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                        {config.label[language]}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground`} />
              <Input
                placeholder={isAr ? "بحث بالمستخدم..." : "Search user..."}
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className={`w-48 h-9 text-xs ${isAr ? "pr-9" : "pl-9"}`}
              />
            </div>

            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-40 h-9 text-xs" />

            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={clearFilters}>
                <X className="w-3.5 h-3.5" />
                {isAr ? "مسح الفلاتر" : "Clear"}
              </Button>
            )}

            <div className={`${isAr ? "mr-auto" : "ml-auto"} text-[11px] text-muted-foreground font-medium`}>
              {isAr ? `عرض ${computedFiltered.length} من ${logs.length} عملية` : `Showing ${computedFiltered.length} of ${logs.length}`}
            </div>
          </div>
        </div>

        {viewMode === "timeline" ? (
          <div className="divide-y">
            {Object.keys(dateGroups).length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-7 h-7 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">{isAr ? "لا توجد عمليات مسجلة" : "No activities found"}</p>
                {hasFilters && <p className="text-xs text-muted-foreground mt-1">{isAr ? "حاول تغيير معايير البحث" : "Try adjusting your filters"}</p>}
              </div>
            ) : (
              Object.entries(dateGroups).map(([dateLabel, groupLogs]) => (
                <div key={dateLabel}>
                  <div className="px-5 py-2.5 bg-muted/20 border-b">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground">{dateLabel}</span>
                      <span className="text-[10px] text-muted-foreground/60 bg-muted rounded-md px-1.5 py-0.5">{groupLogs.length}</span>
                    </div>
                  </div>
                  <div>
                    {groupLogs.map((log, idx) => {
                      const config = getConfig(log.action);
                      const Icon = config.icon;
                      const catColor = getActionTypeColor(log.action);
                      return (
                        <div key={log.id || idx} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${config.color}12` }}>
                            <Icon className="w-4.5 h-4.5" style={{ color: config.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-white" style={{ backgroundColor: catColor }}>
                                {config.label[language]}
                              </span>
                              {log.department && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                                  <Building2 className="w-3 h-3" />{log.department}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center font-cairo font-bold text-[10px] text-primary flex-shrink-0">
                                {log.user_name?.charAt(0) || "؟"}
                              </div>
                              <span className="text-xs font-semibold truncate">{log.user_name}</span>
                              {log.user_email && <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">{log.user_email}</span>}
                            </div>
                            {log.details && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{log.details}</p>}
                            {log.target && (
                              <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 mt-1">
                                <Eye className="w-3 h-3" />{log.target}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0 pt-1 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />{formatTimeAgo(log.timestamp, isAr)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="text-center text-xs font-bold">{isAr ? "العملية" : "Action"}</TableHead>
                  <TableHead className="text-center text-xs font-bold">{isAr ? "المستخدم" : "User"}</TableHead>
                  <TableHead className="text-center text-xs font-bold">{isAr ? "الإدارة" : "Department"}</TableHead>
                  <TableHead className="text-center text-xs font-bold">{isAr ? "الهدف" : "Target"}</TableHead>
                  <TableHead className="text-center text-xs font-bold">{isAr ? "التفاصيل" : "Details"}</TableHead>
                  <TableHead className="text-center text-xs font-bold">{isAr ? "التاريخ والوقت" : "Date & Time"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-muted-foreground">{isAr ? "لا توجد عمليات" : "No activities found"}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => {
                    const config = getConfig(log.action);
                    const Icon = config.icon;
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${config.color}15` }}>
                              <Icon className="w-4 h-4" style={{ color: config.color }} />
                            </div>
                            <span className="text-xs font-semibold whitespace-nowrap">{config.label[language]}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-cairo font-bold text-[11px] text-primary flex-shrink-0">
                              {log.user_name?.charAt(0) || "؟"}
                            </div>
                            <div className={`${isAr ? "text-right" : "text-left"} min-w-0`}>
                              <p className="text-xs font-semibold truncate">{log.user_name}</p>
                              {log.user_email && <p className="text-[10px] text-muted-foreground truncate">{log.user_email}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {log.department ? (
                            <span className="text-xs font-medium bg-muted/50 px-2 py-1 rounded-md inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{log.department}</span>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {log.target ? <span className="text-xs font-medium bg-muted/50 px-2 py-1 rounded-md">{log.target}</span> : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-center max-w-[200px]"><p className="text-xs text-muted-foreground truncate">{log.details || "—"}</p></TableCell>
                        <TableCell className="text-center">
                          <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString(isAr ? "ar-SA" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatTimeAgo(log.timestamp, isAr)}</p>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">
              {isAr ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                if (page < 1 || page > totalPages) return null;
                return (
                  <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setCurrentPage(page)}>
                    {page}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}