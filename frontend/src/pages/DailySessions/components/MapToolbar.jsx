import { useState, useMemo } from "react";
import {
  MousePointer,
  ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, X, Check, ChevronDown,
  MapPin, Search, Shapes,
  Edit2, CircleOff, RotateCcw, ChevronRight, PenTool, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  setShowNewZoneDialog,
  activeZones, removedZones, setSelectedZone, setShowZoneDialog,
  handleToggleRemove, ZONE_TYPES,
  undoDrawing, redoDrawing, clearDrawing, undoStack, redoStack,
  undoMapAction, redoMapAction, mapUndoStack, mapRedoStack,
  readOnly = false,
}) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const resetDrawingState = () => { setDrawingPoints([]); setSelectedZoneId(null); setRectStart(null); setFreehandPoints([]); };

  if (readOnly || activeSession?.status !== "draft") {
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
            {/* Edit/Smart mode */}
            <Button variant={mapMode === "edit" ? "default" : "ghost"} size="sm" className="rounded-none border-x" onClick={() => { setMapMode("edit"); setDrawingPoints([]); setRectStart(null); setFreehandPoints([]); }} data-testid="mode-edit-btn" title={isAr ? "تعديل" : "Edit"}>
              <MousePointer className="w-4 h-4 ml-1" /><span className="text-xs hidden lg:inline">{isAr ? "تعديل" : "Edit"}</span>
            </Button>
            {/* Shapes */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={DRAG_SHAPE_MODES.includes(mapMode) || mapMode === "draw" || mapMode === "freehand" ? "default" : "ghost"} size="sm" className="rounded-none border-l" data-testid="shapes-dropdown-btn">
                  <Shapes className="w-4 h-4 ml-1" /><span className="text-xs hidden lg:inline">{isAr ? "إضافة موقع" : "Add Zone"}</span><ChevronDown className="w-3 h-3 mr-1" />
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
            {/* Zones */}
            <ZonesDropdown activeZones={activeZones} removedZones={removedZones} selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId} setSelectedZone={setSelectedZone} setShowZoneDialog={setShowZoneDialog} handleToggleRemove={handleToggleRemove} activeSession={activeSession} ZONE_TYPES={ZONE_TYPES} />
          </div>
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
    edit: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: MousePointer, msg: isAr ? "انقر على منطقة لتحديدها. اسحب النقاط لتعديل الشكل. دبل كلك على نقطة لحذفها. اسحب الخلفية للتنقل." : "Click zone to select. Drag points to edit. Double-click point to delete. Drag background to pan." },
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
