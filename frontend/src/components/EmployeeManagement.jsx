import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Plus,
  Edit,
  Trash2,
  Users,
  Loader2,
  UserCheck,
  UserX
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

const DEPARTMENTS = {
  planning: { ar: "تخطيط خدمات الحشود", en: "Crowd Planning" },
  plazas: { ar: "إدارة الساحات", en: "Plazas Management" },
  gates: { ar: "إدارة الأبواب", en: "Gates Management" },
  crowd_services: { ar: "خدمات حشود الحرم", en: "Crowd Services" },
  mataf: { ar: "صحن المطاف", en: "Mataf Management" }
};

export default function EmployeeManagement({ department }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ total_employees: 0, active_employees: 0, inactive_employees: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    job_title: "",
    location: "",
    shift: "صباحية",
    department: department || user?.department || "planning",
    is_active: true
  });

  useEffect(() => {
    fetchEmployees();
    fetchStats();
  }, [department]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const dept = department || user?.department;
      const url = dept ? `${API}/employees?department=${dept}` : `${API}/employees`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error(language === 'ar' ? "فشل في جلب الموظفين" : "Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const dept = department || user?.department;
      if (!dept) return;
      
      const response = await axios.get(`${API}/employees/stats/${dept}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setEditMode(true);
      setSelectedEmployee(employee);
      setFormData({
        name: employee.name,
        job_title: employee.job_title,
        department: employee.department,
        is_active: employee.is_active
      });
    } else {
      setEditMode(false);
      setSelectedEmployee(null);
      setFormData({
        name: "",
        job_title: "",
        department: department || user?.department || "planning",
        is_active: true
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      
      if (editMode) {
        await axios.put(`${API}/employees/${selectedEmployee.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم تحديث الموظف بنجاح" : "Employee updated successfully");
      } else {
        await axios.post(`${API}/employees`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم إضافة الموظف بنجاح" : "Employee added successfully");
      }
      
      setDialogOpen(false);
      fetchEmployees();
      fetchStats();
    } catch (error) {
      console.error("Error saving employee:", error);
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "An error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/employees/${selectedEmployee.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? "تم حذف الموظف بنجاح" : "Employee deleted successfully");
      setDeleteDialogOpen(false);
      fetchEmployees();
      fetchStats();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "An error occurred"));
    } finally {
      setSubmitting(false);
    }
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
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 justify-between">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.total_employees}</p>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إجمالي الموظفين' : 'Total Employees'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 justify-between">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.active_employees}</p>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'الموظفون النشطون' : 'Active Employees'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 justify-between">
              <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                <UserX className="w-5 h-5 text-gray-500" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.inactive_employees}</p>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'موظفون غير نشطين' : 'Inactive Employees'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 ml-2" />
          {language === 'ar' ? 'موظف جديد' : 'New Employee'}
        </Button>
        <div className="text-right flex-1">
          <h2 className="font-cairo font-bold text-xl text-right">
            {language === 'ar' ? 'إدارة الموظفين' : 'Employee Management'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 text-right">
            {department ? DEPARTMENTS[department]?.[language] : (language === 'ar' ? 'جميع الأقسام' : 'All Departments')}
          </p>
        </div>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo text-right">
            {language === 'ar' ? 'قائمة الموظفين' : 'Employees List'}
          </CardTitle>
          <CardDescription className="text-right">
            {language === 'ar' ? `إجمالي ${employees.length} موظف` : `Total ${employees.length} employees`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(employee)}
                          className="h-8 w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={employee.is_active ? "default" : "secondary"}>
                        {employee.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{employee.job_title}</TableCell>
                    <TableCell className="font-medium text-center">{employee.name}</TableCell>
                  </TableRow>
                ))}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا يوجد موظفين' : 'No employees found'}
                    </TableCell>
                  </TableRow>
                )}
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
                ? (language === 'ar' ? 'تعديل الموظف' : 'Edit Employee')
                : (language === 'ar' ? 'موظف جديد' : 'New Employee')
              }
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'املأ المعلومات أدناه لإنشاء أو تعديل موظف' 
                : 'Fill in the information below to create or edit an employee'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="emp-name">{language === 'ar' ? 'اسم الموظف' : 'Employee Name'}</Label>
                <Input
                  id="emp-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="mt-1"
                  placeholder={language === 'ar' ? 'مثال: محمد أحمد' : 'e.g., Mohammed Ahmed'}
                />
              </div>
              
              <div>
                <Label htmlFor="job-title">{language === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}</Label>
                <Input
                  id="job-title"
                  value={formData.job_title}
                  onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                  required
                  className="mt-1"
                  placeholder={language === 'ar' ? 'مثال: مشرف ميداني' : 'e.g., Field Supervisor'}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <Label className="font-medium">{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'هل الموظف نشط حالياً؟' : 'Is the employee currently active?'}
                  </p>
                </div>
                <Switch 
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                {editMode 
                  ? (language === 'ar' ? 'تحديث' : 'Update')
                  : (language === 'ar' ? 'إضافة' : 'Add')
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
                ? `هل أنت متأكد من حذف الموظف "${selectedEmployee?.name}"؟`
                : `Are you sure you want to delete employee "${selectedEmployee?.name}"?`
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
