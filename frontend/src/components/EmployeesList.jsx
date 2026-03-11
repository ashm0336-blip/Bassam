/**
 * EmployeesList — تبويب "الموظفون" الجديد
 * بيانات ثابتة + إدارة حسابات (تنشيط/تجميد/صلاحيات/كلمة مرور)
 * عرض: بطاقات | قائمة
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  Plus, Search, LayoutGrid, List, Download, Upload, FileText,
  Edit, Trash2, ShieldCheck, ShieldX, ShieldOff, UserPlus, KeyRound,
  Loader2, MoreVertical, User, Briefcase, Calendar, Hash,
  RefreshCw, Filter, ChevronDown, Phone, Building2,
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

// ── Config ────────────────────────────────────────────────────
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
function EmployeeCard({ emp, canEdit, canDelete, canManageAccounts, canResetPins, canChangeRoles,
    onEdit, onDelete, onAccountAction, isAr }) {
  const acCfg = ACCOUNT_STATUS_CFG[emp.account_status] || ACCOUNT_STATUS_CFG.no_account;
  const hasNatId = !!emp.national_id;

  return (
    <Card className="group border hover:shadow-lg transition-all duration-200 hover:border-primary/30 overflow-hidden"
      data-testid={`emp-card-${emp.id}`}>
      {/* Color strip top */}
      <div className="h-1 w-full" style={{ background: acCfg.color }} />
      <CardContent className="p-4">
        {/* Header: avatar + name + actions */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <AvatarInitial name={emp.name} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-cairo font-bold text-sm truncate">{emp.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{emp.job_title || "—"}</p>
              {emp.employee_number && (
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Hash className="w-3 h-3" />{emp.employee_number}
                </p>
              )}
            </div>
          </div>
          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"
                className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100"
                data-testid={`emp-card-menu-${emp.id}`}>
                <MoreVertical className="w-4 h-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" dir="rtl" className="font-cairo w-52">
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(emp)}>
                  <Edit className="w-4 h-4 ml-2 text-slate-500" />تعديل البيانات
                </DropdownMenuItem>
              )}
              {canResetPins && hasNatId && (emp.account_status === "active" || emp.account_status === "frozen") && (
                <DropdownMenuItem onClick={() => onAccountAction(emp.id, "reset-pin", emp.name)}>
                  <KeyRound className="w-4 h-4 ml-2 text-amber-500" />إعادة تعيين PIN
                </DropdownMenuItem>
              )}
              {canManageAccounts && hasNatId && (
                <>
                  <DropdownMenuSeparator />
                  {emp.account_status === "active" && (
                    <DropdownMenuItem onClick={() => onAccountAction(emp.id, "freeze-account", emp.name)}
                      className="text-blue-600">
                      <ShieldX className="w-4 h-4 ml-2" />تجميد الحساب مؤقتاً
                    </DropdownMenuItem>
                  )}
                  {["pending","frozen","no_account"].includes(emp.account_status) && (
                    <DropdownMenuItem onClick={() => onAccountAction(emp.id, "activate-account", emp.name)}
                      className="text-emerald-600">
                      <ShieldCheck className="w-4 h-4 ml-2" />تفعيل الحساب
                    </DropdownMenuItem>
                  )}
                  {emp.account_status !== "terminated" && (
                    <DropdownMenuItem onClick={() => onAccountAction(emp.id, "terminate-account", emp.name)}
                      className="text-orange-600">
                      <ShieldOff className="w-4 h-4 ml-2" />إنهاء الخدمة
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(emp)} className="text-destructive">
                    <Trash2 className="w-4 h-4 ml-2" />حذف الموظف نهائياً
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Info chips */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <EmpTypeBadge type={emp.employment_type} />
            {emp.user_role && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {ROLE_CFG[emp.user_role]?.label || emp.user_role}
              </span>
            )}
          </div>
          {emp.national_id && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3" /> {emp.national_id}
            </p>
          )}
          {emp.phone && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Phone className="w-3 h-3" /> {emp.phone}
            </p>
          )}
        </div>

        {/* Account status footer */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <AccountBadge status={emp.account_status} />
          {/* Quick action button */}
          {canManageAccounts && hasNatId && (
            <button
              onClick={() => {
                if (emp.account_status === "active") onAccountAction(emp.id, "freeze-account", emp.name);
                else if (["pending","frozen","no_account"].includes(emp.account_status)) onAccountAction(emp.id, "activate-account", emp.name);
              }}
              className="text-[10px] font-medium px-2 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ color: acCfg.color, backgroundColor: acCfg.bg, border: `1px solid ${acCfg.border}` }}>
              {emp.account_status === "active" ? "تجميد" :
               ["pending","frozen","no_account"].includes(emp.account_status) ? "تفعيل" : "—"}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function EmployeesList({ department }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const token = () => localStorage.getItem("token");
  const headers = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState("cards"); // cards | list
  const [search, setSearch]       = useState("");
  const [filterType, setFilterType]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Dialog states
  const [empDialog, setEmpDialog]     = useState(false);
  const [editEmp, setEditEmp]         = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving]           = useState(false);

  const emptyForm = {
    name:"", employee_number:"", national_id:"", job_title:"",
    employment_type:"permanent", phone:"", user_role:"field_staff",
    contract_start:"", contract_end:"",
  };
  const [form, setForm] = useState(emptyForm);

  // Permissions
  const canWrite = (perm) => user?.permissions?.[perm] === "write" || user?.role === "system_admin";
  const canRead  = (perm) => ["read","write"].includes(user?.permissions?.[perm]) || user?.role === "system_admin";
  const canAdd       = canWrite("add_employees");
  const canEdit      = canWrite("edit_employees");
  const canDelete    = canWrite("delete_employees");
  const canManage    = canWrite("manage_accounts");
  const canResetPins = canWrite("reset_pins");
  const canChangeRoles = canWrite("change_roles");

  // ── Fetch ──────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/employees?department=${department}`, headers());
      setEmployees(res.data);
    } catch { toast.error("فشل جلب بيانات الموظفين"); }
    finally { setLoading(false); }
  }, [department]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

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
      await axios.post(`${API}/employees/${empId}/account-action`, { action }, headers());
      toast.success("تم تنفيذ العملية بنجاح");
      fetchEmployees();
    } catch (e) { toast.error(e.response?.data?.detail || "فشلت العملية"); }
  };

  // ── Save Employee ──────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("الاسم مطلوب");
    setSaving(true);
    try {
      const payload = { ...form, department };
      if (editEmp) {
        await axios.put(`${API}/employees/${editEmp.id}`, payload, headers());
        toast.success("تم تحديث بيانات الموظف ✅");
      } else {
        await axios.post(`${API}/employees`, payload, headers());
        toast.success("تم إضافة الموظف بنجاح ✅");
      }
      setEmpDialog(false);
      setEditEmp(null);
      setForm(emptyForm);
      fetchEmployees();
    } catch (e) { toast.error(e.response?.data?.detail || "فشل الحفظ"); }
    finally { setSaving(false); }
  };

  // ── Delete Employee ────────────────────────────────────────
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

      {/* ── Stats bar ────────────────────────────────────── */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {[
          { label:"الكل",    value:stats.total,     color:"#6b7280", bg:"#f8fafc" },
          { label:"نشط",     value:stats.active,    color:"#059669", bg:"#ecfdf5" },
          { label:"معلق",    value:stats.pending,   color:"#d97706", bg:"#fffbeb" },
          { label:"مجمَّد",  value:stats.frozen,    color:"#2563eb", bg:"#eff6ff" },
          { label:"دائم",    value:stats.permanent, color:"#059669", bg:"#f0fdf4" },
          { label:"موسمي",   value:stats.seasonal,  color:"#0284c7", bg:"#f0f9ff" },
          { label:"مؤقت",    value:stats.temporary, color:"#7c3aed", bg:"#faf5ff" },
        ].map((s,i) => (
          <div key={i} className="rounded-xl border p-2.5 text-center transition-all hover:shadow-sm cursor-pointer"
            style={{ backgroundColor: s.bg, borderColor: s.color+"30" }}
            onClick={() => {
              if (i < 4) setFilterStatus(["all","active","pending","frozen"][i] || "all");
              else setFilterType(["all","permanent","seasonal","temporary"][i-4] || "all");
            }}>
            <p className="text-2xl font-black leading-none" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] font-semibold mt-0.5 text-slate-500">{s.label}</p>
          </div>
        ))}
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
          <Button size="sm" className="h-9 gap-1.5" onClick={() => { setEditEmp(null); setForm(emptyForm); setEmpDialog(true); }}
            data-testid="add-employee-btn">
            <Plus className="w-4 h-4" />موظف جديد
          </Button>
        )}

        {/* Refresh */}
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchEmployees}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* ── Empty ────────────────────────────────────────── */}
      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">👥</div>
          <p className="font-cairo font-bold text-muted-foreground">
            {employees.length === 0 ? "لا يوجد موظفون بعد في هذه الإدارة" : "لا نتائج تطابق البحث"}
          </p>
          {canAdd && employees.length === 0 && (
            <Button size="sm" onClick={() => { setEditEmp(null); setForm(emptyForm); setEmpDialog(true); }} className="gap-1.5">
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
              canManageAccounts={canManage} canResetPins={canResetPins} canChangeRoles={canChangeRoles}
              onEdit={(e) => { setEditEmp(e); setForm({ name:e.name||"", employee_number:e.employee_number||"", national_id:e.national_id||"", job_title:e.job_title||"", employment_type:e.employment_type||"permanent", phone:e.phone||"", user_role:e.user_role||"field_staff", contract_start:e.contract_start||"", contract_end:e.contract_end||"" }); setEmpDialog(true); }}
              onDelete={(e) => { setDeleteTarget(e); setDeleteDialog(true); }}
              onAccountAction={handleAccountAction}
              isAr={isAr} />
          ))}
        </div>
      )}

      {/* ── LIST VIEW ────────────────────────────────────── */}
      {view === "list" && filtered.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-center">رقم الهوية</TableHead>
                  <TableHead className="text-center">المسمى</TableHead>
                  <TableHead className="text-center">النوع</TableHead>
                  <TableHead className="text-center">الدور</TableHead>
                  <TableHead className="text-center">حالة الحساب</TableHead>
                  <TableHead className="text-center w-20">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(emp => (
                  <TableRow key={emp.id} className="hover:bg-muted/20" data-testid={`emp-row-${emp.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <AvatarInitial name={emp.name} size="sm" />
                        <div>
                          <p className="font-semibold text-sm">{emp.name}</p>
                          {emp.employee_number && <p className="text-[10px] text-muted-foreground">#{emp.employee_number}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm font-mono">{emp.national_id || "—"}</TableCell>
                    <TableCell className="text-center text-xs">{emp.job_title || "—"}</TableCell>
                    <TableCell className="text-center"><EmpTypeBadge type={emp.employment_type} /></TableCell>
                    <TableCell className="text-center">
                      <span className="text-[10px] font-medium text-slate-500">
                        {ROLE_CFG[emp.user_role]?.label || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <AccountBadge status={emp.account_status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-center">
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { setEditEmp(emp); setForm({ name:emp.name||"", employee_number:emp.employee_number||"", national_id:emp.national_id||"", job_title:emp.job_title||"", employment_type:emp.employment_type||"permanent", phone:emp.phone||"", user_role:emp.user_role||"field_staff", contract_start:emp.contract_start||"", contract_end:emp.contract_end||"" }); setEmpDialog(true); }}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canManage && emp.national_id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <ChevronDown className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" dir="rtl" className="font-cairo">
                              {emp.account_status === "active" && <DropdownMenuItem onClick={() => handleAccountAction(emp.id,"freeze-account",emp.name)} className="text-blue-600"><ShieldX className="w-4 h-4 ml-2"/>تجميد</DropdownMenuItem>}
                              {["pending","frozen","no_account"].includes(emp.account_status||"no_account") && <DropdownMenuItem onClick={() => handleAccountAction(emp.id,"activate-account",emp.name)} className="text-emerald-600"><ShieldCheck className="w-4 h-4 ml-2"/>تفعيل</DropdownMenuItem>}
                              {canResetPins && (emp.account_status==="active"||emp.account_status==="frozen") && <DropdownMenuItem onClick={() => handleAccountAction(emp.id,"reset-pin",emp.name)}><KeyRound className="w-4 h-4 ml-2 text-amber-500"/>إعادة PIN</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
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
        <DialogContent className="sm:max-w-[580px] font-cairo max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-primary" />
              {editEmp ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-sm font-semibold">الاسم الكامل *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name:e.target.value})} required className="mt-1" placeholder="مثال: محمد عبدالله الأحمدي" data-testid="emp-name-input" />
              </div>
              <div>
                <Label className="text-sm font-semibold">رقم الهوية الوطنية</Label>
                <Input value={form.national_id} onChange={e => setForm({...form, national_id:e.target.value})} className="mt-1 font-mono" placeholder="10xxxxxxxx" data-testid="emp-national-id-input" />
              </div>
              <div>
                <Label className="text-sm font-semibold">رقم الموظف</Label>
                <Input value={form.employee_number} onChange={e => setForm({...form, employee_number:e.target.value})} className="mt-1" placeholder="EMP-001" />
              </div>
              <div>
                <Label className="text-sm font-semibold">المسمى الوظيفي</Label>
                <Input value={form.job_title} onChange={e => setForm({...form, job_title:e.target.value})} className="mt-1" placeholder="مثال: مشرف ميداني" />
              </div>
              <div>
                <Label className="text-sm font-semibold">رقم الجوال</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} className="mt-1 font-mono" placeholder="05xxxxxxxx" />
              </div>
              <div>
                <Label className="text-sm font-semibold">نوع التوظيف</Label>
                <Select value={form.employment_type} onValueChange={v => setForm({...form, employment_type:v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="permanent">دائم</SelectItem>
                    <SelectItem value="seasonal">موسمي</SelectItem>
                    <SelectItem value="temporary">مؤقت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">الدور في النظام</Label>
                <Select value={form.user_role} onValueChange={v => setForm({...form, user_role:v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="field_staff">موظف ميداني</SelectItem>
                    <SelectItem value="shift_supervisor">مشرف وردية</SelectItem>
                    <SelectItem value="admin_staff">موظف إداري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">تاريخ بداية العقد</Label>
                <Input type="date" value={form.contract_start} onChange={e => setForm({...form, contract_start:e.target.value})} className="mt-1" dir="ltr" />
              </div>
              <div>
                <Label className="text-sm font-semibold">تاريخ انتهاء العقد</Label>
                <Input type="date" value={form.contract_end} onChange={e => setForm({...form, contract_end:e.target.value})} className="mt-1" dir="ltr" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEmpDialog(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving} className="gap-1.5" data-testid="save-employee-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
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
