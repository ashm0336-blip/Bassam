import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Bell, 
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Filter,
  MailOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NotificationCard = ({ notification, selected, onSelect }) => {
  const typeConfig = {
    alert: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive border-destructive/20" },
    info: { icon: Info, color: "bg-blue-100 text-blue-600 border-blue-200" },
    system: { icon: Bell, color: "bg-muted text-muted-foreground border-gray-200" }
  };

  const priorityConfig = {
    critical: { color: "bg-destructive text-white", label: "حرج" },
    high: { color: "bg-secondary text-secondary-foreground", label: "مهم" },
    medium: { color: "bg-blue-500 text-white", label: "متوسط" },
    low: { color: "bg-muted text-muted-foreground", label: "منخفض" }
  };

  const type = typeConfig[notification.type] || typeConfig.info;
  const priority = priorityConfig[notification.priority] || priorityConfig.medium;
  const Icon = type.icon;

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return date.toLocaleDateString('ar-SA');
  };

  return (
    <Card 
      className={`card-hover border ${notification.is_read ? 'bg-muted/30' : 'bg-white'}`}
      data-testid={`notification-${notification.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Checkbox 
            checked={selected}
            onCheckedChange={() => onSelect(notification.id)}
            className="mt-1"
          />
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type.color} border`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h3 className={`font-semibold text-sm ${notification.is_read ? 'text-muted-foreground' : ''}`}>
                {notification.title}
              </h3>
              <Badge className={`${priority.color} text-[10px]`}>{priority.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{notification.message}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{formatTime(notification.timestamp)}</span>
              {!notification.is_read && (
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get(`${API}/notifications`);
        setNotifications(response.data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map(n => n.id));
    }
  };

  const filteredNotifications = filter === "all" 
    ? notifications
    : filter === "unread"
    ? notifications.filter(n => !n.is_read)
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}><CardContent className="p-4 h-24 bg-muted/50" /></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="notifications-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-cairo font-bold text-2xl">الإشعارات والتنبيهات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            لديك <span className="font-bold text-primary">{unreadCount}</span> إشعارات غير مقروءة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" data-testid="mark-read-btn">
            <MailOpen className="w-4 h-4 ml-2" />
            تعليم الكل كمقروء
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <p className="text-2xl font-cairo font-bold">{notifications.filter(n => n.type === "alert").length}</p>
            <p className="text-xs text-muted-foreground">تنبيهات</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-cairo font-bold">{notifications.filter(n => n.type === "info").length}</p>
            <p className="text-xs text-muted-foreground">معلومات</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-cairo font-bold">{notifications.filter(n => n.type === "system").length}</p>
            <p className="text-xs text-muted-foreground">نظام</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-cairo font-bold">{notifications.filter(n => n.is_read).length}</p>
            <p className="text-xs text-muted-foreground">مقروءة</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      {selectedIds.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm">تم تحديد {selectedIds.length} إشعارات</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <MailOpen className="w-4 h-4 ml-1" />
                تعليم كمقروء
              </Button>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30">
                <Trash2 className="w-4 h-4 ml-1" />
                حذف
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tabs */}
      <Tabs value={filter} onValueChange={setFilter} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">الكل ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">غير مقروء ({unreadCount})</TabsTrigger>
            <TabsTrigger value="alert">تنبيهات</TabsTrigger>
            <TabsTrigger value="info">معلومات</TabsTrigger>
            <TabsTrigger value="system">نظام</TabsTrigger>
          </TabsList>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSelectAll}
            className="text-xs"
          >
            {selectedIds.length === filteredNotifications.length ? "إلغاء التحديد" : "تحديد الكل"}
          </Button>
        </div>

        <TabsContent value={filter} className="space-y-3 mt-0">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد إشعارات</p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification, index) => (
              <div key={notification.id} className={`animate-fade-in stagger-${(index % 5) + 1}`}>
                <NotificationCard 
                  notification={notification}
                  selected={selectedIds.includes(notification.id)}
                  onSelect={handleSelect}
                />
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
