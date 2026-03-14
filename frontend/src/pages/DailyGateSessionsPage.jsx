import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
  Plus, Trash2, Save, X, Calendar as CalendarIcon, ChevronRight, ChevronLeft,
  Eye, Clock, FileText, CheckCircle2, AlertCircle, ArrowLeftRight,
  RefreshCw, Edit2, MessageSquare, Layers, ZoomIn, ZoomOut, Maximize2,
  RotateCcw, CircleDot, CircleOff, Tag, CalendarRange, DoorOpen, DoorClosed,
  Wrench, ArrowUpRight, ArrowDownRight, Users, FileStack, Database,
  Crosshair, Activity, AlertTriangle, UserCheck, MapPin, Shield,
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
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { GatesTab } from "./DailyGateSessions/GatesTab";
import { EmployeesTab } from "./DailyGateSessions/EmployeesTab";
import { ArchiveSidebar } from "@/components/shared/ArchiveSidebar";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  open: { color: "#22c55e", label_ar: "مفتوح", label_en: "Open", icon: DoorOpen },
  closed: { color: "#ef4444", label_ar: "مغلق", label_en: "Closed", icon: DoorClosed },
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

export default function DailyGateSessionsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { canWrite, canRead } = useAuth();

  const canCreateSession = canWrite("create_session");
  const canApproveSession = canWrite("approve_session");
  const canDeleteSession = canWrite("delete_session");

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
  const [emptyDaySelected, setEmptyDaySelected] = useState(null);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [statsPanelCollapsed, setStatsPanelCollapsed] = useState(false);

  const [newSessionDate, setNewSessionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [cloneSource, setCloneSource] = useState("auto");
  const [batchStartDate, setBatchStartDate] = useState("");
  const [batchEndDate, setBatchEndDate] = useState("");
  const [batchCloneSource, setBatchCloneSource] = useState("master");
  const [filterStatus, setFilterStatus] = useState("all");

  // Map
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [imgRatio, setImgRatio] = useState(null);
  const [hoveredGate, setHoveredGate] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [draggingGateId, setDraggingGateId] = useState(null);
  const zoomRef = useRef(1);
  const mapContainerRef = useRef(null);
  const svgRef = useRef(null);
  const hasDraggedRef = useRef(false);

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
    // Pinch-to-zoom
    let pinchDist = null, pinchZoom = null;
    const dist = (a, b) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const onTs = (e) => { if (e.touches.length === 2) { e.preventDefault(); pinchDist = dist(e.touches[0], e.touches[1]); pinchZoom = zoomRef.current; } };
    const onTm = (e) => {
      if (e.touches.length === 2 && pinchDist) {
        e.preventDefault();
        const d = dist(e.touches[0], e.touches[1]);
        const rect = node.getBoundingClientRect();
        const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
        const cy = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
        const prev = zoomRef.current;
        const nz = Math.max(0.5, Math.min(6, pinchZoom * (d / pinchDist)));
        const s = nz / prev;
        zoomRef.current = nz; setZoom(nz);
        setPanOffset(p => ({ x: cx - s * (cx - p.x), y: cy - s * (cy - p.y) }));
      }
    };
    const onTe = (e) => { if (e.touches.length < 2) { pinchDist = null; pinchZoom = null; } };
    node.addEventListener("wheel", handler, { passive: false });
    node.addEventListener("touchstart", onTs, { passive: false });
    node.addEventListener("touchmove", onTm, { passive: false });
    node.addEventListener("touchend", onTe);
  }, []);

  // Smart cursor: pan on background, drag on gate marker
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };
  const handleGateMouseDown = (e, gateId) => {
    if (activeSession?.status !== "draft" || !canCreateSession) return;
    e.stopPropagation();
    e.preventDefault();
    hasDraggedRef.current = false;
    setDraggingGateId(gateId);
  };
  const getClientXY = (e) => {
    if (e.touches && e.touches.length > 0) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches.length > 0) return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    return { clientX: e.clientX, clientY: e.clientY };
  };
  const getMousePercent = (e) => {
    if (!mapContainerRef.current) return { x: 0, y: 0 };
    const { clientX, clientY } = getClientXY(e);
    const rect = mapContainerRef.current.getBoundingClientRect();
    const lx = clientX - rect.left;
    const ly = clientY - rect.top;
    const cx = (lx - panOffset.x) / zoom;
    const cy = (ly - panOffset.y) / zoom;
    const cw = rect.width;
    const ch = rect.height;
    let imgLeft = 0, imgTop = 0, imgW = cw, imgH = ch;
    if (imgRatio) {
      if (cw / ch > imgRatio) {
        imgW = ch * imgRatio; imgH = ch;
        imgLeft = (cw - imgW) / 2;
      } else {
        imgW = cw; imgH = cw / imgRatio;
        imgTop = (ch - imgH) / 2;
      }
    }
    const svgX = ((cx - imgLeft) / imgW) * 100;
    const svgY = ((cy - imgTop) / imgH) * 100;
    return { x: Math.max(0, Math.min(100, svgX)), y: Math.max(0, Math.min(100, svgY)) };
  };
  const handleMouseMove = (e) => {
    if (draggingGateId) {
      hasDraggedRef.current = true;
      const pos = getMousePercent(e);
      setActiveSession(prev => {
        if (!prev) return prev;
        return { ...prev, gates: prev.gates.map(g => g.id === draggingGateId ? { ...g, x: pos.x, y: pos.y } : g) };
      });
      return;
    }
    if (isPanning) setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    if (mapContainerRef.current) { const r = mapContainerRef.current.getBoundingClientRect(); setTooltipPos({ x: e.clientX - r.left + 16, y: e.clientY - r.top - 10 }); }
  };
  const handleMouseUp = () => {
    if (draggingGateId) {
      const gate = activeSession?.gates?.find(g => g.id === draggingGateId);
      if (gate && activeSession) {
        handleUpdateGate(draggingGateId, { x: gate.x, y: gate.y });
        toast.success(isAr ? "تم حفظ الموقع" : "Position saved", { duration: 1500 });
      }
      setDraggingGateId(null);
      return;
    }
    setIsPanning(false);
  };
  // Touch event handlers for gates map - smart cursor
  const handleTouchStartGates = (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const { clientX, clientY } = getClientXY(e);
    setIsPanning(true);
    setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
  };
  const handleGateTouchStart = (e, gateId) => {
    if (activeSession?.status !== "draft" || !canCreateSession) return;
    e.stopPropagation();
    e.preventDefault();
    hasDraggedRef.current = false;
    setDraggingGateId(gateId);
  };
  const handleTouchMoveGates = (e) => {
    if (e.touches.length !== 1) return;
    const { clientX, clientY } = getClientXY(e);
    if (draggingGateId) {
      e.preventDefault();
      hasDraggedRef.current = true;
      const pos = getMousePercent(e);
      setActiveSession(prev => {
        if (!prev) return prev;
        return { ...prev, gates: prev.gates.map(g => g.id === draggingGateId ? { ...g, x: pos.x, y: pos.y } : g) };
      });
      return;
    }
    if (isPanning) { e.preventDefault(); setPanOffset({ x: clientX - panStart.x, y: clientY - panStart.y }); }
  };
  const handleTouchEndGates = (e) => {
    e.preventDefault();
    handleMouseUp();
  };

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
    const openGates = activeGates.filter(g => g.status === "open");
    const light = openGates.filter(g => (g.indicator || "light") === "light").length;
    const medium = openGates.filter(g => (g.indicator || "light") === "medium").length;
    const crowded = openGates.filter(g => (g.indicator || "light") === "crowded").length;
    return { total: activeGates.length, open, closed, light, medium, crowded, noStaff: openGates.filter(g => (g.assigned_staff || 0) === 0).length };
  }, [activeGates]);

  const formatDate = (ds) => { try { return new Date(ds+"T00:00:00").toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); } catch { return ds; } };
  const formatDateShort = (ds) => { try { return new Date(ds+"T00:00:00").toLocaleDateString("ar-SA", { month: "short", day: "numeric" }); } catch { return ds; } };
  const today = new Date().toISOString().split("T")[0];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto flex items-center justify-center mb-3 animate-pulse"><DoorOpen className="w-6 h-6 text-primary" /></div><p className="text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p></div></div>;

  return (
    <div className="space-y-4" data-testid="daily-gate-sessions-page">

      {/* ══ HERO BANNER ════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 40%, #2563eb 70%, #3b82f6 100%)" }}>
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10 bg-white"/>
        <div className="absolute -bottom-14 -left-6 w-56 h-56 rounded-full opacity-5 bg-white"/>
        <div className="absolute top-4 left-32 w-6 h-6 rounded-full opacity-15 bg-white"/>

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <DoorOpen className="w-4 h-4 text-white"/>
              </div>
              <span className="text-blue-200 text-xs font-medium">السجل اليومي للأبواب</span>
            </div>
            <h1 className="font-cairo font-black text-2xl text-white leading-tight" data-testid="page-title">
              {selectedFloor ? (isAr ? selectedFloor.name_ar : (selectedFloor.name_en || selectedFloor.name_ar)) : "اختر الطابق"}
            </h1>
            <p className="text-blue-200 text-xs mt-1">تتبع حالة الأبواب يومياً مع التغييرات والملاحظات</p>
          </div>

          {/* mini stats */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label:"الجولات",   value:sessions.length,                                                    color:"text-white",        bg:"bg-white/20" },
              { label:"مكتملة",    value:sessions.filter(s=>s.status==="completed").length,                  color:"text-blue-200",     bg:"bg-white/10" },
              { label:"مسودة",     value:sessions.filter(s=>s.status==="draft").length,                      color:"text-yellow-300",   bg:"bg-yellow-400/20" },
              { label:"هذا الشهر", value:sessions.filter(s=>s.date?.startsWith(new Date().toISOString().slice(0,7))).length, color:"text-cyan-300", bg:"bg-cyan-400/15" },
            ].map((s,i)=>(
              <div key={i} className={`${s.bg} rounded-xl px-3 py-2 text-center backdrop-blur-sm`}>
                <p className={`font-black text-xl leading-none ${s.color}`}>{s.value}</p>
                <p className="text-white/60 text-[9px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Controls bar */}
        <div className="relative flex items-center gap-2 mt-4 pt-3 border-t border-white/15 flex-wrap">
          <Select value={selectedFloor?.id || ""} onValueChange={(v) => setSelectedFloor(floors.find(f => f.id === v))}>
            <SelectTrigger className="w-44 bg-white/20 border-white/30 text-white h-9 text-sm" data-testid="floor-select">
              <Layers className="w-4 h-4 ml-1" /><SelectValue placeholder={isAr ? "اختر الطابق" : "Select floor"} />
            </SelectTrigger>
            <SelectContent>{floors.map(f => <SelectItem key={f.id} value={f.id}>{isAr ? f.name_ar : (f.name_en || f.name_ar)}</SelectItem>)}</SelectContent>
          </Select>
          {canCreateSession && (
            <Button onClick={() => { setCloneSource("auto"); setNewSessionDate(today); setShowNewSessionDialog(true); }}
              disabled={!selectedFloor} data-testid="start-new-tour-btn"
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold gap-1.5 h-9 shadow-md">
              <Plus className="w-4 h-4"/>جولة جديدة
            </Button>
          )}
          {canCreateSession && (
            <Button variant="outline" onClick={() => { setBatchStartDate(""); setBatchEndDate(""); setShowBatchDialog(true); }}
              disabled={!selectedFloor} data-testid="batch-entry-btn"
              className="bg-white/15 border-white/30 text-white hover:bg-white/25 h-9 gap-1.5 hidden sm:flex">
              <CalendarRange className="w-4 h-4"/>إدخال متعدد
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <ArchiveSidebar
            sessions={sessions} activeSession={activeSession} isAr={isAr}
            theme="blue" readOnly={!canDeleteSession}
            onSelectSession={(s) => { setActiveSession(s); setZoom(1); setPanOffset({x:0,y:0}); zoomRef.current=1; }}
            onDeleteSession={handleDeleteSession}
            onCalendarEmptyClick={canCreateSession
              ? (ds) => { setEmptyDaySelected(null); setNewSessionDate(ds); setCloneSource("auto"); setShowNewSessionDialog(true); }
              : (ds) => { setActiveSession(null); setEmptyDaySelected(ds); }
            }
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {!activeSession ? (
            /* ── Empty State خرافي ── */
            <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60"
              style={{ minHeight: "420px" }}>
              <div className="absolute top-6 right-6 w-24 h-24 rounded-full bg-blue-100/50"/>
              <div className="absolute bottom-8 left-8 w-16 h-16 rounded-full bg-indigo-100/40"/>

              <div className="relative flex flex-col items-center justify-center py-16 px-8 text-center">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl"
                    style={{ background: "linear-gradient(135deg, #1e40af, #2563eb)" }}>
                    {emptyDaySelected ? <CalendarIcon className="w-11 h-11 text-white"/> : <DoorOpen className="w-11 h-11 text-white"/>}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
                    <span className="text-lg">🚪</span>
                  </div>
                </div>

                {emptyDaySelected ? (
                  <>
                    <h3 className="font-cairo font-black text-2xl text-blue-900 mb-2">لا توجد جولات لهذا اليوم</h3>
                    <p className="text-blue-700 font-medium mb-1">
                      {new Date(emptyDaySelected).toLocaleDateString('ar-SA', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                    </p>
                    <p className="text-slate-500 text-sm max-w-xs">اختر يوماً آخر من التقويم أو أنشئ جولة جديدة لهذا اليوم</p>
                    {canCreateSession && selectedFloor && (
                      <Button onClick={() => { setCloneSource("auto"); setNewSessionDate(emptyDaySelected); setShowNewSessionDialog(true); }}
                        className="mt-5 gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg">
                        <Plus className="w-4 h-4"/>إنشاء جولة لهذا اليوم
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="font-cairo font-black text-2xl text-blue-900 mb-2">
                      {canCreateSession ? "ابدأ جولتك اليومية للأبواب" : "السجل اليومي للأبواب"}
                    </h3>
                    <p className="text-slate-500 text-sm max-w-sm leading-relaxed mb-5">
                      {canCreateSession
                        ? "اضغط على يوم في التقويم لعرض جولته، أو ابدأ جولة جديدة الآن لتتبع حالة الأبواب والتدفق"
                        : "اضغط على يوم في التقويم لعرض تفاصيل الجولة اليومية للأبواب"}
                    </p>
                    {canCreateSession && selectedFloor && (
                      <div className="flex items-center gap-3">
                        <Button onClick={() => { setCloneSource("auto"); setNewSessionDate(today); setShowNewSessionDialog(true); }}
                          className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg">
                          <Plus className="w-4 h-4"/>جولة جديدة الآن 🚀
                        </Button>
                        <Button variant="outline" onClick={() => setShowBatchDialog(true)}
                          className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
                          <CalendarRange className="w-4 h-4"/>إدخال متعدد
                        </Button>
                      </div>
                    )}
                    {!selectedFloor && (
                      <div className="mt-4 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                        ⚠️ اختر الطابق من القائمة أعلاه أولاً
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ══ Session Header ════════════════════════════════ */}
              <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-l from-blue-50 via-white to-slate-50 p-4">
                <div className="relative flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-200">
                      <DoorOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-cairo font-bold text-base">{isAr ? "جولة " : "Tour "}{formatDate(activeSession.date)}</h2>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge className={`text-[10px] px-2 py-0.5 ${activeSession.status==="completed" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                          {activeSession.status==="completed" ? (isAr?"✅ مكتملة":"Done") : (isAr?"⏳ مسودة":"Draft")}
                        </Badge>
                        {activeSession.changes_summary && Object.entries(activeSession.changes_summary).map(([k,v]) => {
                          if (v===0) return null;
                          const l = CHANGE_LABELS[k]; if (!l) return null;
                          return <span key={k} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{backgroundColor:l.bg,color:l.color}}>{v} {isAr?l.ar:l.en}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                      onClick={() => { setSessionNotes(activeSession.supervisor_notes||""); setShowNotesDialog(true); }}>
                      <MessageSquare className="w-3.5 h-3.5"/>ملاحظات
                    </Button>
                    {canApproveSession && activeSession.status==="draft" ? (
                      <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 gap-1.5 text-xs"
                        onClick={()=>handleUpdateSession({status:"completed"})} data-testid="complete-session-btn">
                        <CheckCircle2 className="w-3.5 h-3.5"/>إنهاء الجولة
                      </Button>
                    ) : canApproveSession && activeSession.status!=="draft" ? (
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                        onClick={()=>handleUpdateSession({status:"draft"})}>
                        <RotateCcw className="w-3.5 h-3.5"/>إعادة فتح
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Tab Bar */}
                <div className="rounded-2xl p-2 mb-4"
                  style={{ backgroundColor:'rgba(255,255,255,0.7)', border:'1px solid #e5e7eb' }}
                  data-testid="daily-tabs-bar">
                  <div className="flex items-center gap-2 justify-center flex-wrap">
                    {[
                      { id:'employees', label:isAr?'الموظفين':'Staff',      icon:Users,    count:null },
                      { id:'gates',     label:isAr?'الكثافات':'Density',     icon:Activity,  count:null },
                      { id:'map',       label:isAr?'الأبواب':'Gates',        icon:DoorOpen, count:activeGates.length },
                    ].map(tab=>{
                      const isActive = activeTab===tab.id;
                      const TabIcon = tab.icon;
                      return (
                        <button key={tab.id} type="button" onClick={()=>setActiveTab(tab.id)}
                          data-testid={`tab-${tab.id}`}
                          className={`relative flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all duration-300 min-w-[90px]
                            ${isActive ? 'bg-white shadow-md border-2 scale-[1.02]' : 'bg-transparent border-2 border-transparent hover:bg-white/60 hover:shadow-sm'}`}
                          style={isActive?{borderColor:"#1d4ed8"}:{}}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                            style={isActive?{backgroundColor:"#dbeafe",color:"#1d4ed8"}:{backgroundColor:"#f3f4f6",color:"#6b7280"}}>
                            <TabIcon className="w-5 h-5"/>
                          </div>
                          <span className="text-xs font-cairo transition-colors" style={isActive?{fontWeight:700,color:"#1d4ed8"}:{color:"#6b7280"}}>
                            {tab.label}
                          </span>
                          {tab.count!==null && tab.count>0 && (
                            <span className="absolute -top-1.5 -left-1.5 min-w-5 h-5 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                              style={{backgroundColor:isActive?"#1d4ed8":"#9ca3af"}}>
                              {tab.count}
                            </span>
                          )}
                          {isActive && <div className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-blue-600"/>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MAP TAB → الأبواب */}
                <TabsContent value="map" className="space-y-2" style={{ animation: 'tabSlideIn 0.3s ease-out' }}>
                  {/* Toolbar: Legend */}
                  <div className="flex items-center justify-between bg-white border rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      {activeSession?.status === "draft" && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-700 font-medium">
                          <Crosshair className="w-3 h-3" />
                          {isAr ? "اسحب الباب لتغيير موقعه" : "Drag gate to reposition"}
                        </div>
                      )}
                      <div className="w-px h-5 bg-slate-200 hidden sm:block" />
                      {/* Legend inline */}
                      <div className="hidden sm:flex items-center gap-2 text-[9px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{isAr?"مفتوح":"Open"}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{isAr?"مغلق":"Closed"}</span>
                        <span className="w-px h-3 bg-slate-200" />
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:"#22c55e"}} />{isAr?"خفيف":"Light"}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:"#f59e0b"}} />{isAr?"متوسط":"Medium"}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:"#ef4444"}} />{isAr?"مزدحم":"Crowded"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Map + Side Panel layout */}
                  <div className="relative rounded-xl overflow-hidden border border-slate-200/60" style={{ height:'min(680px, calc(100vh - 260px))' }}>
                    {/* Panel toggle handle */}
                    <div className="absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-300" style={{ right: statsPanelCollapsed ? 0 : '38%' }}>
                      <button onClick={() => setStatsPanelCollapsed(p => !p)}
                        className="flex items-center justify-center w-5 h-14 bg-blue-600 hover:bg-blue-700 rounded-r-none rounded-l-lg shadow-lg transition-colors">
                        <ChevronRight className="w-3 h-3 text-white transition-transform duration-300" style={{ transform: statsPanelCollapsed ? 'rotate(180deg)' : '' }} />
                      </button>
                    </div>

                    {/* Map area */}
                    <div className="absolute inset-0">
                    {selectedFloor?.image_url ? (
                      <div ref={wheelRef} className="relative bg-slate-100 overflow-hidden h-full" style={{ cursor: draggingGateId ? "grabbing" : isPanning ? "grabbing" : "grab", touchAction: "none" }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => { handleMouseUp(); setHoveredGate(null); }} onTouchStart={handleTouchStartGates} onTouchMove={handleTouchMoveGates} onTouchEnd={handleTouchEndGates} onTouchCancel={handleTouchEndGates} data-testid="gate-map-container">
                        {/* Zoom controls inside map */}
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 border rounded-lg p-1 bg-white/90 backdrop-blur shadow-sm">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c=mapContainerRef.current; if(!c)return; const r=c.getBoundingClientRect(); const cx=r.width/2,cy=r.height/2; const p=zoomRef.current; const nz=Math.max(0.5,p*0.8); const s=nz/p; zoomRef.current=nz; setZoom(nz); setPanOffset(o=>({x:cx-s*(cx-o.x),y:cy-s*(cy-o.y)})); }}><ZoomOut className="w-3.5 h-3.5" /></Button>
                          <span className="text-[11px] w-10 text-center font-medium text-slate-500">{Math.round(zoom*100)}%</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c=mapContainerRef.current; if(!c)return; const r=c.getBoundingClientRect(); const cx=r.width/2,cy=r.height/2; const p=zoomRef.current; const nz=Math.min(6,p*1.25); const s=nz/p; zoomRef.current=nz; setZoom(nz); setPanOffset(o=>({x:cx-s*(cx-o.x),y:cy-s*(cy-o.y)})); }}><ZoomIn className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { zoomRef.current=1; setZoom(1); setPanOffset({x:0,y:0}); }}><Maximize2 className="w-3.5 h-3.5" /></Button>
                        </div>
                        <div style={{ transform: `translate(${panOffset.x}px,${panOffset.y}px) scale(${zoom})`, transformOrigin: "0 0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {(() => {
                            const ce = mapContainerRef.current;
                            let ws = { position: "relative", width: "100%", height: "100%" };
                            if (imgRatio && ce) { const cw=ce.clientWidth, ch=ce.clientHeight; if (cw/ch > imgRatio) ws = { position:"relative", height:"100%", width: ch*imgRatio }; else ws = { position:"relative", width:"100%", height: cw/imgRatio }; }
                            return (
                              <div style={ws}>
                                <img src={selectedFloor.image_url} alt="" style={{ width:"100%", height:"100%", display:"block" }} draggable={false} className="pointer-events-none select-none" onLoad={(e) => setImgRatio(e.target.naturalWidth/e.target.naturalHeight)} />
                                <svg ref={svgRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", overflow:"visible" }} viewBox="0 0 100 100" preserveAspectRatio="none" data-testid="gate-map-svg">
                                  {activeGates.map(gate => {
                                    const isOpen = gate.status === "open";
                                    const INDICATOR_COLORS = { light: "#22c55e", medium: "#f59e0b", crowded: "#ef4444" };
                                    const statusColor = isOpen ? "#22c55e" : "#94a3b8";
                                    const indicatorColor = isOpen ? (INDICATOR_COLORS[gate.indicator || "light"] || "#22c55e") : "#94a3b8";
                                    const markerColor = isOpen ? indicatorColor : statusColor;
                                    const isDragging = draggingGateId === gate.id;
                                    const isHov = hoveredGate?.id === gate.id;
                                    const isDraft = activeSession?.status === "draft" && canCreateSession;
                                    const ar = imgRatio || 1;
                                    const baseR = 0.45;
                                    const r = isDragging ? baseR * 1.8 : isHov ? baseR * 1.5 : baseR;
                                    const showLabel = isDragging || isHov;
                                    return (
                                      <g key={gate.id} data-testid={`gate-marker-${gate.id}`} data-gate-id={gate.id}
                                        onMouseEnter={() => { if (!draggingGateId) setHoveredGate(gate); }}
                                        onMouseLeave={() => setHoveredGate(null)}
                                        onMouseDown={(e) => handleGateMouseDown(e, gate.id)}
                                        onTouchStart={(e) => handleGateTouchStart(e, gate.id)}
                                        onClick={() => { if (!hasDraggedRef.current && isDraft) { setSelectedGate(gate); setShowGateDialog(true); } }}
                                        style={{ cursor: isDraft ? (isDragging ? "grabbing" : "grab") : "default" }}>
                                        {/* Pulse */}
                                        <ellipse cx={gate.x} cy={gate.y} rx={r + 1.5} ry={(r + 1.5) * ar} fill={markerColor} fillOpacity="0">
                                          <animate attributeName="fill-opacity" values="0.12;0;0.12" dur="2s" repeatCount="indefinite" />
                                          <animate attributeName="rx" values={`${r + 0.5};${r + 2.5};${r + 0.5}`} dur="2s" repeatCount="indefinite" />
                                          <animate attributeName="ry" values={`${(r + 0.5) * ar};${(r + 2.5) * ar};${(r + 0.5) * ar}`} dur="2s" repeatCount="indefinite" />
                                        </ellipse>
                                        {/* Outer indicator ring for open gates */}
                                        {isOpen && !isDragging && indicatorColor !== statusColor && (
                                          <ellipse cx={gate.x} cy={gate.y} rx={r + 0.5} ry={(r + 0.5) * ar} fill="none" stroke={indicatorColor} strokeWidth="0.25" vectorEffect="non-scaling-stroke" strokeOpacity="0.6" />
                                        )}
                                        {/* Selection ring when dragging */}
                                        {isDragging && <ellipse cx={gate.x} cy={gate.y} rx={r + 0.8} ry={(r + 0.8) * ar} fill="none" stroke="#3b82f6" strokeWidth="0.2" vectorEffect="non-scaling-stroke" strokeDasharray="1.5 0.8"><animate attributeName="stroke-dashoffset" values="0;4.6" dur="1s" repeatCount="indefinite" /></ellipse>}
                                        {/* Hover ring */}
                                        {isHov && !isDragging && <ellipse cx={gate.x} cy={gate.y} rx={r + 0.4} ry={(r + 0.4) * ar} fill="none" stroke={markerColor} strokeWidth="0.15" vectorEffect="non-scaling-stroke" />}
                                        {/* Main marker - uses indicator color for open gates */}
                                        <ellipse cx={gate.x} cy={gate.y} rx={r} ry={r * ar} fill={isDragging ? "#3b82f6" : markerColor} stroke="white" strokeWidth={isDragging ? "0.25" : "0.15"} vectorEffect="non-scaling-stroke" style={{ filter: isDragging ? "drop-shadow(0 0 4px rgba(59,130,246,0.5))" : "none", transition: isDragging ? "none" : "all 0.15s ease" }} />
                                        {/* Staff count badge */}
                                        {!isDragging && (gate.assigned_staff || 0) > 0 && (
                                          <g style={{ pointerEvents: "none" }}>
                                            <circle cx={gate.x + r * 0.7} cy={gate.y - r * ar * 0.7} r="0.45" fill="#3b82f6" stroke="white" strokeWidth="0.06" vectorEffect="non-scaling-stroke" />
                                            <text x={gate.x + r * 0.7} y={gate.y - r * ar * 0.7} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="0.55" fontWeight="800">{gate.assigned_staff}</text>
                                          </g>
                                        )}
                                        {/* Warning: open gate with no staff */}
                                        {!isDragging && gate.status === "open" && (gate.assigned_staff || 0) === 0 && (
                                          <g style={{ pointerEvents: "none" }}>
                                            <circle cx={gate.x + r * 0.7} cy={gate.y - r * ar * 0.7} r="0.4" fill="#f59e0b" stroke="white" strokeWidth="0.06" vectorEffect="non-scaling-stroke">
                                              <animate attributeName="fill-opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                                            </circle>
                                            <text x={gate.x + r * 0.7} y={gate.y - r * ar * 0.7} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="0.5" fontWeight="800">!</text>
                                          </g>
                                        )}
                                        {/* Crosshair in edit mode */}
                                        {isDraft && (isHov || isDragging) && (
                                          <g transform={`translate(${gate.x}, ${gate.y})`} style={{ pointerEvents: "none" }}>
                                            <line x1="-0.25" y1="0" x2="0.25" y2="0" stroke="white" strokeWidth="0.06" vectorEffect="non-scaling-stroke" />
                                            <line x1="0" y1={-0.25 * ar} x2="0" y2={0.25 * ar} stroke="white" strokeWidth="0.06" vectorEffect="non-scaling-stroke" />
                                          </g>
                                        )}
                                        {/* Label */}
                                        {showLabel && (
                                          <g style={{ pointerEvents: "none" }}>
                                            <rect x={gate.x - 6} y={gate.y - r * ar - 2.2} width="12" height="1.6" rx="0.4" fill="white" fillOpacity="0.92" stroke={isDragging ? "#3b82f6" : markerColor} strokeWidth="0.06" vectorEffect="non-scaling-stroke" />
                                            <text x={gate.x} y={gate.y - r * ar - 1.1} textAnchor="middle" dominantBaseline="middle" fill={isDragging ? "#3b82f6" : "#1e293b"} fontSize="1.1" fontWeight="700" fontFamily="Cairo, sans-serif">{gate.name_ar}</text>
                                          </g>
                                        )}
                                      </g>
                                    );
                                  })}
                                  {removedGates.map(gate => (
                                    <g key={gate.id}><circle cx={gate.x} cy={gate.y} r="0.5" fill="#ef4444" fillOpacity={0.15} stroke="#ef4444" strokeWidth="0.1" strokeDasharray="0.4 0.3" vectorEffect="non-scaling-stroke" />
                                    <line x1={gate.x-0.4} y1={gate.y-0.4} x2={gate.x+0.4} y2={gate.y+0.4} stroke="#ef4444" strokeWidth="0.15" vectorEffect="non-scaling-stroke" opacity="0.5" />
                                    <line x1={gate.x+0.4} y1={gate.y-0.4} x2={gate.x-0.4} y2={gate.y+0.4} stroke="#ef4444" strokeWidth="0.15" vectorEffect="non-scaling-stroke" opacity="0.5" /></g>
                                  ))}
                                </svg>
                              </div>
                            );
                          })()}
                        </div>
                        {/* Rich Tooltip */}
                        {hoveredGate && !draggingGateId && !isPanning && (() => {
                          const sc = STATUS_CONFIG[hoveredGate.status] || STATUS_CONFIG.closed;
                          const INDICATOR_LABELS = { light: { ar: "خفيف", en: "Light", color: "#22c55e" }, medium: { ar: "متوسط", en: "Medium", color: "#f59e0b" }, crowded: { ar: "مزدحم", en: "Crowded", color: "#ef4444" } };
                          const TYPE_LABELS = { main: "رئيسي", secondary: "فرعي", escalator: "سلم كهربائي", elevator: "مصعد", stairs: "درج", bridge: "جسر", wheelchair: "عربات", emergency: "طوارئ" };
                          const CLASS_LABELS = { general: "عام", men: "رجال", women: "نساء", emergency: "طوارئ", funeral: "جنائز" };
                          const DIR_LABELS = { entry: "دخول", exit: "خروج", both: "دخول وخروج" };
                          const ind = INDICATOR_LABELS[hoveredGate.indicator || "light"] || INDICATOR_LABELS.light;
                          const cl = CHANGE_LABELS[hoveredGate.change_type] || CHANGE_LABELS.unchanged;
                          const hasChange = hoveredGate.change_type && hoveredGate.change_type !== "unchanged";
                          const isOpen = hoveredGate.status === "open";
                          const topColor = isOpen ? ind.color : sc.color;
                          const gateType = TYPE_LABELS[hoveredGate.gate_type] || hoveredGate.gate_type || "";
                          const gateClass = CLASS_LABELS[hoveredGate.classification] || hoveredGate.classification || "";
                          const gateDir = DIR_LABELS[hoveredGate.direction] || hoveredGate.direction || "";
                          return (
                            <div className="absolute pointer-events-none z-50" style={{ left:tooltipPos.x, top:tooltipPos.y }}>
                              <div className="bg-white/97 backdrop-blur-md rounded-xl shadow-2xl border overflow-hidden min-w-[230px]" style={{ direction:"rtl" }}>
                                <div className="h-1.5" style={{ backgroundColor: topColor }} />
                                <div className="p-3 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: sc.color }}><DoorOpen className="w-4 h-4 text-white" /></span>
                                      <span className="font-bold text-sm">{hoveredGate.name_ar}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{backgroundColor:`${sc.color}15`,color:sc.color}}>{isAr ? sc.label_ar : sc.label_en}</span>
                                      {isOpen && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{backgroundColor:`${ind.color}15`,color:ind.color}}>{isAr ? ind.ar : ind.en}</span>}
                                    </div>
                                  </div>
                                  {hasChange && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{backgroundColor:cl.bg,color:cl.color}}>{isAr?cl.ar:cl.en}</span>}
                                  <div className="border-t border-dashed border-slate-200" />
                                  <div className="space-y-1 text-[11px]">
                                    {hoveredGate.plaza && <div className="flex justify-between"><span className="text-slate-500">{isAr?"المنطقة":"Plaza"}</span><span className="font-medium" style={{color: hoveredGate.plaza_color || '#333'}}>{hoveredGate.plaza}</span></div>}
                                    {gateType && <div className="flex justify-between"><span className="text-slate-500">{isAr?"النوع":"Type"}</span><span className="font-medium">{gateType}</span></div>}
                                    {gateDir && <div className="flex justify-between"><span className="text-slate-500">{isAr?"المسار":"Direction"}</span><span>{gateDir}</span></div>}
                                    {hoveredGate.category && hoveredGate.category.length > 0 && <div className="flex justify-between"><span className="text-slate-500">{isAr?"الفئة":"Category"}</span><span>{hoveredGate.category.join("، ")}</span></div>}
                                    {gateClass && <div className="flex justify-between"><span className="text-slate-500">{isAr?"التصنيف":"Class"}</span><span>{gateClass}</span></div>}
                                  </div>
                                  {hoveredGate.assigned_staff > 0 && <div className="flex items-center gap-1 text-[10px] text-blue-600 pt-1 border-t border-dashed border-slate-200"><Users className="w-3 h-3" />{hoveredGate.assigned_staff} {isAr?"موظف":"staff"}</div>}
                                  {hoveredGate.assigned_staff === 0 && hoveredGate.status === "open" && <p className="text-[10px] text-amber-600 font-medium pt-1 border-t border-dashed border-slate-200"><AlertCircle className="w-3 h-3 inline ml-0.5" />{isAr?"بدون موظفين!":"No staff!"}</p>}
                                  {hoveredGate.daily_note && <p className="text-[10px] text-slate-500 pt-1 border-t border-dashed border-slate-200">{hoveredGate.daily_note}</p>}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">{isAr?"لا توجد خريطة":"No map"}</div>
                    )}
                    </div>

                    {/* ── Side Panel: Gate Stats ── */}
                    <div
                      className="absolute top-0 bottom-0 right-0 bg-white border-l border-slate-200 overflow-y-auto shadow-xl z-25"
                      style={{ width: '38%', transform: statsPanelCollapsed ? 'translateX(100%)' : 'translateX(0)', transition: 'transform 0.3s ease' }}
                      data-testid="gates-stats-panel"
                    >
                      <div className="p-4 space-y-3">
                        <div className="text-center">
                          <p className="text-[12px] font-bold font-cairo text-slate-600">{isAr ? "لوحة الأبواب" : "Gates Panel"}</p>
                        </div>
                        <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />

                        {/* KPIs Row 1 */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: isAr?"الإجمالي":"Total", value: stats.total, icon: DoorOpen, color: "#1d4ed8", bg: "#eff6ff" },
                            { label: isAr?"مفتوح":"Open", value: stats.open, icon: DoorOpen, color: "#059669", bg: "#ecfdf5" },
                            { label: isAr?"مغلق":"Closed", value: stats.closed, icon: DoorClosed, color: "#6b7280", bg: "#f1f5f9" },
                          ].map((kpi, i) => {
                            const Icon = kpi.icon;
                            return (
                              <div key={i} className="relative rounded-xl p-2 border border-slate-100 bg-white overflow-hidden">
                                <div className="absolute top-0 right-0 w-10 h-10 rounded-bl-[2rem] opacity-[0.06]" style={{ backgroundColor: kpi.color }} />
                                <div className="flex items-start justify-between gap-1 relative">
                                  <div>
                                    <p className="text-[9px] font-medium text-slate-400">{kpi.label}</p>
                                    <span className="text-lg font-extrabold tracking-tight" style={{ color: kpi.color }}>{kpi.value}</span>
                                  </div>
                                  <Icon className="w-4 h-4 mt-0.5" style={{ color: kpi.color, opacity: 0.4 }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* KPIs Row 2 - Indicators */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: isAr?"خفيف":"Light", value: stats.light, color: "#16a34a", cardBg: "#f0fdf4" },
                            { label: isAr?"متوسط":"Medium", value: stats.medium, color: "#f59e0b", cardBg: "#fffbeb" },
                            { label: isAr?"مزدحم":"Crowded", value: stats.crowded, color: "#dc2626", cardBg: "#fef2f2" },
                          ].map((kpi, i) => (
                            <div key={i} className="relative rounded-xl p-2 border overflow-hidden" style={{ backgroundColor: kpi.cardBg, borderColor: kpi.color+"25" }}>
                              <div className="absolute top-0 right-0 w-10 h-10 rounded-bl-[2rem] opacity-[0.08]" style={{ backgroundColor: kpi.color }} />
                              <div className="relative">
                                <p className="text-[9px] font-medium" style={{ color: kpi.color+"99" }}>{kpi.label}</p>
                                <span className="text-lg font-extrabold tracking-tight" style={{ color: kpi.color }}>{kpi.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Coverage */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: isAr?"بدون موظف":"No Staff", value: stats.noStaff, color: stats.noStaff > 0 ? "#dc2626" : "#059669", icon: stats.noStaff > 0 ? AlertTriangle : UserCheck },
                            { label: isAr?"نسبة الفتح":"Open %", value: `${stats.total>0?Math.round(stats.open/stats.total*100):0}%`, color: "#1d4ed8", icon: Activity },
                          ].map((kpi, i) => {
                            const Icon = kpi.icon;
                            return (
                              <div key={i} className="relative rounded-xl p-2.5 border border-slate-100 bg-white overflow-hidden">
                                <div className="flex items-start justify-between gap-1">
                                  <div>
                                    <p className="text-[8px] font-medium text-slate-400">{kpi.label}</p>
                                    <span className="text-lg font-extrabold" style={{ color: kpi.color }}>{kpi.value}</span>
                                  </div>
                                  <Icon className="w-3.5 h-3.5 mt-0.5" style={{ color: kpi.color, opacity: 0.4 }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />

                        {/* Distribution Analytics */}
                        {activeGates.length > 0 && (() => {
                          const total = activeGates.length;
                          const countField = (field, val) => activeGates.filter(g => Array.isArray(g[field]) ? g[field].includes(val) : g[field] === val).length;
                          const INDICATOR_LABELS = { light: isAr?"خفيف":"Light", medium: isAr?"متوسط":"Medium", crowded: isAr?"مزدحم":"Crowded" };
                          const DIR_LABELS = { entry: isAr?"دخول":"Entry", exit: isAr?"خروج":"Exit", both: isAr?"دخول وخروج":"Both" };
                          const DIR_COLORS = { entry: "#2563eb", exit: "#dc2626", both: "#7c3aed" };
                          const CLASS_LABELS = { general: isAr?"عام":"General", men: isAr?"رجال":"Men", women: isAr?"نساء":"Women", emergency: isAr?"طوارئ":"Emergency" };
                          const CLASS_COLORS = { general: "#0f766e", men: "#1d4ed8", women: "#be185d", emergency: "#dc2626" };
                          const TYPE_LABELS = { main: isAr?"رئيسي":"Main", secondary: isAr?"فرعي":"Secondary", escalator: isAr?"سلم":"Escalator", elevator: isAr?"مصعد":"Elevator", stairs: isAr?"درج":"Stairs", bridge: isAr?"جسر":"Bridge" };
                          const TYPE_COLORS = { main: "#6d28d9", secondary: "#0284c7", escalator: "#0f766e", elevator: "#b45309", stairs: "#7c3aed", bridge: "#be185d" };

                          const ChipRow = ({ label, count, color }) => count > 0 ? (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border" style={{ borderColor: color+"40", backgroundColor: color+"08" }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-[8px] font-bold" style={{ color }}>{count}</span>
                              <span className="text-[7px] font-medium" style={{ color: color+"cc" }}>{label}</span>
                            </div>
                          ) : null;

                          // Get unique plazas
                          const plazas = {};
                          activeGates.forEach(g => { if (g.plaza) plazas[g.plaza] = (plazas[g.plaza] || 0) + 1; });

                          return (
                            <div className="space-y-2.5">
                              {/* المناطق */}
                              {Object.keys(plazas).length > 0 && (
                                <div>
                                  <p className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{isAr?"توزيع المناطق":"Plazas"}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(plazas).map(([name, cnt]) => (
                                      <ChipRow key={name} label={name} count={cnt} color={activeGates.find(g => g.plaza === name)?.plaza_color || "#0284c7"} />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* المسار */}
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1"><ArrowLeftRight className="w-3 h-3" />{isAr?"المسار":"Direction"}</p>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(DIR_LABELS).map(([key, label]) => <ChipRow key={key} label={label} count={countField('direction', key)} color={DIR_COLORS[key] || "#6b7280"} />)}
                                </div>
                              </div>
                              {/* النوع */}
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1"><Tag className="w-3 h-3" />{isAr?"نوع الباب":"Type"}</p>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(TYPE_LABELS).map(([key, label]) => <ChipRow key={key} label={label} count={countField('gate_type', key)} color={TYPE_COLORS[key] || "#6b7280"} />)}
                                </div>
                              </div>
                              {/* التصنيف */}
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1"><Shield className="w-3 h-3" />{isAr?"التصنيف":"Class"}</p>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(CLASS_LABELS).map(([key, label]) => <ChipRow key={key} label={label} count={countField('classification', key)} color={CLASS_COLORS[key] || "#6b7280"} />)}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />

                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── سجل التغييرات تحت الخريطة ── */}
                  {changedGates.length > 0 && (
                    <div className="rounded-2xl overflow-hidden" style={{ background:"linear-gradient(135deg,#eff6ff 0%,#dbeafe 50%,#eff6ff 100%)", border:"1px solid #bfdbfe" }} data-testid="gate-changes-log">
                      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor:"#93c5fd" }}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Activity className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-blue-900 font-cairo">{isAr?"سجل التغييرات":"Changes Log"}</p>
                            <p className="text-[8px] text-blue-500">{changedGates.length} {isAr?"تغيير في هذه الجولة":"changes"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {changedGates.map(gate => {
                            const sc = STATUS_CONFIG[gate.status] || STATUS_CONFIG.closed;
                            const cl = CHANGE_LABELS[gate.change_type] || CHANGE_LABELS.unchanged;
                            const isOpen = gate.status === "open";
                            const INDICATOR_LABELS = { light:"خفيف", medium:"متوسط", crowded:"مزدحم" };
                            return (
                              <div key={gate.id} className="bg-white/80 rounded-xl p-2.5 border border-white/60 hover:shadow-sm transition-all" data-testid={`gate-change-${gate.id}`}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: sc.color }}>
                                    <DoorOpen className="w-3 h-3 text-white" />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-700 truncate flex-1">{gate.name_ar}</span>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cl.bg, color: cl.color }}>{isAr?cl.ar:cl.en}</span>
                                  <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: sc.color+"15", color: sc.color }}>{isAr?sc.label_ar:sc.label_en}</span>
                                  {isOpen && gate.indicator && gate.indicator !== "light" && (
                                    <span className="text-[8px] font-medium text-amber-600">{INDICATOR_LABELS[gate.indicator]}</span>
                                  )}
                                </div>
                                {gate.daily_note && <p className="text-[7px] text-slate-400 mt-1 truncate">{gate.daily_note}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* GATES TAB → الكثافات */}
                <TabsContent value="gates" className="space-y-3" style={{ animation: 'tabSlideIn 0.3s ease-out' }}>
                  <GatesTab
                    activeGates={activeGates}
                    removedGates={removedGates}
                    activeSession={activeSession}
                    isAr={isAr}
                    onUpdateGate={handleUpdateGate}
                  />
                </TabsContent>

                {/* EMPLOYEES TAB */}
                <TabsContent value="employees" className="space-y-3" style={{ animation: 'tabSlideIn 0.3s ease-out' }}>
                  <EmployeesTab
                    activeGates={activeGates}
                    activeSession={activeSession}
                    isAr={isAr}
                    onUpdateGate={handleUpdateGate}
                    selectedFloor={selectedFloor}
                    imgRatio={imgRatio}
                    STATUS_CONFIG={STATUS_CONFIG}
                  />
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
            {activeSession?.status === "draft" && selectedGate && canCreateSession && <Button onClick={() => { handleUpdateGate(selectedGate.id, {daily_note:selectedGate.daily_note}); setShowGateDialog(false); }} data-testid="save-gate-changes"><Save className="w-4 h-4 ml-1" />{isAr?"حفظ":"Save"}</Button>}
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
