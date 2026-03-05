import {
  Layers, MapPin, Maximize2, Users, ShieldCheck, AlertTriangle,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Minus, PanelLeftClose,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatDateShort } from "../utils";
import { getPatternContent } from "./ZonePatterns";

// Mini swatch that mirrors the exact zone style from the map
function ZoneStyleSwatch({ zone, fallbackColor }) {
  const size = 14;
  const ts = 4; // pattern tile size for swatch
  if (!zone) {
    return <span className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: fallbackColor }} />;
  }
  const usePattern = zone.fill_type === "pattern" && zone.pattern_type;
  const patId = `swatch-pat-${zone.id}`;
  const fillVal = usePattern ? `url(#${patId})` : (zone.fill_color || fallbackColor);
  const strokeDash = zone.stroke_style === "solid" ? "none"
    : zone.stroke_style === "dotted" ? "1 1.5"
    : zone.stroke_style === "dash-dot" ? "3 1 1 1"
    : "3 2";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      {usePattern && (
        <defs>
          <pattern id={patId} patternUnits="userSpaceOnUse" width={ts} height={ts}>
            <rect width={ts} height={ts} fill={zone.pattern_bg_color || "#fff"} />
            {getPatternContent(zone.pattern_type, zone.pattern_fg_color || "#000", ts)}
          </pattern>
        </defs>
      )}
      <rect x="0.5" y="0.5" width={size - 1} height={size - 1} rx="2"
        fill={fillVal}
        fillOpacity={zone.opacity ?? 0.4}
        stroke={zone.stroke_color || "#000"}
        strokeWidth={Math.min((zone.stroke_width ?? 0.3) * 2, 2)}
        strokeOpacity={zone.stroke_opacity ?? 1}
        strokeDasharray={strokeDash}
      />
    </svg>
  );
}

export function MapStatsPanel({ sessionStats, densityStats, changedZones, ZONE_TYPES, activeZones, collapsed, onToggle }) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  if (!sessionStats) return null;

  const ToggleBtn = (
    <button
      onClick={onToggle}
      className="absolute top-3 left-3 z-10 w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 hover:shadow transition-all"
      data-testid="stats-panel-toggle"
      title={isAr ? "إخفاء الإحصائيات" : "Hide Stats"}
    >
      <PanelLeftClose className="w-4 h-4 text-slate-400" />
    </button>
  );

  if (collapsed) {
    return null;
  }

  return (
    <div className="relative w-[40%] flex-shrink-0 bg-gradient-to-b from-slate-50/95 to-white/95 backdrop-blur-sm border-l border-slate-200/80 overflow-y-auto overflow-x-hidden" data-testid="map-stats-panel">

      <div className="p-4 space-y-4">

        {/* Panel Header with close button */}
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <p className="text-[12px] font-bold font-cairo text-slate-600 tracking-wide">{isAr ? "الإحصائيات" : "Statistics"}</p>
          <div className="flex-1 flex justify-end">
            <button
              onClick={onToggle}
              className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-100 transition-all"
              data-testid="stats-panel-close"
              title={isAr ? "إخفاء" : "Hide"}
            >
              <PanelLeftClose className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent" />

        {/* KPI Grid - 3x2 */}
        <div className="grid grid-cols-3 gap-2.5" data-testid="live-kpi-grid">
          {[
            { label: isAr ? "إجمالي المواقع" : "Total Zones", value: sessionStats.totalActive, icon: MapPin, color: "#10b981" },
            { label: isAr ? "إجمالي الفئات" : "Categories", value: sessionStats.uniqueCategories, icon: Layers, color: "#3b82f6", sub: `/${ZONE_TYPES.length}` },
            { label: isAr ? "المساحة الإجمالية" : "Total Area", value: sessionStats.totalArea > 0 ? sessionStats.totalArea.toLocaleString() : "0", icon: Maximize2, color: "#8b5cf6", unit: isAr ? "م²" : "m²" },
            { label: isAr ? "متوسط المصلين" : "Avg. Worshippers", value: sessionStats.avgWorshippers, icon: Users, color: "#0ea5e9", unit: isAr ? "مصلي" : "" },
            { label: isAr ? "متوسط السعة" : "Avg. Capacity", value: sessionStats.avgCapacity, icon: ShieldCheck, color: "#f59e0b", unit: isAr ? "مصلي" : "" },
            { label: isAr ? "مناطق حرجة" : "Critical Zones", value: densityStats?.criticalCount ?? 0, icon: AlertTriangle, color: (densityStats?.criticalCount ?? 0) > 0 ? "#ef4444" : "#10b981" },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="relative rounded-xl p-2.5 border border-slate-100 bg-white overflow-hidden hover:shadow-sm transition-shadow" data-testid={`live-kpi-${i}`}>
                <div className="absolute top-0 right-0 w-12 h-12 rounded-bl-[2rem] opacity-[0.06]" style={{ backgroundColor: kpi.color }} />
                <div className="flex items-start justify-between gap-1 relative">
                  <div className="min-w-0">
                    <p className="text-[9px] font-medium text-slate-400 leading-tight truncate">{kpi.label}</p>
                    <div className="flex items-baseline gap-0.5 mt-1">
                      <span className="text-xl font-extrabold tracking-tight" style={{ color: kpi.color }}>{kpi.value}</span>
                      {kpi.sub && <span className="text-[10px] text-slate-300 font-medium">{kpi.sub}</span>}
                      {kpi.unit && <span className="text-[9px] text-slate-400 font-medium">{kpi.unit}</span>}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" style={{ color: kpi.color, opacity: 0.5 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Donut + Full Legend */}
        {sessionStats.totalActive > 0 && (
          <div className="rounded-xl border border-slate-100 bg-white p-4" data-testid="live-donut">
            <div className="text-center mb-3">
              <p className="text-[12px] font-bold text-slate-500 tracking-wider font-cairo">{isAr ? "توزيع الفئات" : "Distribution"}</p>
              <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent mt-2" />
            </div>
            <div className="flex items-center gap-4">
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
                  <text x="60" y="58" textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight="800" fill="#1e293b">{sessionStats.totalActive}</text>
                  <text x="60" y="76" textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#94a3b8" fontWeight="600">{isAr ? "منطقة" : "zones"}</text>
                </svg>
              </div>
              {/* Legend */}
              <div className="flex-1 space-y-2 min-w-0">
                {sessionStats.activeCats.map(cat => {
                  const count = sessionStats.catCounts[cat.value];
                  const pct = Math.round((count / sessionStats.totalActive) * 100);
                  const repZone = (activeZones || []).find(z => z.zone_type === cat.value);
                  return (
                    <div key={cat.value} className="flex items-center gap-2">
                      <ZoneStyleSwatch zone={repZone} fallbackColor={cat.color} />
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
      <div className="text-center mb-3">
        <p className="text-[12px] font-bold text-slate-500 tracking-wider font-cairo">{isAr ? "مقارنة" : "Compare"}</p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
          <span className="text-[9px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{formatDateShort(sessionStats.prevSession.date)}</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
        </div>
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
