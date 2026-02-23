import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
  Plus, Trash2, Save, X, Calendar as CalendarIcon, ChevronRight, ChevronLeft,
  Eye, Clock, FileText, CheckCircle2, AlertCircle, ArrowLeftRight,
  RefreshCw, Edit2, MessageSquare, Layers, ZoomIn, ZoomOut, Maximize2,
  RotateCcw, CircleDot, CircleOff, Tag, CalendarRange, DoorOpen, DoorClosed,
  Wrench, ArrowUpRight, ArrowDownRight, Users, FileStack, Database
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  open: { color: "#22c55e", label_ar: "مفتوح", label_en: "Open", icon: DoorOpen },
  closed: { color: "#ef4444", label_ar: "مغلق", label_en: "Closed", icon: DoorClosed },
  crowded: { color: "#f97316", label_ar: "مزدحم", label_en: "Crowded", icon: DoorOpen },
  maintenance: { color: "#6b7280", label_ar: "صيانة", label_en: "Maintenance", icon: Wrench },
};

const CLASSIFICATIONS = [
  { value: "general", label_ar: "عام", label_en: "General" },
  { value: "men", label_ar: "رجال", label_en: "Men" },
  { value: "women", label_ar: "نساء", label_en: "Women" },
  { value: "emergency", label_ar: "طوارئ", label_en: "Emergency" },
];

const DIRECTIONS = [
  { value: "entry", label_ar: "دخول", label_en: "Entry" },
  { value: "exit", label_ar: "خروج", label_en: "Exit" },
  { value: "both", label_ar: "دخول وخروج", label_en: "Both" },
];

const CHANGE_LABELS = {
  added: { ar: "مضاف", en: "Added", color: "#22c55e", bg: "#dcfce7" },
  removed: { ar: "تم الإزالة", en: "Removed", color: "#ef4444", bg: "#fef2f2" },
  modified: { ar: "معدّل", en: "Modified", color: "#f59e0b", bg: "#fefce8" },
  status_changed: { ar: "تغيير حالة", en: "Status Changed", color: "#8b5cf6", bg: "#f5f3ff" },
  unchanged: { ar: "بدون تغيير", en: "Unchanged", color: "#94a3b8", bg: "#f8fafc" },
};

const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const AR_WEEKDAYS = ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];

