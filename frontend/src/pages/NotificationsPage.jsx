import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import useAlertSound from "@/hooks/useAlertSound";
import { 
  Bell, 
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Filter,
  Plus,
  Volume2,
  VolumeX
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ALERT_TYPES = {
  emergency: { icon: AlertTriangle, color: "bg-red-100 border-red-300", textColor: "text-red-700", label: { ar: "طوارئ", en: "Emergency" } },
  warning: { icon: AlertCircle, color: "bg-orange-100 border-orange-300", textColor: "text-orange-700", label: { ar: "تحذير", en: "Warning" } },
  info: { icon: Info, color: "bg-blue-100 border-blue-300", textColor: "text-blue-700", label: { ar: "معلومة", en: "Info" } }
};

const PRIORITIES = {
  critical: { color: "bg-red-600 text-white", label: { ar: "حرج", en: "Critical" } },
  high: { color: "bg-orange-500 text-white", label: { ar: "عالي", en: "High" } },
  medium: { color: "bg-blue-500 text-white", label: { ar: "متوسط", en: "Medium" } },
  low: { color: "bg-gray-400 text-white", label: { ar: "منخفض", en: "Low" } }
};

const DEPARTMENTS = {
  all: { ar: "جميع الأقسام", en: "All Departments" },
  planning: { ar: "تخطيط خدمات الحشود", en: "Crowd Planning" },
  plazas: { ar: "إدارة الساحات", en: "Plazas" },
  gates: { ar: "إدارة الأبواب", en: "Gates" },
  crowd_services: { ar: "خدمات حشود الحرم", en: "Crowd Services" },
  mataf: { ar: "صحن المطاف", en: "Mataf" }
};

export default function NotificationsPage() {
  const { language } = useLanguage();
  const { canAddAlerts, user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    type: "warning",
    title: "",
    message: "",
    department: user?.department || "all",
    priority: "medium"
  });

  // Alert sound hook
  useAlertSound(alerts, soundEnabled);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API}/alerts`);
      setAlerts(response.data);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/admin/alerts`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? "تم إضافة التنبيه بنجاح" : "Alert added successfully");
      setDialogOpen(false);
      setFormData({
        type: "warning",
        title: "",
        message: "",
        department: user?.department || "all",
        priority: "medium"
      });
      fetchAlerts();
    } catch (error) {
      console.error("Error creating alert:", error);
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "An error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (alertId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/alerts/${alertId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? "تم حذف التنبيه" : "Alert deleted");
      fetchAlerts();
    } catch (error) {
      toast.error(language === 'ar' ? "فشل الحذف" : "Delete failed");
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    // دعم كلا الحقلين received_at و timestamp
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return language === 'ar' ? 'الآن' : 'Now';
    if (minutes < 60) return language === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
    if (hours < 24) return language === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
  };

  const filteredAlerts = filter === "all" 
    ? alerts 
    : alerts.filter(a => a.type === filter);

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className="space-y-6" data-testid="notifications-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-cairo font-bold text-2xl">
            {language === 'ar' ? 'الإشعارات والتنبيهات' : 'Notifications & Alerts'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'ar' ? 'مراقبة التنبيهات والإشعارات الهامة' : 'Monitor important alerts and notifications'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 ml-1" /> : <VolumeX className="w-4 h-4 ml-1" />}
            {soundEnabled ? (language === 'ar' ? 'الصوت' : 'Sound') : (language === 'ar' ? 'صامت' : 'Muted')}
          </Button>
          {canAddAlerts() && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              {language === 'ar' ? 'تنبيه جديد' : 'New Alert'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 justify-between">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{alerts.length}</p>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 justify-between">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{alerts.filter(a => a.type === 'emergency').length}</p>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'طوارئ' : 'Emergency'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 justify-between">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{alerts.filter(a => a.type === 'warning').length}</p>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'تحذيرات' : 'Warnings'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 justify-between">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{alerts.filter(a => a.type === 'info').length}</p>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'معلومات' : 'Info'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Tabs value={filter} onValueChange={setFilter} className="flex-1">
              <TabsList>
                <TabsTrigger value="all">{language === 'ar' ? 'الكل' : 'All'} ({alerts.length})</TabsTrigger>
                <TabsTrigger value="emergency">{language === 'ar' ? 'طوارئ' : 'Emergency'} ({alerts.filter(a => a.type === 'emergency').length})</TabsTrigger>
                <TabsTrigger value="warning">{language === 'ar' ? 'تحذيرات' : 'Warnings'} ({alerts.filter(a => a.type === 'warning').length})</TabsTrigger>
                <TabsTrigger value="info">{language === 'ar' ? 'معلومات' : 'Info'} ({alerts.filter(a => a.type === 'info').length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا توجد تنبيهات' : 'No alerts'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => {
            const typeConfig = ALERT_TYPES[alert.type] || ALERT_TYPES.info;
            const priorityConfig = PRIORITIES[alert.priority] || PRIORITIES.medium;
            const Icon = typeConfig.icon;

            return (
              <Card key={alert.id} className={`border-l-4 ${typeConfig.color}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg ${typeConfig.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${typeConfig.textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm mb-1">{alert.title}</h3>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                        </div>
                        <Badge className={`${priorityConfig.color} text-xs mr-2`}>
                          {priorityConfig.label[language]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{DEPARTMENTS[alert.department]?.[language] || alert.department}</span>
                          <span>•</span>
                          <span>{formatTime(alert.received_at || alert.timestamp)}</span>
                        </div>
                        {canAddAlerts() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(alert.id)}
                            className="text-destructive h-7"
                          >
                            <Trash2 className="w-3 h-3 ml-1" />
                            {language === 'ar' ? 'حذف' : 'Delete'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Alert Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {language === 'ar' ? 'تنبيه جديد' : 'New Alert'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'املأ المعلومات أدناه لإضافة تنبيه جديد' 
                : 'Fill in the information to add a new alert'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {Object.entries(ALERT_TYPES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label[language]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'الأولوية' : 'Priority'}</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {Object.entries(PRIORITIES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label[language]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{language === 'ar' ? 'القسم' : 'Department'}</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {Object.entries(DEPARTMENTS).map(([key, labels]) => (
                      <SelectItem key={key} value={key}>
                        {labels[language]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{language === 'ar' ? 'العنوان' : 'Title'}</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  className="mt-1"
                  placeholder={language === 'ar' ? 'مثال: ازدحام شديد في الساحة الشمالية' : 'e.g., Heavy congestion in North Plaza'}
                />
              </div>

              <div>
                <Label>{language === 'ar' ? 'الرسالة' : 'Message'}</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  required
                  className="mt-1"
                  rows={3}
                  placeholder={language === 'ar' ? 'تفاصيل التنبيه...' : 'Alert details...'}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={submitting}>
                {language === 'ar' ? 'إضافة' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
