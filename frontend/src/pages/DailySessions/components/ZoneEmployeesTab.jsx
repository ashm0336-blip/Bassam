import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import {
  Users, Search, UserCheck, UserX, MapPin, Plus, X, AlertCircle, Percent,
  ZoomIn, ZoomOut, Maximize2, ChevronRight, Sparkles, Printer, Filter,
  RefreshCw, CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";
import { normalizeImageUrl } from "../utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SHIFTS = [
  { value: "الأولى", label_ar: "الوردية الأولى", label_en: "Shift 1", color: "#3b82f6" },
  { value: "الثانية", label_ar: "الوردية الثانية", label_en: "Shift 2", color: "#22c55e" },
  { value: "الثالثة", label_ar: "الوردية الثالثة", label_en: "Shift 3", color: "#f97316" },
  { value: "الرابعة", label_ar: "الوردية الرابعة", label_en: "Shift 4", color: "#8b5cf6" },
];

export function ZoneEmployeesTab({ activeZones, activeSession, ZONE_TYPES, selectedFloor, imgRatio, panelCollapsed, onPanelToggle }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeShift, setActiveShift] = useState("all");
  const [hoveredZone, setHoveredZone] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [coverageFilter, setCoverageFilter] = useState("all"); // "all" | "uncovered" | "covered"
  const [autoDistributing, setAutoDistributing] = useState(false);
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);
  const printRef = useRef(null);

  // Zoom/Pan state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const mapContainerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Wheel zoom with passive:false to prevent page scroll
  const wheelCallbackRef = useCallback((node) => {
    if (!node) return;
    mapContainerRef.current = node;
    const updateSize = () => setContainerSize({ w: node.clientWidth, h: node.clientHeight });
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(node);
    const handler = (e) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const prev = zoomRef.current;
      const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const nz = Math.max(0.5, Math.min(5, prev * delta));
      const s = nz / prev;
      zoomRef.current = nz; setZoom(nz);
      setPanOffset(p => ({ x: mx - s * (mx - p.x), y: my - s * (my - p.y) }));
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
        const nz = Math.max(0.5, Math.min(5, pinchZoom * (d / pinchDist)));
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
    return () => {
      node.removeEventListener("wheel", handler);
      node.removeEventListener("touchstart", onTs);
      node.removeEventListener("touchmove", onTm);
      node.removeEventListener("touchend", onTe);
      ro.disconnect();
    };
  }, []);

  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/employees?department=plazas`, getAuthHeaders());
        setEmployees(res.data.filter(e => e.is_active));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filteredEmployees = useMemo(() => {
    let emps = employees;
    if (activeShift !== "all") emps = emps.filter(e => e.shift === activeShift);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      emps = emps.filter(e => e.name?.toLowerCase().includes(q));
    }
    return emps;
  }, [employees, activeShift, searchQuery]);

  const assignedLocations = useMemo(() => {
    const codes = new Set();
    activeZones.forEach(z => { codes.add(z.zone_code); codes.add(z.name_ar); codes.add(z.name_en); });
    return codes;
  }, [activeZones]);

  const zoneEmployeeMap = useMemo(() => {
    const map = {};
    activeZones.forEach(z => { map[z.zone_code] = []; });
    employees.forEach(emp => {
      if (emp.location) {
        const zone = activeZones.find(z => z.zone_code === emp.location || z.name_ar === emp.location || z.name_en === emp.location);
        if (zone && map[zone.zone_code]) map[zone.zone_code].push(emp);
      }
    });
    return map;
  }, [activeZones, employees]);

  const unassignedEmployees = useMemo(() => {
    return filteredEmployees.filter(emp => !emp.location || !assignedLocations.has(emp.location));
  }, [filteredEmployees, assignedLocations]);

  const assignedCount = useMemo(() => {
    return employees.filter(emp => emp.location && assignedLocations.has(emp.location)).length;
  }, [employees, assignedLocations]);

  const coveredZones = activeZones.filter(z => (zoneEmployeeMap[z.zone_code] || []).length > 0);
  const uncoveredZones = activeZones.filter(z => !z.is_removed && z.zone_type !== "service" && (zoneEmployeeMap[z.zone_code] || []).length === 0);
  const coveragePct = activeZones.length > 0 ? Math.round((coveredZones.length / activeZones.length) * 100) : 0;

  const handleAssign = async (empId, zoneCode) => {
    try {
      await axios.put(`${API}/employees/${empId}`, { location: zoneCode }, getAuthHeaders());
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, location: zoneCode } : e));
      toast.success(isAr ? "تم تعيين الموظف" : "Assigned", { duration: 1200 });
    } catch { toast.error(isAr ? "تعذر التعيين" : "Failed"); }
  };

  const handleUnassign = async (empId) => {
    try {
      await axios.put(`${API}/employees/${empId}`, { location: "" }, getAuthHeaders());
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, location: "" } : e));
      toast.success(isAr ? "تم إلغاء التعيين" : "Unassigned", { duration: 1200 });
    } catch { toast.error(isAr ? "تعذر الإلغاء" : "Failed"); }
  };

  // ─── Auto-Distribute Algorithm ──────────────────────────
  const handleAutoDistribute = async () => {
    setShowAutoConfirm(false);
    setAutoDistributing(true);
    try {
      const unassigned = employees.filter(e => !e.location || !assignedLocations.has(e.location));
      const uncovered = activeZones.filter(z => !z.is_removed && z.zone_type !== "service" && (zoneEmployeeMap[z.zone_code] || []).length === 0);

      if (unassigned.length === 0) { toast.info(isAr ? "جميع الموظفين معيّنون بالفعل" : "All staff already assigned"); return; }
      if (uncovered.length === 0) { toast.info(isAr ? "جميع المناطق مغطاة بالفعل" : "All zones already covered"); return; }

      // Smart matching: separate by zone type + shift balance
      const menZones = uncovered.filter(z => z.zone_type === "men_prayer" || z.zone_type === "reserve_fard");
      const womenZones = uncovered.filter(z => z.zone_type === "women_prayer");
      const otherZones = uncovered.filter(z => !menZones.includes(z) && !womenZones.includes(z));

      // Build assignment queue — each zone gets one employee first, then extras
      const queue = [...menZones, ...womenZones, ...otherZones];
      const empPool = [...unassigned]; // mutable copy
      const assignments = []; // { empId, zoneCode }

      // Round 1: one employee per uncovered zone
      queue.forEach(zone => {
        if (empPool.length === 0) return;
        const emp = empPool.shift();
        assignments.push({ empId: emp.id, zoneCode: zone.zone_code });
      });

      // Execute assignments in parallel
      await Promise.all(assignments.map(({ empId, zoneCode }) =>
        axios.put(`${API}/employees/${empId}`, { location: zoneCode }, getAuthHeaders())
      ));
      // Update local state
      const assignMap = Object.fromEntries(assignments.map(a => [a.empId, a.zoneCode]));
      setEmployees(prev => prev.map(e => assignMap[e.id] ? { ...e, location: assignMap[e.id] } : e));
      toast.success(isAr ? `✅ تم توزيع ${assignments.length} موظف على ${assignments.length} منطقة` : `✅ Assigned ${assignments.length} staff to ${assignments.length} zones`);
    } catch { toast.error(isAr ? "تعذر التوزيع التلقائي" : "Auto-distribute failed"); }
    finally { setAutoDistributing(false); }
  };

  // ─── Clear All Assignments ───────────────────────────────
  const handleClearAll = async () => {
    const assigned = employees.filter(e => e.location && assignedLocations.has(e.location));
    if (assigned.length === 0) return;
    try {
      await Promise.all(assigned.map(e => axios.put(`${API}/employees/${e.id}`, { location: "" }, getAuthHeaders())));
      setEmployees(prev => prev.map(e => assigned.find(a => a.id === e.id) ? { ...e, location: "" } : e));
      toast.success(isAr ? "تم مسح جميع التعيينات" : "All assignments cleared");
    } catch { toast.error(isAr ? "تعذر المسح" : "Failed"); }
  };

  // ─── Print Assignment Sheet ──────────────────────────────
  const handlePrint = () => {
    const rows = activeZones.filter(z => !z.is_removed && z.zone_type !== "service")
      .map(z => {
        const emps = zoneEmployeeMap[z.zone_code] || [];
        return `<tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:8px;font-weight:bold;color:#047857">${z.zone_code}</td>
          <td style="padding:8px">${z.name_ar}</td>
          <td style="padding:8px">${emps.length > 0 ? emps.map(e=>`<span style="background:#f0fdf4;border:1px solid #86efac;border-radius:4px;padding:2px 6px;margin:1px;display:inline-block">${e.name}</span>`).join('') : '<span style="color:#ef4444">بدون موظف</span>'}</td>
          <td style="padding:8px;color:#64748b">${emps.length > 0 ? emps.map(e=>e.shift||'').join(', ') : '—'}</td>
        </tr>`;
      }).join('');
    const win = window.open('', '_blank');
    win.document.write(`
      <html dir="rtl"><head><title>جدول توزيع الموظفين</title>
      <style>body{font-family:Arial,sans-serif;direction:rtl;padding:20px}h2{color:#047857}table{width:100%;border-collapse:collapse}th{background:#f0fdf4;padding:10px;color:#047857;border:1px solid #a7f3d0}td{border:1px solid #e2e8f0}@media print{button{display:none}}</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;margin-bottom:16px">
        <h2>📋 جدول توزيع موظفي المصليات</h2>
        <div style="text-align:left;color:#64748b;font-size:12px">
          <div>التاريخ: ${activeSession?.date || ''}</div>
          <div>الطابق: ${activeSession?.floor_name || ''}</div>
          <div>إجمالي الموظفين: ${employees.length} | المعيّنون: ${assignedCount}</div>
        </div>
      </div>
      <table><thead><tr><th>كود المنطقة</th><th>اسم المنطقة</th><th>الموظفون</th><th>الوردية</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div style="margin-top:16px;padding:10px;background:#fef9c3;border-radius:8px;font-size:12px">
        ✅ مغطاة: ${coveredZones.length} | 🔴 بدون تغطية: ${uncoveredZones.length} | 📊 نسبة التغطية: ${coveragePct}%
      </div>
      <button onclick="window.print()" style="margin-top:16px;padding:10px 20px;background:#047857;color:white;border:none;border-radius:8px;cursor:pointer">🖨️ طباعة</button>
      </body></html>`);
    win.document.close();
  };

  const shiftCounts = useMemo(() => {
    const c = { all: employees.length };
    SHIFTS.forEach(s => { c[s.value] = employees.filter(e => e.shift === s.value).length; });
    return c;
  }, [employees]);

  // Zoom helper
  const zoomMap = (factor) => {
    const c = mapContainerRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const cx = r.width / 2, cy = r.height / 2;
    const p = zoomRef.current;
    const nz = Math.max(0.3, Math.min(20, p * factor));
    const s = nz / p;
    zoomRef.current = nz; setZoom(nz);
    setPanOffset(o => ({ x: cx - s * (cx - o.x), y: cy - s * (cy - o.y) }));
  };

  const resetView = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); zoomRef.current = 1; };

  // Point-in-polygon test
  const isPointInPoly = (pt, poly) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if ((yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 rounded-lg bg-emerald-100 animate-pulse flex items-center justify-center"><Users className="w-4 h-4 text-emerald-600" /></div></div>;
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed py-12 text-center">
        <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <h3 className="font-cairo font-semibold text-slate-600 mb-1">{isAr ? "لا يوجد موظفين" : "No employees"}</h3>
        <p className="text-xs text-muted-foreground">{isAr ? "أضف موظفين من إعدادات القسم أولاً" : "Add from settings first"}</p>
      </div>
    );
  }

  const getZoneCoverageColor = (zone) => {
    const emps = zoneEmployeeMap[zone.zone_code] || [];
    if (zone.zone_type === "service") return { fill: "#94a3b8", opacity: 0.15 };
    if (emps.length > 0) return { fill: "#22c55e", opacity: 0.35 };
    return { fill: "#ef4444", opacity: 0.3 };
  };

  const mapImageUrl = selectedFloor?.image_url ? normalizeImageUrl(selectedFloor.image_url) : null;

  return (
    <div className="space-y-2" ref={printRef}>
      {/* ─── Employees Toolbar ─────────────────────────── */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm flex-wrap" data-testid="employees-toolbar">

        {/* ── Live Status Chips ── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full">
            <UserCheck className="w-3 h-3" />{assignedCount} {isAr ? "معيّن" : "assigned"}
          </span>
          {unassignedEmployees.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">
              <UserX className="w-3 h-3" />{unassignedEmployees.length} {isAr ? "غير معيّن" : "unassigned"}
            </span>
          )}
          {uncoveredZones.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" />{uncoveredZones.length} {isAr ? "بدون تغطية" : "uncovered"}
            </span>
          )}
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${coveragePct >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : coveragePct >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
            <Percent className="w-3 h-3" />{coveragePct}% {isAr ? "تغطية" : "coverage"}
          </span>
        </div>

        <div className="w-px h-5 bg-slate-200 hidden sm:block" />

        {/* ── Coverage Filter ── */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {[
            { key: 'all', label: isAr ? 'الكل' : 'All', icon: null },
            { key: 'uncovered', label: isAr ? 'بدون تغطية' : 'Uncovered', icon: '🔴' },
            { key: 'covered', label: isAr ? 'مغطاة' : 'Covered', icon: '✅' },
          ].map(f => (
            <button key={f.key} onClick={() => setCoverageFilter(f.key)}
              data-testid={`coverage-filter-${f.key}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold transition-all ${coverageFilter === f.key ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}>
              {f.icon && <span>{f.icon}</span>}{f.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200 hidden sm:block" />

        {/* ── Auto Distribute ── */}
        {activeSession?.status === "draft" && (
          <Popover open={showAutoConfirm} onOpenChange={setShowAutoConfirm}>
            <PopoverTrigger asChild>
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700" disabled={autoDistributing} data-testid="auto-distribute-btn">
                {autoDistributing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isAr ? "توزيع تلقائي" : "Auto-Assign"}
                {unassignedEmployees.length > 0 && <Badge className="text-[8px] h-4 px-1 bg-white/20">{unassignedEmployees.length}</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="start">
              <div className="space-y-3">
                <div>
                  <p className="font-cairo font-bold text-sm text-slate-700 mb-1">{isAr ? "التوزيع التلقائي" : "Auto-Distribute"}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isAr
                      ? `سيتم توزيع ${unassignedEmployees.length} موظف غير معيّن على ${uncoveredZones.length} منطقة بدون تغطية. يمكنك التعديل اليدوي بعدها.`
                      : `Will assign ${unassignedEmployees.length} unassigned staff to ${uncoveredZones.length} uncovered zones. You can adjust manually after.`}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-violet-50 rounded-lg p-2"><p className="text-lg font-bold text-violet-600">{unassignedEmployees.length}</p><p className="text-[8px] text-slate-500">{isAr ? "موظف" : "staff"}</p></div>
                  <div className="bg-slate-100 rounded-lg p-2 flex items-center justify-center"><Sparkles className="w-5 h-5 text-slate-400" /></div>
                  <div className="bg-red-50 rounded-lg p-2"><p className="text-lg font-bold text-red-500">{uncoveredZones.length}</p><p className="text-[8px] text-slate-500">{isAr ? "منطقة" : "zones"}</p></div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAutoDistribute} className="flex-1 bg-violet-600 hover:bg-violet-700 h-8 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 ml-1" />{isAr ? "بدء التوزيع" : "Start"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAutoConfirm(false)} className="flex-1 h-8 text-xs">{isAr ? "إلغاء" : "Cancel"}</Button>
                </div>
                {assignedCount > 0 && (
                  <button onClick={() => { setShowAutoConfirm(false); handleClearAll(); }}
                    className="w-full text-[9px] text-red-500 hover:text-red-700 transition-colors text-center">
                    {isAr ? "مسح جميع التعيينات الحالية" : "Clear all assignments"}
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* ── Print ── */}
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 mr-auto" onClick={handlePrint} data-testid="print-assignments-btn">
          <Printer className="w-3.5 h-3.5" />{isAr ? "طباعة" : "Print"}
        </Button>
      </div>

      {/* ─── Map Container ──────────────────────────────── */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200/60" style={{ height: 'min(680px, calc(100vh - 260px))' }} data-testid="zone-employees-tab">
      {/* Fixed handle - always at panel edge */}
      <div
        className="absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-300"
        style={{ right: panelCollapsed ? 0 : '40%' }}
      >
        <button
            onClick={() => onPanelToggle()}
          className="flex items-center justify-center w-5 h-14 bg-emerald-600 hover:bg-emerald-700 rounded-r-none rounded-l-lg shadow-lg transition-colors"
          data-testid="employees-panel-handle"
          title={isAr ? (panelCollapsed ? "إظهار اللوحة" : "إخفاء اللوحة") : (panelCollapsed ? "Show Panel" : "Hide Panel")}
        >
          <ChevronRight className="w-3 h-3 text-white transition-transform duration-300" style={{ transform: panelCollapsed ? 'rotate(180deg)' : '' }} />
        </button>
      </div>
      {/* LEFT: Coverage Map - absolute inset-0, never changes size */}
      <div className="absolute inset-0 bg-slate-50 flex flex-col">
        {mapImageUrl ? (
          <>
          <div className="relative flex-1">
            {/* Zoom controls */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1 border rounded-lg p-1 bg-white/90 backdrop-blur shadow-sm">
              <button onClick={() => zoomMap(0.8)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 transition-all" data-testid="emp-map-zoom-out"><ZoomOut className="w-4 h-4 text-slate-600" /></button>
              <span className="text-xs w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
              <button onClick={() => zoomMap(1.25)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 transition-all" data-testid="emp-map-zoom-in"><ZoomIn className="w-4 h-4 text-slate-600" /></button>
              <button onClick={resetView} className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 transition-all" data-testid="emp-map-reset"><Maximize2 className="w-4 h-4 text-slate-600" /></button>
            </div>

            {/* Map container */}
            <div
              ref={wheelCallbackRef}
              className="relative bg-slate-50 overflow-hidden h-full"
              style={{ cursor: isPanning ? "grabbing" : "grab", touchAction: "none" }}
              data-testid="coverage-map-container"
              onMouseDown={(e) => { if (e.button !== 0) return; e.preventDefault(); setIsPanning(true); setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y }); }}
              onMouseMove={(e) => {
                if (isPanning) { setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); return; }
                const c = mapContainerRef.current; if (!c) return;
                const rect = c.getBoundingClientRect();
                setMousePos({ x: e.clientX - rect.left + 16, y: e.clientY - rect.top - 10 });
                // Hit test zones
                const innerDiv = c.querySelector("[data-map-inner]"); if (!innerDiv) return;
                const innerRect = innerDiv.getBoundingClientRect();
                const px = ((e.clientX - innerRect.left) / innerRect.width) * 100;
                const py = ((e.clientY - innerRect.top) / innerRect.height) * 100;
                let found = null;
                for (const z of activeZones) {
                  if (!z.is_removed && z.polygon_points?.length > 2 && isPointInPoly({ x: px, y: py }, z.polygon_points)) { found = z.id; break; }
                }
                setHoveredZone(found);
              }}
              onMouseUp={() => setIsPanning(false)}
              onMouseLeave={() => { setIsPanning(false); setHoveredZone(null); }}
              onTouchStart={(e) => { if (e.touches.length !== 1) return; e.preventDefault(); const t = e.touches[0]; setIsPanning(true); setPanStart({ x: t.clientX - panOffset.x, y: t.clientY - panOffset.y }); }}
              onTouchMove={(e) => { if (e.touches.length !== 1) return; if (isPanning) { e.preventDefault(); const t = e.touches[0]; setPanOffset({ x: t.clientX - panStart.x, y: t.clientY - panStart.y }); } }}
              onTouchEnd={() => setIsPanning(false)}
              onTouchCancel={() => setIsPanning(false)}
            >
              <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: "0 0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(() => {
                  let ws = { position: "relative", width: "100%", height: "100%" };
                  if (imgRatio && containerSize.w > 0 && containerSize.h > 0) {
                    const cw = containerSize.w;
                    const ch = containerSize.h;
                    if (cw / ch > imgRatio) ws = { position: "relative", height: "100%", width: ch * imgRatio };
                    else ws = { position: "relative", width: "100%", height: cw / imgRatio };
                  }
                  return (
                    <div style={ws} data-map-inner="true">
                      <img src={mapImageUrl} alt="" style={{ width: "100%", height: "100%", display: "block", imageRendering: "high-quality" }} draggable={false} className="pointer-events-none select-none" />
                      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 100 100" preserveAspectRatio="none" data-testid="coverage-map">
                        {activeZones.filter(z => {
                          if (z.is_removed || !z.polygon_points?.length > 1) return false;
                          if (coverageFilter === 'uncovered') return z.zone_type !== 'service' && (zoneEmployeeMap[z.zone_code] || []).length === 0;
                          if (coverageFilter === 'covered') return (zoneEmployeeMap[z.zone_code] || []).length > 0;
                          return true;
                        }).map(zone => {
                          const { fill, opacity } = getZoneCoverageColor(zone);
                          const pts = zone.polygon_points.map(p => `${p.x},${p.y}`).join(" ");
                          const emps = zoneEmployeeMap[zone.zone_code] || [];
                          const isHovered = hoveredZone === zone.id;
                          const cx = zone.polygon_points.reduce((s, p) => s + p.x, 0) / zone.polygon_points.length;
                          const cy = zone.polygon_points.reduce((s, p) => s + p.y, 0) / zone.polygon_points.length;
                          return (
                            <g key={zone.id}>
                              <polygon
                                points={pts}
                                fill={fill}
                                fillOpacity={isHovered ? opacity + 0.25 : opacity}
                                stroke={isHovered ? "#1e293b" : fill}
                                strokeWidth={isHovered ? 0.5 : 0.25}
                                strokeOpacity={0.8}
                                className="transition-all duration-200"
                              />
                              {emps.length > 0 && (
                                <>
                                  <circle cx={cx} cy={cy} r="2.2" fill="#fff" fillOpacity="0.9" />
                                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="1.8" fontWeight="800" fill="#16a34a">{emps.length}</text>
                                </>
                              )}
                              {emps.length === 0 && zone.zone_type !== "service" && (
                                <>
                                  <circle cx={cx} cy={cy} r="1.5" fill="#ef4444" fillOpacity="0.8" />
                                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="1.2" fontWeight="800" fill="#fff">!</text>
                                </>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>

              {/* Floating tooltip near mouse */}
              {hoveredZone && (() => {
                const zone = activeZones.find(z => z.id === hoveredZone);
                if (!zone) return null;
                const emps = zoneEmployeeMap[zone.zone_code] || [];
                return (
                  <div className="absolute z-30 pointer-events-none" style={{ left: mousePos.x, top: mousePos.y, transform: "translateY(-100%)" }} data-testid="coverage-tooltip">
                    <div className="bg-slate-900/95 text-white rounded-xl px-3 py-2 shadow-xl backdrop-blur-sm max-w-[180px]">
                      <p className="text-[11px] font-bold">{zone.zone_code}</p>
                      <p className="text-[9px] text-slate-300 mt-0.5">{isAr ? zone.name_ar : zone.name_en}</p>
                      {emps.length > 0 ? (
                        <div className="mt-1.5 pt-1.5 border-t border-white/10 space-y-1">
                          {emps.map(e => {
                            const shift = SHIFTS.find(s => s.value === e.shift);
                            return (
                              <div key={e.id} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: shift?.color || "#94a3b8" }} />
                                <span className="text-[9px]">{e.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[9px] text-red-300 mt-1">{zone.zone_type === "service" ? (isAr ? "منطقة خدمات" : "Service zone") : (isAr ? "بدون موظف" : "No staff")}</p>
                      )}
                    </div>
                    <div className="w-2 h-2 bg-slate-900/95 rotate-45 mx-4 -mt-1" />
                  </div>
                );
              })()}
            </div>
          </div>
          {/* Legend - below map */}
          <div className="flex items-center justify-center gap-4 py-2.5 bg-white border-t border-slate-100">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500/60 border border-green-600/30" /><span className="text-[10px] font-medium text-slate-600">{isAr ? "مغطاة" : "Covered"}</span></div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500/60 border border-red-600/30" /><span className="text-[10px] font-medium text-slate-600">{isAr ? "غير مغطاة" : "Uncovered"}</span></div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-400/40 border border-slate-400/30" /><span className="text-[10px] font-medium text-slate-600">{isAr ? "خدمات" : "Service"}</span></div>
          </div>
          {/* All assigned message - below map */}
          {unassignedEmployees.length === 0 && employees.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-2 bg-emerald-50/80 border-t border-emerald-100">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <p className="text-[11px] text-emerald-600 font-semibold">{isAr ? "جميع الموظفين معيّنين" : "All employees assigned"}</p>
            </div>
          )}
        </>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">{isAr ? "لا توجد خريطة" : "No map"}</div>
        )}
      </div>

      {/* RIGHT: Control Panel - absolutely positioned, slides over the map */}
      <div
        className="absolute top-0 bottom-0 right-0 bg-gradient-to-b from-slate-50/98 to-white/98 backdrop-blur-sm border-l border-slate-200/80 overflow-y-auto overflow-x-hidden shadow-xl"
        style={{ width: '40%', transform: panelCollapsed ? 'translateX(100%)' : 'translateX(0)', transition: 'transform 0.3s ease' }}
        data-testid="employees-panel"
      >
        <div className="p-4 space-y-4">
          {/* Panel Header */}
          <div className="text-center">
            <p className="text-[12px] font-bold font-cairo text-slate-600 tracking-wide">{isAr ? "إدارة الموظفين" : "Staff Management"}</p>
          </div>
          <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-2" data-testid="employee-kpi-grid">
            {[
              { label: isAr ? "إجمالي الموظفين" : "Total", value: employees.length, icon: Users, color: "#3b82f6" },
              { label: isAr ? "معيّنين" : "Assigned", value: assignedCount, icon: UserCheck, color: "#10b981" },
              { label: isAr ? "غير مسكنين" : "Unassigned", value: unassignedEmployees.length, icon: UserX, color: unassignedEmployees.length > 0 ? "#f59e0b" : "#10b981" },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className="relative rounded-xl p-2.5 border border-slate-100 bg-white overflow-hidden" data-testid={`emp-kpi-${i}`}>
                  <div className="absolute top-0 right-0 w-10 h-10 rounded-bl-[1.5rem] opacity-[0.06]" style={{ backgroundColor: kpi.color }} />
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p className="text-[8px] font-medium text-slate-400 leading-tight">{kpi.label}</p>
                      <div className="flex items-baseline gap-0.5 mt-0.5">
                        <span className="text-lg font-extrabold" style={{ color: kpi.color }}>{kpi.value}</span>
                        {kpi.unit && <span className="text-[9px] text-slate-400">{kpi.unit}</span>}
                      </div>
                    </div>
                    <Icon className="w-3.5 h-3.5 mt-0.5" style={{ color: kpi.color, opacity: 0.4 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: isAr ? "بدون تغطية" : "Uncovered", value: uncoveredZones.length, icon: AlertCircle, color: uncoveredZones.length > 0 ? "#ef4444" : "#10b981" },
              { label: isAr ? "نسبة التغطية" : "Coverage", value: `${coveragePct}`, icon: Percent, color: coveragePct >= 80 ? "#10b981" : coveragePct >= 50 ? "#f59e0b" : "#ef4444", unit: "%" },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className="relative rounded-xl p-2.5 border border-slate-100 bg-white overflow-hidden" data-testid={`emp-kpi-${i + 3}`}>
                  <div className="absolute top-0 right-0 w-10 h-10 rounded-bl-[1.5rem] opacity-[0.06]" style={{ backgroundColor: kpi.color }} />
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p className="text-[8px] font-medium text-slate-400 leading-tight">{kpi.label}</p>
                      <div className="flex items-baseline gap-0.5 mt-0.5">
                        <span className="text-lg font-extrabold" style={{ color: kpi.color }}>{kpi.value}</span>
                        {kpi.unit && <span className="text-[9px] text-slate-400">{kpi.unit}</span>}
                      </div>
                    </div>
                    <Icon className="w-3.5 h-3.5 mt-0.5" style={{ color: kpi.color, opacity: 0.4 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── Shift Cards ─────────────────────────── */}
          <div>
            <p className="text-[12px] font-bold font-cairo text-slate-600 tracking-wide mb-1">{isAr ? "الموظفين حسب الورديات" : "Staff by Shift"}</p>
            <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent mb-2.5" />
            <div className="grid grid-cols-4 gap-1.5">
              {SHIFTS.map(s => {
                const shiftEmps = employees.filter(e => e.shift === s.value);
                const isActive = activeShift === s.value;
                return (
                  <button key={s.value} onClick={() => setActiveShift(isActive ? "all" : s.value)}
                    className="flex flex-col gap-1 p-2 rounded-xl border-2 transition-all text-right"
                    style={{ borderColor: isActive ? s.color : "#e2e8f0", backgroundColor: isActive ? s.color + "15" : "#fafafa" }}
                    data-testid={`shift-card-${s.value}`}>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-extrabold font-mono" style={{ color: s.color }}>{shiftEmps.length}</span>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    </div>
                    <p className="text-[9px] font-semibold text-slate-500 leading-tight">{isAr ? s.label_ar.replace("الوردية ", "") : s.label_en}</p>
                    <div className="flex gap-0.5 flex-wrap justify-end mt-0.5">
                      {shiftEmps.slice(0, 4).map(emp => (
                        <div key={emp.id} className="w-3.5 h-3.5 rounded-full text-[6px] font-bold text-white flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.color }}>{emp.name.charAt(0)}</div>
                      ))}
                      {shiftEmps.length === 0 && <span className="text-[8px] text-slate-300">—</span>}
                      {shiftEmps.length > 4 && <span className="text-[7px] self-center font-bold" style={{ color: s.color }}>+{shiftEmps.length - 4}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={isAr ? "بحث..." : "Search..."} className="pr-8 h-8 text-[11px]" data-testid="employee-search" />
          </div>

          <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />

          {/* Unassigned Employees */}
          {unassignedEmployees.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                <UserX className="w-3.5 h-3.5" />{isAr ? "غير معيّنين" : "Unassigned"}<Badge variant="secondary" className="text-[9px] px-1">{unassignedEmployees.length}</Badge>
              </p>
              <div className="space-y-1 max-h-[120px] overflow-y-auto">
                {unassignedEmployees.map(emp => {
                  const shift = SHIFTS.find(s => s.value === emp.shift);
                  return (
                    <div key={emp.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg border bg-white hover:shadow-sm transition-all group" data-testid={`unassigned-emp-${emp.id}`}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: shift?.color || "#94a3b8" }}>{emp.name.charAt(0)}</div>
                        <span className="text-[10px] font-medium truncate">{emp.name}</span>
                      </div>
                      {activeSession?.status === "draft" && (
                        <Select onValueChange={(code) => handleAssign(emp.id, code)}>
                          <SelectTrigger className="h-5 w-auto min-w-[60px] text-[9px] border-dashed px-1.5"><MapPin className="w-2.5 h-2.5 text-emerald-500" /><SelectValue placeholder={isAr ? "عيّن" : "+"} /></SelectTrigger>
                          <SelectContent>
                            {activeZones.filter(z => !z.is_removed).map(z => (
                              <SelectItem key={z.id} value={z.zone_code} className="text-[10px]">
                                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: z.fill_color || "#22c55e" }} />{z.zone_code}</div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />

          {/* Distribution - uncovered zones sorted first */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold font-cairo text-slate-600 tracking-wide">{isAr ? "التوزيع على المناطق" : "Zone Distribution"}</p>
              {uncoveredZones.length > 0 && (
                <span className="text-[9px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <AlertCircle className="w-2.5 h-2.5" />{uncoveredZones.length} {isAr ? "بدون تغطية" : "uncovered"}
                </span>
              )}
            </div>
            <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent mb-3" />
            <div className="grid grid-cols-5 gap-1.5 max-h-[300px] overflow-y-auto pr-0.5">
              {[...activeZones.filter(z => !z.is_removed)].sort((a, b) => {
                // Uncovered non-service zones first
                const aUncovered = (zoneEmployeeMap[a.zone_code] || []).length === 0 && a.zone_type !== "service";
                const bUncovered = (zoneEmployeeMap[b.zone_code] || []).length === 0 && b.zone_type !== "service";
                if (aUncovered && !bUncovered) return -1;
                if (!aUncovered && bUncovered) return 1;
                return 0;
              }).map(zone => {
                const emps = zoneEmployeeMap[zone.zone_code] || [];
                const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                const hasCoverage = emps.length > 0;
                const isService = zone.zone_type === "service";
                return (
                  <Popover key={zone.id}>
                    <PopoverTrigger asChild>
                      <button
                        className={`relative flex flex-col items-center justify-center rounded-lg border-2 p-1.5 transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-md
                          ${hasCoverage ? "bg-emerald-50 border-emerald-200 hover:border-emerald-400" :
                            isService ? "bg-slate-50 border-slate-200 hover:border-slate-400" :
                            "bg-red-50 border-red-300 hover:border-red-500 shadow-sm"}`}
                        data-testid={`zone-card-${zone.id}`}
                      >
                        {!hasCoverage && !isService && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-2 h-2 text-white" />
                          </span>
                        )}
                        <span className="w-3 h-3 rounded-sm mb-0.5" style={{ backgroundColor: zone.fill_color || ti?.color || "#22c55e" }} />
                        <span className="text-[7px] font-bold leading-tight truncate w-full text-center" style={{ color: !hasCoverage && !isService ? "#dc2626" : "#475569" }}>{zone.zone_code}</span>
                        <Badge variant={hasCoverage ? "secondary" : isService ? "outline" : "destructive"} className="text-[7px] px-1 h-3.5 mt-0.5">
                          {hasCoverage ? emps.length : isService ? "-" : "0"}
                        </Badge>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" side="top" align="center">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-sm" style={{ backgroundColor: zone.fill_color || ti?.color || "#22c55e" }} />
                          <div>
                            <p className="text-xs font-bold">{zone.zone_code}</p>
                            <p className="text-[10px] text-muted-foreground">{isAr ? zone.name_ar : zone.name_en}</p>
                          </div>
                        </div>
                        {emps.length > 0 && (
                          <div className="space-y-1">
                            {emps.map(emp => {
                              const shift = SHIFTS.find(s => s.value === emp.shift);
                              return (
                                <div key={emp.id} className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-50 group/emp">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: shift?.color || "#94a3b8" }}>{emp.name.charAt(0)}</div>
                                    <div>
                                      <span className="text-[10px] font-medium">{emp.name}</span>
                                      {shift && <p className="text-[8px] text-slate-400">{isAr ? shift.label_ar : shift.label_en}</p>}
                                    </div>
                                  </div>
                                  {activeSession?.status === "draft" && (
                                    <button onClick={() => handleUnassign(emp.id)} className="opacity-0 group-hover/emp:opacity-100 w-4 h-4 rounded bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-all">
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {activeSession?.status === "draft" && (
                          <Select onValueChange={(empId) => handleAssign(empId, zone.zone_code)}>
                            <SelectTrigger className="h-7 w-full text-[10px] border-dashed"><Plus className="w-3 h-3 ml-0.5 text-emerald-500" /><SelectValue placeholder={isAr ? "إضافة موظف" : "Add staff"} /></SelectTrigger>
                            <SelectContent>
                              {unassignedEmployees.map(emp => <SelectItem key={emp.id} value={emp.id} className="text-[10px]">{emp.name}</SelectItem>)}
                              {unassignedEmployees.length === 0 && <div className="text-[10px] text-muted-foreground p-2 text-center">{isAr ? "لا يوجد متاحين" : "None"}</div>}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
