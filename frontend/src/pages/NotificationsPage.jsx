import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRealtimeRefresh, useWsConnected } from "@/context/WebSocketContext";
import {
  Bell, AlertTriangle, Info, AlertCircle, CheckCircle2, Trash2,
  Plus, ClipboardList, Megaphone, Send, Clock, Eye, Loader2,
  CheckCheck, Search, Filter, X, Zap, Building2, Calendar,
  ChevronDown, ChevronUp, BellRing, Radio
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TAB_CONFIG = [
  { id: "all",        label: "الكل",     icon: Bell,          accent: "#2563eb", light: "#eff6ff", border: "#bfdbfe" },
  { id: "tasks",      label: "مهامي",    icon: ClipboardList, accent: "#0284c7", light: "#f0f9ff", border: "#bae6fd" },
  { id: "alerts",     label: "تنبيهات",  icon: AlertTriangle, accent: "#d97706", light: "#fffbeb", border: "#fde68a" },
  { id: "broadcasts", label: "تعميمات",  icon: Megaphone,     accent: "#7c3aed", light: "#f5f3ff", border: "#c4b5fd" },
];

const ALERT_TYPES = {
  emergency:  { icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2", border: "#fecaca",   label: "طوارئ" },
  warning:    { icon: AlertCircle,   color: "#f59e0b", bg: "#fffbeb", border: "#fde68a",   label: "تحذير" },
  info:       { icon: Info,          color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe",   label: "معلومة" },
  task:       { icon: ClipboardList, color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd",   label: "مهمة" },
  task_done:  { icon: CheckCircle2,  color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0",   label: "مهمة مكتملة" },
  broadcast:  { icon: Megaphone,     color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd",   label: "تعميم" },
};

const PRIORITIES = {
  critical: { color: "#ef4444", bg: "#fef2f2", label: "حرج" },
  high:     { color: "#f97316", bg: "#fff7ed", label: "عالي" },
  urgent:   { color: "#ef4444", bg: "#fef2f2", label: "عاجل" },
  medium:   { color: "#3b82f6", bg: "#eff6ff", label: "متوسط" },
  normal:   { color: "#6b7280", bg: "#f9fafb", label: "عادي" },
  low:      { color: "#9ca3af", bg: "#f9fafb", label: "منخفض" },
};

const DEPARTMENTS = {
  all: "جميع الإدارات",
  planning: "إدارة التخطيط",
  plazas: "إدارة الساحات",
  gates: "إدارة الأبواب",
  crowd_services: "خدمات الحشود",
  mataf: "صحن المطاف",
  haram_map: "إدارة المصليات",
};

const DEPT_ICONS = {
  planning: "📋", plazas: "🏛", gates: "🚪", crowd_services: "👥",
  mataf: "🕋", haram_map: "🗺", all: "🏢",
};

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now - d;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return d.toLocaleDateString('ar-SA');
}

function getDateGroup(timestamp) {
  if (!timestamp) return 'older';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return 'older';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

  if (d >= today) return 'today';
  if (d >= yesterday) return 'yesterday';
  if (d >= weekAgo) return 'thisWeek';
  return 'older';
}

const DATE_GROUP_LABELS = {
  today: "اليوم",
  yesterday: "أمس",
  thisWeek: "هذا الأسبوع",
  older: "أقدم",
};

function AnimatedCounter({ value, color }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff = value - start;
    if (diff === 0) return;
    let frame = 0;
    const totalFrames = 20;
    const timer = setInterval(() => {
      frame++;
      setDisplay(Math.round(start + (diff * frame / totalFrames)));
      if (frame >= totalFrames) { clearInterval(timer); prev.current = value; }
    }, 25);
    return () => clearInterval(timer);
  }, [value]);
  return <span className="text-2xl font-black tabular-nums" style={{ color }}>{display}</span>;
}

function LivePulse({ connected }) {
  if (connected) {
    return (
      <span className="relative flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium" role="status" aria-label="متصل مباشرة">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        مباشر
      </span>
    );
  }
  return (
    <span className="relative flex items-center gap-1.5 text-[10px] text-amber-600 font-medium" role="status" aria-label="جاري إعادة الاتصال">
      <span className="relative flex h-2.5 w-2.5">
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
      </span>
      جاري الاتصال...
    </span>
  );
}


export default function NotificationsPage() {
  const { canAddAlerts, user, hasPermission } = useAuth();
  const { language } = useLanguage();
  const wsConnected = useWsConnected();
  const [activeTab, setActiveTab] = useState("all");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [broadcastDialog, setBroadcastDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [markingAll, setMarkingAll] = useState(false);
  const [newAlertIds, setNewAlertIds] = useState(new Set());
  const prevAlertIdsRef = useRef(new Set());

  const [alertForm, setAlertForm] = useState({
    type: "warning", title: "", message: "", department: user?.department || "all", priority: "medium",
    received_at: new Date().toISOString(),
  });
  const [broadcastForm, setBroadcastForm] = useState({
    title: "", message: "", department: "all", priority: "normal",
  });

  const isAdmin = user?.role === 'system_admin' || user?.role === 'general_manager';
  const canBroadcast = isAdmin || hasPermission('page_alerts', 'write');

  const fetchAlerts = useCallback(async (wsEvent) => {
    try {
      const category = activeTab === 'all' ? '' : activeTab;
      const url = category ? `${API}/alerts?category=${category}` : `${API}/alerts`;
      const res = await axios.get(url);
      const incoming = res.data;

      if (wsEvent && prevAlertIdsRef.current.size > 0) {
        const brandNew = incoming.filter(a => !prevAlertIdsRef.current.has(a.id)).map(a => a.id);
        if (brandNew.length > 0) {
          setNewAlertIds(new Set(brandNew));
          setTimeout(() => setNewAlertIds(new Set()), 3000);
        }
      }

      prevAlertIdsRef.current = new Set(incoming.map(a => a.id));
      setAlerts(incoming);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { setLoading(true); fetchAlerts(); }, [fetchAlerts]);
  useRealtimeRefresh(["alerts"], fetchAlerts);

  const allAlerts = alerts;
  const taskCount = allAlerts.filter(a => a.type === 'task' || a.type === 'task_done').length;
  const alertCount = allAlerts.filter(a => !['task', 'task_done', 'broadcast'].includes(a.type)).length;
  const broadcastCount = allAlerts.filter(a => a.type === 'broadcast').length;
  const unreadCount = allAlerts.filter(a => !a.is_read).length;

  const tabCounts = { all: allAlerts.length, tasks: taskCount, alerts: alertCount, broadcasts: broadcastCount };

  const filteredAlerts = searchQuery.trim()
    ? alerts.filter(a => a.title?.includes(searchQuery) || a.message?.includes(searchQuery))
    : alerts;

  const grouped = {};
  filteredAlerts.forEach(a => {
    const g = getDateGroup(a.received_at || a.timestamp);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(a);
  });
  const groupOrder = ['today', 'yesterday', 'thisWeek', 'older'];

  const toggleGroup = (g) => setCollapsedGroups(prev => ({ ...prev, [g]: !prev[g] }));

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/admin/alerts`, alertForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      toast.success("تم إضافة التنبيه بنجاح");
      setDialogOpen(false);
      setAlertForm({ type: "warning", title: "", message: "", department: user?.department || "all", priority: "medium", received_at: new Date().toISOString() });
      fetchAlerts();
    } catch (e) { toast.error(e.response?.data?.detail || "حدث خطأ"); }
    finally { setSubmitting(false); }
  };

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/broadcasts`, broadcastForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      toast.success("تم إرسال التعميم بنجاح");
      setBroadcastDialog(false);
      setBroadcastForm({ title: "", message: "", department: "all", priority: "normal" });
      fetchAlerts();
    } catch (e) { toast.error(e.response?.data?.detail || "حدث خطأ"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (alertId) => {
    try {
      await axios.delete(`${API}/admin/alerts/${alertId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      toast.success("تم الحذف");
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch { toast.error("فشل الحذف"); }
  };

  const handleMarkRead = async (alertId) => {
    try {
      await axios.put(`${API}/alerts/${alertId}`, { is_read: true }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    const unread = alerts.filter(a => !a.is_read);
    try {
      await Promise.all(unread.map(a =>
        axios.put(`${API}/alerts/${a.id}`, { is_read: true }, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
      ));
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      toast.success(`تم تعليم ${unread.length} إشعار كمقروء`);
    } catch { toast.error("حدث خطأ"); }
    finally { setMarkingAll(false); }
  };

  const activeTabConfig = TAB_CONFIG.find(t => t.id === activeTab) || TAB_CONFIG[0];

  return (
    <div className="space-y-5" data-testid="notifications-page" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ background: `linear-gradient(135deg, ${activeTabConfig.accent}15, ${activeTabConfig.accent}30)` }}>
            <BellRing className="w-6 h-6" style={{ color: activeTabConfig.accent }} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-cairo font-bold text-xl">الإشعارات والتنبيهات</h1>
              <LivePulse connected={wsConnected} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount > 0
                ? <span>{unreadCount} إشعار غير مقروء من أصل {allAlerts.length}</span>
                : <span>لا توجد إشعارات جديدة</span>
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => setShowSearch(!showSearch)}
            aria-label={showSearch ? "إغلاق البحث" : "بحث في الإشعارات"}
          >
            {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline" size="sm"
              className="gap-1.5 text-xs h-9 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              قراءة الكل
            </Button>
          )}
          {canBroadcast && (
            <Button
              onClick={() => setBroadcastDialog(true)}
              variant="outline" size="sm"
              className="gap-1.5 text-xs h-9 rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
              data-testid="new-broadcast-btn"
            >
              <Megaphone className="w-3.5 h-3.5" />
              تعميم جديد
            </Button>
          )}
          {canAddAlerts() && (
            <Button
              onClick={() => setDialogOpen(true)} size="sm"
              className="gap-1.5 text-xs h-9 rounded-xl"
              data-testid="new-alert-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              تنبيه جديد
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="relative animate-in slide-in-from-top-2 duration-200">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث في الإشعارات..."
            className="pr-10 h-10 rounded-xl border-2 focus-visible:ring-0"
            style={{ borderColor: searchQuery ? activeTabConfig.accent : undefined }}
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "المهام", count: taskCount, icon: ClipboardList, accent: "#0284c7", gradient: "from-sky-500 to-blue-600" },
          { label: "التنبيهات", count: alertCount, icon: AlertTriangle, accent: "#d97706", gradient: "from-amber-500 to-orange-600" },
          { label: "التعميمات", count: broadcastCount, icon: Megaphone, accent: "#7c3aed", gradient: "from-violet-500 to-purple-600" },
          { label: "غير مقروء", count: unreadCount, icon: Bell, accent: unreadCount > 0 ? "#ef4444" : "#6b7280", gradient: unreadCount > 0 ? "from-red-500 to-rose-600" : "from-gray-400 to-gray-500" },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i} className="group border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden" data-testid={`notif-kpi-${i}`}>
              <CardContent className="p-0">
                <div className="flex items-center gap-3 p-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground font-medium">{kpi.label}</p>
                    <AnimatedCounter value={kpi.count} color={kpi.accent} />
                  </div>
                </div>
                <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${kpi.accent}, transparent)`, opacity: kpi.count > 0 ? 0.6 : 0.15 }} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Premium Tabs */}
      <div
        className="rounded-2xl p-2 transition-colors duration-300"
        style={{ backgroundColor: activeTabConfig.light, border: `1px solid ${activeTabConfig.border}` }}
        data-testid="notif-tabs-bar"
      >
        <div className="flex gap-2" role="tablist" aria-label="تصنيفات الإشعارات">
          {TAB_CONFIG.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
                className={`
                  relative flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl transition-all duration-300
                  ${isActive
                    ? 'bg-white dark:bg-card shadow-md border-2 scale-[1.02]'
                    : 'bg-transparent border-2 border-transparent hover:bg-white/60 dark:hover:bg-card/40 hover:shadow-sm'
                  }
                `}
                style={isActive ? { borderColor: tab.accent } : {}}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${isActive ? 'shadow-sm' : ''}`}
                  style={isActive
                    ? { backgroundColor: `${tab.accent}15`, color: tab.accent }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                  }
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs font-medium transition-colors duration-300 ${isActive ? 'font-bold' : 'text-gray-500'}`}
                  style={isActive ? { color: tab.accent } : {}}
                >
                  {tab.label}
                </span>
                {count > 0 && (
                  <span
                    className={`absolute -top-1.5 -left-1.5 min-w-5 h-5 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
                    style={{ backgroundColor: isActive ? tab.accent : '#9ca3af' }}
                  >
                    {count}
                  </span>
                )}
                {isActive && (
                  <div className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-1 rounded-full transition-all duration-300" style={{ backgroundColor: tab.accent }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${activeTabConfig.accent}10` }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: activeTabConfig.accent }} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-cairo">جاري تحميل الإشعارات...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${activeTabConfig.accent}08, ${activeTabConfig.accent}20)` }}>
                  {activeTab === 'tasks' ? <ClipboardList className="w-10 h-10" style={{ color: activeTabConfig.accent, opacity: 0.6 }} /> :
                   activeTab === 'broadcasts' ? <Megaphone className="w-10 h-10" style={{ color: activeTabConfig.accent, opacity: 0.6 }} /> :
                   activeTab === 'alerts' ? <AlertTriangle className="w-10 h-10" style={{ color: activeTabConfig.accent, opacity: 0.6 }} /> :
                   <Bell className="w-10 h-10" style={{ color: activeTabConfig.accent, opacity: 0.6 }} />}
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center bg-white shadow-sm border">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <p className="font-cairo font-bold text-lg mb-1">
                {searchQuery
                  ? 'لا توجد نتائج'
                  : activeTab === 'tasks' ? 'لا توجد مهام حالياً' : activeTab === 'broadcasts' ? 'لا توجد تعميمات' : activeTab === 'alerts' ? 'لا توجد تنبيهات' : 'لا توجد إشعارات'}
              </p>
              <p className="text-sm text-muted-foreground max-w-[300px]">
                {searchQuery
                  ? `لم يتم العثور على إشعارات تطابق "${searchQuery}"`
                  : activeTab === 'tasks' ? 'ستظهر هنا عندما يُكلّفك المدير بمهمة جديدة' :
                   activeTab === 'broadcasts' ? 'ستظهر هنا التعميمات المرسلة من الإدارة العليا' :
                   activeTab === 'alerts' ? 'ستظهر هنا عند ورود تنبيهات جديدة من النظام' :
                   'ستظهر هنا جميع الإشعارات والتنبيهات الواردة'}
              </p>
            </div>
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${activeTabConfig.accent}30, transparent)` }} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupOrder.map(groupKey => {
            const items = grouped[groupKey];
            if (!items || items.length === 0) return null;
            const isCollapsed = collapsedGroups[groupKey];
            const unreadInGroup = items.filter(a => !a.is_read).length;

            return (
              <div key={groupKey} className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(groupKey)}
                  className="flex items-center gap-2 w-full group py-1"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold font-cairo text-muted-foreground">
                      {DATE_GROUP_LABELS[groupKey]}
                    </span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 rounded-md">
                      {items.length}
                    </Badge>
                    {unreadInGroup > 0 && (
                      <span className="flex items-center gap-1 text-[9px] font-medium" style={{ color: activeTabConfig.accent }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeTabConfig.accent }} />
                        {unreadInGroup} جديد
                      </span>
                    )}
                  </div>
                  <div className="flex-1 h-px bg-border mx-2" />
                  {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>

                {!isCollapsed && (
                  <div className="space-y-2">
                    {items.map((alert) => {
                      const typeConfig = ALERT_TYPES[alert.type] || ALERT_TYPES.info;
                      const priorityConfig = PRIORITIES[alert.priority] || PRIORITIES.normal;
                      const Icon = typeConfig.icon;
                      const isUnread = !alert.is_read;
                      const isBroadcast = alert.type === 'broadcast';
                      const isNew = newAlertIds.has(alert.id);

                      return (
                        <Card
                          key={alert.id}
                          className={`
                            group/card border-0 shadow-sm overflow-hidden transition-all duration-500 cursor-pointer
                            hover:shadow-md
                            ${isNew ? 'animate-in slide-in-from-top-3 duration-500' : ''}
                            ${isUnread ? '' : 'opacity-70'}
                          `}
                          data-testid={`notif-item-${alert.id}`}
                          onClick={() => isUnread && handleMarkRead(alert.id)}
                        >
                          <div className="flex">
                            <div className="w-1.5 flex-shrink-0 transition-all duration-300" style={{ backgroundColor: typeConfig.color, opacity: isUnread ? 1 : 0.3 }} />
                            <CardContent className="flex-1 p-3">
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isUnread ? 'shadow-sm' : ''}`}
                                  style={{ backgroundColor: typeConfig.bg, border: `1px solid ${typeConfig.border}` }}
                                >
                                  <Icon className="w-5 h-5" style={{ color: typeConfig.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className={`font-cairo font-bold text-sm leading-snug ${isUnread ? '' : 'text-muted-foreground'}`}>
                                          {alert.title}
                                        </h3>
                                        {isUnread && (
                                          <span className="relative flex h-2 w-2 flex-shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: typeConfig.color }} />
                                            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: typeConfig.color }} />
                                          </span>
                                        )}
                                      </div>
                                      {alert.message && (
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                                          {alert.message}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                      <span
                                        className="text-[9px] font-bold px-2 py-0.5 rounded-md"
                                        style={{ color: priorityConfig.color, backgroundColor: priorityConfig.bg, border: `1px solid ${priorityConfig.color}20` }}
                                      >
                                        {priorityConfig.label}
                                      </span>
                                      <span
                                        className="text-[9px] font-medium px-2 py-0.5 rounded-md"
                                        style={{ color: typeConfig.color, backgroundColor: typeConfig.bg }}
                                      >
                                        {typeConfig.label}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-dashed">
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                      {isBroadcast && alert.created_by && (
                                        <span className="flex items-center gap-1">
                                          <Send className="w-3 h-3" />{alert.created_by}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <Building2 className="w-3 h-3" />
                                        {DEPARTMENTS[alert.department] || alert.department}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatTimeAgo(alert.received_at || alert.timestamp)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                                      {isUnread && (
                                        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 rounded-lg hover:bg-blue-50 text-blue-600"
                                          onClick={(e) => { e.stopPropagation(); handleMarkRead(alert.id); }}>
                                          <Eye className="w-3 h-3" /> قرأت
                                        </Button>
                                      )}
                                      {canAddAlerts() && (
                                        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 rounded-lg hover:bg-red-50 text-destructive"
                                          aria-label="حذف الإشعار"
                                          onClick={(e) => { e.stopPropagation(); handleDelete(alert.id); }}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Alert Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] font-cairo rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              تنبيه جديد
            </DialogTitle>
            <DialogDescription>أضف تنبيه لإدارة أو لجميع الإدارات</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAlert} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">النوع</Label>
                <Select value={alertForm.type} onValueChange={v => setAlertForm({ ...alertForm, type: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency">طوارئ</SelectItem>
                    <SelectItem value="warning">تحذير</SelectItem>
                    <SelectItem value="info">معلومة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">الأولوية</Label>
                <Select value={alertForm.priority} onValueChange={v => setAlertForm({ ...alertForm, priority: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">حرج</SelectItem>
                    <SelectItem value="high">عالي</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="low">منخفض</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">الإدارة</Label>
              <Select value={alertForm.department} onValueChange={v => setAlertForm({ ...alertForm, department: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEPARTMENTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">العنوان *</Label>
              <Input value={alertForm.title} onChange={e => setAlertForm({ ...alertForm, title: e.target.value })} required className="mt-1.5 rounded-xl" placeholder="مثال: ازدحام في الساحة الشمالية" />
            </div>
            <div>
              <Label className="text-xs font-bold">التفاصيل *</Label>
              <Textarea value={alertForm.message} onChange={e => setAlertForm({ ...alertForm, message: e.target.value })} required className="mt-1.5 rounded-xl" rows={3} placeholder="تفاصيل التنبيه..." />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">إلغاء</Button>
              <Button type="submit" disabled={submitting} className="gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Broadcast Dialog */}
      <Dialog open={broadcastDialog} onOpenChange={setBroadcastDialog}>
        <DialogContent className="sm:max-w-[520px] font-cairo rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-white" />
              </div>
              تعميم جديد
            </DialogTitle>
            <DialogDescription>أرسل رسالة لجميع موظفي إدارة أو جميع الإدارات</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBroadcast} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">الإدارة المستهدفة</Label>
                <Select value={broadcastForm.department} onValueChange={v => setBroadcastForm({ ...broadcastForm, department: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPARTMENTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">الأولوية</Label>
                <Select value={broadcastForm.priority} onValueChange={v => setBroadcastForm({ ...broadcastForm, priority: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">عاجل</SelectItem>
                    <SelectItem value="high">مهم</SelectItem>
                    <SelectItem value="normal">عادي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold">عنوان التعميم *</Label>
              <Input value={broadcastForm.title} onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })} required className="mt-1.5 rounded-xl" placeholder="مثال: اجتماع طارئ الساعة 4" />
            </div>
            <div>
              <Label className="text-xs font-bold">نص التعميم</Label>
              <Textarea value={broadcastForm.message} onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })} className="mt-1.5 rounded-xl" rows={3} placeholder="تفاصيل التعميم..." />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setBroadcastDialog(false)} className="rounded-xl">إلغاء</Button>
              <Button type="submit" disabled={submitting} className="gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                إرسال التعميم
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
