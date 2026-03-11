import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  Clock, Plus, Edit, Trash2, Loader2, DoorOpen, Users, Layers, Settings, Tag,
  CalendarDays, Sun, Sunset, Moon, Zap, AlarmClock, Timer,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import GatesDataManagement from "@/components/GatesDataManagement";
import EmployeeManagement from "@/components/EmployeeManagement";
import EmployeesList from "@/components/EmployeesList";
import GateMapPage from "@/pages/GateMapPage";
import MapManagementPage from "@/pages/MapManagementPage";
import ZoneCategoryManager from "@/pages/admin/ZoneCategoryManager";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEPT_THEMES = {
  gates:          { color: "emerald", accent: "#047857", light: "#ecfdf5", border: "#a7f3d0" },
  plazas:         { color: "blue",    accent: "#1d4ed8", light: "#eff6ff", border: "#bfdbfe" },
  squares:        { color: "teal",    accent: "#0f766e", light: "#f0fdfa", border: "#99f6e4" },
  planning:       { color: "violet",  accent: "#6d28d9", light: "#f5f3ff", border: "#c4b5fd" },
  crowd_services: { color: "amber",   accent: "#b45309", light: "#fffbeb", border: "#fcd34d" },
  mataf:          { color: "rose",    accent: "#be123c", light: "#fff1f2", border: "#fecdd3" },
  haram_map:      { color: "emerald", accent: "#047857", light: "#ecfdf5", border: "#a7f3d0" },
};

const DEPT_NAMES = {
  gates:          { ar: "إدارة الأبواب",         en: "Gates Management" },
  plazas:         { ar: "إدارة المصليات",         en: "Prayer Areas" },
  squares:        { ar: "إدارة الساحات",          en: "Plazas Management" },
  planning:       { ar: "تخطيط خدمات الحشود",    en: "Crowd Planning" },
  crowd_services: { ar: "خدمات حشود الحرم",      en: "Crowd Services" },
  mataf:          { ar: "صحن المطاف",            en: "Mataf Management" },
  haram_map:      { ar: "إدارة المصليات",         en: "Prayer Halls" },
};

function SettingsTabButton({ icon: Icon, label, count, isActive, onClick, theme }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`settings-tab-${label}`}
      className={`
        relative flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all duration-300 min-w-[100px]
        ${isActive
          ? 'bg-white shadow-md border-2 scale-[1.02]'
          : 'bg-transparent border-2 border-transparent hover:bg-white/60 hover:shadow-sm'
        }
      `}
      style={isActive ? { borderColor: theme.accent } : {}}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${isActive ? 'shadow-sm' : ''}`}
        style={isActive ? { backgroundColor: theme.light, color: theme.accent } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <span className={`text-xs font-medium transition-colors duration-300 ${isActive ? 'font-bold' : 'text-gray-500'}`}
        style={isActive ? { color: theme.accent } : {}}
      >
        {label}
      </span>
      {count !== undefined && count !== null && (
        <span
          className={`absolute -top-1.5 -left-1.5 min-w-5 h-5 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
          style={{ backgroundColor: isActive ? theme.accent : '#9ca3af' }}
        >
          {count}
        </span>
      )}
      {isActive && (
        <div className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-1 rounded-full" style={{ backgroundColor: theme.accent }} />
      )}
    </button>
  );
}

