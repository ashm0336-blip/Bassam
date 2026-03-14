/**
 * EmployeesList — تبويب "الموظفون" الجديد
 * بيانات ثابتة + إدارة حسابات (تنشيط/تجميد/صلاحيات/كلمة مرور)
 * عرض: بطاقات | قائمة
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRealtimeRefresh } from "@/context/WebSocketContext";
import {
  Plus, Search, LayoutGrid, List, Download, Upload, FileText,
  Edit, Trash2, ShieldCheck, ShieldX, ShieldOff, UserPlus, KeyRound,
  Loader2, MoreVertical, User, Users, Briefcase, Calendar, Hash,
  RefreshCw, Filter, ChevronDown, Phone, Building2, Shield,
  Check, X, Info, UserCheck, CalendarDays, Clock, Zap,
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

function RoleSelector({ emp, canChangeRoles, myLevel, onChangeRole, isAr }) {
  if (!emp.user_id) return <span className="text-[9px] text-slate-400" title="فعّل الحساب أولاً">—</span>;
  const currentRole = emp.user_role || 'field_staff';
  const assignable = ALL_ASSIGNABLE_ROLES.filter(r => r.level < myLevel);
  if (!canChangeRoles) {
    return (
      <span className="text-[10px] font-medium" style={{ color: ROLE_COLORS[currentRole] }}>
        {ROLE_LABELS_MAP[currentRole] || currentRole}
      </span>
    );
  }
  return assignable.length > 0 ? (
    <Select value={currentRole} onValueChange={(r) => onChangeRole(emp, r)}>
      <SelectTrigger className="h-7 text-[10px] border-0 bg-transparent px-2 w-auto min-w-[90px] justify-center"
        style={{ color: ROLE_COLORS[currentRole] }}
        data-testid={`role-select-${emp.id}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent dir="rtl">
        {assignable.map(r => (
          <SelectItem key={r.value} value={r.value} className="text-[11px]">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3" style={{ color: ROLE_COLORS[r.value] }} />
              {r.ar}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : (
    <span className="text-[10px] font-medium" style={{ color: ROLE_COLORS[currentRole] }}>
      {ROLE_LABELS_MAP[currentRole] || currentRole}
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
    onEdit, onDelete, onAccountAction, onChangeRole, isAr }) {
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
            <button onClick={() => window.location.href = `/employee/${emp.id}`} className="font-cairo font-bold text-sm leading-tight truncate text-right hover:text-primary transition-colors cursor-pointer block">{emp.name}</button>
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
              <RoleSelector emp={emp} canChangeRoles={canChangeRoles}
                myLevel={myLevel} onChangeRole={onChangeRole} isAr={isAr}/>
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
    employment_type:"permanent", contact_phone:"", user_role:"field_staff",
    season:"", contract_end:"",
  };
  const [form, setForm] = useState(emptyForm);

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
  const ROLE_HIERARCHY = { system_admin:5, general_manager:4, department_manager:3, shift_supervisor:2, field_staff:1, admin_staff:1 };
  const myLevel = ROLE_HIERARCHY[user?.role] || 0;

  // ── Fetch ──────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/employees?department=${department}`, headers());
      setEmployees(res.data);
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
  const handleAccountAction = async (empId, action, empName) => {
    const confirmMsgs = {
      "activate-account":  `تفعيل حساب "${empName}"؟`,
      "freeze-account":    `تجميد حساب "${empName}" مؤقتاً؟`,
      "terminate-account": `إنهاء خدمة "${empName}" نهائياً؟ لا يمكن التراجع`,
      "reset-pin":         `إعادة تعيين PIN الخاصة بـ "${empName}"؟`,
    };
    if (!window.confirm(confirmMsgs[action] || "تأكيد العملية؟")) return;
    try {
      await axios.post(`${API}/employees/${empId}/${action}`, {}, headers());
      toast.success("تم تنفيذ العملية بنجاح");
      fetchEmployees();
    } catch (e) { toast.error(e.response?.data?.detail || "فشلت العملية"); }
  };

  // ── Change Role ────────────────────────────────────────────
  const handleChangeRole = async (emp, newRole) => {
    if (!window.confirm(`تغيير صلاحية "${emp.name}" إلى "${ROLE_LABELS_MAP[newRole] || newRole}"؟`)) return;
    try {
      // Update role on the user account (users collection)
      if (emp.user_id) {
        await axios.put(`${API}/users/${emp.user_id}/role`, { role: newRole }, headers());
      }
      // Also sync on employee record
      await axios.put(`${API}/employees/${emp.id}`, { user_role: newRole }, headers());
      toast.success(`تم تغيير الصلاحية إلى: ${ROLE_LABELS_MAP[newRole] || newRole}`);
      fetchEmployees();
    } catch (e) { toast.error(e.response?.data?.detail || "فشل تغيير الصلاحية"); }
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
        user_role: emp.user_role||"field_staff",
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
      // تحقق هل الموظف في جدول شهري حالي
      const currentMonth = new Date().toLocaleDateString("en-CA", { timeZone:"Asia/Riyadh" }).slice(0,7);
      let hasSchedule = false;
      try {
        const res = await axios.get(`${API}/schedules/${department}/${currentMonth}`, headers());
        const sched = res.data;
        if (sched?.assignments?.some(a => a.employee_id === deleteTarget.id)) {
          hasSchedule = true;
        }
      } catch { /* لا جدول = لا مشكلة */ }

      const confirmMsg = hasSchedule
        ? `تحذير: الموظف "${deleteTarget.name}" مضمَّن في جدول ${currentMonth} الحالي!\n\nهل أنت متأكد من الحذف النهائي؟ سيتم إزالته من الجدول.`
        : `هل أنت متأكد من حذف الموظف "${deleteTarget.name}" نهائياً؟\nسيتم حذف حسابه وبيانات تسجيل الدخول.`;

      if (!window.confirm(confirmMsg)) return;

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />ملفات<ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" dir="rtl">
            <DropdownMenuItem onClick={() => {
              const tk = token();
              fetch(`${API}/employees/export?department=${department}`, { headers:{ Authorization:`Bearer ${tk}` } })
                .then(r => r.blob()).then(b => { const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href=u; a.download="employees.xlsx"; a.click(); URL.revokeObjectURL(u); toast.success("تم التصدير"); })
                .catch(() => toast.error("فشل التصدير"));
            }}>
              <Download className="w-4 h-4 ml-2" />تصدير Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              fetch(`${API}/employees/export/template`).then(r => r.blob())
                .then(b => { const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href=u; a.download="template.xlsx"; a.click(); URL.revokeObjectURL(u); toast.success("تم تحميل القالب"); })
                .catch(() => toast.error("فشل"));
            }}>
              <FileText className="w-4 h-4 ml-2" />قالب الاستيراد
            </DropdownMenuItem>
            {canAdd && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => document.getElementById("import-emp-xlsx").click()}>
                  <Upload className="w-4 h-4 ml-2" />استيراد Excel
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
              isAr={isAr} />
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
                          <p className="font-bold text-sm leading-tight">{emp.name}</p>
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
                    {/* الصلاحيات — نفس dropdown EmployeeManagement */}
                    {canChangeRoles && (
                      <TableCell className="text-center">
                        <RoleSelector emp={emp} canChangeRoles={canChangeRoles}
                          myLevel={myLevel} onChangeRole={handleChangeRole} isAr={isAr}/>
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
    </div>
  );
}
