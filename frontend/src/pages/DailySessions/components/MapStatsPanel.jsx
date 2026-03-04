import { useState } from "react";
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

  // Toggle button (always visible)
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
    return (
      <div className="relative w-0">
        {ToggleBtn}
      </div>
    );
  }

  const totalCapacity = sessionStats.activeCats.reduce((sum, cat) => sum + (sessionStats.catCounts[cat.value] || 0), 0);

  return (
    <div className="relative w-[340px] flex-shrink-0 bg-gradient-to-b from-slate-50/95 to-white/95 backdrop-blur-sm border-l border-slate-200/80 overflow-y-auto overflow-x-hidden" style={{ maxHeight: "600px" }} data-testid="map-stats-panel">
      {ToggleBtn}

      <div className="p-3 space-y-3">

        {/* KPI Grid - 2x2 */}
        <div className="grid grid-cols-2 gap-2" data-testid="live-kpi-grid">
          {[
            { label: isAr ? "نشطة" : "Active", value: sessionStats.totalActive, icon: CircleDot, color: "#10b981", bg: "#ecfdf5", delta: sessionStats.hasPrevious ? sessionStats.totalActive - sessionStats.prevTotalActive : null },
            { label: isAr ? "مزالة" : "Removed", value: sessionStats.totalRemoved, icon: CircleOff, color: "#ef4444", bg: "#fef2f2", delta: null },
            { label: isAr ? "تغييرات" : "Changes", value: changedZones.length, icon: Edit2, color: "#f59e0b", bg: "#fffbeb", delta: null },
            { label: isAr ? "فئات" : "Categories", value: sessionStats.uniqueCategories, icon: Layers, color: "#3b82f6", bg: "#eff6ff", sub: `/${ZONE_TYPES.length}` },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="relative rounded-xl p-2.5 border border-slate-100 bg-white overflow-hidden group hover:shadow-sm transition-shadow" data-testid={`live-kpi-${i}`}>
                <div className="absolute top-0 right-0 w-12 h-12 rounded-bl-[2rem] opacity-[0.07]" style={{ backgroundColor: kpi.color }} />
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 leading-tight">{kpi.label}</p>
                    <div className="flex items-baseline gap-0.5 mt-1">
                      <span className="text-2xl font-extrabold tracking-tight" style={{ color: kpi.color }}>{kpi.value}</span>
                      {kpi.sub && <span className="text-[10px] text-slate-300 font-medium">{kpi.sub}</span>}
                    </div>
                    {kpi.delta !== null && kpi.delta !== undefined && kpi.delta !== 0 && (
                      <div className={`flex items-center gap-0.5 mt-0.5 text-[9px] font-semibold ${kpi.delta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {kpi.delta > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                        {kpi.delta > 0 ? "+" : ""}{kpi.delta}
                      </div>
                    )}
                  </div>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: kpi.bg }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Donut + Legend */}
        {sessionStats.totalActive > 0 && (
          <div className="rounded-xl border border-slate-100 bg-white p-3" data-testid="live-donut">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{isAr ? "توزيع الفئات" : "Distribution"}</p>
            <div className="flex items-start gap-3">
              {/* Donut */}
              <div className="flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-[80px] h-[80px]">
                  {(() => {
                    const total = sessionStats.totalActive;
                    const cx = 50, cy = 50, r = 36, sw = 12;
                    const circ = 2 * Math.PI * r;
                    let offset = 0;
                    return sessionStats.activeCats.map((cat) => {
                      const count = sessionStats.catCounts[cat.value];
                      const pct = count / total;
                      const dashLen = pct * circ;
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
                  <text x="50" y="47" textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="800" fill="#1e293b">{sessionStats.totalActive}</text>
                  <text x="50" y="61" textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#94a3b8" fontWeight="600">{isAr ? "منطقة" : "zones"}</text>
                </svg>
              </div>
              {/* Legend - scrollable if too many */}
              <div className="flex-1 space-y-1 min-w-0 max-h-[120px] overflow-y-auto">
                {sessionStats.activeCats.map(cat => {
                  const count = sessionStats.catCounts[cat.value];
                  const pct = Math.round((count / sessionStats.totalActive) * 100);
                  return (
                    <div key={cat.value} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-[9px] text-slate-600 truncate flex-1">{isAr ? cat.label_ar : cat.label_en}</span>
                      <span className="text-[9px] font-bold text-slate-700 tabular-nums">{count}</span>
                      <span className="text-[8px] text-slate-300 w-5 text-left tabular-nums">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Category Bars */}
        <div className="rounded-xl border border-slate-100 bg-white p-3" data-testid="live-category-bars">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{isAr ? "تفصيل الفئات" : "Breakdown"}</p>
          <div className="space-y-2">
            {ZONE_TYPES.map(cat => {
              const count = sessionStats.catCounts[cat.value] || 0;
              const prevCount = sessionStats.prevCatCounts?.[cat.value];
              const delta = sessionStats.hasPrevious && prevCount !== undefined ? count - prevCount : null;
              const pct = sessionStats.totalActive > 0 ? Math.round((count / sessionStats.totalActive) * 100) : 0;
              if (count === 0 && (prevCount === undefined || prevCount === 0)) return null;
              return (
                <div key={cat.value} className="group" data-testid={`live-cat-${cat.value}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 shadow-sm" style={{ backgroundColor: cat.color }}>{cat.icon}</div>
                    <span className="text-[10px] font-medium text-slate-600 flex-1 truncate">{isAr ? cat.label_ar : cat.label_en}</span>
                    <span className="text-xs font-bold text-slate-800 tabular-nums">{count}</span>
                    {delta !== null && delta !== 0 && (
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${delta > 0 ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
                        {delta > 0 ? "+" : ""}{delta}
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[8px] text-slate-300 tabular-nums">{pct}%</span>
                    {sessionStats.hasPrevious && prevCount !== undefined && (
                      <span className="text-[8px] text-slate-300">{isAr ? `سابق: ${prevCount}` : `prev: ${prevCount}`}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
    <div className="rounded-xl border border-slate-100 bg-white p-3" data-testid="live-prev-comparison">
      <div className="flex items-center gap-1.5 mb-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-1">{isAr ? "مقارنة" : "Compare"}</p>
        <span className="text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{formatDateShort(sessionStats.prevSession.date)}</span>
      </div>

      {/* Today vs Previous */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 text-center p-2 rounded-lg bg-emerald-50/60 border border-emerald-100/60">
          <p className="text-lg font-extrabold text-emerald-700">{sessionStats.totalActive}</p>
          <p className="text-[8px] text-emerald-500 font-medium">{isAr ? "اليوم" : "Today"}</p>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${diff > 0 ? "bg-emerald-50 border border-emerald-200" : diff < 0 ? "bg-red-50 border border-red-200" : "bg-slate-50 border border-slate-200"}`}>
          {diff > 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : diff < 0 ? <TrendingDown className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4 text-slate-400" />}
        </div>
        <div className="flex-1 text-center p-2 rounded-lg bg-slate-50/60 border border-slate-100/60">
          <p className="text-lg font-extrabold text-slate-500">{sessionStats.prevTotalActive}</p>
          <p className="text-[8px] text-slate-400 font-medium">{isAr ? "سابق" : "Previous"}</p>
        </div>
      </div>

      {/* Category changes */}
      {changes.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-dashed border-slate-100">
          {changes.map(c => (
            <div key={c.value} className="flex items-center gap-1.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-[9px] text-slate-500 flex-1 truncate">{isAr ? c.label_ar : c.label_en}</span>
              <span className="text-[9px] text-slate-300 tabular-nums">{c.prev}</span>
              <span className="text-[8px] text-slate-300">&rarr;</span>
              <span className="text-[9px] text-slate-600 font-medium tabular-nums">{c.today}</span>
              <span className={`text-[9px] font-bold ${c.delta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {c.delta > 0 ? "+" : ""}{c.delta}
              </span>
            </div>
          ))}
        </div>
      )}
      {changes.length === 0 && (
        <p className="text-[9px] text-slate-300 text-center py-1">{isAr ? "نفس التوزيع" : "Same distribution"}</p>
      )}
    </div>
  );
}
