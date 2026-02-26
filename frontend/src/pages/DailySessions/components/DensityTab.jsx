import { useState, useRef, useCallback, useMemo } from "react";
import {
  Activity, Users, ShieldAlert, Flame, Gauge, AlertCircle, RefreshCw, SaveAll,
  MapPin, ZoomIn, ZoomOut, Maximize2, Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";
import { PRAYER_TIMES } from "../constants";
import { getPath, isPointInPolygon, getDensityLevel } from "../utils";

export function DensityTab({
  activeSession, densityStats, densityEdits, activePrayer, setActivePrayer,
  handleDensityChange, handleSaveDensityBatch, savingDensity,
  selectedFloor, imgRatio, ZONE_TYPES,
}) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  if (!densityStats) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl" data-testid="prayer-time-selector">
        {PRAYER_TIMES.map(pt => (
          <button key={pt.key} onClick={() => setActivePrayer(pt.key)} data-testid={`prayer-btn-${pt.key}`}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-cairo font-semibold transition-all ${activePrayer === pt.key ? "bg-white shadow-md text-emerald-700 ring-1 ring-emerald-200" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}>
            <span className="text-base">{pt.icon}</span>
            <span className="hidden sm:inline">{isAr ? pt.label_ar : pt.label_en}</span>
          </button>
        ))}
      </div>

      <DensityKPIs densityStats={densityStats} activePrayer={activePrayer} isAr={isAr} />

      {Object.keys(densityEdits).length > 0 && (
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg" data-testid="density-save-bar">
          <div className="flex items-center gap-2 text-sm text-amber-700"><AlertCircle className="w-4 h-4" />{isAr ? `${Object.keys(densityEdits).length} تعديل غير محفوظ` : `${Object.keys(densityEdits).length} unsaved changes`}</div>
          <Button onClick={handleSaveDensityBatch} disabled={savingDensity} className="bg-emerald-600 hover:bg-emerald-700" size="sm" data-testid="density-save-btn">
            {savingDensity ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <SaveAll className="w-4 h-4 ml-1" />}{isAr ? "حفظ الكل" : "Save All"}
          </Button>
        </div>
      )}

      <DensityZoneGrid densityStats={densityStats} densityEdits={densityEdits} activePrayer={activePrayer} handleDensityChange={handleDensityChange} ZONE_TYPES={ZONE_TYPES} isAr={isAr} />

      {selectedFloor?.image_url && (
        <DensityHeatmap densityStats={densityStats} selectedFloor={selectedFloor} imgRatio={imgRatio} ZONE_TYPES={ZONE_TYPES} isAr={isAr} />
      )}
    </div>
  );
}

