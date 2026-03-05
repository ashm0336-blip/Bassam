import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
  Plus, Trash2, Save, X, Calendar as CalendarIcon, ChevronRight, ChevronLeft,
  Eye, Clock, FileText, CheckCircle2, AlertCircle, ArrowLeftRight,
  RefreshCw, Edit2, MessageSquare, Layers, ZoomIn, ZoomOut, Maximize2,
  RotateCcw, CircleDot, CircleOff, Tag, CalendarRange, DoorOpen, DoorClosed,
  Wrench, ArrowUpRight, ArrowDownRight, Users, FileStack, Database,
  Hand, MousePointer2
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
import { GatesTab } from "./DailyGateSessions/GatesTab";
import { EmployeesTab } from "./DailyGateSessions/EmployeesTab";
import { ArchiveSidebar } from "./DailyGateSessions/ArchiveSidebar";

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
  const [filterStatus, setFilterStatus] = useState("all");

  // Map
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [imgRatio, setImgRatio] = useState(null);
  const [hoveredGate, setHoveredGate] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [mapMode, setMapMode] = useState("pan"); // "pan" | "edit"
  const [draggingGateId, setDraggingGateId] = useState(null);
  const zoomRef = useRef(1);
  const mapContainerRef = useRef(null);
  const svgRef = useRef(null);

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

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (mapMode === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } else if (mapMode === "edit") {
      if (!e.target.closest("[data-gate-id]")) {
        // clicked empty space in edit mode - do nothing
      }
    }
  };
  const handleGateMouseDown = (e, gateId) => {
    if (mapMode !== "edit" || activeSession?.status !== "draft") return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingGateId(gateId);
  };
  const getClientXY = (e) => {
    if (e.touches && e.touches.length > 0) return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches.length > 0) return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    return { clientX: e.clientX, clientY: e.clientY };
  };
  const getMousePercent = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const { clientX, clientY } = getClientXY(e);
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const t = pt.matrixTransform(ctm.inverse());
    return { x: Math.max(0, Math.min(100, t.x)), y: Math.max(0, Math.min(100, t.y)) };
  };
  const handleMouseMove = (e) => {
    if (draggingGateId && mapMode === "edit") {
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
  // Touch event handlers for gates map
  const handleTouchStartGates = (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const { clientX, clientY } = getClientXY(e);
    if (mapMode === "pan") {
      setIsPanning(true);
      setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
    }
  };
  const handleGateTouchStart = (e, gateId) => {
    if (mapMode !== "edit" || activeSession?.status !== "draft") return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingGateId(gateId);
  };
  const handleTouchMoveGates = (e) => {
    if (e.touches.length !== 1) return;
    const { clientX, clientY } = getClientXY(e);
    if (draggingGateId && mapMode === "edit") {
      e.preventDefault();
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
        {/* Sidebar: Archive System */}
        <div className="lg:col-span-1">
          <ArchiveSidebar
            sessions={sessions}
            activeSession={activeSession}
            isAr={isAr}
            today={today}
            onSelectSession={(s) => { setActiveSession(s); setZoom(1); setPanOffset({x:0,y:0}); zoomRef.current=1; }}
            onDeleteSession={handleDeleteSession}
            onNewSession={() => { setCloneSource("auto"); setNewSessionDate(today); setShowNewSessionDialog(true); }}
            onCalendarClick={(ds) => { setNewSessionDate(ds); setCloneSource("auto"); setShowNewSessionDialog(true); }}
          />
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
                        <span className="text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 ml-3"><span className="w-2 h-2 rounded-full bg-blue-500" />{stats.total} {isAr ? "باب" : "gates"}</span>
                          <span className="inline-flex items-center gap-1 ml-3"><span className="w-2 h-2 rounded-full bg-emerald-500" />{stats.open} {isAr ? "مفتوح" : "open"}</span>
                          <span className="inline-flex items-center gap-1 ml-3"><span className="w-2 h-2 rounded-full bg-red-500" />{stats.closed} {isAr ? "مغلق" : "closed"}</span>
                          {stats.crowded > 0 && <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium"><span className="w-2 h-2 rounded-full bg-red-500" />{stats.crowded} {isAr ? "مزدحم" : "crowded"}</span>}
                          {stats.medium > 0 && <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium"><span className="w-2 h-2 rounded-full bg-amber-500" />{stats.medium} {isAr ? "متوسط" : "medium"}</span>}
                        </span>
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
                {/* Professional Tab Bar */}
                <div className="rounded-2xl p-2 mb-4" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }} data-testid="daily-tabs-bar">
                  <div className="flex items-center justify-center gap-2">
                    {[
                      { id: 'map', label: isAr ? 'الخريطة' : 'Map', icon: DoorOpen, count: null },
                      { id: 'gates', label: isAr ? 'الأبواب' : 'Gates', icon: Tag, count: activeGates.length },
                      { id: 'employees', label: isAr ? 'الموظفين' : 'Staff', icon: Users, count: null },
                      { id: 'changes', label: isAr ? 'التغييرات' : 'Changes', icon: FileText, count: changedGates.length || null },
                    ].map(tab => {
                      const isActive = activeTab === tab.id;
                      const TabIcon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          data-testid={`tab-${tab.id}`}
                          className={`relative flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl transition-all duration-300 min-w-[90px]
                            ${isActive
                              ? 'bg-white shadow-md border-2 scale-[1.02]'
                              : 'bg-transparent border-2 border-transparent hover:bg-white/60 hover:shadow-sm'
                            }`}
                          style={isActive ? { borderColor: '#2563eb' } : {}}
                        >
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${isActive ? 'shadow-sm' : ''}`}
                            style={isActive ? { backgroundColor: '#eff6ff', color: '#2563eb' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
                          >
                            <TabIcon className="w-5 h-5" />
                          </div>
                          <span
                            className={`text-xs font-medium transition-colors duration-300 ${isActive ? 'font-bold' : 'text-gray-500'}`}
                            style={isActive ? { color: '#2563eb' } : {}}
                          >
                            {tab.label}
                          </span>
                          {tab.count !== null && tab.count > 0 && (
                            <span
                              className={`absolute -top-1 -left-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
                              style={{ backgroundColor: tab.id === 'changes' ? '#ef4444' : (isActive ? '#2563eb' : '#9ca3af') }}
                            >
                              {tab.count}
                            </span>
                          )}
                          {isActive && (
                            <div className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-1 rounded-full" style={{ backgroundColor: '#2563eb' }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MAP TAB - Rich map with markers, tooltips, stats */}
                <TabsContent value="map" className="space-y-3" style={{ animation: 'tabSlideIn 0.3s ease-out' }}>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="rounded-xl border bg-gradient-to-bl from-blue-50 to-white p-3">
                      <p className="text-[10px] text-muted-foreground">{isAr ? "إجمالي" : "Total"}</p>
                      <p className="text-xl font-bold text-blue-700">{stats.total}</p>
                    </div>
                    <div className="rounded-xl border bg-gradient-to-bl from-emerald-50 to-white p-3">
                      <p className="text-[10px] text-muted-foreground">{isAr ? "مفتوح" : "Open"}</p>
                      <p className="text-xl font-bold text-emerald-600">{stats.open}</p>
                    </div>
                    <div className="rounded-xl border bg-gradient-to-bl from-red-50 to-white p-3">
                      <p className="text-[10px] text-muted-foreground">{isAr ? "مغلق" : "Closed"}</p>
                      <p className="text-xl font-bold text-red-600">{stats.closed}</p>
                    </div>
                    <div className="rounded-xl border bg-gradient-to-bl from-orange-50 to-white p-3">
                      <p className="text-[10px] text-muted-foreground">{isAr ? "مزدحم" : "Crowded"}</p>
                      <p className="text-xl font-bold text-orange-600">{stats.crowded}</p>
                    </div>
                    {stats.noStaff > 0 && (
                      <div className="rounded-xl border bg-amber-50 border-amber-200 p-3">
                        <p className="text-[10px] text-amber-600">{isAr ? "بدون موظفين" : "No Staff"}</p>
                        <p className="text-xl font-bold text-amber-600">{stats.noStaff}</p>
                      </div>
                    )}
                  </div>

                  {/* Toolbar: Mode toggle + Zoom */}
                  <div className="flex items-center justify-between bg-white border rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {activeSession?.status === "draft" && (
                        <>
                          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                            <button onClick={() => { setMapMode("pan"); setDraggingGateId(null); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mapMode === "pan" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`} data-testid="mode-pan">
                              <Hand className="w-3.5 h-3.5" />{isAr ? "تحريك" : "Pan"}
                            </button>
                            <button onClick={() => setMapMode("edit")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mapMode === "edit" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`} data-testid="mode-edit">
                              <MousePointer2 className="w-3.5 h-3.5" />{isAr ? "تعديل المواقع" : "Edit Positions"}
                            </button>
                          </div>
                          {mapMode === "edit" && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-700 font-medium">
                              <MousePointer2 className="w-3 h-3" />{isAr ? "اسحب النقطة للمكان الصحيح" : "Drag markers to reposition"}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-slate-50">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c=mapContainerRef.current; if(!c)return; const r=c.getBoundingClientRect(); const cx=r.width/2,cy=r.height/2; const p=zoomRef.current; const nz=Math.max(0.5,p*0.8); const s=nz/p; zoomRef.current=nz; setZoom(nz); setPanOffset(o=>({x:cx-s*(cx-o.x),y:cy-s*(cy-o.y)})); }}><ZoomOut className="w-3.5 h-3.5" /></Button>
                      <span className="text-[11px] w-10 text-center font-medium text-slate-500">{Math.round(zoom*100)}%</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const c=mapContainerRef.current; if(!c)return; const r=c.getBoundingClientRect(); const cx=r.width/2,cy=r.height/2; const p=zoomRef.current; const nz=Math.min(6,p*1.25); const s=nz/p; zoomRef.current=nz; setZoom(nz); setPanOffset(o=>({x:cx-s*(cx-o.x),y:cy-s*(cy-o.y)})); }}><ZoomIn className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { zoomRef.current=1; setZoom(1); setPanOffset({x:0,y:0}); }}><Maximize2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>

                  {selectedFloor?.image_url ? (
                    <Card className="overflow-hidden"><CardContent className="p-0">
                      <div ref={wheelRef} className={`relative bg-slate-100 overflow-hidden ${mapMode === "edit" && activeSession?.status === "draft" ? "ring-2 ring-blue-400/50" : ""}`} style={{ height: "550px", cursor: draggingGateId ? "grabbing" : mapMode === "edit" ? "default" : isPanning ? "grabbing" : "grab", touchAction: "none" }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => { handleMouseUp(); setHoveredGate(null); }} onTouchStart={handleTouchStartGates} onTouchMove={handleTouchMoveGates} onTouchEnd={handleTouchEndGates} onTouchCancel={handleTouchEndGates} data-testid="gate-map-container">
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
                                    const statusColor = isOpen ? "#22c55e" : "#ef4444";
                                    const indicatorColor = isOpen ? (INDICATOR_COLORS[gate.indicator || "light"] || "#22c55e") : "#ef4444";
                                    const markerColor = isOpen ? indicatorColor : statusColor;
                                    const isDragging = draggingGateId === gate.id;
                                    const isHov = hoveredGate?.id === gate.id;
                                    const isEditMode = mapMode === "edit" && activeSession?.status === "draft";
                                    const ar = imgRatio || 1;
                                    const baseR = 0.7;
                                    const r = isDragging ? baseR * 1.6 : isHov ? baseR * 1.3 : baseR;
                                    const showLabel = isDragging || (isHov && isEditMode);
                                    return (
                                      <g key={gate.id} data-testid={`gate-marker-${gate.id}`} data-gate-id={gate.id}
                                        onMouseEnter={() => { if (!draggingGateId) setHoveredGate(gate); }}
                                        onMouseLeave={() => setHoveredGate(null)}
                                        onMouseDown={(e) => handleGateMouseDown(e, gate.id)}
                                        onTouchStart={(e) => handleGateTouchStart(e, gate.id)}
                                        onClick={() => { if (!isEditMode && activeSession?.status === "draft") { setSelectedGate(gate); setShowGateDialog(true); } }}
                                        style={{ cursor: isEditMode ? (isDragging ? "grabbing" : "grab") : activeSession?.status === "draft" ? "pointer" : "default" }}>
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
                                        {isEditMode && (isHov || isDragging) && (
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
                        {/* Edit mode indicator */}
                        {mapMode === "edit" && activeSession?.status === "draft" && (
                          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                            <MousePointer2 className="w-3.5 h-3.5" />{isAr ? "وضع التعديل - اسحب النقاط" : "Edit Mode - Drag Markers"}
                          </div>
                        )}
                        {/* Legend */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-sm">
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                            <span>{isAr ? "الحالة:" : "Status:"}</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{isAr ? "مفتوح" : "Open"}</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />{isAr ? "مغلق" : "Closed"}</span>
                          </div>
                          <div className="w-px h-4 bg-slate-200" />
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                            <span>{isAr ? "الازدحام:" : "Crowd:"}</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:"#22c55e"}} />{isAr ? "خفيف" : "Light"}</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:"#f59e0b"}} />{isAr ? "متوسط" : "Medium"}</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:"#ef4444"}} />{isAr ? "مزدحم" : "Crowded"}</span>
                          </div>
                        </div>
                        {/* Rich Tooltip (pan mode only) */}
                        {hoveredGate && !draggingGateId && mapMode === "pan" && (() => {
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
                                      <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: sc.color }}>
                                        <DoorOpen className="w-4 h-4 text-white" />
                                      </span>
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
                    </CardContent></Card>
                  ) : <Card><CardContent className="py-12 text-center text-muted-foreground">{isAr?"لا توجد خريطة":"No map"}</CardContent></Card>}
                </TabsContent>

                {/* GATES TAB - Quick status toggle cards */}
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
                  />
                </TabsContent>

                {/* CHANGES TAB */}
                <TabsContent value="changes" style={{ animation: 'tabSlideIn 0.3s ease-out' }}>
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
