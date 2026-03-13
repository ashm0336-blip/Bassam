import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Users, Calendar, MapPin, Activity, BarChart3, Bell, Settings, LayoutDashboard,
  RefreshCw, Save, RotateCcw, Shield, ShieldCheck, FileText,
  ChevronDown, ChevronUp, AlertTriangle, Loader2,
  History, Eye, Pencil, X as XIcon, Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const LEVEL_CONFIG = {
  none:  { ar: "لا شي", icon: XIcon,   color: "text-slate-400", activeBg: "bg-slate-200 dark:bg-slate-700 ring-1 ring-slate-300" },
  read:  { ar: "قراءة", icon: Eye,     color: "text-blue-600",  activeBg: "bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400" },
  write: { ar: "تعديل", icon: Pencil,  color: "text-emerald-600", activeBg: "bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-400" },
};

// Tree structure mapping permissions to their page location
const PERM_TREE = [
  { key: "page_dashboard", icon: LayoutDashboard, color: "#0891b2", label_ar: "لوحة التحكم (غرفة العمليات)", children: [] },
  { key: "page_overview", icon: Layers, color: "#6366f1", label_ar: "نظرة عامة على الإدارة", children: [] },
  { key: "page_transactions", icon: FileText, color: "#7c3aed", label_ar: "المهام اليومية", children: [] },
  { key: "page_alerts", icon: Bell, color: "#f59e0b", label_ar: "التنبيهات والبلاغات", children: [] },
  { key: "page_reports", icon: BarChart3, color: "#06b6d4", label_ar: "التقارير", children: [] },
  { key: "page_field", icon: MapPin, color: "#f97316", label_ar: "الواجهة الميدانية", children: [] },
  { key: "page_employees", icon: Users, color: "#1d4ed8", label_ar: "إدارة الموظفين", children: [
    { key: "add_employees" },
    { key: "edit_employees" },
    { key: "delete_employees", danger: true },
    { key: "manage_accounts" },
    { key: "reset_pins" },
    { key: "change_roles", danger: true },
  ]},
  { key: "page_daily_log", icon: Calendar, color: "#047857", label_ar: "السجل اليومي والجلسات", children: [
    { key: "view_daily_sessions" },
    { key: "create_session" },
    { key: "approve_session" },
    { key: "delete_session", danger: true },
    { key: "start_prayer_round" },
    { key: "complete_prayer_round" },
    { key: "skip_prayer_round" },
    { key: "distribute_employees" },
    { key: "auto_distribute" },
    { key: "view_coverage_map" },
    { key: "enter_density" },
    { key: "view_density_reports" },
  ]},
  { key: "page_settings", icon: Settings, color: "#64748b", label_ar: "إعدادات القسم", children: [
    { key: "manage_settings" },
    { key: "manage_maps" },
    { key: "manage_shifts" },
  ]},
];

