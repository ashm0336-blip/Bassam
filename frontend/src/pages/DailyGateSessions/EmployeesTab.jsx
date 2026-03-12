import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import {
  Users, Search, UserCheck, UserX, MapPin, Plus, X, AlertCircle, Percent,
  ZoomIn, ZoomOut, Maximize2, ChevronRight, Sparkles, CheckCircle2,
  DoorOpen, RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SHIFTS = [
  { value: "الأولى",  label_ar: "الوردية الأولى",  label_en: "Shift 1", color: "#3b82f6" },
  { value: "الثانية", label_ar: "الوردية الثانية", label_en: "Shift 2", color: "#22c55e" },
  { value: "الثالثة", label_ar: "الوردية الثالثة", label_en: "Shift 3", color: "#f97316" },
  { value: "الرابعة", label_ar: "الوردية الرابعة", label_en: "Shift 4", color: "#8b5cf6" },
];

export function EmployeesTab({ activeGates, activeSession, isAr, onUpdateGate, selectedFloor, imgRatio, STATUS_CONFIG }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeShift, setActiveShift] = useState("all");
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [coverageFilter, setCoverageFilter] = useState("all");
  const [hoveredGate, setHoveredGate] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Zoom/Pan
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const mapContainerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const isDraft = activeSession?.status === "draft";
  const panelWidth = '40%';
  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
  const mapImageUrl = selectedFloor?.image_url || null;

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
    node.addEventListener("wheel", handler, { passive: false });
    return () => { node.removeEventListener("wheel", handler); ro.disconnect(); };
  }, []);

  const zoomMap = (factor) => {
    const c = mapContainerRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const cx = r.width / 2, cy = r.height / 2;
    const p = zoomRef.current;
    const nz = Math.max(0.5, Math.min(5, p * factor));
    const s = nz / p;
    zoomRef.current = nz; setZoom(nz);
    setPanOffset(o => ({ x: cx - s * (cx - o.x), y: cy - s * (cy - o.y) }));
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/employees?department=gates`, getAuthHeaders());
        setEmployees(res.data.filter(e => {
          const wt = e.work_type || 'field';
          if (wt === 'admin') return false;
          if (e.employment_type !== 'permanent' && e.contract_end) {
            if (new Date(e.contract_end) < new Date(new Date().toDateString())) return false;
          }
          return true;
        }));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const gateEmployeeMap = useMemo(() => {
    const map = {};
    activeGates.forEach(g => {
      map[g.id] = (g.assigned_employee_ids || []).map(id => employees.find(e => e.id === id)).filter(Boolean);
    });
    return map;
  }, [activeGates, employees]);

  const employeeGatesMap = useMemo(() => {
    const map = {};
    activeGates.forEach(gate => {
      (gate.assigned_employee_ids || []).forEach(empId => {
        if (!map[empId]) map[empId] = [];
        map[empId].push(gate);
      });
    });
    return map;
  }, [activeGates]);

  const filteredEmployees = useMemo(() => {
    let emps = employees;
    if (activeShift !== "all") emps = emps.filter(e => e.shift === activeShift);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      emps = emps.filter(e => e.name?.toLowerCase().includes(q) || e.employee_number?.toLowerCase().includes(q));
    }
    return emps;
  }, [employees, activeShift, searchQuery]);

  const unassignedEmployees = useMemo(() => filteredEmployees.filter(emp => !(employeeGatesMap[emp.id]?.length > 0)), [filteredEmployees, employeeGatesMap]);
  const assignedCount = useMemo(() => employees.filter(e => employeeGatesMap[e.id]?.length > 0).length, [employees, employeeGatesMap]);
  const coveredGates = activeGates.filter(g => (gateEmployeeMap[g.id] || []).length > 0);
  const uncoveredGates = activeGates.filter(g => g.status === "open" && (gateEmployeeMap[g.id] || []).length === 0);
  const coveragePct = activeGates.length > 0 ? Math.round(coveredGates.length / activeGates.length * 100) : 0;

  const handleAssign = async (empId, gateId) => {
    const gate = activeGates.find(g => g.id === gateId);
    if (!gate) return;
    const newIds = [...new Set([...(gate.assigned_employee_ids || []), empId])];
    try {
      await onUpdateGate(gateId, { assigned_employee_ids: newIds, assigned_staff: newIds.length });
      toast.success(isAr ? "تم التعيين" : "Assigned", { duration: 1200 });
    } catch { toast.error(isAr ? "تعذر التعيين" : "Failed"); }
  };

  const handleUnassign = async (empId, gateId) => {
    const gate = activeGates.find(g => g.id === gateId);
    if (!gate) return;
    const newIds = (gate.assigned_employee_ids || []).filter(id => id !== empId);
    try {
      await onUpdateGate(gateId, { assigned_employee_ids: newIds, assigned_staff: newIds.length });
      toast.success(isAr ? "تم إلغاء التعيين" : "Unassigned", { duration: 1200 });
    } catch { toast.error(isAr ? "تعذر الإلغاء" : "Failed"); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12"><div className="w-8 h-8 rounded-lg bg-blue-100 animate-pulse flex items-center justify-center"><Users className="w-4 h-4 text-blue-600" /></div></div>
  );

  return (
    <div className="space-y-2" data-testid="gate-employees-tab">
      {/* Toolbar */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {[
            { key: 'all', label: isAr ? 'الكل' : 'All' },
            { key: 'uncovered', label: isAr ? 'بدون تغطية' : 'Uncovered' },
            { key: 'covered', label: isAr ? 'مغطاة' : 'Covered' },
          ].map(f => (
            <button key={f.key} onClick={() => setCoverageFilter(f.key)} data-testid={`coverage-filter-${f.key}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold transition-all ${coverageFilter === f.key ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {/* Legend */}
        <div className="hidden sm:flex items-center gap-2 text-[9px] text-slate-500 font-medium">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{isAr?"مغطاة":"Covered"}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{isAr?"غير مغطاة":"Uncovered"}</span>
        </div>
      </div>

      {/* Map + Side Panel */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200/60" style={{ height: 'min(600px, calc(100vh - 300px))' }}>
        {/* Panel toggle handle */}
        <div className="absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-300" style={{ right: panelCollapsed ? 0 : panelWidth }}>
          <button onClick={() => setPanelCollapsed(p => !p)}
            className="flex items-center justify-center w-5 h-14 bg-blue-600 hover:bg-blue-700 rounded-r-none rounded-l-lg shadow-lg transition-colors">
            <ChevronRight className="w-3 h-3 text-white transition-transform duration-300" style={{ transform: panelCollapsed ? 'rotate(180deg)' : '' }} />
          </button>
        </div>

        {/* Map */}
        <div className="absolute inset-0 bg-slate-50">
          {mapImageUrl ? (
            <div ref={wheelCallbackRef} className="relative overflow-hidden h-full" style={{ cursor: isPanning ? "grabbing" : "grab", touchAction: "none" }}
              onMouseDown={(e) => { if (e.button !== 0) return; e.preventDefault(); setIsPanning(true); setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y }); }}
              onMouseMove={(e) => {
                if (isPanning) { setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); return; }
                const c = mapContainerRef.current; if (!c) return;
                const rect = c.getBoundingClientRect();
                setMousePos({ x: e.clientX - rect.left + 16, y: e.clientY - rect.top - 10 });
              }}
              onMouseUp={() => setIsPanning(false)}
              onMouseLeave={() => { setIsPanning(false); setHoveredGate(null); }}
              data-testid="gate-emp-map-container"
            >
              {/* Zoom controls */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1 border rounded-lg p-1 bg-white/90 backdrop-blur shadow-sm">
                <button onClick={() => zoomMap(0.8)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100"><ZoomOut className="w-4 h-4 text-slate-600" /></button>
                <span className="text-xs w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
                <button onClick={() => zoomMap(1.25)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100"><ZoomIn className="w-4 h-4 text-slate-600" /></button>
                <button onClick={() => { zoomRef.current = 1; setZoom(1); setPanOffset({ x: 0, y: 0 }); }} className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100"><Maximize2 className="w-4 h-4 text-slate-600" /></button>
              </div>

              <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: "0 0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(() => {
                  let ws = { position: "relative", width: "100%", height: "100%" };
                  if (imgRatio && containerSize.w > 0 && containerSize.h > 0) {
                    const cw = containerSize.w, ch = containerSize.h;
                    if (cw / ch > imgRatio) ws = { position: "relative", height: "100%", width: ch * imgRatio };
                    else ws = { position: "relative", width: "100%", height: cw / imgRatio };
                  }
                  return (
                    <div style={ws}>
                      <img src={mapImageUrl} alt="" style={{ width: "100%", height: "100%", display: "block" }} draggable={false} className="pointer-events-none select-none" />
                      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }} viewBox="0 0 100 100" preserveAspectRatio="none">
                        {activeGates.filter(g => {
                          if (coverageFilter === 'uncovered') return g.status === 'open' && (gateEmployeeMap[g.id] || []).length === 0;
                          if (coverageFilter === 'covered') return (gateEmployeeMap[g.id] || []).length > 0;
                          return true;
                        }).map(gate => {
                          const emps = gateEmployeeMap[gate.id] || [];
                          const isCovered = emps.length > 0;
                          const isHov = hoveredGate === gate.id;
                          const ar = imgRatio || 1;
                          const r = isHov ? 1.0 : 0.7;
                          const color = isCovered ? "#22c55e" : gate.status === "open" ? "#ef4444" : "#94a3b8";
                          return (
                            <g key={gate.id}
                              onMouseEnter={() => setHoveredGate(gate.id)}
                              onMouseLeave={() => setHoveredGate(null)}
                              style={{ cursor: "pointer" }}>
                              <ellipse cx={gate.x} cy={gate.y} rx={r + 0.8} ry={(r + 0.8) * ar} fill={color} fillOpacity="0">
                                <animate attributeName="fill-opacity" values="0.1;0;0.1" dur="2s" repeatCount="indefinite" />
                              </ellipse>
                              <ellipse cx={gate.x} cy={gate.y} rx={r} ry={r * ar} fill={color} stroke="white" strokeWidth="0.15" vectorEffect="non-scaling-stroke" />
                              {isCovered && (
                                <g style={{ pointerEvents: "none" }}>
                                  <circle cx={gate.x + r * 0.7} cy={gate.y - r * ar * 0.7} r="0.45" fill="#3b82f6" stroke="white" strokeWidth="0.06" vectorEffect="non-scaling-stroke" />
                                  <text x={gate.x + r * 0.7} y={gate.y - r * ar * 0.7} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="0.55" fontWeight="800">{emps.length}</text>
                                </g>
                              )}
                              {!isCovered && gate.status === "open" && (
                                <g style={{ pointerEvents: "none" }}>
                                  <circle cx={gate.x + r * 0.7} cy={gate.y - r * ar * 0.7} r="0.4" fill="#f59e0b" stroke="white" strokeWidth="0.06" vectorEffect="non-scaling-stroke">
                                    <animate attributeName="fill-opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                                  </circle>
                                  <text x={gate.x + r * 0.7} y={gate.y - r * ar * 0.7} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="0.5" fontWeight="800">!</text>
                                </g>
                              )}
                              {isHov && (
                                <g style={{ pointerEvents: "none" }}>
                                  <rect x={gate.x - 5} y={gate.y - r * ar - 2} width="10" height="1.4" rx="0.3" fill="white" fillOpacity="0.92" stroke={color} strokeWidth="0.06" vectorEffect="non-scaling-stroke" />
                                  <text x={gate.x} y={gate.y - r * ar - 1.1} textAnchor="middle" dominantBaseline="middle" fill="#1e293b" fontSize="0.9" fontWeight="700" fontFamily="Cairo, sans-serif">{gate.name_ar}</text>
                                </g>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">{isAr ? "لا توجد خريطة" : "No map"}</div>
          )}
        </div>

        {/* Side Panel */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-gradient-to-b from-slate-50/98 to-white/98 backdrop-blur-sm border-l border-slate-200/80 overflow-y-auto shadow-xl z-25"
          style={{ width: panelWidth, transform: panelCollapsed ? 'translateX(100%)' : 'translateX(0)', transition: 'transform 0.3s ease' }}
          data-testid="gate-employees-panel"
        >
          <div className="p-4 space-y-3">
            <div className="text-center">
              <p className="text-[12px] font-bold font-cairo text-slate-600">{isAr ? "إدارة الموظفين" : "Staff Management"}</p>
            </div>
            <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: isAr ? "الإجمالي" : "Total", value: employees.length, icon: Users, color: "#3b82f6" },
                { label: isAr ? "معيّنين" : "Assigned", value: assignedCount, icon: UserCheck, color: "#10b981" },
                { label: isAr ? "غير مسكنين" : "Free", value: unassignedEmployees.length, icon: UserX, color: unassignedEmployees.length > 0 ? "#f59e0b" : "#10b981" },
              ].map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <div key={i} className="relative rounded-xl p-2.5 border border-slate-100 bg-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-10 h-10 rounded-bl-[1.5rem] opacity-[0.06]" style={{ backgroundColor: kpi.color }} />
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
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: isAr ? "بدون تغطية" : "Uncovered", value: uncoveredGates.length, icon: AlertCircle, color: uncoveredGates.length > 0 ? "#ef4444" : "#10b981" },
                { label: isAr ? "نسبة التغطية" : "Coverage", value: `${coveragePct}`, icon: Percent, color: coveragePct >= 80 ? "#10b981" : coveragePct >= 50 ? "#f59e0b" : "#ef4444", unit: "%" },
              ].map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <div key={i} className="relative rounded-xl p-2.5 border border-slate-100 bg-white overflow-hidden">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <p className="text-[8px] font-medium text-slate-400">{kpi.label}</p>
                        <div className="flex items-baseline gap-0.5">
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

            {/* Shift Cards */}
            <div>
              <p className="text-[12px] font-bold font-cairo text-slate-600 mb-1">{isAr ? "الموظفين حسب الورديات" : "Staff by Shift"}</p>
              <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent mb-2" />
              <div className="grid grid-cols-4 gap-1.5">
                {SHIFTS.map(s => {
                  const shiftEmps = employees.filter(e => e.shift === s.value);
                  const isActive = activeShift === s.value;
                  return (
                    <button key={s.value} onClick={() => setActiveShift(isActive ? "all" : s.value)}
                      className="flex flex-col gap-1 p-2 rounded-xl border-2 transition-all text-right"
                      style={{ borderColor: isActive ? s.color : "#e2e8f0", backgroundColor: isActive ? s.color + "15" : "#fafafa" }}>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-extrabold font-mono" style={{ color: s.color }}>{shiftEmps.length}</span>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      </div>
                      <p className="text-[9px] font-semibold text-slate-500 leading-tight">{isAr ? s.label_ar.replace("الوردية ", "") : s.label_en}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={isAr ? "بحث..." : "Search..."} className="pr-8 h-8 text-[11px]" />
            </div>

            <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />

            {/* Unassigned */}
            {unassignedEmployees.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                  <UserX className="w-3.5 h-3.5" />{isAr ? "غير معيّنين" : "Unassigned"}<Badge variant="secondary" className="text-[9px] px-1">{unassignedEmployees.length}</Badge>
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {unassignedEmployees.map(emp => {
                    const shift = SHIFTS.find(s => s.value === emp.shift);
                    return (
                      <div key={emp.id} className="flex items-center justify-between px-2.5 py-2 rounded-xl border bg-white hover:shadow-sm transition-all">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: shift?.color || "#94a3b8" }}>{emp.name.charAt(0)}</div>
                          <p className="text-[10px] font-semibold truncate">{emp.name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assigned */}
            {assignedCount > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1.5 mb-2">
                  <UserCheck className="w-3.5 h-3.5" />{isAr ? "معيّنون" : "Assigned"}<Badge className="text-[9px] px-1 bg-emerald-100 text-emerald-700">{assignedCount}</Badge>
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {employees.filter(e => employeeGatesMap[e.id]?.length > 0 && filteredEmployees.some(f => f.id === e.id)).map(emp => {
                    const shift = SHIFTS.find(s => s.value === emp.shift);
                    const empGates = employeeGatesMap[emp.id] || [];
                    return (
                      <div key={emp.id} className="px-2.5 py-2 rounded-xl border border-emerald-100 bg-emerald-50/50">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: shift?.color || "#22c55e" }}>{emp.name.charAt(0)}</div>
                          <p className="text-[10px] font-semibold truncate flex-1">{emp.name}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {empGates.map(gate => (
                            <span key={gate.id} className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-white border border-blue-200 text-blue-700 rounded-full px-2 py-0.5 shadow-sm">
                              {gate.name_ar}
                              {isDraft && <button onClick={() => handleUnassign(emp.id, gate.id)} className="w-3 h-3 text-red-400 hover:text-red-600 mr-0.5">✕</button>}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />

            {/* Gate Distribution - with multi-select popovers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold font-cairo text-slate-600">{isAr ? "التوزيع على الأبواب" : "Gate Assignment"}</p>
                {uncoveredGates.length > 0 && (
                  <span className="text-[9px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <AlertCircle className="w-2.5 h-2.5" />{uncoveredGates.length}
                  </span>
                )}
              </div>
              <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent mb-2" />
              <div className="grid grid-cols-5 gap-1.5 max-h-[200px] overflow-y-auto pr-0.5">
                {activeGates.map(gate => {
                  const emps = gateEmployeeMap[gate.id] || [];
                  const sc = (STATUS_CONFIG || {})[gate.status] || { color: "#6b7280", label_ar: "مغلق" };
                  const hasCoverage = emps.length > 0;
                  const assignedIds = new Set((gate.assigned_employee_ids || []).map(String));
                  return (
                    <Popover key={gate.id}>
                      <PopoverTrigger asChild>
                        <button className={`relative flex flex-col items-center justify-center rounded-lg border-2 p-1.5 transition-all hover:scale-105 hover:shadow-md
                          ${hasCoverage ? "bg-emerald-50 border-emerald-200" : gate.status === "open" ? "bg-red-50 border-red-300" : "bg-slate-50 border-slate-200"}`}
                          data-testid={`gate-emp-card-${gate.id}`}>
                          {!hasCoverage && gate.status === "open" && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center"><AlertCircle className="w-2 h-2 text-white" /></span>}
                          <div className="w-3 h-3 rounded-full mb-0.5" style={{ backgroundColor: sc.color }} />
                          <span className="text-[7px] font-bold text-slate-600 leading-tight truncate w-full text-center">{gate.name_ar}</span>
                          <Badge variant={hasCoverage ? "secondary" : "destructive"} className="text-[7px] px-1 h-3.5 mt-0.5">{hasCoverage ? emps.length : "0"}</Badge>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" side="top" align="center">
                        <div className="px-3 pt-3 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: sc.color }}><DoorOpen className="w-3 h-3 text-white" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold truncate">{gate.name_ar}</p>
                              {gate.plaza && <p className="text-[9px] text-slate-400">{gate.plaza}</p>}
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: hasCoverage ? "#ecfdf5" : "#fef2f2", color: hasCoverage ? "#059669" : "#dc2626", border: `1px solid ${hasCoverage ? "#a7f3d0" : "#fecaca"}` }}>
                              {emps.length} {isAr ? "موظف" : "staff"}
                            </span>
                          </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          {SHIFTS.map(shift => {
                            const shiftEmps = filteredEmployees.filter(e => e.shift === shift.value);
                            if (shiftEmps.length === 0) return null;
                            const shiftAssigned = shiftEmps.filter(e => assignedIds.has(e.id)).length;
                            return (
                              <div key={shift.value}>
                                <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: shift.color }} />
                                  <span className="text-[9px] font-bold text-slate-500 flex-1">{isAr ? shift.label_ar : shift.label_en}</span>
                                  {shiftAssigned > 0 && <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded-full">{shiftAssigned}</span>}
                                </div>
                                {shiftEmps.map(emp => {
                                  const isAssigned = assignedIds.has(emp.id);
                                  const otherGates = (employeeGatesMap[emp.id] || []).filter(g => g.id !== gate.id);
                                  return (
                                    <button key={emp.id} onClick={() => isDraft && (isAssigned ? handleUnassign(emp.id, gate.id) : handleAssign(emp.id, gate.id))} disabled={!isDraft}
                                      className={`w-full flex items-center gap-2 px-3 py-1.5 transition-all text-right group ${isAssigned ? "bg-emerald-50/60 hover:bg-emerald-50" : "hover:bg-slate-50"} ${!isDraft ? "cursor-default" : "cursor-pointer"}`}>
                                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${isAssigned ? "bg-emerald-500 border-emerald-500" : "border-slate-300 group-hover:border-emerald-400"}`}>
                                        {isAssigned && <CheckCircle2 className="w-3 h-3 text-white" />}
                                      </div>
                                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ backgroundColor: shift.color }}>{emp.name.charAt(0)}</div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-[10px] font-medium truncate ${isAssigned ? "text-emerald-800" : "text-slate-700"}`}>{emp.name}</p>
                                        {otherGates.length > 0 && <span className="text-[7px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">{otherGates.map(g => g.name_ar).join(", ")}</span>}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                        {!isDraft && (
                          <div className="px-3 py-2 bg-amber-50/80 border-t border-amber-200 text-center">
                            <p className="text-[9px] text-amber-700 font-semibold">{isAr ? "الجلسة مكتملة — أعد فتحها للتعديل" : "Session completed — reopen to edit"}</p>
                          </div>
                        )}
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
