import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useSidebar } from "@/context/SidebarContext";
import {
  Shield, ShieldCheck, Save, Loader2,
  Eye, EyeOff, Pencil, Lock, ChevronDown, Trash2, Edit, Plus, X,
  ExternalLink, Users as UsersIcon,
  LayoutDashboard, Map, ClipboardList, LayoutGrid, DoorOpen,
  Users, Circle, FileText, Bell, Settings as SettingsIcon,
  Calendar, BarChart3, PieChart, TrendingUp, Activity,
  Home, User, UserCheck, Building, MapPin, Navigation,
  Layers, List, Grid, Database, Archive, Folder,
  CalendarDays, Clock, Tag, Zap, Menu, Copy,
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
  { value: "all", label_ar: "الكل" },
  { value: "planning", label_ar: "إدارة التخطيط" },
  { value: "haram_map", label_ar: "إدارة المصليات" },
  { value: "plazas", label_ar: "إدارة الساحات" },
  { value: "gates", label_ar: "إدارة الأبواب" },
  { value: "crowd_services", label_ar: "خدمات الحشود" },
  { value: "mataf", label_ar: "صحن المطاف" },
  { value: "system_admin", label_ar: "مسؤول النظام" },
];

const GROUP_COLORS = [
  { color: "#7c3aed", bg: "#f5f3ff" },
  { color: "#1d4ed8", bg: "#eff6ff" },
  { color: "#0f766e", bg: "#f0fdfa" },
  { color: "#047857", bg: "#ecfdf5" },
  { color: "#b45309", bg: "#fffbeb" },
  { color: "#dc2626", bg: "#fef2f2" },
  { color: "#9333ea", bg: "#faf5ff" },
  { color: "#0369a1", bg: "#f0f9ff" },
  { color: "#4f46e5", bg: "#eef2ff" },
  { color: "#be123c", bg: "#fff1f2" },
];

