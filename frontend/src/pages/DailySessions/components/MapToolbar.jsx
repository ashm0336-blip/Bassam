import { useState, useMemo } from "react";
import {
  Hand, Pencil, MousePointer, Square,
  ZoomIn, ZoomOut, Maximize2, Undo2, X, Check, ChevronDown,
  Sparkles, CopyPlus, Trash2, Palette, MapPin, Search,
  Edit2, CircleOff, RotateCcw, ChevronRight, PenTool, Shapes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/context/LanguageContext";
import { CHANGE_LABELS, SHAPE_LIBRARY, DRAG_SHAPE_MODES } from "../constants";

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
      zones = zones.filter(z =>
        z.zone_code?.toLowerCase().includes(q) ||
        z.name_ar?.toLowerCase().includes(q) ||
        z.name_en?.toLowerCase().includes(q)
      );
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
        <Button
          variant={hasFilter ? "default" : "ghost"}
          size="sm"
          className={`rounded-none border-x gap-1 ${hasFilter ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
          data-testid="zones-dropdown-btn"
        >
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
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={isAr ? "ابحث بالرمز أو الاسم..." : "Search code or name..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs pr-8 font-cairo"
              data-testid="zones-search-input"
            />
          </div>
        </div>

        {/* Category Filter */}
        {usedCategories.length > 1 && (
          <div className="px-2 py-1.5 border-b flex flex-wrap gap-1" data-testid="zones-category-filter">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${!categoryFilter ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
              data-testid="filter-all"
            >
              {isAr ? "الكل" : "All"} {activeZones.length}
            </button>
            {usedCategories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(categoryFilter === cat.value ? null : cat.value)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all flex items-center gap-1 ${categoryFilter === cat.value ? "text-white" : "text-slate-600 hover:opacity-80"}`}
                style={categoryFilter === cat.value ? { backgroundColor: cat.color } : { backgroundColor: cat.color + "18", color: cat.color }}
                data-testid={`filter-${cat.value}`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                {cat.count}
              </button>
            ))}
          </div>
        )}

        {/* Zone List */}
        <div className="max-h-[320px] overflow-y-auto overscroll-contain" data-testid="zones-list">
          {filteredZones.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              <MapPin className="w-5 h-5 mx-auto mb-1.5 opacity-30" />
              {isAr ? "لا توجد نتائج" : "No results"}
            </div>
          ) : (
            filteredZones.map(zone => {
              const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
              const cl = CHANGE_LABELS[zone.change_type] || CHANGE_LABELS.unchanged;
              const ch = zone.change_type && zone.change_type !== "unchanged";
              const isSelected = zone.id === selectedZoneId;
              return (
                <div
                  key={zone.id}
                  data-testid={`zone-item-${zone.id}`}
                  onClick={() => setSelectedZoneId(isSelected ? null : zone.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition-all border-b border-slate-50 group ${
                    isSelected
                      ? "bg-blue-50 border-r-2 border-r-blue-500"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: zone.fill_color }}
                  >
                    {ti?.icon || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[11px] truncate">{zone.zone_code}</span>
                      {ch && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cl.color }} />}
                    </div>
                    <p className="text-[9px] text-muted-foreground truncate leading-tight">{isAr ? zone.name_ar : zone.name_en}</p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activeSession?.status === "draft" && (
                      <>
                        <button
                          className="p-1 rounded hover:bg-blue-100 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setSelectedZone(zone); setShowZoneDialog(true); }}
                          data-testid={`zone-edit-${zone.id}`}
                          title={isAr ? "تعديل" : "Edit"}
                        >
                          <Edit2 className="w-3 h-3 text-blue-500" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-red-100 transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleToggleRemove(zone.id, false); }}
                          data-testid={`zone-remove-${zone.id}`}
                          title={isAr ? "إزالة" : "Remove"}
                        >
                          <CircleOff className="w-3 h-3 text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Removed Zones */}
        {removedZones.length > 0 && (
          <div className="border-t" data-testid="removed-zones-dropdown">
            <button
              onClick={() => setShowRemoved(prev => !prev)}
              className="flex items-center gap-2 w-full px-2.5 py-2 text-xs font-cairo font-semibold text-red-400 hover:text-red-600 hover:bg-red-50/50 transition-colors"
              data-testid="toggle-removed-dropdown"
            >
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showRemoved ? "rotate-90" : ""}`} />
              <CircleOff className="w-3.5 h-3.5" />
              {isAr ? "المناطق المزالة" : "Removed"}
              <Badge variant="destructive" className="text-[9px] px-1.5 mr-auto">{removedZones.length}</Badge>
            </button>
            {showRemoved && (
              <div className="max-h-[160px] overflow-y-auto border-t border-red-100">
                {removedZones.map(zone => {
                  const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                  return (
                    <div key={zone.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-red-50/30 border-b border-red-50" data-testid={`removed-item-${zone.id}`}>
                      <div className="w-5 h-5 rounded flex items-center justify-center bg-red-100 text-red-400 text-[8px] flex-shrink-0">
                        <X className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-semibold line-through text-red-400">{zone.zone_code}</span>
                        <p className="text-[9px] text-red-300 truncate">{isAr ? zone.name_ar : zone.name_en}</p>
                      </div>
                      {activeSession?.status === "draft" && (
                        <button
                          className="p-1 rounded hover:bg-emerald-100 transition-colors"
                          onClick={() => handleToggleRemove(zone.id, true)}
                          data-testid={`restore-item-${zone.id}`}
                          title={isAr ? "استعادة" : "Restore"}
                        >
                          <RotateCcw className="w-3 h-3 text-emerald-500" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-2.5 py-1.5 border-t bg-slate-50/80 flex items-center justify-between text-[9px] text-muted-foreground">
          <span>{isAr ? `${activeZones.length} نشطة` : `${activeZones.length} active`}{removedZones.length > 0 && ` · ${removedZones.length} ${isAr ? "مزالة" : "removed"}`}</span>
          {hasFilter && (
            <button onClick={() => { setSearch(""); setCategoryFilter(null); }} className="text-blue-500 hover:text-blue-700 font-semibold" data-testid="clear-filters">
              {isAr ? "مسح الفلاتر" : "Clear filters"}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MapToolbar({
  activeSession, mapMode, setMapMode, drawingPoints, setDrawingPoints,
  selectedZoneId, setSelectedZoneId, setRectStart, setFreehandPoints,
  sessionZones, zoom, zoomRef, setZoom, setPanOffset, mapContainerRef,
  handleSmoothZone, handleCopyZone, handleToggleRemove, handleUpdateZoneStyle,
  setShowNewZoneDialog,
  activeZones, removedZones, setSelectedZone, setShowZoneDialog, ZONE_TYPES,
}) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const resetDrawingState = () => { setDrawingPoints([]); setSelectedZoneId(null); setRectStart(null); setFreehandPoints([]); };

  if (activeSession?.status !== "draft") {
    return (
      <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-lg">
        <div className="flex items-center gap-2">
          <ZonesDropdown
            activeZones={activeZones} removedZones={removedZones}
            selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId}
            setSelectedZone={setSelectedZone} setShowZoneDialog={setShowZoneDialog}
            handleToggleRemove={handleToggleRemove} activeSession={activeSession} ZONE_TYPES={ZONE_TYPES}
          />
        </div>
        <ZoomControls zoom={zoom} zoomRef={zoomRef} setZoom={setZoom} setPanOffset={setPanOffset} containerRef={mapContainerRef} />
      </div>
    );
  }

  const styleZone = selectedZoneId ? sessionZones.find(z => z.id === selectedZoneId) : null;

  return (
    <>
      <div className="flex justify-between items-center flex-wrap gap-3 bg-slate-50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={mapMode === "pan" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => { setMapMode("pan"); resetDrawingState(); }} data-testid="mode-pan-btn" title={isAr ? "تحريك" : "Pan"}>
              <Hand className="w-4 h-4 ml-1" /><span className="text-xs hidden lg:inline">{isAr ? "تحريك" : "Pan"}</span>
            </Button>
            <Button variant={mapMode === "draw" ? "default" : "ghost"} size="sm" className="rounded-none border-x" onClick={() => { setMapMode("draw"); resetDrawingState(); }} data-testid="mode-draw-btn" title={isAr ? "رسم نقطة" : "Point Draw"}>
              <Pencil className="w-4 h-4 ml-1" /><span className="text-xs hidden lg:inline">{isAr ? "رسم نقطة" : "Draw"}</span>
            </Button>
            <Button variant={mapMode === "edit" ? "default" : "ghost"} size="sm" className="rounded-none border-l" onClick={() => { setMapMode("edit"); setDrawingPoints([]); setRectStart(null); setFreehandPoints([]); }} data-testid="mode-edit-btn" title={isAr ? "تعديل" : "Edit"}>
              <MousePointer className="w-4 h-4 ml-1" /><span className="text-xs hidden lg:inline">{isAr ? "تعديل" : "Edit"}</span>
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={["rect","circle","ellipse","freehand"].includes(mapMode) ? "default" : "ghost"} size="sm" className="rounded-none border-x" data-testid="shapes-dropdown-btn">
                  <Square className="w-4 h-4 ml-1" /><span className="text-xs hidden lg:inline">{isAr ? "أشكال" : "Shapes"}</span><ChevronDown className="w-3 h-3 mr-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="start">
                <div className="space-y-0.5">
                  {[
                    { mode: "rect", icon: Square, label: isAr ? "مستطيل" : "Rectangle" },
                    { mode: "circle", icon: Circle, label: isAr ? "دائرة" : "Circle" },
                    { mode: "ellipse", icon: Spline, label: isAr ? "بيضاوي" : "Ellipse" },
                    { mode: "freehand", icon: PenTool, label: isAr ? "رسم حر" : "Freehand" },
                  ].map(s => {
                    const Icon = s.icon;
                    return (
                      <button key={s.mode} onClick={() => { setMapMode(s.mode); resetDrawingState(); }} data-testid={`shape-opt-${s.mode}`}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${mapMode === s.mode ? "bg-emerald-50 text-emerald-700 font-semibold" : "hover:bg-slate-100"}`}>
                        <Icon className="w-4 h-4" />{s.label}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            {styleZone && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-none border-x" data-testid="style-dropdown-btn">
                    <Palette className="w-4 h-4 ml-1" /><span className="text-xs hidden lg:inline">{isAr ? "تنسيق" : "Style"}</span><ChevronDown className="w-3 h-3 mr-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <h4 className="font-cairo font-semibold text-sm flex items-center gap-2 mb-3"><Palette className="w-4 h-4" />{isAr ? "تنسيق الشكل" : "Shape Style"}</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px]">{isAr ? "لون التعبئة" : "Fill"}</Label>
                        <div className="flex items-center gap-1.5 mt-1">
                          <input type="color" value={styleZone.fill_color || "#22c55e"} onChange={(e) => handleUpdateZoneStyle(styleZone.id, { fill_color: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0" data-testid="toolbar-fill-color" />
                          <span className="text-[10px] text-muted-foreground font-mono">{styleZone.fill_color}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-[11px]">{isAr ? "شفافية" : "Opacity"}</Label>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Slider value={[Math.round((styleZone.opacity ?? 0.4) * 100)]} min={5} max={100} step={5} onValueChange={([v]) => handleUpdateZoneStyle(styleZone.id, { opacity: v / 100 })} className="flex-1" />
                          <span className="text-[10px] w-7 text-center font-mono">{Math.round((styleZone.opacity ?? 0.4) * 100)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px]">{isAr ? "لون الحدود" : "Stroke"}</Label>
                        <div className="flex items-center gap-1.5 mt-1">
                          <input type="color" value={styleZone.stroke_color || "#000000"} onChange={(e) => handleUpdateZoneStyle(styleZone.id, { stroke_color: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0" data-testid="toolbar-stroke-color" />
                          <span className="text-[10px] text-muted-foreground font-mono">{styleZone.stroke_color || "#000"}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-[11px]">{isAr ? "سُمك" : "Width"}</Label>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Slider value={[styleZone.stroke_width ?? 0.3]} min={0.1} max={2} step={0.1} onValueChange={([v]) => handleUpdateZoneStyle(styleZone.id, { stroke_width: v })} className="flex-1" />
                          <span className="text-[10px] w-7 text-center font-mono">{(styleZone.stroke_width ?? 0.3).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px]">{isAr ? "نوع الحدود" : "Stroke Style"}</Label>
                      <div className="flex items-center gap-1 mt-1.5">
                        {[
                          { value: "solid", label: isAr ? "متصل" : "Solid", preview: "none" },
                          { value: "dashed", label: isAr ? "مقطع" : "Dashed", preview: "4 2" },
                          { value: "dotted", label: isAr ? "نقطي" : "Dotted", preview: "1 1.5" },
                        ].map(s => (
                          <button key={s.value} onClick={() => handleUpdateZoneStyle(styleZone.id, { stroke_style: s.value })} className={`flex-1 flex flex-col items-center gap-0.5 p-1.5 rounded border text-[10px] transition-all ${(styleZone.stroke_style || "dashed") === s.value ? "border-emerald-500 bg-emerald-50" : "hover:bg-slate-50"}`}>
                            <svg width="28" height="4" viewBox="0 0 28 4"><line x1="1" y1="2" x2="27" y2="2" stroke={styleZone.stroke_color || "#000"} strokeWidth="2" strokeDasharray={s.preview} /></svg>
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-center p-2 bg-white rounded border">
                      <svg width="60" height="36" viewBox="0 0 60 36">
                        <rect x="3" y="3" width="54" height="30" rx="2" fill={styleZone.fill_color} fillOpacity={styleZone.opacity ?? 0.4} stroke={styleZone.stroke_color || "#000"} strokeWidth={(styleZone.stroke_width ?? 0.3) * 3} strokeOpacity={styleZone.stroke_opacity ?? 1} strokeDasharray={(styleZone.stroke_style || "dashed") === "solid" ? "none" : (styleZone.stroke_style || "dashed") === "dotted" ? "2 3" : "8 4"} />
                      </svg>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <ZonesDropdown
              activeZones={activeZones} removedZones={removedZones}
              selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId}
              setSelectedZone={setSelectedZone} setShowZoneDialog={setShowZoneDialog}
              handleToggleRemove={handleToggleRemove} activeSession={activeSession} ZONE_TYPES={ZONE_TYPES}
            />
          </div>
          <ZoomControls zoom={zoom} zoomRef={zoomRef} setZoom={setZoom} setPanOffset={setPanOffset} containerRef={mapContainerRef} />
        </div>
        <div className="flex gap-2">
          {mapMode === "draw" && drawingPoints.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => setDrawingPoints(p => p.slice(0, -1))} data-testid="drawing-undo-btn"><Undo2 className="w-4 h-4 ml-1" />{isAr ? "تراجع" : "Undo"}</Button>
              <Button variant="outline" size="sm" onClick={() => setDrawingPoints([])} data-testid="drawing-clear-btn"><X className="w-4 h-4 ml-1" />{isAr ? "مسح" : "Clear"}</Button>
              {drawingPoints.length >= 3 && <Button size="sm" onClick={() => setShowNewZoneDialog(true)} data-testid="drawing-save-btn"><Check className="w-4 h-4 ml-1" />{isAr ? "حفظ" : "Save"}</Button>}
            </>
          )}
          {mapMode === "edit" && selectedZoneId && (
            <>
              <Button variant="outline" size="sm" onClick={handleSmoothZone} data-testid="edit-smooth-zone-btn" title={isAr ? "تنعيم الزوايا" : "Smooth Corners"}>
                <Sparkles className="w-4 h-4 ml-1" />{isAr ? "تنعيم" : "Smooth"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyZone} data-testid="edit-copy-zone-btn" title={isAr ? "نسخ المنطقة" : "Copy Zone"}>
                <CopyPlus className="w-4 h-4 ml-1" />{isAr ? "نسخ" : "Copy"}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => { handleToggleRemove(selectedZoneId, false); setSelectedZoneId(null); setMapMode("pan"); }} data-testid="edit-delete-zone-btn">
                <Trash2 className="w-4 h-4 ml-1" />{isAr ? "إزالة" : "Remove"}
              </Button>
            </>
          )}
        </div>
      </div>
      <MapInstructions mapMode={mapMode} drawingPointsCount={drawingPoints.length} />
    </>
  );
}

function MapInstructions({ mapMode, drawingPointsCount }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const instructions = {
    draw: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", icon: Pencil, msg: isAr ? `انقر على الخريطة لإضافة نقاط. انقر على النقطة الأولى لإغلاق الشكل. (${drawingPointsCount} نقطة)` : `Click to add points. Click first point to close. (${drawingPointsCount})` },
    rect: { bg: "bg-indigo-50 border-indigo-200", text: "text-indigo-700", icon: Square, msg: isAr ? "انقر واسحب لرسم مستطيل. حرر الماوس لإنهاء الشكل." : "Click and drag to draw a rectangle. Release to finish." },
    circle: { bg: "bg-cyan-50 border-cyan-200", text: "text-cyan-700", icon: Circle, msg: isAr ? "انقر على مركز الدائرة واسحب لتحديد نصف القطر. حرر الماوس لإنهاء الشكل." : "Click center, drag to set radius. Release to finish." },
    ellipse: { bg: "bg-violet-50 border-violet-200", text: "text-violet-700", icon: Spline, msg: isAr ? "انقر واسحب لرسم شكل بيضاوي. حرر الماوس لإنهاء الشكل." : "Click and drag to draw an ellipse. Release to finish." },
    freehand: { bg: "bg-pink-50 border-pink-200", text: "text-pink-700", icon: PenTool, msg: isAr ? "انقر واسحب للرسم الحر. حرر الماوس لإنهاء الشكل. سيتم تبسيط الخط تلقائياً." : "Click and drag to draw freehand. Release to finish. Line will be auto-simplified." },
    edit: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: MousePointer, msg: isAr ? "انقر على منطقة لتحديدها. اسحب النقاط لتعديل الشكل. اسحب المقبض البنفسجي ↻ للدوران. اسحب المنطقة لنقلها." : "Click zone to select. Drag points to edit shape. Drag purple handle ↻ to rotate. Drag zone to move." },
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
