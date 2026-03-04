import { useState, useMemo } from "react";
import {
  Hand, MousePointer,
  ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, X, Check, ChevronDown,
  Palette, MapPin, Search, Shapes,
  Edit2, CircleOff, RotateCcw, ChevronRight, PenTool, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/context/LanguageContext";
import { CHANGE_LABELS, SHAPE_LIBRARY, DRAG_SHAPE_MODES, PATTERN_TYPES } from "../constants";
import { PatternPreviewSvg } from "./ZonePatterns";

export function ZoomControls({ zoom, zoomRef, setZoom, setPanOffset, containerRef }) {
  const zoomBy = (factor) => {
    const c = containerRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const cx = r.width / 2, cy = r.height / 2;
    const p = zoomRef.current;
    const nz = Math.max(0.3, Math.min(20, p * factor));
    const s = nz / p;
    zoomRef.current = nz;
    setZoom(nz);
    setPanOffset(o => ({ x: cx - s * (cx - o.x), y: cy - s * (cy - o.y) }));
  };
  const resetZoom = () => { zoomRef.current = 1; setZoom(1); setPanOffset({ x: 0, y: 0 }); };

  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-white">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomBy(0.8)} data-testid="zoom-out-btn"><ZoomOut className="w-4 h-4" /></Button>
      <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomBy(1.25)} data-testid="zoom-in-btn"><ZoomIn className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetZoom} data-testid="zoom-reset-btn"><Maximize2 className="w-4 h-4" /></Button>
    </div>
  );
}

