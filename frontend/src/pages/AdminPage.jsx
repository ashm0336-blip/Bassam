import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { 
  Settings,
  DoorOpen,
  LayoutGrid,
  Circle,
  Users,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// User Form Dialog
const UserDialog = ({ open, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    onSave(formData);
    setFormData({ name: "", email: "", password: "", role: "user" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-cairo">إضافة مستخدم جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>الاسم الكامل</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="محمد أحمد"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@crowd.sa"
              dir="ltr"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>كلمة المرور</Label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              dir="ltr"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>الصلاحية</Label>
            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">مدير النظام</SelectItem>
                <SelectItem value="manager">مشرف</SelectItem>
                <SelectItem value="supervisor">منسق</SelectItem>
                <SelectItem value="user">مستخدم</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" className="bg-primary">إضافة المستخدم</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Gate Form Dialog
const GateDialog = ({ open, onClose, gate, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    number: 1,
    status: "open",
    direction: "both",
    current_flow: 0,
    max_flow: 5000,
    location: "الجهة الشمالية"
  });

  useEffect(() => {
    if (gate) {
      setFormData(gate);
    } else {
      setFormData({
        name: "",
        number: 1,
        status: "open",
        direction: "both",
        current_flow: 0,
        max_flow: 5000,
        location: "الجهة الشمالية"
      });
    }
  }, [gate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-cairo">
            {gate ? "تعديل الباب" : "إضافة باب جديد"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم الباب</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="باب الملك عبدالعزيز"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الباب</Label>
              <Input
                type="number"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">مفتوح</SelectItem>
                  <SelectItem value="closed">مغلق</SelectItem>
                  <SelectItem value="maintenance">صيانة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الاتجاه</Label>
              <Select value={formData.direction} onValueChange={(v) => setFormData({ ...formData, direction: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">دخول</SelectItem>
                  <SelectItem value="exit">خروج</SelectItem>
                  <SelectItem value="both">دخول/خروج</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>التدفق الحالي</Label>
              <Input
                type="number"
                value={formData.current_flow}
                onChange={(e) => setFormData({ ...formData, current_flow: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>الطاقة القصوى</Label>
              <Input
                type="number"
                value={formData.max_flow}
                onChange={(e) => setFormData({ ...formData, max_flow: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>الموقع</Label>
            <Select value={formData.location} onValueChange={(v) => setFormData({ ...formData, location: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="الجهة الشمالية">الجهة الشمالية</SelectItem>
                <SelectItem value="الجهة الجنوبية">الجهة الجنوبية</SelectItem>
                <SelectItem value="الجهة الشرقية">الجهة الشرقية</SelectItem>
                <SelectItem value="الجهة الغربية">الجهة الغربية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" className="bg-primary">{gate ? "تحديث" : "إضافة"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Plaza Form Dialog
const PlazaDialog = ({ open, onClose, plaza, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    zone: "north",
    current_crowd: 0,
    max_capacity: 40000
  });

  useEffect(() => {
    if (plaza) {
      setFormData(plaza);
    } else {
      setFormData({
        name: "",
        zone: "north",
        current_crowd: 0,
        max_capacity: 40000
      });
    }
  }, [plaza]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-cairo">
            {plaza ? "تعديل الساحة" : "إضافة ساحة جديدة"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>اسم الساحة</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="الساحة الشمالية"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>المنطقة</Label>
            <Select value={formData.zone} onValueChange={(v) => setFormData({ ...formData, zone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="north">شمال</SelectItem>
                <SelectItem value="south">جنوب</SelectItem>
                <SelectItem value="east">شرق</SelectItem>
                <SelectItem value="west">غرب</SelectItem>
                <SelectItem value="masa">المسعى</SelectItem>
                <SelectItem value="ajyad">أجياد</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الحشود الحالية</Label>
              <Input
                type="number"
                value={formData.current_crowd}
                onChange={(e) => setFormData({ ...formData, current_crowd: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>الطاقة القصوى</Label>
              <Input
                type="number"
                value={formData.max_capacity}
                onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" className="bg-primary">{plaza ? "تحديث" : "إضافة"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Alert Form Dialog
const AlertDialog = ({ open, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    type: "info",
    title: "",
    message: "",
    department: "all",
    priority: "medium"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ type: "info", title: "", message: "", department: "all", priority: "medium" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-cairo">إنشاء تنبيه جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>النوع</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">طوارئ</SelectItem>
                  <SelectItem value="warning">تحذير</SelectItem>
                  <SelectItem value="info">معلومات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الأولوية</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">حرج</SelectItem>
                  <SelectItem value="high">عالي</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="low">منخفض</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>العنوان</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="عنوان التنبيه"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>الرسالة</Label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="تفاصيل التنبيه..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>الإدارة</Label>
            <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الإدارات</SelectItem>
                <SelectItem value="gates">الأبواب</SelectItem>
                <SelectItem value="plazas">الساحات</SelectItem>
                <SelectItem value="mataf">المطاف</SelectItem>
                <SelectItem value="planning">التخطيط</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" className="bg-primary">إرسال التنبيه</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [gates, setGates] = useState([]);
  const [plazas, setPlazas] = useState([]);
  const [mataf, setMataf] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [gateDialog, setGateDialog] = useState({ open: false, gate: null });
  const [plazaDialog, setPlazaDialog] = useState({ open: false, plaza: null });
  const [alertDialog, setAlertDialog] = useState(false);
  const [userDialog, setUserDialog] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gatesRes, plazasRes, matafRes, usersRes] = await Promise.all([
        axios.get(`${API}/gates`),
        axios.get(`${API}/plazas`),
        axios.get(`${API}/mataf`),
        axios.get(`${API}/admin/users`).catch(() => ({ data: [] }))
      ]);
      setGates(gatesRes.data);
      setPlazas(plazasRes.data);
      setMataf(matafRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Gate operations
  const saveGate = async (data) => {
    try {
      if (data.id) {
        await axios.put(`${API}/admin/gates/${data.id}`, data);
        toast.success("تم تحديث الباب بنجاح");
      } else {
        await axios.post(`${API}/admin/gates`, data);
        toast.success("تم إضافة الباب بنجاح");
      }
      setGateDialog({ open: false, gate: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "حدث خطأ");
    }
  };

  const deleteGate = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الباب؟")) return;
    try {
      await axios.delete(`${API}/admin/gates/${id}`);
      toast.success("تم حذف الباب بنجاح");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "حدث خطأ");
    }
  };

  // Plaza operations
  const savePlaza = async (data) => {
    try {
      if (data.id) {
        await axios.put(`${API}/admin/plazas/${data.id}`, data);
        toast.success("تم تحديث الساحة بنجاح");
      } else {
        await axios.post(`${API}/admin/plazas`, data);
        toast.success("تم إضافة الساحة بنجاح");
      }
      setPlazaDialog({ open: false, plaza: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "حدث خطأ");
    }
  };

  const deletePlaza = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الساحة؟")) return;
    try {
      await axios.delete(`${API}/admin/plazas/${id}`);
      toast.success("تم حذف الساحة بنجاح");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "حدث خطأ");
    }
  };

  // Alert operations
  const createAlert = async (data) => {
    try {
      await axios.post(`${API}/admin/alerts`, data);
      toast.success("تم إنشاء التنبيه بنجاح");
      setAlertDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "حدث خطأ");
    }
  };

  // User operations
  const createUser = async (data) => {
    try {
      await axios.post(`${API}/admin/users`, data);
      toast.success("تم إنشاء المستخدم بنجاح");
      setUserDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "حدث خطأ");
    }
  };

  // Quick update for flow/crowd
  const quickUpdateGate = async (id, field, value) => {
    try {
      await axios.put(`${API}/admin/gates/${id}`, { [field]: value });
      fetchData();
    } catch (error) {
      toast.error("حدث خطأ في التحديث");
    }
  };

  const quickUpdatePlaza = async (id, field, value) => {
    try {
      await axios.put(`${API}/admin/plazas/${id}`, { [field]: value });
      fetchData();
    } catch (error) {
      toast.error("حدث خطأ في التحديث");
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-cairo font-bold text-2xl">لوحة الإدارة</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة البيانات والإعدادات</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button className="bg-destructive hover:bg-destructive/90" onClick={() => setAlertDialog(true)}>
            <AlertTriangle className="w-4 h-4 ml-2" />
            تنبيه جديد
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="gates" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="gates" className="gap-2">
            <DoorOpen className="w-4 h-4" />
            الأبواب ({gates.length})
          </TabsTrigger>
          <TabsTrigger value="plazas" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            الساحات ({plazas.length})
          </TabsTrigger>
          <TabsTrigger value="mataf" className="gap-2">
            <Circle className="w-4 h-4" />
            المطاف ({mataf.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            المستخدمين ({users.length})
          </TabsTrigger>
        </TabsList>

        {/* Gates Tab */}
        <TabsContent value="gates" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-cairo text-lg">إدارة الأبواب</CardTitle>
              <Button onClick={() => setGateDialog({ open: true, gate: null })} data-testid="add-gate-btn">
                <Plus className="w-4 h-4 ml-2" />
                إضافة باب
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الرقم</TableHead>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الاتجاه</TableHead>
                    <TableHead className="text-right">التدفق الحالي</TableHead>
                    <TableHead className="text-right">الطاقة القصوى</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gates.map((gate) => (
                    <TableRow key={gate.id}>
                      <TableCell>{gate.number}</TableCell>
                      <TableCell className="font-medium">{gate.name}</TableCell>
                      <TableCell>
                        <Badge className={
                          gate.status === "open" ? "bg-primary" :
                          gate.status === "closed" ? "bg-destructive" : "bg-secondary"
                        }>
                          {gate.status === "open" ? "مفتوح" : gate.status === "closed" ? "مغلق" : "صيانة"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {gate.direction === "entry" ? "دخول" : gate.direction === "exit" ? "خروج" : "دخول/خروج"}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={gate.current_flow}
                          onChange={(e) => quickUpdateGate(gate.id, "current_flow", parseInt(e.target.value))}
                          className="w-24 h-8"
                        />
                      </TableCell>
                      <TableCell>{gate.max_flow?.toLocaleString('ar-SA')}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setGateDialog({ open: true, gate })}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteGate(gate.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {gates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        لا توجد أبواب. اضغط "إضافة باب" للبدء.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plazas Tab */}
        <TabsContent value="plazas" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-cairo text-lg">إدارة الساحات</CardTitle>
              <Button onClick={() => setPlazaDialog({ open: true, plaza: null })} data-testid="add-plaza-btn">
                <Plus className="w-4 h-4 ml-2" />
                إضافة ساحة
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">المنطقة</TableHead>
                    <TableHead className="text-right">الحشود الحالية</TableHead>
                    <TableHead className="text-right">الطاقة القصوى</TableHead>
                    <TableHead className="text-right">النسبة</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plazas.map((plaza) => (
                    <TableRow key={plaza.id}>
                      <TableCell className="font-medium">{plaza.name}</TableCell>
                      <TableCell>{plaza.zone}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={plaza.current_crowd}
                          onChange={(e) => quickUpdatePlaza(plaza.id, "current_crowd", parseInt(e.target.value))}
                          className="w-28 h-8"
                        />
                      </TableCell>
                      <TableCell>{plaza.max_capacity?.toLocaleString('ar-SA')}</TableCell>
                      <TableCell>
                        <Badge className={
                          plaza.percentage < 70 ? "bg-primary" :
                          plaza.percentage < 85 ? "bg-secondary" : "bg-destructive"
                        }>
                          {plaza.percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setPlazaDialog({ open: true, plaza })}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deletePlaza(plaza.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {plazas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        لا توجد ساحات. اضغط "إضافة ساحة" للبدء.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mataf Tab */}
        <TabsContent value="mataf" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-cairo text-lg">إدارة صحن المطاف</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الطابق</TableHead>
                    <TableHead className="text-right">الحشود الحالية</TableHead>
                    <TableHead className="text-right">الطاقة القصوى</TableHead>
                    <TableHead className="text-right">متوسط الطواف</TableHead>
                    <TableHead className="text-right">النسبة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mataf.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-medium">{level.level}</TableCell>
                      <TableCell>{level.current_crowd?.toLocaleString('ar-SA')}</TableCell>
                      <TableCell>{level.max_capacity?.toLocaleString('ar-SA')}</TableCell>
                      <TableCell>{level.average_tawaf_time} دقيقة</TableCell>
                      <TableCell>
                        <Badge className={
                          level.percentage < 70 ? "bg-primary" :
                          level.percentage < 85 ? "bg-secondary" : "bg-destructive"
                        }>
                          {level.percentage}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {mataf.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        لا توجد بيانات لطوابق المطاف.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-cairo text-lg">إدارة المستخدمين</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">الصلاحية</TableHead>
                    <TableHead className="text-right">تاريخ التسجيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell dir="ltr">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.role === "admin" ? "مدير" : 
                           user.role === "manager" ? "مشرف" : 
                           user.role === "supervisor" ? "منسق" : "مستخدم"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString('ar-SA')}</TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        لا يوجد مستخدمون مسجلون.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <GateDialog 
        open={gateDialog.open} 
        onClose={() => setGateDialog({ open: false, gate: null })}
        gate={gateDialog.gate}
        onSave={saveGate}
      />
      <PlazaDialog 
        open={plazaDialog.open} 
        onClose={() => setPlazaDialog({ open: false, plaza: null })}
        plaza={plazaDialog.plaza}
        onSave={savePlaza}
      />
      <AlertDialog 
        open={alertDialog} 
        onClose={() => setAlertDialog(false)}
        onSave={createAlert}
      />
    </div>
  );
}
