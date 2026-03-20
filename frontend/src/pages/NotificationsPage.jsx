import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRealtimeRefresh } from "@/context/WebSocketContext";
import {
  Bell, AlertTriangle, Info, AlertCircle, CheckCircle2, Trash2,
  Plus, Volume2, VolumeX, ClipboardList, Megaphone, Send,
  Clock, Eye, ChevronDown, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ALERT_TYPES = {
  emergency: { icon: AlertTriangle, color: "border-red-300 bg-red-50 dark:bg-red-950/20", textColor: "text-red-600", label: "طوارئ" },
  warning: { icon: AlertCircle, color: "border-orange-300 bg-orange-50 dark:bg-orange-950/20", textColor: "text-orange-600", label: "تحذير" },
  info: { icon: Info, color: "border-blue-300 bg-blue-50 dark:bg-blue-950/20", textColor: "text-blue-600", label: "معلومة" },
  task: { icon: ClipboardList, color: "border-sky-300 bg-sky-50 dark:bg-sky-950/20", textColor: "text-sky-600", label: "مهمة" },
  task_done: { icon: CheckCircle2, color: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20", textColor: "text-emerald-600", label: "مهمة مكتملة" },
  broadcast: { icon: Megaphone, color: "border-violet-300 bg-violet-50 dark:bg-violet-950/20", textColor: "text-violet-600", label: "تعميم" },
};

const PRIORITIES = {
  critical: { color: "bg-red-600 text-white", label: "حرج" },
  high: { color: "bg-orange-500 text-white", label: "عالي" },
  urgent: { color: "bg-red-500 text-white", label: "عاجل" },
  medium: { color: "bg-blue-500 text-white", label: "متوسط" },
  normal: { color: "bg-slate-500 text-white", label: "عادي" },
  low: { color: "bg-gray-400 text-white", label: "منخفض" },
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

export default function NotificationsPage() {
  const { canAddAlerts, user, hasPermission } = useAuth();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("all");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [broadcastDialog, setBroadcastDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [alertForm, setAlertForm] = useState({
    type: "warning", title: "", message: "", department: user?.department || "all", priority: "medium",
    received_at: new Date().toISOString(),
  });
  const [broadcastForm, setBroadcastForm] = useState({
    title: "", message: "", department: "all", priority: "normal",
  });

  const isAdmin = user?.role === 'system_admin' || user?.role === 'general_manager';
  const canBroadcast = isAdmin || hasPermission('page_alerts', 'write');

  const fetchAlerts = useCallback(async () => {
    try {
      const category = activeTab === 'all' ? '' : activeTab;
      const url = category ? `${API}/alerts?category=${category}` : `${API}/alerts`;
      const res = await axios.get(url);
      setAlerts(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { setLoading(true); fetchAlerts(); }, [fetchAlerts]);
  useRealtimeRefresh(["alerts"], fetchAlerts);

  // Counts per category
  const taskCount = alerts.filter(a => a.type === 'task' || a.type === 'task_done').length;
  const alertCount = alerts.filter(a => !['task', 'task_done', 'broadcast'].includes(a.type)).length;
  const broadcastCount = alerts.filter(a => a.type === 'broadcast').length;
  const unreadCount = alerts.filter(a => !a.is_read).length;

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
      fetchAlerts();
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

  return (
    <div className="space-y-5" data-testid="notifications-page" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-cairo font-bold text-2xl flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            الإشعارات والتنبيهات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'لا توجد إشعارات جديدة'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canBroadcast && (
            <Button onClick={() => setBroadcastDialog(true)} variant="outline" className="gap-1.5 text-sm border-violet-200 text-violet-700 hover:bg-violet-50" data-testid="new-broadcast-btn">
              <Megaphone className="w-4 h-4" />
              تعميم جديد
            </Button>
          )}
          {canAddAlerts() && (
            <Button onClick={() => setDialogOpen(true)} className="gap-1.5 text-sm" data-testid="new-alert-btn">
              <Plus className="w-4 h-4" />
              تنبيه جديد
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "المهام", count: taskCount, icon: ClipboardList, color: "#0ea5e9", bg: "#f0f9ff" },
          { label: "التنبيهات", count: alertCount, icon: AlertTriangle, color: "#f59e0b", bg: "#fffbeb" },
          { label: "التعميمات", count: broadcastCount, icon: Megaphone, color: "#7c3aed", bg: "#f5f3ff" },
          { label: "غير مقروء", count: unreadCount, icon: Bell, color: unreadCount > 0 ? "#ef4444" : "#6b7280", bg: unreadCount > 0 ? "#fef2f2" : "#f9fafb" },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i} className="border-0 shadow-sm" data-testid={`notif-kpi-${i}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.bg, color: kpi.color }}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-black" style={{ color: kpi.color }}>{kpi.count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-4 h-10">
          <TabsTrigger value="all" className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-all">
            <Bell className="w-3.5 h-3.5" /> الكل
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 text-xs data-[state=active]:bg-sky-600 data-[state=active]:text-white" data-testid="tab-tasks">
            <ClipboardList className="w-3.5 h-3.5" /> مهامي
            {taskCount > 0 && <Badge className="text-[8px] px-1 py-0 h-4 bg-sky-200 text-sky-800">{taskCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5 text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white" data-testid="tab-alerts">
            <AlertTriangle className="w-3.5 h-3.5" /> تنبيهات
          </TabsTrigger>
          <TabsTrigger value="broadcasts" className="gap-1.5 text-xs data-[state=active]:bg-violet-600 data-[state=active]:text-white" data-testid="tab-broadcasts">
            <Megaphone className="w-3.5 h-3.5" /> تعميمات
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notifications List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : alerts.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              {activeTab === 'tasks' ? <ClipboardList className="w-8 h-8 text-muted-foreground" /> :
               activeTab === 'broadcasts' ? <Megaphone className="w-8 h-8 text-muted-foreground" /> :
               <Bell className="w-8 h-8 text-muted-foreground" />}
            </div>
            <p className="font-cairo font-bold text-lg text-muted-foreground">
              {activeTab === 'tasks' ? 'لا توجد مهام' : activeTab === 'broadcasts' ? 'لا توجد تعميمات' : 'لا توجد إشعارات'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === 'tasks' ? 'ستظهر هنا عندما يُكلّفك المدير بمهمة' :
               activeTab === 'broadcasts' ? 'ستظهر هنا التعميمات المرسلة من الإدارة' :
               'ستظهر هنا عند وصول تنبيهات جديدة'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const typeConfig = ALERT_TYPES[alert.type] || ALERT_TYPES.info;
            const priorityConfig = PRIORITIES[alert.priority] || PRIORITIES.normal;
            const Icon = typeConfig.icon;
            const isUnread = !alert.is_read;
            const isBroadcast = alert.type === 'broadcast';

            return (
              <Card key={alert.id}
                className={`border-r-4 transition-all ${typeConfig.color} ${isUnread ? 'shadow-md' : 'opacity-80'}`}
                data-testid={`notif-item-${alert.id}`}
                onClick={() => isUnread && handleMarkRead(alert.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isUnread ? '' : 'opacity-50'}`}
                      style={{ backgroundColor: 'white' }}>
                      <Icon className={`w-5 h-5 ${typeConfig.textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-cairo font-bold text-sm ${isUnread ? '' : 'text-muted-foreground'}`}>{alert.title}</h3>
                            {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                          </div>
                          {alert.message && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                          )}
                        </div>
                        <Badge className={`${priorityConfig.color} text-[9px] flex-shrink-0`}>
                          {priorityConfig.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                          {isBroadcast && alert.created_by && (
                            <span className="flex items-center gap-1"><Send className="w-3 h-3" />{alert.created_by}</span>
                          )}
                          <span>{DEPARTMENTS[alert.department] || alert.department}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTimeAgo(alert.received_at || alert.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isUnread && (
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-blue-600" onClick={(e) => { e.stopPropagation(); handleMarkRead(alert.id); }}>
                              <Eye className="w-3 h-3" /> قرأت
                            </Button>
                          )}
                          {canAddAlerts() && (
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(alert.id); }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Alert Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] font-cairo" dir="rtl">
          <DialogHeader>
            <DialogTitle>تنبيه جديد</DialogTitle>
            <DialogDescription>أضف تنبيه لإدارة أو لجميع الإدارات</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAlert} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>النوع</Label>
                <Select value={alertForm.type} onValueChange={v => setAlertForm({ ...alertForm, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency">طوارئ</SelectItem>
                    <SelectItem value="warning">تحذير</SelectItem>
                    <SelectItem value="info">معلومة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الأولوية</Label>
                <Select value={alertForm.priority} onValueChange={v => setAlertForm({ ...alertForm, priority: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
              <Label>الإدارة</Label>
              <Select value={alertForm.department} onValueChange={v => setAlertForm({ ...alertForm, department: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEPARTMENTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>العنوان *</Label>
              <Input value={alertForm.title} onChange={e => setAlertForm({ ...alertForm, title: e.target.value })} required className="mt-1" placeholder="مثال: ازدحام في الساحة الشمالية" />
            </div>
            <div>
              <Label>التفاصيل *</Label>
              <Textarea value={alertForm.message} onChange={e => setAlertForm({ ...alertForm, message: e.target.value })} required className="mt-1" rows={3} placeholder="تفاصيل التنبيه..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Broadcast Dialog */}
      <Dialog open={broadcastDialog} onOpenChange={setBroadcastDialog}>
        <DialogContent className="sm:max-w-[500px] font-cairo" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-violet-500" />
              تعميم جديد
            </DialogTitle>
            <DialogDescription>أرسل رسالة لجميع موظفي إدارة أو جميع الإدارات</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBroadcast} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الإدارة المستهدفة</Label>
                <Select value={broadcastForm.department} onValueChange={v => setBroadcastForm({ ...broadcastForm, department: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPARTMENTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الأولوية</Label>
                <Select value={broadcastForm.priority} onValueChange={v => setBroadcastForm({ ...broadcastForm, priority: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">عاجل</SelectItem>
                    <SelectItem value="high">مهم</SelectItem>
                    <SelectItem value="normal">عادي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>عنوان التعميم *</Label>
              <Input value={broadcastForm.title} onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })} required className="mt-1" placeholder="مثال: اجتماع طارئ الساعة 4" />
            </div>
            <div>
              <Label>نص التعميم</Label>
              <Textarea value={broadcastForm.message} onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })} className="mt-1" rows={3} placeholder="تفاصيل التعميم..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBroadcastDialog(false)}>إلغاء</Button>
              <Button type="submit" disabled={submitting} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
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