function ZonesDropdown({
  activeZones, removedZones, selectedZoneId, setSelectedZoneId,
  setSelectedZone, setShowZoneDialog, handleToggleRemove,
  activeSession, ZONE_TYPES,
}) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [showRemoved, setShowRemoved] = useState(false);

  const filteredZones = useMemo(() => {
    let zones = activeZones;
    if (categoryFilter) zones = zones.filter(z => z.zone_type === categoryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      zones = zones.filter(z => z.zone_code?.toLowerCase().includes(q) || z.name_ar?.toLowerCase().includes(q) || z.name_en?.toLowerCase().includes(q));
    }
    return zones;
  }, [activeZones, categoryFilter, search]);

  const usedCategories = useMemo(() => {
    const cats = {};
    activeZones.forEach(z => { cats[z.zone_type] = (cats[z.zone_type] || 0) + 1; });
    return ZONE_TYPES.filter(t => cats[t.value] > 0).map(t => ({ ...t, count: cats[t.value] }));
  }, [activeZones, ZONE_TYPES]);

  const hasFilter = categoryFilter || search.trim();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={hasFilter ? "default" : "ghost"} size="sm"
          className={`rounded-none border-x gap-1 ${hasFilter ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
          data-testid="zones-dropdown-btn">
          <MapPin className="w-4 h-4" />
          <span className="text-xs hidden lg:inline">{isAr ? "المناطق" : "Zones"}</span>
          <Badge variant={hasFilter ? "outline" : "secondary"} className={`text-[9px] px-1.5 ${hasFilter ? "border-white/40 text-white" : ""}`}>
            {hasFilter ? filteredZones.length : activeZones.length}
            {removedZones.length > 0 && !hasFilter && <span className="text-red-400">/{removedZones.length}</span>}
          </Badge>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="bottom" data-testid="zones-dropdown-panel">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input placeholder={isAr ? "ابحث بالرمز أو الاسم..." : "Search code or name..."} value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs pr-8 font-cairo" data-testid="zones-search-input" />
          </div>
        </div>
        {usedCategories.length > 1 && (
          <div className="px-2 py-1.5 border-b flex flex-wrap gap-1" data-testid="zones-category-filter">
            <button onClick={() => setCategoryFilter(null)} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${!categoryFilter ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`} data-testid="filter-all">{isAr ? "الكل" : "All"} {activeZones.length}</button>
            {usedCategories.map(cat => (
              <button key={cat.value} onClick={() => setCategoryFilter(categoryFilter === cat.value ? null : cat.value)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all flex items-center gap-1 ${categoryFilter === cat.value ? "text-white" : "text-slate-600 hover:opacity-80"}`}
                style={categoryFilter === cat.value ? { backgroundColor: cat.color } : { backgroundColor: cat.color + "18", color: cat.color }}
                data-testid={`filter-${cat.value}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />{cat.count}
              </button>
            ))}
          </div>
        )}
        <div className="max-h-[320px] overflow-y-auto overscroll-contain" data-testid="zones-list">
          {filteredZones.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground"><MapPin className="w-5 h-5 mx-auto mb-1.5 opacity-30" />{isAr ? "لا توجد نتائج" : "No results"}</div>
          ) : filteredZones.map(zone => {
            const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
            const cl = CHANGE_LABELS[zone.change_type] || CHANGE_LABELS.unchanged;
            const ch = zone.change_type && zone.change_type !== "unchanged";
            const isSelected = zone.id === selectedZoneId;
            return (
              <div key={zone.id} data-testid={`zone-item-${zone.id}`} onClick={() => setSelectedZoneId(isSelected ? null : zone.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition-all border-b border-slate-50 group ${isSelected ? "bg-blue-50 border-r-2 border-r-blue-500" : "hover:bg-slate-50"}`}>
                <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 shadow-sm" style={{ backgroundColor: zone.fill_color }}>{ti?.icon || "?"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1"><span className="font-bold text-[11px] truncate">{zone.zone_code}</span>{ch && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cl.color }} />}</div>
                  <p className="text-[9px] text-muted-foreground truncate leading-tight">{isAr ? zone.name_ar : zone.name_en}</p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {activeSession?.status === "draft" && (
                    <>
                      <button className="p-1 rounded hover:bg-blue-100 transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedZone(zone); setShowZoneDialog(true); }} data-testid={`zone-edit-${zone.id}`}><Edit2 className="w-3 h-3 text-blue-500" /></button>
                      <button className="p-1 rounded hover:bg-red-100 transition-colors" onClick={(e) => { e.stopPropagation(); handleToggleRemove(zone.id, false); }} data-testid={`zone-remove-${zone.id}`}><CircleOff className="w-3 h-3 text-red-400" /></button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {removedZones.length > 0 && (
          <div className="border-t" data-testid="removed-zones-dropdown">
            <button onClick={() => setShowRemoved(prev => !prev)} className="flex items-center gap-2 w-full px-2.5 py-2 text-xs font-cairo font-semibold text-red-400 hover:text-red-600 hover:bg-red-50/50 transition-colors" data-testid="toggle-removed-dropdown">
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showRemoved ? "rotate-90" : ""}`} /><CircleOff className="w-3.5 h-3.5" />{isAr ? "المناطق المزالة" : "Removed"}<Badge variant="destructive" className="text-[9px] px-1.5 mr-auto">{removedZones.length}</Badge>
            </button>
            {showRemoved && (
              <div className="max-h-[160px] overflow-y-auto border-t border-red-100">
                {removedZones.map(zone => (
                  <div key={zone.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-red-50/30 border-b border-red-50" data-testid={`removed-item-${zone.id}`}>
                    <div className="w-5 h-5 rounded flex items-center justify-center bg-red-100 text-red-400 text-[8px] flex-shrink-0"><X className="w-3 h-3" /></div>
                    <div className="flex-1 min-w-0"><span className="text-[11px] font-semibold line-through text-red-400">{zone.zone_code}</span><p className="text-[9px] text-red-300 truncate">{isAr ? zone.name_ar : zone.name_en}</p></div>
                    {activeSession?.status === "draft" && <button className="p-1 rounded hover:bg-emerald-100 transition-colors" onClick={() => handleToggleRemove(zone.id, true)} data-testid={`restore-item-${zone.id}`}><RotateCcw className="w-3 h-3 text-emerald-500" /></button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="px-2.5 py-1.5 border-t bg-slate-50/80 flex items-center justify-between text-[9px] text-muted-foreground">
          <span>{isAr ? `${activeZones.length} نشطة` : `${activeZones.length} active`}{removedZones.length > 0 && ` · ${removedZones.length} ${isAr ? "مزالة" : "removed"}`}</span>
          {hasFilter && <button onClick={() => { setSearch(""); setCategoryFilter(null); }} className="text-blue-500 hover:text-blue-700 font-semibold" data-testid="clear-filters">{isAr ? "مسح الفلاتر" : "Clear filters"}</button>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MapToolbar({
  activeSession, mapMode, setMapMode, drawingPoints, setDrawingPoints,
  selectedZoneId, setSelectedZoneId, setRectStart, setFreehandPoints,
  sessionZones, zoom, zoomRef, setZoom, setPanOffset, mapContainerRef,
  handleUpdateZoneStyle, setShowNewZoneDialog,
  activeZones, removedZones, setSelectedZone, setShowZoneDialog,
  handleToggleRemove, ZONE_TYPES,
  undoDrawing, redoDrawing, clearDrawing, undoStack, redoStack,
  undoMapAction, redoMapAction, mapUndoStack, mapRedoStack,
}) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const resetDrawingState = () => { setDrawingPoints([]); setSelectedZoneId(null); setRectStart(null); setFreehandPoints([]); };

  if (activeSession?.status !== "draft") {
    return (
      <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-lg">
        <ZonesDropdown activeZones={activeZones} removedZones={removedZones} selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId} setSelectedZone={setSelectedZone} setShowZoneDialog={setShowZoneDialog} handleToggleRemove={handleToggleRemove} activeSession={activeSession} ZONE_TYPES={ZONE_TYPES} />
        <ZoomControls zoom={zoom} zoomRef={zoomRef} setZoom={setZoom} setPanOffset={setPanOffset} containerRef={mapContainerRef} />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center flex-wrap gap-3 bg-slate-50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            {/* Pan */}
            <Button variant={mapMode === "pan" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => { setMapMode("pan"); resetDrawingState(); }} data-testid="mode-pan-btn" title={isAr ? "تحريك" : "Pan"}>
              <Hand className="w-4 h-4 ml-1" /><span className="text-xs hidden lg:inline">{isAr ? "تحريك" : "Pan"}</span>
            </Button>
            {/* Edit */}
            <Button variant={mapMode === "edit" ? "default" : "ghost"} size="sm" className="rounded-none border-x" onClick={() => { setMapMode("edit"); setDrawingPoints([]); setRectStart(null); setFreehandPoints([]); }} data-testid="mode-edit-btn" title={isAr ? "تعديل" : "Edit"}>
              <MousePointer className="w-4 h-4 ml-1" /><span className="text-xs hidden lg:inline">{isAr ? "تعديل" : "Edit"}</span>
            </Button>
            {/* Shapes */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={DRAG_SHAPE_MODES.includes(mapMode) || mapMode === "draw" || mapMode === "freehand" ? "default" : "ghost"} size="sm" className="rounded-none border-l" data-testid="shapes-dropdown-btn">
                  <Shapes className="w-4 h-4 ml-1" /><span className="text-xs hidden lg:inline">{isAr ? "أشكال" : "Shapes"}</span><ChevronDown className="w-3 h-3 mr-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start" data-testid="shapes-panel">
                <div className="p-2 border-b"><p className="text-[11px] font-cairo font-semibold text-muted-foreground px-1">{isAr ? "أشكال أساسية" : "Basic Shapes"}</p></div>
                <div className="grid grid-cols-5 gap-1 p-2">
                  {SHAPE_LIBRARY.map(shape => (
                    <button key={shape.mode} onClick={() => { setMapMode(shape.mode); resetDrawingState(); }} data-testid={`shape-opt-${shape.mode}`}
                      className={`flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all ${mapMode === shape.mode ? "bg-emerald-100 ring-2 ring-emerald-400 shadow-sm" : "hover:bg-slate-100"}`}
                      title={isAr ? shape.label_ar : shape.label_en}>
                      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                        <path d={shape.path} fill={mapMode === shape.mode ? "#059669" : "#94a3b8"} fillOpacity={0.15} stroke={mapMode === shape.mode ? "#059669" : "#64748b"} strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                      <span className="text-[8px] font-medium text-muted-foreground leading-none truncate w-full text-center">{isAr ? shape.label_ar : shape.label_en}</span>
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t">
                  <p className="text-[11px] font-cairo font-semibold text-muted-foreground px-1 mb-1.5">{isAr ? "رسم حر" : "Freehand"}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => { setMapMode("draw"); resetDrawingState(); }} data-testid="shape-opt-draw"
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${mapMode === "draw" ? "bg-blue-100 ring-2 ring-blue-400 text-blue-700 font-semibold" : "hover:bg-slate-100 text-slate-600"}`}>
                      <Pencil className="w-4 h-4" />{isAr ? "نقطة بنقطة" : "Point"}
                    </button>
                    <button onClick={() => { setMapMode("freehand"); resetDrawingState(); }} data-testid="shape-opt-freehand"
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${mapMode === "freehand" ? "bg-pink-100 ring-2 ring-pink-400 text-pink-700 font-semibold" : "hover:bg-slate-100 text-slate-600"}`}>
                      <PenTool className="w-4 h-4" />{isAr ? "رسم حر" : "Freehand"}
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {/* Style Dropdown - Enhanced Format Panel */}
            {selectedZoneId && (() => {
              const styleZone = sessionZones.find(z => z.id === selectedZoneId);
              if (!styleZone) return null;
              const fillType = styleZone.fill_type || "solid";
              const patternType = styleZone.pattern_type || "diagonal-right";
              const patternFg = styleZone.pattern_fg_color || "#000000";
              const patternBg = styleZone.pattern_bg_color || "#ffffff";
              return (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="rounded-none border-x" data-testid="style-dropdown-btn">
                      <Palette className="w-4 h-4 ml-1" /><span className="text-xs hidden lg:inline">{isAr ? "تنسيق" : "Style"}</span><ChevronDown className="w-3 h-3 mr-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0 max-h-[520px] overflow-y-auto" align="start" data-testid="style-panel">
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-white border-b px-3 py-2 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-cairo font-bold text-sm">{isAr ? "تنسيق الشكل" : "Format Shape"}</h4>
                    </div>

                    {/* Fill Section */}
                    <div className="px-3 pt-3 pb-2">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <div className="w-1 h-4 rounded-full bg-emerald-500" />
                        <span className="text-[11px] font-bold font-cairo text-slate-700">{isAr ? "التعبئة" : "Fill"}</span>
                      </div>

                      {/* Fill Type Toggle */}
                      <div className="flex rounded-lg border overflow-hidden mb-3" data-testid="fill-type-toggle">
                        {[
                          { value: "solid", label: isAr ? "لون صلب" : "Solid" },
                          { value: "pattern", label: isAr ? "نقش" : "Pattern" },
                        ].map(ft => (
                          <button key={ft.value}
                            onClick={() => handleUpdateZoneStyle(styleZone.id, { fill_type: ft.value })}
                            className={`flex-1 px-3 py-1.5 text-[11px] font-semibold font-cairo transition-all ${
                              fillType === ft.value
                                ? "bg-emerald-600 text-white shadow-inner"
                                : "bg-white text-slate-500 hover:bg-slate-50"
                            }`}
                            data-testid={`fill-type-${ft.value}`}
                          >{ft.label}</button>
                        ))}
                      </div>

                      {/* Solid Fill Options */}
                      {fillType === "solid" && (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-3">
                            <div>
                              <Label className="text-[10px] text-slate-500">{isAr ? "اللون" : "Color"}</Label>
                              <div className="flex items-center gap-1.5 mt-1">
                                <input type="color" value={styleZone.fill_color || "#22c55e"} onChange={(e) => handleUpdateZoneStyle(styleZone.id, { fill_color: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5" data-testid="toolbar-fill-color" />
                                <span className="text-[10px] text-muted-foreground font-mono">{styleZone.fill_color}</span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <Label className="text-[10px] text-slate-500">{isAr ? "الشفافية" : "Opacity"}</Label>
                              <div className="flex items-center gap-1.5 mt-2">
                                <Slider value={[Math.round((styleZone.opacity ?? 0.4) * 100)]} min={5} max={100} step={5} onValueChange={([v]) => handleUpdateZoneStyle(styleZone.id, { opacity: v / 100 })} className="flex-1" data-testid="fill-opacity-slider" />
                                <span className="text-[10px] w-8 text-center font-mono text-slate-500">{Math.round((styleZone.opacity ?? 0.4) * 100)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pattern Fill Options */}
                      {fillType === "pattern" && (
                        <div className="space-y-2.5">
                          {/* Pattern Grid */}
                          <div>
                            <Label className="text-[10px] text-slate-500 mb-1 block">{isAr ? "نمط النقش" : "Pattern"}</Label>
                            <div className="grid grid-cols-6 gap-1 p-1.5 bg-slate-50 rounded-lg border" data-testid="pattern-grid">
                              {PATTERN_TYPES.map(pt => (
                                <PatternPreviewSvg
                                  key={pt.value}
                                  patternType={pt.value}
                                  fgColor={patternFg}
                                  bgColor={patternBg}
                                  size={32}
                                  selected={patternType === pt.value}
                                  onClick={() => handleUpdateZoneStyle(styleZone.id, { pattern_type: pt.value })}
                                  label={isAr ? pt.label_ar : pt.label_en}
                                />
                              ))}
                            </div>
                          </div>
                          {/* Pattern Colors */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-[10px] text-slate-500">{isAr ? "لون النقش" : "Foreground"}</Label>
                              <div className="flex items-center gap-1.5 mt-1">
                                <input type="color" value={patternFg} onChange={(e) => handleUpdateZoneStyle(styleZone.id, { pattern_fg_color: e.target.value })} className="w-7 h-7 rounded-lg cursor-pointer border border-slate-200 p-0.5" data-testid="pattern-fg-color" />
                                <span className="text-[9px] text-muted-foreground font-mono">{patternFg}</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-[10px] text-slate-500">{isAr ? "لون الخلفية" : "Background"}</Label>
                              <div className="flex items-center gap-1.5 mt-1">
                                <input type="color" value={patternBg} onChange={(e) => handleUpdateZoneStyle(styleZone.id, { pattern_bg_color: e.target.value })} className="w-7 h-7 rounded-lg cursor-pointer border border-slate-200 p-0.5" data-testid="pattern-bg-color" />
                                <span className="text-[9px] text-muted-foreground font-mono">{patternBg}</span>
                              </div>
                            </div>
                          </div>
                          {/* Pattern opacity */}
                          <div>
                            <Label className="text-[10px] text-slate-500">{isAr ? "الشفافية" : "Opacity"}</Label>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Slider value={[Math.round((styleZone.opacity ?? 0.4) * 100)]} min={5} max={100} step={5} onValueChange={([v]) => handleUpdateZoneStyle(styleZone.id, { opacity: v / 100 })} className="flex-1" data-testid="pattern-opacity-slider" />
                              <span className="text-[10px] w-8 text-center font-mono text-slate-500">{Math.round((styleZone.opacity ?? 0.4) * 100)}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-dashed mx-3" />

                    {/* Border Section */}
                    <div className="px-3 pt-2 pb-2">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <div className="w-1 h-4 rounded-full bg-blue-500" />
                        <span className="text-[11px] font-bold font-cairo text-slate-700">{isAr ? "الحدود" : "Border"}</span>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <div>
                            <Label className="text-[10px] text-slate-500">{isAr ? "اللون" : "Color"}</Label>
                            <div className="flex items-center gap-1.5 mt-1">
                              <input type="color" value={styleZone.stroke_color || "#000000"} onChange={(e) => handleUpdateZoneStyle(styleZone.id, { stroke_color: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5" data-testid="toolbar-stroke-color" />
                              <span className="text-[10px] text-muted-foreground font-mono">{styleZone.stroke_color || "#000"}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <Label className="text-[10px] text-slate-500">{isAr ? "السمك" : "Width"}</Label>
                            <div className="flex items-center gap-1.5 mt-2">
                              <Slider value={[styleZone.stroke_width ?? 0.3]} min={0.1} max={3} step={0.1} onValueChange={([v]) => handleUpdateZoneStyle(styleZone.id, { stroke_width: v })} className="flex-1" data-testid="stroke-width-slider" />
                              <span className="text-[10px] w-7 text-center font-mono text-slate-500">{(styleZone.stroke_width ?? 0.3).toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        {/* Stroke Opacity */}
                        <div>
                          <Label className="text-[10px] text-slate-500">{isAr ? "شفافية الحدود" : "Border Opacity"}</Label>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Slider value={[Math.round((styleZone.stroke_opacity ?? 1) * 100)]} min={0} max={100} step={5} onValueChange={([v]) => handleUpdateZoneStyle(styleZone.id, { stroke_opacity: v / 100 })} className="flex-1" data-testid="stroke-opacity-slider" />
                            <span className="text-[10px] w-8 text-center font-mono text-slate-500">{Math.round((styleZone.stroke_opacity ?? 1) * 100)}%</span>
                          </div>
                        </div>
                        {/* Border Style */}
                        <div>
                          <Label className="text-[10px] text-slate-500">{isAr ? "نوع الحدود" : "Border Style"}</Label>
                          <div className="flex items-center gap-1 mt-1.5" data-testid="stroke-style-options">
                            {[
                              { value: "solid", label: isAr ? "متصل" : "Solid", dash: "none" },
                              { value: "dashed", label: isAr ? "مقطع" : "Dashed", dash: "4 2" },
                              { value: "dotted", label: isAr ? "نقطي" : "Dotted", dash: "1 1.5" },
                              { value: "dash-dot", label: isAr ? "شرطة-نقطة" : "Dash-Dot", dash: "6 2 1 2" },
                            ].map(s => (
                              <button key={s.value}
                                onClick={() => handleUpdateZoneStyle(styleZone.id, { stroke_style: s.value })}
                                className={`flex-1 flex flex-col items-center gap-1 p-1.5 rounded-lg border text-[9px] transition-all ${
                                  (styleZone.stroke_style || "dashed") === s.value
                                    ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                                    : "border-slate-200 hover:bg-slate-50 text-slate-500"
                                }`}
                                data-testid={`stroke-style-${s.value}`}
                              >
                                <svg width="28" height="4" viewBox="0 0 28 4">
                                  <line x1="1" y1="2" x2="27" y2="2" stroke={styleZone.stroke_color || "#000"} strokeWidth="2" strokeDasharray={s.dash} />
                                </svg>
                                <span>{s.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-dashed mx-3" />

                    {/* Live Preview */}
                    <div className="px-3 pt-2 pb-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-1 h-4 rounded-full bg-violet-500" />
                        <span className="text-[11px] font-bold font-cairo text-slate-700">{isAr ? "معاينة" : "Preview"}</span>
                      </div>
                      <div className="flex items-center justify-center p-3 bg-slate-50 rounded-lg border" data-testid="style-preview">
                        <svg width="120" height="60" viewBox="0 0 120 60">
                          {fillType === "pattern" && (
                            <defs>
                              <pattern id="preview-current-pattern" patternUnits="userSpaceOnUse" width="10" height="10">
                                <rect width="10" height="10" fill={patternBg} />
                                {(() => {
                                  const s = 10, h = 5, sw = s * 0.08;
                                  switch(patternType) {
                                    case "diagonal-right": return <><line x1="0" y1={s} x2={s} y2="0" stroke={patternFg} strokeWidth={sw} /><line x1={-h} y1={h} x2={h} y2={-h} stroke={patternFg} strokeWidth={sw} /><line x1={h} y1={s+h} x2={s+h} y2={h} stroke={patternFg} strokeWidth={sw} /></>;
                                    case "diagonal-left": return <><line x1="0" y1="0" x2={s} y2={s} stroke={patternFg} strokeWidth={sw} /><line x1={-h} y1={h} x2={h} y2={s+h} stroke={patternFg} strokeWidth={sw} /><line x1={h} y1={-h} x2={s+h} y2={h} stroke={patternFg} strokeWidth={sw} /></>;
                                    case "diagonal-cross": return <><line x1="0" y1={s} x2={s} y2="0" stroke={patternFg} strokeWidth={sw*0.7} /><line x1="0" y1="0" x2={s} y2={s} stroke={patternFg} strokeWidth={sw*0.7} /></>;
                                    case "horizontal": return <line x1="0" y1={h} x2={s} y2={h} stroke={patternFg} strokeWidth={sw} />;
                                    case "vertical": return <line x1={h} y1="0" x2={h} y2={s} stroke={patternFg} strokeWidth={sw} />;
                                    case "grid": return <><line x1={h} y1="0" x2={h} y2={s} stroke={patternFg} strokeWidth={sw*0.7} /><line x1="0" y1={h} x2={s} y2={h} stroke={patternFg} strokeWidth={sw*0.7} /></>;
                                    case "dots-small": return <circle cx={h} cy={h} r={s*0.1} fill={patternFg} />;
                                    case "dots-large": return <circle cx={h} cy={h} r={s*0.2} fill={patternFg} />;
                                    case "dense": return <><line x1="0" y1={s*0.25} x2={s} y2={s*0.25} stroke={patternFg} strokeWidth={sw} /><line x1="0" y1={s*0.5} x2={s} y2={s*0.5} stroke={patternFg} strokeWidth={sw} /><line x1="0" y1={s*0.75} x2={s} y2={s*0.75} stroke={patternFg} strokeWidth={sw} /><line x1={s*0.25} y1="0" x2={s*0.25} y2={s} stroke={patternFg} strokeWidth={sw*0.5} /><line x1={s*0.75} y1="0" x2={s*0.75} y2={s} stroke={patternFg} strokeWidth={sw*0.5} /></>;
                                    case "light-fill": return <><circle cx={s*0.25} cy={s*0.25} r={s*0.04} fill={patternFg} /><circle cx={s*0.75} cy={s*0.75} r={s*0.04} fill={patternFg} /></>;
                                    case "medium-fill": return <><circle cx={s*0.25} cy={s*0.25} r={s*0.06} fill={patternFg} /><circle cx={s*0.75} cy={s*0.75} r={s*0.06} fill={patternFg} /><circle cx={s*0.75} cy={s*0.25} r={s*0.04} fill={patternFg} /><circle cx={s*0.25} cy={s*0.75} r={s*0.04} fill={patternFg} /></>;
                                    case "diamonds": return <path d={`M${h} ${s*0.1} L${s*0.9} ${h} L${h} ${s*0.9} L${s*0.1} ${h} Z`} fill="none" stroke={patternFg} strokeWidth={sw*0.7} />;
                                    default: return null;
                                  }
                                })()}
                              </pattern>
                            </defs>
                          )}
                          <rect x="5" y="5" width="110" height="50" rx="4"
                            fill={fillType === "pattern" ? "url(#preview-current-pattern)" : styleZone.fill_color}
                            fillOpacity={styleZone.opacity ?? 0.4}
                            stroke={styleZone.stroke_color || "#000"}
                            strokeWidth={(styleZone.stroke_width ?? 0.3) * 3}
                            strokeOpacity={styleZone.stroke_opacity ?? 1}
                            strokeDasharray={
                              (styleZone.stroke_style || "dashed") === "solid" ? "none"
                              : (styleZone.stroke_style || "dashed") === "dotted" ? "2 3"
                              : (styleZone.stroke_style || "dashed") === "dash-dot" ? "8 3 2 3"
                              : "8 4"
                            }
                          />
                        </svg>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })()}
            {/* Zones */}
            <ZonesDropdown activeZones={activeZones} removedZones={removedZones} selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId} setSelectedZone={setSelectedZone} setShowZoneDialog={setShowZoneDialog} handleToggleRemove={handleToggleRemove} activeSession={activeSession} ZONE_TYPES={ZONE_TYPES} />
          </div>
          <ZoomControls zoom={zoom} zoomRef={zoomRef} setZoom={setZoom} setPanOffset={setPanOffset} containerRef={mapContainerRef} />
          {/* Global Undo/Redo */}
          <div className="flex items-center gap-0.5 border rounded-lg p-1 bg-white">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undoMapAction} disabled={mapUndoStack.length === 0} data-testid="map-undo-btn" title={`${isAr ? "تراجع" : "Undo"} (Ctrl+Z)`}>
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redoMapAction} disabled={mapRedoStack.length === 0} data-testid="map-redo-btn" title={`${isAr ? "إعادة" : "Redo"} (Ctrl+Y)`}>
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Draw mode: Undo/Redo/Clear/Save */}
        {mapMode === "draw" && drawingPoints.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={undoDrawing} disabled={undoStack.length === 0} data-testid="drawing-undo-btn"><Undo2 className="w-4 h-4 ml-1" />{isAr ? "تراجع" : "Undo"}</Button>
            <Button variant="outline" size="sm" onClick={redoDrawing} disabled={redoStack.length === 0} data-testid="drawing-redo-btn"><Redo2 className="w-4 h-4 ml-1" />{isAr ? "إعادة" : "Redo"}</Button>
            <Button variant="outline" size="sm" onClick={clearDrawing} data-testid="drawing-clear-btn"><X className="w-4 h-4 ml-1" />{isAr ? "مسح" : "Clear"}</Button>
            {drawingPoints.length >= 3 && <Button size="sm" onClick={() => setShowNewZoneDialog(true)} data-testid="drawing-save-btn"><Check className="w-4 h-4 ml-1" />{isAr ? "حفظ" : "Save"}</Button>}
          </div>
        )}
      </div>
      <MapInstructions mapMode={mapMode} drawingPointsCount={drawingPoints.length} />
    </>
  );
}

function MapInstructions({ mapMode, drawingPointsCount }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  if (mapMode === "pan") return null;
  const shapeNames = { rect: isAr ? "مستطيل" : "Rectangle", circle: isAr ? "دائرة" : "Circle", ellipse: isAr ? "بيضاوي" : "Ellipse", triangle: isAr ? "مثلث" : "Triangle", pentagon: isAr ? "خماسي" : "Pentagon", hexagon: isAr ? "سداسي" : "Hexagon", star: isAr ? "نجمة" : "Star", diamond: isAr ? "معين" : "Diamond", lshape: isAr ? "شكل L" : "L-Shape", ushape: isAr ? "شكل U" : "U-Shape" };
  if (DRAG_SHAPE_MODES.includes(mapMode)) {
    return (
      <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
        <p className="text-xs text-indigo-700"><Shapes className="w-3.5 h-3.5 inline ml-1" />{isAr ? `انقر واسحب لرسم ${shapeNames[mapMode] || "شكل"}. حرر الماوس لإنهاء الشكل.` : `Click and drag to draw ${shapeNames[mapMode] || "shape"}. Release to finish.`}</p>
      </div>
    );
  }
  const instructions = {
    draw: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", icon: Pencil, msg: isAr ? `انقر لإضافة نقاط. انقر على النقطة الأولى لإغلاق الشكل. (${drawingPointsCount} نقطة)` : `Click to add points. Click first point to close. (${drawingPointsCount})` },
    freehand: { bg: "bg-pink-50 border-pink-200", text: "text-pink-700", icon: PenTool, msg: isAr ? "انقر واسحب للرسم الحر. حرر الماوس لإنهاء الشكل." : "Click and drag to draw freehand. Release to finish." },
    edit: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: MousePointer, msg: isAr ? "انقر على منطقة لتحديدها. اسحب النقاط لتعديل الشكل. دبل كلك على نقطة لحذفها." : "Click zone to select. Drag points to edit. Double-click point to delete it." },
  };
  const info = instructions[mapMode];
  if (!info) return null;
  const Icon = info.icon;
  return (
    <div className={`p-2.5 ${info.bg} border rounded-lg`}>
      <p className={`text-xs ${info.text}`}><Icon className="w-3.5 h-3.5 inline ml-1" />{info.msg}</p>
    </div>
  );
}
