import { Calendar as CalendarIcon, CheckCircle2, RotateCcw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";
import { CHANGE_LABELS } from "../constants";
import { formatDate } from "../utils";

export function SessionHeader({ activeSession, activeZones, handleUpdateSession, setSessionNotes, setShowNotesDialog }) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-l from-emerald-50 via-white to-slate-50 p-4">
      <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-emerald-200/30 blur-2xl" />
      <div className="relative flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-cairo font-bold text-lg" data-testid="session-date-title">
              {isAr ? "جولة " : "Tour "}{formatDate(activeSession.date)}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {/* Hijri date */}
              <span className="text-[11px] text-amber-700 font-cairo font-medium bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                <span>☽</span>
                <span>{(() => {
                  try {
                    const d = new Date(activeSession.date + "T00:00:00");
                    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
                  } catch { return ''; }
                })()}</span>
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <Badge className={`text-xs ${activeSession.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`} data-testid="session-status-badge">
                {activeSession.status === "completed" ? (isAr ? "مكتملة" : "Completed") : (isAr ? "مسودة" : "Draft")}
              </Badge>
              <span className="text-xs text-muted-foreground">{activeZones.length} {isAr ? "منطقة نشطة" : "active zones"}</span>
              {activeSession.created_by && <span className="text-xs text-muted-foreground">{isAr ? "بواسطة: " : "By: "}{activeSession.created_by}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setSessionNotes(activeSession.supervisor_notes || ""); setShowNotesDialog(true); }} data-testid="add-notes-btn">
            <MessageSquare className="w-4 h-4 ml-1" />{isAr ? "ملاحظات" : "Notes"}
          </Button>
          {activeSession.status === "draft" ? (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleUpdateSession({ status: "completed" })} data-testid="complete-session-btn">
              <CheckCircle2 className="w-4 h-4 ml-1" />{isAr ? "إنهاء الجولة" : "Complete"}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => handleUpdateSession({ status: "draft" })} data-testid="reopen-session-btn">
              <RotateCcw className="w-4 h-4 ml-1" />{isAr ? "إعادة فتح" : "Reopen"}
            </Button>
          )}
        </div>
      </div>
      {activeSession.changes_summary && (
        <div className="relative flex items-center gap-3 mt-3 pt-3 border-t border-slate-200/60 flex-wrap">
          {Object.entries(activeSession.changes_summary).map(([key, val]) => {
            if (val === 0) return null;
            const label = CHANGE_LABELS[key];
            if (!label) return null;
            return (
              <div key={key} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: label.bg, color: label.color }} data-testid={`change-summary-${key}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                {val} {isAr ? label.ar : label.en}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
