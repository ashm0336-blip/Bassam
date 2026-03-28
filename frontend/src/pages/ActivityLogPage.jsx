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
  Clipboard, Radio, Zap, ArrowUpDown
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
  login:                          { icon: LogIn,          color: "#6366f1", bg: "#eef2ff", label: { ar: "تسجيل دخول",           en: "Login" } },
  logout:                         { icon: LogOut,         color: "#6b7280", bg: "#f9fafb", label: { ar: "تسجيل خروج",           en: "Logout" } },
  employee_created:               { icon: UserPlus,       color: "#059669", bg: "#ecfdf5", label: { ar: "إضافة موظف",            en: "Employee Created" } },
  employee_updated:               { icon: Edit,           color: "#2563eb", bg: "#eff6ff", label: { ar: "تعديل موظف",            en: "Employee Updated" } },
  employee_deleted:               { icon: UserMinus,      color: "#dc2626", bg: "#fef2f2", label: { ar: "حذف موظف",             en: "Employee Deleted" } },
  account_activated:              { icon: CheckCircle,    color: "#059669", bg: "#ecfdf5", label: { ar: "تفعيل حساب",            en: "Account Activated" } },
  account_frozen:                 { icon: Lock,           color: "#d97706", bg: "#fffbeb", label: { ar: "تجميد حساب",            en: "Account Frozen" } },
  account_terminated:             { icon: UserMinus,      color: "#dc2626", bg: "#fef2f2", label: { ar: "إنهاء خدمة",           en: "Account Terminated" } },
  reset_pin:                      { icon: Key,            color: "#7c3aed", bg: "#f5f3ff", label: { ar: "إعادة تعيين رمز",       en: "PIN Reset" } },
  change_pin:                     { icon: Key,            color: "#7c3aed", bg: "#f5f3ff", label: { ar: "تغيير رمز الدخول",      en: "PIN Changed" } },
  schedule_created:               { icon: Calendar,       color: "#0284c7", bg: "#f0f9ff", label: { ar: "إنشاء جدول",            en: "Schedule Created" } },
  schedule_status:                { icon: CheckCircle,    color: "#0284c7", bg: "#f0f9ff", label: { ar: "حالة جدول",             en: "Schedule Status" } },
  schedule_unlocked:              { icon: Unlock,         color: "#d97706", bg: "#fffbeb", label: { ar: "فتح جدول",              en: "Schedule Unlocked" } },
  schedule_deleted:               { icon: Trash2,         color: "#dc2626", bg: "#fef2f2", label: { ar: "حذف جدول",              en: "Schedule Deleted" } },
  setting_created:                { icon: Settings,       color: "#7c3aed", bg: "#f5f3ff", label: { ar: "إضافة إعداد",           en: "Setting Created" } },
  setting_updated:                { icon: Settings,       color: "#2563eb", bg: "#eff6ff", label: { ar: "تحديث إعداد",           en: "Setting Updated" } },
  setting_deleted:                { icon: Settings,       color: "#dc2626", bg: "#fef2f2", label: { ar: "حذف إعداد",             en: "Setting Deleted" } },
  task_created:                   { icon: Clipboard,      color: "#0284c7", bg: "#f0f9ff", label: { ar: "إنشاء مهمة",            en: "Task Created" } },
  role_changed:                   { icon: Shield,         color: "#7c3aed", bg: "#f5f3ff", label: { ar: "تغيير دور",             en: "Role Changed" } },
  "استيراد موظفين":               { icon: Upload,         color: "#0284c7", bg: "#f0f9ff", label: { ar: "استيراد موظفين",         en: "Employee Import" } },
  "إضافة خيار قائمة":             { icon: Settings,       color: "#7c3aed", bg: "#f5f3ff", label: { ar: "إضافة خيار قائمة",      en: "Dropdown Added" } },
  "تعديل خيار قائمة":             { icon: Edit,           color: "#2563eb", bg: "#eff6ff", label: { ar: "تعديل خيار قائمة",      en: "Dropdown Updated" } },
  "حذف خيار قائمة":               { icon: Trash2,         color: "#dc2626", bg: "#fef2f2", label: { ar: "حذف خيار قائمة",       en: "Dropdown Deleted" } },
  "تهيئة القوائم":                { icon: Settings,       color: "#7c3aed", bg: "#f5f3ff", label: { ar: "تهيئة القوائم",         en: "Dropdowns Init" } },
  "تحديث إعدادات شاشة الدخول":    { icon: Settings,       color: "#2563eb", bg: "#eff6ff", label: { ar: "تحديث شاشة الدخول",     en: "Login Settings" } },
  "تحديث إعدادات Header":         { icon: Settings,       color: "#2563eb", bg: "#eff6ff", label: { ar: "تحديث Header",         en: "Header Settings" } },
  "تحديث إعدادات الجوال":          { icon: Settings,       color: "#2563eb", bg: "#eff6ff", label: { ar: "تحديث إعدادات الجوال",  en: "PWA Settings" } },
  "إضافة قسم للقائمة":            { icon: Settings,       color: "#059669", bg: "#ecfdf5", label: { ar: "إضافة قسم للقائمة",     en: "Menu Item Added" } },
  "تعديل قسم في القائمة":          { icon: Edit,           color: "#2563eb", bg: "#eff6ff", label: { ar: "تعديل قسم في القائمة",  en: "Menu Item Updated" } },
  "حذف قسم من القائمة":            { icon: Trash2,         color: "#dc2626", bg: "#fef2f2", label: { ar: "حذف قسم من القائمة",   en: "Menu Item Deleted" } },
  "تهيئة القائمة الجانبية":        { icon: Settings,       color: "#7c3aed", bg: "#f5f3ff", label: { ar: "تهيئة القائمة الجانبية", en: "Sidebar Init" } },
  "إضافة فئة منطقة":              { icon: Building2,      color: "#059669", bg: "#ecfdf5", label: { ar: "إضافة فئة منطقة",      en: "Zone Category Added" } },
  "حذف فئة منطقة":                { icon: Trash2,         color: "#dc2626", bg: "#fef2f2", label: { ar: "حذف فئة منطقة",       en: "Zone Category Deleted" } },
  "تغيير الموسم":                 { icon: Calendar,       color: "#d97706", bg: "#fffbeb", label: { ar: "تغيير الموسم",          en: "Season Changed" } },
  "إضافة عنصر ممنوع":             { icon: AlertTriangle,  color: "#dc2626", bg: "#fef2f2", label: { ar: "إضافة عنصر ممنوع",     en: "Prohibited Item Added" } },
  "حذف عنصر ممنوع":               { icon: Trash2,         color: "#dc2626", bg: "#fef2f2", label: { ar: "حذف عنصر ممنوع",      en: "Prohibited Item Deleted" } },
  "تعديل عنصر ممنوع":             { icon: Edit,           color: "#d97706", bg: "#fffbeb", label: { ar: "تعديل عنصر ممنوع",     en: "Prohibited Item Updated" } },
  "إنشاء مجموعة صلاحيات":         { icon: Shield,         color: "#059669", bg: "#ecfdf5", label: { ar: "إنشاء مجموعة صلاحيات", en: "Permission Group Created" } },
  "تحديث مجموعة صلاحيات":         { icon: Shield,         color: "#2563eb", bg: "#eff6ff", label: { ar: "تحديث مجموعة صلاحيات", en: "Permission Group Updated" } },
  "حذف مجموعة صلاحيات":           { icon: Shield,         color: "#dc2626", bg: "#fef2f2", label: { ar: "حذف مجموعة صلاحيات",  en: "Permission Group Deleted" } },
  "تغيير مجموعة صلاحيات":         { icon: Users,          color: "#7c3aed", bg: "#f5f3ff", label: { ar: "تغيير مجموعة صلاحيات", en: "Permission Group Changed" } },
  "إعادة ضبط صلاحيات فردية":      { icon: Shield,         color: "#d97706", bg: "#fffbeb", label: { ar: "إعادة ضبط صلاحيات",    en: "Permissions Reset" } },
  "تخصيص صلاحيات فردية":          { icon: Shield,         color: "#7c3aed", bg: "#f5f3ff", label: { ar: "تخصيص صلاحيات",        en: "Custom Permissions" } },
  "نسخ صلاحيات":                  { icon: Shield,         color: "#0284c7", bg: "#f0f9ff", label: { ar: "نسخ صلاحيات",           en: "Permissions Copied" } },
  "إنشاء بلاغ":                   { icon: AlertTriangle,  color: "#d97706", bg: "#fffbeb", label: { ar: "إنشاء بلاغ",           en: "Report Created" } },
  "تحديث بلاغ":                   { icon: Edit,           color: "#2563eb", bg: "#eff6ff", label: { ar: "تحديث بلاغ",           en: "Report Updated" } },
  "تعميم":                        { icon: Radio,          color: "#7c3aed", bg: "#f5f3ff", label: { ar: "تعميم",                en: "Broadcast" } },
  "إنشاء إحصائية يومية":          { icon: BarChart3,      color: "#059669", bg: "#ecfdf5", label: { ar: "إنشاء إحصائية يومية",  en: "Daily Stats Created" } },
  "استيراد إحصائيات يومية":        { icon: Upload,         color: "#0284c7", bg: "#f0f9ff", label: { ar: "استيراد إحصائيات",     en: "Stats Imported" } },
  "حذف إحصائية يومية":            { icon: Trash2,         color: "#dc2626", bg: "#fef2f2", label: { ar: "حذف إحصائية يومية",   en: "Daily Stats Deleted" } },
  "استيراد أبواب":                 { icon: Upload,         color: "#0284c7", bg: "#f0f9ff", label: { ar: "استيراد أبواب",          en: "Gates Imported" } },
  "إنشاء جلسة خريطة":             { icon: Calendar,       color: "#059669", bg: "#ecfdf5", label: { ar: "إنشاء جلسة خريطة",     en: "Map Session Created" } },
  "حذف جلسة خريطة":               { icon: Trash2,         color: "#dc2626", bg: "#fef2f2", label: { ar: "حذف جلسة خريطة",      en: "Map Session Deleted" } },
  "إنشاء جلسات متعددة":           { icon: Calendar,       color: "#059669", bg: "#ecfdf5", label: { ar: "إنشاء جلسات متعددة",   en: "Bulk Sessions" } },
  "رفع صورة خريطة":               { icon: Upload,         color: "#0284c7", bg: "#f0f9ff", label: { ar: "رفع صورة خريطة",       en: "Map Image Uploaded" } },
  "إضافة طابق":                   { icon: Building2,      color: "#059669", bg: "#ecfdf5", label: { ar: "إضافة طابق",           en: "Floor Added" } },
  "حذف طابق":                     { icon: Trash2,         color: "#dc2626", bg: "#fef2f2", label: { ar: "حذف طابق",            en: "Floor Deleted" } },
  "إضافة منطقة":                  { icon: Building2,      color: "#059669", bg: "#ecfdf5", label: { ar: "إضافة منطقة",          en: "Zone Added" } },
  "حذف منطقة":                    { icon: Trash2,         color: "#dc2626", bg: "#fef2f2", label: { ar: "حذف منطقة",           en: "Zone Deleted" } },
  "تحديث كثافة المناطق":          { icon: BarChart3,      color: "#2563eb", bg: "#eff6ff", label: { ar: "تحديث كثافة المناطق",  en: "Zone Density Updated" } },
  "إضافة خريطة":                  { icon: Building2,      color: "#059669", bg: "#ecfdf5", label: { ar: "إضافة خريطة",          en: "Map Added" } },
  "إضافة علامة على الخريطة":       { icon: Building2,      color: "#059669", bg: "#ecfdf5", label: { ar: "إضافة علامة",          en: "Marker Added" } },
  "حذف علامة من الخريطة":          { icon: Trash2,         color: "#dc2626", bg: "#fef2f2", label: { ar: "حذف علامة",           en: "Marker Deleted" } },
  field_density:                   { icon: BarChart3,      color: "#0284c7", bg: "#f0f9ff", label: { ar: "رصد كثافة ميدانية",    en: "Field Density" } },
  field_alert:                     { icon: AlertTriangle,  color: "#dc2626", bg: "#fef2f2", label: { ar: "تنبيه ميداني",         en: "Field Alert" } },
  seed_full_data:                  { icon: Settings,       color: "#7c3aed", bg: "#f5f3ff", label: { ar: "تهيئة بيانات",          en: "Seed Data" } },
  clear_seed_data:                 { icon: Trash2,         color: "#dc2626", bg: "#fef2f2", label: { ar: "مسح بيانات تجريبية",   en: "Clear Seed Data" } },
};