export default function DepartmentSettings({ department }) {
  const { language } = useLanguage();
  const { user, isReadOnly, canWrite, canRead } = useAuth();
  const canEditShifts = canWrite('manage_shifts');
  const canEditMaps = canWrite('manage_maps');
  const canEditSettings = canWrite('manage_settings');
  const hasDataTab = department === 'gates' || department === 'plazas';
  const [activeTab, setActiveTab] = useState('employees_list');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // يتزايد كلما أُضيف موظف → يُجبر EmployeeManagement على إعادة جلب البيانات
  const [employeeVersion, setEmployeeVersion] = useState(0);

  const [shifts, setShifts] = useState([]);
  const [counts, setCounts] = useState({ employees: 0, shifts: 0, gates: 0, maps: 0, categories: 0, schedule: null });

  const [formData, setFormData] = useState({
    value: "", label: "", description: "", color: "#3b82f6", start_time: "", end_time: "", order: 0
  });

  const theme = DEPT_THEMES[department] || DEPT_THEMES.gates;
  const deptName = DEPT_NAMES[department]?.[language] || department;

  useEffect(() => {
    fetchAllSettings();
    fetchCounts();
  }, [department]);

  const fetchCounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const empRes = await axios.get(`${API}/employees?department=${department}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({ data: [] }));
      
      let gatesCount = 0;
      if (department === 'gates') {
        const gRes = await axios.get(`${API}/gates`).catch(() => ({ data: [] }));
        gatesCount = gRes.data.length;
      }

      let mapsCount = 0;
      if (department === 'gates') {
        const mRes = await axios.get(`${API}/gate-map/floors`).catch(() => ({ data: [] }));
        mapsCount = mRes.data.length;
      } else {
        const mRes = await axios.get(`${API}/floors?department=${department}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }));
        mapsCount = mRes.data.length;
      }

      setCounts(prev => ({
        ...prev,
        employees: empRes.data.length,
        gates: gatesCount,
        maps: mapsCount
      }));

      // جلب الجدول الشهري الحالي لعرض badge ذكي
      try {
        const SA_TZ_OFFSET = 3 * 60;
        const now = new Date(Date.now() + SA_TZ_OFFSET * 60 * 1000);
        const currentMonth = now.toISOString().slice(0, 7);
        const schedRes = await axios.get(`${API}/schedules/${department}/${currentMonth}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: null }));
        const sched = schedRes.data;
        if (sched) {
          const assignedCount = sched.assignments?.length || 0;
          // badge: لو معتمد → عدد الموظفين، لو مسودة → "مسودة"
          setCounts(prev => ({
            ...prev,
            schedule: sched.status === 'active' ? assignedCount : 'مسودة'
          }));
        } else {
          setCounts(prev => ({ ...prev, schedule: null }));
        }
      } catch { /* لا جدول */ }

      // Fetch categories count for plazas and haram_map
      if (department === 'plazas' || department === 'haram_map') {
        const token = localStorage.getItem("token");
        const catRes = await axios.get(`${API}/admin/zone-categories`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }));
        setCounts(prev => ({ ...prev, categories: catRes.data.length }));
      }
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const shiftsRes = await axios.get(`${API}/${department}/settings/shifts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShifts(shiftsRes.data);
      setCounts(prev => ({ ...prev, shifts: shiftsRes.data.length }));
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error(language === 'ar' ? "فشل في جلب الإعدادات" : "Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (settingType, item = null) => {
    if (item) {
      setEditMode(true);
      setSelectedItem(item);
      setFormData({ value: item.value, label: item.label, description: item.description || "", color: item.color || "#3b82f6", start_time: item.start_time || "", end_time: item.end_time || "", order: item.order || 0 });
    } else {
      setEditMode(false);
      setSelectedItem(null);
      const maxOrder = settingType === 'shifts' ? shifts.length + 1 : 0;
      setFormData({ value: "", label: "", description: "", color: "#3b82f6", start_time: "", end_time: "", order: maxOrder });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      // Auto-generate value from label if empty
      const submitData = { ...formData };
      if (!submitData.value && submitData.label) {
        submitData.value = submitData.label.replace(/\s+/g, '_').toLowerCase();
      }
      const payload = { department, setting_type: activeTab, ...submitData };
      if (editMode) {
        await axios.put(`${API}/${department}/settings/${selectedItem.id}`, submitData, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(language === 'ar' ? "تم التحديث بنجاح" : "Updated successfully");
      } else {
        await axios.post(`${API}/${department}/settings`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(language === 'ar' ? "تم الإضافة بنجاح" : "Added successfully");
      }
      setDialogOpen(false);
      fetchAllSettings();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'ar' ? "حدث خطأ" : "An error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (settingId) => {
    if (!confirm(language === 'ar' ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/${department}/settings/${settingId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(language === 'ar' ? "تم الحذف بنجاح" : "Deleted successfully");
      fetchAllSettings();
    } catch (error) {
      toast.error(language === 'ar' ? "فشل الحذف" : "Failed to delete");
    }
  };

  // Build tabs list — order: الموظفون → الجدول الشهري → الورديات → الخرائط → (dept-specific)
  const tabs = [];
  tabs.push({ id: 'employees_list', label: language === 'ar' ? 'الموظفون'       : 'Staff',    icon: Users,       count: counts.employees });
  tabs.push({ id: 'employees',      label: language === 'ar' ? 'الجدول الشهري'  : 'Schedule', icon: CalendarDays, count: counts.schedule });
  tabs.push({ id: 'shifts',         label: language === 'ar' ? 'الورديات'       : 'Shifts',   icon: Clock,       count: counts.shifts   });
  tabs.push({ id: 'maps',           label: language === 'ar' ? 'الخرائط'        : 'Maps',     icon: Layers,      count: counts.maps     });
  if (department === 'gates') {
    tabs.push({ id: 'gates_data', label: language === 'ar' ? 'الأبواب' : 'Gates', icon: DoorOpen, count: counts.gates });
  }
  if (department === 'plazas' || department === 'haram_map') {
    tabs.push({ id: 'zone_categories', label: language === 'ar' ? 'الفئات' : 'Categories', icon: Tag, count: counts.categories });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="department-settings">
      {/* Tab Navigation - Card Style */}
      <div className="rounded-2xl p-2" style={{ backgroundColor: theme.light, border: `1px solid ${theme.border}` }} data-testid="settings-tabs-bar">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <SettingsTabButton
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              count={tab.count}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              theme={theme}
            />
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300">
        {activeTab === 'employees_list' && <EmployeesList department={department} onEmployeeAdded={() => setEmployeeVersion(v => v+1)} />}
        {activeTab === 'employees' && <EmployeeManagement department={department} key={`schedule-${employeeVersion}`} />}

        {activeTab === 'maps' && department === 'gates' && <GateMapPage />}
        {activeTab === 'maps' && department !== 'gates' && <MapManagementPage department={department} />}

        {activeTab === 'gates_data' && department === 'gates' && <GatesDataManagement />}

        {activeTab === 'shifts' && (
          <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md"
                  style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)` }}>
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-cairo font-bold text-lg">الورديات</h3>
                  <p className="text-xs text-muted-foreground">
                    {shifts.length > 0
                      ? `${shifts.length} وردية — إجمالي ${(() => {
                          let total = 0;
                          shifts.forEach(s => {
                            if (s.start_time && s.end_time) {
                              const [sh, sm] = s.start_time.split(':').map(Number);
                              const [eh, em] = s.end_time.split(':').map(Number);
                              let mins = (eh*60+em) - (sh*60+sm);
                              if (mins <= 0) mins += 1440;
                              total += mins;
                            }
                          });
                          return Math.round(total/60);
                        })()} ساعة تشغيل يومياً`
                      : 'لا توجد ورديات — أضف أول وردية'}
                  </p>
                </div>
              </div>
              {canEditShifts && (
                <Button onClick={() => handleOpenDialog('shifts')}
                  className="text-white gap-1.5 shadow-md hover:opacity-90"
                  style={{ backgroundColor: theme.accent }}
                  data-testid="add-shift-btn">
                  <Plus className="w-4 h-4" />
                  إضافة وردية
                </Button>
              )}
            </div>

            {/* ── Shifts Grid ── */}
            {shifts.length === 0 ? (
              <div className="text-center py-16 space-y-3 border-2 border-dashed rounded-2xl"
                style={{ borderColor: theme.border }}>
                <div className="text-5xl">⏰</div>
                <p className="font-cairo font-bold text-muted-foreground">لا توجد ورديات بعد</p>
                {canEditShifts && (
                  <Button onClick={() => handleOpenDialog('shifts')} size="sm" className="gap-1.5"
                    style={{ backgroundColor: theme.accent }} >
                    <Plus className="w-3.5 h-3.5 text-white" />
                    <span className="text-white">أضف أول وردية</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shifts.map((shift, idx) => {
                  // حساب المدة
                  let durationText = "—";
                  let durationMins = 0;
                  if (shift.start_time && shift.end_time) {
                    const [sh, sm] = shift.start_time.split(':').map(Number);
                    const [eh, em] = shift.end_time.split(':').map(Number);
                    durationMins = (eh*60+em) - (sh*60+sm);
                    if (durationMins <= 0) durationMins += 1440;
                    const h = Math.floor(durationMins/60);
                    const m = durationMins%60;
                    durationText = `${h} ساعة${m ? ` ${m} د` : ''}`;
                  }

                  // أيقونة الوردية حسب الوقت
                  const startHour = shift.start_time ? parseInt(shift.start_time.split(':')[0]) : 0;
                  const ShiftIcon = startHour >= 5 && startHour < 12 ? Sun
                    : startHour >= 12 && startHour < 17 ? Sunset
                    : startHour >= 17 && startHour < 20 ? Sunset
                    : Moon;

                  // نسبة شريط الوقت (من 24 ساعة)
                  const startPct = shift.start_time
                    ? ((parseInt(shift.start_time.split(':')[0])*60 + parseInt(shift.start_time.split(':')[1])) / 1440) * 100
                    : 0;
                  const widthPct = (durationMins / 1440) * 100;
                  const isPrimary = shift.description !== 'secondary';

                  return (
                    <Card key={shift.id}
                      className="group relative border-0 overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300"
                      style={{ boxShadow: `0 4px 20px ${shift.color || theme.accent}25` }}>

                      {/* خلفية gradient */}
                      <div className="absolute inset-0 opacity-[0.04]"
                        style={{ background: `linear-gradient(135deg, ${shift.color || theme.accent}, transparent)` }} />
                      {/* شريط علوي ملون */}
                      <div className="h-1.5" style={{ background: shift.color || theme.accent }} />

                      <CardContent className="relative p-4">
                        {/* الصف الأول: أيقونة + اسم + إجراءات */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                              style={{ backgroundColor: `${shift.color || theme.accent}20` }}>
                              <ShiftIcon className="w-5 h-5" style={{ color: shift.color || theme.accent }} />
                            </div>
                            <div>
                              <p className="font-cairo font-bold text-base" style={{ color: shift.color || theme.accent }}>
                                {shift.label}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full
                                  ${isPrimary ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {isPrimary ? 'رئيسية' : 'فرعية'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {canEditShifts && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-slate-100"
                                onClick={() => handleOpenDialog('shifts', shift)}>
                                <Edit className="w-3.5 h-3.5 text-slate-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-red-50"
                                onClick={() => handleDelete(shift.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* وقت البداية والنهاية */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-center">
                            <p className="text-[9px] text-muted-foreground mb-0.5">البداية</p>
                            <p className="font-mono font-bold text-lg leading-none" style={{ color: shift.color || theme.accent }}>
                              {shift.start_time || "—"}
                            </p>
                          </div>
                          <div className="flex-1 mx-3 flex items-center gap-1">
                            <div className="flex-1 h-0.5 rounded-full" style={{ backgroundColor: `${shift.color || theme.accent}30` }} />
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{ color: shift.color || theme.accent, backgroundColor: `${shift.color || theme.accent}15` }}>
                              {durationText}
                            </span>
                            <div className="flex-1 h-0.5 rounded-full" style={{ backgroundColor: `${shift.color || theme.accent}30` }} />
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-muted-foreground mb-0.5">النهاية</p>
                            <p className="font-mono font-bold text-lg leading-none" style={{ color: shift.color || theme.accent }}>
                              {shift.end_time || "—"}
                            </p>
                          </div>
                        </div>

                        {/* شريط الوقت اليومي (24 ساعة) */}
                        <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden" title={`${shift.start_time} — ${shift.end_time}`}>
                          <div className="absolute top-0 bottom-0 rounded-full transition-all"
                            style={{
                              left: `${startPct}%`,
                              width: `${Math.min(widthPct, 100 - startPct)}%`,
                              background: shift.color || theme.accent,
                              opacity: 0.85,
                            }} />
                          {/* علامة 12 ظهراً */}
                          <div className="absolute top-0 bottom-0 w-px bg-slate-300" style={{ left: '50%' }} />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[8px] text-slate-400">12 م</span>
                          <span className="text-[8px] text-slate-400 mr-auto ml-auto">6 م</span>
                          <span className="text-[8px] text-slate-400">12 م</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'zone_categories' && (department === 'plazas' || department === 'haram_map') && (
          <ZoneCategoryManager />
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-cairo">
              {activeTab === 'shifts'
                ? (editMode ? (language === 'ar' ? 'تعديل الوردية' : 'Edit Shift') : (language === 'ar' ? 'إضافة وردية' : 'Add Shift'))
                : (editMode ? (language === 'ar' ? 'تعديل' : 'Edit') : (language === 'ar' ? 'إضافة جديد' : 'Add New'))
              }
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4" dir="rtl">
              {/* Name */}
              <div>
                <Label htmlFor="label" className="text-sm font-medium">{language === 'ar' ? (activeTab === 'shifts' ? 'اسم الوردية' : 'الاسم') : 'Name'} *</Label>
                <Input id="label" value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} required className="mt-1"
                  placeholder={activeTab === 'shifts' ? (language === 'ar' ? 'مثال: الوردية الأولى' : 'e.g. First Shift') : ''} />
              </div>

              {/* Value - hidden for shifts, shown for others */}
              {activeTab !== 'shifts' && (
                <div>
                  <Label htmlFor="value">{language === 'ar' ? 'القيمة' : 'Value'} *</Label>
                  <Input id="value" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} required className="mt-1" />
                </div>
              )}

              {/* Shift-specific fields */}
              {activeTab === 'shifts' && (
                <>
                  {/* Time range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_time" className="text-sm font-medium">{language === 'ar' ? 'وقت البداية' : 'Start Time'}</Label>
                      <Input id="start_time" type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className="mt-1 text-center font-mono text-lg" dir="ltr" />
                    </div>
                    <div>
                      <Label htmlFor="end_time" className="text-sm font-medium">{language === 'ar' ? 'وقت النهاية' : 'End Time'}</Label>
                      <Input id="end_time" type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} className="mt-1 text-center font-mono text-lg" dir="ltr" />
                    </div>
                  </div>

                  {/* Duration badge */}
                  {formData.start_time && formData.end_time && (() => {
                    const [sh, sm] = formData.start_time.split(':').map(Number);
                    const [eh, em] = formData.end_time.split(':').map(Number);
                    let mins = (eh * 60 + em) - (sh * 60 + sm);
                    if (mins <= 0) mins += 24 * 60;
                    const hours = Math.floor(mins / 60);
                    const remMins = mins % 60;
                    return (
                      <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                        <span className="text-sm font-medium text-primary">
                          {language === 'ar' ? 'المدة:' : 'Duration:'} {hours} {language === 'ar' ? 'ساعة' : 'hrs'}{remMins > 0 ? ` ${remMins} ${language === 'ar' ? 'دقيقة' : 'min'}` : ''}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Color */}
                  <div>
                    <Label className="text-sm font-medium">{language === 'ar' ? 'لون الوردية' : 'Shift Color'}</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <Input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                      <div className="flex-1 h-10 rounded-lg border flex items-center justify-center text-sm font-medium" style={{ backgroundColor: formData.color + '20', color: formData.color, borderColor: formData.color + '40' }}>
                        {formData.label || (language === 'ar' ? 'معاينة' : 'Preview')}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Description / Shift Category */}
              {activeTab === 'shifts' ? (
                <div>
                  <Label className="text-sm font-medium">{language === 'ar' ? 'فئة الوردية' : 'Shift Category'}</Label>
                  <Select value={formData.description || 'primary'} onValueChange={(v) => setFormData({ ...formData, description: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">{language === 'ar' ? 'رئيسية' : 'Primary'}</SelectItem>
                      <SelectItem value="secondary">{language === 'ar' ? 'فرعية' : 'Secondary'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="description">{language === 'ar' ? 'الوصف (اختياري)' : 'Description (Optional)'}</Label>
                  <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1" />
                </div>
              )}

              {/* Order - only for non-shifts */}
              {activeTab !== 'shifts' && (
                <div>
                  <Label htmlFor="order">{language === 'ar' ? 'الترتيب' : 'Order'}</Label>
                  <Input id="order" type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })} className="mt-1" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
              <Button type="submit" disabled={submitting} style={{ backgroundColor: theme.accent }} className="text-white">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                {editMode ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
