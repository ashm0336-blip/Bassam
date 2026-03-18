import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Shield, ShieldCheck, Save, RotateCcw, Loader2, History, AlertTriangle,
  LayoutDashboard, ClipboardList, Navigation, DoorOpen, LayoutGrid, Users as UsersIcon,
  Circle, MapPin, Bell, Eye, EyeOff, Pencil, ChevronDown, ChevronLeft,
  CalendarDays, Clock, Layers, Tag, Calendar, Settings, Zap, FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

const ROLE_CONFIG = {
  general_manager:    { ar: "المدير العام",   color: "#7c3aed", bg: "#f5f3ff", level: 4 },
  department_manager: { ar: "مدير الإدارة",    color: "#1d4ed8", bg: "#eff6ff", level: 3 },
  shift_supervisor:   { ar: "مشرف الوردية",   color: "#0f766e", bg: "#f0fdfa", level: 2 },
  field_staff:        { ar: "موظف ميداني",     color: "#047857", bg: "#ecfdf5", level: 1 },
  admin_staff:        { ar: "موظف إداري",      color: "#64748b", bg: "#f8fafc", level: 1 },
};

// ── شجرة الموقع الكاملة مع ربط الصلاحيات ──
const SITE_TREE = [
  {
    id: "dashboard", label: "لوحة التحكم", subtitle: "غرفة العمليات", Icon: LayoutDashboard, color: "#0891b2",
    viewOnly: true,
    viewPerms: ["page_dashboard"],
  },
  {
    id: "dept_common", label: "محتوى الإدارات", subtitle: "ينطبق على جميع الإدارات المسموحة", Icon: LayoutGrid, color: "#6366f1",
    isGroup: true,
    children: [
      {
        id: "overview", label: "نظرة عامة", Icon: Circle, color: "#6366f1",
        viewOnly: true,
        viewPerms: ["page_overview"],
      },
      {
        id: "tasks", label: "المهام اليومية", Icon: FileText, color: "#7c3aed",
        viewPerms: ["page_transactions"],
        editPerms: ["page_transactions"],
      },
      {
        id: "settings_page", label: "الإعدادات", Icon: Settings, color: "#64748b",
        viewPerms: ["page_settings"],
        editPerms: ["page_settings"],
        children: [
          {
            id: "employees", label: "الموظفون", Icon: UsersIcon, color: "#1d4ed8",
            viewPerms: ["page_employees"],
            editPerms: ["page_employees", "add_employees", "edit_employees", "delete_employees", "manage_accounts", "reset_pins", "change_roles", "import_employees", "export_employees"],
          },
          {
            id: "schedule", label: "الجدول الشهري", Icon: CalendarDays, color: "#0d9488",
            viewPerms: ["page_employees"],
            editPerms: ["create_schedule", "approve_schedule", "unlock_schedule", "delete_schedule"],
          },
          {
            id: "shifts", label: "الورديات", Icon: Clock, color: "#d97706",
            viewPerms: ["page_settings"],
            editPerms: ["manage_shifts"],
          },
          {
            id: "maps", label: "الخرائط", Icon: Layers, color: "#059669",
            viewPerms: ["page_settings"],
            editPerms: ["manage_maps"],
          },
        ],
      },
    ],
  },
  {
    id: "sessions", label: "الجولات اليومية", subtitle: "جولات المصليات والأبواب", Icon: Calendar, color: "#047857",
    viewPerms: ["view_daily_sessions", "page_daily_log"],
    editPerms: ["create_session", "approve_session", "delete_session", "start_prayer_round", "complete_prayer_round", "skip_prayer_round"],
  },
  {
    id: "field_ops", label: "التوزيع الميداني", subtitle: "توزيع الموظفين والكثافة", Icon: MapPin, color: "#f97316",
    viewPerms: ["page_field", "view_coverage_map"],
    editPerms: ["distribute_employees", "auto_distribute", "enter_density", "view_density_reports"],
  },
  {
    id: "gates_data", label: "بيانات الأبواب", subtitle: "خاص بإدارة الأبواب", Icon: DoorOpen, color: "#059669",
    viewPerms: ["page_settings"],
    editPerms: ["manage_gates"],
  },
  {
    id: "categories", label: "فئات المصليات", subtitle: "خاص بإدارة المصليات", Icon: Tag, color: "#8b5cf6",
    viewPerms: ["page_settings"],
    editPerms: ["manage_categories"],
  },
  {
    id: "alerts", label: "الإشعارات والتنبيهات", Icon: Bell, color: "#f59e0b",
    viewPerms: ["page_alerts"],
    editPerms: ["page_alerts"],
  },
];

