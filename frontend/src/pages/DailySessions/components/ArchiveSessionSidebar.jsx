import { useState, useMemo } from "react";
import {
  ChevronRight, ChevronLeft, Plus, Clock, Trash2, Edit2, X,
  Calendar as CalendarIcon, ArrowLeftRight, FolderOpen, MessageSquare
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";
import { AR_WEEKDAYS, AR_MONTHS } from "../constants";
import { formatDateShort } from "../utils";

export function ArchiveSessionSidebar({
  sessions, activeSession, setActiveSession,
  setZoom, setPanOffset, zoomRef,
  setNewSessionDate, setCloneSource, setShowNewSessionDialog,
  handleCompare, handleDeleteSession,
}) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const nowDate = new Date();
  const today = nowDate.toISOString().split("T")[0];

  const [selectedYear, setSelectedYear] = useState(nowDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(nowDate.getMonth());
  const [viewMode, setViewMode] = useState("calendar");

  // Group sessions by year-month
  const sessionsByMonth = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      try {
        const d = new Date(s.date + "T00:00:00");
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!map[key]) map[key] = [];
        map[key].push(s);
      } catch {}
    });
    return map;
  }, [sessions]);

  // Sessions for selected month
  const monthSessions = useMemo(() => {
    const key = `${selectedYear}-${selectedMonth}`;
    return (sessionsByMonth[key] || []).sort((a, b) => b.date.localeCompare(a.date));
  }, [sessionsByMonth, selectedYear, selectedMonth]);

  const sessionDatesMap = useMemo(() => {
    const m = {};
    monthSessions.forEach(s => { m[s.date] = s; });
    return m;
  }, [monthSessions]);

  const calDays = useMemo(() => {
    const fd = new Date(selectedYear, selectedMonth, 1).getDay();
    const td = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const d = [];
    for (let i = 0; i < fd; i++) d.push(null);
    for (let i = 1; i <= td; i++) d.push(i);
    return d;
  }, [selectedYear, selectedMonth]);

  const getDayStr = (day) => day ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;

  const handleCalDayClick = (day) => {
    if (!day) return;
    const ds = getDayStr(day);
    const s = sessionDatesMap[ds];
    if (s) {
      setActiveSession(s);
      setZoom(1); setPanOffset({ x: 0, y: 0 }); zoomRef.current = 1;
    } else {
      setNewSessionDate(ds);
      setCloneSource("auto");
      setShowNewSessionDialog(true);
    }
  };

  // Month grid view
  if (viewMode === "months") {
    return (
      <div className="lg:col-span-1 space-y-3" data-testid="archive-sidebar">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedYear(y => y + 1)}><ChevronRight className="w-4 h-4" /></Button>
              <span className="font-cairo font-bold text-lg">{selectedYear}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedYear(y => y - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          {AR_MONTHS.map((monthName, idx) => {
            const key = `${selectedYear}-${idx}`;
            const count = (sessionsByMonth[key] || []).length;
            const completed = (sessionsByMonth[key] || []).filter(s => s.status === "completed").length;
            const drafts = count - completed;
            const isCurrent = selectedYear === nowDate.getFullYear() && idx === nowDate.getMonth();

            return (
              <button
                key={idx}
                onClick={() => { setSelectedMonth(idx); setViewMode("calendar"); }}
                className={`relative rounded-xl border p-2.5 text-center transition-all hover:shadow-md ${
                  isCurrent ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200" :
                  count > 0 ? "bg-white hover:border-slate-300" :
                  "bg-slate-50/50 opacity-60"
                }`}
                data-testid={`month-${idx}`}
              >
                <p className={`font-cairo font-semibold text-xs ${isCurrent ? "text-emerald-700" : ""}`}>
                  {isAr ? monthName : new Date(selectedYear, idx).toLocaleDateString("en", { month: "short" })}
                </p>
                {count > 0 ? (
                  <>
                    <p className={`text-lg font-bold mt-0.5 ${isCurrent ? "text-emerald-700" : "text-slate-700"}`}>{count}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      {completed > 0 && <span className="flex items-center gap-0.5 text-[9px] text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{completed}</span>}
                      {drafts > 0 && <span className="flex items-center gap-0.5 text-[9px] text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{drafts}</span>}
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.round((completed / Math.max(count, 1)) * 100)}%` }} />
                    </div>
                  </>
                ) : (
                  <p className="text-lg font-bold mt-0.5 text-slate-300">-</p>
                )}
                {isCurrent && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border bg-slate-50 p-3">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">{isAr ? `إجمالي ${selectedYear}` : `Total ${selectedYear}`}</span>
            <span className="font-bold">
              {Object.entries(sessionsByMonth).filter(([k]) => k.startsWith(`${selectedYear}-`)).reduce((sum, [, v]) => sum + v.length, 0)} {isAr ? "جولة" : "tours"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-emerald-500" />{isAr ? "مكتمل" : "Done"}</div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-amber-400" />{isAr ? "مسودة" : "Draft"}</div>
        </div>
      </div>
    );
  }

  // Calendar view
  return (
    <div className="lg:col-span-1 space-y-3" data-testid="archive-sidebar">
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-0.5">
            <button
              onClick={() => setViewMode("months")}
              className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
              data-testid="back-to-months"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              {isAr ? "كل الأشهر" : "All Months"}
            </button>
            <span className="text-[10px] text-slate-400">{selectedYear}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
              if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
              else setSelectedMonth(m => m + 1);
            }}><ChevronRight className="w-4 h-4" /></Button>
            <span className="font-cairo font-semibold text-sm">
              {isAr ? AR_MONTHS[selectedMonth] : new Date(selectedYear, selectedMonth).toLocaleDateString("en", { month: "long" })} {selectedYear}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
              if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
              else setSelectedMonth(m => m - 1);
            }}><ChevronLeft className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {AR_WEEKDAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {isAr ? d : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calDays.map((day, i) => {
              if (!day) return <div key={`b-${i}`} />;
              const ds = getDayStr(day);
              const s = sessionDatesMap[ds];
              const isToday = ds === today;
              const isActive = activeSession?.date === ds;
              return (
                <button
                  key={day}
                  onClick={() => handleCalDayClick(day)}
                  data-testid={`calendar-day-${day}`}
                  className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 text-xs transition-all ${
                    isActive ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-200" :
                    isToday ? "bg-slate-100 font-semibold ring-1 ring-slate-300" :
                    "hover:bg-slate-50"
                  } ${s && !isActive ? "font-medium" : ""}`}
                >
                  <span>{day}</span>
                  {s && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isActive ? "bg-white" : s.status === "completed" ? "bg-emerald-500" : "bg-amber-400"}`} />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{monthSessions.filter(s => s.status === "completed").length} {isAr ? "مكتمل" : "Done"}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{monthSessions.filter(s => s.status !== "completed").length} {isAr ? "مسودة" : "Draft"}</span>
            </div>
            <span className="font-semibold">{monthSessions.length} {isAr ? "جولة" : "tours"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Session list for this month */}
      <div className="space-y-2">
        <h3 className="font-cairo font-semibold text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {isAr ? `جولات ${AR_MONTHS[selectedMonth]}` : "Tours"}
          <Badge variant="secondary" className="text-[10px] px-1.5">{monthSessions.length}</Badge>
        </h3>
        {monthSessions.length === 0 ? (
          <div className="text-center py-6">
            <CalendarIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">{isAr ? "لا توجد جولات في هذا الشهر" : "No tours this month"}</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[calc(100vh-640px)] overflow-y-auto pr-1">
            {monthSessions.map(s => {
              const isActive = activeSession?.id === s.id;
              const changes = s.changes_summary || {};
              const totalChanges = (changes.added || 0) + (changes.removed || 0) + (changes.modified || 0);
              return (
                <div
                  key={s.id}
                  data-testid={`session-card-${s.id}`}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all group ${isActive ? "border-emerald-500 bg-emerald-50/60 shadow-sm" : "hover:border-slate-300"}`}
                  onClick={() => { setActiveSession(s); setZoom(1); setPanOffset({ x: 0, y: 0 }); zoomRef.current = 1; }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-xs">{formatDateShort(s.date)}</span>
                      <Badge className={`text-[9px] px-1 py-0 ${s.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {s.status === "completed" ? (isAr ? "مكتمل" : "Done") : (isAr ? "مسودة" : "Draft")}
                      </Badge>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {activeSession && activeSession.id !== s.id && (
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleCompare(s.id); }}><ArrowLeftRight className="w-3 h-3" /></Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  {totalChanges > 0 && (
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      {changes.added > 0 && <span className="text-emerald-600 flex items-center gap-0.5"><Plus className="w-3 h-3" />{changes.added}</span>}
                      {changes.removed > 0 && <span className="text-red-500 flex items-center gap-0.5"><X className="w-3 h-3" />{changes.removed}</span>}
                      {changes.modified > 0 && <span className="text-amber-600 flex items-center gap-0.5"><Edit2 className="w-3 h-3" />{changes.modified}</span>}
                    </div>
                  )}
                  {s.supervisor_notes && (
                    <p className="text-[10px] text-slate-500 mt-1 truncate flex items-center gap-1"><MessageSquare className="w-3 h-3 flex-shrink-0" />{s.supervisor_notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
