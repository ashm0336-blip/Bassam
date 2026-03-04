import { useState, useRef, useCallback, useMemo } from "react";
import {
  Activity, Users, ShieldAlert, Flame, Gauge, AlertCircle, RefreshCw, SaveAll,
  MapPin, ZoomIn, ZoomOut, Maximize2, Layers, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [sortBy, setSortBy] = useState("density-desc");

  // Filter & sort zones
  const filteredZones = useMemo(() => {
    if (!densityStats) return [];
    let zones = [...densityStats.zonesDensity];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      zones = zones.filter(z => z.zone_code?.toLowerCase().includes(q) || z.name_ar?.toLowerCase().includes(q));
    }
    if (filterLevel !== "all") {
      zones = zones.filter(z => {
        const lvl = z.densityInfo.level;
        return lvl === filterLevel;
      });
    }
    if (sortBy === "density-desc") zones.sort((a, b) => b.fillPct - a.fillPct);
    else if (sortBy === "density-asc") zones.sort((a, b) => a.fillPct - b.fillPct);
    else if (sortBy === "name") zones.sort((a, b) => (a.zone_code || "").localeCompare(b.zone_code || ""));
    return zones;
  }, [densityStats, searchQuery, filterLevel, sortBy]);

  if (!densityStats) return null;

  const selectedZone = selectedZoneId ? densityStats.zonesDensity.find(z => z.id === selectedZoneId) : null;

  const handleZoneClick = (zoneId) => {
    setSelectedZoneId(prev => prev === zoneId ? null : zoneId);
  };

  return (
    <div className="space-y-3">
      {/* Prayer Time Selector */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl" data-testid="prayer-time-selector">
        {PRAYER_TIMES.map(pt => (
          <button key={pt.key} onClick={() => setActivePrayer(pt.key)} data-testid={`prayer-btn-${pt.key}`}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-cairo font-semibold transition-all ${activePrayer === pt.key ? "bg-white shadow-md text-emerald-700 ring-1 ring-emerald-200" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}>
            <span className="text-base">{pt.icon}</span>
            <span className="hidden sm:inline">{isAr ? pt.label_ar : pt.label_en}</span>
          </button>
        ))}
      </div>

      {/* Save bar */}
      {Object.keys(densityEdits).length > 0 && (
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg" data-testid="density-save-bar">
          <div className="flex items-center gap-2 text-sm text-amber-700"><AlertCircle className="w-4 h-4" />{isAr ? `${Object.keys(densityEdits).length} تعديل غير محفوظ` : `${Object.keys(densityEdits).length} unsaved`}</div>
          <Button onClick={handleSaveDensityBatch} disabled={savingDensity} className="bg-emerald-600 hover:bg-emerald-700" size="sm" data-testid="density-save-btn">
            {savingDensity ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <SaveAll className="w-4 h-4 ml-1" />}{isAr ? "حفظ الكل" : "Save All"}
          </Button>
        </div>
      )}

      {/* Main Layout: Heatmap (60%) + Panel (40%) */}
      <div className="flex gap-0 rounded-xl overflow-hidden border border-slate-200/60" style={{ alignItems: "stretch" }}>
        {/* Heatmap */}
        <div className="flex-1 min-w-0">
          {selectedFloor?.image_url ? (
            <DensityHeatmapInline
              densityStats={densityStats} selectedFloor={selectedFloor} imgRatio={imgRatio}
              ZONE_TYPES={ZONE_TYPES} isAr={isAr}
              selectedZoneId={selectedZoneId} onZoneClick={handleZoneClick}
            />
          ) : (
            <div className="h-full min-h-[500px] bg-slate-50 flex items-center justify-center text-sm text-slate-400">{isAr ? "لا توجد صورة خريطة" : "No map image"}</div>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-[40%] flex-shrink-0 bg-gradient-to-b from-slate-50/95 to-white/95 border-l border-slate-200/80 overflow-y-auto flex flex-col" data-testid="density-side-panel">
          <div className="p-4 space-y-3 flex-1">
            {/* Panel Title */}
            <div className="text-center">
              <p className="text-[12px] font-bold font-cairo text-slate-600">{isAr ? "لوحة الكثافات" : "Density Panel"}</p>
              <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent mt-2" />
            </div>

            {/* KPIs - Row 1: 3 cards */}
            <div className="grid grid-cols-3 gap-2" data-testid="density-kpi-grid">
              {[
                { label: isAr ? "المواقع" : "Zones", value: densityStats.totalZones, icon: MapPin, color: "#6366f1", bg: "#eef2ff" },
                { label: isAr ? "العدد" : "Count", value: densityStats.totalCurrent.toLocaleString(), icon: Users, color: "#3b82f6", bg: "#eff6ff", sub: `/ ${densityStats.totalCapacity.toLocaleString()}` },
                { label: isAr ? "إشغال" : "Util.", value: `${densityStats.overallPct}%`, icon: Gauge, color: densityStats.overallLevel.color, bg: densityStats.overallLevel.color + "15" },
              ].map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <div key={i} className="relative rounded-xl p-2 border border-slate-100 bg-white overflow-hidden" data-testid={`density-kpi-${i}`}>
                    <div className="absolute top-0 right-0 w-10 h-10 rounded-bl-[2rem] opacity-[0.06]" style={{ backgroundColor: kpi.color }} />
                    <div className="flex items-start justify-between gap-1 relative">
                      <div>
                        <p className="text-[9px] font-medium text-slate-400">{kpi.label}</p>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-lg font-extrabold tracking-tight" style={{ color: kpi.color }}>{kpi.value}</span>
                          {kpi.sub && <span className="text-[8px] text-slate-300">{kpi.sub}</span>}
                        </div>
                      </div>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: kpi.bg }}>
                        <Icon className="w-3 h-3" style={{ color: kpi.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* KPIs - Row 2: 4 level cards - Same style as Row 1 */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: isAr ? "آمن" : "Safe", value: densityStats.safeCount, icon: ShieldAlert, color: "#16a34a", cardBg: "#f0fdf4", iconBg: "#dcfce7" },
                { label: isAr ? "متوسط" : "Medium", value: densityStats.mediumCount, icon: AlertCircle, color: "#f59e0b", cardBg: "#fffbeb", iconBg: "#fef3c7" },
                { label: isAr ? "مرتفع" : "High", value: densityStats.highCount, icon: Flame, color: "#ea580c", cardBg: "#fff7ed", iconBg: "#fed7aa" },
                { label: isAr ? "حرج" : "Critical", value: densityStats.criticalCount, icon: ShieldAlert, color: "#dc2626", cardBg: "#fef2f2", iconBg: "#fecaca" },
              ].map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <div key={i} className="relative rounded-xl p-2 border overflow-hidden" style={{ backgroundColor: kpi.cardBg, borderColor: kpi.color + "25" }} data-testid={`density-level-${i}`}>
                    <div className="absolute top-0 right-0 w-10 h-10 rounded-bl-[2rem] opacity-[0.08]" style={{ backgroundColor: kpi.color }} />
                    <div className="flex items-start justify-between gap-1 relative">
                      <div>
                        <p className="text-[9px] font-medium" style={{ color: kpi.color + "99" }}>{kpi.label}</p>
                        <span className="text-lg font-extrabold tracking-tight" style={{ color: kpi.color }}>{kpi.value}</span>
                      </div>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4" style={{ color: kpi.color, opacity: 0.5 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Zone List Title + Controls */}
            <div className="text-center">
              <p className="text-[12px] font-bold font-cairo text-slate-600">{isAr ? "كثافة المناطق" : "Zone Density"}</p>
              <div className="h-px bg-gradient-to-l from-transparent via-slate-200 to-transparent mt-2" />
            </div>

            {/* Search + Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                <Input placeholder={isAr ? "بحث..." : "Search..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-7 text-[10px] pr-7 font-cairo" data-testid="density-search" />
              </div>
              <div className="flex border rounded-lg overflow-hidden">
                {[
                  { key: "all", label: isAr ? "الكل" : "All" },
                  { key: "critical", label: isAr ? "حرج" : "Critical", color: "#dc2626" },
                  { key: "high", label: isAr ? "مرتفع" : "High", color: "#ea580c" },
                  { key: "medium", label: isAr ? "متوسط" : "Medium", color: "#f59e0b" },
                  { key: "safe", label: isAr ? "آمن" : "Safe", color: "#16a34a" },
                ].map(f => (
                  <button key={f.key} onClick={() => setFilterLevel(f.key)} data-testid={`density-filter-${f.key}`}
                    className={`px-2 py-1 text-[9px] font-semibold transition-all ${filterLevel === f.key ? "bg-slate-800 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>
                    {f.color && <span className="inline-block w-1.5 h-1.5 rounded-full ml-0.5" style={{ backgroundColor: filterLevel === f.key ? "#fff" : f.color }} />}
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mini Grid */}
            <div className="grid grid-cols-6 gap-1.5 max-h-[340px] overflow-y-auto pr-0.5" data-testid="density-zone-list">
              {filteredZones.length === 0 ? (
                <p className="col-span-6 text-center text-[10px] text-slate-300 py-4">{isAr ? "لا توجد نتائج" : "No results"}</p>
              ) : filteredZones.map(zone => (
                <ZoneMiniCard key={zone.id} zone={zone} ZONE_TYPES={ZONE_TYPES}
                  densityEdits={densityEdits} activePrayer={activePrayer}
                  handleDensityChange={handleDensityChange}
                  isSelected={zone.id === selectedZoneId}
                  onSelect={() => handleZoneClick(zone.id)}
                  isAr={isAr}
                />
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function ZoneMiniCard({ zone, ZONE_TYPES, densityEdits, activePrayer, handleDensityChange, isSelected, onSelect, isAr }) {
  const di = zone.densityInfo;
  const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
  const isEdited = densityEdits[zone.id]?.prayer_counts?.[activePrayer] !== undefined;
  const code = zone.zone_code?.replace("ط - 0 - ", "").replace("ط-0-", "") || "?";
  const safePos = zone.capMax > 0 ? Math.round((zone.capSafe / zone.capMax) * 100) : 73;
  const medPos = zone.capMax > 0 ? Math.round((zone.capMedium / zone.capMax) * 100) : 92;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={onSelect}
          className={`relative rounded-lg p-1.5 text-center transition-all border cursor-pointer group overflow-hidden ${
            isSelected ? "border-blue-400 ring-2 ring-blue-200 shadow-md" :
            di.level === "critical" ? "border-red-300 hover:border-red-400 hover:shadow-sm" :
            di.level === "high" ? "border-orange-300 hover:border-orange-400 hover:shadow-sm" :
            di.level === "medium" ? "border-amber-200 hover:border-amber-300 hover:shadow-sm" :
            "border-slate-200 hover:border-slate-300 hover:shadow-sm"
          }`}
          style={{ backgroundColor: zone.fillPct > 0 ? di.color + "08" : "#fff" }}
          data-testid={`density-cell-${zone.id}`}
        >
          {isEdited && <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-amber-400 z-10" />}
          <p className="text-[7px] text-slate-400 font-medium truncate leading-none">{zone.zone_code}</p>
          <p className="text-sm font-extrabold tabular-nums leading-tight mt-0.5" style={{ color: zone.fillPct > 0 ? di.color : "#cbd5e1" }}>{zone.fillPct}%</p>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(zone.fillPct, 100)}%`, backgroundColor: di.color }} />
          </div>
          {zone.fillPct > 0 && <p className="text-[7px] text-slate-400 tabular-nums mt-0.5 leading-none">{zone.actualCount.toLocaleString()}</p>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="center" side="top" data-testid={`density-popover-${zone.id}`}>
        <div className="p-3 space-y-2.5">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: zone.fill_color }}>{ti?.icon || "?"}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold">{zone.zone_code}</p>
              <p className="text-[8px] text-slate-400 truncate">{isAr ? zone.name_ar : zone.name_en}</p>
            </div>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: di.bg, color: di.color }}>{isAr ? di.label_ar : di.label_en}</span>
          </div>
          {/* Progress with markers */}
          <div>
            <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{ width: `${Math.min(zone.fillPct, 100)}%`, backgroundColor: di.color }} />
              <div className="absolute top-0 bottom-0 w-px bg-green-600/60 z-10" style={{ left: `${safePos}%` }} />
              <div className="absolute top-0 bottom-0 w-px bg-amber-600/60 z-10" style={{ left: `${medPos}%` }} />
            </div>
            <div className="flex justify-between mt-0.5 text-[7px] text-slate-300">
              <span>0</span><span style={{ color: "#16a34a" }}>{zone.capSafe}</span><span style={{ color: "#d97706" }}>{zone.capMedium}</span><span>{zone.capMax}</span>
            </div>
          </div>
          {/* Input */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg overflow-hidden flex-1">
              <Input type="number" min={0} max={120}
                className={`h-8 text-center text-sm font-mono font-bold border-0 ${isEdited ? "ring-2 ring-amber-300 bg-amber-50" : ""}`}
                value={zone.fillPct}
                onChange={(e) => handleDensityChange(zone.id, "prayer_count", Math.min(parseInt(e.target.value) || 0, 120))}
                onClick={(e) => e.stopPropagation()}
                data-testid={`density-input-${zone.id}`}
              />
              <span className="text-[10px] font-bold text-slate-400 px-1.5 bg-slate-50 h-8 flex items-center">%</span>
            </div>
            <div className="text-center min-w-[45px]">
              <p className="text-base font-extrabold tabular-nums" style={{ color: di.color }}>{zone.actualCount.toLocaleString()}</p>
              <p className="text-[7px] text-slate-400">{isAr ? "مصلي" : "people"}</p>
            </div>
          </div>
          {/* Rows */}
          {zone.totalRows > 0 && (
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-dashed border-slate-100">
              <Layers className="w-3 h-3 text-slate-400" />
              <span className="text-[9px] text-slate-500">{isAr ? "الصفوف:" : "Rows:"}</span>
              <span className="text-[9px] font-bold">{zone.filledRows} / {zone.totalRows}</span>
              <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${zone.totalRows > 0 ? (zone.filledRows / zone.totalRows) * 100 : 0}%` }} />
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DensityHeatmapInline({ densityStats, selectedFloor, imgRatio, ZONE_TYPES, isAr, selectedZoneId, onZoneClick }) {
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
    const cx = r.width / 2, cy = r.height / 2;
    const p = heatZoomRef.current;
    const nz = Math.max(0.3, Math.min(20, p * factor));
    const s = nz / p;
    heatZoomRef.current = nz; setHeatZoom(nz);
    setHeatPan(o => ({ x: cx - s * (cx - o.x), y: cy - s * (cy - o.y) }));
  };

  const getMousePercent = (e) => {
    const c = heatContainerRef.current; if (!c) return null;
    const innerDiv = c.querySelector("[data-heat-inner]"); if (!innerDiv) return null;
    const innerRect = innerDiv.getBoundingClientRect();
    return { x: ((e.clientX - innerRect.left) / innerRect.width) * 100, y: ((e.clientY - innerRect.top) / innerRect.height) * 100 };
  };

  const handleClick = (e) => {
    if (heatPanning) return;
    const pos = getMousePercent(e);
    if (!pos) return;
    for (const zone of (densityStats?.zonesDensity || [])) {
      if (zone.polygon_points && isPointInPolygon(pos, zone.polygon_points)) {
        onZoneClick(zone.id);
        return;
      }
    }
    onZoneClick(null);
  };

  return (
    <div className="relative h-full" style={{ minHeight: "500px" }}>
      {/* Zoom controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 border rounded-lg p-1 bg-white/90 backdrop-blur shadow-sm">
        <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="heat-zoom-out" onClick={() => zoomHeat(0.8)}><ZoomOut className="w-4 h-4" /></Button>
        <span className="text-xs w-10 text-center font-mono">{Math.round(heatZoom * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="heat-zoom-in" onClick={() => zoomHeat(1.25)}><ZoomIn className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="heat-zoom-reset" onClick={() => { heatZoomRef.current = 1; setHeatZoom(1); setHeatPan({ x: 0, y: 0 }); }}><Maximize2 className="w-4 h-4" /></Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-sm">
        {[
          { color: "#16a34a", label: isAr ? "آمن" : "Safe" },
          { color: "#f59e0b", label: isAr ? "متوسط" : "Medium" },
          { color: "#ea580c", label: isAr ? "مرتفع" : "High" },
          { color: "#dc2626", label: isAr ? "حرج" : "Critical" },
        ].map(l => (
          <div key={l.color} className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm" style={{ backgroundColor: l.color }} /><span className="text-[9px]">{l.label}</span></div>
        ))}
        <span className="text-[9px] text-muted-foreground mr-auto">{isAr ? "انقر على منطقة للتعديل" : "Click zone to edit"}</span>
      </div>

      {/* Heatmap */}
      <div ref={heatWheelRef} className="relative bg-slate-50 overflow-hidden h-full" style={{ cursor: heatPanning ? "grabbing" : "grab" }} data-testid="density-heatmap-container"
        onMouseDown={(e) => { if (e.button !== 0) return; e.preventDefault(); setHeatPanning(true); setHeatPanStart({ x: e.clientX - heatPan.x, y: e.clientY - heatPan.y }); }}
        onMouseMove={(e) => {
          if (heatPanning) { setHeatPan({ x: e.clientX - heatPanStart.x, y: e.clientY - heatPanStart.y }); return; }
          const c = heatContainerRef.current; if (!c) return;
          const rect = c.getBoundingClientRect();
          setHeatTooltipPos({ x: e.clientX - rect.left + 16, y: e.clientY - rect.top - 10 });
          const pos = getMousePercent(e);
          if (!pos) return;
          let found = null;
          for (const zone of (densityStats?.zonesDensity || [])) { if (zone.polygon_points && isPointInPolygon(pos, zone.polygon_points)) { found = zone; break; } }
          setHeatHovered(found);
        }}
        onMouseUp={() => setHeatPanning(false)}
        onMouseLeave={() => { setHeatPanning(false); setHeatHovered(null); }}
        onClick={handleClick}
      >
        <div style={{ transform: `translate(${heatPan.x}px, ${heatPan.y}px) scale(${heatZoom})`, transformOrigin: "0 0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {(() => {
            let ws = { position: "relative", width: "100%", height: "100%" };
            if (imgRatio) {
              const ch = 600;
              const cw = heatContainerRef.current?.clientWidth || 800;
              if (cw / ch > imgRatio) ws = { position: "relative", height: "100%", width: ch * imgRatio };
              else ws = { position: "relative", width: "100%", height: cw / imgRatio };
            }
            return (
              <div style={ws} data-heat-inner="true">
                <img src={selectedFloor.image_url} alt="" style={{ width: "100%", height: "100%", display: "block", imageRendering: "high-quality" }} draggable={false} className="pointer-events-none select-none" />
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 100 100" preserveAspectRatio="none" data-testid="density-heatmap-svg">
                  {(densityStats?.zonesDensity || []).map(zone => {
                    const di = zone.densityInfo;
                    const isHovered = heatHovered?.id === zone.id;
                    const isSelected = zone.id === selectedZoneId;
                    const hasDensity = zone.fillPct > 0;
                    const pts = zone.polygon_points || [];
                    const minY = pts.length > 0 ? Math.min(...pts.map(p => p.y)) : 0;
                    const maxY = pts.length > 0 ? Math.max(...pts.map(p => p.y)) : 0;
                    const minX = pts.length > 0 ? Math.min(...pts.map(p => p.x)) : 0;
                    const maxX = pts.length > 0 ? Math.max(...pts.map(p => p.x)) : 0;
                    const totalRows = zone.totalRows || 0;
                    const filledRows = zone.filledRows || 0;
                    const rowHeight = totalRows > 0 ? (maxY - minY) / totalRows : 0;
                    const gap = rowHeight * 0.15;
                    // Fill color based on density level
                    const zoneFill = isSelected ? "#dbeafe"
                      : isHovered ? (hasDensity ? di.color : "#f1f5f9")
                      : hasDensity ? di.color : "#f8fafc";
                    const zoneFillOpacity = isSelected ? 0.6
                      : isHovered ? (hasDensity ? 0.35 : 0.5)
                      : hasDensity ? Math.min(0.15 + (zone.fillPct / 100) * 0.35, 0.5) : 0.15;
                    return (
                      <g key={zone.id} style={{ pointerEvents: "all", cursor: "pointer" }}>
                        <defs><clipPath id={`clip-d-${zone.id}`}><path d={getPath(pts)} /></clipPath></defs>
                        <path d={getPath(pts)}
                          fill={zoneFill}
                          fillOpacity={zoneFillOpacity}
                          stroke={isSelected ? "#3b82f6" : isHovered ? "#1e293b" : hasDensity ? di.color : "#94a3b8"}
                          strokeWidth={isSelected ? 1.2 : isHovered ? 1 : hasDensity ? 0.5 : 0.3}
                          strokeOpacity={isSelected || isHovered ? 1 : hasDensity ? 0.7 : 0.4}
                          vectorEffect="non-scaling-stroke"
                        />
                        {totalRows > 0 && Array.from({ length: totalRows }, (_, r) => {
                          const y = minY + r * rowHeight + rowHeight * 0.5;
                          const isFilled = r < filledRows;
                          return <line key={r} x1={minX} y1={y} x2={maxX} y2={y} stroke={isFilled ? di.color : "#cbd5e1"} strokeWidth={isFilled ? Math.max(rowHeight - gap, 0.08) : Math.max((rowHeight - gap) * 0.3, 0.04)} strokeOpacity={isFilled ? 0.7 : 0.3} strokeDasharray={isFilled ? "none" : `${rowHeight * 0.5} ${rowHeight * 0.4}`} clipPath={`url(#clip-d-${zone.id})`} />;
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
      </div>
    </div>
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
        {zone.totalRows > 0 && (<><div className="border-t border-dashed border-slate-200 my-1" /><div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "الصفوف" : "Rows"}</span><span className="font-mono font-bold">{zone.filledRows} / {zone.totalRows}</span></div></>)}
      </div>
      <div className="mt-1.5"><span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold" style={{ backgroundColor: di.bg, color: di.color }}>{isAr ? di.label_ar : di.label_en}</span></div>
    </div>
  );
}
