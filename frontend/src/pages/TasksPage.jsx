import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  Plus, LayoutGrid, List, Clock, CheckCircle2, Loader2, Trash2,
  Edit, AlertTriangle, ChevronDown, Users, Zap, Calendar,
  ArrowUpRight, CircleDot, Tag, RefreshCw, Filter, Search,
  Flame, TimerOff, Timer, AlarmClock, Star, Trophy, TrendingUp,
  ChevronLeft, ChevronRight, CalendarDays, Archive, Award,
  BarChart3, Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── Constants ─────────────────────────────────────────────────
const PRIORITY_CFG = {
  low:    { label: "منخفض",  color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1", Icon: ArrowUpRight },
  normal: { label: "عادي",   color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", Icon: CircleDot },
  high:   { label: "مرتفع",  color: "#d97706", bg: "#fffbeb", border: "#fcd34d", Icon: Zap },
  urgent: { label: "عاجل",   color: "#dc2626", bg: "#fef2f2", border: "#fecaca", Icon: AlertTriangle },
};
const STATUS_CFG = {
  pending:     { label: "انتظار",  color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", Icon: Clock },
  in_progress: { label: "جارية",  color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", Icon: Loader2 },
  done:        { label: "منجزة",  color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", Icon: CheckCircle2 },
  overdue:     { label: "متأخرة", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", Icon: AlertTriangle },
};
const PERF_CFG = {
  early:   { label: "مبكر",    Icon: Star,         cls: "bg-amber-50 text-amber-700 border-amber-300" },
  on_time: { label: "في الوقت", Icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  late:    { label: "متأخر",   Icon: TimerOff,     cls: "bg-red-50 text-red-600 border-red-200" },
};
const TIME_STATUS_CFG = {
  overdue:  { bg:"bg-red-100",    text:"text-red-700",    border:"border-red-300",    Icon: TimerOff,   pulse:true  },
  critical: { bg:"bg-red-50",     text:"text-red-600",    border:"border-red-200",    Icon: Flame,      pulse:true  },
  warning:  { bg:"bg-amber-50",   text:"text-amber-700",  border:"border-amber-200",  Icon: AlarmClock, pulse:false },
  soon:     { bg:"bg-yellow-50",  text:"text-yellow-700", border:"border-yellow-200", Icon: Timer,      pulse:false },
  normal:   { bg:"bg-slate-50",   text:"text-slate-500",  border:"border-slate-200",  Icon: Calendar,   pulse:false },
};
const DAY_STATUS_CFG = {
  great:   { bg: "#dcfce7", border: "#86efac", dot: "#22c55e", label: "ممتاز" },
  good:    { bg: "#d1fae5", border: "#6ee7b7", dot: "#10b981", label: "جيد" },
  partial: { bg: "#fef9c3", border: "#fde047", dot: "#eab308", label: "جزئي" },
  bad:     { bg: "#fee2e2", border: "#fca5a5", dot: "#ef4444", label: "متأخر" },
  empty:   { bg: "#f8fafc", border: "#e2e8f0", dot: "#cbd5e1", label: "لا مهام" },
};
const MONTH_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
                  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAY_NAMES = ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];

// ── Helpers ────────────────────────────────────────────────────
function getSADate(d = new Date()) {
  return new Date(d.getTime() + 3*60*60*1000).toISOString().slice(0,10);
}
function getSANow() { return new Date(Date.now() + 3*60*60*1000); }
function formatDate(d) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("ar-SA", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}
function monthLabel(m) {
  const [y,mo] = m.split("-");
  return `${MONTH_AR[parseInt(mo)-1]} ${y}`;
}
function formatRemaining(mins) {
  const abs = Math.abs(mins);
  if (abs < 60) return `${abs} د`;
  const h = Math.floor(abs/60), m = abs%60;
  return m > 0 ? `${h}س ${m}د` : `${h} ساعة`;
}
function get_time_status(dueAt, status) {
  if (status === "done" || !dueAt) return "none";
  const due = new Date(dueAt);
  const diffH = (due - Date.now()) / 3.6e6;
  if (diffH < 0) return "overdue";
  if (diffH < 1) return "critical";
  if (diffH < 3) return "warning";
  if (diffH < 24) return "soon";
  return "normal";
}

// ── Sub-components ─────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG.normal;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      <cfg.Icon className="w-3 h-3"/>{cfg.label}
    </span>
  );
}
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      <cfg.Icon className="w-3 h-3"/>{cfg.label}
    </span>
  );
}
function PerformanceBadge({ performance, delta }) {
  if (!performance || performance === "no_due") return null;
  const cfg = PERF_CFG[performance];
  if (!cfg) return null;
  const label = performance === "early" && delta ? `مبكر بـ ${formatRemaining(Math.abs(delta))}`
    : performance === "late" && delta ? `تأخر ${formatRemaining(Math.abs(delta))}`
    : cfg.label;
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cfg.cls}`}><cfg.Icon className="w-3 h-3"/>{label}</span>;
}
function AssigneeAvatars({ assignees, max=3 }) {
  const shown = assignees.slice(0, max);
  return (
    <div className="flex -space-x-1 rtl:space-x-reverse">
      {shown.map((a,i) => (
        <div key={i} title={a.name} className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold border-2 border-white shadow-sm">
          {a.name?.charAt(0)||"؟"}
        </div>
      ))}
      {assignees.length > max && <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[9px] font-bold border-2 border-white">+{assignees.length-max}</div>}
    </div>
  );
}

// ── Task Card (minimal, for day view) ─────────────────────────
function TaskCard({ task, canManage, onEdit, onDelete, onStatus }) {
  const ts = get_time_status(task.due_at, task.status);
  const tsCfg = TIME_STATUS_CFG[ts];
  const isDone = task.status === "done";
  return (
    <div className={`group bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-3 space-y-2
      ${isDone ? "opacity-80" : ""}`}
      style={{ borderLeftWidth: "3px", borderLeftColor: PRIORITY_CFG[task.priority]?.color || "#6b7280" }}
      data-testid={`task-card-${task.id}`}>
      <div className="flex items-start justify-between gap-2">
        <PriorityBadge priority={task.priority}/>
        <div className="flex items-center gap-1">
          <StatusBadge status={task.status}/>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400"/>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" dir="rtl" className="font-cairo w-44">
                <DropdownMenuItem onClick={()=>onEdit(task)}><Edit className="w-3.5 h-3.5 ml-2"/>تعديل</DropdownMenuItem>
                <DropdownMenuSeparator/>
                {["pending","in_progress","done"].map(s=>(
                  <DropdownMenuItem key={s} onClick={()=>onStatus(task.id,s)} disabled={task.status===s} className={task.status===s?"opacity-50":""}>
                    {(()=>{const C=STATUS_CFG[s];return <C.Icon className="w-3.5 h-3.5 ml-2"/>;})()}{STATUS_CFG[s].label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator/>
                <DropdownMenuItem onClick={()=>onDelete(task.id)} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-3.5 h-3.5 ml-2"/>حذف
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!canManage && !isDone && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
              onClick={()=>onStatus(task.id, task.status==="pending"?"in_progress":"done")}>
              {task.status==="pending"?"بدء":"إنهاء"}
            </Button>
          )}
        </div>
      </div>
      <p className="font-cairo font-semibold text-sm">{task.title}</p>
      {task.description && <p className="text-[11px] text-muted-foreground line-clamp-1">{task.description}</p>}
      {/* Performance badge for done tasks */}
      {isDone && task.completion_performance && (
        <PerformanceBadge performance={task.completion_performance} delta={task.completion_delta_minutes}/>
      )}
      {/* Time progress */}
      {!isDone && ts && ts !== "none" && tsCfg && (
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${tsCfg.bg} ${tsCfg.text} ${tsCfg.border} ${tsCfg.pulse?"animate-pulse":""}`}>
          <tsCfg.Icon className="w-3 h-3"/>
          {ts==="overdue" ? `تأخر ${formatRemaining(Math.abs(task.remaining_minutes||0))}` : `متبقي ${formatRemaining(task.remaining_minutes||0)}`}
        </div>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <AssigneeAvatars assignees={task.assignees_info||[]}/>
        <span className="text-[9px] text-muted-foreground">{task.created_by}</span>
      </div>
    </div>
  );
}