const CATEGORY_GROUPS = {
  auth:     { label: { ar: "الدخول والخروج",  en: "Auth" },        icon: LogIn,         color: "#6366f1", actions: ["login", "logout"] },
  employee: { label: { ar: "إدارة الموظفين",   en: "Employees" },   icon: Users,         color: "#059669", actions: ["employee_created", "employee_updated", "employee_deleted", "account_activated", "account_frozen", "account_terminated", "reset_pin", "change_pin", "استيراد موظفين"] },
  schedule: { label: { ar: "الجداول",          en: "Schedules" },   icon: Calendar,      color: "#0284c7", actions: ["schedule_created", "schedule_status", "schedule_unlocked", "schedule_deleted"] },
  settings: { label: { ar: "الإعدادات",        en: "Settings" },    icon: Settings,      color: "#7c3aed", actions: ["setting_created", "setting_updated", "setting_deleted", "إضافة خيار قائمة", "تعديل خيار قائمة", "حذف خيار قائمة", "تهيئة القوائم", "تحديث إعدادات شاشة الدخول", "تحديث إعدادات Header", "تحديث إعدادات الجوال", "إضافة قسم للقائمة", "تعديل قسم في القائمة", "حذف قسم من القائمة", "تهيئة القائمة الجانبية", "تغيير الموسم"] },
  security: { label: { ar: "الأمان والصلاحيات", en: "Security" },   icon: Shield,        color: "#d97706", actions: ["إنشاء مجموعة صلاحيات", "تحديث مجموعة صلاحيات", "حذف مجموعة صلاحيات", "تغيير مجموعة صلاحيات", "إعادة ضبط صلاحيات فردية", "تخصيص صلاحيات فردية", "نسخ صلاحيات", "role_changed"] },
  reports:  { label: { ar: "البلاغات والإحصائيات", en: "Reports" },  icon: BarChart3,     color: "#dc2626", actions: ["إنشاء بلاغ", "تحديث بلاغ", "تعميم", "إنشاء إحصائية يومية", "استيراد إحصائيات يومية", "حذف إحصائية يومية", "field_density", "field_alert"] },
  maps:     { label: { ar: "الخرائط والمناطق", en: "Maps & Zones" }, icon: Building2,    color: "#0891b2", actions: ["إضافة طابق", "حذف طابق", "إضافة منطقة", "حذف منطقة", "تحديث كثافة المناطق", "إضافة خريطة", "إضافة علامة على الخريطة", "حذف علامة من الخريطة", "رفع صورة خريطة", "إنشاء جلسة خريطة", "حذف جلسة خريطة", "إنشاء جلسات متعددة", "إضافة فئة منطقة", "حذف فئة منطقة"] },
  other:    { label: { ar: "أخرى",             en: "Other" },       icon: Activity,      color: "#6b7280", actions: ["task_created", "إضافة عنصر ممنوع", "حذف عنصر ممنوع", "تعديل عنصر ممنوع", "استيراد أبواب", "seed_full_data", "clear_seed_data"] },
};

