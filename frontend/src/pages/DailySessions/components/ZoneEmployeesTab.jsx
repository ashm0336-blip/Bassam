import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Users, Search, UserCheck, UserX, MapPin, Plus, X, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SHIFTS = [
  { value: "الأولى", label_ar: "الوردية الأولى", label_en: "Shift 1", color: "#3b82f6" },
  { value: "الثانية", label_ar: "الوردية الثانية", label_en: "Shift 2", color: "#22c55e" },
  { value: "الثالثة", label_ar: "الوردية الثالثة", label_en: "Shift 3", color: "#f97316" },
  { value: "الرابعة", label_ar: "الوردية الرابعة", label_en: "Shift 4", color: "#8b5cf6" },
];

export function ZoneEmployeesTab({ activeZones, activeSession, ZONE_TYPES }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeShift, setActiveShift] = useState("all");
  const [expandedZone, setExpandedZone] = useState(null);

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

  // Map employees to zones by location (zone name)
  const zoneEmployeeMap = useMemo(() => {
    const map = {};
    activeZones.forEach(z => {
      const name = isAr ? z.name_ar : z.name_en;
      map[z.zone_code] = [];
    });
    employees.forEach(emp => {
      if (emp.location) {
        // Match by zone_code or name
        const zone = activeZones.find(z => z.zone_code === emp.location || z.name_ar === emp.location || z.name_en === emp.location);
        if (zone) {
          if (!map[zone.zone_code]) map[zone.zone_code] = [];
          map[zone.zone_code].push(emp);
        }
      }
    });
    return map;
  }, [activeZones, employees, isAr]);

  const assignedLocations = useMemo(() => {
    const codes = new Set();
    activeZones.forEach(z => { codes.add(z.zone_code); codes.add(z.name_ar); codes.add(z.name_en); });
    return codes;
  }, [activeZones]);

  const unassignedEmployees = useMemo(() => {
    return filteredEmployees.filter(emp => !emp.location || !assignedLocations.has(emp.location));
  }, [filteredEmployees, assignedLocations]);

  const assignedCount = useMemo(() => {
    return filteredEmployees.filter(emp => emp.location && assignedLocations.has(emp.location)).length;
  }, [filteredEmployees, assignedLocations]);

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

  const zonesWithNoStaff = activeZones.filter(z => {
    const emps = zoneEmployeeMap[z.zone_code] || [];
    return emps.length === 0;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 rounded-lg bg-emerald-100 animate-pulse flex items-center justify-center"><Users className="w-4 h-4 text-emerald-600" /></div></div>;
  }

  return (
    <div className="space-y-4" data-testid="zone-employees-tab">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-xl border bg-gradient-to-bl from-emerald-50 to-white p-3">
          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600" /><span className="text-[10px] text-muted-foreground">{isAr ? "إجمالي" : "Total"}</span></div>
          <p className="text-xl font-bold text-emerald-700 mt-1">{employees.length}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-bl from-blue-50 to-white p-3">
          <div className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-blue-600" /><span className="text-[10px] text-muted-foreground">{isAr ? "معيّنين" : "Assigned"}</span></div>
          <p className="text-xl font-bold text-blue-700 mt-1">{assignedCount}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-bl from-amber-50 to-white p-3">
          <div className="flex items-center gap-2"><UserX className="w-4 h-4 text-amber-600" /><span className="text-[10px] text-muted-foreground">{isAr ? "غير معيّنين" : "Unassigned"}</span></div>
          <p className="text-xl font-bold text-amber-700 mt-1">{unassignedEmployees.length}</p>
        </div>
        <div className={`rounded-xl border p-3 ${zonesWithNoStaff.length > 0 ? "bg-red-50 border-red-200" : "bg-gradient-to-bl from-slate-50 to-white"}`}>
          <div className="flex items-center gap-2"><AlertCircle className={`w-4 h-4 ${zonesWithNoStaff.length > 0 ? "text-red-500" : "text-slate-400"}`} /><span className="text-[10px] text-muted-foreground">{isAr ? "مناطق بدون موظفين" : "No Staff"}</span></div>
          <p className={`text-xl font-bold mt-1 ${zonesWithNoStaff.length > 0 ? "text-red-600" : "text-slate-400"}`}>{zonesWithNoStaff.length}</p>
        </div>
      </div>

      {/* Shifts + Search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button onClick={() => setActiveShift("all")} className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${activeShift === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
            {isAr ? "الكل" : "All"} ({shiftCounts.all})
          </button>
          {SHIFTS.map(s => (
            <button key={s.value} onClick={() => setActiveShift(s.value)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${activeShift === s.value ? "bg-white shadow-sm" : "text-slate-500"}`} style={activeShift === s.value ? { color: s.color } : {}}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />{shiftCounts[s.value] || 0}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={isAr ? "بحث عن موظف..." : "Search..."} className="pr-9 h-9 text-sm" />
        </div>
      </div>

      {/* Alert */}
      {zonesWithNoStaff.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5 mb-2">
            <AlertCircle className="w-4 h-4" />{isAr ? `${zonesWithNoStaff.length} مناطق بدون موظفين:` : `${zonesWithNoStaff.length} zones without staff:`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {zonesWithNoStaff.slice(0, 10).map(z => {
              const ti = ZONE_TYPES.find(t => t.value === z.zone_type);
              return <span key={z.id} className="text-[11px] px-2 py-0.5 bg-white rounded-full border border-red-200 text-red-600 font-medium">{z.zone_code}</span>;
            })}
            {zonesWithNoStaff.length > 10 && <span className="text-[11px] text-red-400">+{zonesWithNoStaff.length - 10}</span>}
          </div>
        </div>
      )}

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Zones with employees */}
        <div className="lg:col-span-3 space-y-2">
          <h3 className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />{isAr ? "توزيع الموظفين على المناطق" : "Staff Distribution"}
          </h3>
          <div className="space-y-1.5">
            {activeZones.map(zone => {
              const emps = zoneEmployeeMap[zone.zone_code] || [];
              const isExpanded = expandedZone === zone.id;
              const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
              return (
                <div key={zone.id} className={`rounded-xl border transition-all ${emps.length === 0 ? "border-amber-200 bg-amber-50/30" : "bg-white"}`}>
                  <button onClick={() => setExpandedZone(isExpanded ? null : zone.id)} className="w-full flex items-center justify-between px-3 py-2.5 text-right">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: zone.fill_color || ti?.color || "#22c55e" }} />
                      <span className="text-sm font-semibold truncate">{zone.zone_code}</span>
                      <span className="text-[10px] text-slate-400 truncate">{isAr ? zone.name_ar : zone.name_en}</span>
                      <Badge variant={emps.length > 0 ? "secondary" : "destructive"} className="text-[10px] px-1.5 flex-shrink-0">
                        <Users className="w-3 h-3 ml-0.5" />{emps.length}
                      </Badge>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t pt-2 space-y-1.5">
                      {emps.map(emp => {
                        const shift = SHIFTS.find(s => s.value === emp.shift);
                        return (
                          <div key={emp.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 group">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">{emp.name.charAt(0)}</div>
                              <div>
                                <span className="text-xs font-medium">{emp.name}</span>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <span>{emp.job_title}</span>
                                  {shift && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: shift.color }} />{isAr ? shift.label_ar : shift.label_en}</span>}
                                </div>
                              </div>
                            </div>
                            {activeSession?.status === "draft" && (
                              <button onClick={() => handleUnassign(emp.id)} className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center transition-all">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {activeSession?.status === "draft" && (
                        <Select onValueChange={(empId) => handleAssign(empId, zone.zone_code)}>
                          <SelectTrigger className="h-8 text-xs border-dashed"><Plus className="w-3 h-3 ml-1" /><SelectValue placeholder={isAr ? "إضافة موظف..." : "Add..."} /></SelectTrigger>
                          <SelectContent>
                            {unassignedEmployees.map(emp => <SelectItem key={emp.id} value={emp.id} className="text-xs">{emp.name} <span className="text-[10px] text-slate-400 mr-2">{emp.shift}</span></SelectItem>)}
                            {unassignedEmployees.length === 0 && <div className="text-xs text-muted-foreground p-2 text-center">{isAr ? "لا يوجد موظفين متاحين" : "None available"}</div>}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Unassigned */}
        <div className="lg:col-span-2 space-y-2">
          <h3 className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <UserX className="w-3.5 h-3.5 text-amber-600" />{isAr ? "غير معيّنين" : "Unassigned"}<Badge variant="secondary" className="text-[10px] px-1.5">{unassignedEmployees.length}</Badge>
          </h3>
          {unassignedEmployees.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-8 text-center"><UserCheck className="w-8 h-8 mx-auto text-emerald-400 mb-2" /><p className="text-xs text-muted-foreground">{isAr ? "جميع الموظفين معيّنين" : "All assigned"}</p></CardContent></Card>
          ) : (
            <div className="space-y-1.5">
              {unassignedEmployees.map(emp => {
                const shift = SHIFTS.find(s => s.value === emp.shift);
                return (
                  <div key={emp.id} className="flex items-center justify-between px-3 py-2 rounded-xl border bg-white hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: shift?.color || "#94a3b8" }}>{emp.name.charAt(0)}</div>
                      <div><span className="text-xs font-medium">{emp.name}</span><div className="text-[10px] text-slate-400">{emp.job_title}</div></div>
                    </div>
                    {activeSession?.status === "draft" && (
                      <Select onValueChange={(code) => handleAssign(emp.id, code)}>
                        <SelectTrigger className="h-7 w-auto min-w-[90px] text-[11px] border-dashed"><MapPin className="w-3 h-3 ml-0.5 text-emerald-500" /><SelectValue placeholder={isAr ? "عيّن" : "Assign"} /></SelectTrigger>
                        <SelectContent>
                          {activeZones.map(z => {
                            const ti = ZONE_TYPES.find(t => t.value === z.zone_type);
                            return <SelectItem key={z.id} value={z.zone_code} className="text-xs"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: z.fill_color || ti?.color || "#22c55e" }} />{z.zone_code}</div></SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {employees.length === 0 && (
        <Card className="border-dashed"><CardContent className="py-12 text-center">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="font-cairo font-semibold text-slate-600 mb-1">{isAr ? "لا يوجد موظفين" : "No employees"}</h3>
          <p className="text-xs text-muted-foreground">{isAr ? "أضف موظفين من إعدادات القسم أولاً" : "Add from settings first"}</p>
        </CardContent></Card>
      )}
    </div>
  );
}
