import { useState, useMemo } from "react";
import {
  ChevronRight, ChevronLeft, Plus, Clock, Trash2, Edit2, X,
  Calendar as CalendarIcon, ArrowLeftRight, FolderOpen, MessageSquare, CheckCircle2
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

      {/* Session circles for this month */}
      <div className="space-y-3">
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
          <div className="grid grid-cols-5 gap-x-2 gap-y-4 max-h-[calc(100vh-640px)] overflow-y-auto py-3 px-1 justify-items-center">
            {monthSessions.map((s, idx) => {
              const isAct = activeSession?.id === s.id;
              const d = new Date(s.date + "T00:00:00");
              const dayNum = d.getDate();
              const dayName = AR_WEEKDAYS[d.getDay()];
              const isCompleted = s.status === "completed";
              const ch = s.changes_summary || {};
              const tc = (ch.added || 0) + (ch.removed || 0) + (ch.modified || 0);

              return (
                <div
                  key={s.id}
                  data-testid={`session-circle-${s.id}`}
                  className="relative group flex flex-col items-center"
                  style={{ animation: `fadeInUp 0.4s ease-out ${idx * 60}ms both` }}
                >
                  <button
                    onClick={() => { setActiveSession(s); setZoom(1); setPanOffset({ x: 0, y: 0 }); zoomRef.current = 1; }}
                    className={`relative w-[3.2rem] h-[3.2rem] rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer
                      ${isAct
                        ? `ring-[3px] ring-offset-2 shadow-lg scale-110 ${isCompleted ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 ring-emerald-300 shadow-emerald-300/50' : 'bg-gradient-to-br from-amber-400 to-amber-500 ring-amber-300 shadow-amber-300/50'}`
                        : `border-[2.5px] hover:scale-110 hover:shadow-md ${isCompleted ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-white hover:border-emerald-500 hover:shadow-emerald-200/50' : 'border-amber-400 bg-gradient-to-br from-amber-50 to-white hover:border-amber-500 hover:shadow-amber-200/50'}`
                      }`}
                  >
                    <span className={`text-[15px] font-extrabold leading-none ${isAct ? 'text-white' : isCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {dayNum}
                    </span>
                    <span className={`text-[7px] mt-0.5 font-semibold ${isAct ? 'text-white/80' : isCompleted ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {dayName}
                    </span>
                    {isCompleted && !isAct && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-[2px] border-white flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                    {isAct && isCompleted && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white border-[2px] border-emerald-500 flex items-center justify-center">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                      </span>
                    )}
                    {isAct && (
                      <span className="absolute inset-0 rounded-full animate-ping opacity-15"
                        style={{ animationDuration: '2.5s', backgroundColor: isCompleted ? '#10b981' : '#f59e0b' }} />
                    )}
                  </button>

                  {tc > 0 && (
                    <div className="flex items-center gap-[3px] mt-1.5">
                      {ch.added > 0 && <span className="w-[5px] h-[5px] rounded-full bg-emerald-400" />}
                      {ch.removed > 0 && <span className="w-[5px] h-[5px] rounded-full bg-red-400" />}
                      {ch.modified > 0 && <span className="w-[5px] h-[5px] rounded-full bg-amber-400" />}
                    </div>
                  )}

                  <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none scale-90 group-hover:scale-100">
                    <div className="bg-slate-900 text-white text-[9px] px-3 py-2 rounded-xl whitespace-nowrap shadow-xl backdrop-blur-sm">
                      <p className="font-bold text-[10px]">{formatDateShort(s.date)}</p>
                      <p className={`mt-0.5 ${isCompleted ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {isCompleted ? (isAr ? 'مكتمل' : 'Done') : (isAr ? 'مسودة' : 'Draft')}
                      </p>
                      {s.supervisor_notes && (
                        <p className="text-slate-300 mt-0.5 max-w-[120px] truncate flex items-center gap-1">
                          <MessageSquare className="w-2.5 h-2.5 flex-shrink-0" />{s.supervisor_notes}
                        </p>
                      )}
                      {tc > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-white/10">
                          {ch.added > 0 && <span className="text-emerald-300">+{ch.added}</span>}
                          {ch.removed > 0 && <span className="text-red-300">-{ch.removed}</span>}
                          {ch.modified > 0 && <span className="text-amber-300">~{ch.modified}</span>}
                        </div>
                      )}
                    </div>
                    <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />
                  </div>

                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    {activeSession && activeSession.id !== s.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCompare(s.id); }}
                        className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md hover:bg-blue-600 hover:scale-125 transition-all"
                        data-testid={`compare-session-${s.id}`}
                      >
                        <ArrowLeftRight className="w-2.5 h-2.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                      className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 hover:scale-125 transition-all"
                      data-testid={`delete-session-${s.id}`}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
