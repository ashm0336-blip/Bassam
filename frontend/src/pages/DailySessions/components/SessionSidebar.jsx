import { useMemo } from "react";
import { ChevronRight, ChevronLeft, CalendarIcon, Clock, Plus, X, Edit2, MessageSquare, ArrowLeftRight, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";
import { AR_WEEKDAYS, AR_MONTHS } from "../constants";
import { formatDateShort } from "../utils";

export function SessionSidebar({
  sessions, activeSession, setActiveSession,
  calendarDate, setCalendarDate,
  selectedFloor, setZoom, setPanOffset, zoomRef,
  setNewSessionDate, setCloneSource, setShowNewSessionDialog,
  handleCompare, handleDeleteSession,
}) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const today = new Date().toISOString().split("T")[0];

  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startDow = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  }, [calendarYear, calendarMonth]);

  const sessionDatesMap = useMemo(() => {
    const map = {};
    sessions.forEach(s => { map[s.date] = s; });
    return map;
  }, [sessions]);

  const getDayDateStr = (day) => {
    if (!day) return null;
    const m = String(calendarMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${calendarYear}-${m}-${d}`;
  };

  const handleCalendarDayClick = (day) => {
    if (!day) return;
    const dateStr = getDayDateStr(day);
    const existingSession = sessionDatesMap[dateStr];
    if (existingSession) {
      setActiveSession(existingSession);
      setZoom(1); setPanOffset({ x: 0, y: 0 }); zoomRef.current = 1;
    } else {
      setNewSessionDate(dateStr);
      setCloneSource("auto");
      setShowNewSessionDialog(true);
    }
  };

  return (
    <div className="lg:col-span-1 space-y-4">
      <Card data-testid="monthly-calendar">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} data-testid="calendar-next">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="font-cairo font-semibold text-sm" data-testid="calendar-month-label">
              {isAr ? AR_MONTHS[calendarMonth] : new Date(calendarYear, calendarMonth).toLocaleDateString("en", { month: "long" })} {calendarYear}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} data-testid="calendar-prev">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {AR_WEEKDAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">{isAr ? d : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i]}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`blank-${i}`} />;
              const dateStr = getDayDateStr(day);
              const session = sessionDatesMap[dateStr];
              const isToday = dateStr === today;
              const isActiveDay = activeSession?.date === dateStr;
              return (
                <button key={day} data-testid={`calendar-day-${day}`} onClick={() => handleCalendarDayClick(day)}
                  className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 text-xs transition-all duration-150
                    ${isActiveDay ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-200" : isToday ? "bg-slate-100 font-semibold ring-1 ring-slate-300" : "hover:bg-slate-50"}
                    ${session && !isActiveDay ? "font-medium" : ""}`}>
                  <span>{day}</span>
                  {session && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isActiveDay ? "bg-white" : session.status === "completed" ? "bg-emerald-500" : "bg-amber-400"}`} />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-emerald-500" />{isAr ? "مكتمل" : "Done"}</div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-amber-400" />{isAr ? "مسودة" : "Draft"}</div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-slate-200" />{isAr ? "فارغ" : "Empty"}</div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="font-cairo font-semibold text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {isAr ? "سجل الجولات" : "Tour History"}
          <Badge variant="secondary" className="text-[10px] px-1.5">{sessions.length}</Badge>
        </h3>
        {sessions.length === 0 ? (
          <div className="text-center py-6">
            <CalendarIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">{isAr ? "لا توجد جولات بعد" : "No tours yet"}</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[calc(100vh-620px)] overflow-y-auto pr-1">
            {sessions.map((s) => {
              const isActive = activeSession?.id === s.id;
              const changes = s.changes_summary || {};
              const totalChanges = (changes.added || 0) + (changes.removed || 0) + (changes.modified || 0);
              return (
                <div key={s.id} data-testid={`session-card-${s.id}`}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all duration-150 group ${isActive ? "border-emerald-500 bg-emerald-50/60 shadow-sm" : "hover:border-slate-300 hover:bg-slate-50/50"}`}
                  onClick={() => { setActiveSession(s); setZoom(1); setPanOffset({ x: 0, y: 0 }); zoomRef.current = 1; }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-xs">{formatDateShort(s.date)}</span>
                      <Badge className={`text-[9px] px-1 py-0 ${s.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {s.status === "completed" ? (isAr ? "مكتمل" : "Done") : (isAr ? "مسودة" : "Draft")}
                      </Badge>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {activeSession && activeSession.id !== s.id && (
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleCompare(s.id); }} data-testid={`compare-btn-${s.id}`}><ArrowLeftRight className="w-3 h-3" /></Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }} data-testid={`delete-session-btn-${s.id}`}><Trash2 className="w-3 h-3" /></Button>
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
