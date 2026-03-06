import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import {
  Users, Search, UserCheck, UserX, MapPin, Plus, X, AlertCircle, Percent,
  ZoomIn, ZoomOut, Maximize2, PanelLeftClose
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

export function ZoneEmployeesTab({ activeZones, activeSession, ZONE_TYPES, selectedFloor, imgRatio }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeShift, setActiveShift] = useState("all");
  const [hoveredZone, setHoveredZone] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // Zoom/Pan state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const mapContainerRef = useRef(null);

  // Wheel zoom with passive:false to prevent page scroll
  const wheelCallbackRef = useCallback((node) => {
    if (!node) return;
    mapContainerRef.current = node;
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
    return () => { node.removeEventListener("wheel", handler); node.removeEventListener("touchstart", onTs); node.removeEventListener("touchmove", onTm); node.removeEventListener("touchend", onTe); };
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
    <div className="relative rounded-xl overflow-hidden border border-slate-200/60" style={{ alignItems: "stretch" }} data-testid="zone-employees-tab">
      {/* Show button when panel is collapsed */}
      {panelCollapsed && (
        <button onClick={() => setPanelCollapsed(false)}
          className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/90 backdrop-blur border border-slate-200 shadow-sm hover:bg-emerald-50 hover:border-emerald-300 transition-all"
          data-testid="employees-panel-show-btn">
          <PanelLeftClose className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[10px] font-semibold text-emerald-700">{isAr ? "إدارة الموظفين" : "Staff Panel"}</span>
        </button>
      )}
      {/* LEFT: Coverage Map - always full width */}
      <div className="flex-[3] min-w-0 relative bg-slate-50 flex flex-col">
        {mapImageUrl ? (
          <>
          <div className="relative flex-1" style={{ minHeight: "500px" }}>
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
                  if (imgRatio) {
                    const ch = 600;
                    const cw = mapContainerRef.current?.clientWidth || 800;
                    if (cw / ch > imgRatio) ws = { position: "relative", height: "100%", width: ch * imgRatio };
                    else ws = { position: "relative", width: "100%", height: cw / imgRatio };
                  }
                  return (
                    <div style={ws} data-map-inner="true">
                      <img src={mapImageUrl} alt="" style={{ width: "100%", height: "100%", display: "block", imageRendering: "high-quality" }} draggable={false} className="pointer-events-none select-none" />
                      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 100 100" preserveAspectRatio="none" data-testid="coverage-map">
                        {activeZones.filter(z => !z.is_removed && z.polygon_points?.length > 1).map(zone => {
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
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <p className="text-[12px] font-bold font-cairo text-slate-600 tracking-wide">{isAr ? "إدارة الموظفين" : "Staff Management"}</p>
            <div className="flex-1 flex justify-end">
              <button onClick={() => setPanelCollapsed(true)}
                className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-100 transition-all"
                data-testid="employees-panel-close-btn">
                <PanelLeftClose className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
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

          {/* Shift Filter */}
          <div className="flex items-center gap-1 flex-wrap">
            <button onClick={() => setActiveShift("all")} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${activeShift === "all" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {isAr ? "الكل" : "All"} ({shiftCounts.all})
            </button>
            {SHIFTS.map(s => (
              <button key={s.value} onClick={() => setActiveShift(s.value)} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${activeShift === s.value ? "bg-white shadow-sm border" : "bg-slate-100 text-slate-500"}`} style={activeShift === s.value ? { color: s.color, borderColor: s.color + '40' } : {}}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />{shiftCounts[s.value] || 0}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={isAr ? "بحث..." : "Search..."} className="pr-8 h-8 text-[11px]" data-testid="employee-search" />
          </div>

          <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />

          {/* Uncovered Alert - scrollable */}
          {uncoveredZones.length > 0 && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-[10px] font-semibold text-red-700 flex items-center gap-1 mb-1.5">
                <AlertCircle className="w-3.5 h-3.5" />{isAr ? `${uncoveredZones.length} منطقة بدون تغطية` : `${uncoveredZones.length} uncovered`}
              </p>
              <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto">
                {uncoveredZones.map(z => (
                  <span key={z.id} className="text-[9px] px-1.5 py-0.5 bg-white rounded-full border border-red-200 text-red-600 font-medium">{z.zone_code}</span>
                ))}
              </div>
            </div>
          )}

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

          {/* Distribution - Card Grid with Popover */}
          <div>
            <div className="text-center mb-3">
              <p className="text-[12px] font-bold font-cairo text-slate-600 tracking-wide">{isAr ? "التوزيع على المناطق" : "Zone Distribution"}</p>
              <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent mt-2" />
            </div>
            <div className="grid grid-cols-5 gap-1.5 max-h-[300px] overflow-y-auto pr-0.5">
              {activeZones.filter(z => !z.is_removed).map(zone => {
                const emps = zoneEmployeeMap[zone.zone_code] || [];
                const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                const hasCoverage = emps.length > 0;
                const isService = zone.zone_type === "service";
                return (
                  <Popover key={zone.id}>
                    <PopoverTrigger asChild>
                      <button
                        className={`relative flex flex-col items-center justify-center rounded-lg border p-1.5 transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-md
                          ${hasCoverage ? "bg-emerald-50 border-emerald-200 hover:border-emerald-400" :
                            isService ? "bg-slate-50 border-slate-200 hover:border-slate-400" :
                            "bg-red-50 border-red-200 hover:border-red-400"}`}
                        onMouseEnter={() => setHoveredZone(zone.id)}
                        onMouseLeave={() => setHoveredZone(null)}
                        data-testid={`zone-card-${zone.id}`}
                      >
                        <span className="w-3 h-3 rounded-sm mb-0.5" style={{ backgroundColor: zone.fill_color || ti?.color || "#22c55e" }} />
                        <span className="text-[7px] font-bold text-slate-600 leading-tight truncate w-full text-center">{zone.zone_code}</span>
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
  );
}
