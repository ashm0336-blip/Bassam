import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  Plus, LayoutGrid, List, Clock, CheckCircle2, Loader2, Trash2,
  Edit, AlertTriangle, ChevronDown, Users, Zap, Calendar,
  ArrowUpRight, CircleDot, Tag, RefreshCw, Filter, Search,
  Flame, TimerOff, Timer, AlarmClock, Star, Trophy, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── Config ────────────────────────────────────────────────────
const PRIORITY_CFG = {
  low:    { label: "منخفض",  color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1", Icon: ArrowUpRight },
  normal: { label: "عادي",   color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", Icon: CircleDot },
  high:   { label: "مرتفع",  color: "#d97706", bg: "#fffbeb", border: "#fcd34d", Icon: Zap },
  urgent: { label: "عاجل",   color: "#dc2626", bg: "#fef2f2", border: "#fecaca", Icon: AlertTriangle },
};

const STATUS_CFG = {
  pending:     { label: "قيد الانتظار", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", Icon: Clock },
  in_progress: { label: "جارية",        color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", Icon: Loader2 },
  done:        { label: "مكتملة",       color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", Icon: CheckCircle2 },
  overdue:     { label: "متأخرة",       color: "#dc2626", bg: "#fef2f2", border: "#fecaca", Icon: AlertTriangle },
};

const KANBAN_COLUMNS = [
  { key: "pending",     ...STATUS_CFG.pending },
  { key: "in_progress", ...STATUS_CFG.in_progress },
  { key: "done",        ...STATUS_CFG.done },
  { key: "overdue",     ...STATUS_CFG.overdue },
];

// ── Sub-components ────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG.normal;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function AssigneeAvatars({ assignees, max = 3 }) {
  const shown = assignees.slice(0, max);
  const rest = assignees.length - max;
  return (
    <div className="flex items-center -space-x-1 rtl:space-x-reverse">
      {shown.map((a, i) => (
        <div key={i} title={a.name}
          className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold border-2 border-white shadow-sm">
          {a.name?.charAt(0) || "؟"}
        </div>
      ))}
      {rest > 0 && (
        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[9px] font-bold border-2 border-white">
          +{rest}
        </div>
      )}
    </div>
  );
}

// ── Time Status Config ────────────────────────────────────────
const TIME_STATUS_CFG = {
  overdue:  { label: "متأخرة!",         bg: "bg-red-100",    text: "text-red-700",    border: "border-red-300",    Icon: TimerOff,    pulse: true  },
  critical: { label: "أقل من ساعة",     bg: "bg-red-50",     text: "text-red-600",    border: "border-red-200",    Icon: Flame,       pulse: true  },
  warning:  { label: "قريب",            bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200",  Icon: AlarmClock,  pulse: false },
  soon:     { label: "اليوم",           bg: "bg-yellow-50",  text: "text-yellow-700", border: "border-yellow-200", Icon: Timer,       pulse: false },
  normal:   { label: "",                bg: "bg-slate-50",   text: "text-slate-500",  border: "border-slate-200",  Icon: Calendar,    pulse: false },
  none:     { label: "",                bg: "",              text: "",                border: "",                  Icon: null,        pulse: false },
};

function formatRemaining(minutes) {
  if (minutes === null || minutes === undefined) return "";
  const abs = Math.abs(minutes);
  if (abs < 60) return `${abs} د`;
  if (abs < 1440) return `${Math.floor(abs / 60)} س ${abs % 60 > 0 ? `${abs % 60}د` : ""}`;
  return `${Math.floor(abs / 1440)} يوم`;
}

function DueBadge({ dueAt, timeStatus, remainingMinutes }) {
  if (!dueAt) return null;
  const cfg = TIME_STATUS_CFG[timeStatus] || TIME_STATUS_CFG.normal;
  if (!cfg.Icon) return null;

  const isLate = timeStatus === "overdue";
  const abs = Math.abs(remainingMinutes || 0);
  const label = isLate
    ? `تأخر ${formatRemaining(abs)}`
    : timeStatus === "normal"
    ? formatRemaining(remainingMinutes)
    : cfg.label;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border
      ${cfg.bg} ${cfg.text} ${cfg.border}
      ${cfg.pulse ? "animate-pulse" : ""}`}>
      <cfg.Icon className="w-3 h-3 flex-shrink-0" />
      {label}
    </span>
  );
}

// ── Performance Badge (للمهام المكتملة) ─────────────────────────
const PERF_CFG = {
  early:   { label: "مبكر", Icon: Star,        cls: "bg-amber-50 text-amber-700 border-amber-300",  glow: "shadow-amber-200" },
  on_time: { label: "في الوقت", Icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-300", glow: "" },
  late:    { label: "متأخر",   Icon: TimerOff,  cls: "bg-red-50 text-red-600 border-red-200",        glow: "" },
  no_due:  { label: "منجزة",   Icon: CheckCircle2, cls: "bg-slate-50 text-slate-500 border-slate-200", glow: "" },
};

function formatDelta(mins) {
  if (!mins) return "";
  const abs = Math.abs(mins);
  if (abs < 60) return `${abs} د`;
  const h = Math.floor(abs / 60), m = abs % 60;
  return m > 0 ? `${h}س ${m}د` : `${h} ساعة`;
}

function PerformanceBadge({ performance, deltaMinutes }) {
  if (!performance || performance === "no_due") return null;
  const cfg = PERF_CFG[performance] || PERF_CFG.no_due;
  const delta = deltaMinutes ? formatDelta(deltaMinutes) : "";
  const label = performance === "early"
    ? `مبكر ${delta ? `بـ ${delta}` : ""}`
    : performance === "late"
    ? `تأخر ${delta}`
    : "في الوقت";

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border shadow-sm
      ${cfg.cls} ${cfg.glow}`}>
      <cfg.Icon className="w-3 h-3 flex-shrink-0" />
      {label}
    </span>
  );
}

// ── Kanban Card ───────────────────────────────────────────────
function KanbanCard({ task, canManage, onEdit, onDelete, onStatusChange, isAr }) {
  const pri = PRIORITY_CFG[task.priority] || PRIORITY_CFG.normal;
  return (
    <div className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 p-3 space-y-2.5 cursor-default"
      style={{ borderLeftWidth: "3px", borderLeftColor: pri.color }}
      data-testid={`task-card-${task.id}`}>

      {/* Header: priority + actions */}
      <div className="flex items-start justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-slate-100">
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" dir="rtl" className="font-cairo w-44">
              <DropdownMenuItem onClick={() => onEdit(task)}><Edit className="w-3.5 h-3.5 ml-2" />تعديل</DropdownMenuItem>
              <DropdownMenuSeparator />
              {["pending", "in_progress", "done"].map(s => (
                <DropdownMenuItem key={s} onClick={() => onStatusChange(task.id, s)}
                  disabled={task.status === s}
                  className={task.status === s ? "opacity-50" : ""}>
                  {(() => { const SCfg = STATUS_CFG[s]; return <SCfg.Icon className="w-3.5 h-3.5 ml-2" />; })()}
                  {STATUS_CFG[s].label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="w-3.5 h-3.5 ml-2" />حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {/* زر تحديث للموظف */}
        {!canManage && task.status !== "done" && (
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
            onClick={() => onStatusChange(task.id, task.status === "pending" ? "in_progress" : "done")}>
            {task.status === "pending" ? "بدء" : "إنهاء"}
          </Button>
        )}
      </div>

      {/* Title */}
      <p className="font-cairo font-semibold text-sm text-foreground leading-snug">{task.title}</p>

      {/* Description */}
      {task.description && (
        <p className="text-[11px] text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      {/* مؤشر أداء الإنجاز — للمهام المكتملة فقط */}
      {task.status === "done" && task.completion_performance && (
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border
          ${task.completion_performance === "early"
            ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
            : task.completion_performance === "late"
            ? "bg-red-50 border-red-200"
            : "bg-emerald-50 border-emerald-200"}`}>
          <PerformanceBadge
            performance={task.completion_performance}
            deltaMinutes={task.completion_delta_minutes}
          />
          {task.completion_performance === "early" && (
            <span className="text-[9px] text-amber-600 font-medium">أداء متميز ⭐</span>
          )}
        </div>
      )}

      {/* Time Progress Bar — مؤشر بصري للوقت المتبقي */}
      {task.due_at && task.time_status && task.time_status !== "none" && task.status !== "done" && (() => {
        const cfg = TIME_STATUS_CFG[task.time_status] || TIME_STATUS_CFG.normal;
        const barColors = { overdue:"bg-red-500", critical:"bg-red-400", warning:"bg-amber-400", soon:"bg-yellow-400", normal:"bg-emerald-400" };
        const barWidth = { overdue:"w-full", critical:"w-[10%]", warning:"w-[25%]", soon:"w-[50%]", normal:"w-[85%]" };
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold flex items-center gap-1 ${cfg.text}`}>
                <cfg.Icon className={`w-3 h-3 ${cfg.pulse ? "animate-pulse" : ""}`} />
                {task.time_status === "overdue"
                  ? `تأخر ${formatRemaining(Math.abs(task.remaining_minutes || 0))}`
                  : `متبقي ${formatRemaining(task.remaining_minutes || 0)}`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColors[task.time_status] || "bg-emerald-400"} ${barWidth[task.time_status] || "w-full"}`} />
            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <AssigneeAvatars assignees={task.assignees_info || []} />
        <div className="flex items-center gap-1">
          <DueBadge dueAt={task.due_at} timeStatus={task.time_status} remainingMinutes={task.remaining_minutes} />
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground">بواسطة: {task.created_by}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function TasksPage({ department }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === "ar";
  const isManager = ["system_admin", "general_manager", "department_manager"].includes(user?.role);

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [employees, setEmployees] = useState([]);  // كل موظفي الإدارة
  const [activeSchedule, setActiveSchedule] = useState(null); // الجدول المعتمد
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("kanban"); // kanban | list
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const emptyForm = { title: "", description: "", priority: "normal", due_at: "", assignee_ids: [] };
  const [form, setForm] = useState(emptyForm);

  const dept = department || user?.department;
  const token = () => localStorage.getItem("token");

  // ── Fetch ──────────────────────────────────────────────────
  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        axios.get(`${API}/tasks?department=${dept}`, { headers: { Authorization: `Bearer ${token()}` } }),
        axios.get(`${API}/tasks/stats?department=${dept}`, { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      setTasks(tRes.data);
      setStats(sRes.data);
    } catch { toast.error("فشل في جلب المهام"); }
    finally { setLoading(false); }
  }, [dept]);

  const fetchEmployees = useCallback(async () => {
    if (!isManager) return;
    try {
      const currentMonth = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Riyadh"
      }).slice(0, 7); // yyyy-MM بتوقيت السعودية
      const [empRes, schedRes] = await Promise.all([
        axios.get(`${API}/employees?department=${dept}`, {
          headers: { Authorization: `Bearer ${token()}` }
        }),
        axios.get(`${API}/schedules/${dept}/${currentMonth}`, {
          headers: { Authorization: `Bearer ${token()}` }
        }).catch(() => ({ data: null })),
      ]);
      setEmployees(empRes.data);
      const sched = schedRes.data;
      // نستخدم أي جدول (مسودة أو معتمد) لمعرفة أيام الراحة في التكليف
      // الاعتماد يؤثر على الإحصائيات الرسمية فقط، لكن التشغيل اليومي يبقى واضح
      setActiveSchedule(sched || null);
    } catch { }
  }, [dept, isManager]);

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
    const interval = setInterval(() => fetchTasks(true), 30000);
    return () => clearInterval(interval);
  }, [fetchTasks, fetchEmployees]);

  // ── تصنيف الموظفين: مداوم / في راحة / غير محدد ──────────────
  const todayAr = (() => {
    const map = { Saturday:"السبت", Sunday:"الأحد", Monday:"الإثنين", Tuesday:"الثلاثاء",
                  Wednesday:"الأربعاء", Thursday:"الخميس", Friday:"الجمعة" };
    return map[new Date().toLocaleDateString("en-US", { weekday:"long", timeZone:"Asia/Riyadh" })] || "";
  })();

  const scheduleStatus = activeSchedule?.status || null; // "active" | "draft" | null

  const enrichedEmployees = employees.map(emp => {
    if (!activeSchedule) return { ...emp, dutyStatus: "no_schedule" };
    const assignment = activeSchedule.assignments?.find(a => a.employee_id === emp.id);
    if (!assignment) return { ...emp, dutyStatus: "no_schedule" };
    const onRest = (assignment.rest_days || []).includes(todayAr);
    return { ...emp, dutyStatus: onRest ? "rest" : "working" };
  });

  // الأولوية: مداومون أولاً، ثم غير محدد، ثم في راحة
  const sortedEmployees = [
    ...enrichedEmployees.filter(e => e.dutyStatus === "working"),
    ...enrichedEmployees.filter(e => e.dutyStatus === "no_schedule"),
    ...enrichedEmployees.filter(e => e.dutyStatus === "rest"),
  ];

  // ── Filtered tasks ─────────────────────────────────────────
  const filtered = tasks.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (search && !t.title.includes(search) && !t.description?.includes(search)) return false;
    return true;
  });

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("عنوان المهمة مطلوب");
    if (form.assignee_ids.length === 0) return toast.error("يجب اختيار موظف واحد على الأقل");
    setSubmitting(true);
    try {
      // تحويل التاريخ من datetime-local إلى ISO UTC
      // نضيف +03:00 صراحةً حتى المتصفح يعرف إنها SA، ثم يحوّلها لـ UTC تلقائياً
      let dueIso = null;
      if (form.due_at) {
        try {
          dueIso = new Date(form.due_at + ":00+03:00").toISOString();
        } catch { dueIso = null; }
      }
      const payload = { ...form, department: dept, due_at: dueIso };
      if (editTask) {
        await axios.put(`${API}/tasks/${editTask.id}`, payload, { headers: { Authorization: `Bearer ${token()}` } });
        toast.success("تم تحديث المهمة ✅");
      } else {
        await axios.post(`${API}/tasks`, payload, { headers: { Authorization: `Bearer ${token()}` } });
        toast.success(`✅ تم إنشاء المهمة وتنبيه ${form.assignee_ids.length} موظف`);
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditTask(null);
      fetchTasks();
    } catch (err) { toast.error(err.response?.data?.detail || "فشل الحفظ"); }
    finally { setSubmitting(false); }
  };

  const handleEdit = (task) => {
    setEditTask(task);
    // تحويل due_at إلى صيغة datetime-local (yyyy-MM-ddTHH:mm) بتوقيت السعودية
    let dueLocal = "";
    if (task.due_at) {
      try {
        const dt = new Date(task.due_at);
        // تحويل لتوقيت السعودية UTC+3
        const sa = new Date(dt.getTime() + 3 * 60 * 60 * 1000);
        dueLocal = sa.toISOString().slice(0, 16);
      } catch { dueLocal = ""; }
    }
    setForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      due_at: dueLocal,
      assignee_ids: task.assignee_ids || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (taskId) => {
    if (!confirm("هل أنت متأكد من حذف المهمة؟")) return;
    try {
      await axios.delete(`${API}/tasks/${taskId}`, { headers: { Authorization: `Bearer ${token()}` } });
      toast.success("تم حذف المهمة");
      fetchTasks();
    } catch { toast.error("فشل الحذف"); }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await axios.put(`${API}/tasks/${taskId}/status`, { status }, { headers: { Authorization: `Bearer ${token()}` } });
      toast.success(`تم تحديث الحالة إلى: ${STATUS_CFG[status]?.label}`);
      fetchTasks();
    } catch (err) { toast.error(err.response?.data?.detail || "فشل التحديث"); }
  };

  const toggleAssignee = (empId) => {
    setForm(f => ({
      ...f,
      assignee_ids: f.assignee_ids.includes(empId)
        ? f.assignee_ids.filter(id => id !== empId)
        : [...f.assignee_ids, empId],
    }));
  };

  // ── Stats Row ──────────────────────────────────────────────
  const STATS = [
    { label: "الكل",       value: (stats.pending||0) + (stats.in_progress||0) + (stats.overdue||0), color: "#6b7280",                       key: "all" },
    { label: "انتظار",     value: stats.pending     || 0, color: STATUS_CFG.pending.color,                                                   key: "pending" },
    { label: "جارية",      value: stats.in_progress || 0, color: STATUS_CFG.in_progress.color,                                              key: "in_progress" },
    { label: "مكتملة",     value: stats.done        || 0, color: STATUS_CFG.done.color,                                                     key: "done" },
    { label: "متأخرة",     value: stats.overdue     || 0, color: STATUS_CFG.overdue.color,                                                  key: "overdue" },
  ];

  // ── إحصائيات الأداء (تظهر فقط إذا يوجد مهام مكتملة بموعد) ───
  const PERF_STATS = stats.done > 0 && (stats.early || stats.on_time || stats.late_done) ? [
    { label: "مبكر ⭐",   value: stats.early    || 0, color: "#d97706", bg: "bg-amber-50",   border: "border-amber-200" },
    { label: "في الوقت ✅", value: stats.on_time  || 0, color: "#059669", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "متأخر ⚠️",   value: stats.late_done|| 0, color: "#dc2626", bg: "bg-red-50",     border: "border-red-200" },
  ] : [];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-4 font-cairo" data-testid="tasks-page">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-cairo font-bold text-lg flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            المهام اليومية
          </h2>
          <p className="text-xs text-muted-foreground">
            {isManager ? "إدارة وتكليف المهام لموظفي الإدارة" : "مهامك المكلف بها"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchTasks()}
            className="gap-1.5 text-xs h-8" data-testid="refresh-tasks">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          {/* Toggle View */}
          <div className="flex border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors
                ${viewMode === "kanban" ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
              data-testid="view-kanban">
              <LayoutGrid className="w-3.5 h-3.5" /> لوحة
            </button>
            <button onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors
                ${viewMode === "list" ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"}`}
              data-testid="view-list">
              <List className="w-3.5 h-3.5" /> قائمة
            </button>
          </div>
          {isManager && (
            <Button size="sm" className="gap-1.5 bg-primary h-8" onClick={() => { setEditTask(null); setForm(emptyForm); setDialogOpen(true); }}
              data-testid="create-task-btn">
              <Plus className="w-4 h-4" /> مهمة جديدة
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {STATS.map(s => (
          <button key={s.key}
            onClick={() => setFilterStatus(s.key === filterStatus ? "all" : s.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
              ${filterStatus === s.key ? "shadow-md scale-105" : "hover:shadow-sm"}`}
            style={filterStatus === s.key
              ? { backgroundColor: s.color + "15", borderColor: s.color, color: s.color }
              : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", color: "#64748b" }}>
            <span className="font-bold text-base" style={{ color: s.color }}>{s.value}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── إحصائيات الأداء (تظهر فقط عند وجود مهام مكتملة بموعد) ── */}
      {PERF_STATS.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl border bg-gradient-to-r from-slate-50 to-white">
          <TrendingUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-[11px] text-slate-500 font-medium ml-1">تقييم الأداء:</span>
          {PERF_STATS.map((p, i) => (
            <span key={i} className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${p.bg} ${p.border}`}
              style={{ color: p.color }}>
              <span className="font-black text-sm">{p.value}</span>
              {p.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            className="h-8 text-sm pr-9" placeholder="بحث في المهام..." />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <Filter className="w-3 h-3 ml-1" /><SelectValue placeholder="الأولوية" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">كل الأولويات</SelectItem>
            {Object.entries(PRIORITY_CFG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Kanban View ───────────────────────────────────── */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 min-h-[400px]" data-testid="kanban-board">
          {KANBAN_COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="flex flex-col gap-3">
                {/* Column Header */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border font-medium text-sm"
                  style={{ backgroundColor: col.bg, borderColor: col.border, color: col.color }}>
                  <col.Icon className="w-4 h-4" />
                  <span>{col.label}</span>
                  <span className="mr-auto font-bold text-xs px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: col.color + "20", color: col.color }}>
                    {colTasks.length}
                  </span>
                </div>
                {/* Tasks */}
                <div className="space-y-2 flex-1">
                  {colTasks.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-xl">
                      لا توجد مهام
                    </div>
                  )}
                  {colTasks.map(t => (
                    <KanbanCard key={t.id} task={t} canManage={isManager}
                      onEdit={handleEdit} onDelete={handleDelete}
                      onStatusChange={handleStatusChange} isAr={isAr} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── List View ─────────────────────────────────────── */}
      {viewMode === "list" && (
        <Card data-testid="tasks-list">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-right">المهمة</TableHead>
                    <TableHead className="text-center">الأولوية</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center">الموظفون</TableHead>
                    <TableHead className="text-center">الموعد</TableHead>
                    <TableHead className="text-center">بواسطة</TableHead>
                    {isManager && <TableHead className="text-center w-20">إجراء</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Tag className="w-8 h-8 opacity-30" />
                          <p>لا توجد مهام حالياً</p>
                          {isManager && <Button size="sm" onClick={() => { setEditTask(null); setForm(emptyForm); setDialogOpen(true); }} className="mt-2 gap-1"><Plus className="w-3.5 h-3.5"/>أنشئ مهمة</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map(t => (
                    <TableRow key={t.id} className="hover:bg-muted/30" data-testid={`task-row-${t.id}`}>
                      <TableCell className="text-right">
                        <p className="font-semibold text-sm">{t.title}</p>
                        {t.description && <p className="text-[11px] text-muted-foreground line-clamp-1">{t.description}</p>}
                      </TableCell>
                      <TableCell className="text-center"><PriorityBadge priority={t.priority} /></TableCell>
                      <TableCell className="text-center"><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <AssigneeAvatars assignees={t.assignees_info || []} />
                          <span className="text-[9px] text-muted-foreground">
                            {(t.assignees_info || []).map(a => a.name).join("، ")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <DueBadge dueAt={t.due_at} timeStatus={t.time_status} remainingMinutes={t.remaining_minutes} />
                          {t.status === "done" && t.completion_performance && (
                            <PerformanceBadge performance={t.completion_performance} deltaMinutes={t.completion_delta_minutes} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-[11px] text-muted-foreground">{t.created_by}</TableCell>
                      {isManager && (
                        <TableCell className="text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(t)}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Select value={t.status} onValueChange={v => handleStatusChange(t.id, v)}>
                              <SelectTrigger className="h-7 w-7 border-0 p-0 bg-transparent">
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              </SelectTrigger>
                              <SelectContent dir="rtl">
                                {Object.entries(STATUS_CFG).filter(([k]) => k !== "overdue").map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                      {/* زر تحديث للموظف */}
                      {!isManager && t.status !== "done" && (
                        <TableCell className="text-center">
                          <Button size="sm" variant="outline" className="h-7 text-[11px]"
                            onClick={() => handleStatusChange(t.id, t.status === "pending" ? "in_progress" : "done")}>
                            {t.status === "pending" ? "بدء" : "إنهاء"}
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
      )}

      {/* ── Task Dialog ───────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setEditTask(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto font-cairo" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo text-lg flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              {editTask ? "تعديل المهمة" : "إنشاء مهمة جديدة"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">

            {/* Title */}
            <div>
              <Label className="text-sm font-semibold">عنوان المهمة *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                required className="mt-1" placeholder="مثال: تفتيش بوابة الملك فهد"
                data-testid="task-title-input" />
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm font-semibold">التفاصيل (اختياري)</Label>
              <Textarea value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="mt-1 resize-none" rows={2}
                placeholder="وصف تفصيلي للمهمة..."
                data-testid="task-desc-input" />
            </div>

            {/* Priority + Due */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">الأولوية</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {Object.entries(PRIORITY_CFG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <div className="flex items-center gap-2">
                          <v.Icon className="w-3.5 h-3.5" style={{ color: v.color }} />
                          {v.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">الموعد النهائي</Label>
                <Input type="datetime-local" value={form.due_at}
                  onChange={e => setForm({ ...form, due_at: e.target.value })}
                  className="mt-1 text-sm" dir="ltr"
                  data-testid="task-due-input" />
              </div>
            </div>

            {/* Assignees — multi-select */}
            <div>
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                الموظفون المكلفون *
                {form.assignee_ids.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {form.assignee_ids.length} محدد
                  </span>
                )}
              </Label>
              {/* بادج حالة الجدول */}
              {scheduleStatus === "draft" && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  الجدول مسودة — أيام الراحة مؤقتة وقابلة للتغيير حتى الاعتماد
                </div>
              )}
              {!scheduleStatus && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  لا يوجد جدول شهري — جميع الموظفين متاحون
                </div>
              )}
              <div className="mt-2 border rounded-xl overflow-hidden">
                {employees.length === 0 ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">لا يوجد موظفون في هذه الإدارة</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto divide-y">
                    {/* Select All — المداومون فقط */}
                    {activeSchedule && (
                      <div
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 cursor-pointer select-none"
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={e => {
                          e.preventDefault(); e.stopPropagation();
                          const workingIds = sortedEmployees.filter(e => e.dutyStatus === "working").map(e => e.id);
                          setForm(f => ({
                            ...f,
                            assignee_ids: f.assignee_ids.length === workingIds.length && workingIds.every(id => f.assignee_ids.includes(id))
                              ? [] : workingIds
                          }));
                        }}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                          ${sortedEmployees.filter(e => e.dutyStatus === "working").every(e => form.assignee_ids.includes(e.id)) && sortedEmployees.filter(e => e.dutyStatus === "working").length > 0
                            ? "bg-emerald-600 border-emerald-600" : "border-slate-300 bg-white"}`}>
                          {sortedEmployees.filter(e => e.dutyStatus === "working").every(e => form.assignee_ids.includes(e.id)) && sortedEmployees.filter(e => e.dutyStatus === "working").length > 0
                            && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="text-xs font-semibold text-emerald-700">تحديد المداومين فقط</span>
                        <span className="text-[10px] text-emerald-600 mr-auto">
                          {sortedEmployees.filter(e => e.dutyStatus === "working").length} مداوم
                        </span>
                      </div>
                    )}

                    {sortedEmployees.map(emp => {
                      const isSelected = form.assignee_ids.includes(emp.id);
                      const isRest = emp.dutyStatus === "rest";
                      const statusLabel = emp.dutyStatus === "working"
                        ? { text: "مداوم", cls: "bg-emerald-100 text-emerald-700" }
                        : emp.dutyStatus === "rest"
                        ? { text: "في راحة", cls: "bg-amber-100 text-amber-700" }
                        : null;

                      return (
                        <div key={emp.id}
                          className={`flex items-center gap-3 px-3 py-2.5 select-none transition-colors
                            ${isRest ? "opacity-50 bg-slate-50" : "cursor-pointer hover:bg-muted/30"}
                            ${isSelected ? "bg-primary/5" : ""}`}
                          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={e => {
                            e.preventDefault(); e.stopPropagation();
                            if (isRest) return; // في الراحة لا يُكلَّف
                            toggleAssignee(emp.id);
                          }}
                          title={isRest ? "الموظف في راحة اليوم" : emp.name}
                          data-testid={`assignee-${emp.id}`}>

                          {/* Custom Checkbox */}
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                            ${isSelected ? "bg-primary border-primary" : isRest ? "border-slate-200 bg-slate-100" : "border-slate-300 bg-white"}`}>
                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>

                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                            ${isRest ? "bg-slate-200 text-slate-400" : "bg-primary/15 text-primary"}`}>
                            {emp.name.charAt(0)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isRest ? "text-slate-400" : ""}`}>{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{emp.job_title}</p>
                          </div>

                          {/* Status Badges */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {statusLabel && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusLabel.cls}`}>
                                {statusLabel.text}
                              </span>
                            )}
                            {isRest && <span title="في راحة — غير متاح للتكليف">🚫</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={submitting} className="gap-1.5 bg-primary" data-testid="submit-task-btn">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editTask ? "حفظ التعديل" : "إنشاء المهمة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
