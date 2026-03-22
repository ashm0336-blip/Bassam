import { useMemo } from "react";

export function MonthDayBar({ filterYear, filterMonth, daysInMonth, items, selectedDateHijri, onDayClick, checkFields }) {
  const dayStatus = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      const parts = item.date_hijri?.split("-");
      if (!parts || parts.length !== 3) return;
      const day = parseInt(parts[2]);
      const total = checkFields.length;
      let filled = 0;
      checkFields.forEach((f) => {
        const val = item[f.key];
        if (val !== null && val !== undefined && val !== "" && val !== "null") filled++;
      });
      if (filled === 0) map[day] = "empty";
      else if (filled < total) map[day] = "partial";
      else map[day] = "complete";
    });
    return map;
  }, [items, checkFields]);

  const selectedDay = useMemo(() => {
    const parts = selectedDateHijri?.split("-");
    return parts?.length === 3 ? parseInt(parts[2]) : 0;
  }, [selectedDateHijri]);

  const complete = Object.values(dayStatus).filter((s) => s === "complete").length;
  const partial = Object.values(dayStatus).filter((s) => s === "partial").length;

  return (
    <div className="space-y-1.5" data-testid="month-day-bar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-cairo text-muted-foreground">تقدم الشهر:</span>
          <span className="text-[10px] font-cairo font-bold text-emerald-600">{complete} مكتمل</span>
          {partial > 0 && <span className="text-[10px] font-cairo font-bold text-amber-500">{partial} جزئي</span>}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-emerald-500" />
            <span className="text-[8px] text-muted-foreground font-cairo">مكتمل</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-amber-400" />
            <span className="text-[8px] text-muted-foreground font-cairo">جزئي</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-red-400" />
            <span className="text-[8px] text-muted-foreground font-cairo">فارغ</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-[3px] flex-wrap">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const status = dayStatus[day] || "empty";
          const isSelected = day === selectedDay;
          const dateStr = `${filterYear}-${filterMonth}-${String(day).padStart(2, "0")}`;
          return (
            <button
              key={day}
              onClick={() => onDayClick(dateStr)}
              title={`يوم ${day} — ${status === "complete" ? "مكتمل" : status === "partial" ? "جزئي" : "فارغ"}`}
              data-testid={`day-${day}`}
              className={`
                relative h-6 rounded-sm text-[8px] font-bold transition-all cursor-pointer
                ${daysInMonth <= 29 ? 'flex-1 min-w-[22px]' : 'flex-1 min-w-[20px]'}
                ${isSelected ? 'ring-2 ring-primary ring-offset-1 scale-110 z-10' : 'hover:scale-105'}
                ${status === "complete"
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : status === "partial"
                    ? 'bg-amber-400 text-white hover:bg-amber-500'
                    : 'bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
