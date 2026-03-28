import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import {
  Shield, ShieldCheck, Save, Loader2,
  Eye, EyeOff, Pencil, Lock, ChevronDown, Trash2, Edit, Plus, X,
  ExternalLink, Users as UsersIcon, AlertTriangle, RotateCcw,
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
  { value: "general_admin", label_ar: "الإدارة العامة" },
  { value: "planning", label_ar: "إدارة التخطيط" },
  { value: "haram_map", label_ar: "إدارة المصليات" },
  { value: "plazas", label_ar: "إدارة الساحات" },
  { value: "gates", label_ar: "إدارة الأبواب" },
  { value: "crowd_services", label_ar: "خدمات الحشود" },
  { value: "mataf", label_ar: "صحن المطاف" },
  { value: "system_admin", label_ar: "مسؤول النظام" },
];

const DEPT_SHORT = {
  general_admin: "الإدارة العامة", planning: "التخطيط", haram_map: "المصليات", plazas: "الساحات",
  gates: "الأبواب", crowd_services: "الحشود", mataf: "المطاف",
};

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

const RANK_LABELS = {
  1: { label: "موظف عادي", icon: "👤", color: "text-gray-600", bg: "bg-gray-50", desc: "صلاحيات أساسية — عرض البيانات فقط بدون تعديل على أي موظف" },
  2: { label: "مشرف ميداني", icon: "🎯", color: "text-blue-600", bg: "bg-blue-50", desc: "إشراف على الموظفين العاديين (رتبة 1) — لا يستطيع التعديل على المشرفين أو المدراء" },
  3: { label: "مدير إدارة / مكتب", icon: "🏢", color: "text-amber-600", bg: "bg-amber-50", desc: "إدارة المشرفين والموظفين (رتبة 1-2) — لا يستطيع التعديل على مدراء الإدارات الأخرى أو المدير العام" },
  4: { label: "مدير عام", icon: "⭐", color: "text-emerald-600", bg: "bg-emerald-50", desc: "أعلى صلاحية إدارية — يدير كل الرتب (1-3) ولا يُعدّل عليه إلا مسؤول النظام" },
};

