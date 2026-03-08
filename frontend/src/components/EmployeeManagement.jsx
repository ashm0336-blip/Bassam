import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  Plus, Edit, Trash2, Users, Loader2, UserCheck, MapPin, Clock, Coffee,
  CalendarDays, ChevronLeft, ChevronRight, Copy, CheckCircle2, FileText,
  Archive, Phone, Briefcase, Zap, Shield, HardHat, Check, X, Info,
  KeyRound, ShieldCheck, ShieldX, ShieldOff, UserPlus, MoreVertical, Activity,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── Constants ────────────────────────────────────────────────────
const DEPARTMENTS = {
  planning:       { ar: "تخطيط خدمات الحشود", en: "Crowd Planning" },
  plazas:         { ar: "إدارة المصليات",       en: "Prayer Areas" },
  squares:        { ar: "إدارة الساحات",        en: "Plazas Management" },
  gates:          { ar: "إدارة الأبواب",         en: "Gates Management" },
  crowd_services: { ar: "خدمات حشود الحرم",    en: "Crowd Services" },
  mataf:          { ar: "صحن المطاف",           en: "Mataf Management" },
};

const WEEK_DAYS = [
  { value: "السبت",     short: "سبت" },
  { value: "الأحد",     short: "أحد" },
  { value: "الإثنين",   short: "إثنين" },
  { value: "الثلاثاء",  short: "ثلاثاء" },
  { value: "الأربعاء",  short: "أربعاء" },
  { value: "الخميس",    short: "خميس" },
  { value: "الجمعة",    short: "جمعة" },
];

const EMPLOYMENT_TYPES = [
  { value: "permanent", label_ar: "دائم",    label_en: "Permanent", color: "#004D38", bg: "#ecfdf5", border: "#a7f3d0" },
  { value: "seasonal",  label_ar: "موسمي",   label_en: "Seasonal",  color: "#0284c7", bg: "#e0f2fe", border: "#7dd3fc" },
  { value: "temporary", label_ar: "مؤقت",    label_en: "Temporary", color: "#9333ea", bg: "#faf5ff", border: "#d8b4fe" },
];

const WORK_TYPES = [
  { value: "field", label_ar: "ميداني",       label_en: "Field",      color: "#0f766e", bg: "#f0fdfa" },
  { value: "admin", label_ar: "إداري",        label_en: "Admin",      color: "#64748b", bg: "#f8fafc" },
  { value: "both",  label_ar: "إداري/ميداني", label_en: "Admin+Field",color: "#d97706", bg: "#fffbeb" },
];

const SEASONS = [
  { value: "ramadan", label_ar: "رمضان", label_en: "Ramadan" },
  { value: "hajj",    label_ar: "حج",     label_en: "Hajj" },
  { value: "umrah",   label_ar: "عمرة",   label_en: "Umrah" },
];

const MONTH_NAMES_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
                         "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function getMonthKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`; }
function getMonthLabel(key) { const [y,m] = key.split('-'); return `${MONTH_NAMES_AR[parseInt(m)-1]} ${y}`; }
function getTodayArabic() {
  const map = { Saturday:"السبت", Sunday:"الأحد", Monday:"الإثنين", Tuesday:"الثلاثاء",
                Wednesday:"الأربعاء", Thursday:"الخميس", Friday:"الجمعة" };
  return map[new Date().toLocaleDateString('en-US',{weekday:'long'})] || "";
}
function isContractActive(emp) {
  if (!emp.contract_end) return true;
  return new Date(emp.contract_end) >= new Date(new Date().toDateString());
}

// ── Sub-components ───────────────────────────────────────────────

const DAY_LETTERS = {
  "السبت":"س","الأحد":"ح","الإثنين":"ن","الثلاثاء":"ث","الأربعاء":"ر","الخميس":"خ","الجمعة":"ج"
};

// Compact 7 dots — replaces old pills
function RestDaysDots({ value=[], onChange, disabled, todayAr }) {
  return (
    <div className="flex items-center gap-[3px] justify-center" data-testid="rest-days-picker">
      {WEEK_DAYS.map(day => {
        const sel = (value||[]).includes(day.value);
        const isToday = day.value === todayAr;
        return (
          <button key={day.value} type="button" disabled={disabled}
            onClick={() => !disabled && onChange(sel ? value.filter(d=>d!==day.value) : [...value, day.value])}
            title={day.value} data-testid={`rest-dot-${day.short}`}
            className={`w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center transition-all duration-150
              ${sel ? 'bg-amber-400 text-white shadow-sm ring-2 ring-amber-200 scale-110'
                : isToday ? 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-300'
                : 'bg-slate-100 text-slate-400'}
              ${!disabled && !sel ? 'hover:bg-slate-200 hover:scale-105' : ''}
              ${disabled ? 'cursor-default' : 'cursor-pointer'}
            `}
          >{DAY_LETTERS[day.value]}</button>
        );
      })}
    </div>
  );
}

// Read-only 7 dots
function RestDaysBadges({ restDays=[], todayAr }) {
  return (
    <div className="flex items-center gap-[3px] justify-center">
      {WEEK_DAYS.map(day => {
        const sel = (restDays||[]).includes(day.value);
        const isToday = day.value === todayAr;
        return (
          <span key={day.value} title={day.value}
            className={`w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center
              ${sel ? (isToday ? 'bg-amber-500 text-white ring-2 ring-amber-300' : 'bg-amber-400 text-white') : 'bg-slate-100 text-slate-300'}`}>
            {DAY_LETTERS[day.value]}
          </span>
        );
      })}
    </div>
  );
}