const DEPT_NAMES = {
  general_admin: { ar: "الإدارة العامة", en: "General Admin" },
  planning: { ar: "التخطيط", en: "Planning" },
  crowd_services: { ar: "خدمات الحشود", en: "Crowd Services" },
  mataf: { ar: "المطاف", en: "Mataf" },
  gates: { ar: "الأبواب", en: "Gates" },
  plazas: { ar: "الساحات", en: "Plazas" },
  haram_map: { ar: "خريطة الحرم", en: "Haram Map" },
};

const DEFAULT_CONFIG = { icon: Activity, color: "#6b7280", bg: "#f9fafb", label: { ar: "عملية أخرى", en: "Other Action" } };
const PAGE_SIZE = 25;

function getConfig(action) {
  return ACTION_CONFIG[action] || DEFAULT_CONFIG;
}

function getCategoryForAction(action) {
  for (const [catKey, cat] of Object.entries(CATEGORY_GROUPS)) {
    if (cat.actions.includes(action)) return catKey;
  }
  return "other";
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

function formatTime(timestamp, isAr) {
  return new Date(timestamp).toLocaleTimeString(isAr ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" });
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

function getInitials(name) {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0].charAt(0) + parts[1].charAt(0);
  return parts[0].charAt(0);
}

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
  "from-cyan-500 to-sky-600",
  "from-fuchsia-500 to-purple-600",
];

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ActivityLogPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === "ar";
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterUser, setFilterUser] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("timeline");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);

  const isAdminOrGM = user?.role === "system_admin";
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
      filtered = filtered.filter(log => new Date(log.timestamp).toISOString().split("T")[0] === filterDate);
    }
    return filtered;
  }, [logs, filterCategory, filterUser, filterDate]);

  useEffect(() => { setCurrentPage(1); }, [computedFiltered]);

  const clearFilters = () => { setFilterCategory("all"); setFilterUser(""); setFilterDate(""); };
  const hasFilters = filterCategory !== "all" || filterUser || filterDate;

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
    const todayStr = new Date().toDateString();
    const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
    const todayCount = logs.filter(l => new Date(l.timestamp).toDateString() === todayStr).length;
    const yesterdayCount = logs.filter(l => new Date(l.timestamp).toDateString() === yesterdayStr).length;
    const trend = yesterdayCount > 0 ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100) : 0;
    return { mostActive, trend };
  }, [logs]);

  const scopeLabel = useMemo(() => {
    if (isAdminOrGM) return isAr ? "جميع الإدارات" : "All departments";
    const d = user?.department;
    if (d && DEPT_NAMES[d]) return DEPT_NAMES[d][isAr ? "ar" : "en"];
    return d || "";
  }, [isAdminOrGM, user, isAr]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse p-1">
        <div className="h-20 rounded-2xl bg-gradient-to-l from-muted/80 to-muted/40" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-muted/50" />)}
        </div>
        <div className="h-96 rounded-2xl bg-muted/30" />
      </div>
    );
  }

  const summaryCards = [
    {
      label: isAr ? "إجمالي العمليات" : "Total",
      value: logs.length,
      icon: Activity,
      gradient: "from-indigo-500 to-violet-600",
      lightBg: "bg-indigo-50",
    },
    {
      label: isAr ? "اليوم" : "Today",
      value: todayLogs.length,
      icon: Zap,
      gradient: "from-emerald-500 to-teal-600",
      lightBg: "bg-emerald-50",
      trend: stats.trend,
    },
    {
      label: isAr ? "مستخدمون نشطون" : "Active Users",
      value: uniqueUsersToday,
      icon: Users,
      gradient: "from-blue-500 to-cyan-600",
      lightBg: "bg-blue-50",
    },
    {
      label: isAr ? "الأكثر نشاطاً" : "Top User",
      value: stats.mostActive ? stats.mostActive[0].split(" ")[0] : "—",
      icon: TrendingUp,
      gradient: "from-amber-500 to-orange-600",
      lightBg: "bg-amber-50",
      sub: stats.mostActive ? `${stats.mostActive[1]} ${isAr ? "عملية" : "actions"}` : "",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-indigo-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-violet-500 rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="font-cairo font-black text-white text-base sm:text-xl">
                {isAr ? "سجل العمليات" : "Activity Log"}
              </h1>
              <p className="text-[10px] sm:text-xs text-white/50 mt-0.5">
                {scopeLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-8 px-3 rounded-full flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold backdrop-blur-sm border ${
              wsConnected
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-400/30 bg-red-500/10 text-red-400"
            }`}>
              <span className="relative flex h-1.5 w-1.5">
                {wsConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${wsConnected ? "bg-emerald-400" : "bg-red-400"}`} />
              </span>
              {wsConnected ? (isAr ? "مباشر" : "Live") : (isAr ? "غير متصل" : "Offline")}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-border/50 p-3 sm:p-4 hover:shadow-lg hover:border-border transition-all duration-300 hover:-translate-y-0.5">
              <div className={`absolute top-0 ${isAr ? "left-0" : "right-0"} w-20 h-20 rounded-full bg-gradient-to-br ${card.gradient} opacity-[0.06] -translate-y-1/2 ${isAr ? "-translate-x-1/2" : "translate-x-1/2"} group-hover:opacity-[0.12] transition-opacity`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white" />
                  </div>
                  {card.trend !== undefined && card.trend !== 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      card.trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                    }`}>
                      {card.trend > 0 ? "+" : ""}{card.trend}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground">{card.label}</p>
                <p className={`${typeof card.value === "number" ? "text-xl sm:text-2xl" : "text-sm sm:text-base"} font-black mt-0.5 leading-none`}>
                  {card.value}
                </p>
                {card.sub && <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1">{card.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setFilterCategory("all")}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
            filterCategory === "all"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          {isAr ? "الكل" : "All"}
          <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black ${
            filterCategory === "all" ? "bg-white/20 dark:bg-black/20" : "bg-background"
          }`}>{logs.length}</span>
        </button>
        {Object.entries(CATEGORY_GROUPS).map(([key, cat]) => {
          const count = logs.filter(l => cat.actions.includes(l.action)).length;
          if (count === 0) return null;
          const isActive = filterCategory === key;
          const CatIcon = cat.icon;
          return (
            <button
              key={key}
              onClick={() => setFilterCategory(isActive ? "all" : key)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                isActive
                  ? "text-white shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
              style={isActive ? { backgroundColor: cat.color } : undefined}
            >
              <CatIcon className="w-3.5 h-3.5" />
              {cat.label[language]}
              <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black ${isActive ? "bg-white/20 text-white" : "bg-background"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
            showFilters || hasFilters
              ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {isAr ? "تصفية" : "Filter"}
          {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
        </button>

        <div className="flex items-center border rounded-xl overflow-hidden bg-muted/30">
          <button
            onClick={() => setViewMode("timeline")}
            className={`p-2 transition-all ${viewMode === "timeline" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-2 transition-all ${viewMode === "table" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className={`${isAr ? "mr-auto" : "ml-auto"} text-[10px] sm:text-[11px] text-muted-foreground font-medium bg-muted/30 px-3 py-1.5 rounded-lg`}>
          {computedFiltered.length} / {logs.length}
        </div>
      </div>

      {showFilters && (
        <div className="flex gap-2 flex-wrap p-3 rounded-xl bg-muted/20 border border-border/50">
          <div className="relative flex-1 min-w-[140px]">
            <Search className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground`} />
            <Input
              placeholder={isAr ? "بحث بالاسم..." : "Search name..."}
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className={`h-9 text-xs rounded-xl ${isAr ? "pr-9" : "pl-9"}`}
            />
          </div>
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-40 h-9 text-xs rounded-xl" />
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={clearFilters}>
              <X className="w-3.5 h-3.5" />
              {isAr ? "مسح" : "Clear"}
            </Button>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {viewMode === "timeline" ? (
          <div>
            {Object.keys(dateGroups).length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-muted-foreground/20" />
                </div>
                <p className="text-sm font-bold text-muted-foreground">{isAr ? "لا توجد عمليات مسجلة" : "No activities found"}</p>
                {hasFilters && <p className="text-xs text-muted-foreground/60 mt-1">{isAr ? "حاول تغيير معايير البحث" : "Try adjusting your filters"}</p>}
              </div>
            ) : (
              Object.entries(dateGroups).map(([dateLabel, groupLogs]) => (
                <div key={dateLabel}>
                  <div className="sticky top-0 z-10 px-4 py-2.5 bg-muted/30 backdrop-blur-sm border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-[11px] font-bold text-foreground">{dateLabel}</span>
                      <span className="text-[9px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-semibold">{groupLogs.length}</span>
                    </div>
                  </div>
                  <div>
                    {groupLogs.map((log, idx) => {
                      const config = getConfig(log.action);
                      const Icon = config.icon;
                      const isExpanded = expandedLog === log.id;
                      const deptName = log.department && DEPT_NAMES[log.department] ? DEPT_NAMES[log.department][isAr ? "ar" : "en"] : log.department;
                      return (
                        <div
                          key={log.id || idx}
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                          className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-200 border-b border-border/10 last:border-0 ${
                            isExpanded ? "bg-muted/30" : "hover:bg-muted/10"
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                              style={{ backgroundColor: config.bg }}>
                              <Icon className="w-[18px] h-[18px]" style={{ color: config.color }} />
                            </div>
                            <span className="text-[9px] text-muted-foreground/50 font-mono">{formatTime(log.timestamp, isAr)}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                                style={{ backgroundColor: config.bg, color: config.color }}>
                                {config.label[language]}
                              </span>
                              {deptName && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-semibold bg-muted/60 text-muted-foreground">
                                  {deptName}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1.5">
                              <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${getAvatarColor(log.user_name)} flex items-center justify-center shadow-sm flex-shrink-0`}>
                                <span className="text-white text-[9px] font-black">{getInitials(log.user_name)}</span>
                              </div>
                              <span className="text-xs font-bold truncate">{log.user_name}</span>
                            </div>

                            {isExpanded && (
                              <div className="mt-2.5 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                                {log.details && (
                                  <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/30 rounded-lg px-3 py-2">{log.details}</p>
                                )}
                                {log.target && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <Eye className="w-3 h-3" />
                                    <span>{log.target}</span>
                                  </div>
                                )}
                                {log.user_email && (
                                  <p className="text-[10px] text-muted-foreground/60">{log.user_email}</p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex-shrink-0 pt-1">
                            <span className="text-[10px] text-muted-foreground/60 font-medium">{formatTimeAgo(log.timestamp, isAr)}</span>
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
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="text-center text-[11px] font-black">{isAr ? "العملية" : "Action"}</TableHead>
                  <TableHead className="text-center text-[11px] font-black">{isAr ? "المستخدم" : "User"}</TableHead>
                  <TableHead className="text-center text-[11px] font-black">{isAr ? "الإدارة" : "Dept"}</TableHead>
                  <TableHead className="text-center text-[11px] font-black hidden sm:table-cell">{isAr ? "التفاصيل" : "Details"}</TableHead>
                  <TableHead className="text-center text-[11px] font-black">{isAr ? "الوقت" : "Time"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <Activity className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm font-bold text-muted-foreground">{isAr ? "لا توجد عمليات" : "No activities"}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => {
                    const config = getConfig(log.action);
                    const Icon = config.icon;
                    const deptName = log.department && DEPT_NAMES[log.department] ? DEPT_NAMES[log.department][isAr ? "ar" : "en"] : log.department;
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold"
                            style={{ backgroundColor: config.bg, color: config.color }}>
                            <Icon className="w-3.5 h-3.5" />
                            {config.label[language]}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${getAvatarColor(log.user_name)} flex items-center justify-center shadow-sm flex-shrink-0`}>
                              <span className="text-white text-[8px] font-black">{getInitials(log.user_name)}</span>
                            </div>
                            <span className="text-[11px] font-bold truncate max-w-[100px]">{log.user_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {deptName ? (
                            <span className="text-[10px] font-semibold bg-muted/50 px-2 py-1 rounded-lg">{deptName}</span>
                          ) : <span className="text-muted-foreground/30 text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-center max-w-[200px] hidden sm:table-cell">
                          <p className="text-[11px] text-muted-foreground truncate">{log.details || "—"}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>
                            <p className="text-[10px] font-mono text-muted-foreground">{formatTime(log.timestamp, isAr)}</p>
                            <p className="text-[9px] text-muted-foreground/40 mt-0.5">{formatTimeAgo(log.timestamp, isAr)}</p>
                          </div>
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
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
              {isAr ? `${currentPage} / ${totalPages}` : `${currentPage} / ${totalPages}`}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                if (page < 1 || page > totalPages) return null;
                return (
                  <Button key={page} variant={currentPage === page ? "default" : "ghost"} size="sm"
                    className={`h-8 w-8 p-0 text-xs rounded-xl ${currentPage === page ? "shadow-sm" : ""}`}
                    onClick={() => setCurrentPage(page)}>
                    {page}
                  </Button>
                );
              })}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