function DensityKPIs({ densityStats, activePrayer, isAr }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="density-kpi-row">
      <div className="relative overflow-hidden rounded-xl border p-4" style={{ background: `linear-gradient(135deg, ${densityStats.overallLevel.bg}, white)` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium">{isAr ? "نسبة الإشغال" : "Utilization"} - {isAr ? PRAYER_TIMES.find(p => p.key === activePrayer)?.label_ar : activePrayer}</span>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: densityStats.overallLevel.color + "20" }}><Gauge className="w-4 h-4" style={{ color: densityStats.overallLevel.color }} /></div>
        </div>
        <p className="text-3xl font-bold" style={{ color: densityStats.overallLevel.color }} data-testid="density-overall-pct">{densityStats.overallPct}%</p>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(densityStats.overallPct, 100)}%`, backgroundColor: densityStats.overallLevel.color }} /></div>
      </div>
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-blue-50 to-white p-4">
        <div className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground font-medium">{isAr ? "العدد الحالي" : "Current Count"}</span><div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Users className="w-4 h-4 text-blue-600" /></div></div>
        <p className="text-3xl font-bold text-blue-700" data-testid="density-total-current">{densityStats.totalCurrent.toLocaleString()}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{isAr ? `من أصل ${densityStats.totalCapacity.toLocaleString()}` : `of ${densityStats.totalCapacity.toLocaleString()}`}</p>
      </div>
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-red-50 to-white p-4">
        <div className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground font-medium">{isAr ? "مناطق حرجة" : "Critical Zones"}</span><div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center"><ShieldAlert className="w-4 h-4 text-red-500" /></div></div>
        <p className="text-3xl font-bold text-red-600" data-testid="density-critical-count">{densityStats.criticalCount}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{isAr ? "تجاوز 90% من السعة" : "> 90% capacity"}</p>
      </div>
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-bl from-orange-50 to-white p-4">
        <div className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground font-medium">{isAr ? "مناطق مرتفعة" : "High Zones"}</span><div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center"><Flame className="w-4 h-4 text-orange-500" /></div></div>
        <p className="text-3xl font-bold text-orange-600" data-testid="density-high-count">{densityStats.highCount}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{isAr ? "بين 70% - 90%" : "70% - 90%"}</p>
      </div>
    </div>
  );
}

function DensityZoneGrid({ densityStats, densityEdits, activePrayer, handleDensityChange, ZONE_TYPES, isAr }) {
  return (
    <Card data-testid="density-zones-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-cairo flex items-center gap-2"><Activity className="w-4 h-4 text-blue-600" />{isAr ? "كثافة المناطق" : "Zone Density"}<Badge variant="secondary" className="text-[10px]">{densityStats.zonesDensity.length} {isAr ? "منطقة" : "zones"}</Badge></CardTitle>
          <div className="flex items-center gap-3">
            {[{ color: "#0ea5e9", label: isAr ? "منخفض" : "Low" },{ color: "#16a34a", label: isAr ? "طبيعي" : "Normal" },{ color: "#d97706", label: isAr ? "متوسط" : "Medium" },{ color: "#ea580c", label: isAr ? "مرتفع" : "High" },{ color: "#dc2626", label: isAr ? "حرج" : "Critical" }].map(l => (
              <div key={l.color} className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />{l.label}</div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" data-testid="density-zone-list">
          {densityStats.zonesDensity.map(zone => {
            const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
            const di = zone.densityInfo;
            const isEdited = densityEdits[zone.id]?.prayer_counts?.[activePrayer] !== undefined;
            const safePos = zone.capMax > 0 ? Math.round((zone.capSafe / zone.capMax) * 100) : 73;
            const medPos = zone.capMax > 0 ? Math.round((zone.capMedium / zone.capMax) * 100) : 92;
            return (
              <div key={zone.id} className={`rounded-xl border p-3 transition-all hover:shadow-md ${di.level === "max" || di.level === "over" ? "border-red-200 bg-red-50/50" : di.level === "medium" ? "border-amber-200 bg-amber-50/30" : "border-slate-200 hover:border-slate-300"}`} data-testid={`density-zone-${zone.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ backgroundColor: zone.fill_color }}>{ti?.icon || "?"}</div>
                    <div className="min-w-0"><p className="text-xs font-bold truncate leading-tight">{zone.zone_code}</p><p className="text-[9px] text-muted-foreground truncate leading-tight">{isAr ? zone.name_ar : zone.name_en}</p></div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: di.bg, color: di.color }}>{isAr ? di.label_ar : di.label_en}</span>
                </div>
                <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-1">
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{ width: `${Math.min(zone.fillPct, 100)}%`, backgroundColor: di.color }} />
                  <div className="absolute top-0 bottom-0 w-px bg-green-600/60" style={{ left: `${safePos}%` }} title={`${isAr ? "آمن" : "Safe"}: ${zone.capSafe}`} />
                  <div className="absolute top-0 bottom-0 w-px bg-amber-600/60" style={{ left: `${medPos}%` }} title={`${isAr ? "متوسط" : "Medium"}: ${zone.capMedium}`} />
                </div>
                <div className="flex items-center justify-between text-[8px] text-muted-foreground mb-2"><span>{zone.capSafe} <span style={{color:"#16a34a"}}>|</span> {zone.capMedium} <span style={{color:"#d97706"}}>|</span> {zone.capMax}</span></div>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center border rounded-md overflow-hidden flex-1">
                    <Input type="number" min={0} max={120} className={`h-7 text-center text-xs font-mono border-0 ${isEdited ? "ring-2 ring-amber-300" : ""}`} value={zone.fillPct} onChange={(e) => handleDensityChange(zone.id, "prayer_count", Math.min(parseInt(e.target.value) || 0, 120))} data-testid={`density-input-${zone.id}`} />
                    <span className="text-[10px] font-bold text-muted-foreground px-1.5 bg-slate-50 h-7 flex items-center">%</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold" style={{ color: di.color }}>{zone.actualCount.toLocaleString()}</span>
                </div>
                {zone.totalRows > 0 && <div className="flex items-center gap-1 mt-1.5 text-[9px] text-muted-foreground"><Layers className="w-3 h-3" /><span>{zone.filledRows} / {zone.totalRows} {isAr ? "صف" : "rows"}</span></div>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DensityHeatmap({ densityStats, selectedFloor, imgRatio, ZONE_TYPES, isAr }) {
  const [heatZoom, setHeatZoom] = useState(1);
  const [heatPan, setHeatPan] = useState({ x: 0, y: 0 });
  const [heatPanning, setHeatPanning] = useState(false);
  const [heatPanStart, setHeatPanStart] = useState({ x: 0, y: 0 });
  const heatZoomRef = useRef(1);
  const heatContainerRef = useRef(null);
  const [heatHovered, setHeatHovered] = useState(null);
  const [heatTooltipPos, setHeatTooltipPos] = useState({ x: 0, y: 0 });

  const heatWheelRef = useCallback((node) => {
    if (!node) return;
    heatContainerRef.current = node;
    const handler = (e) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const prev = heatZoomRef.current;
      const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const nz = Math.max(0.3, Math.min(20, prev * delta));
      const s = nz / prev;
      heatZoomRef.current = nz; setHeatZoom(nz);
      setHeatPan(p => ({ x: mx - s * (mx - p.x), y: my - s * (my - p.y) }));
    };
    node.addEventListener("wheel", handler, { passive: false });
    return () => node.removeEventListener("wheel", handler);
  }, []);

  const zoomHeat = (factor) => {
    const c = heatContainerRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const cx = r.width/2, cy = r.height/2;
    const p = heatZoomRef.current;
    const nz = Math.max(0.3, Math.min(20, p * factor));
    const s = nz / p;
    heatZoomRef.current = nz; setHeatZoom(nz);
    setHeatPan(o => ({ x: cx - s*(cx-o.x), y: cy - s*(cy-o.y) }));
  };

  return (
    <Card data-testid="density-heatmap-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-cairo flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-600" />{isAr ? "خريطة الكثافة الحرارية" : "Density Heat Map"}</CardTitle>
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-white">
            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="heat-zoom-out" onClick={() => zoomHeat(0.8)}><ZoomOut className="w-4 h-4" /></Button>
            <span className="text-xs w-12 text-center font-mono">{Math.round(heatZoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="heat-zoom-in" onClick={() => zoomHeat(1.25)}><ZoomIn className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="heat-zoom-reset" onClick={() => { heatZoomRef.current=1; setHeatZoom(1); setHeatPan({x:0,y:0}); }}><Maximize2 className="w-4 h-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div ref={heatWheelRef} className="relative bg-slate-50 rounded-lg overflow-hidden" style={{ height: "550px", cursor: heatPanning ? "grabbing" : "grab" }} data-testid="density-heatmap-container"
          onMouseDown={(e) => { if (e.button !== 0) return; e.preventDefault(); setHeatPanning(true); setHeatPanStart({ x: e.clientX - heatPan.x, y: e.clientY - heatPan.y }); }}
          onMouseMove={(e) => {
            if (heatPanning) { setHeatPan({ x: e.clientX - heatPanStart.x, y: e.clientY - heatPanStart.y }); return; }
            const c = heatContainerRef.current; if (!c) return;
            const rect = c.getBoundingClientRect();
            setHeatTooltipPos({ x: e.clientX - rect.left + 16, y: e.clientY - rect.top - 10 });
            const innerDiv = c.querySelector('[data-heat-inner]'); if (!innerDiv) return;
            const innerRect = innerDiv.getBoundingClientRect();
            const px = ((e.clientX - innerRect.left) / innerRect.width) * 100;
            const py = ((e.clientY - innerRect.top) / innerRect.height) * 100;
            let found = null;
            for (const zone of (densityStats?.zonesDensity || [])) { if (zone.polygon_points && isPointInPolygon({ x: px, y: py }, zone.polygon_points)) { found = zone; break; } }
            setHeatHovered(found);
          }}
          onMouseUp={() => setHeatPanning(false)} onMouseLeave={() => { setHeatPanning(false); setHeatHovered(null); }}>
          <div style={{ transform: `translate(${heatPan.x}px, ${heatPan.y}px) scale(${heatZoom})`, transformOrigin: "0 0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {(() => {
              let ws = { position: "relative", width: "100%", height: "100%" };
              if (imgRatio) { const ch = 550; const cw = heatContainerRef.current?.clientWidth || 800; if (cw / ch > imgRatio) ws = { position: "relative", height: "100%", width: ch * imgRatio }; else ws = { position: "relative", width: "100%", height: cw / imgRatio }; }
              return (
                <div style={ws} data-heat-inner="true">
                  <img src={selectedFloor.image_url} alt="" style={{ width: "100%", height: "100%", display: "block", imageRendering: "high-quality" }} draggable={false} className="pointer-events-none select-none" />
                  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }} viewBox="0 0 100 100" preserveAspectRatio="none" data-testid="density-heatmap-svg">
                    {(densityStats?.zonesDensity || []).map(zone => {
                      const di = zone.densityInfo;
                      const isHovered = heatHovered?.id === zone.id;
                      const pts = zone.polygon_points || [];
                      const minY = pts.length > 0 ? Math.min(...pts.map(p => p.y)) : 0;
                      const maxY = pts.length > 0 ? Math.max(...pts.map(p => p.y)) : 0;
                      const minX = pts.length > 0 ? Math.min(...pts.map(p => p.x)) : 0;
                      const maxX = pts.length > 0 ? Math.max(...pts.map(p => p.x)) : 0;
                      const totalRows = zone.totalRows || 0;
                      const filledRows = zone.filledRows || 0;
                      const rowHeight = totalRows > 0 ? (maxY - minY) / totalRows : 0;
                      const gap = rowHeight * 0.15;
                      return (
                        <g key={zone.id}>
                          <defs><clipPath id={`clip-${zone.id}`}><path d={getPath(pts)} /></clipPath></defs>
                          <path d={getPath(pts)} fill={isHovered ? "#f1f5f9" : "#f8fafc"} fillOpacity={isHovered ? 0.5 : 0.3} stroke={isHovered ? "#1e293b" : "#94a3b8"} strokeWidth={isHovered ? 1 : 0.3} strokeOpacity={isHovered ? 1 : 0.4} vectorEffect="non-scaling-stroke" />
                          {totalRows > 0 && Array.from({ length: totalRows }, (_, r) => {
                            const y = minY + r * rowHeight + rowHeight * 0.5;
                            const isFilled = r < filledRows;
                            return <line key={r} x1={minX} y1={y} x2={maxX} y2={y} stroke={isFilled ? di.color : "#cbd5e1"} strokeWidth={isFilled ? Math.max(rowHeight - gap, 0.08) : Math.max((rowHeight - gap) * 0.3, 0.04)} strokeOpacity={isFilled ? 0.7 : 0.3} strokeDasharray={isFilled ? "none" : `${rowHeight * 0.5} ${rowHeight * 0.4}`} clipPath={`url(#clip-${zone.id})`} />;
                          })}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              );
            })()}
          </div>
          {heatHovered && !heatPanning && <HeatmapTooltip zone={heatHovered} pos={heatTooltipPos} ZONE_TYPES={ZONE_TYPES} isAr={isAr} />}
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-sm">
            <div className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-green-500" /><span className="text-[9px]">{isAr ? "آمن" : "Safe"}</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-amber-500" /><span className="text-[9px]">{isAr ? "متوسط" : "Medium"}</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-500" /><span className="text-[9px]">{isAr ? "أقصى" : "Max"}</span></div>
            <span className="text-[9px] text-muted-foreground mr-auto">{isAr ? "الخطوط = صفوف المصلين" : "Lines = prayer rows"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeatmapTooltip({ zone, pos, ZONE_TYPES, isAr }) {
  const di = zone.densityInfo;
  const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
  return (
    <div className="absolute z-50 pointer-events-none bg-white/95 backdrop-blur-md border shadow-xl rounded-xl px-3 py-2.5 min-w-[200px]" style={{ left: pos.x, top: pos.y }}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: zone.fill_color }}>{ti?.icon || "?"}</div>
        <span className="font-bold text-xs">{zone.zone_code}</span>
        <span className="text-[10px] text-muted-foreground">{isAr ? zone.name_ar : zone.name_en}</span>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(zone.fillPct || 0, 100)}%`, backgroundColor: di.color }} /></div>
        <span className="text-xs font-bold font-mono" style={{ color: di.color }}>{zone.fillPct || 0}%</span>
      </div>
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "عدد المصلين" : "Count"}</span><span className="font-mono font-bold">{(zone.actualCount || 0).toLocaleString()}</span></div>
        {zone.totalRows > 0 && (<><div className="border-t border-dashed border-slate-200 my-1" /><div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "الصفوف الممتلئة" : "Filled rows"}</span><span className="font-mono font-bold">{zone.filledRows} / {zone.totalRows}</span></div></>)}
      </div>
      <div className="mt-1.5"><span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold" style={{ backgroundColor: di.bg, color: di.color }}>{isAr ? di.label_ar : di.label_en}</span></div>
    </div>
  );
}
