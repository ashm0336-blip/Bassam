import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Plus, Edit, Trash2, Users, Loader2, UserCheck, UserX, MapPin, Clock, Coffee,
  CalendarDays, BarChart3, ChevronDown, ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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

const WEEK_DAYS = [
  { value: "السبت", short: "سبت" },
  { value: "الأحد", short: "أحد" },
  { value: "الإثنين", short: "إثنين" },
  { value: "الثلاثاء", short: "ثلاثاء" },
  { value: "الأربعاء", short: "أربعاء" },
  { value: "الخميس", short: "خميس" },
  { value: "الجمعة", short: "جمعة" },
];

function getTodayArabic() {
  const dayMap = { Saturday: "السبت", Sunday: "الأحد", Monday: "الإثنين", Tuesday: "الثلاثاء", Wednesday: "الأربعاء", Thursday: "الخميس", Friday: "الجمعة" };
  const enDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return dayMap[enDay] || "";
}

// Rest days multi-select component
function RestDaysPicker({ value = [], onChange, disabled }) {
  const toggle = (day) => {
    if (disabled) return;
    const current = value || [];
    if (current.includes(day)) {
      onChange(current.filter(d => d !== day));
    } else {
      onChange([...current, day]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2" data-testid="rest-days-picker">
      {WEEK_DAYS.map(day => {
        const isSelected = (value || []).includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            disabled={disabled}
            onClick={() => toggle(day.value)}
            data-testid={`rest-day-${day.short}`}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border
              ${isSelected 
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200' 
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-amber-300 hover:bg-amber-50'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}

// Rest days display badges for table
function RestDaysBadges({ restDays = [], todayAr }) {
  if (!restDays || restDays.length === 0) {
    return <span className="text-xs text-muted-foreground">بدون راحة</span>;
  }
  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {restDays.map(day => {
        const short = WEEK_DAYS.find(d => d.value === day)?.short || day;
        const isToday = day === todayAr;
        return (
          <span
            key={day}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium
              ${isToday 
                ? 'bg-amber-100 text-amber-800 border border-amber-300 ring-1 ring-amber-200' 
                : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
          >
            {short}
          </span>
        );
      })}
    </div>
  );
}

// Weekly coverage card
function WeeklyCoverageCard({ employees, language }) {
  const [expanded, setExpanded] = useState(false);
  
  const coverage = useMemo(() => {
    return WEEK_DAYS.map(day => {
      const onRest = employees.filter(e => (e.rest_days || []).includes(day.value)).length;
      const available = employees.length - onRest;
      const pct = employees.length > 0 ? Math.round((available / employees.length) * 100) : 0;
      return { ...day, onRest, available, total: employees.length, pct };
    });
  }, [employees]);

  const todayAr = getTodayArabic();
  const minCoverage = Math.min(...coverage.map(c => c.available));
  const minDay = coverage.find(c => c.available === minCoverage);

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 border-amber-200" data-testid="weekly-coverage-card">
      <CardContent className="p-4">
        <div 
          className="flex items-center justify-between cursor-pointer" 
          onClick={() => setExpanded(!expanded)}
        >
          <div className="text-right">
            <p className="text-xs text-amber-700 font-semibold">
              {language === 'ar' ? 'التغطية الأسبوعية' : 'Weekly Coverage'}
            </p>
            {minDay && minDay.available < employees.length && (
              <p className="text-[10px] text-amber-600 mt-0.5">
                {language === 'ar' 
                  ? `أقل تغطية: ${minDay.short} (${minDay.available} موظف)` 
                  : `Min coverage: ${minDay.short} (${minDay.available})`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-8 h-8 text-amber-600" />
            {expanded ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
            {coverage.map(day => {
              const isToday = day.value === todayAr;
              const isLow = day.pct < 60;
              const isMid = day.pct >= 60 && day.pct < 80;
              return (
                <div 
                  key={day.value} 
                  className={`flex items-center gap-3 p-1.5 rounded-lg transition-all ${isToday ? 'bg-amber-100 border border-amber-300' : ''}`}
                >
                  <span className={`text-xs w-12 text-right font-medium ${isToday ? 'text-amber-900 font-bold' : 'text-gray-700'}`}>
                    {day.short} {isToday ? '(اليوم)' : ''}
                  </span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-400' : isMid ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${day.pct}%` }}
                    />
                  </div>
                  <span className={`text-xs w-20 text-left font-medium ${isLow ? 'text-red-600' : isMid ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {day.available}/{day.total}
                    {isLow && ' ⚠'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EmployeeManagement({ department }) {
  const { language } = useLanguage();
  const { user, isReadOnly } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [shifts, setShifts] = useState([]);
  const [coverageLocations, setCoverageLocations] = useState([]);
  
  const [formData, setFormData] = useState({
    name: "",
    employee_number: "",
    job_title: "",
    location: "",
    shift: "",
    rest_days: [],
    work_tasks: "",
    department: department || user?.department || "planning"
  });

  const todayAr = getTodayArabic();

  useEffect(() => {
    fetchDepartmentSettings();
    fetchEmployees();
    if (department === 'gates') fetchGates();
  }, [department]);

  const fetchDepartmentSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const dept = department || user?.department;
      if (!dept) return;
      const [shiftsRes, locationsRes] = await Promise.all([
        axios.get(`${API}/${dept}/settings/shifts`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API}/${dept}/settings/coverage_locations`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      setShifts(shiftsRes.data);
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
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      
      const updatedEmployees = res.data.map(emp => {
        const restDays = emp.rest_days || [];
        const isOnRest = restDays.includes(todayAr);
        return { ...emp, rest_days: restDays, is_active: !isOnRest, on_rest: isOnRest };
      });
      
      setEmployees(updatedEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error(language === 'ar' ? "فشل في جلب الموظفين" : "Failed to fetch employees");
    } finally {
      setLoading(false);
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
        shift: employee.shift || "",
        rest_days: employee.rest_days || [],
        work_tasks: employee.work_tasks || "",
        department: employee.department,
      });
    } else {
      setEditMode(false);
      setSelectedEmployee(null);
      setFormData({
        name: "",
        employee_number: "",
        job_title: "",
        location: "",
        shift: "",
        rest_days: [],
        work_tasks: "",
        department: department || user?.department || "planning",
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
      
      if (editMode) {
        await axios.put(`${API}/employees/${selectedEmployee.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم تحديث الموظف بنجاح" : "Employee updated successfully");
      } else {
        await axios.post(`${API}/employees`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === 'ar' ? "تم إضافة الموظف بنجاح" : "Employee added successfully");
      }
      
      setDialogOpen(false);
      fetchEmployees();
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
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "An error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickMove = async (employeeId, field, value) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/employees/${employeeId}`, { [field]: value }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? 'تم التحديث' : 'Updated');
      fetchEmployees();
    } catch (error) {
      toast.error(language === 'ar' ? "فشل التحديث" : "Failed");
    }
  };

  const statistics = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.is_active).length;
    const inactiveEmployees = employees.filter(e => !e.is_active).length;
    const onRestToday = employees.filter(e => e.on_rest).length;
    
    const shiftStats = shifts
      .map(shift => ({ ...shift, count: employees.filter(e => e.shift === shift.value).length }))
      .filter(shift => shift.count > 0);
    
    const locationStats = coverageLocations
      .map(loc => ({ ...loc, count: employees.filter(e => e.location === loc.value).length }))
      .filter(loc => loc.count > 0);
    
    return { totalEmployees, activeEmployees, inactiveEmployees, onRestToday, shiftStats, locationStats };
  }, [employees, shifts, coverageLocations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full" data-testid="employee-management">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-right">
                <p className="text-xs text-blue-700">{language === 'ar' ? 'إجمالي الموظفين' : 'Total'}</p>
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
                <Coffee className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                <p className="text-lg font-bold text-amber-600">{statistics.onRestToday}</p>
                <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'في راحة اليوم' : 'On Rest'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-right">
                <p className="text-xs text-purple-700">{language === 'ar' ? 'توزيع الورديات' : 'Shifts'}</p>
                <p className="text-[10px] text-muted-foreground">{statistics.shiftStats.length} {language === 'ar' ? 'وردية' : 'shifts'}</p>
              </div>
              <Clock className="w-10 h-10 text-purple-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-purple-200 max-h-24 overflow-y-auto">
              {statistics.shiftStats.map(shift => (
                <div key={shift.id} className="text-center p-1">
                  <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: shift.color }} />
                  <p className="text-lg font-bold" style={{ color: shift.color }}>{shift.count}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{shift.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-right">
                <p className="text-xs text-green-700">{language === 'ar' ? 'توزيع المواقع' : 'Locations'}</p>
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

        <WeeklyCoverageCard employees={employees} language={language} />
      </div>

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
          <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90" data-testid="add-employee-btn">
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
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-primary/5 to-primary/10 border-b-2 border-primary/20">
                  <TableHead className="text-right font-semibold">{language === 'ar' ? 'الموظف' : 'Employee'}</TableHead>
                  <TableHead className="text-center font-semibold">{language === 'ar' ? 'الوردية' : 'Shift'}</TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex items-center justify-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span>{language === 'ar' ? 'وقت الوردية' : 'Shift Time'}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    <div className="flex items-center justify-center gap-1.5">
                      <Coffee className="w-4 h-4 text-amber-600" />
                      <span>{language === 'ar' ? 'أيام الراحة' : 'Rest Days'}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-semibold">{language === 'ar' ? 'موقع التغطية' : 'Location'}</TableHead>
                  <TableHead className="text-center font-semibold">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-center font-semibold">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} className={`hover:bg-muted/50 transition-colors border-b ${employee.on_rest ? 'bg-amber-50/50' : ''}`} data-testid={`employee-row-${employee.id}`}>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-start gap-1">
                        <p className="font-semibold text-sm">{employee.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">{employee.employee_number}</Badge>
                          <span className="text-xs text-muted-foreground">{employee.job_title}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {!isReadOnly() ? (
                        <Select value={employee.shift || ""} onValueChange={(v) => handleQuickMove(employee.id, 'shift', v)}>
                          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="الوردية..." /></SelectTrigger>
                          <SelectContent>
                            {shifts.map((shift) => (
                              <SelectItem key={shift.id} value={shift.value}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }} />
                                  {shift.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        employee.shift && (
                          <Badge style={{ backgroundColor: shifts.find(s => s.value === employee.shift)?.color || '#6b7280' }} className="text-white">
                            {employee.shift}
                          </Badge>
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const shiftData = shifts.find(s => s.value === employee.shift);
                        if (shiftData && shiftData.start_time && shiftData.end_time) {
                          return (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-100 flex items-center gap-1.5 justify-center px-3 py-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="font-medium">{shiftData.start_time} - {shiftData.end_time}</span>
                            </Badge>
                          );
                        }
                        return <span className="text-muted-foreground text-xs">-</span>;
                      })()}
                    </TableCell>
                    <TableCell className="text-center" data-testid={`rest-days-cell-${employee.id}`}>
                      <RestDaysBadges restDays={employee.rest_days} todayAr={todayAr} />
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {!isReadOnly() && coverageLocations.length > 0 ? (
                        <Select value={employee.location || ""} onValueChange={(v) => handleQuickMove(employee.id, 'location', v)}>
                          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="الموقع..." /></SelectTrigger>
                          <SelectContent>
                            {coverageLocations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.value}>{loc.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : !isReadOnly() && department === 'gates' && gates.length > 0 ? (
                        <Select value={employee.location || ""} onValueChange={(v) => handleQuickMove(employee.id, 'location', v)}>
                          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="الباب..." /></SelectTrigger>
                          <SelectContent>
                            {gates.filter(g => g.status === 'مفتوح').map((gate) => (
                              <SelectItem key={gate.id} value={gate.name}>{gate.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span>{employee.location || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {employee.on_rest ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
                            <Coffee className="w-3 h-3 ml-1" />
                            {language === 'ar' ? 'في راحة' : 'On Rest'}
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100">
                            <UserCheck className="w-3 h-3 ml-1" />
                            {language === 'ar' ? 'نشط' : 'Active'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        {!isReadOnly() ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(employee)} className="h-8" data-testid={`edit-employee-${employee.id}`}>
                              <Edit className="w-4 h-4 ml-1" />
                              {language === 'ar' ? 'تعديل' : 'Edit'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedEmployee(employee); setDeleteDialogOpen(true); }} className="h-8 text-destructive hover:text-destructive" data-testid={`delete-employee-${employee.id}`}>
                              <Trash2 className="w-4 h-4 ml-1" />
                              {language === 'ar' ? 'حذف' : 'Delete'}
                            </Button>
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{language === 'ar' ? 'قراءة فقط' : 'Read Only'}</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
        <DialogContent className="sm:max-w-[500px]" data-testid="employee-dialog">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {editMode ? (language === 'ar' ? 'تعديل الموظف' : 'Edit Employee') : (language === 'ar' ? 'موظف جديد' : 'New Employee')}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' ? 'املأ المعلومات أدناه' : 'Fill in the information below'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div>
                <Label htmlFor="emp-name">{language === 'ar' ? 'اسم الموظف' : 'Employee Name'}</Label>
                <Input id="emp-name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="mt-1" placeholder={language === 'ar' ? 'مثال: محمد أحمد' : 'e.g., Mohammed Ahmed'} data-testid="employee-name-input" />
              </div>
              
              <div>
                <Label htmlFor="emp-number">{language === 'ar' ? 'الرقم الوظيفي' : 'Employee Number'}</Label>
                <Input id="emp-number" value={formData.employee_number} onChange={(e) => setFormData({...formData, employee_number: e.target.value})} required className="mt-1" placeholder={language === 'ar' ? 'مثال: 10344' : 'e.g., 10344'} data-testid="employee-number-input" />
              </div>
              
              <div>
                <Label htmlFor="job-title">{language === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}</Label>
                <Input id="job-title" value={formData.job_title} onChange={(e) => setFormData({...formData, job_title: e.target.value})} required className="mt-1" placeholder={language === 'ar' ? 'مثال: مشرف ميداني' : 'e.g., Field Supervisor'} data-testid="employee-jobtitle-input" />
              </div>
              
              {department === 'planning' && (
                <div>
                  <Label htmlFor="work-tasks">{language === 'ar' ? 'مهام العمل' : 'Work Tasks'}</Label>
                  <Input id="work-tasks" value={formData.work_tasks} onChange={(e) => setFormData({...formData, work_tasks: e.target.value})} className="mt-1" placeholder={language === 'ar' ? 'مثال: الشؤون الإدارية' : 'e.g., Administrative Affairs'} />
                </div>
              )}
              
              <div>
                <Label htmlFor="location">{language === 'ar' ? 'موقع التغطية' : 'Coverage Location'}</Label>
                {department === 'gates' && gates.length > 0 ? (
                  <Select value={formData.location} onValueChange={(value) => setFormData({...formData, location: value})}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={language === 'ar' ? 'اختر باب...' : 'Select gate...'} /></SelectTrigger>
                    <SelectContent>
                      {gates.filter(g => g.status === 'مفتوح').map((gate) => (
                        <SelectItem key={gate.id} value={gate.name}>{gate.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : coverageLocations.length > 0 ? (
                  <Select value={formData.location} onValueChange={(value) => setFormData({...formData, location: value})}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={language === 'ar' ? 'اختر الموقع...' : 'Select location...'} /></SelectTrigger>
                    <SelectContent>
                      {coverageLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.value}>{loc.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input id="location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} required className="mt-1" placeholder={language === 'ar' ? 'مثال: الساحة الشمالية' : 'e.g., North Plaza'} />
                )}
              </div>
              
              <div>
                <Label htmlFor="shift">{language === 'ar' ? 'الوردية' : 'Shift'}</Label>
                <Select value={formData.shift} onValueChange={(value) => setFormData({...formData, shift: value})}>
                  <SelectTrigger className="mt-1" data-testid="employee-shift-select"><SelectValue placeholder={language === 'ar' ? 'اختر الوردية...' : 'Select shift...'} /></SelectTrigger>
                  <SelectContent position="popper">
                    {shifts.map(shift => (
                      <SelectItem key={shift.id} value={shift.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }} />
                          {shift.label}
                          {shift.start_time && shift.end_time && (
                            <span className="text-xs text-muted-foreground">({shift.start_time} - {shift.end_time})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Rest Days - Multi Select */}
              <div>
                <Label>
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-amber-600" />
                    <span>{language === 'ar' ? 'أيام الراحة الأسبوعية' : 'Weekly Rest Days'}</span>
                  </div>
                </Label>
                <RestDaysPicker 
                  value={formData.rest_days} 
                  onChange={(days) => setFormData({...formData, rest_days: days})} 
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' 
                      ? 'اضغط على الأيام لتحديدها. حالة الموظف تتغير تلقائياً حسب يوم الراحة' 
                      : 'Click days to select. Status changes automatically on rest days'}
                  </p>
                  {formData.rest_days && formData.rest_days.length > 0 && (
                    <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">
                      {formData.rest_days.length} {language === 'ar' ? 'أيام' : 'days'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={submitting} data-testid="employee-submit-btn">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                {editMode ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo">{language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</DialogTitle>
            <DialogDescription>
              {language === 'ar' ? `هل أنت متأكد من حذف الموظف "${selectedEmployee?.name}"؟` : `Are you sure you want to delete "${selectedEmployee?.name}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
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
