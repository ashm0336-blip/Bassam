import { useState } from "react";
import { Edit2, Copy, Sparkles, Palette, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { CHANGE_LABELS, DRAW_POINT_RADIUS, DRAG_SHAPE_MODES } from "../constants";
import { getPath, getDistance, isPointInPolygon, getRotationHandle, getDensityLevel, generateShapeFromDrag } from "../utils";

function FloatingToolbar({ zone, svgRef, mapContainerRef, isAr, onEdit, onCopy, onSmooth, onRemove }) {
  if (!zone?.polygon_points?.length || !svgRef.current || !mapContainerRef.current) return null;

  const pts = zone.polygon_points;
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const minY = Math.min(...pts.map(p => p.y));

  const ctm = svgRef.current.getScreenCTM();
  if (!ctm) return null;
  const containerRect = mapContainerRef.current.getBoundingClientRect();
  const screenX = cx * ctm.a + ctm.e;
  const screenY = minY * ctm.d + ctm.f;
  let posX = screenX - containerRect.left;
  let posY = screenY - containerRect.top - 52;

  // Keep within container bounds
  posX = Math.max(100, Math.min(posX, containerRect.width - 100));
  if (posY < 10) posY = (screenY - containerRect.top) + 20; // flip below if too high

  const btnClass = "flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-semibold transition-all hover:scale-105 active:scale-95";

  return (
    <div
      className="absolute z-50 pointer-events-auto"
      style={{ left: posX, top: posY, transform: "translateX(-50%)" }}
      data-testid="floating-toolbar"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border border-slate-200/80 px-1.5 py-1 flex items-center gap-0.5" style={{ direction: "rtl" }}>
        <button onClick={onEdit} className={`${btnClass} text-blue-600 hover:bg-blue-50`} data-testid="float-edit-btn" title={isAr ? "تعديل البيانات" : "Edit Data"}>
          <Edit2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">{isAr ? "تعديل" : "Edit"}</span>
        </button>
        <div className="w-px h-5 bg-slate-200" />
        <button onClick={onCopy} className={`${btnClass} text-violet-600 hover:bg-violet-50`} data-testid="float-copy-btn" title={isAr ? "نسخ المنطقة" : "Copy Zone"}>
          <Copy className="w-3.5 h-3.5" /><span className="hidden sm:inline">{isAr ? "نسخ" : "Copy"}</span>
        </button>
        <div className="w-px h-5 bg-slate-200" />
        <button onClick={onSmooth} className={`${btnClass} text-emerald-600 hover:bg-emerald-50`} data-testid="float-smooth-btn" title={isAr ? "تنعيم الزوايا" : "Smooth"}>
          <Sparkles className="w-3.5 h-3.5" /><span className="hidden sm:inline">{isAr ? "تنعيم" : "Smooth"}</span>
        </button>
        <div className="w-px h-5 bg-slate-200" />
        <button onClick={onRemove} className={`${btnClass} text-red-500 hover:bg-red-50`} data-testid="float-remove-btn" title={isAr ? "إزالة المنطقة" : "Remove Zone"}>
          <Trash2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">{isAr ? "إزالة" : "Remove"}</span>
        </button>
      </div>
      {/* Arrow pointer */}
      <div className="flex justify-center"><div className="w-2.5 h-2.5 bg-white border-b border-r border-slate-200/80 rotate-45 -mt-[5px]" /></div>
    </div>
  );
}

export function MapCanvas({
  selectedFloor, activeSession, sessionZones, activeZones, removedZones,
  mapMode, zoom, panOffset, setPanOffset, zoomRef, svgRef, mapContainerRef,
  drawingPoints, setDrawingPoints, selectedZoneId, setSelectedZoneId,
  draggingPoint, setDraggingPoint, hoveredPoint, setHoveredPoint,
  mousePos, setMousePos, nearStart, setNearStart,
  rectStart, setRectStart, rectEnd, setRectEnd,
  isRotating, setIsRotating, isDraggingZone, setIsDraggingZone,
  dragZoneStart, setDragZoneStart, isDrawingFreehand, setIsDrawingFreehand,
  freehandPoints, setFreehandPoints, isPanning, setIsPanning, panStart, setPanStart,
  imgRatio, setImgRatio, newZoneForm,
  setActiveSession, setSelectedZone, setShowZoneDialog, setShowNewZoneDialog,
  ZONE_TYPES, wheelRef, onMapMouseUp,
  handleSmoothZone, handleCopyZone, handleToggleRemove, handleUpdateZoneStyle, handleDeletePoint,
  addDrawingPoint,
}) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [hoveredZone, setHoveredZone] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const getMousePercent = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const t = pt.matrixTransform(ctm.inverse());
    return { x: Math.max(0, Math.min(100, t.x)), y: Math.max(0, Math.min(100, t.y)) };
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const pos = getMousePercent(e);
    if (activeSession?.status === "completed" || mapMode === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } else if (DRAG_SHAPE_MODES.includes(mapMode)) {
      setRectStart(pos); setRectEnd(pos);
    } else if (mapMode === "freehand") {
      setIsDrawingFreehand(true); setFreehandPoints([pos]);
    } else if (mapMode === "edit" && selectedZoneId && activeSession?.status === "draft") {
      const zone = sessionZones.find(z => z.id === selectedZoneId);
      if (!zone?.polygon_points) return;
      const rotHandle = getRotationHandle(zone.polygon_points, zoom);
      if (rotHandle && getDistance(pos, rotHandle) < (2.5 / Math.max(zoom, 0.5))) { setIsRotating(true); return; }
      const hitRadius = 2 / Math.max(zoom, 0.5);
      const hitIndex = zone.polygon_points.findIndex(p => getDistance(pos, p) < hitRadius);
      if (hitIndex !== -1) { setDraggingPoint(hitIndex); setHoveredPoint(hitIndex); return; }
      const pts = zone.polygon_points;
      const midRadius = 1.5 / Math.max(zoom, 0.5);
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        const mx = (pts[i].x + pts[j].x) / 2, my = (pts[i].y + pts[j].y) / 2;
        if (getDistance(pos, { x: mx, y: my }) < midRadius) {
          const newPoints = [...pts]; newPoints.splice(j, 0, { x: pos.x, y: pos.y });
          setActiveSession(prev => ({ ...prev, zones: prev.zones.map(z => z.id === selectedZoneId ? { ...z, polygon_points: newPoints } : z) }));
          setDraggingPoint(j); setHoveredPoint(j); return;
        }
      }
      if (isPointInPolygon(pos, zone.polygon_points)) { setIsDraggingZone(true); setDragZoneStart(pos); }
    }
  };

  const handleMouseMove = (e) => {
    const pos = getMousePercent(e);
    setMousePos(pos);
    if (isPanning && mapMode === "pan") { setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); return; }
    if (DRAG_SHAPE_MODES.includes(mapMode) && rectStart) { setRectEnd(pos); return; }
    if (mapMode === "freehand" && isDrawingFreehand) { setFreehandPoints(prev => [...prev, pos]); return; }
    if (isRotating && selectedZoneId) {
      const zone = sessionZones.find(z => z.id === selectedZoneId);
      if (zone?.polygon_points) {
        const center = { x: zone.polygon_points.reduce((s,p)=>s+p.x,0)/zone.polygon_points.length, y: zone.polygon_points.reduce((s,p)=>s+p.y,0)/zone.polygon_points.length };
        const angle = Math.atan2(pos.y - center.y, pos.x - center.x) - Math.atan2(mousePos.y - center.y, mousePos.x - center.x);
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const newPts = zone.polygon_points.map(p => ({ x: center.x + (p.x-center.x)*cos - (p.y-center.y)*sin, y: center.y + (p.x-center.x)*sin + (p.y-center.y)*cos }));
        setActiveSession(prev => ({ ...prev, zones: prev.zones.map(z => z.id === selectedZoneId ? { ...z, polygon_points: newPts } : z) }));
      }
      return;
    }
    if (isDraggingZone && selectedZoneId && dragZoneStart) {
      const dx = pos.x - dragZoneStart.x, dy = pos.y - dragZoneStart.y;
      const zone = sessionZones.find(z => z.id === selectedZoneId);
      if (zone?.polygon_points) {
        const newPts = zone.polygon_points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        setActiveSession(prev => ({ ...prev, zones: prev.zones.map(z => z.id === selectedZoneId ? { ...z, polygon_points: newPts } : z) }));
        setDragZoneStart(pos);
      }
      return;
    }
    if (draggingPoint !== null && selectedZoneId) {
      setActiveSession(prev => ({ ...prev, zones: prev.zones.map(z => {
        if (z.id !== selectedZoneId) return z;
        const newPts = [...z.polygon_points]; newPts[draggingPoint] = { x: pos.x, y: pos.y };
        return { ...z, polygon_points: newPts };
      })}));
      return;
    }
    if (mapMode === "edit" && selectedZoneId) {
      const zone = sessionZones.find(z => z.id === selectedZoneId);
      const hitRadius = 2 / Math.max(zoom, 0.5);
      const hit = zone?.polygon_points?.findIndex(p => getDistance(pos, p) < hitRadius) ?? -1;
      setHoveredPoint(hit !== -1 ? hit : null);
    }
    if (mapMode === "draw" && drawingPoints.length >= 3) setNearStart(getDistance(pos, drawingPoints[0]) < 1.2);
    if (mapMode !== "draw" && draggingPoint === null && !isPanning && !isRotating && !isDraggingZone) {
      if (mapContainerRef.current) {
        const rect = mapContainerRef.current.getBoundingClientRect();
        setTooltipPos({ x: e.clientX - rect.left + 16, y: e.clientY - rect.top - 10 });
      }
      let found = null;
      for (const zone of sessionZones) {
        if (!zone.is_removed && isPointInPolygon(pos, zone.polygon_points)) { found = zone; break; }
      }
      if (found?.id !== hoveredZone?.id) setHoveredZone(found || null);
    } else if (hoveredZone) setHoveredZone(null);
  };

  const handleMouseUp = () => onMapMouseUp();

  const handleClick = (e) => {
    if (isPanning || draggingPoint !== null) return;
    if (activeSession?.status === "completed") return;
    e.preventDefault();
    const pos = getMousePercent(e);
    if (mapMode === "draw" && activeSession?.status === "draft") {
      if (drawingPoints.length >= 3 && nearStart) { setShowNewZoneDialog(true); return; }
      addDrawingPoint({ x: pos.x, y: pos.y });
    } else if (mapMode === "edit" && activeSession?.status === "draft") {
      if (e.target?.closest && e.target.closest("[data-zone-id]")) return;
      let found = null;
      for (const zone of sessionZones) {
        if (!zone.is_removed && isPointInPolygon(pos, zone.polygon_points)) { found = zone; break; }
      }
      setSelectedZoneId(found?.id || null);
    }
  };

  // Double-click on vertex to delete it
  const handleDoubleClickVertex = (e, zoneId, pointIndex) => {
    e.stopPropagation();
    if (activeSession?.status !== "draft") return;
    const zone = sessionZones.find(z => z.id === zoneId);
    if (!zone?.polygon_points || zone.polygon_points.length <= 3) return; // Keep minimum 3 points
    handleDeletePoint(zoneId, pointIndex);
  };

  if (!selectedFloor?.image_url) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">{isAr ? "لا توجد صورة خريطة" : "No map image"}</CardContent></Card>;
  }

  const cursorStyle = activeSession?.status === "completed"
    ? (isPanning ? "grabbing" : "grab")
    : (["draw", ...DRAG_SHAPE_MODES, "freehand"].includes(mapMode) ? "crosshair" : mapMode === "edit" ? "default" : (isPanning ? "grabbing" : "grab"));

  const selectedZoneData = selectedZoneId ? sessionZones.find(z => z.id === selectedZoneId) : null;
  const showFloatingToolbar = selectedZoneId && mapMode === "edit" && activeSession?.status === "draft" && selectedZoneData && !draggingPoint && !isRotating && !isDraggingZone;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div ref={wheelRef} data-testid="session-map-container" className="relative bg-slate-100 overflow-hidden"
          style={{ height: "550px", cursor: cursorStyle }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleClick}>
          <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: "0 0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {(() => {
              const ce = mapContainerRef.current;
              let ws = { position: "relative", width: "100%", height: "100%" };
              if (imgRatio && ce) { const cw = ce.clientWidth, ch = ce.clientHeight; if (cw/ch > imgRatio) ws = { position: "relative", height: "100%", width: ch * imgRatio }; else ws = { position: "relative", width: "100%", height: cw / imgRatio }; }
              return (
                <div style={ws}>
                  <img src={selectedFloor.image_url} alt="" style={{ width: "100%", height: "100%", display: "block", imageRendering: "high-quality" }} draggable={false} className="pointer-events-none select-none" onLoad={(e) => setImgRatio(e.target.naturalWidth / e.target.naturalHeight)} />
                  <svg ref={svgRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }} viewBox="0 0 100 100" preserveAspectRatio="none" data-testid="session-map-svg">
                    {activeZones.map(zone => {
                      const isSelected = zone.id === selectedZoneId;
                      return (
                        <g key={zone.id} data-testid={`session-zone-${zone.id}`} data-zone-id={zone.id}
                          onMouseEnter={() => { if (mapMode !== "draw" && draggingPoint === null && !isSelected) setHoveredZone(zone); }}
                          onMouseLeave={() => setHoveredZone(null)}
                          onClick={(e) => { if (mapMode === "edit" && activeSession?.status === "draft") { e.stopPropagation(); setSelectedZoneId(zone.id); } }}
                          onDoubleClick={(e) => { if (activeSession?.status !== "draft") return; if (mapMode !== "edit") { e.stopPropagation(); setSelectedZone(zone); setShowZoneDialog(true); } }}
                          style={{ cursor: mapMode === "edit" && activeSession?.status === "draft" ? (isSelected ? "move" : "pointer") : "inherit" }}>
                          <path d={getPath(zone.polygon_points)} fill={zone.fill_color} fillOpacity={isSelected ? (zone.opacity || 0.4) * 0.6 : (zone.opacity || 0.4)}
                            stroke={isSelected && mapMode === "edit" ? "#3b82f6" : (zone.stroke_color || "#000000")}
                            strokeWidth={isSelected && mapMode === "edit" ? 0.6 : (zone.stroke_width ?? 0.3)}
                            strokeOpacity={isSelected && mapMode === "edit" ? 1 : (zone.stroke_opacity ?? 1)}
                            strokeDasharray={isSelected && mapMode === "edit" ? "none" : (zone.stroke_style === "solid" ? "none" : zone.stroke_style === "dotted" ? "0.5 0.8" : "2 1")}
                            vectorEffect="non-scaling-stroke" />
                          {isSelected && (
                            <path d={getPath(zone.polygon_points)} fill="none"
                              stroke="#3b82f6" strokeWidth="1.8" strokeOpacity="0.5"
                              strokeDasharray="5 3"
                              vectorEffect="non-scaling-stroke" pointerEvents="none" />
                          )}
                          {/* Vertex handles - PPT style white squares */}
                          {isSelected && mapMode === "edit" && activeSession?.status === "draft" && zone.polygon_points?.map((pt, i) => {
                            const isActive = i === draggingPoint || i === hoveredPoint;
                            return (
                              <g key={`v-${i}`} style={{ cursor: "crosshair" }}
                                onDoubleClick={(e) => handleDoubleClickVertex(e, zone.id, i)}>
                                {isActive && <circle cx={pt.x} cy={pt.y} r="0.5" fill="#3b82f6" fillOpacity="0.12" pointerEvents="none" />}
                                <rect x={pt.x - (isActive ? 0.24 : 0.16)} y={pt.y - (isActive ? 0.24 : 0.16)}
                                  width={isActive ? 0.48 : 0.32} height={isActive ? 0.48 : 0.32}
                                  fill="white" stroke="#3b82f6" strokeWidth={isActive ? "0.08" : "0.05"}
                                  vectorEffect="non-scaling-stroke" pointerEvents="all"
                                  style={{ filter: isActive ? "drop-shadow(0 0 2px rgba(59,130,246,0.6))" : "none" }} />
                              </g>
                            );
                          })}
                          {/* Midpoint handles */}
                          {isSelected && mapMode === "edit" && activeSession?.status === "draft" && zone.polygon_points?.map((pt, i) => {
                            const j = (i + 1) % zone.polygon_points.length;
                            const nx = zone.polygon_points[j];
                            const mx = (pt.x + nx.x) / 2, my = (pt.y + nx.y) / 2;
                            return <circle key={`m-${i}`} cx={mx} cy={my} r="0.12" fill="white" stroke="#3b82f6" strokeWidth="0.04" vectorEffect="non-scaling-stroke" opacity="0.5" pointerEvents="none" style={{ cursor: "crosshair" }} />;
                          })}
                          {/* Green rotation handle */}
                          {isSelected && mapMode === "edit" && activeSession?.status === "draft" && (() => {
                            const rh = getRotationHandle(zone.polygon_points, zoom);
                            if (!rh) return null;
                            return (
                              <g data-testid="rotation-handle" style={{ cursor: "grab" }}>
                                <line x1={rh.cx} y1={Math.min(...zone.polygon_points.map(p => p.y))} x2={rh.x} y2={rh.y} stroke="#22c55e" strokeWidth="0.25" strokeDasharray="0.6 0.3" vectorEffect="non-scaling-stroke" opacity="0.5" pointerEvents="none" />
                                <circle cx={rh.x} cy={rh.y} r="0.3" fill="#22c55e" stroke="white" strokeWidth="0.07" vectorEffect="non-scaling-stroke" opacity="0.9" pointerEvents="none" />
                                <g transform={`translate(${rh.x}, ${rh.y})`} pointerEvents="none">
                                  <path d="M -0.12 -0.06 A 0.12 0.12 0 1 1 0.06 -0.12" fill="none" stroke="white" strokeWidth="0.04" vectorEffect="non-scaling-stroke" />
                                  <path d="M 0.06 -0.12 L 0.14 -0.07 L 0.05 -0.04" fill="white" stroke="none" />
                                </g>
                              </g>
                            );
                          })()}
                        </g>
                      );
                    })}
                    {removedZones.map(zone => (
                      <g key={zone.id} data-testid={`session-zone-removed-${zone.id}`} onMouseEnter={() => setHoveredZone(zone)} onMouseLeave={() => setHoveredZone(null)} onClick={(e) => { if (activeSession?.status === "draft") { e.stopPropagation(); setSelectedZone(zone); setShowZoneDialog(true); } }} style={{ cursor: activeSession?.status === "draft" ? "pointer" : "default" }}>
                        <path d={getPath(zone.polygon_points)} fill="#ef4444" fillOpacity={0.08} stroke="#ef4444" strokeWidth={0.5} strokeOpacity={0.4} strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" />
                        {zone.polygon_points?.length > 0 && (() => { const cx2 = zone.polygon_points.reduce((s,p)=>s+p.x,0)/zone.polygon_points.length; const cy2 = zone.polygon_points.reduce((s,p)=>s+p.y,0)/zone.polygon_points.length; return (<g><line x1={cx2-0.8} y1={cy2-0.8} x2={cx2+0.8} y2={cy2+0.8} stroke="#ef4444" strokeWidth="0.4" vectorEffect="non-scaling-stroke" opacity="0.6"/><line x1={cx2+0.8} y1={cy2-0.8} x2={cx2-0.8} y2={cy2+0.8} stroke="#ef4444" strokeWidth="0.4" vectorEffect="non-scaling-stroke" opacity="0.6"/></g>); })()}
                      </g>
                    ))}
                    {mapMode === "draw" && drawingPoints.length > 0 && (
                      <g data-testid="drawing-layer">
                        <path d={getPath(drawingPoints, false)} fill="none" stroke="#3b82f6" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                        <line x1={drawingPoints[drawingPoints.length-1].x} y1={drawingPoints[drawingPoints.length-1].y} x2={mousePos.x} y2={mousePos.y} stroke="#3b82f6" strokeWidth="0.4" strokeDasharray="1 0.5" vectorEffect="non-scaling-stroke" />
                        {nearStart && drawingPoints.length >= 3 && <path d={getPath(drawingPoints)} fill={newZoneForm.fill_color} fillOpacity={0.3} stroke="#22c55e" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />}
                        {drawingPoints.map((pt, i) => {
                          const isStart = i === 0;
                          const r = isStart ? (nearStart ? 0.3 : 0.15) : DRAW_POINT_RADIUS;
                          return <circle key={i} cx={pt.x} cy={pt.y} r={r} fill={isStart ? (nearStart ? "#22c55e" : "#ef4444") : "#3b82f6"} fillOpacity={isStart ? 0.8 : 0.25} stroke="white" strokeWidth="0.08" vectorEffect="non-scaling-stroke" />;
                        })}
                      </g>
                    )}
                    {DRAG_SHAPE_MODES.includes(mapMode) && rectStart && rectEnd && (() => {
                      const previewPts = generateShapeFromDrag(mapMode, rectStart, rectEnd);
                      if (!previewPts) return null;
                      const colors = { rect: "#3b82f6", circle: "#06b6d4", ellipse: "#8b5cf6", triangle: "#f59e0b", pentagon: "#10b981", hexagon: "#6366f1", star: "#ec4899", diamond: "#14b8a6", lshape: "#f97316", ushape: "#8b5cf6" };
                      return <path d={getPath(previewPts)} fill={newZoneForm.fill_color} fillOpacity={0.2} stroke={colors[mapMode] || "#3b82f6"} strokeWidth="0.6" strokeDasharray="1.5 0.8" vectorEffect="non-scaling-stroke" data-testid="shape-preview" />;
                    })()}
                    {mapMode === "freehand" && isDrawingFreehand && freehandPoints.length > 1 && (
                      <path d={getPath(freehandPoints, false)} fill="none" stroke="#ec4899" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" data-testid="freehand-preview" />
                    )}
                  </svg>
                </div>
              );
            })()}
          </div>
          {/* Floating Toolbar above selected zone */}
          {showFloatingToolbar && (
            <FloatingToolbar
              zone={selectedZoneData}
              svgRef={svgRef}
              mapContainerRef={mapContainerRef}
              isAr={isAr}
              onEdit={() => { setSelectedZone(selectedZoneData); setShowZoneDialog(true); }}
              onCopy={handleCopyZone}
              onSmooth={handleSmoothZone}
              onRemove={() => { handleToggleRemove(selectedZoneId, false); setSelectedZoneId(null); }}
            />
          )}
          {/* Tooltip for non-selected zones */}
          {hoveredZone && mapMode !== "edit" && <ZoneTooltip zone={hoveredZone} pos={tooltipPos} ZONE_TYPES={ZONE_TYPES} isAr={isAr} />}
        </div>
      </CardContent>
    </Card>
  );
}

