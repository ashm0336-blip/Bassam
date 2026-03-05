import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Users, Search, UserCheck, UserX, MapPin, Plus, X, AlertCircle, ShieldCheck, Percent
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const uncoveredZones = activeZones.filter(z => (zoneEmployeeMap[z.zone_code] || []).length === 0);
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
    const isService = zone.zone_type === "service";
    if (isService) return { fill: "#94a3b8", opacity: 0.15 };
    if (emps.length > 0) return { fill: "#22c55e", opacity: 0.35 };
    return { fill: "#ef4444", opacity: 0.3 };
  };

  const mapImageUrl = selectedFloor?.image_url ? normalizeImageUrl(selectedFloor.image_url) : null;

  return (
    <div className="flex gap-0 rounded-xl overflow-hidden border border-slate-200/60" style={{ alignItems: "stretch" }} data-testid="zone-employees-tab">
      {/* LEFT: Coverage Map (60%) */}
      <div className="flex-[3] min-w-0 relative bg-slate-50">
        {mapImageUrl ? (
          <div className="relative w-full" style={{ paddingBottom: imgRatio ? `${(1 / imgRatio) * 100}%` : "75%" }}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
              data-testid="coverage-map"
            >
              <image href={mapImageUrl} x="0" y="0" width="100" height="100" preserveAspectRatio="none" />
              {activeZones.filter(z => !z.is_removed && z.polygon_points?.length > 1).map(zone => {
                const { fill, opacity } = getZoneCoverageColor(zone);
                const pts = zone.polygon_points.map(p => `${p.x},${p.y}`).join(" ");
                const emps = zoneEmployeeMap[zone.zone_code] || [];
                const isHovered = hoveredZone === zone.id;
                const cx = zone.polygon_points.reduce((s, p) => s + p.x, 0) / zone.polygon_points.length;
                const cy = zone.polygon_points.reduce((s, p) => s + p.y, 0) / zone.polygon_points.length;
                return (
                  <g key={zone.id}
                    onMouseEnter={() => setHoveredZone(zone.id)}
                    onMouseLeave={() => setHoveredZone(null)}
                    className="cursor-pointer"
                  >
                    <polygon
                      points={pts}
                      fill={fill}
                      fillOpacity={isHovered ? opacity + 0.2 : opacity}
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
            {/* Tooltip */}
            {hoveredZone && (() => {
              const zone = activeZones.find(z => z.id === hoveredZone);
              if (!zone) return null;
              const emps = zoneEmployeeMap[zone.zone_code] || [];
              return (
                <div className="absolute top-3 left-3 z-20 bg-slate-900/95 text-white rounded-xl px-3 py-2.5 shadow-xl backdrop-blur-sm max-w-[200px]" data-testid="coverage-tooltip">
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
                    <p className="text-[9px] text-red-300 mt-1">{isAr ? "بدون موظف" : "No staff"}</p>
                  )}
                </div>
              );
            })()}
            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 opacity-60" /><span className="text-[9px] text-slate-600">{isAr ? "مغطاة" : "Covered"}</span></div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 opacity-60" /><span className="text-[9px] text-slate-600">{isAr ? "غير مغطاة" : "Uncovered"}</span></div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-400 opacity-40" /><span className="text-[9px] text-slate-600">{isAr ? "خدمات" : "Service"}</span></div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">{isAr ? "لا توجد خريطة" : "No map"}</div>
        )}
      </div>

      {/* RIGHT: Control Panel (40%) */}
      <div className="w-[40%] flex-shrink-0 bg-gradient-to-b from-slate-50/95 to-white/95 backdrop-blur-sm border-l border-slate-200/80 overflow-y-auto overflow-x-hidden" data-testid="employees-panel">
        <div className="p-4 space-y-4">
          {/* Panel Header */}
          <div className="text-center">
            <p className="text-[12px] font-bold font-cairo text-slate-600 tracking-wide">{isAr ? "إدارة الموظفين" : "Staff Management"}</p>
          </div>
          <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />

          {/* KPI Cards - 3 columns */}
          <div className="grid grid-cols-3 gap-2" data-testid="employee-kpi-grid">
            {[
              { label: isAr ? "معيّنين" : "Assigned", value: assignedCount, icon: UserCheck, color: "#10b981" },
              { label: isAr ? "بدون تغطية" : "Uncovered", value: uncoveredZones.length, icon: AlertCircle, color: uncoveredZones.length > 0 ? "#ef4444" : "#10b981" },
              { label: isAr ? "نسبة التغطية" : "Coverage", value: `${coveragePct}`, icon: Percent, color: coveragePct >= 80 ? "#10b981" : coveragePct >= 50 ? "#f59e0b" : "#ef4444", unit: "%" },
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

          {/* Uncovered Alert */}
          {uncoveredZones.length > 0 && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-[10px] font-semibold text-red-700 flex items-center gap-1 mb-1.5">
                <AlertCircle className="w-3.5 h-3.5" />{isAr ? `${uncoveredZones.length} منطقة بدون تغطية` : `${uncoveredZones.length} uncovered`}
              </p>
              <div className="flex flex-wrap gap-1">
                {uncoveredZones.slice(0, 8).map(z => (
                  <span key={z.id} className="text-[9px] px-1.5 py-0.5 bg-white rounded-full border border-red-200 text-red-600 font-medium">{z.zone_code}</span>
                ))}
                {uncoveredZones.length > 8 && <span className="text-[9px] text-red-400 self-center">+{uncoveredZones.length - 8}</span>}
              </div>
            </div>
          )}

          {/* Unassigned Employees */}
          {unassignedEmployees.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                <UserX className="w-3.5 h-3.5" />{isAr ? "غير معيّنين" : "Unassigned"}<Badge variant="secondary" className="text-[9px] px-1">{unassignedEmployees.length}</Badge>
              </p>
              <div className="space-y-1 max-h-[140px] overflow-y-auto">
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

          {unassignedEmployees.length === 0 && employees.length > 0 && (
            <div className="text-center py-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50">
              <UserCheck className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
              <p className="text-[10px] text-emerald-600 font-medium">{isAr ? "جميع الموظفين معيّنين" : "All assigned"}</p>
            </div>
          )}

          <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />

          {/* Assigned employees by zone - compact list */}
          <div>
            <p className="text-[10px] font-semibold text-slate-600 flex items-center gap-1.5 mb-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />{isAr ? "التوزيع على المناطق" : "Distribution"}
            </p>
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-0.5">
              {activeZones.filter(z => !z.is_removed).map(zone => {
                const emps = zoneEmployeeMap[zone.zone_code] || [];
                const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                const isHovered = hoveredZone === zone.id;
                return (
                  <div
                    key={zone.id}
                    className={`rounded-lg border p-2 transition-all ${isHovered ? "border-emerald-300 bg-emerald-50/50 shadow-sm" : emps.length === 0 ? "border-red-100 bg-red-50/30" : "bg-white"}`}
                    onMouseEnter={() => setHoveredZone(zone.id)}
                    onMouseLeave={() => setHoveredZone(null)}
                    data-testid={`zone-staff-${zone.id}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: zone.fill_color || ti?.color || "#22c55e" }} />
                        <span className="text-[10px] font-semibold truncate">{zone.zone_code}</span>
                      </div>
                      <Badge variant={emps.length > 0 ? "secondary" : "destructive"} className="text-[8px] px-1 h-4">
                        <Users className="w-2.5 h-2.5 ml-0.5" />{emps.length}
                      </Badge>
                    </div>
                    {emps.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {emps.map(emp => {
                          const shift = SHIFTS.find(s => s.value === emp.shift);
                          return (
                            <div key={emp.id} className="flex items-center justify-between group/emp">
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: shift?.color || "#94a3b8" }} />
                                <span className="text-[9px] text-slate-600">{emp.name}</span>
                              </div>
                              {activeSession?.status === "draft" && (
                                <button onClick={() => handleUnassign(emp.id)} className="opacity-0 group-hover/emp:opacity-100 w-3.5 h-3.5 rounded bg-red-100 text-red-500 flex items-center justify-center transition-all hover:bg-red-200">
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {emps.length === 0 && activeSession?.status === "draft" && (
                      <Select onValueChange={(empId) => handleAssign(empId, zone.zone_code)}>
                        <SelectTrigger className="h-5 w-full text-[9px] border-dashed mt-1 px-1.5"><Plus className="w-2.5 h-2.5 ml-0.5 text-emerald-500" /><SelectValue placeholder={isAr ? "إضافة موظف" : "Add staff"} /></SelectTrigger>
                        <SelectContent>
                          {unassignedEmployees.map(emp => <SelectItem key={emp.id} value={emp.id} className="text-[10px]">{emp.name}</SelectItem>)}
                          {unassignedEmployees.length === 0 && <div className="text-[10px] text-muted-foreground p-2 text-center">{isAr ? "لا يوجد متاحين" : "None"}</div>}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
