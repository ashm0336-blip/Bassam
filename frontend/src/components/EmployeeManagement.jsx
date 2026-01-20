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
  UserX,
  MapPin,
  Clock
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEPARTMENTS = {
  planning: { ar: "تخطيط خدمات الحشود", en: "Crowd Planning" },
  plazas: { ar: "إدارة الساحات", en: "Plazas Management" },
  gates: { ar: "إدارة الأبواب", en: "Gates Management" },
  crowd_services: { ar: "خدمات حشود الحرم", en: "Crowd Services" },
  mataf: { ar: "صحن المطاف", en: "Mataf Management" }
};

const SHIFTS = [
  { value: "الأولى", label: "الأولى", color: "bg-blue-500" },
  { value: "الأولى صيف", label: "الأولى صيف", color: "bg-blue-500" },
  { value: "الأولى شتاء", label: "الأولى شتاء", color: "bg-blue-600" },
  { value: "الثانية", label: "الثانية", color: "bg-green-500" },
  { value: "الثانية صيف", label: "الثانية صيف", color: "bg-green-500" },
  { value: "الثانية شتاء", label: "الثانية شتاء", color: "bg-green-600" },
  { value: "الثالثة", label: "الثالثة", color: "bg-orange-500" },
  { value: "الثالثة صيف", label: "الثالثة صيف", color: "bg-orange-500" },
  { value: "الثالثة شتاء", label: "الثالثة شتاء", color: "bg-orange-600" },
  { value: "الرابعة", label: "الرابعة", color: "bg-purple-500" }
];

const REST_PATTERNS = [
  { value: "السبت - الأحد", label: "السبت - الأحد" },
  { value: "الخميس - الجمعة", label: "الخميس - الجمعة" },
  { value: "الجمعة - السبت", label: "الجمعة - السبت" },
  { value: "الأحد - الاثنين", label: "الأحد - الاثنين" }
];