function ZoneTooltip({ zone, pos, ZONE_TYPES, isAr }) {
  const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
  const cl = CHANGE_LABELS[zone.change_type] || CHANGE_LABELS.unchanged;
  const hasChange = zone.change_type && zone.change_type !== "unchanged";
  const capacity = zone.max_capacity || 0;
  const area = zone.area_sqm || 0;
  const currentCount = zone.current_count || 0;
  const utilPct = capacity > 0 ? Math.round((currentCount / capacity) * 100) : 0;
  const densityInfo = getDensityLevel(currentCount, capacity);

  return (
    <div className="absolute pointer-events-none z-50" style={{ left: pos.x, top: pos.y }} data-testid="zone-hover-tooltip">
      <div className="bg-white/97 backdrop-blur-md rounded-xl shadow-2xl border overflow-hidden min-w-[240px]" style={{ direction: "rtl" }}>
        <div className="h-1.5" style={{ backgroundColor: zone.fill_color }} />
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold shadow-sm" style={{ backgroundColor: zone.fill_color }}>{ti?.icon || "?"}</div>
              <span className="font-bold text-sm">{zone.zone_code}</span>
            </div>
            {hasChange && <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: cl.bg, color: cl.color }}>{isAr ? cl.ar : cl.en}</span>}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-800">{isAr ? zone.name_ar : zone.name_en}</p>
            {ti && <p className="text-[10px] font-medium mt-0.5" style={{ color: ti.color }}>{isAr ? ti.label_ar : ti.label_en}</p>}
          </div>
          {(area > 0 || capacity > 0) && (
            <>
              <div className="border-t border-dashed border-slate-200" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {area > 0 && <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center text-blue-600 text-[8px] font-bold flex-shrink-0">م²</span><span className="text-[11px] text-slate-600">{area.toLocaleString()} {isAr ? "م²" : "m²"}</span></div>}
                {capacity > 0 && <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-100 flex items-center justify-center text-amber-600 text-[8px] font-bold flex-shrink-0">S</span><span className="text-[11px] text-slate-600">{capacity.toLocaleString()} {isAr ? "مصلي" : "cap"}</span></div>}
              </div>
            </>
          )}
          {currentCount > 0 && capacity > 0 && (
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(utilPct, 100)}%`, backgroundColor: densityInfo.color }} /></div>
              <span className="text-[10px] font-bold font-mono" style={{ color: densityInfo.color }}>{utilPct}%</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${zone.is_removed ? "bg-red-500" : "bg-emerald-500"}`} />
            <span className={`text-[10px] font-semibold ${zone.is_removed ? "text-red-500" : "text-emerald-600"}`}>{zone.is_removed ? (isAr ? "مزالة" : "Removed") : (isAr ? "نشطة" : "Active")}</span>
          </div>
          {zone.daily_note && <div className="p-1.5 bg-slate-50 rounded text-[10px] text-slate-500 line-clamp-2 border-r-2 border-slate-300">{zone.daily_note}</div>}
        </div>
      </div>
    </div>
  );
}
