import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Users, Calendar, MapPin, Activity, BarChart3, Bell, Settings,
  RefreshCw, Save, RotateCcw, Shield, ShieldCheck, ShieldAlert,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Loader2,
  History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
});

// Role config
const ROLE_CONFIG = {
  general_manager:    { ar: "المدير العام",      color: "#7c3aed", bg: "#f5f3ff", level: 4 },
  department_manager: { ar: "مدير الإدارة",       color: "#1d4ed8", bg: "#eff6ff", level: 3 },
  shift_supervisor:   { ar: "مشرف الوردية",      color: "#0f766e", bg: "#f0fdfa", level: 2 },
  field_staff:        { ar: "موظف ميداني",        color: "#047857", bg: "#ecfdf5", level: 1 },
  admin_staff:        { ar: "موظف إداري",         color: "#64748b", bg: "#f8fafc", level: 1 },
};

const GROUP_ICONS = { employees: Users, sessions: Calendar, field: MapPin, density: Activity, reports: BarChart3, alerts: Bell, settings: Settings };
const GROUP_COLORS = { employees: "#1d4ed8", sessions: "#047857", field: "#0f766e", density: "#d97706", reports: "#7c3aed", alerts: "#dc2626", settings: "#64748b" };

export default function PermissionsManager() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [resetting, setResetting] = useState({});
  const [activeRole, setActiveRole] = useState("department_manager");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [pendingChanges, setPendingChanges] = useState({});  // role → permissions[]

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/role-permissions`, getAuthHeaders());
      setData(res.data);
      // Init pending from current
      const init = {};
      Object.entries(res.data.roles || {}).forEach(([role, info]) => {
        init[role] = [...(info.permissions || [])];
      });
      // Fill missing roles with defaults
      Object.entries(res.data.defaults || {}).forEach(([role, perms]) => {
        if (!init[role]) init[role] = [...perms];
      });
      setPendingChanges(init);
      // Expand all groups by default
      const groups = {};
      Object.values(res.data.all_permissions || {}).forEach(p => { groups[p.group] = true; });
      setExpandedGroups(groups);
    } catch (e) {
      toast.error("فشل جلب الصلاحيات");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const togglePermission = (role, perm) => {
    setPendingChanges(prev => {
      const current = prev[role] || [];
      const updated = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
      return { ...prev, [role]: updated };
    });
  };

  const toggleGroupAll = (role, group, allPerms) => {
    const groupPerms = allPerms.filter(([k, v]) => v.group === group).map(([k]) => k);
    setPendingChanges(prev => {
      const current = prev[role] || [];
      const allSelected = groupPerms.every(p => current.includes(p));
      if (allSelected) {
        return { ...prev, [role]: current.filter(p => !groupPerms.includes(p)) };
      } else {
        const merged = [...new Set([...current, ...groupPerms])];
        return { ...prev, [role]: merged };
      }
    });
  };

  const saveRole = async (role) => {
    setSaving(prev => ({ ...prev, [role]: true }));
    try {
      const res = await axios.put(
        `${API}/admin/role-permissions/${role}`,
        { permissions: pendingChanges[role] || [] },
        getAuthHeaders()
      );
      toast.success(res.data.message || "تم الحفظ ✅");
      fetchPermissions();
      // Note: existing sessions will use updated perms on next login
      toast.info("سيحتاج المستخدمون لإعادة تسجيل الدخول لتطبيق التغييرات", { duration: 4000 });
    } catch (e) {
      toast.error(e.response?.data?.detail || "فشل الحفظ");
    } finally { setSaving(prev => ({ ...prev, [role]: false })); }
  };

  const resetRole = async (role) => {
    setResetting(prev => ({ ...prev, [role]: true }));
    try {
      const res = await axios.post(`${API}/admin/role-permissions/${role}/reset`, {}, getAuthHeaders());
      toast.success(res.data.message || "تمت إعادة التعيين");
      fetchPermissions();
    } catch (e) {
      toast.error("فشلت إعادة التعيين");
    } finally { setResetting(prev => ({ ...prev, [role]: false })); }
  };

  const hasChanges = (role) => {
    if (!data) return false;
    const saved = data.roles?.[role]?.permissions || data.defaults?.[role] || [];
    const pending = pendingChanges[role] || [];
    if (saved.length !== pending.length) return true;
    return !saved.every(p => pending.includes(p));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!data) return null;

  const allPermsEntries = Object.entries(data.all_permissions || {});
  const groups = [...new Set(allPermsEntries.map(([, v]) => v.group))];
  const roleKeys = Object.keys(ROLE_CONFIG);
  const activeRolePerms = pendingChanges[activeRole] || [];
  const savedPerms = data.roles?.[activeRole]?.permissions || data.defaults?.[activeRole] || [];

  return (
    <div className="space-y-5" data-testid="permissions-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-cairo font-bold text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary"/>
            إدارة الصلاحيات
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            حدد ما يستطيع كل دور القيام به في النظام
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPermissions} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5"/> تحديث
        </Button>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 flex-wrap">
        {roleKeys.map(role => {
          const cfg = ROLE_CONFIG[role];
          const changed = hasChanges(role);
          const permsCount = (pendingChanges[role] || []).length;
          return (
            <button key={role} onClick={() => setActiveRole(role)}
              data-testid={`role-tab-${role}`}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-cairo font-semibold text-sm transition-all
                ${activeRole === role ? 'shadow-md scale-[1.02]' : 'hover:shadow-sm border-border bg-card'}`}
              style={activeRole === role ? { borderColor: cfg.color, backgroundColor: cfg.bg, color: cfg.color } : {}}>
              <Shield className="w-4 h-4"/>
              {cfg.ar}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeRole === role ? 'bg-white/60' : 'bg-muted'}`}>
                {permsCount}
              </span>
              {changed && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-background"/>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Role Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Permissions Checklist */}
        <div className="lg:col-span-2 space-y-3">
          {groups.map(group => {
            const GroupIcon = GROUP_ICONS[group] || Shield;
            const groupColor = GROUP_COLORS[group] || "#64748b";
            const groupLabel = data.group_labels?.[group]?.ar || group;
            const groupPerms = allPermsEntries.filter(([, v]) => v.group === group);
            const selectedCount = groupPerms.filter(([k]) => activeRolePerms.includes(k)).length;
            const allSelected = selectedCount === groupPerms.length;
            const isExpanded = expandedGroups[group] !== false;

            return (
              <Card key={group} className="overflow-hidden border">
                {/* Group Header */}
                <button type="button"
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }))}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: groupColor + "18", color: groupColor }}>
                      <GroupIcon className="w-4 h-4"/>
                    </div>
                    <span className="font-cairo font-bold text-sm">{groupLabel}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {selectedCount}/{groupPerms.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Select All toggle */}
                    <button type="button"
                      onClick={e => { e.stopPropagation(); toggleGroupAll(activeRole, group, allPermsEntries); }}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors
                        ${allSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {allSelected ? '✓ الكل' : 'تحديد الكل'}
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground"/> : <ChevronDown className="w-4 h-4 text-muted-foreground"/>}
                  </div>
                </button>

                {/* Permissions list */}
                {isExpanded && (
                  <CardContent className="p-0 border-t">
                    <div className="divide-y">
                      {groupPerms.map(([permKey, permInfo]) => {
                        const isActive = activeRolePerms.includes(permKey);
                        const isDanger = permInfo.danger;
                        return (
                          <div key={permKey}
                            className={`flex items-center justify-between px-4 py-2.5 transition-colors
                              ${isDanger ? 'bg-red-50/30' : ''}
                              ${isActive ? 'bg-emerald-50/20' : 'hover:bg-muted/20'}`}
                            data-testid={`perm-${permKey}`}>
                            <div className="flex items-center gap-2.5">
                              {isDanger && (
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0"
                                  title="صلاحية حساسة"/>
                              )}
                              <span className={`text-sm font-cairo ${isDanger ? 'text-red-700' : 'text-foreground'}`}>
                                {permInfo.ar}
                              </span>
                              {isDanger && (
                                <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full border border-red-200">
                                  حساسة
                                </span>
                              )}
                            </div>
                            <Switch
                              checked={isActive}
                              onCheckedChange={() => togglePermission(activeRole, permKey)}
                              data-testid={`switch-${permKey}`}
                              className={isDanger ? 'data-[state=checked]:bg-red-500' : ''}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Right: Summary + Actions */}
        <div className="space-y-4">
          {/* Role summary card */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-2"
                  style={{ backgroundColor: ROLE_CONFIG[activeRole]?.bg, color: ROLE_CONFIG[activeRole]?.color }}>
                  <ShieldCheck className="w-7 h-7"/>
                </div>
                <p className="font-cairo font-bold text-base">{ROLE_CONFIG[activeRole]?.ar}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  المستوى {ROLE_CONFIG[activeRole]?.level} في الهرم
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-xl font-bold text-primary">{activeRolePerms.length}</p>
                  <p className="text-[9px] text-muted-foreground">مُفعَّلة</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-xl font-bold text-slate-400">{allPermsEntries.length - activeRolePerms.length}</p>
                  <p className="text-[9px] text-muted-foreground">معطَّلة</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-xl font-bold text-amber-500">{activeRolePerms.filter(p => data.all_permissions[p]?.danger).length}</p>
                  <p className="text-[9px] text-muted-foreground">حساسة</p>
                </div>
              </div>

              {/* Change indicator */}
              {hasChanges(activeRole) && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0"/>
                  تغييرات غير محفوظة
                </div>
              )}

              {/* Save button */}
              <Button onClick={() => saveRole(activeRole)} disabled={saving[activeRole] || !hasChanges(activeRole)}
                className="w-full gap-1.5" data-testid={`save-${activeRole}`}
                style={{ backgroundColor: ROLE_CONFIG[activeRole]?.color }}>
                {saving[activeRole] ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                حفظ صلاحيات {ROLE_CONFIG[activeRole]?.ar}
              </Button>

              {/* Reset button */}
              <Button variant="outline" onClick={() => resetRole(activeRole)} disabled={resetting[activeRole]}
                className="w-full gap-1.5 text-muted-foreground" data-testid={`reset-${activeRole}`}>
                {resetting[activeRole] ? <Loader2 className="w-4 h-4 animate-spin"/> : <RotateCcw className="w-4 h-4"/>}
                إعادة للافتراضي
              </Button>

              {/* Last updated */}
              {data.roles?.[activeRole]?.updated_at && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t">
                  <History className="w-3 h-3"/>
                  آخر تحديث: {data.roles[activeRole].updated_by}
                  <br/>
                  {new Date(data.roles[activeRole].updated_at).toLocaleDateString('ar-SA')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permissions summary list */}
          <Card>
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm font-cairo flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500"/>
                الصلاحيات المُفعَّلة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2 max-h-[300px] overflow-y-auto space-y-1">
              {activeRolePerms.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد صلاحيات مُفعَّلة</p>
              ) : activeRolePerms.map(perm => {
                const info = data.all_permissions[perm];
                return (
                  <div key={perm} className="flex items-center gap-1.5 text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${info?.danger ? 'bg-red-400' : 'bg-emerald-400'}`}/>
                    <span>{info?.ar || perm}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
