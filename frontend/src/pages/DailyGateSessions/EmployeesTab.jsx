import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Users, Search, UserCheck, UserX, MapPin, Plus, X, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SHIFTS = [
  { value: "الأولى", label_ar: "الوردية الأولى", label_en: "Shift 1", color: "#3b82f6" },
  { value: "الثانية", label_ar: "الوردية الثانية", label_en: "Shift 2", color: "#22c55e" },
  { value: "الثالثة", label_ar: "الوردية الثالثة", label_en: "Shift 3", color: "#f97316" },
  { value: "الرابعة", label_ar: "الوردية الرابعة", label_en: "Shift 4", color: "#8b5cf6" },
];

export function EmployeesTab({ activeGates, activeSession, isAr, onUpdateGate }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeShift, setActiveShift] = useState("all");
  const [expandedGate, setExpandedGate] = useState(null);

  const isDraft = activeSession?.status === "draft";
  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get(`${API}/employees?department=gates`, getAuthHeaders());
        setEmployees(res.data.filter(e => e.is_active));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchEmployees();
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

  // Map employees to gates by location
  const gateEmployeeMap = useMemo(() => {
    const map = {};
    activeGates.forEach(g => { map[g.name_ar] = []; });
    employees.forEach(emp => {
      if (emp.location && map[emp.location] !== undefined) {
        map[emp.location].push(emp);
      }
    });
    return map;
  }, [activeGates, employees]);

  const unassignedEmployees = useMemo(() => {
    const assignedLocations = new Set(activeGates.map(g => g.name_ar));
    return filteredEmployees.filter(emp => !emp.location || !assignedLocations.has(emp.location));
  }, [filteredEmployees, activeGates]);

  const assignedEmployees = useMemo(() => {
    const assignedLocations = new Set(activeGates.map(g => g.name_ar));
    return filteredEmployees.filter(emp => emp.location && assignedLocations.has(emp.location));
  }, [filteredEmployees, activeGates]);

  const handleAssignEmployee = async (employeeId, gateName) => {
    try {
      await axios.put(`${API}/employees/${employeeId}`, { location: gateName }, getAuthHeaders());
      setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, location: gateName } : e));
      // Update gate staff count
      const gate = activeGates.find(g => g.name_ar === gateName);
      if (gate) {
        const newCount = (gateEmployeeMap[gateName]?.length || 0) + 1;
        onUpdateGate(gate.id, { assigned_staff: newCount });
      }
      toast.success(isAr ? "تم تعيين الموظف" : "Employee assigned", { duration: 1200 });
    } catch (e) { toast.error(isAr ? "تعذر التعيين" : "Assignment failed"); }
  };

  const handleUnassignEmployee = async (employeeId, oldGateName) => {
    try {
      await axios.put(`${API}/employees/${employeeId}`, { location: "" }, getAuthHeaders());
      setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, location: "" } : e));
      const gate = activeGates.find(g => g.name_ar === oldGateName);
      if (gate) {
        const newCount = Math.max(0, (gateEmployeeMap[oldGateName]?.length || 1) - 1);
        onUpdateGate(gate.id, { assigned_staff: newCount });
      }
      toast.success(isAr ? "تم إلغاء التعيين" : "Unassigned", { duration: 1200 });
    } catch (e) { toast.error(isAr ? "تعذر الإلغاء" : "Failed"); }
  };

  const shiftCounts = useMemo(() => {
    const counts = { all: employees.length };
    SHIFTS.forEach(s => { counts[s.value] = employees.filter(e => e.shift === s.value).length; });
    return counts;
  }, [employees]);

  const gatesWithNoStaff = activeGates.filter(g => g.status === "open" && (!gateEmployeeMap[g.name_ar] || gateEmployeeMap[g.name_ar].length === 0));

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 rounded-lg bg-blue-100 animate-pulse flex items-center justify-center"><Users className="w-4 h-4 text-blue-600" /></div></div>;
  }

  return (
    <div className="space-y-4" data-testid="employees-tab">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-xl border bg-gradient-to-bl from-blue-50 to-white p-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] text-muted-foreground">{isAr ? "إجمالي" : "Total"}</span>
          </div>
          <p className="text-xl font-bold text-blue-700 mt-1">{employees.length}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-bl from-emerald-50 to-white p-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] text-muted-foreground">{isAr ? "معيّنين" : "Assigned"}</span>
          </div>
          <p className="text-xl font-bold text-emerald-700 mt-1">{assignedEmployees.length}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-bl from-amber-50 to-white p-3">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-amber-600" />
            <span className="text-[10px] text-muted-foreground">{isAr ? "غير معيّنين" : "Unassigned"}</span>
          </div>
          <p className="text-xl font-bold text-amber-700 mt-1">{unassignedEmployees.length}</p>
        </div>
        <div className={`rounded-xl border p-3 ${gatesWithNoStaff.length > 0 ? "bg-red-50 border-red-200" : "bg-gradient-to-bl from-slate-50 to-white"}`}>
          <div className="flex items-center gap-2">
            <AlertCircle className={`w-4 h-4 ${gatesWithNoStaff.length > 0 ? "text-red-500" : "text-slate-400"}`} />
            <span className="text-[10px] text-muted-foreground">{isAr ? "أبواب بدون موظفين" : "No Staff"}</span>
          </div>
          <p className={`text-xl font-bold mt-1 ${gatesWithNoStaff.length > 0 ? "text-red-600" : "text-slate-400"}`}>{gatesWithNoStaff.length}</p>
        </div>
      </div>

      {/* Shifts filter + Search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setActiveShift("all")}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${activeShift === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
          >
            {isAr ? "الكل" : "All"} ({shiftCounts.all})
          </button>
          {SHIFTS.map(s => (
            <button
              key={s.value}
              onClick={() => setActiveShift(s.value)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${activeShift === s.value ? "bg-white shadow-sm" : "text-slate-500"}`}
              style={activeShift === s.value ? { color: s.color } : {}}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              {shiftCounts[s.value] || 0}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث عن موظف..." : "Search..."}
            className="pr-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Alert for unattended gates */}
      {gatesWithNoStaff.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5 mb-2">
            <AlertCircle className="w-4 h-4" />
            {isAr ? `${gatesWithNoStaff.length} أبواب مفتوحة بدون موظفين:` : `${gatesWithNoStaff.length} open gates without staff:`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {gatesWithNoStaff.map(g => (
              <span key={g.id} className="text-[11px] px-2 py-0.5 bg-white rounded-full border border-red-200 text-red-600 font-medium">{g.name_ar}</span>
            ))}
          </div>
        </div>
      )}

      {/* Two-column layout: Gates with employees | Unassigned employees */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Gates with assigned employees */}
        <div className="lg:col-span-3 space-y-2">
          <h3 className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            {isAr ? "توزيع الموظفين على الأبواب" : "Staff Distribution"}
          </h3>
          <div className="space-y-1.5">
            {activeGates.filter(g => !g.is_removed).map(gate => {
              const emps = gateEmployeeMap[gate.name_ar] || [];
              const isExpanded = expandedGate === gate.id;
              const isOpen = gate.status === "open";
              return (
                <div key={gate.id} className={`rounded-xl border transition-all ${isOpen && emps.length === 0 ? "border-red-200 bg-red-50/30" : "bg-white"}`}>
                  <button
                    onClick={() => setExpandedGate(isExpanded ? null : gate.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-right"
                    data-testid={`gate-staff-${gate.id}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: gate.status === "open" ? "#22c55e" : gate.status === "closed" ? "#ef4444" : "#f97316" }} />
                      <span className="text-sm font-semibold truncate">{gate.name_ar}</span>
                      <Badge variant={emps.length > 0 ? "secondary" : "destructive"} className="text-[10px] px-1.5 flex-shrink-0">
                        <Users className="w-3 h-3 ml-0.5" />{emps.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {emps.length > 0 && !isExpanded && (
                        <div className="flex items-center gap-1">
                          {emps.slice(0, 3).map(emp => {
                            const shift = SHIFTS.find(s => s.value === emp.shift);
                            return (
                              <span key={emp.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                {emp.name.split(" ")[0]}
                                {shift && <span className="w-1.5 h-1.5 rounded-full inline-block mr-0.5" style={{ backgroundColor: shift.color }} />}
                              </span>
                            );
                          })}
                          {emps.length > 3 && <span className="text-[10px] text-slate-400">+{emps.length - 3}</span>}
                        </div>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t pt-2 space-y-1.5">
                      {emps.map(emp => {
                        const shift = SHIFTS.find(s => s.value === emp.shift);
                        return (
                          <div key={emp.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 group">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <span className="text-xs font-medium">{emp.name}</span>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <span>{emp.job_title}</span>
                                  {shift && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: shift.color }} />{isAr ? shift.label_ar : shift.label_en}</span>}
                                </div>
                              </div>
                            </div>
                            {isDraft && (
                              <button
                                onClick={() => handleUnassignEmployee(emp.id, gate.name_ar)}
                                className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center transition-all"
                                title={isAr ? "إلغاء التعيين" : "Unassign"}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {isDraft && (
                        <Select onValueChange={(empId) => handleAssignEmployee(empId, gate.name_ar)}>
                          <SelectTrigger className="h-8 text-xs border-dashed">
                            <Plus className="w-3 h-3 ml-1" />
                            <SelectValue placeholder={isAr ? "إضافة موظف..." : "Add employee..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {unassignedEmployees.map(emp => (
                              <SelectItem key={emp.id} value={emp.id} className="text-xs">
                                <div className="flex items-center gap-2">
                                  <span>{emp.name}</span>
                                  <span className="text-[10px] text-slate-400">{emp.shift}</span>
                                </div>
                              </SelectItem>
                            ))}
                            {unassignedEmployees.length === 0 && (
                              <div className="text-xs text-muted-foreground p-2 text-center">{isAr ? "لا يوجد موظفين متاحين" : "No available employees"}</div>
                            )}
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

        {/* Unassigned employees */}
        <div className="lg:col-span-2 space-y-2">
          <h3 className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <UserX className="w-3.5 h-3.5 text-amber-600" />
            {isAr ? "موظفين غير معيّنين" : "Unassigned Staff"}
            <Badge variant="secondary" className="text-[10px] px-1.5">{unassignedEmployees.length}</Badge>
          </h3>
          {unassignedEmployees.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <UserCheck className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                <p className="text-xs text-muted-foreground">{isAr ? "جميع الموظفين معيّنين" : "All assigned"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {unassignedEmployees.map(emp => {
                const shift = SHIFTS.find(s => s.value === emp.shift);
                return (
                  <div key={emp.id} className="flex items-center justify-between px-3 py-2 rounded-xl border bg-white hover:shadow-sm transition-all" data-testid={`unassigned-emp-${emp.id}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: shift?.color || "#94a3b8" }}>
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-medium">{emp.name}</span>
                        <div className="text-[10px] text-slate-400">{emp.job_title}</div>
                      </div>
                    </div>
                    {isDraft && (
                      <Select onValueChange={(gateName) => handleAssignEmployee(emp.id, gateName)}>
                        <SelectTrigger className="h-7 w-auto min-w-[100px] text-[11px] border-dashed">
                          <MapPin className="w-3 h-3 ml-0.5 text-blue-500" />
                          <SelectValue placeholder={isAr ? "عيّن" : "Assign"} />
                        </SelectTrigger>
                        <SelectContent>
                          {activeGates.filter(g => !g.is_removed).map(g => (
                            <SelectItem key={g.id} value={g.name_ar} className="text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.status === "open" ? "#22c55e" : "#ef4444" }} />
                                {g.name_ar}
                              </div>
                            </SelectItem>
                          ))}
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

      {/* Empty state */}
      {employees.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="font-cairo font-semibold text-slate-600 mb-1">{isAr ? "لا يوجد موظفين" : "No employees"}</h3>
            <p className="text-xs text-muted-foreground">{isAr ? "أضف موظفين من إدارة الأبواب أولاً" : "Add employees from Gates Management first"}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
