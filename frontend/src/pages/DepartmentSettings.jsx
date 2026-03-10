import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  Clock, Plus, Edit, Trash2, Loader2, DoorOpen, Users, Layers, Settings, Tag
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
};

const DEPT_NAMES = {
  gates:          { ar: "إدارة الأبواب",         en: "Gates Management" },
  plazas:         { ar: "إدارة المصليات",         en: "Prayer Areas" },
  squares:        { ar: "إدارة الساحات",          en: "Plazas Management" },
  planning:       { ar: "تخطيط خدمات الحشود",    en: "Crowd Planning" },
  crowd_services: { ar: "خدمات حشود الحرم",      en: "Crowd Services" },
  mataf:          { ar: "صحن المطاف",            en: "Mataf Management" },
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
          className={`absolute -top-1 -left-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
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
  const [activeTab, setActiveTab] = useState('employees');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [shifts, setShifts] = useState([]);
  const [counts, setCounts] = useState({ employees: 0, shifts: 0, gates: 0, maps: 0, categories: 0 });

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

      // Fetch categories count for plazas
      if (department === 'plazas') {
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

  // Build tabs list — order: الموظفين → الورديات → الخرائط → (dept-specific)
  const tabs = [];
  tabs.push({ id: 'employees', label: language === 'ar' ? 'الموظفين' : 'Staff',   icon: Users,   count: counts.employees });
  tabs.push({ id: 'shifts',    label: language === 'ar' ? 'الورديات' : 'Shifts',  icon: Clock,   count: counts.shifts   });
  tabs.push({ id: 'maps',      label: language === 'ar' ? 'الخرائط'  : 'Maps',    icon: Layers,  count: counts.maps     });
  if (department === 'gates') {
    tabs.push({ id: 'gates_data', label: language === 'ar' ? 'الأبواب' : 'Gates', icon: DoorOpen, count: counts.gates });
  }
  if (department === 'plazas') {
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
        {activeTab === 'employees' && <EmployeeManagement department={department} />}

        {activeTab === 'maps' && department === 'gates' && <GateMapPage />}
        {activeTab === 'maps' && department !== 'gates' && <MapManagementPage department={department} />}

        {activeTab === 'gates_data' && department === 'gates' && <GatesDataManagement />}

        {activeTab === 'shifts' && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-cairo font-semibold text-lg">{language === 'ar' ? 'الورديات' : 'Shifts'}</h3>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إدارة الورديات الخاصة بالقسم' : 'Manage department shifts'}</p>
                  </div>
                  {canEditShifts && (
                    <Button onClick={() => handleOpenDialog('shifts')} style={{ backgroundColor: theme.accent }} className="text-white hover:opacity-90" data-testid="add-shift-btn">
                      <Plus className="w-4 h-4 ml-2" />
                      {language === 'ar' ? 'إضافة وردية' : 'Add Shift'}
                    </Button>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                      <TableHead className="text-right">{language === 'ar' ? 'الوقت' : 'Time'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'الفئة' : 'Category'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'اللون' : 'Color'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="text-right font-medium">{shift.label}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{shift.start_time && shift.end_time ? `${shift.start_time} - ${shift.end_time}` : '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={shift.description === 'secondary' ? 'outline' : 'default'} className={shift.description === 'secondary' ? 'text-xs' : 'text-xs bg-primary'}>
                            {shift.description === 'secondary' ? (language === 'ar' ? 'فرعية' : 'Secondary') : (language === 'ar' ? 'رئيسية' : 'Primary')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center"><Badge style={{ backgroundColor: shift.color }} className="text-white text-xs">{shift.label}</Badge></TableCell>
                        <TableCell className="text-center">
                          {canEditShifts && (
                            <div className="flex items-center gap-2 justify-center">
                              <Button size="sm" variant="ghost" onClick={() => handleOpenDialog('shifts', shift)}><Edit className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(shift.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {shifts.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد ورديات' : 'No shifts found'}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'zone_categories' && department === 'plazas' && (
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
