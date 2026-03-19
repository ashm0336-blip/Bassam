import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { useSidebar } from "@/context/SidebarContext";
import {
  Shield, ShieldCheck, Save, Loader2, AlertTriangle,
  Eye, EyeOff, Pencil, Lock, ChevronDown, Trash2, Edit, Plus, X,
  GripVertical, ExternalLink, History,
  LayoutDashboard, Map, ClipboardList, LayoutGrid, DoorOpen,
  Users, Circle, FileText, Bell, Settings as SettingsIcon,
  Calendar, BarChart3, PieChart, TrendingUp, Activity,
  Home, User, UserCheck, Building, MapPin, Navigation,
  Layers, List, Grid, Database, Archive, Folder,
  CalendarDays, Clock, Tag, Zap, Menu,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const headers = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

const ICON_MAP = {
  LayoutDashboard, Map, ClipboardList, LayoutGrid, DoorOpen,
  Users, Circle, FileText, Bell, Settings: SettingsIcon, Shield,
  Calendar, BarChart3, PieChart, TrendingUp, Activity,
  Home, User, UserCheck, Building, MapPin, Navigation,
  Layers, List, Grid, Database, Archive, Folder,
  CalendarDays, Clock, Tag, Zap, Menu,
};
const getIcon = (name) => ICON_MAP[name] || Circle;

const AVAILABLE_ICONS = [
  "LayoutDashboard", "Map", "ClipboardList", "LayoutGrid", "DoorOpen",
  "Users", "Circle", "FileText", "Bell", "Settings", "Shield",
  "Calendar", "BarChart3", "MapPin", "Navigation", "Layers",
  "CalendarDays", "Clock", "Tag", "Zap", "Activity",
];

const DEPARTMENTS = [
  { value: "all", label_ar: "الكل", label_en: "Everyone" },
  { value: "planning", label_ar: "إدارة التخطيط", label_en: "Planning" },
  { value: "haram_map", label_ar: "إدارة المصليات", label_en: "Prayer Areas" },
  { value: "plazas", label_ar: "إدارة الساحات", label_en: "Plazas" },
  { value: "gates", label_ar: "إدارة الأبواب", label_en: "Gates" },
  { value: "crowd_services", label_ar: "خدمات الحشود", label_en: "Crowd Services" },
  { value: "mataf", label_ar: "صحن المطاف", label_en: "Mataf" },
  { value: "system_admin", label_ar: "مسؤول النظام", label_en: "System Admin" },
];

const ROLE_CONFIG = {
  general_manager:    { ar: "المدير العام",  color: "#7c3aed", bg: "#f5f3ff" },
  department_manager: { ar: "مدير الإدارة",   color: "#1d4ed8", bg: "#eff6ff" },
  shift_supervisor:   { ar: "مشرف الوردية",  color: "#0f766e", bg: "#f0fdfa" },
  field_staff:        { ar: "موظف ميداني",    color: "#047857", bg: "#ecfdf5" },
  admin_staff:        { ar: "موظف إداري",     color: "#64748b", bg: "#f8fafc" },
};

export default function PermissionsManager() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { refreshMenu } = useSidebar();

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState("general_manager");
  const [expandedItems, setExpandedItems] = useState({});
  const [rolePerms, setRolePerms] = useState({}); // { role: { itemId: { visible, editable } } }
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name_ar: "", name_en: "", href: "", icon: "Circle", order: 0,
    department: "all", parent_id: "none",
  });

  // ── Fetch data ──
  const fetchAll = useCallback(async () => {
    try {
      const [menuRes, permRes] = await Promise.all([
        axios.get(`${API}/admin/sidebar-menu`, headers()),
        axios.get(`${API}/admin/role-permissions`, headers()),
      ]);
      setMenuItems(menuRes.data);

      // Load role permissions from menu items' role_visibility field
      const rp = {};
      Object.keys(ROLE_CONFIG).forEach(role => { rp[role] = {}; });

      // Initialize from menu items' stored role data
      menuRes.data.forEach(item => {
        const rv = item.role_visibility || {};
        Object.keys(ROLE_CONFIG).forEach(role => {
          if (rv[role]) {
            rp[role][item.id] = { visible: rv[role].visible !== false, editable: !!rv[role].editable };
          } else {
            // Default: visible for all, editable = false
            rp[role][item.id] = { visible: true, editable: false };
          }
        });
      });
      setRolePerms(rp);
    } catch { toast.error("فشل جلب البيانات"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Toggle visibility/editable for a role ──
  const togglePerm = async (itemId, field) => {
    const current = rolePerms[activeRole]?.[itemId] || { visible: true, editable: false };
    const newVal = !current[field];

    // If hiding, also disable edit
    const updated = { ...current };
    if (field === "visible" && !newVal) {
      updated.visible = false;
      updated.editable = false;
    } else if (field === "editable") {
      updated.editable = newVal;
    } else {
      updated[field] = newVal;
    }

    // Update local state
    setRolePerms(prev => ({
      ...prev,
      [activeRole]: { ...prev[activeRole], [itemId]: updated },
    }));

    // Save to backend
    try {
      const item = menuItems.find(i => i.id === itemId);
      const existingRV = item?.role_visibility || {};
      const newRV = { ...existingRV, [activeRole]: updated };
      await axios.put(`${API}/admin/sidebar-menu/${itemId}`, { role_visibility: newRV }, headers());
      // Update local menuItems
      setMenuItems(prev => prev.map(i => i.id === itemId ? { ...i, role_visibility: newRV } : i));
      refreshMenu();
    } catch {
      toast.error("فشل الحفظ");
    }
  };

  // ── Toggle global visibility (is_active) ──
  const toggleGlobalActive = async (item) => {
    try {
      await axios.put(`${API}/admin/sidebar-menu/${item.id}`, { is_active: !item.is_active }, headers());
      fetchAll();
      refreshMenu();
    } catch { toast.error("فشل التحديث"); }
  };

  // ── Item CRUD ──
  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditMode(true);
      setSelectedItem(item);
      setFormData({
        name_ar: item.name_ar, name_en: item.name_en, href: item.href,
        icon: item.icon || "Circle", order: item.order || 0,
        department: item.department || "all", parent_id: item.parent_id || "none",
      });
    } else {
      setEditMode(false);
      setSelectedItem(null);
      setFormData({ name_ar: "", name_en: "", href: "", icon: "Circle", order: menuItems.filter(i => !i.parent_id).length + 1, department: "all", parent_id: "none" });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = { ...formData, parent_id: formData.parent_id === "none" ? null : formData.parent_id };
      if (editMode) {
        await axios.put(`${API}/admin/sidebar-menu/${selectedItem.id}`, data, headers());
        toast.success("تم التحديث");
      } else {
        await axios.post(`${API}/admin/sidebar-menu`, { ...data, is_active: true }, headers());
        toast.success("تم الإضافة");
      }
      setDialogOpen(false);
      fetchAll();
      refreshMenu();
    } catch (e) { toast.error(e.response?.data?.detail || "حدث خطأ"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await axios.delete(`${API}/admin/sidebar-menu/${selectedItem.id}`, headers());
      toast.success("تم الحذف");
      setDeleteDialogOpen(false);
      fetchAll();
      refreshMenu();
    } catch { toast.error("فشل الحذف"); }
    finally { setSubmitting(false); }
  };

  // ── Build display tree (3 levels) ──
  const getDisplayItems = () => {
    const result = [];
    const parents = menuItems.filter(i => !i.parent_id).sort((a, b) => (a.order || 0) - (b.order || 0));
    parents.forEach(p => {
      result.push({ ...p, _depth: 0 });
      if (expandedItems[p.id]) {
        const children = menuItems.filter(i => i.parent_id === p.id).sort((a, b) => (a.order || 0) - (b.order || 0));
        children.forEach(c => {
          const grandchildren = menuItems.filter(i => i.parent_id === c.id).sort((a, b) => (a.order || 0) - (b.order || 0));
          result.push({ ...c, _depth: 1, _hasChildren: grandchildren.length > 0 });
          if (expandedItems[c.id]) {
            grandchildren.forEach(gc => result.push({ ...gc, _depth: 2 }));
          }
        });
      }
    });
    return result;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const displayItems = getDisplayItems();
  const roleCfg = ROLE_CONFIG[activeRole];

  // Stats
  const visibleCount = Object.values(rolePerms[activeRole] || {}).filter(p => p.visible).length;
  const editableCount = Object.values(rolePerms[activeRole] || {}).filter(p => p.editable).length;

  return (
    <div className="space-y-5" data-testid="permissions-manager" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-cairo font-bold text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> الصلاحيات والتحكم
          </h2>
          <p className="text-sm text-muted-foreground">تحكم بما يراه ويعدّله كل دور — وأدر هيكل القائمة</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-blue-600"><Eye className="w-3.5 h-3.5" />ظاهر</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400"><EyeOff className="w-3.5 h-3.5" />مخفي</span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-600"><Pencil className="w-3.5 h-3.5" />تعديل</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400"><Lock className="w-3.5 h-3.5" />قراءة</span>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <button key={role} onClick={() => setActiveRole(role)} data-testid={`role-tab-${role}`}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-cairo font-semibold text-sm transition-all
              ${activeRole === role ? 'shadow-md scale-[1.02]' : 'hover:shadow-sm border-border bg-card'}`}
            style={activeRole === role ? { borderColor: cfg.color, backgroundColor: cfg.bg, color: cfg.color } : {}}>
            <Shield className="w-4 h-4" />
            {cfg.ar}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Tree Table */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <p className="font-cairo font-bold text-sm flex items-center gap-2">
                  <Menu className="w-4 h-4" />
                  شجرة الصفحات — {roleCfg.ar}
                </p>
                <Button size="sm" onClick={() => handleOpenDialog()} className="gap-1.5 bg-primary">
                  <Plus className="w-3.5 h-3.5" /> إضافة
                </Button>
              </div>

              <div className="divide-y">
                {displayItems.map(item => {
                  const IconComp = getIcon(item.icon);
                  const perm = rolePerms[activeRole]?.[item.id] || { visible: true, editable: false };
                  const isViewOnly = item.href === '/' || item.name_ar === 'نظرة عامة'
                    || (!item.parent_id && item.department && item.department !== 'all' && item.department !== 'system_admin')
                    || (item.href?.includes('tab=dashboard'));
                  const hasChildren = menuItems.some(i => i.parent_id === item.id) || item._hasChildren;
                  const indent = (item._depth || 0) * 28;
                  const deptInfo = DEPARTMENTS.find(d => d.value === item.department);

                  return (
                    <div key={item.id} data-testid={`tree-item-${item.id}`}
                      className={`flex items-center justify-between py-2.5 px-3 hover:bg-muted/20 transition-colors
                        ${!perm.visible ? 'opacity-40' : ''}
                        ${item._depth === 2 ? 'bg-muted/10' : item._depth === 1 ? 'bg-muted/20' : ''}`}
                      style={{ paddingRight: `${12 + indent}px` }}>

                      {/* Right: Icon + Name + Expand */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {hasChildren ? (
                          <button onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            className="text-slate-400 hover:text-slate-600 transition-transform"
                            style={{ transform: expandedItems[item.id] ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        ) : <span className="w-3.5" />}

                        <IconComp className="w-4.5 h-4.5 text-slate-500 flex-shrink-0" />

                        <div className="min-w-0 flex-1">
                          <p className="font-cairo font-bold text-[13px] truncate">{item.name_ar}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{item.name_en}</p>
                        </div>

                        {deptInfo && (
                          <Badge variant={item.department === 'system_admin' ? 'destructive' : item.department === 'all' ? 'default' : 'secondary'}
                            className={`text-[9px] flex-shrink-0 ${item.department === 'all' ? 'bg-slate-600' : ''}`}>
                            {deptInfo.label_ar}
                          </Badge>
                        )}
                      </div>

                      {/* Left: Controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 mr-3">
                        {/* 👁️ Visibility for this role */}
                        <button onClick={() => togglePerm(item.id, 'visible')}
                          title={perm.visible ? 'إخفاء عن هذا الدور' : 'إظهار لهذا الدور'}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                            ${perm.visible
                              ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-300'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                          {perm.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        {/* ✏️ Editable for this role */}
                        {!isViewOnly ? (
                          <button onClick={() => perm.visible && togglePerm(item.id, 'editable')}
                            disabled={!perm.visible}
                            title={perm.editable ? 'منع التعديل' : 'السماح بالتعديل'}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                              ${!perm.visible ? 'bg-slate-50 text-slate-200 cursor-not-allowed'
                                : perm.editable ? 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-300'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                            {perm.editable ? <Pencil className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
                          </button>
                        ) : <span className="w-7 text-center text-slate-200">—</span>}

                        <span className="w-px h-5 bg-slate-200 mx-1" />

                        {/* Admin controls: Edit + Delete */}
                        <button onClick={() => handleOpenDialog(item)} title="تعديل"
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setSelectedItem(item); setDeleteDialogOpen(true); }} title="حذف"
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-2"
                  style={{ backgroundColor: roleCfg.bg, color: roleCfg.color }}>
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <p className="font-cairo font-bold text-base">{roleCfg.ar}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <p className="text-xl font-bold text-blue-600">{visibleCount}</p>
                  <p className="text-[9px] text-blue-600/70 flex items-center justify-center gap-1"><Eye className="w-3 h-3" />ظاهر</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2.5">
                  <p className="text-xl font-bold text-emerald-600">{editableCount}</p>
                  <p className="text-[9px] text-emerald-600/70 flex items-center justify-center gap-1"><Pencil className="w-3 h-3" />تعديل</p>
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
                <p className="font-bold text-slate-600 mb-1">دليل الأزرار:</p>
                <p>👁️ <span className="text-blue-600">أزرق</span> = الصفحة ظاهرة لهذا الدور</p>
                <p>👁️ <span className="text-slate-400">رمادي</span> = الصفحة مخفية عن هذا الدور</p>
                <p>✏️ <span className="text-emerald-600">أخضر</span> = يقدر يعدّل ويضيف ويحذف</p>
                <p>🔒 <span className="text-slate-400">رمادي</span> = عرض فقط بدون تعديل</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo">{editMode ? 'تعديل القسم' : 'إضافة قسم جديد'}</DialogTitle>
            <DialogDescription>بيانات الصفحة في القائمة الجانبية</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الاسم بالعربي *</Label>
                <Input value={formData.name_ar} onChange={e => setFormData({ ...formData, name_ar: e.target.value })} required />
              </div>
              <div>
                <Label>الاسم بالإنجليزي *</Label>
                <Input value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label>الرابط *</Label>
              <Input value={formData.href} onChange={e => setFormData({ ...formData, href: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الأيقونة</Label>
                <Select value={formData.icon} onValueChange={v => setFormData({ ...formData, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map(icon => {
                      const IC = getIcon(icon);
                      return <SelectItem key={icon} value={icon}><span className="flex items-center gap-2"><IC className="w-4 h-4" />{icon}</span></SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الترتيب</Label>
                <Input type="number" value={formData.order} onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <Label>الإدارة المسؤولة</Label>
              <Select value={formData.department} onValueChange={v => setFormData({ ...formData, department: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label_ar}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تابع لـ (القائمة الأب)</Label>
              <Select value={formData.parent_id} onValueChange={v => setFormData({ ...formData, parent_id: v })}>
                <SelectTrigger><SelectValue placeholder="بدون — عنصر رئيسي" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون — عنصر رئيسي</SelectItem>
                  {menuItems.filter(i => i.id !== selectedItem?.id).sort((a, b) => (a.order || 0) - (b.order || 0)).map(i => {
                    const parentName = i.parent_id ? menuItems.find(p => p.id === i.parent_id)?.name_ar : null;
                    return <SelectItem key={i.id} value={i.id}>{parentName ? `${parentName} ← ${i.name_ar}` : i.name_ar}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}><X className="w-4 h-4 ml-1" />إلغاء</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}
                حفظ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo">تأكيد الحذف</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف "{selectedItem?.name_ar}"؟ لا يمكن التراجع.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Trash2 className="w-4 h-4 ml-1" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
