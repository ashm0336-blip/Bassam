import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRealtimeRefresh } from "@/context/WebSocketContext";
import HijriDateTimePicker from "@/components/HijriDateTimePicker";
import {
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Filter,
  Plus,
  Clock,
  Edit,
  X,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUSES = [
  { value: "وارد", label: "وارد", color: "bg-blue-100 text-blue-800" },
  { value: "قيد الإجراء", label: "قيد الإجراء", color: "bg-yellow-100 text-yellow-800" },
  { value: "بانتظار رد", label: "بانتظار رد", color: "bg-orange-100 text-orange-800" },
  { value: "مكتمل", label: "مكتمل", color: "bg-green-100 text-green-800" }
];

const PRIORITIES = [
  { value: "critical", label: "حرج", color: "bg-red-600 text-white" },
  { value: "high", label: "عالي", color: "bg-orange-500 text-white" },
  { value: "medium", label: "متوسط", color: "bg-blue-500 text-white" },
  { value: "low", label: "منخفض", color: "bg-gray-400 text-white" }
];

const ALERT_TYPES = {
  emergency: { icon: AlertTriangle, label: "طوارئ", color: "bg-red-100 text-red-700" },
  warning: { icon: AlertCircle, label: "تحذير", color: "bg-orange-100 text-orange-700" },
  info: { icon: Info, label: "معلومة", color: "bg-blue-100 text-blue-700" }
};

const DEPARTMENTS = [
  { value: "planning", label: "تخطيط خدمات الحشود" },
  { value: "gates", label: "إدارة الأبواب" },
  { value: "plazas", label: "إدارة الساحات" },
  { value: "mataf", label: "صحن المطاف" },
  { value: "crowd_services", label: "خدمات الحشود" },
  { value: "all", label: "جميع الأقسام" }
];

export default function AlertsPage() {
  const { language } = useLanguage();
  const { isAdmin, user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState("received_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const [formData, setFormData] = useState({
    type: "warning",
    title: "",
    message: "",
    department: user?.department || "all",
    priority: "medium",
    status: "وارد",
    received_at: new Date().toISOString()
  });

  // Fetch alerts function - defined before hooks that use it
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/alerts`);
      setAlerts(response.data);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useRealtimeRefresh(["alerts"], fetchAlerts);

  // Calculate duration dynamically
  const calculateDuration = (alert) => {
    const receivedAt = new Date(alert.received_at);
    const endTime = alert.closed_at ? new Date(alert.closed_at) : new Date();
    const diffMs = endTime - receivedAt;
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return { hours, minutes, text: `${hours}س ${minutes}د` };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate received_at is not in future
    if (new Date(formData.received_at) > new Date()) {
      toast.error("لا يمكن أن يكون تاريخ الاستلام في المستقبل");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/admin/alerts`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("تم إضافة البلاغ بنجاح");
      setDialogOpen(false);
      setFormData({
        type: "warning",
        title: "",
        message: "",
        department: user?.department || "all",
        priority: "medium",
        status: "وارد",
        received_at: new Date().toISOString()
      });
      fetchAlerts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (alertId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/alerts/${alertId}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("تم تحديث الحالة");
      fetchAlerts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل التحديث");
    }
  };

  const [deleteAlertId, setDeleteAlertId] = useState(null);

  const handleDelete = async (alertId) => {
    setDeleteAlertId(alertId);
  };

  const confirmDeleteAlert = async () => {
    if (!deleteAlertId) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/alerts/${deleteAlertId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("تم حذف البلاغ");
      fetchAlerts();
    } catch (error) {
      toast.error("فشل الحذف");
    } finally { setDeleteAlertId(null); }
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filterStatus !== "all" && alert.status !== filterStatus) return false;
    if (filterPriority !== "all" && alert.priority !== filterPriority) return false;
    if (filterDepartment !== "all" && alert.department !== filterDepartment) return false;
    return true;
  });

  // Sort alerts
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (sortBy === "duration") {
      const durationA = calculateDuration(a).hours * 60 + calculateDuration(a).minutes;
      const durationB = calculateDuration(b).hours * 60 + calculateDuration(b).minutes;
      return sortOrder === "asc" ? durationA - durationB : durationB - durationA;
    }
    if (sortBy === "received_at") {
      const dateA = new Date(a.received_at);
      const dateB = new Date(b.received_at);
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  const stats = {
    total: alerts.length,
    open: alerts.filter(a => a.status !== "مكتمل").length,
    completed: alerts.filter(a => a.status === "مكتمل").length,
    critical: alerts.filter(a => a.priority === "critical").length
  };

  return (
    <div className="space-y-3 sm:space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-cairo font-bold text-base sm:text-xl text-right">إدارة البلاغات</h2>
          <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 text-right">متابعة وإدارة جميع البلاغات</p>
        </div>
        {isAdmin() && (
          <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-primary flex-shrink-0 h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-4">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
            <span className="hidden sm:inline">بلاغ جديد</span>
            <span className="sm:hidden">جديد</span>
          </Button>
        )}
      </div>

      {/* Stats — horizontal scrollable on mobile */}
      <div className="flex sm:grid sm:grid-cols-4 gap-2 sm:gap-4 overflow-x-auto no-scrollbar pb-1">
        {[
          { label: "الإجمالي", value: stats.total, icon: FileText, color: "text-primary" },
          { label: "مفتوحة", value: stats.open, icon: Clock, color: "text-yellow-600" },
          { label: "مكتملة", value: stats.completed, icon: CheckCircle2, color: "text-green-600" },
          { label: "حرجة", value: stats.critical, icon: AlertTriangle, color: "text-red-600" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="flex-shrink-0 w-[130px] sm:w-auto">
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-right min-w-0">
                    <p className="text-[9px] sm:text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-lg sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                  <Icon className={`w-5 h-5 sm:w-8 sm:h-8 ${s.color} flex-shrink-0`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-2.5 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-28 sm:w-40 flex-shrink-0 h-8 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-28 sm:w-40 flex-shrink-0 h-8 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأولويات</SelectItem>
                {PRIORITIES.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-28 sm:w-48 flex-shrink-0 h-8 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="القسم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأقسام</SelectItem>
                {DEPARTMENTS.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-28 sm:w-40 flex-shrink-0 h-8 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="ترتيب حسب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="received_at">تاريخ الاستلام</SelectItem>
                <SelectItem value="duration">مدة البلاغ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-center">الأولوية</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center">تاريخ الاستلام</TableHead>
                  <TableHead className="text-center">مدة البلاغ</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAlerts.map((alert) => {
                  const alertType = ALERT_TYPES[alert.type] || ALERT_TYPES.info;
                  const Icon = alertType.icon;
                  const duration = calculateDuration(alert);
                  const priorityConfig = PRIORITIES.find(p => p.value === alert.priority);
                  const statusConfig = STATUSES.find(s => s.value === alert.status);

                  return (
                    <TableRow key={alert.id}>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm">{alertType.label}</span>
                          <div className={`w-8 h-8 rounded-lg ${alertType.color} flex items-center justify-center`}>
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.message?.substring(0, 50)}...</p>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {DEPARTMENTS.find(d => d.value === alert.department)?.label || alert.department}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={priorityConfig?.color || "bg-gray-400"}>
                          {priorityConfig?.label || alert.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Select 
                          value={alert.status} 
                          onValueChange={(v) => handleStatusUpdate(alert.id, v)}
                          disabled={!isAdmin()}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => (
                              <SelectItem key={s.value} value={s.value}>
                                <Badge className={s.color}>{s.label}</Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {new Date(alert.received_at).toLocaleString('ar-SA', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">
                          {duration.text}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {isAdmin() && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(alert.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Alert Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-cairo text-right">بلاغ جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-right block mb-2">النوع *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency">طوارئ</SelectItem>
                    <SelectItem value="warning">تحذير</SelectItem>
                    <SelectItem value="info">معلومة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-right block mb-2">الأولوية *</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-right block mb-2">القسم *</Label>
              <Select value={formData.department} onValueChange={(v) => setFormData({...formData, department: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <HijriDateTimePicker
                label="تاريخ ووقت الاستلام"
                value={formData.received_at}
                onChange={(date) => setFormData({...formData, received_at: date})}
                maxDate={new Date()}
                required
              />
            </div>

            <div>
              <Label className="text-right block mb-2">العنوان *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="text-right"
                required
              />
            </div>

            <div>
              <Label className="text-right block mb-2">التفاصيل *</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                className="text-right min-h-[100px]"
                required
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteAlertId} onOpenChange={(open) => { if (!open) setDeleteAlertId(null); }}>
        <DialogContent className="font-cairo max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle className="text-destructive">تأكيد الحذف</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">هل أنت متأكد من حذف هذا البلاغ؟</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAlertId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={confirmDeleteAlert}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
