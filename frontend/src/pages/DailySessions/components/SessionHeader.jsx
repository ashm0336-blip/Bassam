import { Calendar as CalendarIcon, CheckCircle2, RotateCcw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";
import { CHANGE_LABELS, PRAYER_TIMES } from "../constants";
import { formatDate } from "../utils";

export function SessionHeader({ activeSession, activeZones, handleUpdateSession, setSessionNotes, setShowNotesDialog, readOnly = false }) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const isPrayer = activeSession.session_type === "prayer" && activeSession.prayer;
  const prayerInfo = isPrayer ? PRAYER_TIMES.find(p => p.key === activeSession.prayer) : null;

  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 ${isPrayer
      ? "dark:bg-amber-50 dark:border-amber-200/20 bg-gradient-to-l from-amber-50 via-white to-slate-50"
      : "dark:bg-emerald-50 dark:border-emerald-200/20 bg-gradient-to-l from-emerald-50 via-white to-slate-50"}`}>
      <div className={`absolute -top-12 -left-12 h-32 w-32 rounded-full blur-2xl ${isPrayer ? "bg-amber-200/30" : "bg-emerald-200/30"}`} />

      <div className="relative flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${isPrayer ? "bg-amber-500 shadow-amber-200" : "bg-emerald-600 shadow-emerald-200"}`}>
            {isPrayer
              ? <span className="text-2xl leading-none">{prayerInfo?.icon}</span>
              : <CalendarIcon className="w-6 h-6 text-white" />
            }
          </div>

          <div>
            {/* Title */}
            <h2 className="font-cairo font-bold text-lg" data-testid="session-date-title">
              {isPrayer
                ? <span>{isAr ? `جولة صلاة ${prayerInfo?.label_ar}` : `${prayerInfo?.label_en} Prayer Round`}</span>
                : <span>{isAr ? "جولة " : "Tour "}{formatDate(activeSession.date)}</span>
              }
            </h2>

            {/* Date info */}
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

            {/* Status badges */}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <Badge className={`text-xs ${activeSession.status === "completed"
                ? (isPrayer ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")
                : "bg-amber-100 text-amber-700"}`}
                data-testid="session-status-badge">
                {activeSession.status === "completed" ? (isAr ? "مكتملة ✅" : "Completed ✅") : (isAr ? "مسودة" : "Draft")}
              </Badge>
              <span className="text-xs text-muted-foreground">{activeZones.length} {isAr ? "منطقة نشطة" : "active zones"}</span>
              {activeSession.created_by && <span className="text-xs text-muted-foreground">{isAr ? "بواسطة: " : "By: "}{activeSession.created_by}</span>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => { setSessionNotes(activeSession.supervisor_notes || ""); setShowNotesDialog(true); }} data-testid="add-notes-btn">
              <MessageSquare className="w-4 h-4 ml-1" />{isAr ? "ملاحظات" : "Notes"}
            </Button>
          )}
          {!readOnly && activeSession.status === "draft" ? (
            <Button size="sm"
              className={isPrayer ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200" : "bg-emerald-600 hover:bg-emerald-700"}
              onClick={() => handleUpdateSession({ status: "completed" })}
              data-testid="complete-session-btn">
              <CheckCircle2 className="w-4 h-4 ml-1" />
              {isPrayer
                ? (isAr ? `إنهاء جولة ${prayerInfo?.label_ar}` : `Complete ${prayerInfo?.label_en}`)
                : (isAr ? "إنهاء الجولة" : "Complete")}
            </Button>
          ) : !readOnly && activeSession.status !== "draft" ? (
            <Button variant="outline" size="sm" onClick={() => handleUpdateSession({ status: "draft" })} data-testid="reopen-session-btn">
              <RotateCcw className="w-4 h-4 ml-1" />{isAr ? "إعادة فتح" : "Reopen"}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Changes summary */}
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
