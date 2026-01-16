import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Plus,
  Edit,
  Trash2,
  Shield,
  Briefcase,
  UserCheck,
  Eye,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLES = {
  system_admin: { 
    label: { ar: "مسؤول النظام", en: "System Admin" }, 
    color: "bg-red-600", 
    icon: Shield 
  },
  general_manager: { 
    label: { ar: "المدير العام", en: "General Manager" }, 
    color: "bg-purple-500", 
    icon: Briefcase 
  },
  department_manager: { 
    label: { ar: "مدير إدارة", en: "Department Manager" }, 
    color: "bg-blue-500", 
    icon: Briefcase 
  },
  field_staff: { 
    label: { ar: "موظف ميداني", en: "Field Staff" }, 
    color: "bg-green-500", 
    icon: UserCheck 
  },
  monitoring_team: { 
    label: { ar: "فريق المراقبة", en: "Monitoring Team" }, 
    color: "bg-orange-500", 
    icon: Eye 
  }
};

const DEPARTMENTS = {
  planning: { ar: "تخطيط خدمات الحشود", en: "Crowd Planning" },
  plazas: { ar: "إدارة الساحات", en: "Plazas Management" },
  gates: { ar: "إدارة الأبواب", en: "Gates Management" },
  crowd_services: { ar: "خدمات حشود الحرم", en: "Crowd Services" },
  mataf: { ar: "صحن المطاف", en: "Mataf Management" }
};

export default function UserManagement() {
  const { language } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "field_staff",
    department: ""
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(language === 'ar' ? "فشل في جلب المستخدمين" : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditMode(true);
      setSelectedUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
        department: user.department || ""
      });
    } else {
      setEditMode(false);
      setSelectedUser(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "field_staff",
        department: ""
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const payload = { ...formData };
      
      if (editMode && !payload.password) {
        delete payload.password;
      }

      if (editMode) {
        await axios.put(`${API}/users/${selectedUser.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم تحديث المستخدم بنجاح" : "User updated successfully");
      } else {
        await axios.post(`${API}/users`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم إضافة المستخدم بنجاح" : "User created successfully");
      }
      
      setDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "An error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/users/${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? "تم حذف المستخدم بنجاح" : "User deleted successfully");
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "An error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = ROLES[role] || ROLES.field_staff;
    const Icon = roleConfig.icon;
    return (
      <Badge className={`${roleConfig.color} text-white flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />
        {roleConfig.label[language]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-right flex-1">
          <h2 className="font-cairo font-bold text-xl text-right">
            {language === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 text-right">
            {language === 'ar' ? 'إضافة وإدارة مستخدمي المنصة' : 'Add and manage platform users'}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 ml-2" />
          {language === 'ar' ? 'مستخدم جديد' : 'New User'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(ROLES).map(([key, config]) => {
          const count = users.filter(u => u.role === key).length;
          const Icon = config.icon;
          return (
            <Card key={key} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label[language]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">
            {language === 'ar' ? 'قائمة المستخدمين' : 'Users List'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? `إجمالي ${users.length} مستخدم` : `Total ${users.length} users`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الدور' : 'Role'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الإدارة' : 'Department'}</TableHead>
                  <TableHead>{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</TableHead>
                  <TableHead className="text-left">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="font-mono text-sm">{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.department ? (
                        <span className="text-sm">{DEPARTMENTS[user.department]?.[language] || user.department}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(user)}
                          className="h-8 w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {editMode 
                ? (language === 'ar' ? 'تعديل المستخدم' : 'Edit User')
                : (language === 'ar' ? 'مستخدم جديد' : 'New User')
              }
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'املأ المعلومات أدناه لإنشاء أو تعديل مستخدم' 
                : 'Fill in the information below to create or edit a user'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">{language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  disabled={editMode}
                  className="mt-1"
                  dir="ltr"
                />
              </div>
              
              <div>
                <Label htmlFor="password">
                  {language === 'ar' ? 'كلمة المرور' : 'Password'}
                  {editMode && <span className="text-xs text-muted-foreground mr-2">({language === 'ar' ? 'اتركها فارغة للإبقاء على القديمة' : 'leave empty to keep current'})</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!editMode}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="role">{language === 'ar' ? 'الدور' : 'Role'}</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5}>
                    {Object.entries(ROLES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label[language]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {(formData.role === 'department_manager' || formData.role === 'field_staff') && (
                <div>
                  <Label htmlFor="department">{language === 'ar' ? 'الإدارة' : 'Department'}</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={language === 'ar' ? 'اختر الإدارة' : 'Select department'} />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={5}>
                      {Object.entries(DEPARTMENTS).map(([key, labels]) => (
                        <SelectItem key={key} value={key}>
                          {labels[language]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                {editMode 
                  ? (language === 'ar' ? 'تحديث' : 'Update')
                  : (language === 'ar' ? 'إنشاء' : 'Create')
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? `هل أنت متأكد من حذف المستخدم "${selectedUser?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete user "${selectedUser?.name}"? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {language === 'ar' ? 'حذف' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
