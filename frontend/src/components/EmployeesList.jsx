/**
 * EmployeesList — تبويب "الموظفون" الجديد
 * بيانات ثابتة + إدارة حسابات (تنشيط/تجميد/صلاحيات/كلمة مرور)
 * عرض: بطاقات | قائمة
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { useAuth, DEPT_LABELS } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRealtimeRefresh } from "@/context/WebSocketContext";
import {
  Plus, Search, LayoutGrid, List, Download, Upload, FileText,
  Edit, Trash2, ShieldCheck, ShieldX, ShieldOff, UserPlus, KeyRound,
  Loader2, MoreVertical, User, Users, Briefcase, Calendar, Hash,
  RefreshCw, Filter, ChevronDown, Phone, Building2, Shield,
  Check, X, Info, UserCheck, CalendarDays, Clock, Zap,
  Eye, EyeOff, Pencil, Lock, Settings,
  LayoutDashboard, Navigation, DoorOpen, LayoutGrid as LayoutGridIcon,
  Circle, Bell, MapPin, Copy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── Constants ─────────────────────────────────────────────────
const EMPLOYMENT_TYPES = [
  { value: "permanent", label_ar: "دائم",   label_en: "Permanent", color: "#004D38", bg: "#ecfdf5", border: "#a7f3d0" },
  { value: "seasonal",  label_ar: "موسمي",  label_en: "Seasonal",  color: "#0284c7", bg: "#e0f2fe", border: "#7dd3fc" },
  { value: "temporary", label_ar: "مؤقت",   label_en: "Temporary", color: "#9333ea", bg: "#faf5ff", border: "#d8b4fe" },
];
const SEASONS = [
  { value: "ramadan", label_ar: "رمضان", label_en: "Ramadan" },
  { value: "hajj",    label_ar: "حج",    label_en: "Hajj" },
  { value: "umrah",   label_ar: "عمرة",  label_en: "Umrah" },
];
const ACCOUNT_STATUS_CFG = {
  active:     { label:"نشط",        color:"#059669", bg:"#ecfdf5", border:"#a7f3d0", Icon:ShieldCheck },
  pending:    { label:"معلق",       color:"#d97706", bg:"#fffbeb", border:"#fcd34d", Icon:ShieldOff   },
  frozen:     { label:"مجمَّد",     color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe", Icon:ShieldX     },
  terminated: { label:"منتهي",      color:"#dc2626", bg:"#fef2f2", border:"#fecaca", Icon:ShieldX     },
  no_account: { label:"بلا حساب",   color:"#6b7280", bg:"#f9fafb", border:"#e5e7eb", Icon:UserPlus    },
};
const EMP_TYPE_CFG = {
  permanent: { label:"دائم",   color:"#059669", bg:"#ecfdf5" },
  seasonal:  { label:"موسمي",  color:"#0284c7", bg:"#e0f2fe" },
  temporary: { label:"مؤقت",   color:"#7c3aed", bg:"#f5f3ff" },
};
const ROLE_CFG = {
  field_staff:        { label:"موظف ميداني",     color:"#6b7280" },
  shift_supervisor:   { label:"مشرف وردية",      color:"#0284c7" },
  department_manager: { label:"مدير إدارة",      color:"#7c3aed" },
  general_manager:    { label:"مدير عام",        color:"#dc2626" },
  system_admin:       { label:"مسؤول النظام",    color:"#dc2626" },
  admin_staff:        { label:"موظف إداري",      color:"#6b7280" },
};

// ── Account Status Icon (نفس تصميم EmployeeManagement بالضبط) ──
function AccountStatusIcon({ emp, canManageAccounts, canResetPins, onAccountAction, isAr }) {
  const acStatus = emp.account_status;
  if (!emp.national_id) return (
    <div className="flex items-center justify-center"
      title={isAr ? 'لا رقم هوية — أضفه لإنشاء حساب' : 'No national ID'}>
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
        <ShieldOff className="w-3.5 h-3.5 text-slate-300" />
      </div>
    </div>
  );
  const cfgs = {
    active:     { cls:'bg-emerald-100 text-emerald-600 ring-emerald-200', Icon:ShieldCheck, tip:isAr?'نشط — انقر للتجميد مؤقتاً':'Active — click to freeze',  action:'freeze-account'    },
    pending:    { cls:'bg-amber-100 text-amber-600 ring-amber-200',       Icon:ShieldOff,   tip:isAr?'معلق — انقر للتفعيل':'Pending — click to activate',       action:'activate-account'  },
    frozen:     { cls:'bg-blue-100 text-blue-600 ring-blue-200',          Icon:ShieldX,     tip:isAr?'مجمَّد — انقر للتفعيل':'Frozen — click to activate',       action:'activate-account'  },
    terminated: { cls:'bg-red-100 text-red-400 ring-red-100',             Icon:ShieldX,     tip:isAr?'منتهي الخدمة':'Service terminated',                       action:null                },
    no_account: { cls:'bg-slate-100 text-slate-400 ring-slate-100',       Icon:UserPlus,    tip:isAr?'انقر لإنشاء حساب':'Create account',                       action:'activate-account'  },
  };
  const cfg = cfgs[acStatus] || cfgs.no_account;
  const { Icon } = cfg;
  return (
    <div className="flex items-center gap-1 justify-center">
      <button type="button" disabled={!canManageAccounts || acStatus === 'terminated'}
        onClick={() => canManageAccounts && cfg.action && onAccountAction(emp.id, cfg.action, emp.name)}
        title={cfg.tip} data-testid={`account-icon-${emp.id}`}
        className={`w-7 h-7 rounded-full flex items-center justify-center ring-1 transition-all ${cfg.cls}
          ${canManageAccounts && cfg.action ? 'cursor-pointer hover:scale-110 hover:shadow-sm' : 'cursor-default'}`}>
        <Icon className="w-3.5 h-3.5" />
      </button>
      {canResetPins && (acStatus === 'active' || acStatus === 'frozen') && (
        <button type="button"
          onClick={() => onAccountAction(emp.id, 'reset-pin', emp.name)}
          title={isAr ? 'إعادة تعيين PIN' : 'Reset PIN'}
          data-testid={`reset-pin-icon-${emp.id}`}
          className="w-6 h-6 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center hover:bg-amber-100 hover:scale-110 transition-all ring-1 ring-amber-100 cursor-pointer">
          <KeyRound className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── Role Selector (نفس تصميم EmployeeManagement بالضبط) ──────────
const ROLE_COLORS = {
  general_manager:    '#7c3aed',
  department_manager: '#1d4ed8',
  shift_supervisor:   '#0f766e',
  field_staff:        '#047857',
  admin_staff:        '#64748b',
};
const ROLE_LABELS_MAP = {
  general_manager:    'مدير عام',
  department_manager: 'مدير إدارة',
  shift_supervisor:   'مشرف وردية',
  field_staff:        'موظف ميداني',
  admin_staff:        'موظف إداري',
};
const ALL_ASSIGNABLE_ROLES = [
  { value: 'general_manager',    ar: 'مدير عام',      level: 4 },
  { value: 'department_manager', ar: 'مدير إدارة',    level: 3 },
  { value: 'shift_supervisor',   ar: 'مشرف وردية',   level: 2 },
  { value: 'field_staff',        ar: 'موظف ميداني',  level: 1 },
  { value: 'admin_staff',        ar: 'موظف إداري',   level: 1 },
];

function RoleSelector({ emp, permGroups = [] }) {
  if (!emp.user_id) return <span className="text-[9px] text-slate-400">—</span>;
  const currentGroup = permGroups.find(g => g.id === emp.permission_group_id);
  const name = currentGroup?.name_ar || 'بدون مجموعة';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${currentGroup ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>
      <Shield className="w-3 h-3" />{name}
    </span>
  );
}

// ── Sub-components ────────────────────────────────────────────

function AccountBadge({ status }) {
  const cfg = ACCOUNT_STATUS_CFG[status] || ACCOUNT_STATUS_CFG.no_account;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function EmpTypeBadge({ type }) {
  const cfg = EMP_TYPE_CFG[type || "permanent"];
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function AvatarInitial({ name, size = "md" }) {
  const sizes = { sm: "w-8 h-8 text-sm", md: "w-11 h-11 text-base", lg: "w-14 h-14 text-xl" };
  const colors = ["bg-violet-500","bg-emerald-500","bg-sky-500","bg-amber-500","bg-rose-500","bg-indigo-500"];
  const colorIdx = (name?.charCodeAt(0) || 0) % colors.length;
  return (
    <div className={`${sizes[size]} ${colors[colorIdx]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm`}>
      {name?.charAt(0) || "؟"}
    </div>
  );
}

// ── Employee Card (Cards View) ─────────────────────────────────

// ── Employee Card — تصميم احترافي متناسق ──────────────────────
function EmployeeCard({ emp, canEdit, canDelete, canManageAccounts, canResetPins, canChangeRoles, myLevel,
    onEdit, onDelete, onAccountAction, onChangeRole, isAr, permGroups, onOpenProfile }) {
  const acCfg = ACCOUNT_STATUS_CFG[emp.account_status] || ACCOUNT_STATUS_CFG.no_account;
  const hasNatId = !!emp.national_id;
  const avatarColors = ["#7c3aed","#047857","#0284c7","#b45309","#dc2626","#0f766e"];
  const avatarColor = avatarColors[(emp.name?.charCodeAt(0)||0) % avatarColors.length];

  return (
    <Card className="group relative border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden rounded-2xl"
      style={{ boxShadow: `0 2px 12px ${acCfg.color}18` }}
      data-testid={`emp-card-${emp.id}`}>
      <div className="absolute right-0 top-0 bottom-0 w-1 rounded-l-full" style={{ background: acCfg.color }} />
      <div className="absolute inset-0 opacity-[0.03] rounded-2xl"
        style={{ background: `linear-gradient(135deg, ${acCfg.color}, transparent)` }} />
      <CardContent className="relative p-3.5">
        {/* الصف الأول: أفاتار + اسم + قائمة */}
        <div className="flex items-start gap-2.5 mb-2.5">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-md"
              style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}cc)` }}>
              {emp.name?.charAt(0) || "؟"}
            </div>
            <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"
              style={{ backgroundColor: acCfg.color }}>
              <acCfg.Icon className="w-2 h-2 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <button onClick={() => onOpenProfile(emp)} className="font-cairo font-bold text-sm leading-tight truncate text-right hover:text-primary transition-colors cursor-pointer block">{emp.name}</button>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{emp.job_title || "—"}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {emp.employee_number && (
                <span className="text-[9px] font-mono text-slate-400 flex items-center gap-0.5">
                  <Hash className="w-2.5 h-2.5"/>{emp.employee_number}
                </span>
              )}
              {emp.national_id && (
                <span className="text-[9px] font-mono text-slate-400 flex items-center gap-0.5">
                  <User className="w-2.5 h-2.5"/>{emp.national_id}
                </span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"
                className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-100 flex-shrink-0"
                data-testid={`emp-card-menu-${emp.id}`}>
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" dir="rtl" className="font-cairo w-52">
              {canEdit && <DropdownMenuItem onClick={()=>onEdit(emp)}><Edit className="w-4 h-4 ml-2 text-slate-500"/>تعديل البيانات</DropdownMenuItem>}
              {canResetPins && hasNatId && (emp.account_status==="active"||emp.account_status==="frozen") && (
                <DropdownMenuItem onClick={()=>onAccountAction(emp.id,"reset-pin",emp.name)}><KeyRound className="w-4 h-4 ml-2 text-amber-500"/>إعادة تعيين PIN</DropdownMenuItem>
              )}
              {canManageAccounts && hasNatId && <>
                <DropdownMenuSeparator/>
                {emp.account_status==="active" && <DropdownMenuItem onClick={()=>onAccountAction(emp.id,"freeze-account",emp.name)} className="text-blue-600"><ShieldX className="w-4 h-4 ml-2"/>تجميد مؤقتاً</DropdownMenuItem>}
                {["pending","frozen","no_account"].includes(emp.account_status||"no_account") && <DropdownMenuItem onClick={()=>onAccountAction(emp.id,"activate-account",emp.name)} className="text-emerald-600"><ShieldCheck className="w-4 h-4 ml-2"/>تفعيل الحساب</DropdownMenuItem>}
                {emp.account_status!=="terminated" && <DropdownMenuItem onClick={()=>onAccountAction(emp.id,"terminate-account",emp.name)} className="text-orange-600"><ShieldOff className="w-4 h-4 ml-2"/>إنهاء الخدمة</DropdownMenuItem>}
              </>}
              {canDelete && <><DropdownMenuSeparator/><DropdownMenuItem onClick={()=>onDelete(emp)} className="text-destructive"><Trash2 className="w-4 h-4 ml-2"/>حذف نهائياً</DropdownMenuItem></>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* الصف الثاني: رقم الجوال + نوع التوظيف */}
        <div className="flex items-center justify-between gap-2 py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-100 mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Phone className="w-3 h-3 text-sky-500 flex-shrink-0" />
            <span className="text-[10px] font-mono text-sky-600 truncate">
              {emp.contact_phone || emp.phone || <span className="text-slate-400 not-italic">لا يوجد</span>}
            </span>
          </div>
          <EmpTypeBadge type={emp.employment_type} />
        </div>
        {/* الصف الثالث: الحساب + الصلاحيات */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-medium text-slate-400">الحساب</span>
            <AccountStatusIcon emp={emp} canManageAccounts={canManageAccounts}
              canResetPins={canResetPins} onAccountAction={onAccountAction} isAr={isAr}/>
          </div>
          {canChangeRoles && (
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-violet-400" />
              <RoleSelector emp={emp} permGroups={permGroups}/>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


// ── Main Component ────────────────────────────────────────────
export default function EmployeesList({ department, onEmployeeAdded }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const token = () => localStorage.getItem("token");
  const headers = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState("list"); // list | cards
  const [search, setSearch]       = useState("");
  const [filterType, setFilterType]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Dialog states
  const [empDialog, setEmpDialog]     = useState(false);
  const [editEmp, setEditEmp]         = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [nationalIdStatus, setNationalIdStatus] = useState(null);
  const nationalIdTimerRef = useRef(null);

  const emptyForm = {
    name:"", employee_number:"", national_id:"", job_title:"",
    employment_type:"permanent", contact_phone:"", permission_group_id:"",
    season:"", contract_end:"",
  };
  const [form, setForm] = useState(emptyForm);
  const [permGroups, setPermGroups] = useState([]);
  const [customPermEmp, setCustomPermEmp] = useState(null);
  const [customPerms, setCustomPerms] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [savingCustom, setSavingCustom] = useState(false);
  const [copyPermEmp, setCopyPermEmp] = useState(null);
  const [customPermExpanded, setCustomPermExpanded] = useState({});
  const [copySource, setCopySource] = useState("");
  const [profileEmp, setProfileEmp] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Live national ID check
  const checkNationalId = useCallback(async (id, excludeEmpId=null) => {
    if (!id || id.length < 10) { setNationalIdStatus(id.length > 0 ? 'too_short' : null); return; }
    if (id.length > 10) { setNationalIdStatus('too_long'); return; }
    if (!/^[12]\d{9}$/.test(id)) { setNationalIdStatus('format_error'); return; }
    setNationalIdStatus('checking');
    try {
      const url = `${API}/employees/check-national-id?national_id=${id}${excludeEmpId?`&exclude_emp_id=${excludeEmpId}`:''}`;
      const res = await axios.get(url, headers());
      setNationalIdStatus(res.data.available ? 'available' : 'taken');
    } catch { setNationalIdStatus(null); }
  }, []);

  // Permissions
  const canWrite = (perm) => user?.permissions?.[perm] === "write" || user?.role === "system_admin";
  const canRead  = (perm) => ["read","write"].includes(user?.permissions?.[perm]) || user?.role === "system_admin";
  const canAdd       = canWrite("add_employees");
  const canEdit      = canWrite("edit_employees");
  const canDelete    = canWrite("delete_employees");
  const canManage    = canWrite("manage_accounts");
  const canResetPins = canWrite("reset_pins");
  const canChangeRoles = canWrite("change_roles");
  const canImport    = canWrite("import_employees");
  const canExport    = canRead("export_employees");
  const ROLE_HIERARCHY = { system_admin:5, general_manager:4, department_manager:3, shift_supervisor:2, field_staff:1, admin_staff:1 };
  const myLevel = ROLE_HIERARCHY[user?.role] || 0;

  // ── Fetch ──────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, grpRes, menuRes] = await Promise.all([
        axios.get(`${API}/employees?department=${department}`, headers()),
        axios.get(`${API}/admin/permission-groups`, headers()).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/sidebar-menu`, headers()).catch(() => ({ data: [] })),
      ]);
      setEmployees(empRes.data);
      setPermGroups(grpRes.data);
      setMenuItems(menuRes.data);
    } catch { toast.error("فشل جلب بيانات الموظفين"); }
    finally { setLoading(false); }
  }, [department]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useRealtimeRefresh(["employees"], fetchEmployees);

  // ── Filtered ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    return employees.filter(e => {
      if (filterType !== "all" && e.employment_type !== filterType) return false;
      if (filterStatus !== "all" && (e.account_status || "no_account") !== filterStatus) return false;
      if (search && !e.name?.includes(search) && !e.national_id?.includes(search) && !e.job_title?.includes(search)) return false;
      return true;
    });
  }, [employees, filterType, filterStatus, search]);

  // ── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      employees.length,
    active:     employees.filter(e => e.account_status === "active").length,
    pending:    employees.filter(e => ["pending","no_account"].includes(e.account_status || "no_account")).length,
    frozen:     employees.filter(e => e.account_status === "frozen").length,
    permanent:  employees.filter(e => (e.employment_type||"permanent") === "permanent").length,
    seasonal:   employees.filter(e => e.employment_type === "seasonal").length,
    temporary:  employees.filter(e => e.employment_type === "temporary").length,
  }), [employees]);

  // ── Account Action ─────────────────────────────────────────
  const [actionConfirm, setActionConfirm] = useState(null);

  const handleAccountAction = async (empId, action, empName) => {
    setActionConfirm({ empId, action, empName });
  };

  const executeAccountAction = async () => {
    if (!actionConfirm) return;
    const { empId, action } = actionConfirm;
    try {
      const res = await axios.post(`${API}/employees/${empId}/${action}`, {}, headers());
      const msg = res.data?.message || "تم تنفيذ العملية بنجاح";
      if (res.data?.login_info) {
        toast.success(msg + "\n" + res.data.login_info, { duration: 10000 });
      } else {
        toast.success(msg, { duration: 5000 });
      }
      fetchEmployees();
    } catch (e) { toast.error(e.response?.data?.detail || "فشلت العملية"); }
    finally { setActionConfirm(null); }
  };

  // ── Change Permission Group ────────────────────────────────
  const handleChangeRole = async (emp, newGroupId) => {
    try {
      let customCleared = false;
      if (emp.user_id) {
        const res = await axios.put(`${API}/admin/users/${emp.user_id}/permission-group`,
          { permission_group_id: newGroupId }, headers());
        customCleared = res.data?.custom_cleared;
        if (customCleared) {
          toast.info(`تم مسح ${res.data.custom_cleared_count} صلاحية فردية سابقة تلقائياً`, { duration: 4000 });
        }
      }
      await axios.put(`${API}/employees/${emp.id}`, { permission_group_id: newGroupId }, headers());
      const grpName = permGroups.find(g => g.id === newGroupId)?.name_ar || 'بدون مجموعة';
      toast.success(`تم تغيير المجموعة إلى: ${grpName}`);
      fetchEmployees();
    } catch (e) { toast.error(e.response?.data?.detail || "فشل تغيير المجموعة"); }
  };

  // ── Reset Custom Permissions ──────────────────────────────
  const handleResetCustomPerms = async (emp) => {
    if (!emp.user_id) return;
    try {
      const res = await axios.delete(`${API}/admin/users/${emp.user_id}/custom-permissions`, headers());
      toast.success(res.data?.message || "تم مسح الصلاحيات الفردية");
      setCustomPermEmp(null);
      setCustomPerms({});
      fetchEmployees();
    } catch (e) { toast.error(e.response?.data?.detail || "فشل إعادة الضبط"); }
  };

  // ── Custom Permissions Dialog ─────────────────────────────
  const openCustomPerms = async (emp) => {
    if (!emp.user_id) return toast.error("فعّل حساب الموظف أولاً");
    setCustomPermEmp(emp);
    // Fetch user's current custom_permissions
    try {
      const res = await axios.get(`${API}/employees/${emp.id}/profile`, headers());
      setCustomPerms(res.data?.account?.custom_permissions || {});
    } catch {
      setCustomPerms({});
    }
  };

  const saveCustomPerms = async () => {
    if (!customPermEmp?.user_id) return;
    setSavingCustom(true);
    try {
      await axios.put(`${API}/admin/users/${customPermEmp.user_id}/custom-permissions`,
        { custom_permissions: customPerms }, headers());
      toast.success("تم حفظ الصلاحيات الفردية");
      setCustomPermEmp(null);
      fetchEmployees();
    } catch (e) { toast.error(e.response?.data?.detail || "فشل الحفظ"); }
    finally { setSavingCustom(false); }
  };

  const toggleCustomPerm = (href, field) => {
    setCustomPerms(prev => {
      const current = prev[href] || {};
      const updated = { ...current };
      if (field === "visible") {
        updated.visible = !updated.visible;
        if (!updated.visible) updated.editable = false;
      } else {
        updated.editable = !updated.editable;
      }
      // If both false, remove the override
      if (!updated.visible && !updated.editable) {
        const next = { ...prev };
        delete next[href];
        return next;
      }
      return { ...prev, [href]: updated };
    });
  };

  const removeCustomOverride = (href) => {
    setCustomPerms(prev => {
      const next = { ...prev };
      delete next[href];
      return next;
    });
  };

  // ── Copy Permissions Dialog ─────────────────────────────
  const openCopyPerms = (emp) => {
    if (!emp.user_id) return toast.error("فعّل حساب الموظف أولاً");
    setCopyPermEmp(emp);
    setCopySource("");
  };

  const executeCopyPerms = async () => {
    if (!copyPermEmp?.user_id || !copySource) return;
    setSavingCustom(true);
    try {
      await axios.put(`${API}/admin/users/${copyPermEmp.user_id}/copy-permissions`,
        { source_user_id: copySource }, headers());
      toast.success("تم نسخ الصلاحيات بنجاح");
      setCopyPermEmp(null);
      fetchEmployees();
    } catch (e) { toast.error(e.response?.data?.detail || "فشل النسخ"); }
    finally { setSavingCustom(false); }
  };

  // ── Profile Dialog ─────────────────────────────────────────
  const openProfile = async (emp) => {
    setProfileEmp(emp);
    setProfileLoading(true);
    setProfileData(null);
    try {
      const res = await axios.get(`${API}/employees/${emp.id}/profile`, headers());
      setProfileData(res.data);
    } catch { toast.error("فشل جلب البروفايل"); }
    finally { setProfileLoading(false); }
  };



  // ── Open Dialog ───────────────────────────────────────────
  const handleOpenDialog = (emp=null) => {
    setNationalIdStatus(null);
    if (emp) {
      setEditEmp(emp);
      setForm({
        name: emp.name||"", employee_number: emp.employee_number||"",
        national_id: emp.national_id||"", job_title: emp.job_title||"",
        employment_type: emp.employment_type||"permanent",
        contact_phone: emp.contact_phone||emp.phone||"",
        permission_group_id: emp.permission_group_id||"",
        season: emp.season||"", contract_end: emp.contract_end||"",
      });
    } else {
      setEditEmp(null);
      setForm(emptyForm);
    }
    setEmpDialog(true);
  };

  // ── Save Employee ──────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("الاسم مطلوب");
    if (!form.employee_number.trim()) return toast.error("الرقم الوظيفي مطلوب");
    if (!form.job_title.trim()) return toast.error("المسمى الوظيفي مطلوب");
    setSaving(true);
    try {
      const payload = {
        name: form.name, employee_number: form.employee_number,
        job_title: form.job_title, contact_phone: form.contact_phone||undefined,
        national_id: form.national_id||undefined,
        employment_type: form.employment_type,
        permission_group_id: form.permission_group_id||undefined,
        season: form.season||undefined, contract_end: form.contract_end||undefined,
        department,
      };
      if (editEmp) {
        await axios.put(`${API}/employees/${editEmp.id}`, payload, headers());
        toast.success("تم تحديث بيانات الموظف ✅");
      } else {
        await axios.post(`${API}/employees`, { ...payload, shift:"", rest_days:[] }, headers());
        toast.success("تم إضافة الموظف بنجاح ✅");
        // إشعار الجدول الشهري لإعادة جلب البيانات تلقائياً
        if (onEmployeeAdded) onEmployeeAdded();
      }
      setEmpDialog(false);
      setEditEmp(null);
      setForm(emptyForm);
      fetchEmployees();
    } catch (e) { toast.error(e.response?.data?.detail || "فشل الحفظ"); }
    finally { setSaving(false); }
  };

  // ── Delete Employee (مع تحذير إذا له جدول شهري) ────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API}/employees/${deleteTarget.id}`, headers());
      toast.success("تم حذف الموظف");
      setDeleteDialog(false);
      setDeleteTarget(null);
      fetchEmployees();
    } catch (e) { toast.error(e.response?.data?.detail || "فشل الحذف"); }
  };

  // ── Import Excel ───────────────────────────────────────────
  const handleImport = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("department", department);
    try {
      await axios.post(`${API}/employees/import`, fd, { headers: { Authorization: `Bearer ${token()}`, "Content-Type": "multipart/form-data" } });
      toast.success("تم استيراد الملف بنجاح");
      fetchEmployees();
    } catch (e) { toast.error(e.response?.data?.detail || "فشل الاستيراد"); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-5 font-cairo" data-testid="employees-list">

      {/* ── Stats Cards — تصميم خرافي ──────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2.5">
        {(() => {
          const total = stats.total || 1; // تجنب القسمة على صفر
          const ITEMS = [
            {
              label:"إجمالي",      value:stats.total,     color:"#475569",
              Icon:Users,          desc:"كل الموظفين",
              bg:"from-slate-50 to-slate-100/50",  border:"#cbd5e1",
              filter:() => { setFilterStatus("all"); setFilterType("all"); },
            },
            {
              label:"نشط",         value:stats.active,    color:"#059669",
              Icon:ShieldCheck,    desc:"حساب مفعّل",
              bg:"from-emerald-50 to-green-50/50",  border:"#a7f3d0",
              filter:() => setFilterStatus("active"),
            },
            {
              label:"معلق",        value:stats.pending,   color:"#d97706",
              Icon:ShieldOff,      desc:"بانتظار التفعيل",
              bg:"from-amber-50 to-yellow-50/50",   border:"#fcd34d",
              filter:() => setFilterStatus("pending"),
            },
            {
              label:"مجمَّد",      value:stats.frozen,    color:"#2563eb",
              Icon:ShieldX,        desc:"موقوف مؤقتاً",
              bg:"from-blue-50 to-indigo-50/50",    border:"#bfdbfe",
              filter:() => setFilterStatus("frozen"),
            },
            {
              label:"دائم",        value:stats.permanent, color:"#047857",
              Icon:UserCheck,      desc:"توظيف ثابت",
              bg:"from-teal-50 to-emerald-50/50",   border:"#a7f3d0",
              filter:() => setFilterType("permanent"),
            },
            {
              label:"موسمي",       value:stats.seasonal,  color:"#0284c7",
              Icon:Calendar,       desc:"موسم محدد",
              bg:"from-sky-50 to-blue-50/50",       border:"#bae6fd",
              filter:() => setFilterType("seasonal"),
            },
            {
              label:"مؤقت",        value:stats.temporary, color:"#7c3aed",
              Icon:Clock,          desc:"عقد مؤقت",
              bg:"from-violet-50 to-purple-50/50",  border:"#c4b5fd",
              filter:() => setFilterType("temporary"),
            },
          ];
          return ITEMS.map((s, i) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <button key={i}
                onClick={s.filter}
                className={`group relative overflow-hidden rounded-2xl border p-3 text-right transition-all duration-200
                  hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] bg-gradient-to-br ${s.bg}`}
                style={{ borderColor: s.color + "40" }}>

                {/* خلفية دائرة ديكورية */}
                <div className="absolute -left-3 -bottom-3 w-12 h-12 rounded-full opacity-10 transition-all group-hover:opacity-20"
                  style={{ backgroundColor: s.color }} />

                {/* أيقونة + عدد */}
                <div className="flex items-start justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: s.color + "20" }}>
                    <s.Icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <span className="text-2xl font-black leading-none tabular-nums"
                    style={{ color: s.color }}>
                    {s.value}
                  </span>
                </div>

                {/* الاسم والوصف */}
                <div className="mb-2">
                  <p className="text-[11px] font-bold text-slate-700 leading-tight">{s.label}</p>
                  <p className="text-[9px] text-slate-400">{s.desc}</p>
                </div>

                {/* شريط progress */}
                <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: s.color }} />
                </div>
                <p className="text-[8px] text-slate-400 mt-0.5 text-left">{pct}%</p>
              </button>
            );
          });
        })()}
      </div>

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            className="h-9 pr-9 text-sm" placeholder="بحث بالاسم أو الهوية..." />
        </div>

        {/* Filters */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-32 text-xs">
            <SelectValue placeholder="حالة الحساب" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">كل الحسابات</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="pending">معلق</SelectItem>
            <SelectItem value="frozen">مجمَّد</SelectItem>
            <SelectItem value="no_account">بلا حساب</SelectItem>
            <SelectItem value="terminated">منتهي</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-28 text-xs">
            <SelectValue placeholder="النوع" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">كل الأنواع</SelectItem>
            <SelectItem value="permanent">دائم</SelectItem>
            <SelectItem value="seasonal">موسمي</SelectItem>
            <SelectItem value="temporary">مؤقت</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex border rounded-lg overflow-hidden">
          <button onClick={() => setView("cards")}
            className={`px-3 py-2 transition-colors ${view === "cards" ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView("list")}
            className={`px-3 py-2 transition-colors ${view === "list" ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}>
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Import / Export */}
        {(canExport || canImport) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />ملفات<ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" dir="rtl">
            {canExport && (
            <DropdownMenuItem onClick={() => {
              const tk = token();
              fetch(`${API}/employees/export?department=${department}`, { headers:{ Authorization:`Bearer ${tk}` } })
                .then(r => r.blob()).then(b => { const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href=u; a.download="employees.xlsx"; a.click(); URL.revokeObjectURL(u); toast.success("تم التصدير"); })
                .catch(() => toast.error("فشل التصدير"));
            }}>
              <Download className="w-4 h-4 ml-2" />تصدير Excel
            </DropdownMenuItem>
            )}
            {canImport && (
            <>
            <DropdownMenuItem onClick={() => {
              fetch(`${API}/employees/export/template`).then(r => r.blob())
                .then(b => { const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href=u; a.download="template.xlsx"; a.click(); URL.revokeObjectURL(u); toast.success("تم تحميل القالب"); })
                .catch(() => toast.error("فشل"));
            }}>
              <FileText className="w-4 h-4 ml-2" />قالب الاستيراد
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => document.getElementById("import-emp-xlsx").click()}>
              <Upload className="w-4 h-4 ml-2" />استيراد Excel
            </DropdownMenuItem>
            </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
        <input id="import-emp-xlsx" type="file" accept=".xlsx,.xls" className="hidden"
          onChange={e => { handleImport(e.target.files?.[0]); e.target.value = ""; }} />

        {/* Add Employee */}
        {canAdd && (
          <Button size="sm" className="h-9 gap-1.5" onClick={() => handleOpenDialog()}
            data-testid="add-employee-btn">
            <Plus className="w-4 h-4" />موظف جديد
          </Button>
        )}
      </div>

      {/* ── Empty ────────────────────────────────────────── */}
      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">👥</div>
          <p className="font-cairo font-bold text-muted-foreground">
            {employees.length === 0 ? "لا يوجد موظفون بعد في هذه الإدارة" : "لا نتائج تطابق البحث"}
          </p>
          {canAdd && employees.length === 0 && (
            <Button size="sm" onClick={() => handleOpenDialog()} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />إضافة أول موظف
            </Button>
          )}
        </div>
      )}

      {/* ── CARDS VIEW ───────────────────────────────────── */}
      {view === "cards" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(emp => (
            <EmployeeCard key={emp.id} emp={emp}
              canEdit={canEdit} canDelete={canDelete}
              canManageAccounts={canManage} canResetPins={canResetPins}
              canChangeRoles={canChangeRoles} myLevel={myLevel}
              onEdit={(e) => handleOpenDialog(e)}
              onDelete={(e) => { setDeleteTarget(e); setDeleteDialog(true); }}
              onAccountAction={handleAccountAction}
              onChangeRole={handleChangeRole}
              isAr={isAr} permGroups={permGroups} onOpenProfile={openProfile} />
          ))}
        </div>
      )}

      {/* ── LIST VIEW ────────────────────────────────────── */}
      {view === "list" && filtered.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 border-b-2 border-primary/25 [&>th:not(:last-child)]:border-l [&>th:not(:last-child)]:border-primary/10">
                  {/* الموظف */}
                  <TableHead className="text-right py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Users className="w-4 h-4 text-primary"/>
                      </div>
                      <span className="text-sm font-bold text-foreground">الموظف</span>
                    </div>
                  </TableHead>
                  {/* رقم الجوال */}
                  <TableHead className="text-center py-2.5 w-36">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center shadow-sm">
                        <Phone className="w-4 h-4 text-sky-600"/>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600">رقم الجوال</span>
                    </div>
                  </TableHead>
                  {/* المسمى */}
                  <TableHead className="text-center py-2.5 w-40">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shadow-sm">
                        <Briefcase className="w-4 h-4 text-blue-600"/>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600">المسمى</span>
                    </div>
                  </TableHead>
                  {/* النوع */}
                  <TableHead className="text-center py-2.5 w-24">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shadow-sm">
                        <User className="w-4 h-4 text-indigo-600"/>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600">النوع</span>
                    </div>
                  </TableHead>
                  {/* الحساب */}
                  <TableHead className="text-center py-2.5 w-28">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
                        <ShieldCheck className="w-4 h-4 text-emerald-600"/>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600">الحساب</span>
                    </div>
                  </TableHead>
                  {/* الصلاحيات */}
                  {canChangeRoles && (
                    <TableHead className="text-center py-2.5 w-32">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shadow-sm">
                          <Shield className="w-4 h-4 text-violet-600"/>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600">الصلاحيات</span>
                      </div>
                    </TableHead>
                  )}
                  {/* إجراءات */}
                  <TableHead className="text-center py-2.5 w-16">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shadow-sm">
                        <MoreVertical className="w-4 h-4 text-slate-500"/>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">⋯</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(emp => (
                  <TableRow key={emp.id}
                    className="hover:bg-muted/50 transition-colors [&>td]:py-1.5"
                    data-testid={`emp-row-${emp.id}`}>
                    <TableCell className="text-right py-2">
                      <div className="flex items-center gap-2.5">
                        <AvatarInitial name={emp.name} size="sm" />
                        <div className="min-w-0">
                          <button onClick={() => openProfile(emp)} className="font-bold text-sm leading-tight hover:text-primary transition-colors cursor-pointer">{emp.name}</button>
                          {emp.employee_number && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Hash className="w-2.5 h-2.5"/>{emp.employee_number}
                            </p>
                          )}
                          {emp.national_id && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                              <User className="w-2.5 h-2.5"/>{emp.national_id}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {/* رقم الجوال بدل رقم الهوية */}
                    <TableCell className="text-center text-sm font-mono text-sky-600">
                      {emp.contact_phone || emp.phone || "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-600">{emp.job_title || "—"}</TableCell>
                    <TableCell className="text-center"><EmpTypeBadge type={emp.employment_type} /></TableCell>
                    {/* الحساب — نفس أيقونات EmployeeManagement */}
                    <TableCell className="text-center">
                      <AccountStatusIcon emp={emp} canManageAccounts={canManage}
                        canResetPins={canResetPins} onAccountAction={handleAccountAction} isAr={isAr}/>
                    </TableCell>
                    {/* الصلاحيات */}
                    {canChangeRoles && (
                      <TableCell className="text-center">
                        <RoleSelector emp={emp} permGroups={permGroups}/>
                      </TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-slate-100"
                            data-testid={`actions-menu-${emp.id}`}>
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" side="bottom" className="w-52 font-cairo" dir="rtl">
                          {canEdit && (
                            <DropdownMenuItem onClick={() => handleOpenDialog(emp)}>
                              <Edit className="w-4 h-4 ml-2 text-slate-500"/>تعديل البيانات
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openProfile(emp)}>
                            <User className="w-4 h-4 ml-2 text-primary"/>عرض البروفايل
                          </DropdownMenuItem>
                          {canChangeRoles && emp.user_id && (
                            <DropdownMenuItem onClick={() => openCustomPerms(emp)}>
                              <Settings className="w-4 h-4 ml-2 text-violet-500"/>صلاحيات فردية
                            </DropdownMenuItem>
                          )}
                          {canChangeRoles && emp.user_id && (
                            <DropdownMenuItem onClick={() => openCopyPerms(emp)}>
                              <Copy className="w-4 h-4 ml-2 text-sky-500"/>نسخ صلاحيات من موظف
                            </DropdownMenuItem>
                          )}
                          {canResetPins && (emp.account_status==='active'||emp.account_status==='frozen') && (
                            <DropdownMenuItem onClick={()=>handleAccountAction(emp.id,'reset-pin',emp.name)}>
                              <KeyRound className="w-4 h-4 ml-2 text-amber-500"/>إعادة تعيين PIN
                            </DropdownMenuItem>
                          )}
                          {canManage && emp.national_id && <>
                            <DropdownMenuSeparator/>
                            {emp.account_status==='active' && (
                              <DropdownMenuItem onClick={()=>handleAccountAction(emp.id,'freeze-account',emp.name)} className="text-blue-600 focus:text-blue-700">
                                <ShieldX className="w-4 h-4 ml-2"/>تجميد الحساب مؤقتاً
                              </DropdownMenuItem>
                            )}
                            {['pending','frozen','no_account'].includes(emp.account_status||'no_account') && (
                              <DropdownMenuItem onClick={()=>handleAccountAction(emp.id,'activate-account',emp.name)} className="text-emerald-600 focus:text-emerald-700">
                                <ShieldCheck className="w-4 h-4 ml-2"/>تفعيل الحساب
                              </DropdownMenuItem>
                            )}
                            {emp.account_status!=='terminated' && (
                              <DropdownMenuItem onClick={()=>handleAccountAction(emp.id,'terminate-account',emp.name)} className="text-orange-600 focus:text-orange-700">
                                <ShieldOff className="w-4 h-4 ml-2"/>إنهاء الخدمة
                              </DropdownMenuItem>
                            )}
                          </>}
                          {canDelete && <>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem onClick={()=>{setDeleteTarget(emp);setDeleteDialog(true);}} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 ml-2"/>حذف الموظف نهائياً
                            </DropdownMenuItem>
                          </>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ── Add/Edit Employee Dialog ──────────────────────── */}
      <Dialog open={empDialog} onOpenChange={v => { setEmpDialog(v); if (!v) { setEditEmp(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto font-cairo" dir="rtl" data-testid="employee-dialog">
          <DialogHeader>
            <DialogTitle className="font-cairo text-lg">
              {editEmp ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">البيانات الأساسية الثابتة — الوردية والراحات تُدار من الجدول الشهري</p>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">

            {/* Row 1: Name + Number */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold">اسم الموظف *</Label>
                <Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                  required className="mt-1 h-9" placeholder="الاسم الكامل"
                  data-testid="employee-name-input"/>
              </div>
              <div>
                <Label className="text-[11px] font-semibold">الرقم الوظيفي *</Label>
                <Input value={form.employee_number} onChange={e=>setForm({...form,employee_number:e.target.value})}
                  required className="mt-1 h-9 font-mono" placeholder="EMP-001"
                  data-testid="employee-number-input"/>
              </div>
            </div>

            {/* National ID with live check */}
            <div>
              <Label className="text-[11px] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500"/>رقم الهوية الوطنية
                <span className="text-slate-400 font-normal text-[10px]">10 أرقام — لتسجيل الدخول</span>
              </Label>
              <Input value={form.national_id}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g,'').slice(0,10);
                  setForm({...form, national_id: val});
                  clearTimeout(nationalIdTimerRef.current);
                  nationalIdTimerRef.current = setTimeout(() => checkNationalId(val, editEmp?.id||null), 500);
                }}
                className={`mt-1 h-9 font-mono tracking-widest text-center transition-colors
                  ${nationalIdStatus==='available' ? 'border-emerald-400 ring-1 ring-emerald-200' :
                    nationalIdStatus==='taken' ? 'border-red-400 ring-1 ring-red-200' :
                    nationalIdStatus==='format_error'||nationalIdStatus==='too_long' ? 'border-amber-400 ring-1 ring-amber-200' : ''}`}
                placeholder="1xxxxxxxxx" maxLength={10} inputMode="numeric"
                data-testid="employee-national-id-input"/>
              <div className="mt-1 min-h-[16px]">
                {nationalIdStatus === 'checking'      && <p className="text-[10px] text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/>جاري التحقق...</p>}
                {nationalIdStatus === 'available'     && <p className="text-[10px] text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3"/>رقم الهوية متاح — سيُنشأ حساب تلقائياً</p>}
                {nationalIdStatus === 'taken'         && <p className="text-[10px] text-red-600 flex items-center gap-1"><X className="w-3 h-3"/>رقم الهوية مسجل مسبقاً في النظام</p>}
                {nationalIdStatus === 'too_short' && form.national_id.length > 0 && <p className="text-[10px] text-amber-600 flex items-center gap-1"><Info className="w-3 h-3"/>{10 - form.national_id.length} أرقام متبقية</p>}
                {nationalIdStatus === 'too_long'      && <p className="text-[10px] text-red-600 flex items-center gap-1"><X className="w-3 h-3"/>رقم الهوية يجب أن يكون 10 أرقام بالضبط</p>}
                {nationalIdStatus === 'format_error'  && <p className="text-[10px] text-amber-600 flex items-center gap-1"><Info className="w-3 h-3"/>رقم الهوية يجب أن يبدأ بـ 1 أو 2</p>}
              </div>
            </div>

            {/* Row 2: Job Title + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold">المسمى الوظيفي *</Label>
                <Input value={form.job_title} onChange={e=>setForm({...form,job_title:e.target.value})}
                  required className="mt-1 h-9" placeholder="مثال: مشرف ميداني"
                  data-testid="employee-jobtitle-input"/>
              </div>
              <div>
                <Label className="text-[11px] font-semibold flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400"/>رقم التواصل
                </Label>
                <Input value={form.contact_phone} onChange={e=>setForm({...form,contact_phone:e.target.value})}
                  className="mt-1 h-9 font-mono" placeholder="05xxxxxxxx" type="tel"
                  data-testid="employee-phone-input"/>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"/>

            {/* Employment Type — card buttons */}
            <div>
              <Label className="text-[11px] font-semibold mb-2 block">نوع التوظيف</Label>
              <div className="flex gap-2">
                {EMPLOYMENT_TYPES.map(et=>(
                  <button key={et.value} type="button"
                    onClick={()=>setForm({...form,employment_type:et.value,season:'',contract_end:''})}
                    data-testid={`employment-type-${et.value}`}
                    className={`flex-1 py-2.5 px-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1
                      ${form.employment_type===et.value ? 'shadow-md' : 'border-border hover:border-slate-300'}`}
                    style={form.employment_type===et.value?{borderColor:et.color,backgroundColor:et.bg,color:et.color}:{}}>
                    {et.value==='permanent'?<UserCheck className="w-4 h-4"/>:et.value==='seasonal'?<CalendarDays className="w-4 h-4"/>:<Clock className="w-4 h-4"/>}
                    <span className="text-[10px] font-bold">{et.label_ar}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Seasonal details */}
            {form.employment_type==='seasonal' && (
              <div className="rounded-xl border-2 border-sky-200 bg-sky-50 p-3 space-y-3">
                <p className="text-[10px] font-bold text-sky-700 flex items-center gap-1"><Info className="w-3 h-3"/>تفاصيل الموسم</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold">الموسم</Label>
                    <Select value={form.season} onValueChange={v=>setForm({...form,season:v})}>
                      <SelectTrigger className="h-8 mt-1 text-[11px]"><SelectValue placeholder="اختر..."/></SelectTrigger>
                      <SelectContent dir="rtl">
                        {SEASONS.map(s=><SelectItem key={s.value} value={s.value}>{s.label_ar}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">تاريخ انتهاء العقد</Label>
                    <Input type="date" value={form.contract_end} onChange={e=>setForm({...form,contract_end:e.target.value})} className="h-8 mt-1 text-[11px]" dir="ltr"/>
                  </div>
                </div>
              </div>
            )}

            {/* Temporary contract */}
            {form.employment_type==='temporary' && (
              <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-3">
                <p className="text-[10px] font-bold text-purple-700 flex items-center gap-1 mb-2"><Info className="w-3 h-3"/>تفاصيل العقد المؤقت</p>
                <div>
                  <Label className="text-[10px] font-semibold">تاريخ انتهاء العقد *</Label>
                  <Input type="date" value={form.contract_end} onChange={e=>setForm({...form,contract_end:e.target.value})} className="h-8 mt-1 text-[11px]" required dir="ltr"/>
                </div>
              </div>
            )}

            {/* Info note */}
            {form.employment_type==='permanent' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0"/>
                <p className="text-[10px] text-amber-700 leading-relaxed">حالة التكليف (مكلف / غير مكلف) تُحدَّد شهرياً من الجدول الشهري مباشرة</p>
              </div>
            )}

            {/* الإدارات المسموحة */}
            <div>
              <Label className="text-[11px] font-semibold mb-2 block flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary"/>مجموعة الصلاحيات
              </Label>
              <Select value={form.permission_group_id || "none"} onValueChange={v => setForm({...form, permission_group_id: v === "none" ? "" : v})}>
                <SelectTrigger className="h-9" data-testid="permission-group-select">
                  <SelectValue placeholder="اختر مجموعة صلاحيات..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="none">بدون مجموعة (افتراضي)</SelectItem>
                  {permGroups.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                        {g.name_ar}
                        <span className="text-[9px] text-muted-foreground">({Object.values(g.page_permissions || {}).filter(p=>p.visible).length} صفحة)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[9px] text-muted-foreground mt-1">تحدد الصفحات اللي يشوفها ويقدر يعدّلها</p>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={()=>setEmpDialog(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving} className="bg-primary" data-testid="save-employee-btn">
                {saving && <Loader2 className="w-4 h-4 animate-spin ml-1"/>}
                {editEmp ? "حفظ التعديلات" : "إضافة الموظف"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ─────────────────────────── */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="font-cairo max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />تأكيد الحذف
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            هل أنت متأكد من حذف الموظف <strong className="text-foreground">"{deleteTarget?.name}"</strong> نهائياً؟
            <br/>سيتم حذف حسابه وبيانات تسجيل الدخول.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} className="gap-1.5">
              <Trash2 className="w-4 h-4" />حذف نهائياً
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Action Confirmation */}
      <Dialog open={!!actionConfirm} onOpenChange={(open) => { if (!open) setActionConfirm(null); }}>
        <DialogContent className="font-cairo max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد العملية</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {actionConfirm?.action === "activate-account" && `تفعيل حساب "${actionConfirm?.empName}"؟`}
            {actionConfirm?.action === "freeze-account" && `تجميد حساب "${actionConfirm?.empName}" مؤقتاً؟`}
            {actionConfirm?.action === "terminate-account" && `إنهاء خدمة "${actionConfirm?.empName}" نهائياً؟ لا يمكن التراجع`}
            {actionConfirm?.action === "reset-pin" && `إعادة تعيين PIN الخاصة بـ "${actionConfirm?.empName}"؟`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionConfirm(null)}>إلغاء</Button>
            <Button onClick={executeAccountAction} className="gap-1.5">تأكيد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Employee Profile Dialog ────────────────────────── */}
      <Dialog open={!!profileEmp} onOpenChange={(open) => { if (!open) { setProfileEmp(null); setProfileData(null); } }}>
        <DialogContent className="font-cairo sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0" dir="rtl">
          {profileLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : profileData ? (() => {
            const emp = profileData.employee;
            const acc = profileData.account;
            const dept = emp?.department || acc?.department;
            const DEPT_AR = { gates:'إدارة الأبواب', plazas:'إدارة الساحات', planning:'إدارة التخطيط', crowd_services:'خدمات الحشود', mataf:'صحن المطاف', haram_map:'إدارة المصليات' };
            const deptColor = { gates:'#1d4ed8', plazas:'#0d9488', planning:'#7c3aed', crowd_services:'#d97706', mataf:'#dc2626', haram_map:'#059669' }[dept] || '#666';
            const STATUS_AR = { active:{t:'نشط',c:'#22c55e',bg:'#ecfdf5'}, frozen:{t:'مجمّد',c:'#3b82f6',bg:'#eff6ff'}, pending:{t:'معلّق',c:'#f59e0b',bg:'#fffbeb'}, terminated:{t:'منتهي',c:'#6b7280',bg:'#f9fafb'} };
            const st = STATUS_AR[acc?.account_status] || STATUS_AR.pending;
            const grpName = acc?.permission_group_name_ar || acc?.permission_group_name;
            const name = emp?.name || acc?.name || '—';
            const EMP_TYPE_AR = { permanent:'دائم', seasonal:'موسمي', temporary:'مؤقت' };
            const ACTION_AR = {
              login:'تسجيل دخول', employee_created:'إضافة للنظام', employee_updated:'تحديث بيانات',
              account_activated:'تفعيل الحساب', account_frozen:'تجميد الحساب', account_terminated:'إنهاء الخدمة',
              role_changed:'تغيير الدور', pin_changed:'تغيير كلمة المرور', pin_reset:'إعادة تعيين كلمة المرور',
              'تغيير مجموعة صلاحيات':'تغيير الصلاحيات', 'تخصيص صلاحيات فردية':'تخصيص صلاحيات', 'نسخ صلاحيات':'نسخ صلاحيات',
            };

            return (<>
              {/* Header */}
              <div className="p-6 pb-4" style={{ background: `linear-gradient(135deg, ${deptColor}08, ${deptColor}15)`, borderBottom: `2px solid ${deptColor}20` }}>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-cairo font-bold shadow-lg" style={{ background: deptColor }}>
                    {name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-cairo font-bold text-xl">{name}</h2>
                    {emp?.job_title && <p className="text-sm text-muted-foreground mt-0.5">{emp.job_title}</p>}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {dept && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: `${deptColor}15`, color: deptColor }}>
                          <Building2 className="w-3 h-3" />{DEPT_AR[dept] || dept}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: st.bg, color: st.c }}>
                        {st.t}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-violet-50 text-violet-700">
                        <Shield className="w-3 h-3" />{grpName || (acc?.role === 'system_admin' ? 'مسؤول النظام' : 'بدون مجموعة')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 pt-4 space-y-5">
                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-cairo font-bold text-sm text-slate-700 flex items-center gap-1.5"><User className="w-4 h-4 text-primary"/>البيانات الشخصية</h4>
                    {[
                      { label: 'الرقم الوظيفي', value: emp?.employee_number },
                      { label: 'رقم الهوية', value: emp?.national_id ? `${emp.national_id.slice(0,3)}****${emp.national_id.slice(-3)}` : null },
                      { label: 'رقم الجوال', value: emp?.contact_phone },
                      { label: 'نوع التوظيف', value: EMP_TYPE_AR[emp?.employment_type] },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium">{row.value || '—'}</span>
                        <span className="text-[10px] text-muted-foreground">{row.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-cairo font-bold text-sm text-slate-700 flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-primary"/>بيانات العمل</h4>
                    {[
                      { label: 'الوردية', value: emp?.shift },
                      { label: 'الموقع', value: emp?.location },
                      { label: 'أيام الراحة', value: emp?.rest_days?.join('، ') },
                      { label: 'مجموعة الصلاحيات', value: grpName || (acc?.role === 'system_admin' ? 'مسؤول النظام' : 'بدون مجموعة') },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium">{row.value || '—'}</span>
                        <span className="text-[10px] text-muted-foreground">{row.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity Log */}
                {profileData.activities?.length > 0 && (
                  <div>
                    <h4 className="font-cairo font-bold text-sm text-slate-700 flex items-center gap-1.5 mb-3"><Clock className="w-4 h-4 text-primary"/>سجل الأحداث</h4>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto rounded-xl border">
                      {profileData.activities.slice(0, 15).map((a, i) => (
                        <div key={i} className={`flex items-start gap-3 py-2.5 px-3 ${i % 2 === 0 ? 'bg-slate-50/50' : ''}`}>
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                            <Clock className="w-2.5 h-2.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold">{ACTION_AR[a.action] || a.action}</p>
                            {a.details && <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{a.details}</p>}
                          </div>
                          <span className="text-[9px] text-muted-foreground whitespace-nowrap mt-0.5">
                            {a.timestamp ? new Date(a.timestamp).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>);
          })() : <p className="text-center text-muted-foreground py-12">فشل جلب البيانات</p>}
        </DialogContent>
      </Dialog>

      {/* ── Copy Permissions Dialog ─────────────────────── */}
      <Dialog open={!!copyPermEmp} onOpenChange={(open) => { if (!open) setCopyPermEmp(null); }}>
        <DialogContent className="font-cairo sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-sky-500" />
              نسخ صلاحيات — {copyPermEmp?.name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              اختر موظف لنسخ مجموعته وصلاحياته الفردية
            </p>
          </DialogHeader>
          <div className="mt-3">
            <Label className="text-[11px] font-semibold">نسخ من:</Label>
            <Select value={copySource} onValueChange={setCopySource}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="اختر موظف..." />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {employees.filter(e => e.user_id && e.id !== copyPermEmp?.id).map(e => {
                  const grp = permGroups.find(g => g.id === e.permission_group_id);
                  return (
                    <SelectItem key={e.user_id} value={e.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {e.name}
                        {grp && <span className="text-[9px] text-muted-foreground">({grp.name_ar})</span>}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCopyPermEmp(null)}>إلغاء</Button>
            <Button onClick={executeCopyPerms} disabled={!copySource || savingCustom} className="gap-1.5 bg-sky-600 hover:bg-sky-700">
              {savingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              نسخ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Custom Permissions Dialog ─────────────────────── */}
      <Dialog open={!!customPermEmp} onOpenChange={(open) => { if (!open) setCustomPermEmp(null); }}>
        <DialogContent className="font-cairo sm:max-w-[640px] max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-violet-500" />
              صلاحيات فردية — {customPermEmp?.name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              تتجاوز صلاحيات المجموعة لهذا الموظف فقط
              {(() => {
                const grp = permGroups.find(g => g.id === customPermEmp?.permission_group_id);
                return grp ? <Badge variant="outline" className="mr-2 text-[9px]"><Shield className="w-2.5 h-2.5 ml-1"/>{grp.name_ar}</Badge> : null;
              })()}
            </p>
          </DialogHeader>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[9px] text-muted-foreground px-1 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"/> ظاهر</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"/> تعديل</span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 rounded text-violet-600 font-bold">مُخصص</span>
            <span className="flex items-center gap-1 text-slate-400">(من المجموعة) = موروث</span>
          </div>

          <div className="space-y-1 mt-1">
            {(() => {
              const grp = permGroups.find(g => g.id === customPermEmp?.permission_group_id);
              const grpPerms = grp?.page_permissions || {};

              // Build department groups
              const roots = menuItems.filter(i => !i.parent_id && i.department !== 'system_admin' && !i.admin_only)
                .sort((a, b) => (a.order || 0) - (b.order || 0));

              // Separate: standalone items (no children) vs department parents (with children)
              const deptRoots = roots.filter(r => menuItems.some(c => c.parent_id === r.id));
              const standaloneRoots = roots.filter(r => !menuItems.some(c => c.parent_id === r.id));

              const renderPermRow = (item, depth, grpPerms) => {
                const grpPerm = grpPerms[item.href] || { visible: false, editable: false };
                const custom = customPerms[item.href];
                const hasOverride = !!custom;
                const effectiveVisible = hasOverride ? custom.visible : grpPerm.visible;
                const effectiveEditable = hasOverride ? custom.editable : grpPerm.editable;

                return (
                  <div key={item.id}
                    className={`flex items-center justify-between py-1.5 px-2 rounded transition-colors
                      ${hasOverride ? 'bg-violet-50 ring-1 ring-violet-200' : 'hover:bg-muted/30'}`}
                    style={{ paddingRight: `${8 + depth * 16}px` }}>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className={`text-[11px] font-cairo truncate ${hasOverride ? 'font-bold text-violet-700' : ''}`}>
                        {item.name_ar}
                      </span>
                      {!hasOverride && grpPerm.visible && (
                        <span className="text-[8px] text-slate-400 whitespace-nowrap">(من المجموعة)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button onClick={() => toggleCustomPerm(item.href, 'visible')}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all
                          ${effectiveVisible
                            ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-300'
                            : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}>
                        {effectiveVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                      <button onClick={() => effectiveVisible && toggleCustomPerm(item.href, 'editable')}
                        disabled={!effectiveVisible}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all
                          ${!effectiveVisible ? 'bg-slate-50 text-slate-200 cursor-not-allowed'
                            : effectiveEditable ? 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-300'
                            : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}>
                        {effectiveEditable ? <Pencil className="w-3 h-3" /> : <Lock className="w-2.5 h-2.5" />}
                      </button>
                      <div className="w-6 text-center">
                        {hasOverride && (
                          <button onClick={() => removeCustomOverride(item.href)}
                            className="text-red-400 hover:text-red-600 transition-colors" title="إزالة التخصيص">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {/* Department groups with collapsible sections */}
                  {deptRoots.map(root => {
                    const children = menuItems.filter(i => i.parent_id === root.id).sort((a, b) => (a.order || 0) - (b.order || 0));
                    const allDescendants = [root];
                    children.forEach(c => {
                      allDescendants.push(c);
                      menuItems.filter(gc => gc.parent_id === c.id).sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(gc => allDescendants.push(gc));
                    });

                    // Count overrides in this department
                    const overrideCount = allDescendants.filter(d => customPerms[d.href]).length;
                    const grpVisibleCount = allDescendants.filter(d => grpPerms[d.href]?.visible).length;
                    const effectiveVisibleCount = allDescendants.filter(d => {
                      const c = customPerms[d.href];
                      return c ? c.visible : grpPerms[d.href]?.visible;
                    }).length;

                    const isExpanded = customPermExpanded?.[root.id] !== false; // default expanded

                    return (
                      <div key={root.id} className="border rounded-xl overflow-hidden mb-2" data-testid={`custom-dept-${root.department}`}>
                        {/* Department header */}
                        <button
                          onClick={() => setCustomPermExpanded(prev => ({ ...prev, [root.id]: !isExpanded }))}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                            <span className="font-cairo font-bold text-sm">{root.name_ar}</span>
                            <span className="text-[9px] text-slate-400">{effectiveVisibleCount}/{allDescendants.length}</span>
                            {overrideCount > 0 && (
                              <Badge className="text-[8px] px-1.5 py-0 h-4 bg-violet-100 text-violet-700 border-violet-200">{overrideCount} مُخصص</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {grpVisibleCount > 0 ? (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                                {grpVisibleCount} من المجموعة
                              </span>
                            ) : (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">مخفية</span>
                            )}
                          </div>
                        </button>

                        {/* Department pages */}
                        {isExpanded && (
                          <div className="divide-y divide-slate-100">
                            {allDescendants.map(item => {
                              const depth = item.id === root.id ? 0 :
                                menuItems.find(p => p.id === item.parent_id)?.parent_id ? 2 : 1;
                              return renderPermRow(item, depth, grpPerms);
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Standalone items (field worker, notifications, etc.) */}
                  {standaloneRoots.length > 0 && (
                    <div className="border rounded-xl overflow-hidden mb-2">
                      <div className="px-3 py-2 bg-slate-50">
                        <span className="font-cairo font-bold text-sm text-slate-600">صفحات عامة</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {standaloneRoots.map(item => renderPermRow(item, 0, grpPerms))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {Object.keys(customPerms).length > 0 && (
            <div className="mt-3 px-3 py-2.5 bg-violet-50 rounded-lg flex items-center justify-between">
              <p className="text-[10px] text-violet-700 font-bold">
                {Object.keys(customPerms).length} تخصيص فردي
                <span className="font-normal text-violet-500 mr-1">— تتجاوز إعدادات المجموعة</span>
              </p>
              <Button variant="outline" size="sm" className="gap-1 text-[10px] h-7 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleResetCustomPerms(customPermEmp)}
                data-testid="reset-custom-perms-btn">
                <Trash2 className="w-3 h-3" />
                إعادة ضبط الكل
              </Button>
            </div>
          )}

          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setCustomPermEmp(null)}>إلغاء</Button>
            <Button onClick={saveCustomPerms} disabled={savingCustom} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
              {savingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              حفظ الصلاحيات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