// ── Calendar Cell ──────────────────────────────────────────────
function CalendarCell({ date, data, isSelected, isToday, isFuture, onClick, onAdd }) {
  const dayNum = parseInt(date.split("-")[2]);
  const dayOfWeek = new Date(date+"T00:00:00").getDay();
  const cfg = data ? (DAY_STATUS_CFG[data.day_status] || DAY_STATUS_CFG.empty) : DAY_STATUS_CFG.empty;
  const hasData = data && data.total > 0;
  return (
    <div className="relative group">
      <button onClick={()=>onClick(date)}
        className={`relative w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all border
          ${isSelected ? "ring-2 ring-primary ring-offset-1 scale-105 shadow-md" : "hover:scale-105 hover:shadow-sm"}`}
        style={hasData ? { backgroundColor: cfg.bg, borderColor: cfg.border } : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
        title={hasData ? `${data.total} مهمة | ${data.done} منجزة | ${data.pct}%` : isFuture ? "اضغط للتخطيط المسبق" : "اضغط لعرض المهام"}>
        {isToday && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary"/>}
        <span className={`text-sm font-bold leading-none ${isSelected?"text-primary":isFuture?"text-slate-400":"text-slate-700"}`}>{dayNum}</span>
        <span className="text-[8px] text-slate-400">{DAY_NAMES[dayOfWeek]}</span>
        {hasData && (
          <div className="flex items-center gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }}/>
            <span className="text-[8px] font-bold" style={{ color: cfg.dot }}>{data.pct}%</span>
          </div>
        )}
        {isFuture && !hasData && (
          <span className="text-[8px] text-slate-300">📅</span>
        )}
      </button>
      {/* زر + للإضافة السريعة عند hover */}
      {onAdd && !isSelected && (
        <button onClick={e=>{ e.stopPropagation(); onAdd(date); }}
          className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center
            shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 z-10"
          title={`إضافة مهمة ليوم ${date}`}>
          <Plus className="w-3 h-3"/>
        </button>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function TasksPage({ department }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === "ar";
  const isManager = ["system_admin", "general_manager", "department_manager"].includes(user?.role);

  const dept = department || user?.department;
  const token = () => localStorage.getItem("token");
  const today = getSADate();

  // ── State ──────────────────────────────────────────────────
  const [view, setView] = useState("day");          // day | calendar | archive
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(today.slice(0,7));

  const [tasks, setTasks] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [archiveData, setArchiveData] = useState([]);
  const [stats, setStats] = useState({});
  const [employees, setEmployees] = useState([]);
  const [availability, setAvailability] = useState({});
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calLoading, setCalLoading] = useState(false);

  // Emergency override
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus]   = useState("all");   // فلتر الحالة
  const [subView, setSubView]             = useState("kanban"); // kanban | list

  const emptyForm = { title:"", description:"", priority:"normal", due_at:"", assignee_ids:[], work_date: today };
  const [form, setForm] = useState(emptyForm);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchTasks = useCallback(async (date=selectedDate) => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        axios.get(`${API}/tasks?department=${dept}&work_date=${date}`, { headers:{ Authorization:`Bearer ${token()}` } }),
        axios.get(`${API}/tasks/stats?department=${dept}`, { headers:{ Authorization:`Bearer ${token()}` } }),
      ]);
      setTasks(tRes.data);
      setStats(sRes.data);
    } catch { toast.error("فشل في جلب المهام"); }
    finally { setLoading(false); }
  }, [dept, selectedDate]);

  const fetchCalendar = useCallback(async (month=currentMonth) => {
    setCalLoading(true);
    try {
      const res = await axios.get(`${API}/tasks/calendar?department=${dept}&month=${month}`, { headers:{ Authorization:`Bearer ${token()}` } });
      setCalendarData(prev => ({ ...prev, [month]: res.data }));
    } catch {} finally { setCalLoading(false); }
  }, [dept, currentMonth]);

  const fetchArchive = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/tasks/archive?department=${dept}`, { headers:{ Authorization:`Bearer ${token()}` } });
      setArchiveData(res.data);
    } catch {}
  }, [dept]);

  const fetchEmployees = useCallback(async () => {
    if (!isManager) return;
    try {
      const mo = new Date().toLocaleDateString("en-CA", { timeZone:"Asia/Riyadh" }).slice(0,7);
      const [empRes, schedRes, availRes] = await Promise.all([
        axios.get(`${API}/employees?department=${dept}`, { headers:{ Authorization:`Bearer ${token()}` } }),
        axios.get(`${API}/schedules/${dept}/${mo}`, { headers:{ Authorization:`Bearer ${token()}` } }).catch(()=>({data:null})),
        axios.get(`${API}/employees/availability?department=${dept}`, { headers:{ Authorization:`Bearer ${token()}` } }).catch(()=>({data:null})),
      ]);
      setEmployees(empRes.data);
      setActiveSchedule(schedRes.data || null);
      if (availRes.data) {
        const map = {};
        (availRes.data.employees||[]).forEach(e=>{ map[e.id]=e.availability_status; });
        setAvailability(map);
      }
    } catch {}
  }, [dept, isManager]);

  useEffect(() => { fetchTasks(selectedDate); }, [selectedDate, dept]);
  useEffect(() => { if (view==="calendar") fetchCalendar(currentMonth); }, [currentMonth, view, dept]);
  useEffect(() => { if (view==="archive") fetchArchive(); }, [view, dept]);
  useEffect(() => { fetchEmployees(); }, [dept]);

  // ── Calendar grid ──────────────────────────────────────────
  const calGrid = (() => {
    const [y,m] = currentMonth.split("-").map(Number);
    const firstDay = new Date(y, m-1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i=0; i<firstDay; i++) cells.push(null);
    for (let d=1; d<=daysInMonth; d++) {
      cells.push(`${currentMonth}-${String(d).padStart(2,"0")}`);
    }
    return cells;
  })();

  const monthData = calendarData[currentMonth] || {};
  const monthTotal = Object.values(monthData).reduce((s,d)=>s+d.total,0);
  const monthDone  = Object.values(monthData).reduce((s,d)=>s+d.done,0);
  const monthPct   = monthTotal > 0 ? Math.round(monthDone/monthTotal*100) : 0;

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("عنوان المهمة مطلوب");
    if (form.assignee_ids.length === 0) return toast.error("يجب اختيار موظف واحد على الأقل");
    setSubmitting(true);
    try {
      let dueIso = null;
      if (form.due_at) {
        try { dueIso = new Date(form.due_at + ":00+03:00").toISOString(); } catch {}
      }
      const payload = { ...form, department: dept, due_at: dueIso };
      if (editTask) {
        await axios.put(`${API}/tasks/${editTask.id}`, payload, { headers:{ Authorization:`Bearer ${token()}` } });
        toast.success("تم تحديث المهمة ✅");
      } else {
        await axios.post(`${API}/tasks`, payload, { headers:{ Authorization:`Bearer ${token()}` } });
        toast.success(`✅ تم إنشاء المهمة لـ ${formatDate(form.work_date)}`);
      }
      setDialogOpen(false); setForm({ ...emptyForm, work_date: selectedDate }); setEditTask(null);
      fetchTasks(selectedDate);
      if (view==="calendar") fetchCalendar(currentMonth);
      fetchArchive();
    } catch(err) { toast.error(err.response?.data?.detail || "فشل الحفظ"); }
    finally { setSubmitting(false); }
  };

  const handleEdit = (task) => {
    setEditTask(task);
    let dueLocal = "";
    if (task.due_at) {
      try { const sa = new Date(new Date(task.due_at).getTime()+3*60*60*1000); dueLocal = sa.toISOString().slice(0,16); } catch {}
    }
    setForm({ title:task.title, description:task.description||"", priority:task.priority,
      due_at:dueLocal, assignee_ids:task.assignee_ids||[], work_date:task.work_date||selectedDate });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("هل أنت متأكد من حذف المهمة؟")) return;
    try {
      await axios.delete(`${API}/tasks/${id}`, { headers:{ Authorization:`Bearer ${token()}` } });
      toast.success("تم حذف المهمة");
      fetchTasks(selectedDate);
      if (view==="calendar") fetchCalendar(currentMonth);
    } catch { toast.error("فشل الحذف"); }
  };

  const handleStatus = async (id, status) => {
    try {
      const res = await axios.put(`${API}/tasks/${id}/status`, { status }, { headers:{ Authorization:`Bearer ${token()}` } });
      toast.success(res.data?.message || `تم التحديث`);
      fetchTasks(selectedDate);
      if (view==="calendar") fetchCalendar(currentMonth);
    } catch(err) { toast.error(err.response?.data?.detail || "فشل التحديث"); }
  };

  const toggleAssignee = (id) => setForm(f=>({
    ...f, assignee_ids: f.assignee_ids.includes(id) ? f.assignee_ids.filter(x=>x!==id) : [...f.assignee_ids, id]
  }));

  // Employee status helpers
  const scheduleStatus = activeSchedule?.status || null;
  const sortedEmployees = employees.map(emp => {
    const av = availability[emp.id] || "no_schedule";
    const dutyStatus = av === "on_duty_now" ? "on_duty_now" : av === "off_shift" ? "off_shift" : av === "on_rest" ? "rest" : "no_schedule";
    return { ...emp, dutyStatus };
  }).sort((a,b) => {
    const o = { on_duty_now:0, no_schedule:1, off_shift:2, rest:3 };
    return (o[a.dutyStatus]||4) - (o[b.dutyStatus]||4);
  });

  // Filtered tasks for day view
  const filtered = tasks.filter(t => {
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (search && !t.title.includes(search) && !t.description?.includes(search)) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  // Day stats تفصيلية
  const dayStats = {
    total:      tasks.length,
    pending:    tasks.filter(t=>t.status==="pending").length,
    in_progress:tasks.filter(t=>t.status==="in_progress").length,
    done:       tasks.filter(t=>t.status==="done").length,
    overdue:    tasks.filter(t=>t.status==="overdue").length,
    early:      tasks.filter(t=>t.completion_performance==="early").length,
  };

  // Day navigation
  const navigate = (dir) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + dir);
    const nd = getSADate(new Date(d.getTime() + 3*60*60*1000));
    setSelectedDate(nd);
    const nm = nd.slice(0,7);
    if (nm !== currentMonth) setCurrentMonth(nm);
  };

  const isToday = selectedDate === today;
  const isFuture = (d) => d > today;

  // Day stats
  const dayTotal = tasks.length;
  const dayDone  = tasks.filter(t=>t.status==="done").length;
  const dayPct   = dayTotal > 0 ? Math.round(dayDone/dayTotal*100) : 0;
  const dayOverdue = tasks.filter(t=>t.status==="overdue").length;
  const dayEarly = tasks.filter(t=>t.completion_performance==="early").length;

  return (
    <div className="space-y-4 font-cairo" data-testid="tasks-page">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-cairo font-bold text-lg flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary"/>
            المهام اليومية
          </h2>
          <p className="text-xs text-muted-foreground">
            {isManager ? "إدارة وتتبع مهام الإدارة بالتاريخ" : "مهامك اليومية"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border rounded-xl overflow-hidden shadow-sm">
            {[
              { id:"day",      Icon:CalendarDays, label:"اليوم" },
              { id:"calendar", Icon:LayoutGrid,   label:"التقويم" },
              { id:"archive",  Icon:Archive,      label:"الأرشيف" },
            ].map(v=>(
              <button key={v.id} onClick={()=>setView(v.id)}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all
                  ${view===v.id?"bg-primary text-white shadow-sm":"hover:bg-muted text-muted-foreground"}`}
                data-testid={`view-${v.id}`}>
                <v.Icon className="w-3.5 h-3.5"/>{v.label}
              </button>
            ))}
          </div>
          {isManager && view !== "archive" && (
            <Button size="sm" className="gap-1.5 bg-primary h-8"
              onClick={()=>{ setEditTask(null); setForm({...emptyForm,work_date:selectedDate}); setDialogOpen(true); }}
              data-testid="create-task-btn">
              <Plus className="w-4 h-4"/>مهمة جديدة
            </Button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          VIEW: DAY
      ══════════════════════════════════════════════════════ */}
      {view === "day" && (
        <div className="space-y-4">
          {/* Day navigator */}
          <Card className="border-2 border-primary/10 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <button onClick={()=>navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">
                  <ChevronRight className="w-4 h-4 text-muted-foreground"/>
                </button>
                <div className="flex-1 text-center">
                  <p className="font-cairo font-bold text-base text-foreground">{formatDate(selectedDate)}</p>
                  {isToday && <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">اليوم</span>}
                </div>
                <button onClick={()=>navigate(+1)}
                  className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-muted-foreground"/>
                </button>
                <button onClick={()=>setSelectedDate(today)} disabled={isToday}
                  className="px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all disabled:opacity-30 hover:bg-primary/5 text-primary border-primary/30">
                  اليوم
                </button>
              </div>

              {/* Day stats bar */}
              {dayStats.total > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-muted-foreground">{dayStats.done}/{dayStats.total} منجزة</span>
                    <span className="text-[11px] font-bold text-primary">{dayStats.total > 0 ? Math.round(dayStats.done/dayStats.total*100) : 0}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                      style={{ width:`${dayStats.total > 0 ? Math.round(dayStats.done/dayStats.total*100) : 0}%` }}/>
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {dayStats.overdue > 0 && <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5"><TimerOff className="w-3 h-3"/>{dayStats.overdue} متأخرة</span>}
                    {dayStats.early  > 0 && <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5"><Star className="w-3 h-3"/>{dayStats.early} مبكر ⭐</span>}
                    {dayStats.done === dayStats.total && dayStats.total > 0 && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5"><Trophy className="w-3 h-3"/>يوم مثالي! 🎉</span>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Stats chips (horizontal scroll on mobile) + subview toggle ── */}
          <div className="flex items-center gap-2">
            {/* Stats: scrollable horizontally on mobile */}
            <div className="flex-1 overflow-x-auto pb-1 -mb-1">
              <div className="flex items-center gap-2 min-w-max">
                {[
                  { key:"all",         label:"الكل",     value: dayStats.total,       color:"#6b7280" },
                  { key:"pending",     label:"انتظار",   value: dayStats.pending,     color: STATUS_CFG.pending.color },
                  { key:"in_progress", label:"جارية",    value: dayStats.in_progress, color: STATUS_CFG.in_progress.color },
                  { key:"done",        label:"مكتملة",   value: dayStats.done,        color: STATUS_CFG.done.color },
                  { key:"overdue",     label:"متأخرة",   value: dayStats.overdue,     color: STATUS_CFG.overdue.color },
                  ...(dayStats.early > 0 ? [{ key:"early_only", label:"مبكر ⭐", value: dayStats.early, color:"#d97706" }] : []),
                ].map(s => (
                  <button key={s.key}
                    onClick={() => setFilterStatus(s.key === filterStatus ? "all" : s.key === "early_only" ? "done_early" : s.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap flex-shrink-0
                      ${filterStatus === s.key || (s.key==="early_only" && filterStatus==="done_early") ? "shadow-md scale-105" : "hover:shadow-sm"}`}
                    style={(filterStatus === s.key || (s.key==="early_only" && filterStatus==="done_early"))
                      ? { backgroundColor: s.color+"15", borderColor: s.color, color: s.color }
                      : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", color: "#64748b" }}>
                    <span className="font-bold text-sm" style={{ color: s.color }}>{s.value}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SubView toggle: لوحة | قائمة */}
            <div className="flex border rounded-lg overflow-hidden shadow-sm flex-shrink-0">
              <button onClick={()=>setSubView("kanban")}
                className={`px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors
                  ${subView==="kanban"?"bg-primary text-white":"hover:bg-muted text-muted-foreground"}`}
                data-testid="subview-kanban">
                <LayoutGrid className="w-3.5 h-3.5"/><span className="hidden sm:inline">لوحة</span>
              </button>
              <button onClick={()=>setSubView("list")}
                className={`px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors
                  ${subView==="list"?"bg-primary text-white":"hover:bg-muted text-muted-foreground"}`}
                data-testid="subview-list">
                <List className="w-3.5 h-3.5"/><span className="hidden sm:inline">قائمة</span>
              </button>
            </div>
          </div>

          {/* ── Search + Priority filter ── */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
              <Input value={search} onChange={e=>setSearch(e.target.value)} className="h-8 text-sm pr-9" placeholder="بحث في مهام اليوم..."/>
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-8 w-36 text-xs"><Filter className="w-3 h-3 ml-1"/><SelectValue placeholder="الأولوية"/></SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">كل الأولويات</SelectItem>
                {Object.entries(PRIORITY_CFG).map(([k,v])=><SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ── Tasks content ── */}
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-primary"/></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="text-5xl">{isFuture(selectedDate) ? "📅" : "📋"}</div>
              <p className="font-cairo font-bold text-muted-foreground">
                {filterStatus !== "all"
                  ? "لا توجد مهام بهذه الحالة"
                  : isFuture(selectedDate)
                  ? "لا توجد مهام مخططة لهذا اليوم بعد"
                  : "لا توجد مهام لهذا اليوم"}
              </p>
              {isManager && filterStatus === "all" && (
                <div className="space-y-2">
                  <Button size="sm" onClick={()=>{ setEditTask(null); setForm({...emptyForm,work_date:selectedDate}); setDialogOpen(true); }} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5"/>
                    {isFuture(selectedDate) ? `تخطيط مسبق ليوم ${selectedDate}` : "إضافة مهمة"}
                  </Button>
                  {isFuture(selectedDate) && (
                    <p className="text-[10px] text-muted-foreground">💡 يمكنك التخطيط مسبقاً لأي يوم قادم</p>
                  )}
                </div>
              )}
            </div>
          ) : subView === "kanban" ? (
            /* ── KANBAN ── */
            <>
              {/* Mobile: single column with tab selector */}
              <div className="sm:hidden">
                {/* Mobile column tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
                  {[
                    { key:"pending",     ...STATUS_CFG.pending },
                    { key:"in_progress", ...STATUS_CFG.in_progress },
                    { key:"done",        ...STATUS_CFG.done },
                    { key:"overdue",     ...STATUS_CFG.overdue },
                  ].map(col => {
                    const count = filtered.filter(t=>t.status===col.key).length;
                    const isActive = filterStatus === col.key || (filterStatus === "all" && col.key === "pending" && !["pending","in_progress","done","overdue"].some(k=>k===filterStatus && k!=="pending"));
                    return (
                      <button key={col.key}
                        onClick={()=>setFilterStatus(filterStatus===col.key?"all":col.key)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all"
                        style={filterStatus===col.key
                          ? {backgroundColor:col.bg, borderColor:col.border, color:col.color}
                          : {backgroundColor:"#f8fafc", borderColor:"#e2e8f0", color:"#64748b"}}>
                        <col.Icon className="w-3.5 h-3.5"/>{col.label}
                        <span className="font-black px-1.5 py-0.5 rounded-full text-[10px]"
                          style={{backgroundColor:col.color+"20",color:col.color}}>{count}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Single column tasks */}
                <div className="space-y-3">
                  {filtered.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-xl">لا توجد مهام</div>
                  ) : filtered.map(t=>(
                    <TaskCard key={t.id} task={t} canManage={isManager}
                      onEdit={handleEdit} onDelete={handleDelete} onStatus={handleStatus}/>
                  ))}
                </div>
              </div>

              {/* Desktop: 4-column grid */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[200px]">
                {[
                  { key:"pending",     ...STATUS_CFG.pending },
                  { key:"in_progress", ...STATUS_CFG.in_progress },
                  { key:"done",        ...STATUS_CFG.done },
                  { key:"overdue",     ...STATUS_CFG.overdue },
                ].map(col => {
                  const colTasks = filtered.filter(t => t.status === col.key);
                  return (
                    <div key={col.key} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border font-medium text-sm"
                        style={{ backgroundColor: col.bg, borderColor: col.border, color: col.color }}>
                        <col.Icon className="w-4 h-4"/>
                        <span>{col.label}</span>
                        <span className="mr-auto font-bold text-xs px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: col.color+"20", color: col.color }}>{colTasks.length}</span>
                      </div>
                      <div className="space-y-2 flex-1">
                        {colTasks.length === 0 ? (
                          <div className="text-center py-6 text-xs text-muted-foreground border-2 border-dashed rounded-xl">لا توجد مهام</div>
                        ) : colTasks.map(t=>(
                          <TaskCard key={t.id} task={t} canManage={isManager}
                            onEdit={handleEdit} onDelete={handleDelete} onStatus={handleStatus}/>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* ── LIST: بطاقات على الجوال، جدول على سطح المكتب ── */
            <>
              {/* Mobile: card list */}
              <div className="sm:hidden space-y-3">
                {filtered.map(t=>(
                  <div key={t.id} className="bg-white rounded-xl border shadow-sm p-3.5 space-y-2.5"
                    style={{ borderLeftWidth:"3px", borderLeftColor: PRIORITY_CFG[t.priority]?.color||"#6b7280" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-cairo font-bold text-sm">{t.title}</p>
                        {t.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>}
                      </div>
                      {isManager && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"><ChevronDown className="w-4 h-4 text-slate-400"/></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" dir="rtl" className="font-cairo w-44">
                            <DropdownMenuItem onClick={()=>handleEdit(t)}><Edit className="w-3.5 h-3.5 ml-2"/>تعديل</DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            {Object.entries(STATUS_CFG).filter(([k])=>k!=="overdue").map(([k,v])=>(
                              <DropdownMenuItem key={k} onClick={()=>handleStatus(t.id,k)} disabled={t.status===k}>
                                {(()=>{const C=STATUS_CFG[k];return <C.Icon className="w-3.5 h-3.5 ml-2"/>;})()}{v.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem onClick={()=>handleDelete(t.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5 ml-2"/>حذف</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <PriorityBadge priority={t.priority}/>
                      <StatusBadge status={t.status}/>
                      <PerformanceBadge performance={t.completion_performance} delta={t.completion_delta_minutes}/>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <AssigneeAvatars assignees={t.assignees_info||[]}/>
                        <span className="text-[10px] text-muted-foreground">{(t.assignees_info||[]).map(a=>a.name).join("، ")}</span>
                      </div>
                      {!isManager && t.status!=="done" && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]"
                          onClick={()=>handleStatus(t.id,t.status==="pending"?"in_progress":"done")}>
                          {t.status==="pending"?"بدء":"إنهاء"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: full table */}
              <Card className="hidden sm:block">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-right">المهمة</TableHead>
                          <TableHead className="text-center">الأولوية</TableHead>
                          <TableHead className="text-center">الحالة</TableHead>
                          <TableHead className="text-center">الموظفون</TableHead>
                          <TableHead className="text-center">الأداء</TableHead>
                          <TableHead className="text-center">بواسطة</TableHead>
                          {isManager && <TableHead className="text-center w-20">⋯</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(t=>(
                          <TableRow key={t.id} className="hover:bg-muted/30" data-testid={`task-row-${t.id}`}>
                            <TableCell className="text-right">
                              <p className="font-semibold text-sm">{t.title}</p>
                              {t.description && <p className="text-[11px] text-muted-foreground line-clamp-1">{t.description}</p>}
                            </TableCell>
                            <TableCell className="text-center"><PriorityBadge priority={t.priority}/></TableCell>
                            <TableCell className="text-center"><StatusBadge status={t.status}/></TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <AssigneeAvatars assignees={t.assignees_info||[]}/>
                                <span className="text-[9px] text-muted-foreground">{(t.assignees_info||[]).map(a=>a.name).join("، ")}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <PerformanceBadge performance={t.completion_performance} delta={t.completion_delta_minutes}/>
                            </TableCell>
                            <TableCell className="text-center text-[11px] text-muted-foreground">{t.created_by}</TableCell>
                            {isManager && (
                              <TableCell className="text-center">
                                <div className="flex items-center gap-1 justify-center">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>handleEdit(t)}><Edit className="w-3.5 h-3.5"/></Button>
                                  <Select value={t.status} onValueChange={v=>handleStatus(t.id,v)}>
                                    <SelectTrigger className="h-7 w-7 border-0 p-0 bg-transparent"><ChevronDown className="w-3.5 h-3.5 text-slate-400"/></SelectTrigger>
                                    <SelectContent dir="rtl">
                                      {Object.entries(STATUS_CFG).filter(([k])=>k!=="overdue").map(([k,v])=>(
                                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={()=>handleDelete(t.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
                                </div>
                              </TableCell>
                            )}
                            {!isManager && t.status!=="done" && (
                              <TableCell className="text-center">
                                <Button size="sm" variant="outline" className="h-7 text-[11px]"
                                  onClick={()=>handleStatus(t.id,t.status==="pending"?"in_progress":"done")}>
                                  {t.status==="pending"?"بدء":"إنهاء"}
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: CALENDAR
      ══════════════════════════════════════════════════════ */}
      {view === "calendar" && (
        <div className="space-y-4">
          {/* Month navigator */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={()=>{ const [y,m]=currentMonth.split("-").map(Number); const d=new Date(y,m-2,1); setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`); }}
                  className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">
                  <ChevronRight className="w-4 h-4 text-muted-foreground"/>
                </button>
                <div className="text-center">
                  <p className="font-cairo font-bold text-base">{monthLabel(currentMonth)}</p>
                  {monthTotal > 0 && (
                    <div className="flex items-center gap-2 justify-center mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{monthTotal} مهمة</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${monthPct>=80?"bg-emerald-100 text-emerald-700":monthPct>=50?"bg-amber-100 text-amber-700":"bg-red-100 text-red-600"}`}>
                        {monthPct}% إنجاز
                      </span>
                    </div>
                  )}
                </div>
                <button onClick={()=>{ const [y,m]=currentMonth.split("-").map(Number); const d=new Date(y,m,1); setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`); }}
                  className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-muted-foreground"/>
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"].map(d=>(
                  <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              {calLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary"/></div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {calGrid.map((date, i) => date ? (
                    <CalendarCell key={i} date={date} data={monthData[date]}
                      isSelected={date===selectedDate} isToday={date===today}
                      isFuture={isFuture(date)}
                      onClick={(d)=>{ setSelectedDate(d); setView("day"); }}
                      onAdd={isManager ? (d)=>{ setSelectedDate(d); setEditTask(null); setForm({...emptyForm,work_date:d}); setDialogOpen(true); } : null}/>
                  ) : <div key={i}/>)}
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t flex-wrap">
                {Object.entries(DAY_STATUS_CFG).map(([k,v])=>(
                  <div key={k} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: v.dot }}/>
                    <span className="text-[9px] text-muted-foreground">{v.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: ARCHIVE
      ══════════════════════════════════════════════════════ */}
      {view === "archive" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Archive className="w-4 h-4"/>
            <span>أرشيف المهام حسب الشهر — اضغط لعرض التفاصيل</span>
          </div>
          {archiveData.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="text-5xl">🗄️</div>
              <p className="font-cairo font-bold text-muted-foreground">لا يوجد أرشيف بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {archiveData.map(m => {
                const isPerfect = m.pct === 100;
                const isGood    = m.pct >= 70;
                return (
                  <button key={m.month} onClick={()=>{ setCurrentMonth(m.month); setView("calendar"); }}
                    className="w-full text-right p-4 rounded-xl border bg-card hover:shadow-md transition-all hover:border-primary/30 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl
                          ${isPerfect?"bg-amber-100":isGood?"bg-emerald-100":"bg-slate-100"}`}>
                          {isPerfect?"🏆":isGood?"✅":"📋"}
                        </div>
                        <div>
                          <p className="font-cairo font-bold text-sm">{monthLabel(m.month)}</p>
                          <p className="text-[10px] text-muted-foreground">{m.total} مهمة إجمالاً</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <p className={`text-xl font-black ${isPerfect?"text-amber-600":isGood?"text-emerald-600":"text-slate-600"}`}>{m.pct}%</p>
                          <p className="text-[10px] text-muted-foreground">{m.done}/{m.total} منجزة</p>
                        </div>
                        <div className="space-y-1">
                          {m.early > 0 && <span className="block text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">⭐ {m.early} مبكر</span>}
                          {m.overdue > 0 && <span className="block text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">⚠️ {m.overdue} متأخرة</span>}
                        </div>
                        <ChevronLeft className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"/>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width:`${m.pct}%`, background: isPerfect?"#f59e0b":isGood?"#10b981":"#6b7280" }}/>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Task Dialog ───────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={v=>{ setDialogOpen(v); if(!v){setEditTask(null);setForm({...emptyForm,work_date:selectedDate});} }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto font-cairo" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo text-lg flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary"/>
              {editTask ? "تعديل المهمة" : "إنشاء مهمة جديدة"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">

            {/* Work Date */}
            <div>
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary"/>
                تاريخ المهمة
              </Label>
              <Input type="date" value={form.work_date}
                onChange={e=>setForm({...form,work_date:e.target.value})}
                className="mt-1 h-9" dir="ltr"
                data-testid="task-work-date-input"/>
              {form.work_date && form.work_date !== today && (
                <p className="text-[10px] text-primary mt-0.5 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3"/>
                  {isFuture(form.work_date) ? "📅 تخطيط مسبق" : "📂 مهمة لتاريخ سابق"}
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <Label className="text-sm font-semibold">عنوان المهمة *</Label>
              <Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
                required className="mt-1" placeholder="مثال: جولة تفتيشية على البوابات"
                data-testid="task-title-input"/>
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm font-semibold">التفاصيل (اختياري)</Label>
              <Textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
                className="mt-1 resize-none" rows={2} placeholder="وصف تفصيلي..." data-testid="task-desc-input"/>
            </div>

            {/* Priority + Due */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">الأولوية</Label>
                <Select value={form.priority} onValueChange={v=>setForm({...form,priority:v})}>
                  <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent dir="rtl">
                    {Object.entries(PRIORITY_CFG).map(([k,v])=>(
                      <SelectItem key={k} value={k}><div className="flex items-center gap-2"><v.Icon className="w-3.5 h-3.5" style={{color:v.color}}/>{v.label}</div></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">الموعد النهائي</Label>
                <Input type="datetime-local" value={form.due_at} onChange={e=>setForm({...form,due_at:e.target.value})}
                  className="mt-1 text-sm" dir="ltr" data-testid="task-due-input"/>
              </div>
            </div>

            {/* Assignees */}
            <div>
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary"/>
                الموظفون المكلفون *
                {form.assignee_ids.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{form.assignee_ids.length} محدد</span>
                )}
              </Label>
              {scheduleStatus === "draft" && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0"/>الجدول مسودة — أيام الراحة مؤقتة
                </div>
              )}
              {!scheduleStatus && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0"/>لا يوجد جدول — جميع الموظفين متاحون
                </div>
              )}
              {isManager && sortedEmployees.some(e=>e.dutyStatus==="rest") && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer select-none"
                    style={emergencyOverride?{backgroundColor:"#fef2f2",borderColor:"#fca5a5",color:"#dc2626"}:{backgroundColor:"#f8fafc",borderColor:"#e2e8f0",color:"#64748b"}}
                    onMouseDown={e=>{e.preventDefault();e.stopPropagation();}}
                    onClick={e=>{e.preventDefault();e.stopPropagation();setEmergencyOverride(!emergencyOverride);if(emergencyOverride)setEmergencyReason("");}}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${emergencyOverride?"bg-red-500 border-red-500":"border-slate-300 bg-white"}`}>
                      {emergencyOverride&&<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <span className="text-[10px] font-semibold">🚨 تجاوز طارئ — تكليف موظف في راحة</span>
                  </div>
                  {emergencyOverride && (
                    <input value={emergencyReason} onChange={e=>setEmergencyReason(e.target.value)}
                      className="w-full h-8 px-3 text-xs rounded-lg border border-red-300 focus:outline-none focus:ring-1 focus:ring-red-200"
                      placeholder="سبب الطوارئ (مطلوب)..."/>
                  )}
                </div>
              )}
              <div className="mt-2 border rounded-xl overflow-hidden">
                {employees.length === 0 ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">لا يوجد موظفون</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y">
                    {activeSchedule && sortedEmployees.some(e=>e.dutyStatus==="on_duty_now"||e.dutyStatus==="working"||e.dutyStatus==="no_schedule") && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 cursor-pointer select-none"
                        onMouseDown={e=>{e.preventDefault();e.stopPropagation();}}
                        onClick={e=>{e.preventDefault();e.stopPropagation();const ids=sortedEmployees.filter(e=>e.dutyStatus!=="rest").map(e=>e.id);setForm(f=>({...f,assignee_ids:ids.every(id=>f.assignee_ids.includes(id))?[]:ids}));}}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${sortedEmployees.filter(e=>e.dutyStatus!=="rest").every(e=>form.assignee_ids.includes(e.id))&&sortedEmployees.filter(e=>e.dutyStatus!=="rest").length>0?"bg-emerald-600 border-emerald-600":"border-slate-300 bg-white"}`}>
                          {sortedEmployees.filter(e=>e.dutyStatus!=="rest").every(e=>form.assignee_ids.includes(e.id))&&sortedEmployees.filter(e=>e.dutyStatus!=="rest").length>0&&<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                        </div>
                        <span className="text-xs font-semibold text-emerald-700">تحديد المتاحين</span>
                        <span className="text-[10px] text-emerald-600 mr-auto">{sortedEmployees.filter(e=>e.dutyStatus!=="rest").length} متاح</span>
                      </div>
                    )}
                    {sortedEmployees.map(emp=>{
                      const isSelected=form.assignee_ids.includes(emp.id);
                      const isRest=emp.dutyStatus==="rest";
                      const canSelect=!isRest||(isRest&&emergencyOverride);
                      const SL={"on_duty_now":{text:"مداوم الآن",cls:"bg-emerald-100 text-emerald-700"},"working":{text:"مداوم",cls:"bg-emerald-100 text-emerald-700"},"off_shift":{text:"خارج الوردية",cls:"bg-yellow-100 text-yellow-700"},"rest":{text:"في راحة",cls:"bg-amber-100 text-amber-700"}};
                      const sl=SL[emp.dutyStatus];
                      return (
                        <div key={emp.id}
                          className={`flex items-center gap-3 px-3 py-2.5 select-none transition-colors ${!canSelect?"opacity-40 bg-slate-50":"cursor-pointer hover:bg-muted/30"} ${isSelected?"bg-primary/5":""}`}
                          onMouseDown={e=>{e.preventDefault();e.stopPropagation();}}
                          onClick={e=>{e.preventDefault();e.stopPropagation();if(!canSelect)return;toggleAssignee(emp.id);}}
                          data-testid={`assignee-${emp.id}`}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected?(isRest&&emergencyOverride?"bg-red-500 border-red-500":"bg-primary border-primary"):!canSelect?"border-slate-200 bg-slate-100":"border-slate-300 bg-white"}`}>
                            {isSelected&&<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isRest?"bg-slate-200 text-slate-400":"bg-primary/15 text-primary"}`}>{emp.name.charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${!canSelect?"text-slate-400":""}`}>{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{emp.job_title}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {sl&&<span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sl.cls}`}>{sl.text}</span>}
                            {isRest&&!emergencyOverride&&<span>🚫</span>}
                            {isRest&&emergencyOverride&&<span>🚨</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={()=>setDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={submitting||(emergencyOverride&&!emergencyReason.trim())} className="gap-1.5 bg-primary" data-testid="submit-task-btn">
                {submitting?<Loader2 className="w-4 h-4 animate-spin"/>:<Plus className="w-4 h-4"/>}
                {editTask?"حفظ التعديل":"إنشاء المهمة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
