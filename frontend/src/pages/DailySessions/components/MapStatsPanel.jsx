import {
  CircleDot, CircleOff, Edit2, Layers,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Minus, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatDateShort } from "../utils";

export function MapStatsPanel({ sessionStats, changedZones, ZONE_TYPES, collapsed, onToggle }) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  if (!sessionStats) return null;

  const ToggleBtn = (
    <button
      onClick={onToggle}
      className="absolute top-2 left-0 z-10 w-7 h-14 rounded-l-lg bg-white/90 backdrop-blur border border-r-0 border-slate-200 shadow-md flex items-center justify-center hover:bg-slate-50 transition-all"
      style={{ transform: "translateX(-100%)" }}
      data-testid="stats-panel-toggle"
      title={collapsed ? (isAr ? "إظهار الإحصائيات" : "Show Stats") : (isAr ? "إخفاء الإحصائيات" : "Hide Stats")}
    >
      {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5 text-slate-500" /> : <PanelLeftClose className="w-3.5 h-3.5 text-slate-500" />}
    </button>
  );

  if (collapsed) {
    return <div className="relative w-0">{ToggleBtn}</div>;
  }

  return (
    <div className="relative w-[40%] flex-shrink-0 bg-gradient-to-b from-slate-50/95 to-white/95 backdrop-blur-sm border-l border-slate-200/80 overflow-y-auto overflow-x-hidden" data-testid="map-stats-panel">
      {ToggleBtn}

      <div className="p-4 space-y-4">

        {/* KPI Grid - 2x2 */}
        <div className="grid grid-cols-2 gap-2.5" data-testid="live-kpi-grid">
          {[
            { label: isAr ? "نشطة" : "Active", value: sessionStats.totalActive, icon: CircleDot, color: "#10b981", bg: "#ecfdf5", delta: sessionStats.hasPrevious ? sessionStats.totalActive - sessionStats.prevTotalActive : null },
            { label: isAr ? "مزالة" : "Removed", value: sessionStats.totalRemoved, icon: CircleOff, color: "#ef4444", bg: "#fef2f2", delta: null },
            { label: isAr ? "تغييرات" : "Changes", value: changedZones.length, icon: Edit2, color: "#f59e0b", bg: "#fffbeb", delta: null },
            { label: isAr ? "فئات" : "Categories", value: sessionStats.uniqueCategories, icon: Layers, color: "#3b82f6", bg: "#eff6ff", sub: `/${ZONE_TYPES.length}` },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="relative rounded-xl p-3 border border-slate-100 bg-white overflow-hidden hover:shadow-sm transition-shadow" data-testid={`live-kpi-${i}`}>
                <div className="absolute top-0 right-0 w-14 h-14 rounded-bl-[2rem] opacity-[0.06]" style={{ backgroundColor: kpi.color }} />
                <div className="flex items-start justify-between gap-1 relative">
                  <div>
                    <p className="text-[11px] font-medium text-slate-400">{kpi.label}</p>
                    <div className="flex items-baseline gap-0.5 mt-1">
                      <span className="text-3xl font-extrabold tracking-tight" style={{ color: kpi.color }}>{kpi.value}</span>
                      {kpi.sub && <span className="text-[11px] text-slate-300 font-medium">{kpi.sub}</span>}
                    </div>
                    {kpi.delta !== null && kpi.delta !== undefined && kpi.delta !== 0 && (
                      <div className={`flex items-center gap-0.5 mt-1 text-[10px] font-semibold ${kpi.delta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {kpi.delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {kpi.delta > 0 ? "+" : ""}{kpi.delta}
                      </div>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: kpi.bg }}>
                    <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Donut + Full Legend */}
        {sessionStats.totalActive > 0 && (
          <div className="rounded-xl border border-slate-100 bg-white p-4" data-testid="live-donut">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">{isAr ? "توزيع الفئات" : "Distribution"}</p>
            <div className="flex items-start gap-4">
              {/* Donut */}
              <div className="flex-shrink-0">
                <svg viewBox="0 0 120 120" className="w-[110px] h-[110px]">
                  {(() => {
                    const total = sessionStats.totalActive;
                    const cx = 60, cy = 60, r = 44, sw = 14;
                    const circ = 2 * Math.PI * r;
                    let offset = 0;
                    return sessionStats.activeCats.map((cat) => {
                      const count = sessionStats.catCounts[cat.value];
                      const dashLen = (count / total) * circ;
                      const el = (
                        <circle key={cat.value} cx={cx} cy={cy} r={r} fill="none"
                          stroke={cat.color} strokeWidth={sw}
                          strokeDasharray={`${dashLen} ${circ - dashLen}`}
                          strokeDashoffset={-offset}
                          strokeLinecap="butt"
                          transform={`rotate(-90 ${cx} ${cy})`}
                          className="transition-all duration-700"
                        />
                      );
                      offset += dashLen;
                      return el;
                    });
                  })()}
                  <text x="60" y="55" textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight="800" fill="#1e293b">{sessionStats.totalActive}</text>
                  <text x="60" y="73" textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#94a3b8" fontWeight="600">{isAr ? "منطقة" : "zones"}</text>
                </svg>
              </div>
              {/* Full Legend - all categories visible */}
              <div className="flex-1 space-y-2 min-w-0 pt-1">
                {sessionStats.activeCats.map(cat => {
                  const count = sessionStats.catCounts[cat.value];
                  const pct = Math.round((count / sessionStats.totalActive) * 100);
                  return (
                    <div key={cat.value} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-[11px] text-slate-600 truncate flex-1">{isAr ? cat.label_ar : cat.label_en}</span>
                      <span className="text-[11px] font-bold text-slate-700 tabular-nums">{count}</span>
                      <span className="text-[10px] text-slate-300 w-7 text-left tabular-nums">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Previous Day Comparison */}
        {sessionStats.hasPrevious && (
          <PrevDayCompact sessionStats={sessionStats} ZONE_TYPES={ZONE_TYPES} isAr={isAr} />
        )}

      </div>
    </div>
  );
}

function PrevDayCompact({ sessionStats, ZONE_TYPES, isAr }) {
  const diff = sessionStats.totalActive - sessionStats.prevTotalActive;
  const changes = ZONE_TYPES
    .map(cat => ({ ...cat, today: sessionStats.catCounts[cat.value] || 0, prev: sessionStats.prevCatCounts[cat.value] || 0 }))
    .map(c => ({ ...c, delta: c.today - c.prev }))
    .filter(c => c.delta !== 0);

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4" data-testid="live-prev-comparison">
      <div className="flex items-center gap-1.5 mb-3">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex-1">{isAr ? "مقارنة" : "Compare"}</p>
        <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{formatDateShort(sessionStats.prevSession.date)}</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 text-center p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100/60">
          <p className="text-xl font-extrabold text-emerald-700">{sessionStats.totalActive}</p>
          <p className="text-[9px] text-emerald-500 font-medium mt-0.5">{isAr ? "اليوم" : "Today"}</p>
        </div>
        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${diff > 0 ? "bg-emerald-50 border border-emerald-200" : diff < 0 ? "bg-red-50 border border-red-200" : "bg-slate-50 border border-slate-200"}`}>
          {diff > 0 ? <TrendingUp className="w-4.5 h-4.5 text-emerald-500" /> : diff < 0 ? <TrendingDown className="w-4.5 h-4.5 text-red-500" /> : <Minus className="w-4.5 h-4.5 text-slate-400" />}
        </div>
        <div className="flex-1 text-center p-2.5 rounded-lg bg-slate-50/60 border border-slate-100/60">
          <p className="text-xl font-extrabold text-slate-500">{sessionStats.prevTotalActive}</p>
          <p className="text-[9px] text-slate-400 font-medium mt-0.5">{isAr ? "سابق" : "Previous"}</p>
        </div>
      </div>

      {changes.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-100">
          {changes.map(c => (
            <div key={c.value} className="flex items-center gap-2 py-0.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-[10px] text-slate-500 flex-1 truncate">{isAr ? c.label_ar : c.label_en}</span>
              <span className="text-[10px] text-slate-300 tabular-nums">{c.prev}</span>
              <span className="text-[9px] text-slate-300">&rarr;</span>
              <span className="text-[10px] text-slate-600 font-medium tabular-nums">{c.today}</span>
              <span className={`text-[10px] font-bold ${c.delta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {c.delta > 0 ? "+" : ""}{c.delta}
              </span>
            </div>
          ))}
        </div>
      )}
      {changes.length === 0 && (
        <p className="text-[10px] text-slate-300 text-center py-1">{isAr ? "نفس التوزيع" : "Same distribution"}</p>
      )}
    </div>
  );
}