export default function EmployeeManagement({ department }) {
  const { language } = useLanguage();
  const { user, isReadOnly } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [gates, setGates] = useState([]);
  const [stats, setStats] = useState({ total_employees: 0, active_employees: 0, inactive_employees: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    employee_number: "",
    job_title: "",
    location: "",
    shift: "الأولى",
    weekly_rest: "",
    work_tasks: "",
    department: department || user?.department || "planning"
  });

  useEffect(() => {
    fetchEmployees();
    fetchStats();
    if (department === 'gates') {
      fetchGates();
    }
  }, [department]);

  const fetchGates = async () => {
    try {
      const response = await axios.get(`${API}/gates`);
      setGates(response.data);
    } catch (error) {
      console.error("Error fetching gates:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const dept = department || user?.department;
      const url = dept ? `${API}/employees?department=${dept}` : `${API}/employees`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // تحديث الحالة تلقائياً حسب أيام الراحة
      const today = new Date().toLocaleDateString('ar-SA', { weekday: 'long' }).replace('يوم ', '');
      
      const updatedEmployees = response.data.map(emp => {
        if (emp.weekly_rest && emp.weekly_rest.includes(today)) {
          return {...emp, is_active: false, on_rest: true};
        }
        return emp;
      });
      
      setEmployees(updatedEmployees);
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
        location: employee.location || "",
        shift: employee.shift || "صباحية",
        department: employee.department,
        is_active: employee.is_active
      });
    } else {
      setEditMode(false);
      setSelectedEmployee(null);
      setFormData({
        name: "",
        job_title: "",
        location: "",
        shift: "الأولى",
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

  const handleQuickMove = async (employeeId, field, value) => {
    try {
      const token = localStorage.getItem("token");
      const updateData = { [field]: value };
      
      await axios.put(
        `${API}/employees/${employeeId}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(language === 'ar' ? 'تم التحديث' : 'Updated');
      fetchEmployees();
      fetchStats();
    } catch (error) {
      console.error("Error:", error);
      toast.error(language === 'ar' ? "فشل التحديث" : "Failed");
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
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-right flex-1">
          <h2 className="font-cairo font-bold text-xl text-right">
            {language === 'ar' ? 'إدارة الموظفين' : 'Employee Management'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 text-right">
            {department ? DEPARTMENTS[department]?.[language] : (language === 'ar' ? 'جميع الأقسام' : 'All Departments')}
          </p>
        </div>
        {!isReadOnly() && (
          <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 ml-2" />
            {language === 'ar' ? 'موظف جديد' : 'New Employee'}
          </Button>
        )}
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
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{language === 'ar' ? 'الموظف' : 'Employee'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الوردية' : 'Shift'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'أيام الراحة' : 'Rest Days'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'موقع التغطية' : 'Location'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-left">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="text-right">
                      <div>
                        <p className="font-medium">{employee.employee_number} - {employee.name}</p>
                        <p className="text-xs text-muted-foreground">{employee.job_title}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {!isReadOnly() && department === 'planning' ? (
                        <Select 
                          value={employee.shift || ""} 
                          onValueChange={(v) => handleQuickMove(employee.id, 'shift', v)}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue placeholder="الوردية..." />
                          </SelectTrigger>
                          <SelectContent>
                            {SHIFTS.map((shift) => (
                              <SelectItem key={shift.value} value={shift.value}>
                                {shift.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        employee.shift && (
                          <Badge 
                            className={`${SHIFTS.find(s => s.value === employee.shift)?.color || 'bg-gray-500'} text-white`}
                          >
                            {employee.shift}
                          </Badge>
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {!isReadOnly() && department === 'planning' ? (
                        <Select 
                          value={employee.weekly_rest || ""} 
                          onValueChange={(v) => handleQuickMove(employee.id, 'weekly_rest', v)}
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue placeholder="اختر..." />
                          </SelectTrigger>
                          <SelectContent>
                            {REST_PATTERNS.map((rest) => (
                              <SelectItem key={rest.value} value={rest.value}>
                                {rest.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        employee.weekly_rest && (
                          <Badge variant="outline">
                            {employee.weekly_rest}
                          </Badge>
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">{employee.location || '-'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                        </Badge>
                        {employee.on_rest && (
                          <span className="text-xs text-orange-600">☕ {language === 'ar' ? 'في راحة' : 'On Rest'}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center gap-2 justify-start">
                        {!isReadOnly() && department === 'gates' && gates.length > 0 && (
                          <Select 
                            value={employee.location} 
                            onValueChange={(newLocation) => handleQuickMove(employee.id, newLocation)}
                          >
                            <SelectTrigger className="h-8 w-32 text-xs">
                              <SelectValue placeholder="نقل..." />
                            </SelectTrigger>
                            <SelectContent>
                              {gates.filter(g => g.status === 'مفتوح').map((gate) => (
                                <SelectItem key={gate.id} value={gate.name}>
                                  {gate.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {!isReadOnly() && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(employee)}
                              className="h-8 w-8"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
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
                          </>
                        )}
                        {isReadOnly() && (
                          <Badge variant="secondary" className="text-xs">
                            {language === 'ar' ? 'قراءة فقط' : 'Read Only'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                <Label htmlFor="emp-number">{language === 'ar' ? 'الرقم الوظيفي' : 'Employee Number'}</Label>
                <Input
                  id="emp-number"
                  value={formData.employee_number}
                  onChange={(e) => setFormData({...formData, employee_number: e.target.value})}
                  required
                  className="mt-1"
                  placeholder={language === 'ar' ? 'مثال: 10344' : 'e.g., 10344'}
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
              
              {department === 'planning' && (
                <div>
                  <Label htmlFor="work-tasks">{language === 'ar' ? 'مهام العمل' : 'Work Tasks'}</Label>
                  <Input
                    id="work-tasks"
                    value={formData.work_tasks}
                    onChange={(e) => setFormData({...formData, work_tasks: e.target.value})}
                    className="mt-1"
                    placeholder={language === 'ar' ? 'مثال: الشؤون الإدارية' : 'e.g., Administrative Affairs'}
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="location">{language === 'ar' ? 'موقع التغطية' : 'Coverage Location'}</Label>
                {department === 'gates' && gates.length > 0 ? (
                  <Select value={formData.location} onValueChange={(value) => setFormData({...formData, location: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={language === 'ar' ? 'اختر باب...' : 'Select gate...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {gates.filter(g => g.status === 'مفتوح').map((gate) => (
                        <SelectItem key={gate.id} value={gate.name}>
                          {gate.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    required
                    className="mt-1"
                    placeholder={language === 'ar' ? 'مثال: الساحة الشمالية، باب الملك فهد' : 'e.g., North Plaza, King Fahd Gate'}
                  />
                )}
                {department === 'gates' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ar' ? 'يعرض فقط الأبواب المفتوحة' : 'Shows only open gates'}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="shift">{language === 'ar' ? 'الوردية' : 'Shift'}</Label>
                <Select value={formData.shift} onValueChange={(value) => setFormData({...formData, shift: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {SHIFTS.map(shift => (
                      <SelectItem key={shift.value} value={shift.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${shift.color}`} />
                          {shift.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {department === 'planning' && (
                <div>
                  <Label htmlFor="rest">{language === 'ar' ? 'أيام الراحة' : 'Rest Days'}</Label>
                  <Select value={formData.weekly_rest} onValueChange={(value) => setFormData({...formData, weekly_rest: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={language === 'ar' ? 'اختر أيام الراحة...' : 'Select rest days...'} />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {REST_PATTERNS.map(rest => (
                        <SelectItem key={rest.value} value={rest.value}>
                          {rest.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ar' ? 'الحالة ستُحسب تلقائياً حسب أيام الراحة' : 'Status will be calculated automatically'}
                  </p>
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