// ── حساب حالة العنصر من الصلاحيات الحالية ──
function getNodeState(node, perms) {
  const vKeys = node.viewPerms || [];
  const eKeys = node.editPerms || [];
  const hasView = vKeys.length > 0 && vKeys.some(k => perms[k] === "read" || perms[k] === "write");
  const hasEdit = eKeys.length > 0 && eKeys.some(k => perms[k] === "write");
  return { visible: hasView || hasEdit, editable: hasEdit };
}

// ── تطبيق التغيير على الصلاحيات ──
function applyNodeChange(node, field, value, perms) {
  const updated = { ...perms };

  if (field === "visible") {
    if (value) {
      // تشغيل المشاهدة → كل مفاتيح العرض تصير read
      (node.viewPerms || []).forEach(k => { if (!updated[k]) updated[k] = "read"; });
    } else {
      // إيقاف المشاهدة → حذف كل المفاتيح
      (node.viewPerms || []).forEach(k => { delete updated[k]; });
      (node.editPerms || []).forEach(k => { delete updated[k]; });
      // إيقاف الأبناء أيضاً
      if (node.children) {
        node.children.forEach(child => {
          (child.viewPerms || []).forEach(k => { delete updated[k]; });
          (child.editPerms || []).forEach(k => { delete updated[k]; });
          if (child.children) {
            child.children.forEach(gc => {
              (gc.viewPerms || []).forEach(k => { delete updated[k]; });
              (gc.editPerms || []).forEach(k => { delete updated[k]; });
            });
          }
        });
      }
    }
  } else if (field === "editable") {
    if (value) {
      // تشغيل التعديل → كل مفاتيح التعديل تصير write + ضمان المشاهدة
      (node.viewPerms || []).forEach(k => { if (!updated[k]) updated[k] = "read"; });
      (node.editPerms || []).forEach(k => { updated[k] = "write"; });
    } else {
      // إيقاف التعديل → إرجاع مفاتيح التعديل لـ read أو حذفها
      (node.editPerms || []).forEach(k => {
        if ((node.viewPerms || []).includes(k)) { updated[k] = "read"; }
        else { delete updated[k]; }
      });
    }
  }

  return updated;
}

