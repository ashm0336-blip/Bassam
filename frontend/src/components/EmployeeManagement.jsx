import { useState, useEffect, useMemo } from "react";
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
  Clock,
  Coffee
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
  
  // Dynamic settings from department configuration
  const [shifts, setShifts] = useState([]);
  const [restPatterns, setRestPatterns] = useState([]);
  const [coverageLocations, setCoverageLocations] = useState([]);
  
  const [formData, setFormData] = useState({
    name: "",
    employee_number: "",
    job_title: "",
    location: "",
    shift: "",
    weekly_rest: "",
    work_tasks: "",
    department: department || user?.department || "planning"
  });

  useEffect(() => {
    fetchDepartmentSettings();
    fetchEmployees();
    fetchStats();
    if (department === 'gates') {
      fetchGates();
    }
    
    // Auto-refresh settings every 5 seconds for live updates
    const settingsInterval = setInterval(() => {
      fetchDepartmentSettings();
    }, 5000);
    
    return () => clearInterval(settingsInterval);
  }, [department]);

  const fetchDepartmentSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const dept = department || user?.department;
      if (!dept) return;

      const [shiftsRes, restRes, locationsRes] = await Promise.all([
        axios.get(`${API}/${dept}/settings/shifts`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${API}/${dept}/settings/rest_patterns`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${API}/${dept}/settings/coverage_locations`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);

      setShifts(shiftsRes.data);
      setRestPatterns(restRes.data);
      setCoverageLocations(locationsRes.data);
    } catch (error) {
      console.error("Error fetching department settings:", error);
    }
  };

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
      
      const [employeesRes, restPatternsRes] = await Promise.all([
        axios.get(url, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/${dept}/settings/rest_patterns`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);
      
      // Get today's day name in Arabic
      const today = new Date().toLocaleDateString('ar-SA', { weekday: 'long' }).replace('يوم ', '');
      
      const updatedEmployees = employeesRes.data.map(emp => {
        if (emp.weekly_rest) {
          // Find the rest pattern for this employee
          const restPattern = restPatternsRes.data.find(r => r.value === emp.weekly_rest);
          if (restPattern && restPattern.rest_days && restPattern.rest_days.includes(today)) {
            return {...emp, is_active: false, on_rest: true};
          }
        }
        return {...emp, is_active: true, on_rest: false};
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
        employee_number: employee.employee_number || "",
        job_title: employee.job_title,
        location: employee.location || "",
        shift: employee.shift || "الأولى",
        weekly_rest: employee.weekly_rest || "",
        work_tasks: employee.work_tasks || "",
        department: employee.department,
        is_active: employee.is_active
      });
    } else {
      setEditMode(false);
      setSelectedEmployee(null);
      setFormData({
        name: "",
        employee_number: "",
        job_title: "",
        location: "",
        shift: "الأولى",
        weekly_rest: "",
        work_tasks: "",
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


  // Calculate statistics dynamically using useMemo (recalculates when dependencies change)
  const statistics = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.is_active).length;
    const inactiveEmployees = employees.filter(e => !e.is_active).length;
    
    // Stats by shift
    const shiftStats = shifts.map(shift => ({
      ...shift,
      count: employees.filter(e => e.shift === shift.value).length
    }));
    
    // Stats by location
    const locationStats = coverageLocations.map(loc => ({
      ...loc,
      count: employees.filter(e => e.location === loc.value).length
    }));
    
    // Stats by rest pattern
    const restPatternStats = restPatterns.map(rest => ({
      ...rest,
      count: employees.filter(e => e.weekly_rest === rest.value).length
    }));
    
    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      shiftStats,
      locationStats,
      restPatternStats
    };
  }, [employees, shifts, coverageLocations, restPatterns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Stats */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-right">
                <p className="text-xs text-blue-700">{language === 'ar' ? 'إجمالي الموظفين' : 'Total Employees'}</p>
                <p className="text-3xl font-cairo font-bold text-blue-900">{statistics.totalEmployees}</p>
              </div>
              <Users className="w-10 h-10 text-blue-600" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200">
              <div className="text-center">
                <UserCheck className="w-4 h-4 mx-auto text-green-600 mb-1" />
                <p className="text-lg font-bold text-green-600">{statistics.activeEmployees}</p>
                <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'نشط' : 'Active'}</p>
              </div>
              <div className="text-center">
                <UserX className="w-4 h-4 mx-auto text-gray-600 mb-1" />
                <p className="text-lg font-bold text-gray-600">{statistics.inactiveEmployees}</p>
                <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'غير نشط' : 'Inactive'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shift Stats */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-right">
                <p className="text-xs text-purple-700">{language === 'ar' ? 'توزيع الورديات' : 'Shift Distribution'}</p>
                <p className="text-[10px] text-muted-foreground">{statistics.shiftStats.length} {language === 'ar' ? 'وردية' : 'shifts'}</p>
              </div>
              <Clock className="w-10 h-10 text-purple-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-purple-200 max-h-24 overflow-y-auto">
              {statistics.shiftStats.map(shift => (
                <div key={shift.id} className="text-center p-1">
                  <div 
                    className="w-3 h-3 rounded-full mx-auto mb-1" 
                    style={{ backgroundColor: shift.color }}
                  />
                  <p className="text-lg font-bold" style={{ color: shift.color }}>{shift.count}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{shift.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Location Stats */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-right">
                <p className="text-xs text-green-700">{language === 'ar' ? 'توزيع المواقع' : 'Location Distribution'}</p>
                <p className="text-[10px] text-muted-foreground">{statistics.locationStats.length} {language === 'ar' ? 'موقع' : 'locations'}</p>
              </div>
              <MapPin className="w-10 h-10 text-green-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-green-200 max-h-24 overflow-y-auto">
              {statistics.locationStats.map(loc => (
                <div key={loc.id} className="text-center p-1">
                  <MapPin className="w-4 h-4 mx-auto text-green-600 mb-1" />
                  <p className="text-lg font-bold text-green-600">{loc.count}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{loc.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rest Pattern Stats (if there are patterns) */}
      {statistics.restPatternStats.length > 0 && (
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-orange-700">{language === 'ar' ? 'توزيع أنماط الراحة' : 'Rest Pattern Distribution'}</p>
              </div>
              <Coffee className="w-8 h-8 text-orange-600" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {statistics.restPatternStats.map(rest => (
                <div key={rest.id} className="text-center p-2 rounded-lg bg-white dark:bg-card border border-orange-200">
                  <Coffee className="w-4 h-4 mx-auto text-orange-600 mb-1" />
                  <p className="text-xl font-bold text-orange-600">{rest.count}</p>
                  <p className="text-[10px] text-muted-foreground">{rest.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span>{language === 'ar' ? 'وقت الوردية' : 'Shift Time'}</span>
                    </div>
                  </TableHead>
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
                      {!isReadOnly() ? (
                        <Select 
                          value={employee.shift || ""} 
                          onValueChange={(v) => handleQuickMove(employee.id, 'shift', v)}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue placeholder="الوردية..." />
                          </SelectTrigger>
                          <SelectContent>
                            {shifts.map((shift) => (
                              <SelectItem key={shift.id} value={shift.value}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: shift.color }}
                                  />
                                  {shift.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        employee.shift && (
                          <Badge 
                            style={{ 
                              backgroundColor: shifts.find(s => s.value === employee.shift)?.color || '#6b7280' 
                            }}
                            className="text-white"
                          >
                            {employee.shift}
                          </Badge>
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {!isReadOnly() ? (
                        <Select 
                          value={employee.weekly_rest || ""} 
                          onValueChange={(v) => handleQuickMove(employee.id, 'weekly_rest', v)}
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue placeholder="اختر..." />
                          </SelectTrigger>
                          <SelectContent>
                            {restPatterns.map((rest) => (
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
                    <TableCell className="text-center text-sm">
                      {!isReadOnly() && coverageLocations.length > 0 ? (
                        <Select 
                          value={employee.location || ""} 
                          onValueChange={(v) => handleQuickMove(employee.id, 'location', v)}
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue placeholder="الموقع..." />
                          </SelectTrigger>
                          <SelectContent>
                            {coverageLocations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.value}>
                                {loc.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : !isReadOnly() && department === 'gates' && gates.length > 0 ? (
                        <Select 
                          value={employee.location || ""} 
                          onValueChange={(v) => handleQuickMove(employee.id, 'location', v)}
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue placeholder="الباب..." />
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
                        <span>{employee.location || '-'}</span>
                      )}
                    </TableCell>
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
                ) : coverageLocations.length > 0 ? (
                  <Select value={formData.location} onValueChange={(value) => setFormData({...formData, location: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={language === 'ar' ? 'اختر الموقع...' : 'Select location...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {coverageLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.value}>
                          {loc.label}
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
                {coverageLocations.length > 0 && department !== 'gates' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ar' ? 'من إعدادات القسم' : 'From department settings'}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="shift">{language === 'ar' ? 'الوردية' : 'Shift'}</Label>
                <Select value={formData.shift} onValueChange={(value) => setFormData({...formData, shift: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={language === 'ar' ? 'اختر الوردية...' : 'Select shift...'} />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {shifts.map(shift => (
                      <SelectItem key={shift.id} value={shift.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: shift.color }}
                          />
                          {shift.label}
                          {shift.start_time && shift.end_time && (
                            <span className="text-xs text-muted-foreground">
                              ({shift.start_time} - {shift.end_time})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="rest">{language === 'ar' ? 'نمط الراحة' : 'Rest Pattern'}</Label>
                <Select value={formData.weekly_rest} onValueChange={(value) => setFormData({...formData, weekly_rest: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={language === 'ar' ? 'اختر نمط الراحة...' : 'Select rest pattern...'} />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {restPatterns.map(rest => (
                      <SelectItem key={rest.id} value={rest.value}>
                        {rest.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' 
                    ? 'الحالة (نشط/غير نشط) ستُحسب تلقائياً حسب أيام الراحة' 
                    : 'Status (active/inactive) will be calculated automatically based on rest days'}
                </p>
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