export default function PermissionsManager() {
  const { refreshMenu } = useSidebar();

  const [menuItems, setMenuItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [dirtyPerms, setDirtyPerms] = useState(null);
  const [saving, setSaving] = useState(false);

  // Group CRUD
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ name_ar: "", name_en: "", description_ar: "" });
  const [deleteGroupDialog, setDeleteGroupDialog] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);

  // Page CRUD
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [pageForm, setPageForm] = useState({
    name_ar: "", name_en: "", href: "", icon: "Circle", order: 0,
    department: "all", parent_id: "none",
  });
  const [deletePageDialog, setDeletePageDialog] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [members, setMembers] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchMembers = useCallback(async (groupId) => {
    if (!groupId) { setMembers([]); return; }
    try {
      const res = await axios.get(`${API}/admin/permission-groups/${groupId}/members`, headers());
      setMembers(res.data);
    } catch { setMembers([]); }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [menuRes, groupsRes] = await Promise.all([
        axios.get(`${API}/admin/sidebar-menu`, headers()),
        axios.get(`${API}/admin/permission-groups`, headers()),
      ]);
      setMenuItems(menuRes.data);
      setGroups(groupsRes.data);
      if (!activeGroupId && groupsRes.data.length > 0) {
        setActiveGroupId(groupsRes.data[0].id);
      }
      const autoExpand = {};
      menuRes.data.forEach(item => {
        if (!item.parent_id && menuRes.data.some(c => c.parent_id === item.id)) {
          autoExpand[item.id] = true;
        }
      });
      setExpandedItems(prev => ({ ...autoExpand, ...prev }));
    } catch { toast.error("فشل جلب البيانات"); }
    finally { setLoading(false); }
  }, [activeGroupId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchMembers(activeGroupId); }, [activeGroupId, fetchMembers]);

  const openAssignDialog = async () => {
    setAssignLoading(true);
    setAssignDialogOpen(true);
    try {
      const res = await axios.get(`${API}/admin/assignable-users`, headers());
      setAssignableUsers(res.data);
    } catch { toast.error("فشل جلب الموظفين"); }
    finally { setAssignLoading(false); }
  };

  const assignUserToGroup = async (userId) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/permission-group`,
        { permission_group_id: activeGroupId }, headers());
      toast.success("تم تعيين الموظف");
      fetchMembers(activeGroupId);
      fetchAll();
      const res = await axios.get(`${API}/admin/assignable-users`, headers());
      setAssignableUsers(res.data);
    } catch (err) { toast.error(err.response?.data?.detail || "فشل التعيين"); }
  };

  const removeUserFromGroup = async (userId) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/permission-group`,
        { permission_group_id: null }, headers());
      toast.success("تم إزالة الموظف من المجموعة");
      fetchMembers(activeGroupId);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "فشل الإزالة"); }
  };

  // ── Active group ──
  const activeGroup = groups.find(g => g.id === activeGroupId);
  const savedPerms = activeGroup?.page_permissions || {};
  const activePerms = dirtyPerms ?? savedPerms;
  const isDirty = dirtyPerms !== null;
  const colorIdx = groups.findIndex(g => g.id === activeGroupId);
  const groupColor = GROUP_COLORS[colorIdx % GROUP_COLORS.length] || GROUP_COLORS[0];

  const updateLocal = (newPerms) => {
    setDirtyPerms(newPerms);
  };

  // ── Toggle permission for active group (LOCAL ONLY) ──
  const togglePerm = (item, field) => {
    if (!activeGroup) return;
    const href = item.href;
    const current = activePerms[href] || { visible: false, editable: false };
    const updated = { ...current };

    if (field === "visible") {
      updated.visible = !updated.visible;
      if (!updated.visible) updated.editable = false;
    } else {
      updated.editable = !updated.editable;
    }

    const newPerms = { ...activePerms, [href]: updated };

    if (field === "visible" && !updated.visible) {
      const children = menuItems.filter(i => i.parent_id === item.id);
      children.forEach(c => {
        newPerms[c.href] = { visible: false, editable: false };
        const grandchildren = menuItems.filter(gc => gc.parent_id === c.id);
        grandchildren.forEach(gc => {
          newPerms[gc.href] = { visible: false, editable: false };
        });
      });
    }

    updateLocal(newPerms);
  };

  // ── Toggle entire department (LOCAL ONLY) ──
  const toggleDeptAll = (parentItem, targetState) => {
    if (!activeGroup) return;
    const newPerms = { ...activePerms };
    const allItems = [parentItem];
    const children = menuItems.filter(i => i.parent_id === parentItem.id);
    children.forEach(c => {
      allItems.push(c);
      menuItems.filter(gc => gc.parent_id === c.id).forEach(gc => allItems.push(gc));
    });
    allItems.forEach(item => {
      if (targetState === 'editable') {
        newPerms[item.href] = { visible: true, editable: true };
      } else if (targetState === 'visible') {
        newPerms[item.href] = { visible: true, editable: false };
      } else {
        newPerms[item.href] = { visible: false, editable: false };
      }
    });
    updateLocal(newPerms);
  };

  // ── Toggle ALL pages (LOCAL ONLY) ──
  const toggleAll = (field) => {
    if (!activeGroup) return;
    const nonAdminItems = menuItems.filter(i =>
      i.department !== "system_admin" && !i.admin_only);

    const allSet = nonAdminItems.every(i => {
      const p = activePerms[i.href];
      return p && p[field];
    });

    const newPerms = { ...activePerms };
    nonAdminItems.forEach(i => {
      if (!newPerms[i.href]) newPerms[i.href] = { visible: false, editable: false };
      if (field === "visible") {
        newPerms[i.href].visible = !allSet;
        if (allSet) newPerms[i.href].editable = false;
      } else {
        if (newPerms[i.href].visible) newPerms[i.href].editable = !allSet;
      }
    });
    updateLocal(newPerms);
  };

  // ── Save all changes at once ──
  const savePermissions = async () => {
    if (!activeGroup || !isDirty) return;
    setSaving(true);
    try {
      await axios.put(`${API}/admin/permission-groups/${activeGroupId}`,
        { page_permissions: dirtyPerms }, headers());
      setGroups(prev => prev.map(g =>
        g.id === activeGroupId ? { ...g, page_permissions: dirtyPerms } : g));
      setDirtyPerms(null);
      refreshMenu();
      toast.success("تم حفظ الصلاحيات");
    } catch { toast.error("فشل الحفظ"); }
    finally { setSaving(false); }
  };

  const discardChanges = () => {
    setDirtyPerms(null);
  };

  // ── Group CRUD ──
  const openGroupDialog = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({ name_ar: group.name_ar, name_en: group.name_en, description_ar: group.description_ar || "" });
    } else {
      setEditingGroup(null);
      setGroupForm({ name_ar: "", name_en: "", description_ar: "" });
    }
    setGroupDialogOpen(true);
  };

  const saveGroup = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingGroup) {
        await axios.put(`${API}/admin/permission-groups/${editingGroup.id}`, groupForm, headers());
        toast.success("تم تحديث المجموعة");
      } else {
        const res = await axios.post(`${API}/admin/permission-groups`, groupForm, headers());
        setActiveGroupId(res.data.id);
        toast.success("تم إنشاء المجموعة");
      }
      setGroupDialogOpen(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "حدث خطأ"); }
    finally { setSubmitting(false); }
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    setSubmitting(true);
    try {
      await axios.delete(`${API}/admin/permission-groups/${groupToDelete.id}`, headers());
      toast.success("تم حذف المجموعة");
      setDeleteGroupDialog(false);
      if (activeGroupId === groupToDelete.id) setActiveGroupId(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "فشل الحذف"); }
    finally { setSubmitting(false); }
  };

  // ── Duplicate group ──
  const duplicateGroup = async (group) => {
    try {
      const res = await axios.post(`${API}/admin/permission-groups`, {
        name_ar: `${group.name_ar} (نسخة)`,
        name_en: `${group.name_en} (copy)`,
        description_ar: group.description_ar,
        page_permissions: group.page_permissions,
      }, headers());
      setActiveGroupId(res.data.id);
      toast.success("تم نسخ المجموعة");
      fetchAll();
    } catch { toast.error("فشل النسخ"); }
  };

  // ── Page CRUD ──
  const openPageDialog = (item = null) => {
    if (item) {
      setEditingPage(item);
      setPageForm({
        name_ar: item.name_ar, name_en: item.name_en, href: item.href,
        icon: item.icon || "Circle", order: item.order || 0,
        department: item.department || "all", parent_id: item.parent_id || "none",
      });
    } else {
      setEditingPage(null);
      setPageForm({ name_ar: "", name_en: "", href: "", icon: "Circle",
        order: menuItems.filter(i => !i.parent_id).length + 1, department: "all", parent_id: "none" });
    }
    setPageDialogOpen(true);
  };

  const savePage = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = { ...pageForm, parent_id: pageForm.parent_id === "none" ? null : pageForm.parent_id };
      if (editingPage) {
        await axios.put(`${API}/admin/sidebar-menu/${editingPage.id}`, data, headers());
        toast.success("تم التحديث");
      } else {
        await axios.post(`${API}/admin/sidebar-menu`, { ...data, is_active: true }, headers());
        toast.success("تم الإضافة");
      }
      setPageDialogOpen(false);
      fetchAll();
      refreshMenu();
    } catch (err) { toast.error(err.response?.data?.detail || "حدث خطأ"); }
    finally { setSubmitting(false); }
  };

  const confirmDeletePage = async () => {
    if (!pageToDelete) return;
    setSubmitting(true);
    try {
      await axios.delete(`${API}/admin/sidebar-menu/${pageToDelete.id}`, headers());
      toast.success("تم الحذف");
      setDeletePageDialog(false);
      fetchAll();
      refreshMenu();
    } catch { toast.error("فشل الحذف"); }
    finally { setSubmitting(false); }
  };

  // ── Build display tree ──
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
  const visibleCount = Object.values(activePerms).filter(p => p.visible).length;
  const editableCount = Object.values(activePerms).filter(p => p.editable).length;

  return (
    <div className="space-y-5" data-testid="permissions-manager" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-cairo font-bold text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> مجموعات الصلاحيات
          </h2>
          <p className="text-sm text-muted-foreground">أنشئ مجموعات وتحكم بالصفحات لكل مجموعة — ثم عيّن الموظفين</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-blue-600"><Eye className="w-3.5 h-3.5" />ظاهر</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400"><EyeOff className="w-3.5 h-3.5" />مخفي</span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-600"><Pencil className="w-3.5 h-3.5" />تعديل</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400"><Lock className="w-3.5 h-3.5" />قراءة</span>
        </div>
      </div>

      {/* Group Tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        {groups.map((g, idx) => {
          const gc = GROUP_COLORS[idx % GROUP_COLORS.length];
          return (
            <button key={g.id} onClick={() => { if (isDirty) { discardChanges(); } setActiveGroupId(g.id); }} data-testid={`group-tab-${g.id}`}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-cairo font-semibold text-sm transition-all
                ${activeGroupId === g.id ? 'shadow-md scale-[1.02]' : 'hover:shadow-sm border-border bg-card'}`}
              style={activeGroupId === g.id ? { borderColor: gc.color, backgroundColor: gc.bg, color: gc.color } : {}}>
              <Shield className="w-4 h-4" />
              {g.name_ar}
              {g.user_count > 0 && (
                <span className="text-[9px] bg-white/60 rounded-full px-1.5 py-0.5 font-bold">{g.user_count}</span>
              )}
            </button>
          );
        })}
        <Button size="sm" variant="outline" onClick={() => openGroupDialog()} className="gap-1 rounded-xl"
          data-testid="add-group-btn">
          <Plus className="w-3.5 h-3.5" /> مجموعة جديدة
        </Button>
      </div>

      {!activeGroup ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          اختر مجموعة أو أنشئ واحدة جديدة
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Tree Table */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <p className="font-cairo font-bold text-sm flex items-center gap-2">
                    <Menu className="w-4 h-4" />
                    شجرة الصفحات — {activeGroup.name_ar}
                  </p>
                  <div className="flex items-center gap-2">
                    {isDirty && (
                      <>
                        <Button size="sm" variant="outline" onClick={discardChanges} className="gap-1 text-xs h-7 border-red-300 text-red-600 hover:bg-red-50">
                          <X className="w-3 h-3" /> تراجع
                        </Button>
                        <Button size="sm" onClick={savePermissions} disabled={saving} className="gap-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} حفظ التعديلات
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => toggleAll("visible")} className="gap-1 text-xs h-7">
                      <Eye className="w-3 h-3" /> الكل ظاهر
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleAll("editable")} className="gap-1 text-xs h-7">
                      <Pencil className="w-3 h-3" /> الكل تعديل
                    </Button>
                    <Button size="sm" onClick={() => openPageDialog()} className="gap-1 bg-primary h-7 text-xs">
                      <Plus className="w-3 h-3" /> صفحة
                    </Button>
                  </div>
                </div>

                <div className="divide-y">
                  {displayItems.map(item => {
                    const IconComp = getIcon(item.icon);
                    const perm = activePerms[item.href] || { visible: false, editable: false };
                    const isAdminPage = item.department === "system_admin" || item.admin_only;
                    const hasChildren = menuItems.some(i => i.parent_id === item.id) || item._hasChildren;
                    const indent = (item._depth || 0) * 28;
                    const isTopLevel = (item._depth || 0) === 0 && hasChildren;

                    const href = item.href || "";
                    const isViewOnlyPage = (
                      href === "/" ||
                      href === "/dashboard" ||
                      href === "/stats-analytics" ||
                      href === "/activity-log" ||
                      href.includes("?tab=overview") ||
                      (isTopLevel && !href.includes("?"))
                    );
                    const isSettingsParent = href.includes("?tab=settings") && !href.includes("&sub=");

                    // For top-level departments: calc child summary
                    let deptChildCount = 0, deptVisibleCount = 0, deptEditableCount = 0;
                    if (isTopLevel) {
                      const allChildren = menuItems.filter(i => i.parent_id === item.id);
                      allChildren.forEach(c => {
                        deptChildCount++;
                        const cp = activePerms[c.href];
                        if (cp?.visible) deptVisibleCount++;
                        if (cp?.editable) deptEditableCount++;
                        menuItems.filter(gc => gc.parent_id === c.id).forEach(gc => {
                          deptChildCount++;
                          const gp = activePerms[gc.href];
                          if (gp?.visible) deptVisibleCount++;
                          if (gp?.editable) deptEditableCount++;
                        });
                      });
                    }

                    return (
                      <div key={item.id} data-testid={`tree-item-${item.id}`}
                        className={`flex items-center justify-between py-2.5 px-3 hover:bg-muted/20 transition-colors
                          ${!perm.visible ? 'opacity-40' : ''}
                          ${isAdminPage ? 'opacity-20 pointer-events-none' : ''}
                          ${item._depth === 2 ? 'bg-muted/10' : item._depth === 1 ? 'bg-muted/20' : ''}`}
                        style={{ paddingRight: `${12 + indent}px` }}>

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
                            {isTopLevel && deptChildCount > 0 ? (
                              <p className="text-[9px] text-muted-foreground">{deptVisibleCount}/{deptChildCount + 1} صفحة ظاهرة</p>
                            ) : (
                              <p className="text-[9px] text-muted-foreground truncate">
                                {(isViewOnlyPage || isSettingsParent) ? (item.name_en ? `${item.name_en} — عرض فقط` : 'عرض فقط') : item.name_en}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 mr-3">
                          {/* Quick department toggle for top-level items */}
                          {isTopLevel && !isAdminPage && (
                            <>
                              <button onClick={() => toggleDeptAll(item, deptEditableCount === deptChildCount + 1 ? 'hidden' : 'editable')}
                                title={deptEditableCount === deptChildCount + 1 ? 'إخفاء الإدارة كاملة' : 'تفعيل الإدارة كاملة'}
                                className={`text-[8px] px-2 py-1 rounded-lg font-bold transition-all ${
                                  deptEditableCount === deptChildCount + 1
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-600'
                                    : deptVisibleCount > 0
                                    ? 'bg-blue-100 text-blue-600 hover:bg-emerald-100 hover:text-emerald-700'
                                    : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-700'
                                }`}>
                                {deptEditableCount === deptChildCount + 1 ? 'كامل ✓' : deptVisibleCount > 0 ? 'جزئي' : 'مخفي'}
                              </button>
                              <span className="w-px h-5 bg-slate-200" />
                            </>
                          )}

                          <button onClick={() => togglePerm(item, 'visible')}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                              ${perm.visible
                                ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-300'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                            {perm.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          {/* Hide edit button for view-only pages */}
                          {!isViewOnlyPage && !isSettingsParent && (
                            <button onClick={() => perm.visible && togglePerm(item, 'editable')}
                              disabled={!perm.visible}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                                ${!perm.visible ? 'bg-slate-50 text-slate-200 cursor-not-allowed'
                                  : perm.editable ? 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-300'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                              {perm.editable ? <Pencil className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-2"
                    style={{ backgroundColor: groupColor.bg, color: groupColor.color }}>
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <p className="font-cairo font-bold text-base">{activeGroup.name_ar}</p>
                  {activeGroup.description_ar && (
                    <p className="text-[10px] text-muted-foreground mt-1">{activeGroup.description_ar}</p>
                  )}
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

                {/* Department Access Summary */}
                {(() => {
                  const DEPT_INFO = [
                    { key: "planning", ar: "التخطيط", href: "/planning" },
                    { key: "haram_map", ar: "المصليات", href: "/haram-map" },
                    { key: "gates", ar: "الأبواب", href: "/gates" },
                    { key: "plazas", ar: "الساحات", href: "/plazas" },
                    { key: "crowd_services", ar: "الحشود", href: "/crowd-services" },
                    { key: "mataf", ar: "المطاف", href: "/mataf" },
                  ];
                  return (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-500">الإدارات المتاحة:</p>
                      <div className="flex flex-wrap gap-1">
                        {DEPT_INFO.map(d => {
                          const p = activePerms[d.href];
                          const visible = p?.visible;
                          const editable = p?.editable;
                          return (
                            <span key={d.key} className={`text-[9px] px-2 py-1 rounded-full font-bold border ${
                              editable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              visible ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              'bg-slate-50 text-slate-300 border-slate-100 line-through'
                            }`}>
                              {d.ar} {editable ? '✎' : visible ? '◉' : ''}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <UsersIcon className="w-3.5 h-3.5" /> الموظفون ({members.length})
                    </p>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2" onClick={openAssignDialog}>
                      <Plus className="w-3 h-3" /> تعيين
                    </Button>
                  </div>
                  {members.length === 0 ? (
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">لا يوجد موظفون في هذه المجموعة</p>
                      <Button size="sm" variant="link" className="text-[10px] h-auto p-0 mt-1" onClick={openAssignDialog}>
                        تعيين موظف
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-muted/20 rounded-lg px-2.5 py-1.5 group">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold truncate">{m.employee_name}</p>
                            {m.job_title && <p className="text-[9px] text-muted-foreground truncate">{m.job_title}</p>}
                          </div>
                          <button onClick={() => removeUserFromGroup(m.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => openGroupDialog(activeGroup)}>
                    <Edit className="w-3 h-3" /> تعديل
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => duplicateGroup(activeGroup)}>
                    <Copy className="w-3 h-3" /> نسخ
                  </Button>
                </div>
                {!activeGroup.is_system && (
                  <Button size="sm" variant="outline" className="w-full gap-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => { setGroupToDelete(activeGroup); setDeleteGroupDialog(true); }}>
                    <Trash2 className="w-3 h-3" /> حذف المجموعة
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Group Create/Edit Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-cairo">{editingGroup ? "تعديل المجموعة" : "مجموعة صلاحيات جديدة"}</DialogTitle>
            <DialogDescription>حدد اسم المجموعة ووصفها</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveGroup} className="space-y-4">
            <div>
              <Label>اسم المجموعة بالعربي *</Label>
              <Input value={groupForm.name_ar} onChange={e => setGroupForm({ ...groupForm, name_ar: e.target.value })} required placeholder="مثال: مشرف ليلي" />
            </div>
            <div>
              <Label>اسم المجموعة بالإنجليزي</Label>
              <Input value={groupForm.name_en} onChange={e => setGroupForm({ ...groupForm, name_en: e.target.value })} placeholder="Night Supervisor" />
            </div>
            <div>
              <Label>وصف المجموعة</Label>
              <Input value={groupForm.description_ar} onChange={e => setGroupForm({ ...groupForm, description_ar: e.target.value })} placeholder="صلاحيات المشرفين في الوردية الليلية" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGroupDialogOpen(false)}><X className="w-4 h-4 ml-1" />إلغاء</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}
                حفظ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={deleteGroupDialog} onOpenChange={setDeleteGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo">حذف المجموعة</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف مجموعة "{groupToDelete?.name_ar}"؟</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGroupDialog(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={confirmDeleteGroup} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Trash2 className="w-4 h-4 ml-1" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Create/Edit Dialog */}
      <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo">{editingPage ? 'تعديل الصفحة' : 'إضافة صفحة جديدة'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={savePage} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>الاسم بالعربي *</Label><Input value={pageForm.name_ar} onChange={e => setPageForm({ ...pageForm, name_ar: e.target.value })} required /></div>
              <div><Label>الاسم بالإنجليزي *</Label><Input value={pageForm.name_en} onChange={e => setPageForm({ ...pageForm, name_en: e.target.value })} required /></div>
            </div>
            <div><Label>الرابط *</Label><Input value={pageForm.href} onChange={e => setPageForm({ ...pageForm, href: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الأيقونة</Label>
                <Select value={pageForm.icon} onValueChange={v => setPageForm({ ...pageForm, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map(icon => { const IC = getIcon(icon); return <SelectItem key={icon} value={icon}><span className="flex items-center gap-2"><IC className="w-4 h-4" />{icon}</span></SelectItem>; })}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>الترتيب</Label><Input type="number" inputMode="numeric" value={pageForm.order} onChange={e => setPageForm({ ...pageForm, order: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div>
              <Label>الإدارة</Label>
              <Select value={pageForm.department} onValueChange={v => setPageForm({ ...pageForm, department: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>تابع لـ</Label>
              <Select value={pageForm.parent_id} onValueChange={v => setPageForm({ ...pageForm, parent_id: v })}>
                <SelectTrigger><SelectValue placeholder="عنصر رئيسي" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون — عنصر رئيسي</SelectItem>
                  {menuItems.filter(i => i.id !== editingPage?.id).sort((a, b) => (a.order || 0) - (b.order || 0)).map(i => {
                    const pn = i.parent_id ? menuItems.find(p => p.id === i.parent_id)?.name_ar : null;
                    return <SelectItem key={i.id} value={i.id}>{pn ? `${pn} > ${i.name_ar}` : i.name_ar}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPageDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Page Dialog */}
      <Dialog open={deletePageDialog} onOpenChange={setDeletePageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo">حذف الصفحة</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف "{pageToDelete?.name_ar}"؟</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePageDialog(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={confirmDeletePage} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Trash2 className="w-4 h-4 ml-1" />}حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Employee Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <UsersIcon className="w-5 h-5" /> تعيين موظف لمجموعة {activeGroup?.name_ar}
            </DialogTitle>
            <DialogDescription>اختر الموظفين لإضافتهم لهذه المجموعة</DialogDescription>
          </DialogHeader>
          {assignLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {assignableUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">لا يوجد موظفون بحسابات مفعلة</p>
              ) : (
                assignableUsers.map(u => {
                  const isInThisGroup = u.permission_group_id === activeGroupId;
                  const isInOtherGroup = u.permission_group_id && u.permission_group_id !== activeGroupId;
                  return (
                    <div key={u.id} className={`flex items-center justify-between rounded-lg px-3 py-2.5 border transition-colors
                      ${isInThisGroup ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-muted/30 border-transparent'}`}>
                      <div className="min-w-0 flex-1">
                        <p className="font-cairo font-bold text-[12px] truncate">{u.employee_name}</p>
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                          {u.job_title && <span>{u.job_title}</span>}
                          {isInOtherGroup && (
                            <Badge variant="outline" className="text-[8px] h-4 px-1.5 text-amber-600 border-amber-200">
                              {u.group_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isInThisGroup ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">معيّن</Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                          onClick={() => assignUserToGroup(u.id)}>
                          <Plus className="w-3 h-3" />
                          {isInOtherGroup ? 'نقل' : 'تعيين'}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
