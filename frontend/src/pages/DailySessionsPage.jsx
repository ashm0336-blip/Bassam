import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Plus, Trash2, Save, X, Calendar as CalendarIcon, ChevronRight, ChevronLeft,
  Eye, Clock, FileText, CheckCircle2, AlertCircle, ArrowLeftRight, MapPin,
  RefreshCw, Edit2, MessageSquare, Layers, ZoomIn, ZoomOut, Maximize2,
  Hand, RotateCcw, Pencil, Check, CircleDot, CircleOff, ArrowRight, Tag
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ZONE_TYPES = [
  { value: "men_prayer", label_ar: "مصلى رجال", label_en: "Men Prayer", color: "#22c55e", icon: "M" },
  { value: "women_prayer", label_ar: "مصلى نساء", label_en: "Women Prayer", color: "#3b82f6", icon: "W" },
  { value: "mataf", label_ar: "صحن المطاف", label_en: "Mataf", color: "#84cc16", icon: "T" },
  { value: "masaa", label_ar: "المسعى", label_en: "Masa'a", color: "#06b6d4", icon: "S" },
  { value: "service", label_ar: "منطقة خدمات", label_en: "Service", color: "#6b7280", icon: "X" },
  { value: "entry", label_ar: "مدخل", label_en: "Entry", color: "#10b981", icon: "E" },
  { value: "exit", label_ar: "مخرج", label_en: "Exit", color: "#ef4444", icon: "O" },
  { value: "escalator", label_ar: "سلم كهربائي", label_en: "Escalator", color: "#8b5cf6", icon: "L" },
  { value: "kaaba", label_ar: "الكعبة المشرفة", label_en: "Kaaba", color: "#1a1a1a", icon: "K" },
  { value: "expansion", label_ar: "توسعة", label_en: "Expansion", color: "#64748b", icon: "P" },
];

const CHANGE_LABELS = {
  added: { ar: "مضاف", en: "Added", color: "#22c55e", bg: "#dcfce7" },
  removed: { ar: "تم الإزالة", en: "Removed", color: "#ef4444", bg: "#fef2f2" },
  modified: { ar: "معدّل", en: "Modified", color: "#f59e0b", bg: "#fefce8" },
  category_changed: { ar: "تغيير فئة", en: "Category Changed", color: "#8b5cf6", bg: "#f5f3ff" },
  moved: { ar: "تم النقل", en: "Moved", color: "#06b6d4", bg: "#ecfeff" },
  unchanged: { ar: "بدون تغيير", en: "Unchanged", color: "#94a3b8", bg: "#f8fafc" },
};