export default function PermissionsManager() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [resetting, setResetting] = useState({});
  const [activeRole, setActiveRole] = useState("department_manager");
  const [expandedNodes, setExpandedNodes] = useState({});
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
      // Expand all by default
      const exp = {};
      PERM_TREE.forEach(node => { if (node.children?.length > 0) exp[node.key] = true; });
      setExpandedNodes(exp);
    } catch { toast.error("فشل جلب الصلاحيات"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const setPermLevel = (role, perm, level) => {
    setPendingChanges(prev => {
      const current = { ...(prev[role] || {}) };
      if (level === "none") { delete current[perm]; }
      else { current[perm] = level; }
      return { ...prev, [role]: current };
    });
  };

  const getPermLevel = (perm) => pendingChanges[activeRole]?.[perm] || "none";

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
    setResetting(prev => ({ ...prev, [role]: true }));
    try {
      await axios.post(`${API}/admin/role-permissions/${role}/reset`, {}, getAuthHeaders());
      toast.success("تمت إعادة التعيين");
      fetchPermissions();
    } catch { toast.error("فشلت إعادة التعيين"); }
    finally { setResetting(prev => ({ ...prev, [role]: false })); }
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

  const allPerms = data.all_permissions || {};
  const activePerms = pendingChanges[activeRole] || {};
  const readCount = Object.values(activePerms).filter(v => v === "read").length;
  const writeCount = Object.values(activePerms).filter(v => v === "write").length;
  const totalActive = readCount + writeCount;

  const LevelButton = ({ permKey, danger }) => {
    const currentLevel = getPermLevel(permKey);
    return (
      <div className="flex gap-1 shrink-0">
        {["none", "read", "write"].map(level => {
          const cfg = LEVEL_CONFIG[level];
          const Icon = cfg.icon;
          const isActive = currentLevel === level;
          return (
            <button key={level} type="button" onClick={() => setPermLevel(activeRole, permKey, level)}
              data-testid={`${permKey}-${level}`} title={cfg.ar}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all
                ${isActive ? cfg.activeBg + ' ' + cfg.color : 'bg-transparent text-muted-foreground hover:bg-muted'}`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{cfg.ar}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-5" data-testid="permissions-manager" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-cairo font-bold text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> إدارة الصلاحيات
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">حدد مستوى الوصول لكل صفحة وصلاحية</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return <span key={key} className="flex items-center gap-1"><Icon className={`w-3.5 h-3.5 ${cfg.color}`} />{cfg.ar}</span>;
          })}
          <Button variant="outline" size="sm" onClick={fetchPermissions} className="gap-1.5 mr-2">
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </Button>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
          const changed = hasChanges(role);
          const perms = pendingChanges[role] || {};
          const count = Object.keys(perms).length;
          return (
            <button key={role} onClick={() => setActiveRole(role)} data-testid={`role-tab-${role}`}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-cairo font-semibold text-sm transition-all
                ${activeRole === role ? 'shadow-md scale-[1.02]' : 'hover:shadow-sm border-border bg-card'}`}
              style={activeRole === role ? { borderColor: cfg.color, backgroundColor: cfg.bg, color: cfg.color } : {}}>
              <Shield className="w-4 h-4" />
              {cfg.ar}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeRole === role ? 'bg-white/60' : 'bg-muted'}`}>{count}</span>
              {changed && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-background" />}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tree */}
        <div className="lg:col-span-2 space-y-2">
          {PERM_TREE.map(node => {
            const NodeIcon = node.icon || LayoutDashboard;
            const nodeColor = node.color || "#64748b";
            const nodeLabel = node.label_ar || allPerms[node.key]?.ar || node.key;
            const hasKids = node.children?.length > 0;
            const isExpanded = expandedNodes[node.key] !== false;
            const isPage = node.key.startsWith("page_");
            const activeKids = hasKids ? node.children.filter(c => activePerms[c.key]).length : 0;

            return (
              <Card key={node.key} className="overflow-hidden border">
                {/* Parent node */}
                <div className={`flex items-center justify-between p-3 ${hasKids ? 'cursor-pointer hover:bg-muted/30' : ''}`}
                  onClick={() => hasKids && setExpandedNodes(prev => ({ ...prev, [node.key]: !prev[node.key] }))}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: nodeColor + "18", color: nodeColor }}>
                      <NodeIcon className="w-4 h-4" />
                    </div>
                    <span className="font-cairo font-bold text-sm">{nodeLabel}</span>
                    {hasKids && <span className="text-[11px] text-muted-foreground">{activeKids}/{node.children.length}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {isPage && <LevelButton permKey={node.key} />}
                    {hasKids && (isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />)}
                  </div>
                </div>

                {/* Children */}
                {hasKids && isExpanded && (
                  <div className="border-t divide-y">
                    {node.children.map(child => {
                      const childLabel = allPerms[child.key]?.ar || child.key;
                      const isDanger = child.danger || allPerms[child.key]?.danger;
                      return (
                        <div key={child.key} className={`flex items-center justify-between px-4 pr-12 py-2.5 ${isDanger ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`} data-testid={`perm-${child.key}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1 h-4 rounded-full mr-1" style={{ backgroundColor: nodeColor + "40" }} />
                            {isDanger && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            <span className={`text-sm font-cairo ${isDanger ? 'text-red-700 dark:text-red-400' : ''}`}>{childLabel}</span>
                            {isDanger && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full border border-red-200 dark:bg-red-900/30 dark:text-red-400">حساسة</span>}
                          </div>
                          <LevelButton permKey={child.key} danger={isDanger} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Summary */}
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

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                  <p className="text-xl font-bold text-emerald-600">{writeCount}</p>
                  <p className="text-[9px] text-emerald-600/70">تعديل</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                  <p className="text-xl font-bold text-blue-600">{readCount}</p>
                  <p className="text-[9px] text-blue-600/70">قراءة</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                  <p className="text-xl font-bold text-slate-400">{Object.keys(allPerms).length - totalActive}</p>
                  <p className="text-[9px] text-muted-foreground">بدون</p>
                </div>
              </div>

              {hasChanges(activeRole) && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> تغييرات غير محفوظة
                </div>
              )}

              <Button onClick={() => saveRole(activeRole)} disabled={saving[activeRole] || !hasChanges(activeRole)}
                className="w-full gap-1.5" data-testid={`save-${activeRole}`}
                style={{ backgroundColor: ROLE_CONFIG[activeRole]?.color }}>
                {saving[activeRole] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ صلاحيات {ROLE_CONFIG[activeRole]?.ar}
              </Button>

              <Button variant="outline" onClick={() => resetRole(activeRole)} disabled={resetting[activeRole]}
                className="w-full gap-1.5 text-muted-foreground" data-testid={`reset-${activeRole}`}>
                {resetting[activeRole] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
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
