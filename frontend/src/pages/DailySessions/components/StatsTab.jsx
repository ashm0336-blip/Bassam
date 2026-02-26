import {
  BarChart3, CircleDot, CircleOff, Edit2, Layers, Tag,
  ArrowLeftRight, TrendingUp, TrendingDown, Minus,
  ArrowUpRight, ArrowDownRight, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";
import { formatDateShort } from "../utils";

export function StatsTab({ sessionStats, changedZones, ZONE_TYPES, sessions }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  if (!sessionStats) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="stats-kpi-row">
        {[
          { label: isAr ? "المناطق النشطة" : "Active Zones", value: sessionStats.totalActive, color: "emerald", icon: CircleDot, testId: "stats-total-active", delta: sessionStats.hasPrevious ? sessionStats.totalActive - sessionStats.prevTotalActive : null },
          { label: isAr ? "المناطق المزالة" : "Removed", value: sessionStats.totalRemoved, color: "red", icon: CircleOff, testId: "stats-total-removed" },
          { label: isAr ? "التغييرات" : "Changes", value: changedZones.length, color: "amber", icon: Edit2, testId: "stats-total-changes" },
          { label: isAr ? "فئات مستخدمة" : "Categories", value: sessionStats.uniqueCategories, color: "blue", icon: Layers, testId: "stats-unique-cats", sub: isAr ? `من أصل ${ZONE_TYPES.length} فئة` : `of ${ZONE_TYPES.length} total` },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.testId} className={`relative overflow-hidden rounded-xl border bg-gradient-to-bl from-${item.color}-50 to-white p-4`}>
              <div className={`absolute -top-6 -left-6 w-16 h-16 rounded-full bg-${item.color}-200/30 blur-xl`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                  <div className={`w-8 h-8 rounded-lg bg-${item.color}-100 flex items-center justify-center`}><Icon className={`w-4 h-4 text-${item.color}-600`} /></div>
                </div>
                <p className={`text-3xl font-bold text-${item.color}-700`} data-testid={item.testId}>{item.value}</p>
                {item.delta !== null && item.delta !== undefined && (
                  <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${item.delta > 0 ? "text-emerald-600" : item.delta < 0 ? "text-red-500" : "text-slate-400"}`}>
                    {item.delta > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : item.delta < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    {item.delta !== 0 ? `${Math.abs(item.delta)} ${isAr ? "عن اليوم السابق" : "vs prev"}` : (isAr ? "بدون تغيير" : "No change")}
                  </div>
                )}
                {item.sub && <p className="text-[11px] text-muted-foreground mt-1">{item.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1" data-testid="stats-donut-chart">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-cairo flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-600" />{isAr ? "توزيع الفئات" : "Category Distribution"}</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            {sessionStats.totalActive === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">{isAr ? "لا توجد مناطق" : "No zones"}</div>
            ) : (
              <>
                <svg viewBox="0 0 200 200" className="w-48 h-48" data-testid="donut-svg">
                  {(() => {
                    const total = sessionStats.totalActive;
                    const cx = 100, cy = 100, r = 72, strokeW = 28;
                    const circumference = 2 * Math.PI * r;
                    let offset = 0;
                    return sessionStats.activeCats.map((cat) => {
                      const count = sessionStats.catCounts[cat.value];
                      const pct = count / total;
                      const dashLen = pct * circumference;
                      const dashGap = circumference - dashLen;
                      const el = <circle key={cat.value} cx={cx} cy={cy} r={r} fill="none" stroke={cat.color} strokeWidth={strokeW} strokeDasharray={`${dashLen} ${dashGap}`} strokeDashoffset={-offset} strokeLinecap="butt" transform={`rotate(-90 ${cx} ${cy})`} className="transition-all duration-500" />;
                      offset += dashLen;
                      return el;
                    });
                  })()}
                  <text x="100" y="92" textAnchor="middle" className="fill-current text-foreground" fontSize="28" fontWeight="bold">{sessionStats.totalActive}</text>
                  <text x="100" y="114" textAnchor="middle" className="fill-muted-foreground" fontSize="12">{isAr ? "منطقة" : "zones"}</text>
                </svg>
                <div className="w-full space-y-1.5 mt-3">
                  {sessionStats.activeCats.map(cat => {
                    const count = sessionStats.catCounts[cat.value];
                    const pct = sessionStats.totalActive > 0 ? Math.round((count / sessionStats.totalActive) * 100) : 0;
                    return (
                      <div key={cat.value} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="flex-1 truncate">{isAr ? cat.label_ar : cat.label_en}</span>
                        <span className="font-mono font-semibold">{count}</span>
                        <span className="text-muted-foreground w-8 text-left">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="stats-category-breakdown">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-cairo flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" />{isAr ? "تفصيل الفئات" : "Category Breakdown"}
              {sessionStats.hasPrevious && <Badge variant="outline" className="text-[10px] font-normal">{isAr ? `مقارنة مع ${formatDateShort(sessionStats.prevSession.date)}` : `vs ${formatDateShort(sessionStats.prevSession.date)}`}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1" data-testid="category-rows">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-semibold text-muted-foreground border-b">
                <div className="col-span-5">{isAr ? "الفئة" : "Category"}</div>
                <div className="col-span-2 text-center">{isAr ? "العدد" : "Count"}</div>
                <div className="col-span-3 text-center">{isAr ? "النسبة" : "Share"}</div>
                {sessionStats.hasPrevious && <div className="col-span-2 text-center">{isAr ? "الفرق" : "Delta"}</div>}
              </div>
              {ZONE_TYPES.map(cat => {
                const count = sessionStats.catCounts[cat.value] || 0;
                const prevCount = sessionStats.prevCatCounts[cat.value] ?? null;
                const delta = prevCount !== null ? count - prevCount : null;
                const pct = sessionStats.totalActive > 0 ? Math.round((count / sessionStats.totalActive) * 100) : 0;
                if (count === 0 && (prevCount === null || prevCount === 0)) return null;
                return (
                  <div key={cat.value} className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-50/80 transition-colors items-center" data-testid={`stat-row-${cat.value}`}>
                    <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: cat.color }}>{cat.icon}</div>
                      <span className="text-xs font-medium truncate">{isAr ? cat.label_ar : cat.label_en}</span>
                    </div>
                    <div className="col-span-2 text-center"><span className="text-sm font-bold">{count}</span></div>
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: cat.color }} /></div>
                        <span className="text-[11px] text-muted-foreground font-mono w-8 text-left">{pct}%</span>
                      </div>
                    </div>
                    {sessionStats.hasPrevious && (
                      <div className="col-span-2 text-center">
                        {delta !== null && delta !== 0 ? (
                          <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${delta > 0 ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
                            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{delta > 0 ? `+${delta}` : delta}
                          </span>
                        ) : <span className="text-xs text-slate-300">-</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {sessionStats.hasPrevious && <PreviousDayComparison sessionStats={sessionStats} ZONE_TYPES={ZONE_TYPES} isAr={isAr} />}
    </div>
  );
}

function PreviousDayComparison({ sessionStats, ZONE_TYPES, isAr }) {
  const diff = sessionStats.totalActive - sessionStats.prevTotalActive;
  const changes = ZONE_TYPES.map(cat => ({ ...cat, today: sessionStats.catCounts[cat.value] || 0, prev: sessionStats.prevCatCounts[cat.value] || 0, delta: (sessionStats.catCounts[cat.value] || 0) - (sessionStats.prevCatCounts[cat.value] || 0) })).filter(c => c.delta !== 0);

  return (
    <Card data-testid="stats-prev-comparison">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-cairo flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-indigo-600" />{isAr ? "مقارنة مع اليوم السابق" : "Previous Day Comparison"}
          <Badge variant="outline" className="text-[10px]">{formatDateShort(sessionStats.prevSession.date)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-4 bg-emerald-50/60 rounded-xl border border-emerald-100"><p className="text-xs text-emerald-600 font-medium mb-1">{isAr ? "اليوم" : "Today"}</p><p className="text-3xl font-bold text-emerald-700">{sessionStats.totalActive}</p><p className="text-[11px] text-emerald-500">{isAr ? "منطقة نشطة" : "active zones"}</p></div>
          <div className="flex items-center justify-center">
            <div className={`text-center p-4 rounded-xl border-2 ${diff > 0 ? "border-emerald-200 bg-emerald-50/30" : diff < 0 ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-slate-50/30"}`}>
              {diff > 0 ? <TrendingUp className="w-8 h-8 mx-auto text-emerald-500 mb-1" /> : diff < 0 ? <TrendingDown className="w-8 h-8 mx-auto text-red-500 mb-1" /> : <Minus className="w-8 h-8 mx-auto text-slate-400 mb-1" />}
              <p className={`text-2xl font-bold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-slate-500"}`}>{diff > 0 ? "+" : ""}{diff}</p>
              <p className="text-[11px] text-muted-foreground">{isAr ? "فرق المناطق" : "zone difference"}</p>
            </div>
          </div>
          <div className="text-center p-4 bg-slate-50/60 rounded-xl border border-slate-100"><p className="text-xs text-slate-500 font-medium mb-1">{isAr ? "اليوم السابق" : "Previous"}</p><p className="text-3xl font-bold text-slate-600">{sessionStats.prevTotalActive}</p><p className="text-[11px] text-slate-400">{isAr ? "منطقة نشطة" : "active zones"}</p></div>
        </div>
        {changes.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground"><CheckCircle2 className="w-8 h-8 mx-auto text-emerald-300 mb-2" />{isAr ? "نفس توزيع الفئات مع اليوم السابق" : "Same category distribution as previous day"}</div>
        ) : (
          <div className="space-y-2" data-testid="category-changes-list">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">{isAr ? "التغييرات بحسب الفئة:" : "Changes by category:"}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {changes.map(c => (
                <div key={c.value} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${c.delta > 0 ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"}`} data-testid={`change-cat-${c.value}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: c.color }}>{c.icon}</div>
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{isAr ? c.label_ar : c.label_en}</p><p className="text-[11px] text-muted-foreground">{c.prev} &rarr; {c.today}</p></div>
                  <span className={`text-sm font-bold ${c.delta > 0 ? "text-emerald-600" : "text-red-600"}`}>{c.delta > 0 ? `+${c.delta}` : c.delta}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
