import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Users, Search, UserCheck, UserX, MapPin, Plus, X, AlertCircle,
  ChevronDown, Zap, HardHat,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SHIFTS = [
  { value: "الأولى",  label_ar: "الوردية الأولى",  color: "#3b82f6" },
  { value: "الثانية", label_ar: "الوردية الثانية", color: "#22c55e" },
  { value: "الثالثة", label_ar: "الوردية الثالثة", color: "#f97316" },
  { value: "الرابعة", label_ar: "الوردية الرابعة", color: "#8b5cf6" },
];

export function EmployeesTab({ activeGates, activeSession, isAr, onUpdateGate }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeShift, setActiveShift] = useState("all");

  const isDraft = activeSession?.status === "draft";
  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/employees?department=gates`, getAuthHeaders());
        setEmployees(res.data.filter(e => {
          // Only field/both employees
          const wt = e.work_type || 'field';
          if (wt === 'admin') return false;
          // Active contract
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

  // ── Gate → Employees (source: gate.assigned_employee_ids) ──
  const gateEmployeeMap = useMemo(() => {
    const map = {};
    activeGates.forEach(g => {
      const emps = (g.assigned_employee_ids || [])
        .map(id => employees.find(e => e.id === id))
        .filter(Boolean);
      map[g.id] = emps;
      if (!map[g.name_ar]) map[g.name_ar] = emps;
    });
    return map;
  }, [activeGates, employees]);

  // ── Employee → Gates (inverse) ──
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
      emps = emps.filter(e => e.name?.toLowerCase().includes(q));
    }
    return emps;
  }, [employees, activeShift, searchQuery]);

  const unassignedEmployees = useMemo(() =>
    filteredEmployees.filter(emp => !(employeeGatesMap[emp.id]?.length > 0)),
    [filteredEmployees, employeeGatesMap]
  );
  const assignedCount = useMemo(() =>
    employees.filter(e => employeeGatesMap[e.id]?.length > 0).length,
    [employees, employeeGatesMap]
  );

  // Assign employee to gate (M2M)
  const handleAssign = async (empId, gateId) => {
    const gate = activeGates.find(g => g.id === gateId);
    if (!gate) return;
    const newIds = [...new Set([...(gate.assigned_employee_ids || []), empId])];
    try {
      await onUpdateGate(gateId, { assigned_employee_ids: newIds, assigned_staff: newIds.length });
      toast.success(isAr ? "تم التعيين ✅" : "Assigned", { duration: 1200 });
    } catch { toast.error(isAr ? "تعذر التعيين" : "Failed"); }
  };

  // Unassign employee from gate
  const handleUnassign = async (empId, gateId) => {
    const gate = activeGates.find(g => g.id === gateId);
    if (!gate) return;
    const newIds = (gate.assigned_employee_ids || []).filter(id => id !== empId);
    try {
      await onUpdateGate(gateId, { assigned_employee_ids: newIds, assigned_staff: newIds.length });
      toast.success(isAr ? "تم إلغاء التعيين" : "Unassigned", { duration: 1200 });
    } catch { toast.error(isAr ? "تعذر الإلغاء" : "Failed"); }
  };

  const shiftCounts = useMemo(() => {
    const c = { all: employees.length };
    SHIFTS.forEach(s => { c[s.value] = employees.filter(e => e.shift === s.value).length; });
    return c;
  }, [employees]);

  const gatesWithNoStaff = activeGates.filter(g => g.status === "open" && !(g.assigned_employee_ids?.length > 0));

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 rounded-lg bg-blue-100 animate-pulse flex items-center justify-center">
        <Users className="w-4 h-4 text-blue-600" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4" data-testid="employees-tab">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-xl border bg-gradient-to-bl from-blue-50 to-white p-3">
          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-600"/><span className="text-[10px] text-muted-foreground">{isAr?"إجمالي":"Total"}</span></div>
          <p className="text-xl font-bold text-blue-700 mt-1">{employees.length}</p>
          <p className="text-[9px] text-blue-400 mt-0.5">{isAr?"ميدانيون فقط":"Field only"}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-bl from-emerald-50 to-white p-3">
          <div className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-emerald-600"/><span className="text-[10px] text-muted-foreground">{isAr?"معيّنون":"Assigned"}</span></div>
          <p className="text-xl font-bold text-emerald-700 mt-1">{assignedCount}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-bl from-amber-50 to-white p-3">
          <div className="flex items-center gap-2"><UserX className="w-4 h-4 text-amber-600"/><span className="text-[10px] text-muted-foreground">{isAr?"غير معيّنين":"Unassigned"}</span></div>
          <p className="text-xl font-bold text-amber-700 mt-1">{unassignedEmployees.length}</p>
        </div>
        <div className={`rounded-xl border p-3 ${gatesWithNoStaff.length > 0 ? "bg-red-50 border-red-200" : "bg-slate-50"}`}>
          <div className="flex items-center gap-2">
            <AlertCircle className={`w-4 h-4 ${gatesWithNoStaff.length > 0 ? "text-red-500" : "text-slate-400"}`}/>
            <span className="text-[10px] text-muted-foreground">{isAr?"أبواب بدون موظفين":"No Staff"}</span>
          </div>
          <p className={`text-xl font-bold mt-1 ${gatesWithNoStaff.length > 0 ? "text-red-600" : "text-slate-400"}`}>{gatesWithNoStaff.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button onClick={() => setActiveShift("all")}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${activeShift === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
            {isAr?"الكل":"All"} ({shiftCounts.all})
          </button>
          {SHIFTS.map(s => (
            <button key={s.value} onClick={() => setActiveShift(s.value)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${activeShift === s.value ? "bg-white shadow-sm" : "text-slate-500"}`}
              style={activeShift === s.value ? { color: s.color } : {}}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}/>
              {shiftCounts[s.value] || 0}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={isAr?"بحث عن موظف...":"Search..."}
            className="pr-9 h-9 text-sm"/>
        </div>
      </div>

      {/* Alert: unattended gates */}
      {gatesWithNoStaff.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0"/>
          <p className="text-sm text-red-700 font-medium">
            {isAr ? `${gatesWithNoStaff.length} بوابة بدون موظفين` : `${gatesWithNoStaff.length} gates without staff`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Employee list */}
        <div className="space-y-3">
          {/* Unassigned */}
          {unassignedEmployees.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                <UserX className="w-3.5 h-3.5"/>{isAr?"غير معيّنين":"Unassigned"}
                <Badge variant="secondary" className="text-[9px] px-1">{unassignedEmployees.length}</Badge>
              </p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {unassignedEmployees.map(emp => {
                  const shift = SHIFTS.find(s => s.value === emp.shift);
                  return (
                    <div key={emp.id} className="flex items-center justify-between px-2.5 py-2 rounded-xl border bg-white hover:shadow-sm transition-all" data-testid={`unassigned-emp-${emp.id}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: shift?.color || "#94a3b8" }}>{emp.name.charAt(0)}</div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold truncate">{emp.name}</p>
                          {emp.is_tasked && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded-full">مكلف ⚡</span>}
                        </div>
                      </div>
                      {isDraft && (
                        <Select onValueChange={(gateId) => handleAssign(emp.id, gateId)}>
                          <SelectTrigger className="h-6 w-auto min-w-[64px] text-[9px] border-dashed px-1.5 gap-1">
                            <MapPin className="w-2.5 h-2.5 text-blue-500"/>
                            <SelectValue placeholder={isAr?"عيّن":"Assign"}/>
                          </SelectTrigger>
                          <SelectContent>
                            {activeGates.map(g => (
                              <SelectItem key={g.id} value={g.id} className="text-[10px]">{g.name_ar}</SelectItem>
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

          {/* Assigned employees with gate tags */}
          {employees.filter(e => employeeGatesMap[e.id]?.length > 0 && filteredEmployees.some(f => f.id === e.id)).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1.5 mb-2">
                <UserCheck className="w-3.5 h-3.5"/>{isAr?"معيّنون":"Assigned"}
                <Badge className="text-[9px] px-1 bg-emerald-100 text-emerald-700">{assignedCount}</Badge>
              </p>
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {employees.filter(e => employeeGatesMap[e.id]?.length > 0 && filteredEmployees.some(f => f.id === e.id)).map(emp => {
                  const shift = SHIFTS.find(s => s.value === emp.shift);
                  const empGates = employeeGatesMap[emp.id] || [];
                  return (
                    <div key={emp.id} className="px-2.5 py-2 rounded-xl border border-emerald-100 bg-emerald-50/50" data-testid={`assigned-emp-${emp.id}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: shift?.color || "#22c55e" }}>{emp.name.charAt(0)}</div>
                        <p className="text-[11px] font-semibold truncate flex-1">{emp.name}</p>
                        {emp.is_tasked && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded-full">⚡</span>}
                      </div>
                      {/* Gate tags */}
                      <div className="flex flex-wrap gap-1 items-center">
                        {empGates.map(gate => (
                          <span key={gate.id} className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-white border border-blue-200 text-blue-700 rounded-full px-2 py-0.5 shadow-sm">
                            {gate.name_ar}
                            {isDraft && (
                              <button onClick={() => handleUnassign(emp.id, gate.id)}
                                className="w-3 h-3 flex items-center justify-center rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 mr-0.5"
                                data-testid={`unassign-${emp.id}-${gate.id}`}>✕</button>
                            )}
                          </span>
                        ))}
                        {isDraft && (
                          <Select onValueChange={(gateId) => handleAssign(emp.id, gateId)}>
                            <SelectTrigger className="h-5 text-[8px] border-dashed border-blue-300 px-1.5 gap-0.5 rounded-full w-auto">
                              <Plus className="w-2.5 h-2.5 text-blue-500"/>
                            </SelectTrigger>
                            <SelectContent>
                              {activeGates.filter(g => !(g.assigned_employee_ids || []).includes(emp.id)).map(g => (
                                <SelectItem key={g.id} value={g.id} className="text-[10px]">{g.name_ar}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Gates with staff */}
        <div>
          <p className="text-[10px] font-semibold text-blue-700 flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5"/>{isAr?"توزيع الموظفين على البوابات":"Gate Assignment"}
          </p>
          <div className="space-y-1.5 max-h-[460px] overflow-y-auto">
            {activeGates.map(gate => {
              const gateEmps = gateEmployeeMap[gate.id] || [];
              const isCovered = gateEmps.length > 0;
              return (
                <div key={gate.id} className={`rounded-xl border p-2.5 transition-all
                  ${isCovered ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-100 bg-red-50/20'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin className={`w-3 h-3 ${isCovered ? 'text-emerald-500' : 'text-red-400'}`}/>
                      <span className="text-[11px] font-bold">{gate.name_ar}</span>
                      {gate.plaza && <span className="text-[9px] text-slate-400">{gate.plaza}</span>}
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isCovered ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-500'}`}>
                      {isCovered ? `✓ ${gateEmps.length}` : '○ فارغة'}
                    </span>
                  </div>
                  {gateEmps.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {gateEmps.map(emp => (
                        <div key={emp.id} className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-0.5 group/emp">
                          <span className="text-[9px] font-medium">{emp.name}</span>
                          {isDraft && (
                            <button onClick={() => handleUnassign(emp.id, gate.id)}
                              className="w-3 h-3 rounded-full text-red-400 opacity-0 group-hover/emp:opacity-100 hover:text-red-600 transition-all">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {isDraft && (
                    <Select onValueChange={(empId) => handleAssign(empId, gate.id)}>
                      <SelectTrigger className="h-7 w-full text-[10px] border-dashed mt-0.5">
                        <Plus className="w-3 h-3 ml-0.5 text-blue-500"/>
                        <SelectValue placeholder={isAr?"إضافة موظف":"Add staff"}/>
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedEmployees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id} className="text-[10px]">{emp.name}</SelectItem>
                        ))}
                        {unassignedEmployees.length === 0 && (
                          <div className="text-[10px] text-muted-foreground p-2 text-center">{isAr?"لا يوجد متاحون":"None available"}</div>
                        )}
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
  );
}
