import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  Plus, Edit, Trash2, Users, Loader2, UserCheck, MapPin, Clock, Coffee,
  CalendarDays, ChevronLeft, ChevronRight, Copy, CheckCircle2, FileText, Archive
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

const MONTH_NAMES_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthKey) {
  const [y, m] = monthKey.split('-');
  return `${MONTH_NAMES_AR[parseInt(m) - 1]} ${y}`;
}

function getTodayArabic() {
  const dayMap = { Saturday: "السبت", Sunday: "الأحد", Monday: "الإثنين", Tuesday: "الثلاثاء", Wednesday: "الأربعاء", Thursday: "الخميس", Friday: "الجمعة" };
  return dayMap[new Date().toLocaleDateString('en-US', { weekday: 'long' })] || "";
}

function RestDaysPicker({ value = [], onChange, disabled }) {
  const toggle = (day) => {
    if (disabled) return;
    const current = value || [];
    onChange(current.includes(day) ? current.filter(d => d !== day) : [...current, day]);
  };
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="rest-days-picker">
      {WEEK_DAYS.map(day => {
        const sel = (value || []).includes(day.value);
        return (
          <button key={day.value} type="button" disabled={disabled} onClick={() => toggle(day.value)} data-testid={`rest-day-${day.short}`}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${sel ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-amber-300 hover:bg-amber-50'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            {day.short}
          </button>
        );
      })}
    </div>
  );
}