// ── مكوّن عنصر الشجرة ──
function TreeNode({ node, perms, onChange, depth = 0, roleColor }) {
  const [expanded, setExpanded] = useState(true);
  const state = getNodeState(node, perms);
  const hasChildren = node.children?.length > 0;
  const NodeIcon = node.Icon || Circle;

  const handleToggle = (field) => {
    const newVal = !state[field];
    onChange(applyNodeChange(node, field, newVal, perms));
  };

  // عدد الأبناء المفعّلين
  const activeChildCount = hasChildren
    ? node.children.filter(c => getNodeState(c, perms).visible).length
    : 0;

  const indent = depth * 20;

  return (
    <div data-testid={`tree-node-${node.id}`}>
      {/* العنصر نفسه */}
      <div
        className={`flex items-center justify-between py-2.5 px-3 transition-colors
          ${depth === 0 ? 'border-b border-slate-100' : ''}
          ${!state.visible && depth > 0 ? 'opacity-40' : ''}
          ${hasChildren ? 'hover:bg-slate-50/50' : 'hover:bg-slate-50/30'}`}
        style={{ paddingRight: `${12 + indent}px` }}
      >
        {/* يسار: أيقونة + اسم */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1"
          onClick={() => hasChildren && setExpanded(!expanded)}
          style={{ cursor: hasChildren ? "pointer" : "default" }}>
          {hasChildren && (
            <span className="text-slate-400 transition-transform" style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
              <ChevronDown className="w-3.5 h-3.5" />
            </span>
          )}
          {!hasChildren && depth > 0 && <span className="w-3.5" />}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: node.color + "15", color: node.color }}>
            <NodeIcon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="font-cairo font-bold text-[13px] leading-tight truncate">{node.label}</p>
            {node.subtitle && <p className="text-[9px] text-muted-foreground leading-tight">{node.subtitle}</p>}
          </div>
          {hasChildren && (
            <span className="text-[10px] text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
              {activeChildCount}/{node.children.length}
            </span>
          )}
        </div>

        {/* يمين: أزرار التحكم */}
        {!node.isGroup && (
          <div className="flex items-center gap-1.5 flex-shrink-0 mr-2">
            {/* زر المشاهدة */}
            <button
              onClick={() => handleToggle("visible")}
              data-testid={`toggle-view-${node.id}`}
              title={state.visible ? "إخفاء" : "إظهار"}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all
                ${state.visible
                  ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
            >
              {state.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{state.visible ? "ظاهر" : "مخفي"}</span>
            </button>

            {/* زر التعديل */}
            {!node.viewOnly && (
              <button
                onClick={() => handleToggle("editable")}
                data-testid={`toggle-edit-${node.id}`}
                title={state.editable ? "إيقاف التعديل" : "تفعيل التعديل"}
                disabled={!state.visible}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all
                  ${!state.visible
                    ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                    : state.editable
                      ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300"
                      : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{state.editable ? "تعديل" : "قراءة"}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* الأبناء */}
      {hasChildren && expanded && (
        <div className={depth === 0 ? "border-b border-slate-100" : ""}>
          {node.children.map(child => (
            <TreeNode
              key={child.id} node={child} perms={perms}
              onChange={onChange} depth={depth + 1} roleColor={roleColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── المكوّن الرئيسي ──
export default function PermissionsManager() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [activeRole, setActiveRole] = useState("department_manager");
  const [pendingChanges, setPendingChanges] = useState({});

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/role-permissions`, getAuthHeaders());
      setData(res.data);
      const init = {};
      Object.entries(res.data.roles || {}).forEach(([role, info]) => {
        init[role] = { ...(info.permissions || {}) };
      });
      Object.entries(res.data.defaults || {}).forEach(([role, perms]) => {
        if (!init[role]) init[role] = { ...perms };
      });
      setPendingChanges(init);
    } catch { toast.error("فشل جلب الصلاحيات"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const saveRole = async (role) => {
    setSaving(prev => ({ ...prev, [role]: true }));
    try {
      const res = await axios.put(`${API}/admin/role-permissions/${role}`, { permissions: pendingChanges[role] || {} }, getAuthHeaders());
      toast.success(res.data.message || "تم الحفظ");
      fetchPermissions();
    } catch (e) { toast.error(e.response?.data?.detail || "فشل الحفظ"); }
    finally { setSaving(prev => ({ ...prev, [role]: false })); }
  };

  const resetRole = async (role) => {
    try {
      await axios.post(`${API}/admin/role-permissions/${role}/reset`, {}, getAuthHeaders());
      toast.success("تمت إعادة التعيين");
      fetchPermissions();
    } catch { toast.error("فشلت إعادة التعيين"); }
  };

  const hasChanges = (role) => {
    if (!data) return false;
    const saved = data.roles?.[role]?.permissions || data.defaults?.[role] || {};
    const pending = pendingChanges[role] || {};
    const allKeys = new Set([...Object.keys(saved), ...Object.keys(pending)]);
    return [...allKeys].some(k => (saved[k] || "none") !== (pending[k] || "none"));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!data) return null;

  const activePerms = pendingChanges[activeRole] || {};
  const readCount = Object.values(activePerms).filter(v => v === "read").length;
  const writeCount = Object.values(activePerms).filter(v => v === "write").length;

  return (
    <div className="space-y-5" data-testid="permissions-manager" dir="rtl">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-cairo font-bold text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> الصلاحيات والتحكم
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">تحكم بما يراه ويعدّله كل دور في الموقع</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-blue-600" />ظاهر</span>
          <span className="flex items-center gap-1"><EyeOff className="w-3.5 h-3.5 text-slate-400" />مخفي</span>
          <span className="flex items-center gap-1"><Pencil className="w-3.5 h-3.5 text-emerald-600" />تعديل</span>
        </div>
      </div>

      {/* تبويبات الأدوار */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
          const changed = hasChanges(role);
          const perms = pendingChanges[role] || {};
          const activeCount = Object.keys(perms).length;
          return (
            <button key={role} onClick={() => setActiveRole(role)} data-testid={`role-tab-${role}`}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-cairo font-semibold text-sm transition-all
                ${activeRole === role ? 'shadow-md scale-[1.02]' : 'hover:shadow-sm border-border bg-card'}`}
              style={activeRole === role ? { borderColor: cfg.color, backgroundColor: cfg.bg, color: cfg.color } : {}}>
              <Shield className="w-4 h-4" />
              {cfg.ar}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeRole === role ? 'bg-white/60' : 'bg-muted'}`}>{activeCount}</span>
              {changed && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-background" />}
            </button>
          );
        })}
      </div>

      {/* المحتوى */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* الشجرة */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="divide-y-0">
              {SITE_TREE.map(node => (
                <TreeNode
                  key={node.id}
                  node={node}
                  perms={activePerms}
                  onChange={(newPerms) => setPendingChanges(prev => ({ ...prev, [activeRole]: newPerms }))}
                  depth={0}
                  roleColor={ROLE_CONFIG[activeRole]?.color}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* الملخص */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-2"
                  style={{ backgroundColor: ROLE_CONFIG[activeRole]?.bg, color: ROLE_CONFIG[activeRole]?.color }}>
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <p className="font-cairo font-bold text-base">{ROLE_CONFIG[activeRole]?.ar}</p>
                <p className="text-xs text-muted-foreground mt-0.5">المستوى {ROLE_CONFIG[activeRole]?.level}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <p className="text-xl font-bold text-blue-600">{readCount}</p>
                  <p className="text-[9px] text-blue-600/70 flex items-center justify-center gap-1"><Eye className="w-3 h-3" />مشاهدة</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2.5">
                  <p className="text-xl font-bold text-emerald-600">{writeCount}</p>
                  <p className="text-[9px] text-emerald-600/70 flex items-center justify-center gap-1"><Pencil className="w-3 h-3" />تعديل</p>
                </div>
              </div>

              {hasChanges(activeRole) && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> تغييرات غير محفوظة
                </div>
              )}

              <Button onClick={() => saveRole(activeRole)} disabled={saving[activeRole] || !hasChanges(activeRole)}
                className="w-full gap-1.5" data-testid={`save-${activeRole}`}
                style={{ backgroundColor: ROLE_CONFIG[activeRole]?.color }}>
                {saving[activeRole] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ صلاحيات {ROLE_CONFIG[activeRole]?.ar}
              </Button>

              <Button variant="outline" onClick={() => resetRole(activeRole)}
                className="w-full gap-1.5 text-muted-foreground" data-testid={`reset-${activeRole}`}>
                <RotateCcw className="w-4 h-4" />
                إعادة للافتراضي
              </Button>

              {data.roles?.[activeRole]?.updated_at && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t">
                  <History className="w-3 h-3" />
                  آخر تحديث: {data.roles[activeRole].updated_by} — {new Date(data.roles[activeRole].updated_at).toLocaleDateString('ar-SA')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
