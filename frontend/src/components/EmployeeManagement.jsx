import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  Plus, Edit, Trash2, Users, Loader2, UserCheck, MapPin, Clock, Coffee,
  CalendarDays, ChevronLeft, ChevronRight, Copy, CheckCircle2, FileText,
  Archive, Phone, Briefcase, Zap, Shield, HardHat, Check, X, Info,
  KeyRound, ShieldCheck, ShieldX, ShieldOff, UserPlus, MoreVertical, Activity, Tag,
  Download, Upload, LockOpen, Lock,
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
  planning:       { ar: "إدارة التخطيط",         en: "Planning" },
  haram_map:      { ar: "إدارة المصليات",         en: "Prayer Areas" },
  plazas:         { ar: "إدارة الساحات",           en: "Plazas" },
  squares:        { ar: "إدارة الساحات",           en: "Plazas" },
  gates:          { ar: "إدارة الأبواب",           en: "Gates Management" },
  crowd_services: { ar: "خدمات حشود الحرم",      en: "Crowd Services" },
  mataf:          { ar: "صحن المطاف",             en: "Mataf Management" },
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
function AccountStatusIcon({ emp, canManageAccounts, canResetPins, handleAccountAction, isAr }) {
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
      <button type="button" disabled={!canManageAccounts || acStatus === 'terminated'}
        onClick={() => canManageAccounts && cfg.action && handleAccountAction(emp.id, cfg.action, emp.name)}
        title={cfg.tip} data-testid={`account-icon-${emp.id}`}
        className={`w-7 h-7 rounded-full flex items-center justify-center ring-1 transition-all ${cfg.cls}
          ${canManageAccounts && cfg.action ? 'cursor-pointer hover:scale-110 hover:shadow-sm' : 'cursor-default'}`}>
        <Icon className="w-3.5 h-3.5" />
      </button>
      {canResetPins && (acStatus === 'active' || acStatus === 'frozen') && (
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
function MonthBar({ selectedMonth, onMonthChange, schedule, onCreateSchedule, onApprove, onDelete, onUnlock, canUnlock, isReadOnly, language }) {
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
    active:   { label:"معتمد ومقفل", Icon:Lock,        color:"text-emerald-700", bg:"bg-emerald-50 border-emerald-200" },
    draft:    { label:"مسودة",       Icon:FileText,    color:"text-amber-700",   bg:"bg-amber-50 border-amber-200" },
    archived: { label:"مؤرشف",      Icon:Archive,      color:"text-gray-500",    bg:"bg-gray-50 border-gray-200" },
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
          <div className="flex items-center gap-2">
            {/* حالة: لا يوجد جدول */}
            {!schedule && !isReadOnly && (
              <>
                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={()=>onCreateSchedule('new')}>
                  <Plus className="w-3 h-3"/>{language==='ar'?'جديد':'New'}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={()=>onCreateSchedule('clone')}>
                  <Copy className="w-3 h-3"/>{language==='ar'?'نسخ السابق':'Clone'}
                </Button>
              </>
            )}
            {/* حالة: مسودة — زر اعتماد وحذف للمدير وفوق */}
            {schedule?.status === 'draft' && !isReadOnly && (
              <>
                <Button size="sm" className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={onApprove}
                  data-testid="approve-schedule-btn">
                  <CheckCircle2 className="w-3 h-3"/>{language==='ar'?'اعتماد':'Approve'}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 text-destructive border-destructive/30" onClick={onDelete}>
                  <Trash2 className="w-3 h-3"/>{language==='ar'?'حذف':'Delete'}
                </Button>
              </>
            )}
            {/* حالة: معتمد — زر فتح للمدير والأدمن فقط */}
            {schedule?.status === 'active' && canUnlock && (
              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                onClick={onUnlock} data-testid="unlock-schedule-btn">
                <LockOpen className="w-3 h-3"/>{language==='ar'?'فتح للتعديل':'Unlock'}
              </Button>
            )}
            {/* حالة: معتمد — رسالة للمستخدم العادي */}
            {schedule?.status === 'active' && !canUnlock && (
              <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                <Lock className="w-3 h-3"/>{language==='ar'?'الجدول مقفل':'Locked'}
              </span>
            )}
          </div>
        </div>
        <div className="text-center mt-2">
          <span className="text-sm font-bold text-gray-700">{getMonthLabel(selectedMonth)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function EmployeeManagement({ department, onScheduleChange }) {
  const { language } = useLanguage();
  const { user, isReadOnly, hasPermission, canWrite, canRead } = useAuth();

  // Permission levels:
  // none = can't see at all
  // read = can see data, no edit buttons
  // write = can see and edit
  const isAr = language === 'ar';

  // Roles this user can assign (can't assign >= own level)
  const ROLE_HIERARCHY = { system_admin:5, general_manager:4, department_manager:3, shift_supervisor:2, field_staff:1, admin_staff:1 };
  const myLevel = ROLE_HIERARCHY[user?.role] || 0;
  const [employees, setEmployees]           = useState([]);
  const [gates, setGates]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [submitting, setSubmitting]         = useState(false);
  const [shifts, setShifts]                 = useState([]);
  const [coverageLocations, setCoverageLocations] = useState([]);
  const [selectedMonth, setSelectedMonth]   = useState(getMonthKey(new Date()));
  const [schedule, setSchedule]             = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const todayAr = getTodayArabic();
  const currentMonthKey = getMonthKey(new Date());

  useEffect(() => {
    fetchDepartmentSettings(); fetchEmployees(); if(department==='gates') fetchGates();
    const interval = setInterval(() => { fetchEmployees(true); }, 30000);
    return () => clearInterval(interval);
  }, [department]);
  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(() => { fetchSchedule(true); }, 30000);
    return () => clearInterval(interval);
  }, [selectedMonth, department]);

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

  const fetchEmployees = async (silent=false) => {
    try {
      const token = localStorage.getItem("token");
      const dept = department || user?.department;
      const url = dept ? `${API}/employees?department=${dept}` : `${API}/employees`;
      const res = await axios.get(url, { headers:{ Authorization:`Bearer ${token}` } });
      setEmployees(res.data);
    } catch(e) { if (!silent) toast.error(isAr ? "فشل في جلب الموظفين" : "Failed"); }
    finally { if (!silent) setLoading(false); }
  };

  const fetchSchedule = async (silent=false) => {
    if (!silent) setScheduleLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/schedules/${department}/${selectedMonth}`, { headers:{ Authorization:`Bearer ${token}` } });
      setSchedule(res.data);
    } catch(e) { if (!silent) setSchedule(null); }
    finally { if (!silent) setScheduleLoading(false); }
  };

  // Merge base employee data + monthly schedule (للجدول والتعديل)
  const mergedEmployees = useMemo(() => {
    const assignmentMap = {};
    if (schedule?.assignments) schedule.assignments.forEach(a => { assignmentMap[a.employee_id] = a; });
    const isCurrentOrActive = schedule && (selectedMonth===currentMonthKey || schedule.status==='active');
    return employees.map(emp => {
      const a = assignmentMap[emp.id];
      const restDays = a ? a.rest_days : (emp.rest_days || []);
      const location  = a ? a.location : (emp.location || "");
      const shift     = a ? a.shift    : (emp.shift || "");
      const isTasked  = a ? a.is_tasked : false;
      const isOnRest  = isCurrentOrActive && restDays.includes(todayAr);
      const contractOk = isContractActive(emp);
      return { ...emp, rest_days: restDays, location, shift, is_tasked: isTasked,
               is_active: !isOnRest && contractOk, on_rest: isOnRest,
               contract_expired: !contractOk, has_assignment: !!a };
    });
  }, [employees, schedule, selectedMonth, currentMonthKey, todayAr]);

  // statsEmployees — للإحصائيات فقط: صفر لكل البيانات المرتبطة بالجدول حين لا يكون معتمداً
  const statsEmployees = useMemo(() => {
    const isApproved = schedule?.status === 'active';
    const assignmentMap = {};
    if (isApproved && schedule?.assignments) {
      schedule.assignments.forEach(a => { assignmentMap[a.employee_id] = a; });
    }
    return employees.map(emp => {
      const a = isApproved ? assignmentMap[emp.id] : null;
      // إذا لم يكن الجدول معتمداً → rest_days وshift وis_tasked كلها صفر/فارغ
      const restDays  = a ? (a.rest_days || []) : [];
      const shift     = a ? (a.shift || "")     : "";
      const isTasked  = a ? (a.is_tasked === true) : false;
      const isOnRest  = isApproved && restDays.includes(todayAr);
      const contractOk = isContractActive(emp);
      return { ...emp, rest_days: restDays, shift, is_tasked: isTasked,
               is_active: !isOnRest && contractOk, on_rest: isOnRest,
               contract_expired: !contractOk };
    });
  }, [employees, schedule, todayAr]);

  const handleCreateSchedule = async (mode) => {
    try {
      const token = localStorage.getItem("token");
      const prevMonth = (() => { const [y,m]=selectedMonth.split('-').map(Number); return getMonthKey(new Date(y,m-2,1)); })();
      await axios.post(`${API}/admin/schedules`, { department, month:selectedMonth, clone_from: mode==="clone"?prevMonth:null }, { headers:{ Authorization:`Bearer ${token}` } });
      toast.success(isAr ? `تم إنشاء جدول ${getMonthLabel(selectedMonth)}` : "Schedule created");
      fetchSchedule();
      onScheduleChange?.(); // تحديث badge فوراً
    } catch(e) { toast.error(e.response?.data?.detail || (isAr?"فشل الإنشاء":"Failed")); }
  };

  const handleApproveSchedule = async () => {
    if(!schedule) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/admin/schedules/${schedule.id}/status?status=active`,{},{ headers:{ Authorization:`Bearer ${token}` } });
      toast.success(isAr ? "تم اعتماد الجدول ✅" : "Schedule approved");
      fetchSchedule();
      onScheduleChange?.(); // badge → عدد الموظفين فوراً
    } catch(e) { toast.error(isAr?"فشل الاعتماد":"Failed"); }
  };

  const handleDeleteSchedule = async () => {
    if(!schedule) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/schedules/${schedule.id}`,{ headers:{ Authorization:`Bearer ${token}` } });
      toast.success(isAr?"تم حذف الجدول":"Schedule deleted");
      setSchedule(null);
      onScheduleChange?.(); // badge → null فوراً
    } catch(e) { toast.error(e.response?.data?.detail||(isAr?"فشل الحذف":"Failed")); }
  };

  const handleUnlockSchedule = async () => {
    if(!schedule) return;
    if(!window.confirm(isAr ? "هل تريد فتح الجدول للتعديل؟ سيتم تغيير حالته إلى مسودة." : "Unlock schedule for editing?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/admin/schedules/${schedule.id}/unlock`, {}, { headers:{ Authorization:`Bearer ${token}` } });
      toast.success(isAr ? "تم فتح الجدول للتعديل" : "Schedule unlocked");
      fetchSchedule();
      onScheduleChange?.(); // badge → "مسودة" فوراً
    } catch(e) { toast.error(e.response?.data?.detail||(isAr?"فشل فتح الجدول":"Failed to unlock")); }
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


  const statistics = useMemo(() => {
    const total     = statsEmployees.length;
    const active    = statsEmployees.filter(e=>e.is_active).length;
    const onRest    = statsEmployees.filter(e=>e.on_rest).length;
    const permanent = statsEmployees.filter(e=>e.employment_type==='permanent'||!e.employment_type).length;
    const seasonal  = statsEmployees.filter(e=>e.employment_type==='seasonal').length;
    const temporary = statsEmployees.filter(e=>e.employment_type==='temporary').length;
    const fieldOps  = statsEmployees.filter(e=>(e.user_role||'field_staff')!=='admin_staff').length;
    const tasked    = statsEmployees.filter(e=>e.is_tasked).length;

    // توزيع الورديات
    const shiftStats = shifts.map(s=>({
      ...s,
      count: statsEmployees.filter(e=>e.shift===s.value).length,
      pct: total>0 ? Math.round(statsEmployees.filter(e=>e.shift===s.value).length/total*100) : 0,
    }));
    const noShift = statsEmployees.filter(e=>!e.shift||!shifts.find(s=>s.value===e.shift)).length;

    // التغطية الأسبوعية
    const coverage = WEEK_DAYS.map(day=>{
      const resting = statsEmployees.filter(e=>(e.rest_days||[]).includes(day.value)).length;
      const avail   = total - resting;
      return { ...day, available:avail, resting, total, pct: total>0?Math.round(avail/total*100):0 };
    });

    // توزيع حسب الفئة (user_role)
    const ROLE_MAP = {
      field_staff:'موظف ميداني', shift_supervisor:'مشرف وردية',
      department_manager:'مدير إدارة', admin_staff:'موظف إداري',
      general_manager:'مدير عام',
    };
    const roleStats = Object.entries(
      statsEmployees.reduce((acc,e)=>{ const r=ROLE_MAP[e.user_role||'field_staff']||e.user_role||'—'; acc[r]=(acc[r]||0)+1; return acc; }, {})
    ).map(([label,count])=>({ label, count, pct: total>0?Math.round(count/total*100):0 }))
     .sort((a,b)=>b.count-a.count);

    // نسبة اكتمال الجدول (لكل موظف: له وردية + له يوم راحة واحد على الأقل)
    const completionScore = schedule?.assignments?.length > 0
      ? Math.round(
          schedule.assignments.reduce((sum,a) => {
            let score = 0;
            if (a.shift) score += 40;
            if ((a.rest_days||[]).length > 0) score += 40;
            if (a.is_tasked !== undefined) score += 20;
            return sum + score;
          }, 0) / (schedule.assignments.length * 100) * 100
        ) : (total > 0 ? 0 : null);

    // تحذيرات الجدول
    const warnings = [];
    if (noShift > 0)
      warnings.push({ type:'warning', msg:`${noShift} موظف بدون وردية محددة`, icon:'⚠️' });
    if (schedule?.assignments) {
      const noRest = schedule.assignments.filter(a=>(a.rest_days||[]).length===0).length;
      if (noRest > 0)
        warnings.push({ type:'warning', msg:`${noRest} موظف بدون أيام راحة`, icon:'☕' });
    }
    if (!schedule)
      warnings.push({ type:'info', msg:'لم يُنشأ جدول لهذا الشهر بعد', icon:'📋' });
    else if (schedule.status==='draft')
      warnings.push({ type:'info', msg:'الجدول مسودة — الأرقام غير رسمية', icon:'⏳' });
    if (tasked === 0 && total > 0 && schedule?.status==='active')
      warnings.push({ type:'warning', msg:'لا يوجد موظف مكلف هذا الشهر', icon:'🔔' });

    return {
      total, active, onRest, permanent, seasonal, temporary,
      fieldOps, tasked, noShift, shiftStats, coverage, roleStats,
      completionScore, warnings,
    };
  }, [statsEmployees, shifts, schedule]);

  // canEdit: يمنع التعديل عندما الجدول معتمد (active) أو مؤرشف
  const canEdit = canWrite('edit_employees') && (!schedule || (schedule.status !== 'active' && schedule.status !== 'archived'));
  // canUnlock: فقط مدير الإدارة والأدمن يقدرون يفتحون الجدول
  const canUnlock = user?.role === 'system_admin' || user?.role === 'department_manager';
  const canViewEmp = canRead('edit_employees') || canRead('add_employees');
  const canAddEmp = canWrite('add_employees') && (!schedule || (schedule.status !== 'active' && schedule.status !== 'archived'));
  const canDeleteEmp = canWrite('delete_employees');
  const canManageAccounts = canWrite('manage_accounts');
  const canResetPins = canWrite('reset_pins');
  const canChangeRoles = canWrite('change_roles');

  // If can't even read employees, hide the whole section
  if (!canViewEmp && user?.role !== 'system_admin') return (
    <div className="flex items-center justify-center min-h-[300px] text-muted-foreground text-sm">
      {language === 'ar' ? 'ليس لديك صلاحية لعرض بيانات الموظفين' : 'No permission to view employees'}
    </div>
  );

  if(loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>;

  const isPermanentEmp = (emp) => (emp.employment_type||'permanent')==='permanent';

  return (
    <div className="space-y-5 max-w-full" data-testid="employee-management">
      {/* Month Bar */}
      <MonthBar
        selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} schedule={schedule}
        onCreateSchedule={handleCreateSchedule} onApprove={handleApproveSchedule}
        onDelete={handleDeleteSchedule} onUnlock={handleUnlockSchedule}
        canUnlock={canUnlock} isReadOnly={!canEdit} language={language}
      />

      {/* ── Row 1: بطاقات الأرقام الأساسية (حذف دائم ودور الجدول) ── */}
      {(() => {
        const isApproved = schedule?.status === 'active';
        const isDraft    = schedule?.status === 'draft';
        const total      = statistics.total;

        const CARDS = [
          {
            label:"إجمالي الموظفين", value:total,
            desc:"على رأس العمل",
            color:"#2563eb", grad:"from-blue-50 to-indigo-50/60", border:"#bfdbfe", Icon:Users,
          },
          {
            label: isApproved ? "مداومون اليوم" : "مداومون",
            value: isApproved ? statistics.active : (isDraft ? "—" : total),
            desc: isApproved ? `من أصل ${total}` : (isDraft ? "اعتمد الجدول أولاً" : "بيانات أساسية"),
            color:"#059669", grad:"from-emerald-50 to-green-50/60", border:"#a7f3d0", Icon:UserCheck,
          },
          {
            label:"في راحة",
            value: isApproved ? statistics.onRest : "—",
            desc: isApproved ? "إجازة أسبوعية" : "من الجدول المعتمد",
            color:"#d97706", grad:"from-amber-50 to-yellow-50/60", border:"#fcd34d", Icon:Coffee,
          },
          {
            label:"مكلفون",
            value: isApproved ? statistics.tasked : "—",
            desc: isApproved ? getMonthLabel(selectedMonth) : "من الجدول المعتمد",
            color:"#7c3aed", grad:"from-violet-50 to-purple-50/60", border:"#c4b5fd", Icon:Zap,
          },
          {
            label:"ميدانيون",
            value: statistics.fieldOps,
            desc:"موظفو الخدمة الميدانية",
            color:"#0f766e", grad:"from-teal-50 to-emerald-50/60", border:"#99f6e4", Icon:UserCheck,
          },
        ];

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
            {CARDS.map((s, i) => {
              const pct = total > 0 && typeof s.value === 'number' ? Math.round((s.value/total)*100) : null;
              return (
                <div key={i} className={`group relative overflow-hidden rounded-2xl border p-3 bg-gradient-to-br ${s.grad} hover:scale-[1.02] hover:shadow-lg transition-all duration-200`}
                  style={{ borderColor: s.color+"40" }}>
                  <div className="absolute -left-3 -bottom-3 w-12 h-12 rounded-full opacity-[0.08] group-hover:opacity-[0.15] transition-opacity" style={{ backgroundColor:s.color }}/>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm mb-2" style={{ backgroundColor:s.color+"20" }}>
                    <s.Icon className="w-4 h-4" style={{ color:s.color }}/>
                  </div>
                  <p className="text-2xl font-black leading-none mb-1 tabular-nums" style={{ color:s.color }}>{s.value}</p>
                  <p className="text-[11px] font-bold text-slate-700 leading-tight">{s.label}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{s.desc}</p>
                  {pct !== null && (
                    <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, backgroundColor:s.color }}/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Row 2: بطاقات تحليلية موسعة ───────────────────────── */}
      {(() => {
        const isApproved = schedule?.status === 'active';
        const total = statistics.total;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">

            {/* ① توزيع الورديات */}
            <div className="rounded-2xl border p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 hover:shadow-md transition-all" style={{ borderColor:"#bfdbfe" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600"/>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-700">توزيع الورديات</p>
                  <p className="text-[9px] text-slate-400">{isApproved ? "من الجدول المعتمد" : "بيانات أساسية"}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {statistics.shiftStats.filter(s=>s.count>0).length > 0 ? (
                  statistics.shiftStats.filter(s=>s.count>0).map((s,i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold" style={{ color: s.color||"#2563eb" }}>{s.label}</span>
                        <span className="text-[10px] font-bold text-slate-600">{s.count} <span className="text-[9px] text-slate-400">({s.pct}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width:`${s.pct}%`, backgroundColor:s.color||"#2563eb" }}/>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 text-center py-2">لا توجد ورديات محددة</p>
                )}
                {statistics.noShift > 0 && (
                  <p className="text-[9px] text-amber-600 flex items-center gap-1 mt-1">
                    <span>⚠️</span>{statistics.noShift} بدون وردية
                  </p>
                )}
              </div>
            </div>

            {/* ② التغطية الأسبوعية */}
            <div className="rounded-2xl border p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 hover:shadow-md transition-all" style={{ borderColor:"#a7f3d0" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-emerald-600"/>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-700">التغطية الأسبوعية</p>
                  <p className="text-[9px] text-slate-400">{isApproved ? "نسبة الحضور كل يوم" : "من الجدول المعتمد"}</p>
                </div>
              </div>
              <div className="flex items-end gap-1 justify-between">
                {statistics.coverage.map((day, i) => {
                  const pct = day.pct;
                  const barH = isApproved ? Math.max(8, Math.round(pct * 0.5)) : 8;
                  const color = !isApproved ? "#cbd5e1"
                    : pct >= 90 ? "#059669" : pct >= 70 ? "#eab308" : "#ef4444";
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-[8px] font-bold tabular-nums" style={{ color }}>{isApproved ? pct+"%" : "—"}</span>
                      <div className="w-full bg-slate-100 rounded-sm overflow-hidden relative" style={{ height:"32px" }}>
                        <div className="absolute bottom-0 left-0 right-0 rounded-sm transition-all duration-700"
                          style={{ height:`${isApproved ? pct : 0}%`, backgroundColor: color }}/>
                      </div>
                      <span className="text-[8px] text-slate-400 truncate w-full text-center">{day.short}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ③ توزيع حسب الفئة */}
            <div className="rounded-2xl border p-4 bg-gradient-to-br from-violet-50/80 to-purple-50/40 hover:shadow-md transition-all" style={{ borderColor:"#c4b5fd" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-violet-600"/>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-700">توزيع الفئات</p>
                  <p className="text-[9px] text-slate-400">حسب الدور الوظيفي</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {statistics.roleStats.slice(0,4).map((r,i) => {
                  const ROLE_COLORS = ["#7c3aed","#0284c7","#059669","#d97706","#6b7280"];
                  const clr = ROLE_COLORS[i] || "#6b7280";
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] font-medium text-slate-600 truncate max-w-[100px]">{r.label}</span>
                        <span className="text-[10px] font-bold" style={{ color:clr }}>{r.count} <span className="text-[9px] text-slate-400">({r.pct}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width:`${r.pct}%`, backgroundColor:clr }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ④ نسبة اكتمال الجدول */}
            <div className="rounded-2xl border p-4 bg-gradient-to-br from-rose-50/80 to-pink-50/40 hover:shadow-md transition-all" style={{ borderColor:"#fda4af" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-rose-600"/>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-700">اكتمال الجدول</p>
                  <p className="text-[9px] text-slate-400">وردية + راحة + تكليف</p>
                </div>
              </div>
              {statistics.completionScore !== null ? (
                <div className="flex flex-col items-center gap-2">
                  {/* دائرة النسبة */}
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="8"/>
                      <circle cx="40" cy="40" r="32" fill="none"
                        stroke={statistics.completionScore>=80?"#059669":statistics.completionScore>=50?"#eab308":"#ef4444"}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${201 * statistics.completionScore/100} 201`}
                        style={{ transition:"stroke-dasharray 1s ease" }}/>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black leading-none"
                        style={{ color:statistics.completionScore>=80?"#059669":statistics.completionScore>=50?"#eab308":"#ef4444" }}>
                        {statistics.completionScore}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-600 text-center">
                    {statistics.completionScore===100 ? "✅ جدول مكتمل!" :
                     statistics.completionScore>=80 ? "جيد جداً" :
                     statistics.completionScore>=50 ? "يحتاج إكمال" : "⚠️ ناقص"}
                  </p>
                </div>
              ) : (
                <p className="text-center text-[11px] text-slate-400 py-4">لا يوجد جدول</p>
              )}
            </div>

            {/* ⑤ تحذيرات الجدول */}
            <div className={`rounded-2xl border p-4 hover:shadow-md transition-all
              ${statistics.warnings.filter(w=>w.type==='warning').length>0
                ? "bg-gradient-to-br from-amber-50/80 to-yellow-50/40"
                : "bg-gradient-to-br from-slate-50/80 to-gray-50/40"}`}
              style={{ borderColor: statistics.warnings.filter(w=>w.type==='warning').length>0 ? "#fcd34d" : "#e2e8f0" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center
                  ${statistics.warnings.filter(w=>w.type==='warning').length>0 ? "bg-amber-100" : "bg-slate-100"}`}>
                  <HardHat className={`w-4 h-4 ${statistics.warnings.filter(w=>w.type==='warning').length>0 ? "text-amber-600" : "text-slate-500"}`}/>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-700">تحذيرات الجدول</p>
                  <p className="text-[9px] text-slate-400">
                    {statistics.warnings.filter(w=>w.type==='warning').length > 0
                      ? `${statistics.warnings.filter(w=>w.type==='warning').length} تحذير يحتاج انتباهاً`
                      : "لا توجد تحذيرات"}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                {statistics.warnings.length === 0 && (
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5"/>الجدول سليم ✅
                  </p>
                )}
                {statistics.warnings.map((w,i) => (
                  <div key={i} className={`flex items-start gap-1.5 text-[10px] rounded-lg px-2 py-1.5
                    ${w.type==='warning' ? "bg-amber-100/60 text-amber-800" : "bg-blue-50 text-blue-700"}`}>
                    <span className="flex-shrink-0">{w.icon}</span>
                    <span className="leading-tight">{w.msg}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        );
      })()}

      {/* Employee Table — Header + Actions */}
      <div className="flex items-center justify-between">
        <div className="text-right flex-1">
          <h2 className="font-cairo font-bold text-lg">{isAr?'جدول الموظفين':'Staff Schedule'}</h2>
          <p className="text-xs text-muted-foreground">
            {schedule
              ? `${isAr?'جدول':'Schedule'} ${getMonthLabel(selectedMonth)} — ${schedule.status==='active'?'معتمد':schedule.status==='draft'?'مسودة':'مؤرشف'}`
              : (isAr?'البيانات الأساسية للموظفين':'Base employee data')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="export-employees-btn">
                <Download className="w-4 h-4 ml-1"/>{isAr?'تصدير':'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const link = document.createElement('a');
                link.href = `${API}/employees/export?department=${department}`;
                link.setAttribute('download', '');
                const token = localStorage.getItem('token');
                fetch(`${API}/employees/export?department=${department}`, { headers: { Authorization: `Bearer ${token}` } })
                  .then(res => res.blob())
                  .then(blob => { const url = URL.createObjectURL(blob); link.href = url; link.click(); URL.revokeObjectURL(url); toast.success(isAr?'تم تصدير الملف':'Exported'); })
                  .catch(() => toast.error(isAr?'خطأ في التصدير':'Export error'));
              }}>
                <Download className="w-4 h-4 ml-2"/>{isAr?'تصدير Excel':'Export Excel'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                fetch(`${API}/employees/export/template`)
                  .then(res => res.blob())
                  .then(blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'employee_template.xlsx'; a.click(); URL.revokeObjectURL(url); toast.success(isAr?'تم تحميل القالب':'Template downloaded'); })
                  .catch(() => toast.error(isAr?'خطأ':'Error'));
              }}>
                <FileText className="w-4 h-4 ml-2"/>{isAr?'تحميل قالب الاستيراد':'Download Template'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Import */}
          {canAddEmp && (
            <Button variant="outline" size="sm" onClick={() => document.getElementById('import-excel-input').click()} data-testid="import-employees-btn">
              <Upload className="w-4 h-4 ml-1"/>{isAr?'استيراد':'Import'}
            </Button>
          )}
          <input id="import-excel-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('department', department);
            try {
              const token = localStorage.getItem('token');
              const res = await axios.post(`${API}/employees/import`, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
              toast.success(`${isAr?'تم استيراد':'Imported'} ${res.data.created} ${isAr?'موظف':'employees'}${res.data.skipped > 0 ? ` (${isAr?'تخطي':'skipped'} ${res.data.skipped})` : ''}`);
              if (res.data.errors?.length > 0) toast.warning(`${res.data.errors.length} ${isAr?'أخطاء':'errors'}`);
              fetchEmployees();
            } catch (err) {
              toast.error(err.response?.data?.detail || (isAr?'خطأ في الاستيراد':'Import error'));
            }
            e.target.value = '';
          }} />
        </div>
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
                  <TableHead className="text-center py-2.5 w-[80px]">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shadow-sm">
                        <Tag className="w-4 h-4 text-indigo-600"/>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600">{isAr?'الفئة':'Type'}</span>
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

                    {/* Shift Category */}
                    <TableCell className="text-center">
                      {(() => {
                        const shiftData = shifts.find(s => s.value === emp.shift);
                        const cat = shiftData?.description;
                        return cat === 'secondary' ? (
                          <Badge variant="outline" className="text-[10px]">{isAr ? 'فرعية' : 'Sub'}</Badge>
                        ) : emp.shift ? (
                          <Badge className="text-[10px] bg-primary">{isAr ? 'رئيسية' : 'Main'}</Badge>
                        ) : <span className="text-[10px] text-muted-foreground">-</span>;
                      })()}
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

                    {/* Actions removed — moved to employees tab */}
                  </TableRow>
                ))}
                {mergedEmployees.length===0 && (
                  <TableRow>
                    <TableCell colSpan={schedule?7:6} className="text-center py-8 text-muted-foreground">
                      {isAr?'لا يوجد موظفين':'No employees'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