export default function DailySessionsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  // Core state
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState("map");
  const [selectedZone, setSelectedZone] = useState(null);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareSession, setCompareSession] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [newSessionDate, setNewSessionDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  // Map state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [imgRatio, setImgRatio] = useState(null);
  const [hoveredZone, setHoveredZone] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const mapContainerRef = useRef(null);
  const svgRef = useRef(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const normalizeImageUrl = (url) => {
    if (!url) return url;
    let value = url;
    if (value.includes(".preview.emergentagent.com") && !value.startsWith(process.env.REACT_APP_BACKEND_URL)) {
      const pathMatch = value.match(/\/(?:api\/)?uploads\/.+$/);
      if (pathMatch) value = `${process.env.REACT_APP_BACKEND_URL}${pathMatch[0].startsWith("/api") ? pathMatch[0] : "/api" + pathMatch[0]}`;
    }
    if (value.startsWith("/")) value = `${process.env.REACT_APP_BACKEND_URL}${value}`;
    else if (value.startsWith("uploads/")) value = `${process.env.REACT_APP_BACKEND_URL}/${value}`;
    if (value.includes("/uploads/") && !value.includes("/api/uploads/")) value = value.replace("/uploads/", "/api/uploads/");
    return value;
  };

  // Fetch floors
  const fetchFloors = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/floors`);
      const normalized = res.data.map(f => ({ ...f, image_url: normalizeImageUrl(f.image_url) }));
      setFloors(normalized);
      normalized.forEach(f => { if (f.image_url) { const img = new Image(); img.src = f.image_url; } });
      if (!selectedFloor && normalized.length > 0) setSelectedFloor(normalized[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  // Fetch sessions for selected floor
  const fetchSessions = useCallback(async () => {
    if (!selectedFloor) return;
    try {
      const res = await axios.get(`${API}/map-sessions?floor_id=${selectedFloor.id}`);
      setSessions(res.data);
    } catch (e) { console.error(e); }
  }, [selectedFloor]);

  useEffect(() => { fetchFloors(); }, [fetchFloors]);
  useEffect(() => {
    if (selectedFloor) {
      fetchSessions();
      setActiveSession(null);
      setImgRatio(null);
    }
  }, [selectedFloor, fetchSessions]);

  // Wheel zoom with callback ref
  const wheelRef = useCallback((node) => {
    if (!node) return;
    mapContainerRef.current = node;
    const handler = (e) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const prev = zoomRef.current;
      const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const nz = Math.max(0.5, Math.min(6, prev * delta));
      const s = nz / prev;
      zoomRef.current = nz;
      setZoom(nz);
      setPanOffset(p => ({ x: mx - s * (mx - p.x), y: my - s * (my - p.y) }));
    };
    node.addEventListener("wheel", handler, { passive: false });
    return () => node.removeEventListener("wheel", handler);
  }, []);

  // Pan handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };
  const handleMouseMove = (e) => {
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
    // Tooltip tracking
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left + 16, y: e.clientY - rect.top - 10 });
    }
  };
  const handleMouseUp = () => setIsPanning(false);

  // SVG path
  const getPath = (points, close = true) => {
    if (!points || points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
    if (close && points.length > 2) d += " Z";
    return d;
  };

  // Create new session
  const handleCreateSession = async () => {
    if (!selectedFloor) return;
    setSaving(true);
    try {
      const payload = {
        date: newSessionDate,
        floor_id: selectedFloor.id,
      };
      // If there are previous sessions, clone from the most recent one
      if (sessions.length > 0) {
        payload.clone_from = sessions[0].id;
      } else {
        payload.clone_from = "master";
      }
      const res = await axios.post(`${API}/admin/map-sessions`, payload, getAuthHeaders());
      setActiveSession(res.data);
      await fetchSessions();
      setShowNewSessionDialog(false);
      toast.success(isAr ? "تم بدء جولة جديدة" : "New tour started");
    } catch (e) {
      const msg = e.response?.data?.detail || (isAr ? "تعذر إنشاء الجلسة" : "Error creating session");
      toast.error(msg);
    } finally { setSaving(false); }
  };

  // Update zone in session
  const handleUpdateZone = async (zoneId, updateData) => {
    if (!activeSession) return;
    try {
      const res = await axios.put(
        `${API}/admin/map-sessions/${activeSession.id}/zones/${zoneId}`,
        updateData,
        getAuthHeaders()
      );
      setActiveSession(res.data);
      toast.success(isAr ? "تم التحديث" : "Updated");
    } catch (e) {
      toast.error(isAr ? "تعذر التحديث" : "Update failed");
    }
  };

  // Quick category change
  const handleCategoryChange = async (zoneId, newType) => {
    const typeInfo = ZONE_TYPES.find(t => t.value === newType);
    await handleUpdateZone(zoneId, {
      zone_type: newType,
      fill_color: typeInfo?.color || "#22c55e"
    });
  };

  // Toggle remove/restore
  const handleToggleRemove = async (zoneId, currentlyRemoved) => {
    await handleUpdateZone(zoneId, { is_removed: !currentlyRemoved });
  };

  // Add daily note
  const handleAddNote = async (zoneId, note) => {
    await handleUpdateZone(zoneId, { daily_note: note });
  };

  // Update session (status, notes)
  const handleUpdateSession = async (updateData) => {
    if (!activeSession) return;
    try {
      const res = await axios.put(
        `${API}/admin/map-sessions/${activeSession.id}`,
        updateData,
        getAuthHeaders()
      );
      setActiveSession(res.data);
      fetchSessions();
      toast.success(isAr ? "تم الحفظ" : "Saved");
    } catch (e) {
      toast.error(isAr ? "تعذر الحفظ" : "Save failed");
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId) => {
    try {
      await axios.delete(`${API}/admin/map-sessions/${sessionId}`, getAuthHeaders());
      if (activeSession?.id === sessionId) setActiveSession(null);
      fetchSessions();
      toast.success(isAr ? "تم الحذف" : "Deleted");
    } catch (e) {
      toast.error(isAr ? "تعذر الحذف" : "Delete failed");
    }
  };

  // Compare sessions
  const handleCompare = async (sessionId) => {
    if (!activeSession) return;
    try {
      const res = await axios.get(`${API}/map-sessions/compare/${activeSession.id}/${sessionId}`);
      setCompareData(res.data);
      setShowCompareDialog(true);
    } catch (e) {
      toast.error(isAr ? "تعذرت المقارنة" : "Compare failed");
    }
  };

  // Get active zones (not removed)
  const activeZones = activeSession?.zones?.filter(z => !z.is_removed) || [];
  const removedZones = activeSession?.zones?.filter(z => z.is_removed) || [];
  const changedZones = activeSession?.zones?.filter(z => z.change_type && z.change_type !== "unchanged") || [];

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } catch { return dateStr; }
  };

  const formatDateShort = (dateStr) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
    } catch { return dateStr; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="sessions-loading">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto flex items-center justify-center mb-3 animate-pulse">
            <CalendarIcon className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">{isAr ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="daily-sessions-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-cairo font-bold text-2xl" data-testid="page-title">
            {isAr ? "السجل اليومي للخرائط" : "Daily Map Log"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "تتبع التغييرات اليومية للمصليات والمناطق في كل طابق" : "Track daily changes to prayer areas and zones per floor"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedFloor?.id || ""}
            onValueChange={(v) => setSelectedFloor(floors.find(f => f.id === v))}
          >
            <SelectTrigger className="w-48" data-testid="floor-select">
              <Layers className="w-4 h-4 ml-2" />
              <SelectValue placeholder={isAr ? "اختر الطابق" : "Select floor"} />
            </SelectTrigger>
            <SelectContent>
              {floors.map(f => (
                <SelectItem key={f.id} value={f.id} data-testid={`floor-option-${f.id}`}>
                  {isAr ? f.name_ar : f.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => setShowNewSessionDialog(true)}
            disabled={!selectedFloor}
            data-testid="start-new-tour-btn"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 ml-2" />
            {isAr ? "بدء جولة جديدة" : "New Tour"}
          </Button>
        </div>
      </div>

      {/* Sessions Timeline + Active Session */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sessions List (Sidebar) */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-cairo font-semibold text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {isAr ? "سجل الجولات" : "Tour History"}
            <Badge variant="secondary" className="text-xs">{sessions.length}</Badge>
          </h3>

          {sessions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <CalendarIcon className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {isAr ? "لا توجد جولات سابقة لهذا الطابق" : "No previous tours for this floor"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {isAr ? "ابدأ أول جولة يومية" : "Start your first daily tour"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
              {sessions.map((s) => {
                const isActive = activeSession?.id === s.id;
                const changes = s.changes_summary || {};
                const totalChanges = (changes.added || 0) + (changes.removed || 0) + (changes.modified || 0);
                return (
                  <Card
                    key={s.id}
                    data-testid={`session-card-${s.id}`}
                    className={`cursor-pointer transition-all duration-200 group ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-200"
                        : "hover:border-slate-300 hover:shadow-sm"
                    }`}
                    onClick={() => {
                      setActiveSession(s);
                      setZoom(1);
                      setPanOffset({ x: 0, y: 0 });
                      zoomRef.current = 1;
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{formatDateShort(s.date)}</span>
                            <Badge
                              variant={s.status === "completed" ? "default" : "secondary"}
                              className={`text-[10px] px-1.5 py-0 ${
                                s.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-amber-100 text-amber-700 border-amber-200"
                              }`}
                            >
                              {s.status === "completed" ? (isAr ? "مكتمل" : "Done") : (isAr ? "مسودة" : "Draft")}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {formatDate(s.date)}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {activeSession && activeSession.id !== s.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); handleCompare(s.id); }}
                              title={isAr ? "مقارنة" : "Compare"}
                              data-testid={`compare-btn-${s.id}`}
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400 hover:text-red-600"
                            onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                            data-testid={`delete-session-btn-${s.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Changes summary mini */}
                      {totalChanges > 0 && (
                        <div className="flex items-center gap-2 mt-2 text-[10px]">
                          {changes.added > 0 && (
                            <span className="flex items-center gap-0.5 text-emerald-600">
                              <Plus className="w-3 h-3" />{changes.added}
                            </span>
                          )}
                          {changes.removed > 0 && (
                            <span className="flex items-center gap-0.5 text-red-500">
                              <X className="w-3 h-3" />{changes.removed}
                            </span>
                          )}
                          {changes.modified > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-600">
                              <Edit2 className="w-3 h-3" />{changes.modified}
                            </span>
                          )}
                        </div>
                      )}

                      {s.supervisor_notes && (
                        <p className="text-[10px] text-slate-500 mt-1 truncate flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 flex-shrink-0" />
                          {s.supervisor_notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Session Content */}
        <div className="lg:col-span-3">
          {!activeSession ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-4">
                  <Eye className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="font-cairo font-semibold text-lg text-slate-600 mb-2">
                  {isAr ? "اختر جولة أو ابدأ جولة جديدة" : "Select a tour or start a new one"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {isAr
                    ? "اختر جولة من القائمة الجانبية لعرض تفاصيلها، أو اضغط \"بدء جولة جديدة\" لتسجيل التغييرات اليومية"
                    : "Select a tour from the sidebar to view details, or click 'New Tour' to record daily changes"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Session Header Bar */}
              <div className="relative overflow-hidden rounded-xl border bg-gradient-to-l from-emerald-50 via-white to-slate-50 p-4">
                <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-emerald-200/30 blur-2xl" />
                <div className="relative flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                      <CalendarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="font-cairo font-bold text-lg" data-testid="session-date-title">
                        {isAr ? "جولة " : "Tour "}{formatDate(activeSession.date)}
                      </h2>
                      <div className="flex items-center gap-3 mt-0.5">
                        <Badge
                          className={`text-xs ${
                            activeSession.status === "completed"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-amber-100 text-amber-700 border-amber-200"
                          }`}
                          data-testid="session-status-badge"
                        >
                          {activeSession.status === "completed"
                            ? (isAr ? "مكتملة" : "Completed")
                            : (isAr ? "مسودة" : "Draft")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {activeZones.length} {isAr ? "منطقة نشطة" : "active zones"}
                        </span>
                        {activeSession.created_by && (
                          <span className="text-xs text-muted-foreground">
                            {isAr ? "بواسطة: " : "By: "}{activeSession.created_by}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSessionNotes(activeSession.supervisor_notes || "");
                        setShowNotesDialog(true);
                      }}
                      data-testid="add-notes-btn"
                    >
                      <MessageSquare className="w-4 h-4 ml-1" />
                      {isAr ? "ملاحظات" : "Notes"}
                    </Button>
                    {activeSession.status === "draft" && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleUpdateSession({ status: "completed" })}
                        data-testid="complete-session-btn"
                      >
                        <CheckCircle2 className="w-4 h-4 ml-1" />
                        {isAr ? "إنهاء الجولة" : "Complete Tour"}
                      </Button>
                    )}
                    {activeSession.status === "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateSession({ status: "draft" })}
                        data-testid="reopen-session-btn"
                      >
                        <RotateCcw className="w-4 h-4 ml-1" />
                        {isAr ? "إعادة فتح" : "Reopen"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Changes Summary Strip */}
                {activeSession.changes_summary && (
                  <div className="relative flex items-center gap-4 mt-3 pt-3 border-t border-slate-200/60">
                    {Object.entries(activeSession.changes_summary).map(([key, val]) => {
                      if (val === 0) return null;
                      const label = CHANGE_LABELS[key];
                      if (!label) return null;
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: label.bg, color: label.color }}
                          data-testid={`change-summary-${key}`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                          {val} {isAr ? label.ar : label.en}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tabs: Map / Changes / Log */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="map" data-testid="tab-map">
                    <MapPin className="w-4 h-4 ml-1" />
                    {isAr ? "الخريطة" : "Map"}
                  </TabsTrigger>
                  <TabsTrigger value="zones" data-testid="tab-zones">
                    <Tag className="w-4 h-4 ml-1" />
                    {isAr ? "المناطق" : "Zones"}
                    {changedZones.length > 0 && (
                      <Badge variant="destructive" className="mr-1 text-[10px] px-1.5">{changedZones.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="changes" data-testid="tab-changes">
                    <FileText className="w-4 h-4 ml-1" />
                    {isAr ? "التغييرات" : "Changes"}
                  </TabsTrigger>
                </TabsList>

                {/* MAP TAB */}
                <TabsContent value="map" className="space-y-3">
                  {/* Zoom Controls */}
                  <div className="flex items-center justify-end gap-2">
                    <div className="flex items-center gap-1 border rounded-lg p-1 bg-white">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        const c = mapContainerRef.current;
                        if (!c) return;
                        const rect = c.getBoundingClientRect();
                        const cx = rect.width / 2, cy = rect.height / 2;
                        const prev = zoomRef.current;
                        const nz = Math.max(0.5, prev * 0.8);
                        const s = nz / prev;
                        zoomRef.current = nz;
                        setZoom(nz);
                        setPanOffset(p => ({ x: cx - s * (cx - p.x), y: cy - s * (cy - p.y) }));
                      }} data-testid="zoom-out-btn"><ZoomOut className="w-4 h-4" /></Button>
                      <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        const c = mapContainerRef.current;
                        if (!c) return;
                        const rect = c.getBoundingClientRect();
                        const cx = rect.width / 2, cy = rect.height / 2;
                        const prev = zoomRef.current;
                        const nz = Math.min(6, prev * 1.25);
                        const s = nz / prev;
                        zoomRef.current = nz;
                        setZoom(nz);
                        setPanOffset(p => ({ x: cx - s * (cx - p.x), y: cy - s * (cy - p.y) }));
                      }} data-testid="zoom-in-btn"><ZoomIn className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        zoomRef.current = 1;
                        setZoom(1);
                        setPanOffset({ x: 0, y: 0 });
                      }} data-testid="zoom-reset-btn"><Maximize2 className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  {/* Map */}
                  {selectedFloor?.image_url ? (
                    <Card className="overflow-hidden">
                      <CardContent className="p-0">
                        <div
                          ref={wheelRef}
                          data-testid="session-map-container"
                          className="relative bg-slate-100 overflow-hidden"
                          style={{
                            height: "550px",
                            cursor: isPanning ? "grabbing" : "grab"
                          }}
                          onMouseDown={handleMouseDown}
                          onMouseMove={handleMouseMove}
                          onMouseUp={handleMouseUp}
                          onMouseLeave={handleMouseUp}
                        >
                          <div
                            style={{
                              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                              transformOrigin: "0 0",
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            {(() => {
                              const containerEl = mapContainerRef.current;
                              let wrapStyle = { position: "relative", width: "100%", height: "100%" };
                              if (imgRatio && containerEl) {
                                const cw = containerEl.clientWidth;
                                const ch = containerEl.clientHeight;
                                const cr = cw / ch;
                                if (cr > imgRatio) {
                                  wrapStyle = { position: "relative", height: "100%", width: ch * imgRatio };
                                } else {
                                  wrapStyle = { position: "relative", width: "100%", height: cw / imgRatio };
                                }
                              }
                              return (
                                <div style={wrapStyle}>
                                  <img
                                    src={selectedFloor.image_url}
                                    alt=""
                                    style={{ width: "100%", height: "100%", display: "block" }}
                                    draggable={false}
                                    className="pointer-events-none select-none"
                                    onLoad={(e) => setImgRatio(e.target.naturalWidth / e.target.naturalHeight)}
                                  />
                                  <svg
                                    ref={svgRef}
                                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                    data-testid="session-map-svg"
                                  >
                                    {/* Active zones */}
                                    {activeZones.map(zone => {
                                      const typeInfo = ZONE_TYPES.find(t => t.value === zone.zone_type);
                                      const changeLabel = CHANGE_LABELS[zone.change_type] || CHANGE_LABELS.unchanged;
                                      const isChanged = zone.change_type && zone.change_type !== "unchanged";
                                      return (
                                        <g
                                          key={zone.id}
                                          data-testid={`session-zone-${zone.id}`}
                                          onMouseEnter={() => setHoveredZone(zone)}
                                          onMouseLeave={() => setHoveredZone(null)}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedZone(zone);
                                            setShowZoneDialog(true);
                                          }}
                                          style={{ cursor: "pointer" }}
                                        >
                                          <path
                                            d={getPath(zone.polygon_points)}
                                            fill={zone.fill_color}
                                            fillOpacity={zone.opacity || 0.4}
                                            stroke={isChanged ? changeLabel.color : (zone.stroke_color || "#000")}
                                            strokeWidth={isChanged ? 0.8 : 0.3}
                                            strokeOpacity={zone.stroke_opacity ?? 1}
                                            strokeDasharray={zone.change_type === "added" ? "1.5 0.8" : "none"}
                                            vectorEffect="non-scaling-stroke"
                                          />
                                        </g>
                                      );
                                    })}

                                    {/* Removed zones (ghosted) */}
                                    {removedZones.map(zone => (
                                      <g
                                        key={zone.id}
                                        data-testid={`session-zone-removed-${zone.id}`}
                                        onMouseEnter={() => setHoveredZone(zone)}
                                        onMouseLeave={() => setHoveredZone(null)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedZone(zone);
                                          setShowZoneDialog(true);
                                        }}
                                        style={{ cursor: "pointer" }}
                                      >
                                        <path
                                          d={getPath(zone.polygon_points)}
                                          fill="#ef4444"
                                          fillOpacity={0.08}
                                          stroke="#ef4444"
                                          strokeWidth={0.5}
                                          strokeOpacity={0.4}
                                          strokeDasharray="2 1.5"
                                          vectorEffect="non-scaling-stroke"
                                        />
                                        {/* X mark on removed zones */}
                                        {zone.polygon_points?.length > 0 && (() => {
                                          const cx = zone.polygon_points.reduce((s, p) => s + p.x, 0) / zone.polygon_points.length;
                                          const cy = zone.polygon_points.reduce((s, p) => s + p.y, 0) / zone.polygon_points.length;
                                          return (
                                            <g>
                                              <line x1={cx - 0.8} y1={cy - 0.8} x2={cx + 0.8} y2={cy + 0.8}
                                                stroke="#ef4444" strokeWidth="0.4" vectorEffect="non-scaling-stroke" opacity="0.6" />
                                              <line x1={cx + 0.8} y1={cy - 0.8} x2={cx - 0.8} y2={cy + 0.8}
                                                stroke="#ef4444" strokeWidth="0.4" vectorEffect="non-scaling-stroke" opacity="0.6" />
                                            </g>
                                          );
                                        })()}
                                      </g>
                                    ))}
                                  </svg>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Hover Tooltip */}
                          {hoveredZone && (() => {
                            const typeInfo = ZONE_TYPES.find(t => t.value === hoveredZone.zone_type);
                            const changeLabel = CHANGE_LABELS[hoveredZone.change_type] || CHANGE_LABELS.unchanged;
                            return (
                              <div
                                className="absolute pointer-events-none z-50"
                                style={{ left: tooltipPos.x, top: tooltipPos.y }}
                                data-testid="zone-hover-tooltip"
                              >
                                <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border p-3 min-w-[200px]"
                                  style={{ borderTopColor: hoveredZone.fill_color, borderTopWidth: 3, direction: "rtl" }}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="font-bold text-sm">{hoveredZone.zone_code}</span>
                                    {hoveredZone.change_type !== "unchanged" && (
                                      <span
                                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                        style={{ backgroundColor: changeLabel.bg, color: changeLabel.color }}
                                      >
                                        {isAr ? changeLabel.ar : changeLabel.en}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-700">{isAr ? hoveredZone.name_ar : hoveredZone.name_en}</p>
                                  {typeInfo && (
                                    <p className="text-[10px] mt-1" style={{ color: typeInfo.color }}>
                                      {isAr ? typeInfo.label_ar : typeInfo.label_en}
                                    </p>
                                  )}
                                  {hoveredZone.is_removed && (
                                    <p className="text-[10px] text-red-500 mt-1 font-medium">
                                      {isAr ? "تم الإزالة" : "Removed"}
                                    </p>
                                  )}
                                  {hoveredZone.daily_note && (
                                    <p className="text-[10px] text-slate-500 mt-1 border-t pt-1">
                                      {hoveredZone.daily_note}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        {isAr ? "لا توجد صورة خريطة لهذا الطابق" : "No map image for this floor"}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ZONES TAB */}
                <TabsContent value="zones" className="space-y-4">
                  {/* Active zones */}
                  <div>
                    <h3 className="font-cairo font-semibold text-sm mb-3 flex items-center gap-2">
                      <CircleDot className="w-4 h-4 text-emerald-500" />
                      {isAr ? "المناطق النشطة" : "Active Zones"}
                      <Badge variant="secondary">{activeZones.length}</Badge>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {activeZones.map(zone => {
                        const typeInfo = ZONE_TYPES.find(t => t.value === zone.zone_type);
                        const changeLabel = CHANGE_LABELS[zone.change_type] || CHANGE_LABELS.unchanged;
                        const isChanged = zone.change_type && zone.change_type !== "unchanged";
                        return (
                          <Card
                            key={zone.id}
                            data-testid={`zone-card-${zone.id}`}
                            className={`transition-all hover:shadow-md ${isChanged ? "ring-1" : ""}`}
                            style={isChanged ? { borderColor: changeLabel.color + "40" } : {}}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                    style={{ backgroundColor: zone.fill_color }}
                                  >
                                    {typeInfo?.icon || "?"}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-sm">{zone.zone_code}</span>
                                      {isChanged && (
                                        <span
                                          className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                          style={{ backgroundColor: changeLabel.bg, color: changeLabel.color }}
                                        >
                                          {isAr ? changeLabel.ar : changeLabel.en}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {isAr ? zone.name_ar : zone.name_en}
                                    </p>
                                    <p className="text-[10px] mt-0.5" style={{ color: typeInfo?.color }}>
                                      {isAr ? typeInfo?.label_ar : typeInfo?.label_en}
                                    </p>
                                  </div>
                                </div>

                                {/* Quick actions */}
                                {activeSession.status === "draft" && (
                                  <div className="flex flex-col gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => { setSelectedZone(zone); setShowZoneDialog(true); }}
                                      title={isAr ? "تعديل" : "Edit"}
                                      data-testid={`edit-zone-btn-${zone.id}`}
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-red-400 hover:text-red-600"
                                      onClick={() => handleToggleRemove(zone.id, false)}
                                      title={isAr ? "إزالة" : "Remove"}
                                      data-testid={`remove-zone-btn-${zone.id}`}
                                    >
                                      <CircleOff className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {zone.daily_note && (
                                <div className="mt-2 p-2 bg-amber-50 rounded text-[11px] text-amber-700 flex items-start gap-1">
                                  <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>{zone.daily_note}</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Removed zones */}
                  {removedZones.length > 0 && (
                    <div>
                      <h3 className="font-cairo font-semibold text-sm mb-3 flex items-center gap-2">
                        <CircleOff className="w-4 h-4 text-red-500" />
                        {isAr ? "المناطق المزالة" : "Removed Zones"}
                        <Badge variant="destructive">{removedZones.length}</Badge>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {removedZones.map(zone => {
                          const typeInfo = ZONE_TYPES.find(t => t.value === zone.zone_type);
                          return (
                            <Card key={zone.id} className="border-red-200/50 bg-red-50/30 opacity-70" data-testid={`removed-zone-card-${zone.id}`}>
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100 text-red-500 text-xs font-bold">
                                      <X className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <span className="font-semibold text-sm line-through text-red-400">{zone.zone_code}</span>
                                      <p className="text-xs text-red-400">{isAr ? zone.name_ar : zone.name_en}</p>
                                    </div>
                                  </div>
                                  {activeSession.status === "draft" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                      onClick={() => handleToggleRemove(zone.id, true)}
                                      data-testid={`restore-zone-btn-${zone.id}`}
                                    >
                                      <RotateCcw className="w-3 h-3 ml-1" />
                                      {isAr ? "استعادة" : "Restore"}
                                    </Button>
                                  )}
                                </div>
                                {zone.daily_note && (
                                  <p className="text-[10px] text-red-400 mt-2">{zone.daily_note}</p>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* CHANGES TAB */}
                <TabsContent value="changes" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        {isAr ? "ملخص التغييرات" : "Changes Summary"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {changedZones.length === 0 ? (
                        <div className="text-center py-8">
                          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
                          <p className="text-muted-foreground">
                            {isAr ? "لا توجد تغييرات في هذه الجولة" : "No changes in this tour"}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {changedZones.map(zone => {
                            const typeInfo = ZONE_TYPES.find(t => t.value === zone.zone_type);
                            const changeLabel = CHANGE_LABELS[zone.change_type] || CHANGE_LABELS.unchanged;
                            return (
                              <div
                                key={zone.id}
                                className="flex items-center gap-3 p-3 rounded-lg border"
                                style={{ borderRightColor: changeLabel.color, borderRightWidth: 3 }}
                                data-testid={`change-item-${zone.id}`}
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: changeLabel.color }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm">{zone.zone_code}</span>
                                    <span className="text-xs text-muted-foreground">-</span>
                                    <span className="text-xs">{isAr ? zone.name_ar : zone.name_en}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span
                                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                      style={{ backgroundColor: changeLabel.bg, color: changeLabel.color }}
                                    >
                                      {isAr ? changeLabel.ar : changeLabel.en}
                                    </span>
                                    {typeInfo && (
                                      <span className="text-[10px] text-muted-foreground">
                                        {isAr ? typeInfo.label_ar : typeInfo.label_en}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {zone.daily_note && (
                                  <p className="text-[10px] text-slate-500 max-w-xs truncate">{zone.daily_note}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Supervisor notes section */}
                      {activeSession.supervisor_notes && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <h4 className="font-cairo font-semibold text-sm text-blue-700 flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4" />
                            {isAr ? "ملاحظات المشرف" : "Supervisor Notes"}
                          </h4>
                          <p className="text-sm text-blue-600 whitespace-pre-wrap">{activeSession.supervisor_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Zone Edit Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              {isAr ? "تعديل المنطقة" : "Edit Zone"}
            </DialogTitle>
          </DialogHeader>
          {selectedZone && (
            <div className="space-y-4">
              {/* Zone info header */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: selectedZone.fill_color }}
                >
                  {ZONE_TYPES.find(t => t.value === selectedZone.zone_type)?.icon || "?"}
                </div>
                <div>
                  <p className="font-semibold">{selectedZone.zone_code}</p>
                  <p className="text-xs text-muted-foreground">{isAr ? selectedZone.name_ar : selectedZone.name_en}</p>
                </div>
              </div>

              {/* Category change */}
              <div>
                <Label className="text-sm font-medium">{isAr ? "تغيير الفئة" : "Change Category"}</Label>
                <Select
                  value={selectedZone.zone_type}
                  onValueChange={(v) => {
                    handleCategoryChange(selectedZone.id, v);
                    setSelectedZone(prev => ({ ...prev, zone_type: v }));
                  }}
                  disabled={activeSession?.status === "completed"}
                >
                  <SelectTrigger className="mt-1" data-testid="zone-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />
                          {isAr ? t.label_ar : t.label_en}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Daily note */}
              <div>
                <Label className="text-sm font-medium">{isAr ? "ملاحظة يومية" : "Daily Note"}</Label>
                <Textarea
                  className="mt-1 text-sm"
                  placeholder={isAr ? "أضف ملاحظة لهذا اليوم..." : "Add a note for today..."}
                  value={selectedZone.daily_note || ""}
                  onChange={(e) => setSelectedZone(prev => ({ ...prev, daily_note: e.target.value }))}
                  rows={3}
                  disabled={activeSession?.status === "completed"}
                  data-testid="zone-daily-note"
                />
              </div>

              {/* Zone status toggle */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {selectedZone.is_removed ? (
                    <CircleOff className="w-5 h-5 text-red-500" />
                  ) : (
                    <CircleDot className="w-5 h-5 text-emerald-500" />
                  )}
                  <span className="text-sm font-medium">
                    {selectedZone.is_removed
                      ? (isAr ? "تم إزالة هذه المنطقة" : "This zone is removed")
                      : (isAr ? "المنطقة نشطة" : "Zone is active")}
                  </span>
                </div>
                {activeSession?.status === "draft" && (
                  <Button
                    variant={selectedZone.is_removed ? "default" : "destructive"}
                    size="sm"
                    onClick={() => {
                      handleToggleRemove(selectedZone.id, selectedZone.is_removed);
                      setSelectedZone(prev => ({ ...prev, is_removed: !prev.is_removed }));
                    }}
                    data-testid="zone-toggle-remove"
                  >
                    {selectedZone.is_removed ? (
                      <><RotateCcw className="w-3 h-3 ml-1" />{isAr ? "استعادة" : "Restore"}</>
                    ) : (
                      <><CircleOff className="w-3 h-3 ml-1" />{isAr ? "إزالة" : "Remove"}</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedZone?.daily_note !== undefined && activeSession?.status === "draft" && (
              <Button
                onClick={() => {
                  handleAddNote(selectedZone.id, selectedZone.daily_note);
                  setShowZoneDialog(false);
                }}
                data-testid="save-zone-changes"
              >
                <Save className="w-4 h-4 ml-1" />
                {isAr ? "حفظ" : "Save"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowZoneDialog(false)}>
              {isAr ? "إغلاق" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Session Dialog */}
      <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              {isAr ? "بدء جولة جديدة" : "Start New Tour"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{isAr ? "التاريخ" : "Date"}</Label>
              <Input
                type="date"
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
                className="mt-1"
                data-testid="new-session-date"
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-600">
                <AlertCircle className="w-4 h-4 inline ml-1" />
                {isAr
                  ? `سيتم نسخ المناطق ${sessions.length > 0 ? "من آخر جولة" : "من الخريطة الأساسية"} تلقائياً كنقطة بداية`
                  : `Zones will be cloned from ${sessions.length > 0 ? "the latest tour" : "the master map"} as a starting point`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateSession}
              disabled={saving || !newSessionDate}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="confirm-new-session"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 ml-1 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 ml-1" />
              )}
              {isAr ? "بدء الجولة" : "Start Tour"}
            </Button>
            <Button variant="outline" onClick={() => setShowNewSessionDialog(false)}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {isAr ? "ملاحظات المشرف" : "Supervisor Notes"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder={isAr ? "أضف ملاحظاتك عن جولة اليوم..." : "Add your notes about today's tour..."}
            rows={5}
            className="text-sm"
            data-testid="supervisor-notes-textarea"
          />
          <DialogFooter>
            <Button
              onClick={() => {
                handleUpdateSession({ supervisor_notes: sessionNotes });
                setShowNotesDialog(false);
              }}
              data-testid="save-notes-btn"
            >
              <Save className="w-4 h-4 ml-1" />
              {isAr ? "حفظ" : "Save"}
            </Button>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-600" />
              {isAr ? "مقارنة الجولات" : "Compare Tours"}
            </DialogTitle>
          </DialogHeader>
          {compareData && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground">{isAr ? "الجولة الحالية" : "Current"}</p>
                  <p className="font-semibold text-sm">{formatDateShort(compareData.session_1.date)}</p>
                </div>
                <ArrowLeftRight className="w-5 h-5 text-slate-400 flex-shrink-0 mx-3" />
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground">{isAr ? "الجولة المقارنة" : "Compared"}</p>
                  <p className="font-semibold text-sm">{formatDateShort(compareData.session_2.date)}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600">{compareData.added.length}</p>
                  <p className="text-xs text-emerald-600">{isAr ? "مضاف" : "Added"}</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-500">{compareData.removed.length}</p>
                  <p className="text-xs text-red-500">{isAr ? "محذوف" : "Removed"}</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{compareData.modified.length}</p>
                  <p className="text-xs text-amber-600">{isAr ? "معدّل" : "Modified"}</p>
                </div>
              </div>

              {/* Details */}
              {compareData.added.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-emerald-600 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> {isAr ? "مناطق مضافة" : "Added Zones"}
                  </h4>
                  {compareData.added.map((z, i) => (
                    <div key={i} className="p-2 bg-emerald-50 rounded mb-1 text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: z.fill_color }} />
                      <span className="font-medium">{z.zone_code}</span>
                      <span className="text-muted-foreground">- {isAr ? z.name_ar : z.name_en}</span>
                    </div>
                  ))}
                </div>
              )}

              {compareData.removed.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-red-500 flex items-center gap-1">
                    <X className="w-4 h-4" /> {isAr ? "مناطق محذوفة" : "Removed Zones"}
                  </h4>
                  {compareData.removed.map((z, i) => (
                    <div key={i} className="p-2 bg-red-50 rounded mb-1 text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: z.fill_color }} />
                      <span className="font-medium line-through">{z.zone_code}</span>
                      <span className="text-muted-foreground">- {isAr ? z.name_ar : z.name_en}</span>
                    </div>
                  ))}
                </div>
              )}

              {compareData.modified.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-amber-600 flex items-center gap-1">
                    <Edit2 className="w-4 h-4" /> {isAr ? "مناطق معدّلة" : "Modified Zones"}
                  </h4>
                  {compareData.modified.map((m, i) => (
                    <div key={i} className="p-2 bg-amber-50 rounded mb-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.before.zone_code}</span>
                        <ArrowRight className="w-3 h-3 text-amber-500" />
                        <span>{m.after.zone_code}</span>
                      </div>
                      <div className="text-[11px] text-amber-600 mt-0.5">
                        {m.before.zone_type !== m.after.zone_type && (
                          <span>
                            {isAr ? "الفئة: " : "Type: "}
                            {ZONE_TYPES.find(t => t.value === m.before.zone_type)?.[isAr ? "label_ar" : "label_en"]}
                            {" → "}
                            {ZONE_TYPES.find(t => t.value === m.after.zone_type)?.[isAr ? "label_ar" : "label_en"]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {compareData.unchanged_count > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {compareData.unchanged_count} {isAr ? "منطقة بدون تغيير" : "unchanged zones"}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