export default function DailyGateSessionsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState("map");
  const [selectedGate, setSelectedGate] = useState(null);
  const [showGateDialog, setShowGateDialog] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");

  const [newSessionDate, setNewSessionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [cloneSource, setCloneSource] = useState("auto");
  const [batchStartDate, setBatchStartDate] = useState("");
  const [batchEndDate, setBatchEndDate] = useState("");
  const [batchCloneSource, setBatchCloneSource] = useState("master");
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [filterStatus, setFilterStatus] = useState("all");

  // Map
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [imgRatio, setImgRatio] = useState(null);
  const [hoveredGate, setHoveredGate] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const mapContainerRef = useRef(null);

  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  const normalizeImageUrl = (url) => {
    if (!url) return url;
    let v = url;
    if (v.includes(".preview.emergentagent.com") && !v.startsWith(process.env.REACT_APP_BACKEND_URL)) {
      const m = v.match(/\/(?:api\/)?uploads\/.+$/);
      if (m) v = `${process.env.REACT_APP_BACKEND_URL}${m[0].startsWith("/api") ? m[0] : "/api" + m[0]}`;
    }
    if (v.startsWith("/")) v = `${process.env.REACT_APP_BACKEND_URL}${v}`;
    else if (v.startsWith("uploads/")) v = `${process.env.REACT_APP_BACKEND_URL}/${v}`;
    if (v.includes("/uploads/") && !v.includes("/api/uploads/")) v = v.replace("/uploads/", "/api/uploads/");
    return v;
  };

  const fetchFloors = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/gate-map/floors`);
      const n = res.data.map(f => ({ ...f, image_url: normalizeImageUrl(f.image_url) }));
      setFloors(n);
      n.forEach(f => { if (f.image_url) { const img = new Image(); img.src = f.image_url; } });
      if (!selectedFloor && n.length > 0) setSelectedFloor(n[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchSessions = useCallback(async () => {
    if (!selectedFloor) return;
    try {
      const res = await axios.get(`${API}/gate-sessions?floor_id=${selectedFloor.id}`);
      setSessions(res.data);
    } catch (e) { console.error(e); }
  }, [selectedFloor]);

  useEffect(() => { fetchFloors(); }, [fetchFloors]);
  useEffect(() => { if (selectedFloor) { fetchSessions(); setActiveSession(null); setImgRatio(null); } }, [selectedFloor, fetchSessions]);

  const sessionDatesMap = useMemo(() => { const m = {}; sessions.forEach(s => { m[s.date] = s; }); return m; }, [sessions]);

  const calYear = calendarDate.getFullYear(), calMonth = calendarDate.getMonth();
  const calDays = useMemo(() => {
    const fd = new Date(calYear, calMonth, 1).getDay();
    const td = new Date(calYear, calMonth + 1, 0).getDate();
    const d = [];
    for (let i = 0; i < fd; i++) d.push(null);
    for (let i = 1; i <= td; i++) d.push(i);
    return d;
  }, [calYear, calMonth]);

  const getDayStr = (day) => day ? `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}` : null;

  const handleCalendarClick = (day) => {
    if (!day) return;
    const ds = getDayStr(day);
    const s = sessionDatesMap[ds];
    if (s) { setActiveSession(s); setZoom(1); setPanOffset({x:0,y:0}); zoomRef.current=1; }
    else { setNewSessionDate(ds); setCloneSource("auto"); setShowNewSessionDialog(true); }
  };

  // Wheel zoom
  const wheelRef = useCallback((node) => {
    if (!node) return;
    mapContainerRef.current = node;
    const handler = (e) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const prev = zoomRef.current;
      const nz = Math.max(0.5, Math.min(6, prev * (e.deltaY < 0 ? 1.15 : 1/1.15)));
      const s = nz / prev;
      zoomRef.current = nz; setZoom(nz);
      setPanOffset(p => ({ x: mx - s*(mx-p.x), y: my - s*(my-p.y) }));
    };
    node.addEventListener("wheel", handler, { passive: false });
  }, []);

  const handleMouseDown = (e) => { if (e.button === 0) { setIsPanning(true); setPanStart({ x: e.clientX-panOffset.x, y: e.clientY-panOffset.y }); } };
  const handleMouseMove = (e) => {
    if (isPanning) setPanOffset({ x: e.clientX-panStart.x, y: e.clientY-panStart.y });
    if (mapContainerRef.current) { const r = mapContainerRef.current.getBoundingClientRect(); setTooltipPos({ x: e.clientX-r.left+16, y: e.clientY-r.top-10 }); }
  };
  const handleMouseUp = () => setIsPanning(false);

  // Session actions
  const handleCreateSession = async () => {
    if (!selectedFloor) return;
    setSaving(true);
    try {
      const cf = cloneSource === "auto" ? (sessions.length > 0 ? sessions[0].id : "master") : cloneSource;
      const res = await axios.post(`${API}/admin/gate-sessions`, { date: newSessionDate, floor_id: selectedFloor.id, clone_from: cf }, getAuthHeaders());
      setActiveSession(res.data); await fetchSessions(); setShowNewSessionDialog(false);
      toast.success(isAr ? "تم بدء جولة جديدة" : "New tour started");
    } catch (e) { toast.error(e.response?.data?.detail || "Error"); }
    finally { setSaving(false); }
  };

  const handleBatchCreate = async () => {
    if (!selectedFloor || !batchStartDate || !batchEndDate) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/admin/gate-sessions/batch`, { start_date: batchStartDate, end_date: batchEndDate, floor_id: selectedFloor.id, clone_from: batchCloneSource }, getAuthHeaders());
      await fetchSessions(); setShowBatchDialog(false);
      toast.success(isAr ? `تم إنشاء ${res.data.total_created} جلسة` : `Created ${res.data.total_created} sessions`);
    } catch (e) { toast.error(e.response?.data?.detail || "Error"); }
    finally { setSaving(false); }
  };

  const handleUpdateGate = async (gateId, data) => {
    if (!activeSession) return;
    try {
      const res = await axios.put(`${API}/admin/gate-sessions/${activeSession.id}/gates/${gateId}`, data, getAuthHeaders());
      setActiveSession(res.data);
    } catch (e) { toast.error(isAr ? "تعذر التحديث" : "Update failed"); }
  };

  const handleUpdateSession = async (data) => {
    if (!activeSession) return;
    try {
      const res = await axios.put(`${API}/admin/gate-sessions/${activeSession.id}`, data, getAuthHeaders());
      setActiveSession(res.data); fetchSessions();
      toast.success(isAr ? "تم الحفظ" : "Saved");
    } catch (e) { toast.error("Error"); }
  };

  const handleDeleteSession = async (id) => {
    try {
      await axios.delete(`${API}/admin/gate-sessions/${id}`, getAuthHeaders());
      if (activeSession?.id === id) setActiveSession(null);
      fetchSessions(); toast.success(isAr ? "تم الحذف" : "Deleted");
    } catch (e) { toast.error("Error"); }
  };

  const activeGates = activeSession?.gates?.filter(g => !g.is_removed) || [];
  const removedGates = activeSession?.gates?.filter(g => g.is_removed) || [];
  const changedGates = activeSession?.gates?.filter(g => g.change_type && g.change_type !== "unchanged") || [];
  const filteredGates = filterStatus === "all" ? activeGates : activeGates.filter(g => g.status === filterStatus);

  const stats = useMemo(() => {
    const open = activeGates.filter(g => g.status === "open").length;
    const closed = activeGates.filter(g => g.status === "closed").length;
    const crowded = activeGates.filter(g => g.status === "crowded").length;
    return { total: activeGates.length, open, closed, crowded, noStaff: activeGates.filter(g => g.status === "open" && (g.assigned_staff || 0) === 0).length };
  }, [activeGates]);

  const formatDate = (ds) => { try { return new Date(ds+"T00:00:00").toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); } catch { return ds; } };
  const formatDateShort = (ds) => { try { return new Date(ds+"T00:00:00").toLocaleDateString("ar-SA", { month: "short", day: "numeric" }); } catch { return ds; } };
  const today = new Date().toISOString().split("T")[0];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto flex items-center justify-center mb-3 animate-pulse"><DoorOpen className="w-6 h-6 text-primary" /></div><p className="text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p></div></div>;

  return (
    <div className="space-y-5" data-testid="daily-gate-sessions-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-cairo font-bold text-2xl" data-testid="page-title">{isAr ? "السجل اليومي للأبواب" : "Daily Gate Log"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{isAr ? "تتبع حالة الأبواب يومياً مع التغييرات والملاحظات" : "Track daily gate status changes and notes"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedFloor?.id || ""} onValueChange={(v) => setSelectedFloor(floors.find(f => f.id === v))}>
            <SelectTrigger className="w-48" data-testid="floor-select"><Layers className="w-4 h-4 ml-1" /><SelectValue placeholder={isAr ? "اختر الطابق" : "Select floor"} /></SelectTrigger>
            <SelectContent>{floors.map(f => <SelectItem key={f.id} value={f.id}>{isAr ? f.name_ar : (f.name_en || f.name_ar)}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => { setCloneSource("auto"); setNewSessionDate(today); setShowNewSessionDialog(true); }} disabled={!selectedFloor} className="bg-blue-600 hover:bg-blue-700" data-testid="start-new-tour-btn"><Plus className="w-4 h-4 ml-1" />{isAr ? "جولة جديدة" : "New Tour"}</Button>
          <Button variant="outline" onClick={() => { setBatchStartDate(""); setBatchEndDate(""); setShowBatchDialog(true); }} disabled={!selectedFloor} data-testid="batch-entry-btn"><CalendarRange className="w-4 h-4 ml-1" />{isAr ? "إدخال متعدد" : "Batch"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar: Calendar + Sessions */}
        <div className="lg:col-span-1 space-y-4">
          {/* Calendar */}
          <Card data-testid="monthly-calendar">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarDate(p => new Date(p.getFullYear(), p.getMonth()+1, 1))}><ChevronRight className="w-4 h-4" /></Button>
                <span className="font-cairo font-semibold text-sm">{isAr ? AR_MONTHS[calMonth] : new Date(calYear,calMonth).toLocaleDateString("en",{month:"long"})} {calYear}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarDate(p => new Date(p.getFullYear(), p.getMonth()-1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 mb-1">{AR_WEEKDAYS.map((d,i) => <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">{isAr ? d : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i]}</div>)}</div>
              <div className="grid grid-cols-7 gap-0.5">
                {calDays.map((day, i) => {
                  if (!day) return <div key={`b-${i}`} />;
                  const ds = getDayStr(day);
                  const s = sessionDatesMap[ds];
                  const isToday = ds === today;
                  const isActive = activeSession?.date === ds;
                  return (
                    <button key={day} onClick={() => handleCalendarClick(day)} data-testid={`calendar-day-${day}`}
                      className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 text-xs transition-all ${isActive ? "bg-blue-600 text-white font-bold shadow-md" : isToday ? "bg-slate-100 font-semibold ring-1 ring-slate-300" : "hover:bg-slate-50"} ${s && !isActive ? "font-medium" : ""}`}>
                      <span>{day}</span>
                      {s && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isActive ? "bg-white" : s.status === "completed" ? "bg-blue-500" : "bg-amber-400"}`} />}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-blue-500" />{isAr ? "مكتمل" : "Done"}</div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-amber-400" />{isAr ? "مسودة" : "Draft"}</div>
              </div>
            </CardContent>
          </Card>

          {/* Session list */}
          <div className="space-y-2">
            <h3 className="font-cairo font-semibold text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{isAr ? "سجل الجولات" : "History"}<Badge variant="secondary" className="text-[10px] px-1.5">{sessions.length}</Badge></h3>
            {sessions.length === 0 ? <div className="text-center py-6"><DoorOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" /><p className="text-xs text-muted-foreground">{isAr ? "لا توجد جولات" : "No tours"}</p></div> : (
              <div className="space-y-1.5 max-h-[calc(100vh-620px)] overflow-y-auto pr-1">
                {sessions.map(s => {
                  const isAct = activeSession?.id === s.id;
                  const ch = s.changes_summary || {};
                  const tc = (ch.added||0) + (ch.removed||0) + (ch.modified||0);
                  return (
                    <div key={s.id} data-testid={`session-card-${s.id}`} className={`p-2.5 rounded-lg border cursor-pointer transition-all group ${isAct ? "border-blue-500 bg-blue-50/60 shadow-sm" : "hover:border-slate-300"}`}
                      onClick={() => { setActiveSession(s); setZoom(1); setPanOffset({x:0,y:0}); zoomRef.current=1; }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-xs">{formatDateShort(s.date)}</span>
                          <Badge className={`text-[9px] px-1 py-0 ${s.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{s.status === "completed" ? (isAr ? "مكتمل" : "Done") : (isAr ? "مسودة" : "Draft")}</Badge>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      {tc > 0 && <div className="flex items-center gap-2 mt-1 text-[10px]">
                        {ch.added > 0 && <span className="text-emerald-600 flex items-center gap-0.5"><Plus className="w-3 h-3" />{ch.added}</span>}
                        {ch.removed > 0 && <span className="text-red-500 flex items-center gap-0.5"><X className="w-3 h-3" />{ch.removed}</span>}
                        {ch.modified > 0 && <span className="text-amber-600 flex items-center gap-0.5"><Edit2 className="w-3 h-3" />{ch.modified}</span>}
                      </div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {!activeSession ? (
            <Card className="border-dashed"><CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-4"><DoorOpen className="w-8 h-8 text-slate-400" /></div>
              <h3 className="font-cairo font-semibold text-lg text-slate-600 mb-2">{isAr ? "اختر يوماً من التقويم أو ابدأ جولة جديدة" : "Pick a day or start a new tour"}</h3>
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              {/* Session header */}
              <div className="relative overflow-hidden rounded-xl border bg-gradient-to-l from-blue-50 via-white to-slate-50 p-4">
                <div className="relative flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200"><DoorOpen className="w-6 h-6 text-white" /></div>
                    <div>
                      <h2 className="font-cairo font-bold text-lg">{isAr ? "جولة " : "Tour "}{formatDate(activeSession.date)}</h2>
                      <div className="flex items-center gap-3 mt-0.5">
                        <Badge className={`text-xs ${activeSession.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{activeSession.status === "completed" ? (isAr ? "مكتملة" : "Done") : (isAr ? "مسودة" : "Draft")}</Badge>
                        <span className="text-xs text-muted-foreground">{stats.total} {isAr ? "باب" : "gates"} | {stats.open} {isAr ? "مفتوح" : "open"} | {stats.closed} {isAr ? "مغلق" : "closed"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setSessionNotes(activeSession.supervisor_notes || ""); setShowNotesDialog(true); }}><MessageSquare className="w-4 h-4 ml-1" />{isAr ? "ملاحظات" : "Notes"}</Button>
                    {activeSession.status === "draft" ? (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleUpdateSession({ status: "completed" })} data-testid="complete-session-btn"><CheckCircle2 className="w-4 h-4 ml-1" />{isAr ? "إنهاء الجولة" : "Complete"}</Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleUpdateSession({ status: "draft" })}><RotateCcw className="w-4 h-4 ml-1" />{isAr ? "إعادة فتح" : "Reopen"}</Button>
                    )}
                  </div>
                </div>
                {/* Stats strip */}
                {stats.noStaff > 0 && <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700"><AlertCircle className="w-3.5 h-3.5 inline ml-1" />{stats.noStaff} {isAr ? "أبواب مفتوحة بدون موظفين" : "open gates without staff"}</div>}
                {activeSession.changes_summary && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200/60 flex-wrap">
                    {Object.entries(activeSession.changes_summary).map(([k,v]) => { if (v===0) return null; const l = CHANGE_LABELS[k]; if (!l) return null; return <div key={k} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{backgroundColor:l.bg,color:l.color}}><span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:l.color}} />{v} {isAr?l.ar:l.en}</div>; })}
                  </div>
                )}
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="map" data-testid="tab-map"><DoorOpen className="w-4 h-4 ml-1" />{isAr ? "الخريطة" : "Map"}</TabsTrigger>
                  <TabsTrigger value="table" data-testid="tab-table"><Tag className="w-4 h-4 ml-1" />{isAr ? "قائمة الأبواب" : "Gates"}{changedGates.length > 0 && <Badge variant="destructive" className="mr-1 text-[10px] px-1.5">{changedGates.length}</Badge>}</TabsTrigger>
                  <TabsTrigger value="changes" data-testid="tab-changes"><FileText className="w-4 h-4 ml-1" />{isAr ? "التغييرات" : "Changes"}</TabsTrigger>
                </TabsList>

                {/* MAP TAB */}
                <TabsContent value="map" className="space-y-3">
                  <div className="flex items-center justify-end">
                    <div className="flex items-center gap-1 border rounded-lg p-1 bg-white">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c=mapContainerRef.current; if(!c)return; const r=c.getBoundingClientRect(); const cx=r.width/2,cy=r.height/2; const p=zoomRef.current; const nz=Math.max(0.5,p*0.8); const s=nz/p; zoomRef.current=nz; setZoom(nz); setPanOffset(o=>({x:cx-s*(cx-o.x),y:cy-s*(cy-o.y)})); }}><ZoomOut className="w-4 h-4" /></Button>
                      <span className="text-xs w-12 text-center">{Math.round(zoom*100)}%</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c=mapContainerRef.current; if(!c)return; const r=c.getBoundingClientRect(); const cx=r.width/2,cy=r.height/2; const p=zoomRef.current; const nz=Math.min(6,p*1.25); const s=nz/p; zoomRef.current=nz; setZoom(nz); setPanOffset(o=>({x:cx-s*(cx-o.x),y:cy-s*(cy-o.y)})); }}><ZoomIn className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { zoomRef.current=1; setZoom(1); setPanOffset({x:0,y:0}); }}><Maximize2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  {selectedFloor?.image_url ? (
                    <Card className="overflow-hidden"><CardContent className="p-0">
                      <div ref={wheelRef} className="relative bg-slate-100 overflow-hidden" style={{ height: "500px", cursor: isPanning ? "grabbing" : "grab" }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} data-testid="gate-map-container">
                        <div style={{ transform: `translate(${panOffset.x}px,${panOffset.y}px) scale(${zoom})`, transformOrigin: "0 0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {(() => {
                            const ce = mapContainerRef.current;
                            let ws = { position: "relative", width: "100%", height: "100%" };
                            if (imgRatio && ce) { const cw=ce.clientWidth, ch=ce.clientHeight; if (cw/ch > imgRatio) ws = { position:"relative", height:"100%", width: ch*imgRatio }; else ws = { position:"relative", width:"100%", height: cw/imgRatio }; }
                            return (
                              <div style={ws}>
                                <img src={selectedFloor.image_url} alt="" style={{ width:"100%", height:"100%", display:"block" }} draggable={false} className="pointer-events-none select-none" onLoad={(e) => setImgRatio(e.target.naturalWidth/e.target.naturalHeight)} />
                                <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", overflow:"visible" }} viewBox="0 0 100 100" preserveAspectRatio="none" data-testid="gate-map-svg">
                                  {activeGates.map(gate => {
                                    const sc = STATUS_CONFIG[gate.status] || STATUS_CONFIG.closed;
                                    const isChanged = gate.change_type && gate.change_type !== "unchanged";
                                    return (
                                      <g key={gate.id} data-testid={`gate-marker-${gate.id}`}
                                        onMouseEnter={() => setHoveredGate(gate)} onMouseLeave={() => setHoveredGate(null)}
                                        onClick={() => { setSelectedGate(gate); setShowGateDialog(true); }}
                                        style={{ cursor: "pointer" }}>
                                        <circle cx={gate.x} cy={gate.y} r={isChanged ? "1" : "0.7"} fill={sc.color} fillOpacity={0.9} stroke="white" strokeWidth="0.15" vectorEffect="non-scaling-stroke" />
                                        {isChanged && <circle cx={gate.x} cy={gate.y} r="1.3" fill="none" stroke={sc.color} strokeWidth="0.1" strokeDasharray="0.5 0.3" vectorEffect="non-scaling-stroke" opacity="0.5" />}
                                      </g>
                                    );
                                  })}
                                  {removedGates.map(gate => (
                                    <g key={gate.id}><circle cx={gate.x} cy={gate.y} r="0.5" fill="#ef4444" fillOpacity={0.2} stroke="#ef4444" strokeWidth="0.1" strokeDasharray="0.4 0.3" vectorEffect="non-scaling-stroke" />
                                    <line x1={gate.x-0.4} y1={gate.y-0.4} x2={gate.x+0.4} y2={gate.y+0.4} stroke="#ef4444" strokeWidth="0.15" vectorEffect="non-scaling-stroke" opacity="0.5" />
                                    <line x1={gate.x+0.4} y1={gate.y-0.4} x2={gate.x-0.4} y2={gate.y+0.4} stroke="#ef4444" strokeWidth="0.15" vectorEffect="non-scaling-stroke" opacity="0.5" /></g>
                                  ))}
                                </svg>
                              </div>
                            );
                          })()}
                        </div>
                        {/* Tooltip */}
                        {hoveredGate && (() => {
                          const sc = STATUS_CONFIG[hoveredGate.status] || STATUS_CONFIG.closed;
                          const cl = CHANGE_LABELS[hoveredGate.change_type] || CHANGE_LABELS.unchanged;
                          return (
                            <div className="absolute pointer-events-none z-50" style={{ left:tooltipPos.x, top:tooltipPos.y }}>
                              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border p-3 min-w-[180px]" style={{ borderTopColor:sc.color, borderTopWidth:3, direction:"rtl" }}>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-bold text-sm">{hoveredGate.name_ar}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{backgroundColor:`${sc.color}20`,color:sc.color}}>{isAr ? sc.label_ar : sc.label_en}</span>
                                </div>
                                {hoveredGate.change_type !== "unchanged" && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{backgroundColor:cl.bg,color:cl.color}}>{isAr?cl.ar:cl.en}</span>}
                                {hoveredGate.assigned_staff > 0 && <p className="text-[10px] text-slate-500 mt-1"><Users className="w-3 h-3 inline ml-0.5" />{hoveredGate.assigned_staff} {isAr?"موظف":"staff"}</p>}
                                {hoveredGate.daily_note && <p className="text-[10px] text-slate-500 mt-1 border-t pt-1">{hoveredGate.daily_note}</p>}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </CardContent></Card>
                  ) : <Card><CardContent className="py-12 text-center text-muted-foreground">{isAr?"لا توجد خريطة":"No map"}</CardContent></Card>}
                </TabsContent>

                {/* TABLE TAB */}
                <TabsContent value="table" className="space-y-3">
                  {/* Filter */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {["all", "open", "closed", "crowded", "maintenance"].map(st => {
                      const sc = st === "all" ? null : STATUS_CONFIG[st];
                      const cnt = st === "all" ? activeGates.length : activeGates.filter(g => g.status === st).length;
                      return (
                        <Button key={st} variant={filterStatus === st ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(st)} className={filterStatus === st && sc ? "" : ""} data-testid={`filter-${st}`}>
                          {sc && <span className="w-2 h-2 rounded-full ml-1" style={{backgroundColor:sc.color}} />}
                          {st === "all" ? (isAr ? "الكل" : "All") : (isAr ? sc.label_ar : sc.label_en)} ({cnt})
                        </Button>
                      );
                    })}
                  </div>
                  {/* Gates grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredGates.map(gate => {
                      const sc = STATUS_CONFIG[gate.status] || STATUS_CONFIG.closed;
                      const cl = CHANGE_LABELS[gate.change_type] || CHANGE_LABELS.unchanged;
                      const isChanged = gate.change_type && gate.change_type !== "unchanged";
                      const Icon = sc.icon;
                      return (
                        <Card key={gate.id} className={`transition-all hover:shadow-md cursor-pointer ${isChanged ? "ring-1" : ""}`} style={isChanged ? {borderColor:cl.color+"40"} : {}} onClick={() => { setSelectedGate(gate); setShowGateDialog(true); }} data-testid={`gate-card-${gate.id}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{backgroundColor:`${sc.color}15`}}><Icon className="w-5 h-5" style={{color:sc.color}} /></div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-sm">{gate.name_ar}</span>
                                    {isChanged && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{backgroundColor:cl.bg,color:cl.color}}>{isAr?cl.ar:cl.en}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                    <span style={{color:sc.color}}>{isAr?sc.label_ar:sc.label_en}</span>
                                    <span>{CLASSIFICATIONS.find(c=>c.value===gate.classification)?.[isAr?"label_ar":"label_en"]}</span>
                                    {gate.assigned_staff > 0 && <span><Users className="w-3 h-3 inline" /> {gate.assigned_staff}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                            {gate.daily_note && <div className="mt-2 p-1.5 bg-amber-50 rounded text-[10px] text-amber-700"><MessageSquare className="w-3 h-3 inline ml-0.5" />{gate.daily_note}</div>}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  {removedGates.length > 0 && (
                    <div>
                      <h3 className="font-cairo font-semibold text-sm mb-2 flex items-center gap-2 text-red-500"><CircleOff className="w-4 h-4" />{isAr?"أبواب معطلة":"Disabled"}<Badge variant="destructive">{removedGates.length}</Badge></h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {removedGates.map(gate => (
                          <Card key={gate.id} className="border-red-200/50 bg-red-50/30 opacity-70"><CardContent className="p-2.5 flex items-center justify-between">
                            <span className="text-sm line-through text-red-400">{gate.name_ar}</span>
                            {activeSession.status === "draft" && <Button variant="outline" size="sm" className="text-emerald-600 text-xs h-7" onClick={() => handleUpdateGate(gate.id, {is_removed:false})}><RotateCcw className="w-3 h-3 ml-1" />{isAr?"استعادة":"Restore"}</Button>}
                          </CardContent></Card>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* CHANGES TAB */}
                <TabsContent value="changes">
                  <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" />{isAr?"ملخص التغييرات":"Changes"}</CardTitle></CardHeader>
                    <CardContent>
                      {changedGates.length === 0 ? <div className="text-center py-8"><CheckCircle2 className="w-12 h-12 mx-auto text-blue-400 mb-3" /><p className="text-muted-foreground">{isAr?"لا توجد تغييرات":"No changes"}</p></div> : (
                        <div className="space-y-3">{changedGates.map(gate => {
                          const sc = STATUS_CONFIG[gate.status] || STATUS_CONFIG.closed;
                          const cl = CHANGE_LABELS[gate.change_type] || CHANGE_LABELS.unchanged;
                          return (
                            <div key={gate.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{borderRightColor:cl.color,borderRightWidth:3}} data-testid={`change-item-${gate.id}`}>
                              <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:cl.color}} />
                              <div className="flex-1">
                                <span className="font-semibold text-sm">{gate.name_ar}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{backgroundColor:cl.bg,color:cl.color}}>{isAr?cl.ar:cl.en}</span>
                                  <span className="text-[10px]" style={{color:sc.color}}>{isAr?sc.label_ar:sc.label_en}</span>
                                </div>
                              </div>
                              {gate.daily_note && <p className="text-[10px] text-slate-500 max-w-xs truncate">{gate.daily_note}</p>}
                            </div>
                          );
                        })}</div>
                      )}
                      {activeSession.supervisor_notes && <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100"><h4 className="font-cairo font-semibold text-sm text-blue-700 flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4" />{isAr?"ملاحظات المشرف":"Notes"}</h4><p className="text-sm text-blue-600 whitespace-pre-wrap">{activeSession.supervisor_notes}</p></div>}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Gate Edit Dialog */}
      <Dialog open={showGateDialog} onOpenChange={setShowGateDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><DoorOpen className="w-5 h-5" />{isAr?"تعديل حالة الباب":"Edit Gate"}</DialogTitle></DialogHeader>
          {selectedGate && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor:`${(STATUS_CONFIG[selectedGate.status]||STATUS_CONFIG.closed).color}15`}}>
                  {(() => { const I = (STATUS_CONFIG[selectedGate.status]||STATUS_CONFIG.closed).icon; return <I className="w-5 h-5" style={{color:(STATUS_CONFIG[selectedGate.status]||STATUS_CONFIG.closed).color}} />; })()}
                </div>
                <div><p className="font-semibold">{selectedGate.name_ar}</p><p className="text-xs text-muted-foreground">{CLASSIFICATIONS.find(c=>c.value===selectedGate.classification)?.[isAr?"label_ar":"label_en"]}</p></div>
              </div>
              {/* Status buttons */}
              {activeSession?.status === "draft" && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">{isAr?"حالة الباب":"Gate Status"}</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(STATUS_CONFIG).map(([k,v]) => {
                      const Icon = v.icon;
                      return (
                        <button key={k} onClick={() => { handleUpdateGate(selectedGate.id, {status:k}); setSelectedGate(p => ({...p, status:k})); }}
                          className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-all ${selectedGate.status === k ? "ring-2" : "hover:bg-slate-50"}`}
                          style={selectedGate.status === k ? {borderColor:v.color,backgroundColor:`${v.color}10`,ringColor:v.color} : {}}
                          data-testid={`gate-status-${k}`}>
                          <Icon className="w-5 h-5" style={{color:v.color}} />
                          <span className="font-medium">{isAr?v.label_ar:v.label_en}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Direction + Classification */}
              {activeSession?.status === "draft" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{isAr?"الاتجاه":"Direction"}</Label>
                    <Select value={selectedGate.direction} onValueChange={(v) => { handleUpdateGate(selectedGate.id, {direction:v}); setSelectedGate(p=>({...p,direction:v})); }}>
                      <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{isAr?d.label_ar:d.label_en}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{isAr?"التصنيف":"Classification"}</Label>
                    <Select value={selectedGate.classification} onValueChange={(v) => { handleUpdateGate(selectedGate.id, {classification:v}); setSelectedGate(p=>({...p,classification:v})); }}>
                      <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{CLASSIFICATIONS.map(c => <SelectItem key={c.value} value={c.value}>{isAr?c.label_ar:c.label_en}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {/* Staff count */}
              {activeSession?.status === "draft" && (
                <div>
                  <Label className="text-xs">{isAr?"عدد الموظفين":"Staff Count"}</Label>
                  <Input type="number" min={0} className="mt-1" value={selectedGate.assigned_staff || 0} onChange={(e) => { const v = parseInt(e.target.value)||0; handleUpdateGate(selectedGate.id, {assigned_staff:v}); setSelectedGate(p=>({...p,assigned_staff:v})); }} data-testid="gate-staff-count" />
                </div>
              )}
              {/* Daily note */}
              <div>
                <Label className="text-xs">{isAr?"ملاحظة يومية":"Daily Note"}</Label>
                <Textarea className="mt-1 text-sm" placeholder={isAr?"أضف ملاحظة...":"Add note..."} value={selectedGate.daily_note||""} onChange={(e) => setSelectedGate(p=>({...p,daily_note:e.target.value}))} rows={2} disabled={activeSession?.status==="completed"} data-testid="gate-daily-note" />
              </div>
              {/* Remove/Restore */}
              {activeSession?.status === "draft" && (
                <div className="flex items-center justify-between p-2 border rounded-lg">
                  <span className="text-xs font-medium">{selectedGate.is_removed ? (isAr?"الباب معطل":"Disabled") : (isAr?"الباب نشط":"Active")}</span>
                  <Button variant={selectedGate.is_removed ? "default" : "destructive"} size="sm" className="text-xs h-7" onClick={() => { handleUpdateGate(selectedGate.id, {is_removed:!selectedGate.is_removed}); setSelectedGate(p=>({...p,is_removed:!p.is_removed})); }}>
                    {selectedGate.is_removed ? <><RotateCcw className="w-3 h-3 ml-1" />{isAr?"تفعيل":"Enable"}</> : <><CircleOff className="w-3 h-3 ml-1" />{isAr?"تعطيل":"Disable"}</>}
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {activeSession?.status === "draft" && selectedGate && <Button onClick={() => { handleUpdateGate(selectedGate.id, {daily_note:selectedGate.daily_note}); setShowGateDialog(false); }} data-testid="save-gate-changes"><Save className="w-4 h-4 ml-1" />{isAr?"حفظ":"Save"}</Button>}
            <Button variant="outline" onClick={() => setShowGateDialog(false)}>{isAr?"إغلاق":"Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Session Dialog */}
      <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600" />{isAr?"بدء جولة أبواب جديدة":"New Gate Tour"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-sm">{isAr?"التاريخ":"Date"}</Label><Input type="date" value={newSessionDate} onChange={(e)=>setNewSessionDate(e.target.value)} className="mt-1" data-testid="new-session-date" /></div>
            <div>
              <Label className="text-sm mb-2 block">{isAr?"مصدر البيانات":"Data Source"}</Label>
              <div className="space-y-2">
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${cloneSource==="auto" ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-200" : "hover:bg-slate-50"}`}><input type="radio" name="src" checked={cloneSource==="auto"} onChange={()=>setCloneSource("auto")} className="accent-blue-600" /><div><p className="text-sm font-medium">{isAr?"تلقائي":"Auto"}</p><p className="text-[11px] text-muted-foreground">{isAr?`نسخ من ${sessions.length>0?"آخر جولة":"بيانات الأبواب الأساسية"}`:"Clone from latest"}</p></div></label>
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${cloneSource==="master" ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-200" : "hover:bg-slate-50"}`}><input type="radio" name="src" checked={cloneSource==="master"} onChange={()=>setCloneSource("master")} className="accent-blue-600" /><div><p className="text-sm font-medium">{isAr?"بيانات الأبواب الأساسية":"Master Gates"}</p></div></label>
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${cloneSource==="empty" ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-200" : "hover:bg-slate-50"}`}><input type="radio" name="src" checked={cloneSource==="empty"} onChange={()=>setCloneSource("empty")} className="accent-blue-600" /><div><p className="text-sm font-medium">{isAr?"بدء فارغ":"Empty"}</p></div></label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateSession} disabled={saving||!newSessionDate} className="bg-blue-600 hover:bg-blue-700" data-testid="confirm-new-session">{saving?<RefreshCw className="w-4 h-4 ml-1 animate-spin"/>:<Plus className="w-4 h-4 ml-1"/>}{isAr?"بدء الجولة":"Start"}</Button>
            <Button variant="outline" onClick={()=>setShowNewSessionDialog(false)}>{isAr?"إلغاء":"Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><CalendarRange className="w-5 h-5 text-blue-600" />{isAr?"إدخال متعدد":"Batch Entry"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100"><p className="text-xs text-blue-700"><AlertCircle className="w-4 h-4 inline ml-1" />{isAr?"سيتم إنشاء جلسة لكل يوم. الأيام الموجودة ستُتخطى.":"Session per day. Existing days skipped."}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm">{isAr?"من":"From"}</Label><Input type="date" value={batchStartDate} onChange={(e)=>setBatchStartDate(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-sm">{isAr?"إلى":"To"}</Label><Input type="date" value={batchEndDate} onChange={(e)=>setBatchEndDate(e.target.value)} className="mt-1" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleBatchCreate} disabled={saving||!batchStartDate||!batchEndDate} className="bg-blue-600 hover:bg-blue-700">{saving?<RefreshCw className="w-4 h-4 ml-1 animate-spin"/>:<CalendarRange className="w-4 h-4 ml-1"/>}{isAr?"إنشاء":"Create"}</Button>
            <Button variant="outline" onClick={()=>setShowBatchDialog(false)}>{isAr?"إلغاء":"Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><MessageSquare className="w-5 h-5" />{isAr?"ملاحظات المشرف":"Notes"}</DialogTitle></DialogHeader>
          <Textarea value={sessionNotes} onChange={(e)=>setSessionNotes(e.target.value)} placeholder={isAr?"أضف ملاحظاتك...":"Add notes..."} rows={5} className="text-sm" />
          <DialogFooter>
            <Button onClick={()=>{handleUpdateSession({supervisor_notes:sessionNotes});setShowNotesDialog(false);}}><Save className="w-4 h-4 ml-1" />{isAr?"حفظ":"Save"}</Button>
            <Button variant="outline" onClick={()=>setShowNotesDialog(false)}>{isAr?"إلغاء":"Cancel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