function RestDaysBadges({ restDays = [], todayAr }) {
  if (!restDays || restDays.length === 0) return <span className="text-[10px] text-muted-foreground">-</span>;
  return (
    <div className="flex flex-wrap gap-0.5 justify-center">
      {restDays.map(day => {
        const short = WEEK_DAYS.find(d => d.value === day)?.short || day;
        const isToday = day === todayAr;
        return (
          <span key={day} className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${isToday ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-500'}`}>
            {short}
          </span>
        );
      })}
    </div>
  );
}

// Month navigation bar
function MonthBar({ selectedMonth, onMonthChange, schedule, onCreateSchedule, onApprove, onDelete, isReadOnly, language }) {
  const currentMonthKey = getMonthKey(new Date());
  const isCurrentMonth = selectedMonth === currentMonthKey;

  const navigate = (dir) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    onMonthChange(getMonthKey(d));
  };

  const months = [];
  for (let i = -2; i <= 2; i++) {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + i, 1);
    months.push(getMonthKey(d));
  }

  const statusConfig = {
    active: { label: "نشط", icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
    draft: { label: "مسودة", icon: FileText, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
    archived: { label: "مؤرشف", icon: Archive, color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
  };

  return (
    <Card className="border-2 border-primary/10" data-testid="month-bar">
      <CardContent className="p-4">
        {/* Month pills navigation */}
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate(-1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="flex-1 flex gap-1 justify-center overflow-hidden">
            {months.map(mk => {
              const isSel = mk === selectedMonth;
              const isCurrent = mk === currentMonthKey;
              const [, mm] = mk.split('-');
              return (
                <button key={mk} onClick={() => onMonthChange(mk)} data-testid={`month-pill-${mk}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                    ${isSel ? 'bg-primary text-white shadow-md scale-105' : isCurrent ? 'bg-primary/10 text-primary border border-primary/30' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {MONTH_NAMES_AR[parseInt(mm) - 1]}
                  {isCurrent && !isSel && <span className="mr-1 text-[9px]">(الحالي)</span>}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate(1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Status + Actions row */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {schedule ? (() => {
              const st = statusConfig[schedule.status] || statusConfig.draft;
              const StIcon = st.icon;
              return (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${st.bg} ${st.color}`}>
                  <StIcon className="w-3.5 h-3.5" />
                  <span>{st.label}</span>
                </div>
              );
            })() : (
              <span className="text-xs text-muted-foreground">{language === 'ar' ? 'لا يوجد جدول لهذا الشهر' : 'No schedule'}</span>
            )}
            {schedule && (
              <span className="text-[10px] text-muted-foreground">
                {schedule.created_by && `${language === 'ar' ? 'بواسطة' : 'by'} ${schedule.created_by}`}
              </span>
            )}
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2">
              {!schedule && (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onCreateSchedule("clone")} data-testid="clone-schedule-btn">
                    <Copy className="w-3 h-3" />{language === 'ar' ? 'نسخ من السابق' : 'Clone'}
                  </Button>
                  <Button size="sm" className="h-7 text-xs gap-1 bg-primary" onClick={() => onCreateSchedule("empty")} data-testid="create-schedule-btn">
                    <Plus className="w-3 h-3" />{language === 'ar' ? 'جدول جديد' : 'New'}
                  </Button>
                </>
              )}
              {schedule && schedule.status === "draft" && (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={onDelete} data-testid="delete-schedule-btn">
                    <Trash2 className="w-3 h-3" />{language === 'ar' ? 'حذف' : 'Delete'}
                  </Button>
                  <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={onApprove} data-testid="approve-schedule-btn">
                    <CheckCircle2 className="w-3 h-3" />{language === 'ar' ? 'اعتماد' : 'Approve'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Selected month label */}
        <div className="text-center mt-2">
          <span className="text-sm font-bold text-gray-700">{getMonthLabel(selectedMonth)}</span>
        </div>
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

  // Monthly schedule state
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(new Date()));
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "", employee_number: "", job_title: "", location: "", shift: "", rest_days: [], work_tasks: "",
    department: department || user?.department || "planning"
  });

  const todayAr = getTodayArabic();
  const currentMonthKey = getMonthKey(new Date());

  useEffect(() => {
    fetchDepartmentSettings();
    fetchEmployees();
    if (department === 'gates') fetchGates();
  }, [department]);

  useEffect(() => { fetchSchedule(); }, [selectedMonth, department]);

  const fetchDepartmentSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const dept = department || user?.department;
      if (!dept) return;
      const [sRes, lRes] = await Promise.all([
        axios.get(`${API}/${dept}/settings/shifts`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API}/${dept}/settings/coverage_locations`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      setShifts(sRes.data);
      setCoverageLocations(lRes.data);
    } catch (e) { console.error(e); }
  };

  const fetchGates = async () => {
    try { const r = await axios.get(`${API}/gates`); setGates(r.data); } catch (e) { console.error(e); }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const dept = department || user?.department;
      const url = dept ? `${API}/employees?department=${dept}` : `${API}/employees`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setEmployees(res.data);
    } catch (e) { console.error(e); toast.error(language === 'ar' ? "فشل في جلب الموظفين" : "Failed"); }
    finally { setLoading(false); }
  };

  const fetchSchedule = async () => {
    setScheduleLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/schedules/${department}/${selectedMonth}`, { headers: { Authorization: `Bearer ${token}` } });
      setSchedule(res.data);
    } catch (e) { setSchedule(null); }
    finally { setScheduleLoading(false); }
  };

  // Merge employees with schedule assignments
  const mergedEmployees = useMemo(() => {
    const assignmentMap = {};
    if (schedule && schedule.assignments) {
      schedule.assignments.forEach(a => { assignmentMap[a.employee_id] = a; });
    }
    const isCurrentOrActiveSchedule = schedule && (selectedMonth === currentMonthKey || schedule.status === 'active');

    return employees.map(emp => {
      const assignment = assignmentMap[emp.id];
      const restDays = assignment ? assignment.rest_days : (emp.rest_days || []);
      const location = assignment ? assignment.location : (emp.location || "");
      const shift = assignment ? assignment.shift : (emp.shift || "");
      const isOnRest = isCurrentOrActiveSchedule && restDays.includes(todayAr);

      return { ...emp, rest_days: restDays, location, shift, is_active: !isOnRest, on_rest: isOnRest, has_assignment: !!assignment };
    });
  }, [employees, schedule, selectedMonth, currentMonthKey, todayAr]);

  const handleCreateSchedule = async (mode) => {
    try {
      const token = localStorage.getItem("token");
      const prevMonth = (() => { const [y,m] = selectedMonth.split('-').map(Number); const d = new Date(y, m-2, 1); return getMonthKey(d); })();
      const payload = { department, month: selectedMonth, clone_from: mode === "clone" ? prevMonth : null };
      await axios.post(`${API}/admin/schedules`, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(language === 'ar' ? `تم إنشاء جدول ${getMonthLabel(selectedMonth)}` : "Schedule created");
      fetchSchedule();
    } catch (e) { toast.error(e.response?.data?.detail || (language === 'ar' ? "فشل الإنشاء" : "Failed")); }
  };

  const handleApproveSchedule = async () => {
    if (!schedule) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/admin/schedules/${schedule.id}/status?status=active`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(language === 'ar' ? "تم اعتماد الجدول" : "Schedule approved");
      fetchSchedule();
    } catch (e) { toast.error(language === 'ar' ? "فشل الاعتماد" : "Failed"); }
  };

  const handleDeleteSchedule = async () => {
    if (!schedule) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/schedules/${schedule.id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(language === 'ar' ? "تم حذف الجدول" : "Schedule deleted");
      setSchedule(null);
    } catch (e) { toast.error(e.response?.data?.detail || (language === 'ar' ? "فشل الحذف" : "Failed")); }
  };

  const handleAssignmentChange = useCallback(async (employeeId, field, value) => {
    if (!schedule) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/admin/schedules/${schedule.id}/assignment/${employeeId}`, { [field]: value }, { headers: { Authorization: `Bearer ${token}` } });
      // Update local state
      setSchedule(prev => {
        if (!prev) return prev;
        const assignments = [...prev.assignments];
        const idx = assignments.findIndex(a => a.employee_id === employeeId);
        if (idx >= 0) { assignments[idx] = { ...assignments[idx], [field]: value }; }
        else { assignments.push({ employee_id: employeeId, rest_days: [], location: "", shift: "", [field]: value }); }
        return { ...prev, assignments };
      });
      toast.success(language === 'ar' ? 'تم التحديث' : 'Updated');
    } catch (e) { toast.error(language === 'ar' ? "فشل التحديث" : "Failed"); }
  }, [schedule, language]);

  // Fallback: direct employee update when no schedule
  const handleQuickMove = async (employeeId, field, value) => {
    if (schedule) { handleAssignmentChange(employeeId, field, value); return; }
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/employees/${employeeId}`, { [field]: value }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(language === 'ar' ? 'تم التحديث' : 'Updated');
      fetchEmployees();
    } catch (e) { toast.error(language === 'ar' ? "فشل التحديث" : "Failed"); }
  };

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setEditMode(true); setSelectedEmployee(employee);
      setFormData({ name: employee.name, employee_number: employee.employee_number || "", job_title: employee.job_title, location: "", shift: "", rest_days: [], work_tasks: employee.work_tasks || "", department: employee.department });
    } else {
      setEditMode(false); setSelectedEmployee(null);
      setFormData({ name: "", employee_number: "", job_title: "", location: "", shift: "", rest_days: [], work_tasks: "", department: department || user?.department || "planning" });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (editMode) {
        await axios.put(`${API}/employees/${selectedEmployee.id}`, { name: formData.name, employee_number: formData.employee_number, job_title: formData.job_title, work_tasks: formData.work_tasks }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(language === 'ar' ? "تم تحديث الموظف" : "Updated");
      } else {
        await axios.post(`${API}/employees`, formData, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(language === 'ar' ? "تم إضافة الموظف" : "Added");
      }
      setDialogOpen(false); fetchEmployees(); fetchSchedule();
    } catch (e) { toast.error(e.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "Error")); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return; setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/employees/${selectedEmployee.id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(language === 'ar' ? "تم حذف الموظف" : "Deleted");
      setDeleteDialogOpen(false); fetchEmployees();
    } catch (e) { toast.error(language === 'ar' ? "حدث خطأ" : "Error"); }
    finally { setSubmitting(false); }
  };

  const statistics = useMemo(() => {
    const total = mergedEmployees.length;
    const active = mergedEmployees.filter(e => e.is_active).length;
    const onRest = mergedEmployees.filter(e => e.on_rest).length;
    const shiftStats = shifts.map(s => ({ ...s, count: mergedEmployees.filter(e => e.shift === s.value).length })).filter(s => s.count > 0);
    
    // Weekly coverage
    const coverage = WEEK_DAYS.map(day => {
      const resting = mergedEmployees.filter(e => (e.rest_days || []).includes(day.value)).length;
      const avail = total - resting;
      return { ...day, available: avail, total, pct: total > 0 ? Math.round((avail / total) * 100) : 0 };
    });

    return { total, active, onRest, shiftStats, coverage };
  }, [mergedEmployees, shifts]);

  const canEdit = !isReadOnly() && (!schedule || schedule.status !== 'archived');

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5 max-w-full" data-testid="employee-management">
      {/* Month Bar */}
      <MonthBar
        selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} schedule={schedule}
        onCreateSchedule={handleCreateSchedule} onApprove={handleApproveSchedule} onDelete={handleDeleteSchedule}
        isReadOnly={isReadOnly()} language={language}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="text-right">
                <p className="text-[10px] text-blue-600">{language === 'ar' ? 'إجمالي' : 'Total'}</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.total}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-2 pt-2 border-t border-blue-200 text-center">
              <div className="flex-1"><p className="text-sm font-bold text-emerald-600">{statistics.active}</p><p className="text-[9px] text-muted-foreground">{language === 'ar' ? 'نشط' : 'Active'}</p></div>
              <div className="flex-1"><p className="text-sm font-bold text-amber-600">{statistics.onRest}</p><p className="text-[9px] text-muted-foreground">{language === 'ar' ? 'راحة' : 'Rest'}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-purple-600" />
              <div className="text-right"><p className="text-[10px] text-purple-600">{language === 'ar' ? 'الورديات' : 'Shifts'}</p></div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {statistics.shiftStats.map(s => (
                <div key={s.id} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Coverage mini chart */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 col-span-2">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <CalendarDays className="w-6 h-6 text-amber-600" />
              <p className="text-[10px] text-amber-700 font-semibold">{language === 'ar' ? 'التغطية الأسبوعية' : 'Weekly Coverage'}</p>
            </div>
            <div className="flex gap-1 items-end h-10">
              {statistics.coverage.map(day => {
                const isToday = day.value === todayAr;
                const isLow = day.pct < 60;
                return (
                  <div key={day.value} className="flex-1 flex flex-col items-center gap-0.5" title={`${day.short}: ${day.available}/${day.total}`}>
                    <div className="w-full rounded-sm relative" style={{ height: `${Math.max(day.pct * 0.35, 4)}px`, backgroundColor: isLow ? '#f87171' : isToday ? '#047857' : '#86efac' }} />
                    <span className={`text-[8px] ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{day.short}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <div className="text-right flex-1">
          <h2 className="font-cairo font-bold text-lg">{language === 'ar' ? 'جدول الموظفين' : 'Staff Schedule'}</h2>
          <p className="text-xs text-muted-foreground">
            {schedule
              ? (language === 'ar' ? `جدول ${getMonthLabel(selectedMonth)} - ${schedule.status === 'active' ? 'معتمد' : schedule.status === 'draft' ? 'مسودة' : 'مؤرشف'}` : `Schedule for ${selectedMonth}`)
              : (language === 'ar' ? 'البيانات الأساسية للموظفين' : 'Base employee data')}
          </p>
        </div>
        {!isReadOnly() && (
          <Button size="sm" onClick={() => handleOpenDialog()} className="bg-primary" data-testid="add-employee-btn">
            <Plus className="w-4 h-4 ml-1" />{language === 'ar' ? 'موظف جديد' : 'New'}
          </Button>
        )}
      </div>

      {/* Employees Table */}
      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-primary/5 to-primary/10 border-b-2 border-primary/20">
                  <TableHead className="text-right font-semibold">{language === 'ar' ? 'الموظف' : 'Employee'}</TableHead>
                  <TableHead className="text-center font-semibold">{language === 'ar' ? 'الوردية' : 'Shift'}</TableHead>
                  <TableHead className="text-center font-semibold"><div className="flex items-center justify-center gap-1"><Coffee className="w-3.5 h-3.5 text-amber-600" /><span>{language === 'ar' ? 'أيام الراحة' : 'Rest'}</span></div></TableHead>
                  <TableHead className="text-center font-semibold">{language === 'ar' ? 'الموقع' : 'Location'}</TableHead>
                  <TableHead className="text-center font-semibold">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-center font-semibold">{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mergedEmployees.map(emp => (
                  <TableRow key={emp.id} className={`hover:bg-muted/50 transition-colors ${emp.on_rest ? 'bg-amber-50/40' : ''}`} data-testid={`employee-row-${emp.id}`}>
                    <TableCell className="text-right">
                      <p className="font-semibold text-sm">{emp.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">{emp.employee_number}</Badge>
                        <span className="text-[10px] text-muted-foreground">{emp.job_title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {canEdit ? (
                        <Select value={emp.shift || ""} onValueChange={v => handleQuickMove(emp.id, 'shift', v)}>
                          <SelectTrigger className="h-7 w-32 text-[11px]"><SelectValue placeholder="..." /></SelectTrigger>
                          <SelectContent>
                            {shifts.map(s => (
                              <SelectItem key={s.id} value={s.value}><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />{s.label}</div></SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : emp.shift ? <Badge style={{ backgroundColor: shifts.find(s => s.value === emp.shift)?.color || '#6b7280' }} className="text-white text-[10px]">{emp.shift}</Badge> : <span className="text-[10px] text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {canEdit ? (
                        <RestDaysPicker value={emp.rest_days} onChange={days => handleQuickMove(emp.id, 'rest_days', days)} />
                      ) : (
                        <RestDaysBadges restDays={emp.rest_days} todayAr={todayAr} />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {canEdit && coverageLocations.length > 0 ? (
                        <Select value={emp.location || ""} onValueChange={v => handleQuickMove(emp.id, 'location', v)}>
                          <SelectTrigger className="h-7 w-32 text-[11px]"><SelectValue placeholder="..." /></SelectTrigger>
                          <SelectContent>{coverageLocations.map(l => <SelectItem key={l.id} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : canEdit && department === 'gates' && gates.length > 0 ? (
                        <Select value={emp.location || ""} onValueChange={v => handleQuickMove(emp.id, 'location', v)}>
                          <SelectTrigger className="h-7 w-32 text-[11px]"><SelectValue placeholder="..." /></SelectTrigger>
                          <SelectContent>{gates.filter(g => g.status === 'مفتوح').map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <span className="text-xs">{emp.location || '-'}</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {emp.on_rest ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 text-[10px] gap-0.5"><Coffee className="w-3 h-3" />{language === 'ar' ? 'راحة' : 'Rest'}</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 text-[10px] gap-0.5"><UserCheck className="w-3 h-3" />{language === 'ar' ? 'نشط' : 'Active'}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {!isReadOnly() && (
                        <div className="flex items-center gap-1 justify-center">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => handleOpenDialog(emp)} data-testid={`edit-emp-${emp.id}`}>
                            <Edit className="w-3 h-3 ml-0.5" />{language === 'ar' ? 'تعديل' : 'Edit'}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-destructive" onClick={() => { setSelectedEmployee(emp); setDeleteDialogOpen(true); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {mergedEmployees.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا يوجد موظفين' : 'No employees'}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Employee Base Data Dialog (name, number, title only) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]" data-testid="employee-dialog">
          <DialogHeader>
            <DialogTitle className="font-cairo">{editMode ? (language === 'ar' ? 'تعديل بيانات الموظف' : 'Edit Employee') : (language === 'ar' ? 'موظف جديد' : 'New Employee')}</DialogTitle>
            <DialogDescription>{language === 'ar' ? 'البيانات الأساسية الثابتة - الراحة والموقع والوردية تُدار من الجدول الشهري' : 'Base data - rest/location/shift managed via monthly schedule'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label>{language === 'ar' ? 'اسم الموظف' : 'Name'}</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="mt-1" data-testid="employee-name-input" />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الرقم الوظيفي' : 'Number'}</Label>
                <Input value={formData.employee_number} onChange={e => setFormData({...formData, employee_number: e.target.value})} required className="mt-1" data-testid="employee-number-input" />
              </div>
              <div>
                <Label>{language === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}</Label>
                <Input value={formData.job_title} onChange={e => setFormData({...formData, job_title: e.target.value})} required className="mt-1" data-testid="employee-jobtitle-input" />
              </div>
              {department === 'planning' && (
                <div>
                  <Label>{language === 'ar' ? 'مهام العمل' : 'Tasks'}</Label>
                  <Input value={formData.work_tasks} onChange={e => setFormData({...formData, work_tasks: e.target.value})} className="mt-1" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
              <Button type="submit" disabled={submitting} data-testid="employee-submit-btn">
                {submitting && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
                {editMode ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo">{language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</DialogTitle>
            <DialogDescription>{language === 'ar' ? `هل أنت متأكد من حذف "${selectedEmployee?.name}"؟` : `Delete "${selectedEmployee?.name}"?`}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin ml-1" />}{language === 'ar' ? 'حذف' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