// ── Smart account status icon cell (no text) ──────────────────
function AccountStatusIcon({ emp, canEdit, handleAccountAction, isAr }) {
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
    active:     { cls:'bg-emerald-100 text-emerald-600 ring-emerald-200', Icon:ShieldCheck, tip:isAr?'نشط — انقر للتجميد مؤقتاً':'Active — click to freeze', action:'freeze-account' },
    pending:    { cls:'bg-amber-100 text-amber-600 ring-amber-200',       Icon:ShieldOff,   tip:isAr?'معلق — انقر للتفعيل':'Pending — click to activate', action:'activate-account' },
    frozen:     { cls:'bg-blue-100 text-blue-600 ring-blue-200',          Icon:ShieldX,     tip:isAr?'مجمَّد — انقر للتفعيل':'Frozen — click to activate', action:'activate-account' },
    terminated: { cls:'bg-red-100 text-red-400 ring-red-100',             Icon:ShieldX,     tip:isAr?'منتهي الخدمة':'Service terminated', action:null },
    no_account: { cls:'bg-slate-100 text-slate-400 ring-slate-100',       Icon:UserPlus,    tip:isAr?'انقر لإنشاء حساب':'Create account', action:'activate-account' },
  };
  const cfg = cfgs[acStatus] || cfgs.no_account;
  const { Icon } = cfg;
  return (
    <div className="flex items-center gap-1 justify-center">
      <button type="button" disabled={!canEdit || acStatus === 'terminated'}
        onClick={() => canEdit && cfg.action && handleAccountAction(emp.id, cfg.action, emp.name)}
        title={cfg.tip} data-testid={`account-icon-${emp.id}`}
        className={`w-7 h-7 rounded-full flex items-center justify-center ring-1 transition-all ${cfg.cls}
          ${canEdit && cfg.action ? 'cursor-pointer hover:scale-110 hover:shadow-sm' : 'cursor-default'}`}>
        <Icon className="w-3.5 h-3.5" />
      </button>
      {canEdit && (acStatus === 'active' || acStatus === 'frozen') && (
        <button type="button"
          onClick={() => handleAccountAction(emp.id,'reset-pin',emp.name)}
          title={isAr?'إعادة تعيين PIN':'Reset PIN'}
          data-testid={`reset-pin-icon-${emp.id}`}
          className="w-6 h-6 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center hover:bg-amber-100 hover:scale-110 transition-all ring-1 ring-amber-100 cursor-pointer">
          <KeyRound className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── Actions ⋮ Dropdown ────────────────────────────────────────
function ActionsMenu({ emp, canEdit, handleOpenDialog, handleAccountAction, setSelectedEmployee, setDeleteDialogOpen, isAr }) {
  if (!canEdit) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-slate-100"
          data-testid={`actions-menu-${emp.id}`}>
          <MoreVertical className="w-4 h-4 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="bottom" className="w-48 font-cairo" dir="rtl">
        <DropdownMenuItem onClick={() => handleOpenDialog(emp)} data-testid={`edit-emp-${emp.id}`}>
          <Edit className="w-4 h-4 ml-2 text-slate-500"/>{isAr?'تعديل البيانات':'Edit'}
        </DropdownMenuItem>
        {(emp.account_status==='active'||emp.account_status==='frozen') && (
          <DropdownMenuItem onClick={()=>handleAccountAction(emp.id,'reset-pin',emp.name)}>
            <KeyRound className="w-4 h-4 ml-2 text-amber-500"/>{isAr?'إعادة تعيين PIN':'Reset PIN'}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator/>
        {emp.account_status==='active' && (
          <DropdownMenuItem onClick={()=>handleAccountAction(emp.id,'freeze-account',emp.name)} className="text-blue-600 focus:text-blue-700">
            <ShieldX className="w-4 h-4 ml-2"/>{isAr?'تجميد الحساب مؤقتاً':'Freeze Account'}
          </DropdownMenuItem>
        )}
        {(emp.account_status==='pending'||emp.account_status==='frozen'||emp.account_status==='no_account') && (
          <DropdownMenuItem onClick={()=>handleAccountAction(emp.id,'activate-account',emp.name)} className="text-emerald-600 focus:text-emerald-700">
            <ShieldCheck className="w-4 h-4 ml-2"/>{isAr?'تفعيل الحساب':'Activate Account'}
          </DropdownMenuItem>
        )}
        {emp.account_status!=='terminated' && (
          <DropdownMenuItem onClick={()=>handleAccountAction(emp.id,'terminate-account',emp.name)} className="text-orange-600 focus:text-orange-700">
            <ShieldOff className="w-4 h-4 ml-2"/>{isAr?'إنهاء الخدمة':'Terminate Service'}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator/>
        <DropdownMenuItem onClick={()=>{setSelectedEmployee(emp);setDeleteDialogOpen(true);}} className="text-destructive focus:text-destructive">
          <Trash2 className="w-4 h-4 ml-2"/>{isAr?'حذف الموظف نهائياً':'Delete Employee'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Employment type badge
function EmpTypeBadge({ type, isAr }) {
  const et = EMPLOYMENT_TYPES.find(e=>e.value===type) || EMPLOYMENT_TYPES[0];
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
      style={{ color: et.color, backgroundColor: et.bg, borderColor: et.border }}>
      {isAr ? et.label_ar : et.label_en}
    </span>
  );
}

// Work type badge
function WorkTypeBadge({ type, isAr }) {
  const wt = WORK_TYPES.find(w=>w.value===type) || WORK_TYPES[0];
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ color: wt.color, backgroundColor: wt.bg }}>
      {type==='field' ? <HardHat className="w-2.5 h-2.5"/> : type==='admin' ? <Briefcase className="w-2.5 h-2.5"/> : <Shield className="w-2.5 h-2.5"/>}
      {isAr ? wt.label_ar : wt.label_en}
    </span>
  );
}

// مكلف toggle — ✅ / ✗
function TaskedToggle({ value, onChange, disabled, isAr }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      data-testid="tasked-toggle"
      title={isAr ? (value ? "مكلف هذا الشهر — انقر للإلغاء" : "غير مكلف — انقر للتكليف") : (value ? "Tasked — click to remove" : "Not tasked — click to assign")}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border-2 font-bold text-sm
        ${value
          ? 'bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-200 scale-105'
          : 'bg-white border-slate-200 text-slate-300 hover:border-amber-300 hover:text-amber-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
    >
      {value ? <Check className="w-4 h-4"/> : <X className="w-4 h-4"/>}
    </button>
  );
}

// Month navigation bar
function MonthBar({ selectedMonth, onMonthChange, schedule, onCreateSchedule, onApprove, onDelete, isReadOnly, language }) {
  const currentMonthKey = getMonthKey(new Date());
  const navigate = (dir) => {
    const [y,m] = selectedMonth.split('-').map(Number);
    onMonthChange(getMonthKey(new Date(y, m-1+dir, 1)));
  };
  const months = [];
  for (let i=-2; i<=2; i++) {
    const [y,m] = selectedMonth.split('-').map(Number);
    months.push(getMonthKey(new Date(y, m-1+i, 1)));
  }
  const statusConfig = {
    active:   { label:"نشط",    Icon:CheckCircle2, color:"text-emerald-700", bg:"bg-emerald-50 border-emerald-200" },
    draft:    { label:"مسودة",  Icon:FileText,     color:"text-amber-700",   bg:"bg-amber-50 border-amber-200" },
    archived: { label:"مؤرشف", Icon:Archive,       color:"text-gray-500",    bg:"bg-gray-50 border-gray-200" },
  };
  return (
    <Card className="border-2 border-primary/10" data-testid="month-bar">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={()=>navigate(-1)}>
            <ChevronRight className="w-4 h-4"/>
          </Button>
          <div className="flex-1 flex gap-1 justify-center overflow-hidden">
            {months.map(mk => {
              const isSel = mk===selectedMonth, isCur = mk===currentMonthKey;
              const [,mm] = mk.split('-');
              return (
                <button key={mk} onClick={()=>onMonthChange(mk)} data-testid={`month-pill-${mk}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                    ${isSel ? 'bg-primary text-white shadow-md scale-105' : isCur ? 'bg-primary/10 text-primary border border-primary/30' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {MONTH_NAMES_AR[parseInt(mm)-1]}{isCur && !isSel && <span className="mr-1 text-[9px]">(الحالي)</span>}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={()=>navigate(1)}>
            <ChevronLeft className="w-4 h-4"/>
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {schedule ? (() => {
              const st = statusConfig[schedule.status] || statusConfig.draft;
              return (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${st.bg} ${st.color}`}>
                  <st.Icon className="w-3.5 h-3.5"/><span>{st.label}</span>
                </div>
              );
            })() : (
              <span className="text-xs text-muted-foreground">{language==='ar' ? 'لا يوجد جدول' : 'No schedule'}</span>
            )}
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-2">
              {!schedule ? (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={()=>onCreateSchedule('new')}>
                    <Plus className="w-3 h-3"/>{language==='ar'?'جديد':'New'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={()=>onCreateSchedule('clone')}>
                    <Copy className="w-3 h-3"/>{language==='ar'?'نسخ السابق':'Clone'}
                  </Button>
                </>
              ) : schedule.status==='draft' ? (
                <>
                  <Button size="sm" className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={onApprove}>
                    <CheckCircle2 className="w-3 h-3"/>{language==='ar'?'اعتماد':'Approve'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 text-destructive border-destructive/30" onClick={onDelete}>
                    <Trash2 className="w-3 h-3"/>{language==='ar'?'حذف':'Delete'}
                  </Button>
                </>
              ) : null}
            </div>
          )}
        </div>
        <div className="text-center mt-2">
          <span className="text-sm font-bold text-gray-700">{getMonthLabel(selectedMonth)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function EmployeeManagement({ department }) {
  const { language } = useLanguage();
  const { user, isReadOnly, hasPermission } = useAuth();
  const isAr = language === 'ar';

  // Can this user change roles?
  const canChangeRoles = user?.role === 'system_admin' ||
    user?.role === 'general_manager' ||
    (user?.role === 'department_manager' && hasPermission?.('change_roles'));

  // Roles this user can assign (can't assign >= own level)
  const ROLE_HIERARCHY = { system_admin:5, general_manager:4, department_manager:3, shift_supervisor:2, field_staff:1, admin_staff:1 };
  const myLevel = ROLE_HIERARCHY[user?.role] || 0;
  const ASSIGNABLE_ROLES = [
    { value: 'general_manager',    ar: 'مدير عام',       level: 4 },
    { value: 'department_manager', ar: 'مدير إدارة',     level: 3 },
    { value: 'shift_supervisor',   ar: 'مشرف وردية',    level: 2 },
    { value: 'field_staff',        ar: 'موظف ميداني',   level: 1 },
    { value: 'admin_staff',        ar: 'موظف إداري',    level: 1 },
  ].filter(r => r.level < myLevel);

  const [employees, setEmployees]           = useState([]);
  const [gates, setGates]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode]             = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [submitting, setSubmitting]         = useState(false);
  const [shifts, setShifts]                 = useState([]);
  const [coverageLocations, setCoverageLocations] = useState([]);
  const [selectedMonth, setSelectedMonth]   = useState(getMonthKey(new Date()));
  const [schedule, setSchedule]             = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const nationalIdTimerRef = useRef(null);

  const emptyForm = {
    name: "", employee_number: "", job_title: "", contact_phone: "",
    national_id: "",
    location: "", shift: "", rest_days: [], work_tasks: "",
    work_type: "field", employment_type: "permanent",
    season: "", contract_end: "",
    department: department || user?.department || "planning",
  };
  const [formData, setFormData] = useState(emptyForm);
  const [nationalIdStatus, setNationalIdStatus] = useState(null); // null | 'checking' | 'available' | 'taken' | 'format_error'

  const todayAr = getTodayArabic();
  const currentMonthKey = getMonthKey(new Date());

  useEffect(() => { fetchDepartmentSettings(); fetchEmployees(); if(department==='gates') fetchGates(); }, [department]);
  useEffect(() => { fetchSchedule(); }, [selectedMonth, department]);

  const fetchDepartmentSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const dept = department || user?.department;
      if (!dept) return;
      const [sRes, lRes] = await Promise.all([
        axios.get(`${API}/${dept}/settings/shifts`, { headers:{ Authorization:`Bearer ${token}` } }).catch(()=>({data:[]})),
        axios.get(`${API}/${dept}/settings/coverage_locations`, { headers:{ Authorization:`Bearer ${token}` } }).catch(()=>({data:[]})),
      ]);
      setShifts(sRes.data);
      setCoverageLocations(lRes.data);
    } catch(e) { console.error(e); }
  };

  const fetchGates = async () => {
    try { const r = await axios.get(`${API}/gates`); setGates(r.data); } catch(e) { console.error(e); }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const dept = department || user?.department;
      const url = dept ? `${API}/employees?department=${dept}` : `${API}/employees`;
      const res = await axios.get(url, { headers:{ Authorization:`Bearer ${token}` } });
      setEmployees(res.data);
    } catch(e) { toast.error(isAr ? "فشل في جلب الموظفين" : "Failed"); }
    finally { setLoading(false); }
  };

  // Live national ID check (debounced)
  const checkNationalId = useCallback(async (id, excludeEmpId=null) => {
    if (!id || id.length < 10) { setNationalIdStatus(id.length > 0 ? 'too_short' : null); return; }
    if (id.length > 10) { setNationalIdStatus('too_long'); return; }
    if (!/^[12]\d{9}$/.test(id)) { setNationalIdStatus('format_error'); return; }
    setNationalIdStatus('checking');
    try {
      const token = localStorage.getItem("token");
      const url = `${API}/employees/check-national-id?national_id=${id}${excludeEmpId?`&exclude_emp_id=${excludeEmpId}`:''}`;
      const res = await axios.get(url, { headers:{ Authorization:`Bearer ${token}` } });
      setNationalIdStatus(res.data.available ? 'available' : 'taken');
    } catch { setNationalIdStatus(null); }
  }, []);

  const fetchSchedule = async () => {
    setScheduleLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/schedules/${department}/${selectedMonth}`, { headers:{ Authorization:`Bearer ${token}` } });
      setSchedule(res.data);
    } catch(e) { setSchedule(null); }
    finally { setScheduleLoading(false); }
  };

  // Merge base employee data + monthly schedule
  const mergedEmployees = useMemo(() => {
    const assignmentMap = {};
    if (schedule?.assignments) schedule.assignments.forEach(a => { assignmentMap[a.employee_id] = a; });
    const isCurrentOrActive = schedule && (selectedMonth===currentMonthKey || schedule.status==='active');
    return employees.map(emp => {
      const a = assignmentMap[emp.id];
      const restDays = a ? a.rest_days : (emp.rest_days || []);
      const location  = a ? a.location : (emp.location || "");
      const shift     = a ? a.shift    : (emp.shift || "");
      const isTasked  = a ? a.is_tasked : false; // is_tasked comes from monthly schedule
      const isOnRest  = isCurrentOrActive && restDays.includes(todayAr);
      const contractOk = isContractActive(emp);
      return { ...emp, rest_days: restDays, location, shift, is_tasked: isTasked,
               is_active: !isOnRest && contractOk, on_rest: isOnRest,
               contract_expired: !contractOk, has_assignment: !!a };
    });
  }, [employees, schedule, selectedMonth, currentMonthKey, todayAr]);

  const handleCreateSchedule = async (mode) => {
    try {
      const token = localStorage.getItem("token");
      const prevMonth = (() => { const [y,m]=selectedMonth.split('-').map(Number); return getMonthKey(new Date(y,m-2,1)); })();
      await axios.post(`${API}/admin/schedules`, { department, month:selectedMonth, clone_from: mode==="clone"?prevMonth:null }, { headers:{ Authorization:`Bearer ${token}` } });
      toast.success(isAr ? `تم إنشاء جدول ${getMonthLabel(selectedMonth)}` : "Schedule created");
      fetchSchedule();
    } catch(e) { toast.error(e.response?.data?.detail || (isAr?"فشل الإنشاء":"Failed")); }
  };

  const handleApproveSchedule = async () => {
    if(!schedule) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/admin/schedules/${schedule.id}/status?status=active`,{},{ headers:{ Authorization:`Bearer ${token}` } });
      toast.success(isAr ? "تم اعتماد الجدول" : "Schedule approved");
      fetchSchedule();
    } catch(e) { toast.error(isAr?"فشل الاعتماد":"Failed"); }
  };

  const handleDeleteSchedule = async () => {
    if(!schedule) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/schedules/${schedule.id}`,{ headers:{ Authorization:`Bearer ${token}` } });
      toast.success(isAr?"تم حذف الجدول":"Schedule deleted");
      setSchedule(null);
    } catch(e) { toast.error(e.response?.data?.detail||(isAr?"فشل الحذف":"Failed")); }
  };

  const handleAssignmentChange = useCallback(async (employeeId, field, value) => {
    if (!schedule) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/admin/schedules/${schedule.id}/assignment/${employeeId}`, { [field]:value }, { headers:{ Authorization:`Bearer ${token}` } });
      setSchedule(prev => {
        if(!prev) return prev;
        const assignments = [...prev.assignments];
        const idx = assignments.findIndex(a=>a.employee_id===employeeId);
        if(idx>=0) assignments[idx] = { ...assignments[idx], [field]:value };
        else assignments.push({ employee_id:employeeId, rest_days:[], location:"", shift:"", is_tasked:false, [field]:value });
        return { ...prev, assignments };
      });
      toast.success(isAr?'تم التحديث':'Updated');
    } catch(e) { toast.error(isAr?"فشل التحديث":"Failed"); }
  }, [schedule, isAr]);

  const handleQuickMove = async (employeeId, field, value) => {
    if(schedule) { handleAssignmentChange(employeeId, field, value); return; }
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/employees/${employeeId}`, { [field]:value }, { headers:{ Authorization:`Bearer ${token}` } });
      toast.success(isAr?'تم التحديث':'Updated');
      fetchEmployees();
    } catch(e) { toast.error(isAr?"فشل التحديث":"Failed"); }
  };

  const handleOpenDialog = (emp=null) => {
    if(emp) {
      setEditMode(true); setSelectedEmployee(emp);
      setFormData({
        name: emp.name, employee_number: emp.employee_number||"",
        job_title: emp.job_title, contact_phone: emp.contact_phone||"",
        national_id: emp.national_id||"",
        location: emp.location||"", shift: emp.shift||"",
        rest_days: emp.rest_days||[], work_tasks: emp.work_tasks||"",
        work_type: emp.work_type||"field",
        employment_type: emp.employment_type||"permanent",
        season: emp.season||"", contract_end: emp.contract_end||"",
        department: emp.department,
      });
    } else {
      setEditMode(false); setSelectedEmployee(null);
      setFormData({ ...emptyForm, department: department||user?.department||"planning" });
    }
    setNationalIdStatus(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: formData.name, employee_number: formData.employee_number,
        job_title: formData.job_title, contact_phone: formData.contact_phone||undefined,
        national_id: formData.national_id||undefined,
        work_type: formData.work_type, employment_type: formData.employment_type,
        season: formData.season||undefined, contract_end: formData.contract_end||undefined,
        work_tasks: formData.work_tasks||undefined,
      };
      if(editMode) {
        await axios.put(`${API}/employees/${selectedEmployee.id}`, payload, { headers:{ Authorization:`Bearer ${token}` } });
        toast.success(isAr?"تم تحديث الموظف":"Updated");
      } else {
        await axios.post(`${API}/employees`, { ...payload, department: formData.department, shift:"", rest_days:[] }, { headers:{ Authorization:`Bearer ${token}` } });
        toast.success(isAr?"تم إضافة الموظف":"Added");
      }
      setDialogOpen(false); fetchEmployees(); fetchSchedule();
    } catch(e) { toast.error(e.response?.data?.detail||(isAr?"حدث خطأ":"Error")); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if(!selectedEmployee) return; setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/employees/${selectedEmployee.id}`,{ headers:{ Authorization:`Bearer ${token}` } });
      toast.success(isAr?"تم حذف الموظف":"Deleted");
      setDeleteDialogOpen(false); fetchEmployees();
    } catch(e) { toast.error(isAr?"حدث خطأ":"Error"); }
    finally { setSubmitting(false); }
  };

  // ── Account Management ──────────────────────────────────────
  const handleAccountAction = async (empId, action, empName) => {
    try {
      const token = localStorage.getItem("token");
      const endpoint = `${API}/employees/${empId}/${action}`;
      const res = await axios.post(endpoint, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(res.data?.message || (isAr ? "تم التحديث" : "Updated"));
      fetchEmployees();
    } catch(e) {
      toast.error(e.response?.data?.detail || (isAr?"فشلت العملية":"Failed"));
    }
  };

  // Change employee role
  const handleChangeRole = async (emp, newRole) => {
    if (!emp.user_id) {
      toast.error(isAr ? "يجب تفعيل حساب الموظف أولاً" : "Activate account first");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${API}/users/${emp.user_id}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data?.message || "تم تغيير الدور ✅");
      fetchEmployees();
    } catch(e) {
      toast.error(e.response?.data?.detail || "فشل تغيير الدور");
    }
  };

  const statistics = useMemo(() => {
    const total     = mergedEmployees.length;
    const active    = mergedEmployees.filter(e=>e.is_active).length;
    const onRest    = mergedEmployees.filter(e=>e.on_rest).length;
    const permanent = mergedEmployees.filter(e=>e.employment_type==='permanent'||!e.employment_type).length;
    const seasonal  = mergedEmployees.filter(e=>e.employment_type==='seasonal').length;
    const temporary = mergedEmployees.filter(e=>e.employment_type==='temporary').length;
    const fieldOps  = mergedEmployees.filter(e => {
      const role = e.user_role || 'field_staff';
      return role !== 'admin_staff';
    }).length;
    const tasked    = mergedEmployees.filter(e=>e.is_tasked).length;
    const shiftStats = shifts.map(s=>({ ...s, count: mergedEmployees.filter(e=>e.shift===s.value).length })).filter(s=>s.count>0);
    const coverage  = WEEK_DAYS.map(day => {
      const resting = mergedEmployees.filter(e=>(e.rest_days||[]).includes(day.value)).length;
      const avail   = total - resting;
      return { ...day, available:avail, total, pct: total>0?Math.round((avail/total)*100):0 };
    });
    return { total, active, onRest, permanent, seasonal, temporary, fieldOps, tasked, shiftStats, coverage };
  }, [mergedEmployees, shifts]);

  const canEdit = !isReadOnly() && (!schedule || schedule.status!=='archived');

  if(loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;

  const isPermanentEmp = (emp) => (emp.employment_type||'permanent')==='permanent';

  return (
    <div className="space-y-5 max-w-full" data-testid="employee-management">
      {/* Month Bar */}
      <MonthBar
        selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} schedule={schedule}
        onCreateSchedule={handleCreateSchedule} onApprove={handleApproveSchedule}
        onDelete={handleDeleteSchedule} isReadOnly={isReadOnly()} language={language}
      />

      {/* Stats Row — Professional Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* 1) إجمالي الموظفين */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 opacity-[0.07]"/>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l"/>
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600"/>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium text-blue-600 mb-0.5">{isAr?'إجمالي الموظفين':'Total Staff'}</p>
                <p className="text-3xl font-black text-blue-800 leading-none">{statistics.total}</p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap pt-2 border-t border-blue-100">
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>{statistics.permanent} {isAr?'دائم':'Perm'}
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500"/>{statistics.seasonal} {isAr?'موسمي':'Sea.'}
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"/>{statistics.temporary} {isAr?'مؤقت':'Tmp'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 2) الميدانيون */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-600 opacity-[0.07]"/>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l"/>
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <HardHat className="w-5 h-5 text-emerald-600"/>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium text-emerald-600 mb-0.5">{isAr?'الميدانيون':'Field Ops'}</p>
                <p className="text-3xl font-black text-emerald-800 leading-none">{statistics.fieldOps}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-emerald-100">
              {statistics.tasked > 0 ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  <Zap className="w-2.5 h-2.5"/>{statistics.tasked} {isAr?'مكلف هذا الشهر':'tasked'}
                </span>
              ) : (
                <span className="text-[9px] text-muted-foreground">{isAr?'لا يوجد تكليف هذا الشهر':'No assignments'}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3) الورديات */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-violet-600 opacity-[0.07]"/>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-l"/>
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600"/>
              </div>
              <p className="text-[11px] font-medium text-purple-600">{isAr?'توزيع الورديات':'Shift Split'}</p>
            </div>
            {statistics.shiftStats.length > 0 ? (
              <div className="space-y-1.5">
                {statistics.shiftStats.map(s => {
                  const pct = statistics.total > 0 ? Math.round((s.count / statistics.total) * 100) : 0;
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground w-12 text-right shrink-0">
                        {s.label?.replace('الوردية ', '')}
                      </span>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, backgroundColor: s.color }}/>
                      </div>
                      <span className="text-[10px] font-bold w-4 text-right" style={{ color: s.color }}>{s.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">-</p>
            )}
          </CardContent>
        </Card>

        {/* 4) التغطية الأسبوعية */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-[0.07]"/>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l"/>
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-amber-600"/>
              </div>
              <p className="text-[11px] font-medium text-amber-700">{isAr?'التغطية الأسبوعية':'Weekly Cover'}</p>
            </div>
            <div className="flex gap-1 items-end h-10">
              {statistics.coverage.map(day => {
                const isToday = day.value===todayAr;
                const isLow = day.pct < 60;
                const barH = Math.max(day.pct * 0.36, 4);
                return (
                  <div key={day.value} className="flex-1 flex flex-col items-center gap-0.5"
                    title={`${day.value}: ${day.available}/${day.total} (${day.pct}%)`}>
                    <div className="w-full rounded-md transition-all"
                      style={{ height:`${barH}px`,
                        backgroundColor: isLow ? '#f87171' : isToday ? '#047857' : '#6ee7b7',
                        boxShadow: isToday ? '0 0 6px rgba(4,120,87,0.4)' : 'none' }}/>
                    <span className={`text-[8px] font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                      {day.short}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <div className="text-right flex-1">
          <h2 className="font-cairo font-bold text-lg">{isAr?'جدول الموظفين':'Staff Schedule'}</h2>
          <p className="text-xs text-muted-foreground">
            {schedule
              ? `${isAr?'جدول':'Schedule'} ${getMonthLabel(selectedMonth)} — ${schedule.status==='active'?'معتمد':schedule.status==='draft'?'مسودة':'مؤرشف'}`
              : (isAr?'البيانات الأساسية للموظفين':'Base employee data')}
          </p>
        </div>
        {!isReadOnly() && (
          <Button size="sm" onClick={()=>handleOpenDialog()} className="bg-primary" data-testid="add-employee-btn">
            <Plus className="w-4 h-4 ml-1"/>{isAr?'موظف جديد':'New'}
          </Button>
        )}
      </div>

      {/* Employees Table */}
      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 border-b-2 border-primary/25 [&>th:not(:last-child)]:border-l [&>th:not(:last-child)]:border-primary/10">
                  <TableHead className="text-right py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Users className="w-4.5 h-4.5 text-primary"/>
                      </div>
                      <span className="text-sm font-bold text-foreground">{isAr?'الموظف':'Employee'}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-2.5 w-24">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shadow-sm">
                        <Briefcase className="w-4 h-4 text-blue-600"/>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600">{isAr?'التوظيف':'Type'}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-2.5 w-36">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center shadow-sm">
                        <Clock className="w-4 h-4 text-purple-600"/>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600">{isAr?'الوردية':'Shift'}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-2.5 w-[210px]">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shadow-sm">
                        <Coffee className="w-4 h-4 text-amber-600"/>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600">{isAr?'أيام الراحة':'Rest Days'}</span>
                    </div>
                  </TableHead>
                  {schedule && (
                    <TableHead className="text-center py-2.5 w-16">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shadow-sm">
                          <Zap className="w-4 h-4 text-amber-600"/>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600">{isAr?'مكلف':'Tasked'}</span>
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="text-center py-2.5 w-16">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
                        <Activity className="w-4 h-4 text-emerald-600"/>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600">{isAr?'الحالة':'Status'}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center py-2.5 w-24">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
                        <ShieldCheck className="w-4 h-4 text-emerald-600"/>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600">{isAr?'الحساب':'Account'}</span>
                    </div>
                  </TableHead>
                  {canChangeRoles && (
                    <TableHead className="text-center py-2.5 w-28">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shadow-sm">
                          <Shield className="w-4 h-4 text-violet-600"/>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600">{isAr?'الصلاحيات':'Role'}</span>
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="text-center py-2.5 w-14">
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
                {mergedEmployees.map(emp => (
                  <TableRow key={emp.id}
                    className={`hover:bg-muted/50 transition-colors [&>td]:py-1.5 ${emp.on_rest?'bg-amber-50/40':''} ${emp.contract_expired?'opacity-60':''}`}
                    data-testid={`employee-row-${emp.id}`}>

                    {/* Employee info — professional card */}
                    <TableCell className="text-right py-2">
                      <div className="flex items-center gap-2.5">
                        {/* Avatar — bigger with ring */}
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white"
                            style={{ backgroundColor: (emp.employment_type==='seasonal'?'#0284c7':emp.employment_type==='temporary'?'#9333ea':'#004D38') }}>
                            {emp.name.charAt(0)}
                          </div>
                          {/* Online-style status dot */}
                          <span className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            emp.contract_expired ? 'bg-red-500' : emp.on_rest ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}/>
                        </div>
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          {/* Name + tasked badge */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-sm text-foreground leading-tight">{emp.name}</p>
                            {emp.is_tasked && (
                              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded-full">
                                <Zap className="w-2.5 h-2.5"/>مكلف
                              </span>
                            )}
                          </div>
                          {/* Job title */}
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{emp.job_title}</p>
                          {/* Number + phone row */}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {emp.employee_number && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                #{emp.employee_number}
                              </span>
                            )}
                            {emp.contact_phone && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-400">
                                <Phone className="w-2.5 h-2.5"/>{emp.contact_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Employment type */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <EmpTypeBadge type={emp.employment_type||'permanent'} isAr={isAr}/>
                        {emp.season && (
                          <span className="text-[8px] text-sky-600 font-medium">
                            {SEASONS.find(s=>s.value===emp.season)?.[isAr?'label_ar':'label_en']}
                          </span>
                        )}
                        {emp.contract_end && (
                          <span className={`text-[8px] font-medium ${emp.contract_expired?'text-red-500':'text-slate-400'}`}>
                            {emp.contract_expired ? (isAr?'منتهي':'Expired') : emp.contract_end}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Shift */}
                    <TableCell className="text-center">
                      {canEdit ? (
                        <Select value={emp.shift||""} onValueChange={v=>handleQuickMove(emp.id,'shift',v)}>
                          <SelectTrigger className="h-7 w-32 text-[11px]"><SelectValue placeholder="..."/></SelectTrigger>
                          <SelectContent>
                            {shifts.map(s=>(
                              <SelectItem key={s.id} value={s.value}>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor:s.color }}/>{s.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : emp.shift ? (
                        <Badge style={{ backgroundColor: shifts.find(s=>s.value===emp.shift)?.color||'#6b7280' }}
                          className="text-white text-[10px]">{emp.shift}</Badge>
                      ) : <span className="text-[10px] text-muted-foreground">-</span>}
                    </TableCell>

                    {/* Rest days — compact dots */}
                    <TableCell className="text-center">
                      {canEdit ? (
                        <RestDaysDots value={emp.rest_days} onChange={days=>handleQuickMove(emp.id,'rest_days',days)} todayAr={todayAr}/>
                      ) : (
                        <RestDaysBadges restDays={emp.rest_days} todayAr={todayAr}/>
                      )}
                    </TableCell>

                    {/* مكلف toggle — icon only */}
                    {schedule && (
                      <TableCell className="text-center">
                        {isPermanentEmp(emp) ? (
                          <TaskedToggle
                            value={emp.is_tasked}
                            onChange={v=>handleAssignmentChange(emp.id,'is_tasked',v)}
                            disabled={!canEdit}
                            isAr={isAr}
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground"
                            title={isAr?'التكليف للدائمين فقط':'Permanent only'}>—</span>
                        )}
                      </TableCell>
                    )}

                    {/* Status — icon only */}
                    <TableCell className="text-center">
                      {emp.contract_expired ? (
                        <span title={isAr?'منتهي العقد':'Contract expired'}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100">
                          <X className="w-3.5 h-3.5 text-red-600"/>
                        </span>
                      ) : emp.on_rest ? (
                        <span title={isAr?`في إجازة اليوم (${todayAr})`:'On rest today'}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100">
                          <Coffee className="w-3.5 h-3.5 text-amber-700"/>
                        </span>
                      ) : (
                        <span title={isAr?'نشط':'Active'}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-700"/>
                        </span>
                      )}
                    </TableCell>

                    {/* Account — smart icon */}
                    <TableCell className="text-center">
                      <AccountStatusIcon emp={emp} canEdit={canEdit}
                        handleAccountAction={handleAccountAction} isAr={isAr}/>
                    </TableCell>

                    {/* Role / Permissions — admin & gm only */}
                    {canChangeRoles && (
                      <TableCell className="text-center">
                        {emp.user_id ? (() => {
                          const ROLE_COLORS = {
                            general_manager:    '#7c3aed',
                            department_manager: '#1d4ed8',
                            shift_supervisor:   '#0f766e',
                            field_staff:        '#047857',
                            admin_staff:        '#64748b',
                          };
                          const ROLE_LABELS = {
                            general_manager:    'مدير عام',
                            department_manager: 'مدير إدارة',
                            shift_supervisor:   'مشرف وردية',
                            field_staff:        'موظف ميداني',
                            admin_staff:        'موظف إداري',
                          };
                          const currentRole = emp.user_role || 'field_staff';
                          return ASSIGNABLE_ROLES.length > 0 ? (
                            <Select value={currentRole}
                              onValueChange={(newRole) => handleChangeRole(emp, newRole)}>
                              <SelectTrigger className="h-7 text-[10px] border-0 bg-transparent px-2 w-auto min-w-[90px] justify-center"
                                style={{ color: ROLE_COLORS[currentRole] }}
                                data-testid={`role-select-${emp.id}`}>
                                <SelectValue/>
                              </SelectTrigger>
                              <SelectContent dir="rtl">
                                {ASSIGNABLE_ROLES.map(r => (
                                  <SelectItem key={r.value} value={r.value} className="text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                      <Shield className="w-3 h-3" style={{ color: ROLE_COLORS[r.value] }}/>
                                      {r.ar}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-[10px] font-medium" style={{ color: ROLE_COLORS[currentRole] }}>
                              {ROLE_LABELS[currentRole] || currentRole}
                            </span>
                          );
                        })() : (
                          <span className="text-[9px] text-slate-400" title="فعّل الحساب أولاً">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* Actions — ⋮ dropdown */}
                    <TableCell className="text-center">
                      <ActionsMenu emp={emp} canEdit={canEdit}
                        handleOpenDialog={handleOpenDialog}
                        handleAccountAction={handleAccountAction}
                        setSelectedEmployee={setSelectedEmployee}
                        setDeleteDialogOpen={setDeleteDialogOpen}
                        isAr={isAr}/>
                    </TableCell>
                  </TableRow>
                ))}
                {mergedEmployees.length===0 && (
                  <TableRow>
                    <TableCell colSpan={schedule?8:7} className="text-center py-8 text-muted-foreground">
                      {isAr?'لا يوجد موظفين':'No employees'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Employee Dialog ──────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto" data-testid="employee-dialog">
          <DialogHeader>
            <DialogTitle className="font-cairo text-lg">
              {editMode ? (isAr?'تعديل بيانات الموظف':'Edit Employee') : (isAr?'إضافة موظف جديد':'New Employee')}
            </DialogTitle>
            <DialogDescription>
              {isAr?'البيانات الأساسية الثابتة — الوردية والراحات تُدار من الجدول الشهري':'Base profile — shift & rest managed via monthly schedule'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">

              {/* Row 1: Name + Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold">{isAr?'اسم الموظف *':'Name *'}</Label>
                  <Input value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})}
                    required className="mt-1 h-9" placeholder={isAr?'الاسم الكامل':'Full name'}
                    data-testid="employee-name-input"/>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold">{isAr?'الرقم الوظيفي *':'Employee # *'}</Label>
                  <Input value={formData.employee_number} onChange={e=>setFormData({...formData,employee_number:e.target.value})}
                    required className="mt-1 h-9 font-mono" placeholder="EMP-001"
                    data-testid="employee-number-input"/>
                </div>
              </div>

              {/* Row 1.5: National ID */}
              <div>
                <Label className="text-[11px] font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500"/>
                  {isAr?'رقم الهوية الوطنية':'National ID'}
                  <span className="text-slate-400 font-normal text-[10px]">{isAr?'10 أرقام — لتسجيل الدخول':'10 digits — for login'}</span>
                </Label>
                <Input
                  value={formData.national_id}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g,'').slice(0,10);
                    setFormData({...formData, national_id: val});
                    // Debounced live check
                    clearTimeout(nationalIdTimerRef.current);
                    nationalIdTimerRef.current = setTimeout(() => {
                      checkNationalId(val, editMode ? selectedEmployee?.id : null);
                    }, 500);
                  }}
                  className={`mt-1 h-9 font-mono tracking-widest text-center transition-colors
                    ${nationalIdStatus==='available' ? 'border-emerald-400 ring-1 ring-emerald-200' :
                      nationalIdStatus==='taken' ? 'border-red-400 ring-1 ring-red-200' :
                      nationalIdStatus==='format_error'||nationalIdStatus==='too_long' ? 'border-amber-400 ring-1 ring-amber-200' : ''}
                  `}
                  placeholder="1xxxxxxxxx"
                  maxLength={10}
                  inputMode="numeric"
                  data-testid="employee-national-id-input"
                />
                {/* Live feedback */}
                <div className="mt-1 min-h-[16px]">
                  {nationalIdStatus === 'checking' && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin"/>جاري التحقق...
                    </p>
                  )}
                  {nationalIdStatus === 'available' && (
                    <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3"/>رقم الهوية متاح — سيُنشأ حساب تلقائياً
                    </p>
                  )}
                  {nationalIdStatus === 'taken' && (
                    <p className="text-[10px] text-red-600 flex items-center gap-1">
                      <X className="w-3 h-3"/>رقم الهوية مسجل مسبقاً في النظام
                    </p>
                  )}
                  {nationalIdStatus === 'too_short' && formData.national_id.length > 0 && (
                    <p className="text-[10px] text-amber-600 flex items-center gap-1">
                      <Info className="w-3 h-3"/>{10 - formData.national_id.length} أرقام متبقية
                    </p>
                  )}
                  {nationalIdStatus === 'too_long' && (
                    <p className="text-[10px] text-red-600 flex items-center gap-1">
                      <X className="w-3 h-3"/>رقم الهوية يجب أن يكون 10 أرقام بالضبط
                    </p>
                  )}
                  {nationalIdStatus === 'format_error' && (
                    <p className="text-[10px] text-amber-600 flex items-center gap-1">
                      <Info className="w-3 h-3"/>رقم الهوية يجب أن يبدأ بـ 1 أو 2
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Job Title + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold">{isAr?'المسمى الوظيفي *':'Job Title *'}</Label>
                  <Input value={formData.job_title} onChange={e=>setFormData({...formData,job_title:e.target.value})}
                    required className="mt-1 h-9" placeholder={isAr?'مثال: محاسب حشود':'e.g. Crowd Analyst'}
                    data-testid="employee-jobtitle-input"/>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400"/>
                    {isAr?'رقم التواصل':'Phone'}
                  </Label>
                  <Input value={formData.contact_phone} onChange={e=>setFormData({...formData,contact_phone:e.target.value})}
                    className="mt-1 h-9 font-mono" placeholder="05xxxxxxxx" type="tel"
                    data-testid="employee-phone-input"/>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"/>

              {/* Row 3: Employment Type (نوع التوظيف فقط — نوع العمل يُحدد من الصلاحيات) */}
              <div>
                <Label className="text-[11px] font-semibold mb-2 block">{isAr?'نوع التوظيف':'Employment Type'}</Label>
                <div className="flex gap-2">
                  {EMPLOYMENT_TYPES.map(et=>(
                    <button key={et.value} type="button"
                      onClick={()=>setFormData({...formData,employment_type:et.value,season:'',contract_end:''})}
                      data-testid={`employment-type-${et.value}`}
                      className={`flex-1 py-2.5 px-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1
                        ${formData.employment_type===et.value ? 'shadow-md' : 'border-border hover:border-slate-300'}`}
                      style={formData.employment_type===et.value ? { borderColor:et.color, backgroundColor:et.bg, color:et.color } : {}}>
                      {et.value==='permanent' ? <UserCheck className="w-4 h-4"/> : et.value==='seasonal' ? <CalendarDays className="w-4 h-4"/> : <Clock className="w-4 h-4"/>}
                      <span className="text-[10px] font-bold">{isAr?et.label_ar:et.label_en}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional: Season (seasonal only) */}
              {formData.employment_type==='seasonal' && (
                <div className="rounded-xl border-2 border-sky-200 bg-sky-50 p-3 space-y-3">
                  <p className="text-[10px] font-bold text-sky-700 flex items-center gap-1">
                    <Info className="w-3 h-3"/>
                    {isAr?'تفاصيل الموسم':'Season Details'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-semibold">{isAr?'الموسم':'Season'}</Label>
                      <Select value={formData.season} onValueChange={v=>setFormData({...formData,season:v})}>
                        <SelectTrigger className="h-8 mt-1 text-[11px]" data-testid="season-select">
                          <SelectValue placeholder={isAr?'اختر...':'Select...'}/>
                        </SelectTrigger>
                        <SelectContent>
                          {SEASONS.map(s=><SelectItem key={s.value} value={s.value}>{isAr?s.label_ar:s.label_en}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold">{isAr?'تاريخ انتهاء العقد':'Contract End'}</Label>
                      <Input type="date" value={formData.contract_end}
                        onChange={e=>setFormData({...formData,contract_end:e.target.value})}
                        className="h-8 mt-1 text-[11px]" data-testid="contract-end-input"/>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional: Contract end (temporary only) */}
              {formData.employment_type==='temporary' && (
                <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-3">
                  <p className="text-[10px] font-bold text-purple-700 flex items-center gap-1 mb-2">
                    <Info className="w-3 h-3"/>
                    {isAr?'تفاصيل العقد المؤقت':'Temporary Contract'}
                  </p>
                  <div>
                    <Label className="text-[10px] font-semibold">{isAr?'تاريخ انتهاء العقد *':'Contract End Date *'}</Label>
                    <Input type="date" value={formData.contract_end}
                      onChange={e=>setFormData({...formData,contract_end:e.target.value})}
                      className="h-8 mt-1 text-[11px]" required
                      data-testid="contract-end-input"/>
                  </div>
                </div>
              )}

              {/* Note for permanent: is_tasked managed via monthly schedule */}
              {formData.employment_type==='permanent' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0"/>
                  <p className="text-[10px] text-amber-700 leading-relaxed">
                    {isAr
                      ? 'حالة التكليف (مكلف / غير مكلف) تُحدَّد شهرياً من الجدول الشهري مباشرة'
                      : 'Tasked status is set monthly via the monthly schedule table'}
                  </p>
                </div>
              )}

            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={()=>setDialogOpen(false)}>
                {isAr?'إلغاء':'Cancel'}
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary" data-testid="employee-submit-btn">
                {submitting && <Loader2 className="w-4 h-4 animate-spin ml-1"/>}
                {editMode ? (isAr?'حفظ التعديلات':'Save') : (isAr?'إضافة الموظف':'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cairo">{isAr?'تأكيد الحذف':'Confirm Delete'}</DialogTitle>
            <DialogDescription>
              {isAr ? `هل أنت متأكد من حذف "${selectedEmployee?.name}"؟` : `Delete "${selectedEmployee?.name}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setDeleteDialogOpen(false)}>{isAr?'إلغاء':'Cancel'}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin ml-1"/>}
              {isAr?'حذف':'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