export default function PermissionsManager({ department: deptFilter }) {
  const { refreshMenu } = useSidebar();
  const { user: currentUser } = useAuth();

  const [menuItems, setMenuItems] = useState([]);
  const [allMenuItems, setAllMenuItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [dirtyPerms, setDirtyPerms] = useState(null);
  const [saving, setSaving] = useState(false);

  // Group CRUD
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ name_ar: "", name_en: "", description_ar: "", rank: 1 });
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
  const [resetCustomDialog, setResetCustomDialog] = useState(null);

  const [customPermUser, setCustomPermUser] = useState(null);
  const [customPerms, setCustomPerms] = useState({});
  const [customSaving, setCustomSaving] = useState(false);
  const [customExpanded, setCustomExpanded] = useState({});

  const fetchMembers = useCallback(async (groupId) => {
    if (!groupId) { setMembers([]); return; }
    try {
      const res = await axios.get(`${API}/admin/permission-groups/${groupId}/members`, headers());
      setMembers(res.data);
    } catch { setMembers([]); }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const deptParam = deptFilter ? `?department=${deptFilter}` : '';
      const [menuRes, groupsRes] = await Promise.all([
        axios.get(`${API}/admin/sidebar-menu`, headers()),
        axios.get(`${API}/admin/permission-groups${deptParam}`, headers()),
      ]);
      let items = menuRes.data;
      setAllMenuItems(items);
      if (deptFilter) {
        const deptParent = items.find(i => !i.parent_id && i.department === deptFilter);
        if (deptParent) {
          const childIds = new Set();
          const collect = (parentId) => {
            items.filter(i => i.parent_id === parentId).forEach(c => {
              childIds.add(c.id);
              collect(c.id);
            });
          };
          collect(deptParent.id);
          items = items.filter(i => i.id === deptParent.id || childIds.has(i.id));
        }
      }
      setMenuItems(items);
      const deptGroups = deptFilter
        ? groupsRes.data.filter(g => g.department === deptFilter)
        : groupsRes.data;
      setGroups(deptGroups);
      if (!activeGroupId && deptGroups.length > 0) {
        setActiveGroupId(deptGroups[0].id);
      }
      setExpandedItems(prev => Object.keys(prev).length > 0 ? prev : {});
    } catch { toast.error("فشل جلب البيانات"); }
    finally { setLoading(false); }
  }, [activeGroupId, deptFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchMembers(activeGroupId); }, [activeGroupId, fetchMembers]);

  const openAssignDialog = async () => {
    setAssignLoading(true);
    setAssignDialogOpen(true);
    try {
      const deptParam = deptFilter ? `?department=${deptFilter}` : '';
      const res = await axios.get(`${API}/admin/assignable-users${deptParam}`, headers());
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

  const resetCustomPermissions = async (userId, name) => {
    try {
      const res = await axios.delete(`${API}/admin/users/${userId}/custom-permissions`, headers());
      toast.success(`تم مسح الصلاحيات الفردية لـ ${name}`);
      fetchMembers(activeGroupId);
    } catch (err) { toast.error(err.response?.data?.detail || "فشل إعادة الضبط"); }
  };

  const openCustomPermsDialog = (member) => {
    const existing = member.custom_permissions || {};
    setCustomPerms(existing);
    setCustomPermUser(member);
    setCustomExpanded({});
  };

  const toggleCustomPerm = (item, field) => {
    const href = item.href;
    const groupPerms = activeGroup?.page_permissions || {};
    const base = groupPerms[href] || { visible: false, editable: false };
    const current = customPerms[href] || {};
    const effectiveVisible = current.visible !== undefined ? current.visible : base.visible;
    const effectiveEditable = current.editable !== undefined ? current.editable : base.editable;

    const updated = { ...current };
    if (field === "visible") {
      const newVal = !effectiveVisible;
      updated.visible = newVal;
      if (!newVal) updated.editable = false;
    } else {
      if (!effectiveVisible) return;
      updated.editable = !effectiveEditable;
    }

    const newPerms = { ...customPerms, [href]: updated };

    if (field === "visible" && !updated.visible) {
      const items = allMenuItems.length > 0 ? allMenuItems : menuItems;
      const children = items.filter(i => i.parent_id === item.id);
      children.forEach(c => {
        newPerms[c.href] = { visible: false, editable: false };
        items.filter(gc => gc.parent_id === c.id).forEach(gc => {
          newPerms[gc.href] = { visible: false, editable: false };
        });
      });
    }

    setCustomPerms(newPerms);
  };

  const toggleCustomAll = (field) => {
    const items = allMenuItems.length > 0 ? allMenuItems : menuItems;
    const nonAdmin = items.filter(i => i.department !== "system_admin" && !i.admin_only);
    const groupPerms = activeGroup?.page_permissions || {};

    const allSet = nonAdmin.every(i => {
      const base = groupPerms[i.href] || { visible: false, editable: false };
      const custom = customPerms[i.href] || {};
      const eff = custom[field] !== undefined ? custom[field] : base[field];
      return eff;
    });

    const newPerms = { ...customPerms };
    nonAdmin.forEach(i => {
      if (!newPerms[i.href]) newPerms[i.href] = {};
      if (field === "visible") {
        newPerms[i.href].visible = !allSet;
        if (allSet) newPerms[i.href].editable = false;
      } else {
        const base = groupPerms[i.href] || { visible: false, editable: false };
        const customV = newPerms[i.href].visible !== undefined ? newPerms[i.href].visible : base.visible;
        if (customV) newPerms[i.href].editable = !allSet;
      }
    });
    setCustomPerms(newPerms);
  };

  const toggleCustomDeptAll = (parentItem, targetState) => {
    const items = allMenuItems.length > 0 ? allMenuItems : menuItems;
    const groupPerms = activeGroup?.page_permissions || {};
    const newPerms = { ...customPerms };
    const allItems = [parentItem];
    const children = items.filter(i => i.parent_id === parentItem.id);
    children.forEach(c => {
      allItems.push(c);
      items.filter(gc => gc.parent_id === c.id).forEach(gc => allItems.push(gc));
    });
    allItems.forEach(item => {
      if (!newPerms[item.href]) newPerms[item.href] = {};
      if (targetState === 'editable') {
        newPerms[item.href] = { visible: true, editable: true };
      } else if (targetState === 'visible') {
        newPerms[item.href] = { visible: true, editable: false };
      } else {
        newPerms[item.href] = { visible: false, editable: false };
      }
    });
    setCustomPerms(newPerms);
  };

  const saveCustomPerms = async () => {
    if (!customPermUser) return;
    setCustomSaving(true);
    try {
      await axios.put(`${API}/admin/users/${customPermUser.id}/custom-permissions`,
        { custom_permissions: customPerms }, headers());
      toast.success(`تم حفظ الصلاحيات الفردية لـ ${customPermUser.employee_name}`);
      setCustomPermUser(null);
      fetchMembers(activeGroupId);
    } catch (err) { toast.error(err.response?.data?.detail || "فشل الحفظ"); }
    finally { setCustomSaving(false); }
  };

  const getCustomDisplayItems = () => {
    const items = allMenuItems.length > 0 ? allMenuItems : menuItems;
    const result = [];
    const parents = items.filter(i => !i.parent_id).sort((a, b) => (a.order || 0) - (b.order || 0));
    parents.forEach(p => {
      if (p.department === "system_admin" || p.admin_only) return;
      result.push({ ...p, _depth: 0, _hasChildren: items.some(c => c.parent_id === p.id) });
      if (customExpanded[p.id]) {
        const children = items.filter(i => i.parent_id === p.id).sort((a, b) => (a.order || 0) - (b.order || 0));
        children.forEach(c => {
          const grandchildren = items.filter(i => i.parent_id === c.id).sort((a, b) => (a.order || 0) - (b.order || 0));
          result.push({ ...c, _depth: 1, _hasChildren: grandchildren.length > 0 });
          if (customExpanded[c.id]) {
            grandchildren.forEach(gc => result.push({ ...gc, _depth: 2 }));
          }
        });
      }
    });
    return result;
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
      setGroupForm({ name_ar: group.name_ar, name_en: group.name_en, description_ar: group.description_ar || "", rank: group.rank || 1 });
    } else {
      setEditingGroup(null);
      setGroupForm({ name_ar: "", name_en: "", description_ar: "", rank: 1 });
    }
    setGroupDialogOpen(true);
  };

  const saveGroup = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...groupForm };
      if (deptFilter) payload.department = deptFilter;
      if (editingGroup) {
        await axios.put(`${API}/admin/permission-groups/${editingGroup.id}`, payload, headers());
        toast.success("تم تحديث المجموعة");
      } else {
        const res = await axios.post(`${API}/admin/permission-groups`, payload, headers());
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
      const payload = {
        name_ar: `${group.name_ar} (نسخة)`,
        name_en: `${group.name_en} (copy)`,
        description_ar: group.description_ar,
        page_permissions: group.page_permissions,
      };
      if (deptFilter) payload.department = deptFilter;
      const res = await axios.post(`${API}/admin/permission-groups`, payload, headers());
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
              {RANK_LABELS[g.rank] && (
                <span className={`text-[8px] rounded-full px-1.5 py-0.5 font-bold ${RANK_LABELS[g.rank].bg} ${RANK_LABELS[g.rank].color} border`}>{RANK_LABELS[g.rank].icon} {g.rank}</span>
              )}
              {!deptFilter && g.department && DEPT_SHORT[g.department] && (
                <span className="text-[8px] bg-white/80 rounded-full px-1.5 py-0.5 font-bold opacity-70">{DEPT_SHORT[g.department]}</span>
              )}
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
                    {!deptFilter && (
                      <Button size="sm" onClick={() => openPageDialog()} className="gap-1 bg-primary h-7 text-xs">
                        <Plus className="w-3 h-3" /> صفحة
                      </Button>
                    )}
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
                  {!deptFilter && activeGroup.department && DEPT_SHORT[activeGroup.department] && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 mt-1">
                      {DEPT_SHORT[activeGroup.department]}
                    </span>
                  )}
                  {activeGroup.description_ar && (
                    <p className="text-[10px] text-muted-foreground mt-1">{activeGroup.description_ar}</p>
                  )}
                  {RANK_LABELS[activeGroup.rank] && (
                    <div className={`mt-2 mx-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border ${RANK_LABELS[activeGroup.rank].bg} ${RANK_LABELS[activeGroup.rank].color}`}>
                      <span>{RANK_LABELS[activeGroup.rank].icon}</span>
                      <span>رتبة {activeGroup.rank}: {RANK_LABELS[activeGroup.rank].label}</span>
                    </div>
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
                      {members.some(m => m.custom_count > 0) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mb-1">
                          <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            بعض الموظفين لديهم صلاحيات فردية تتجاوز صلاحيات المجموعة
                          </p>
                        </div>
                      )}
                      {members.map(m => (
                        <div key={m.id} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 group ${m.custom_count > 0 ? 'bg-amber-50/50 border border-amber-100' : 'bg-muted/20'}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold truncate flex items-center gap-1">
                              {m.employee_name}
                              {m.custom_count > 0 && (
                                <span className="text-[8px] bg-amber-100 text-amber-700 rounded px-1 py-0.5 font-medium flex-shrink-0">
                                  {m.custom_count} فردية
                                </span>
                              )}
                            </p>
                            {m.job_title && <p className="text-[9px] text-muted-foreground truncate">{m.job_title}</p>}
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => openCustomPermsDialog(m)}
                              className="opacity-0 group-hover:opacity-100 text-primary hover:text-primary/80 transition-opacity p-1"
                              title="صلاحيات فردية إضافية">
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            {m.custom_count > 0 && (
                              <button onClick={() => setResetCustomDialog({ id: m.id, name: m.employee_name, count: m.custom_count })}
                                className="opacity-0 group-hover:opacity-100 text-amber-500 hover:text-amber-700 transition-opacity p-1"
                                title="إعادة ضبط — مسح الصلاحيات الفردية والاعتماد على المجموعة فقط">
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                            <button onClick={() => removeUserFromGroup(m.id)}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
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
            <div>
              <Label>الرتبة (مستوى الحماية) *</Label>
              <Select value={String(groupForm.rank)} onValueChange={v => setGroupForm({ ...groupForm, rank: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map(r => {
                    const info = RANK_LABELS[r];
                    const myRank = currentUser?.role === "system_admin" ? 5 : (currentUser?.permission_group_rank || 1);
                    const disabled = currentUser?.role !== "system_admin" && r >= myRank;
                    return (
                      <SelectItem key={r} value={String(r)} disabled={disabled}>
                        <span className="flex items-center gap-2">
                          <span>{info.icon}</span>
                          <span>{r} — {info.label}</span>
                          {disabled && <span className="text-[9px] text-red-400 mr-1">(أعلى من رتبتك)</span>}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {groupForm.rank && RANK_LABELS[groupForm.rank] && (
                <div className={`mt-2 p-2.5 rounded-lg border text-[11px] leading-relaxed ${RANK_LABELS[groupForm.rank].bg} ${RANK_LABELS[groupForm.rank].color}`}>
                  <p className="font-bold mb-0.5">{RANK_LABELS[groupForm.rank].icon} {RANK_LABELS[groupForm.rank].label}</p>
                  <p className="opacity-80">{RANK_LABELS[groupForm.rank].desc}</p>
                  {groupForm.rank > 1 && (
                    <p className="mt-1 text-[10px] opacity-60">يدير: الرتب من 1 إلى {groupForm.rank - 1} | لا يُعدَّل عليه إلا من رتبة {groupForm.rank + 1} وأعلى</p>
                  )}
                  {groupForm.rank === 1 && (
                    <p className="mt-1 text-[10px] opacity-60">لا يستطيع التعديل على أي موظف آخر</p>
                  )}
                </div>
              )}
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

      <Dialog open={!!resetCustomDialog} onOpenChange={() => setResetCustomDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> إعادة ضبط الصلاحيات الفردية
            </DialogTitle>
            <DialogDescription>
              سيتم مسح {resetCustomDialog?.count} صلاحية فردية لـ "{resetCustomDialog?.name}" والاعتماد على صلاحيات المجموعة فقط. هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetCustomDialog(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={async () => {
              await resetCustomPermissions(resetCustomDialog.id, resetCustomDialog.name);
              setResetCustomDialog(null);
            }}>
              <RotateCcw className="w-4 h-4 ml-1" /> إعادة ضبط
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!customPermUser} onOpenChange={(open) => { if (!open) setCustomPermUser(null); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b bg-gradient-to-l from-violet-50 to-blue-50 rounded-t-lg">
            <DialogTitle className="font-cairo flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-violet-600" />
              صلاحيات فردية — {customPermUser?.employee_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              أضف صلاحيات إضافية لهذا الموظف تتجاوز صلاحيات المجموعة ({activeGroup?.name_ar})
            </DialogDescription>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                <Eye className="w-3 h-3" /> من المجموعة
              </span>
              <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-violet-100 text-violet-700">
                <ShieldCheck className="w-3 h-3" /> فردي مُضاف
              </span>
              <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-700">
                <EyeOff className="w-3 h-3" /> فردي مُخفي
              </span>
            </div>
          </DialogHeader>

          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
            <Button size="sm" variant="outline" onClick={() => toggleCustomAll("visible")} className="gap-1 text-xs h-7">
              <Eye className="w-3 h-3" /> الكل ظاهر
            </Button>
            <Button size="sm" variant="outline" onClick={() => toggleCustomAll("editable")} className="gap-1 text-xs h-7">
              <Pencil className="w-3 h-3" /> الكل تعديل
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCustomPerms({})} className="gap-1 text-xs h-7 text-amber-600 border-amber-300 hover:bg-amber-50">
              <RotateCcw className="w-3 h-3" /> إعادة ضبط
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-1" dir="rtl">
            <div className="divide-y">
              {customPermUser && getCustomDisplayItems().map(item => {
                const IconComp = getIcon(item.icon);
                const groupPerms = activeGroup?.page_permissions || {};
                const base = groupPerms[item.href] || { visible: false, editable: false };
                const custom = customPerms[item.href] || {};
                const effectiveVisible = custom.visible !== undefined ? custom.visible : base.visible;
                const effectiveEditable = custom.editable !== undefined ? custom.editable : base.editable;
                const hasCustomVisible = custom.visible !== undefined && custom.visible !== base.visible;
                const hasCustomEditable = custom.editable !== undefined && custom.editable !== base.editable;
                const cItems = allMenuItems.length > 0 ? allMenuItems : menuItems;
                const hasChildren = cItems.some(i => i.parent_id === item.id) || item._hasChildren;
                const indent = (item._depth || 0) * 24;
                const isTopLevel = (item._depth || 0) === 0;

                const href = item.href || "";
                const isViewOnlyPage = (
                  href === "/" || href === "/dashboard" || href === "/stats-analytics" ||
                  href === "/activity-log" || href.includes("?tab=overview") ||
                  (isTopLevel && !href.includes("?"))
                );
                const isSettingsParent = href.includes("?tab=settings") && !href.includes("&sub=");

                return (
                  <div key={item.id}
                    className={`flex items-center justify-between py-2 px-3 hover:bg-muted/20 transition-colors
                      ${!effectiveVisible ? 'opacity-40' : ''}
                      ${item._depth === 2 ? 'bg-muted/10' : item._depth === 1 ? 'bg-muted/5' : ''}`}
                    style={{ paddingRight: `${12 + indent}px` }}>

                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {hasChildren ? (
                        <button onClick={() => setCustomExpanded(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                          className="text-slate-400 hover:text-slate-600 transition-transform"
                          style={{ transform: customExpanded[item.id] ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      ) : <span className="w-3.5" />}
                      <IconComp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-cairo font-bold text-[12px] truncate">{item.name_ar}</p>
                        {base.visible && (
                          <p className="text-[9px] text-blue-500">من المجموعة: {base.editable ? 'عرض + تعديل' : 'عرض فقط'}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 mr-2">
                      {isTopLevel && hasChildren && (() => {
                        const allItems = [item];
                        const ch = cItems.filter(i => i.parent_id === item.id);
                        ch.forEach(c => { allItems.push(c); cItems.filter(gc => gc.parent_id === c.id).forEach(gc => allItems.push(gc)); });
                        const gp = activeGroup?.page_permissions || {};
                        const allEditable = allItems.every(i => {
                          const b = gp[i.href] || {}; const c2 = customPerms[i.href] || {};
                          return (c2.editable !== undefined ? c2.editable : b.editable);
                        });
                        const someVisible = allItems.some(i => {
                          const b = gp[i.href] || {}; const c2 = customPerms[i.href] || {};
                          return (c2.visible !== undefined ? c2.visible : b.visible);
                        });
                        return (
                          <>
                            <button onClick={() => toggleCustomDeptAll(item, allEditable ? 'hidden' : 'editable')}
                              className={`text-[8px] px-2 py-1 rounded-lg font-bold transition-all ${
                                allEditable ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-600'
                                : someVisible ? 'bg-blue-100 text-blue-600 hover:bg-emerald-100 hover:text-emerald-700'
                                : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-700'
                              }`}>
                              {allEditable ? 'كامل ✓' : someVisible ? 'جزئي' : 'مخفي'}
                            </button>
                            <span className="w-px h-5 bg-slate-200" />
                          </>
                        );
                      })()}

                      <button onClick={() => toggleCustomPerm(item, 'visible')}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                          ${hasCustomVisible
                            ? effectiveVisible
                              ? 'bg-violet-100 text-violet-600 ring-2 ring-violet-300'
                              : 'bg-red-100 text-red-500 ring-2 ring-red-300'
                            : effectiveVisible
                              ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-200'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}>
                        {effectiveVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      {!isViewOnlyPage && !isSettingsParent && (
                        <button onClick={() => toggleCustomPerm(item, 'editable')}
                          disabled={!effectiveVisible}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                            ${!effectiveVisible ? 'bg-slate-50 text-slate-200 cursor-not-allowed'
                              : hasCustomEditable
                                ? effectiveEditable
                                  ? 'bg-violet-100 text-violet-600 ring-2 ring-violet-300'
                                  : 'bg-red-100 text-red-500 ring-2 ring-red-300'
                                : effectiveEditable
                                  ? 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}>
                          {effectiveEditable ? <Pencil className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="px-5 py-3 border-t bg-muted/20">
            <div className="flex items-center justify-between w-full">
              <div className="text-[10px] text-muted-foreground">
                {Object.keys(customPerms).length > 0
                  ? `${Object.keys(customPerms).length} صلاحية فردية`
                  : 'لا توجد صلاحيات فردية'
                }
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCustomPermUser(null)} size="sm">
                  إلغاء
                </Button>
                <Button onClick={saveCustomPerms} disabled={customSaving} size="sm"
                  className="gap-1 bg-violet-600 hover:bg-violet-700 text-white">
                  {customSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  حفظ الصلاحيات الفردية
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
