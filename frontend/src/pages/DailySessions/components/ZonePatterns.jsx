import { useMemo } from "react";

// Generate SVG pattern content based on pattern type
function getPatternContent(type, fgColor, size) {
  const s = size;
  const h = s / 2;
  const sw = s * 0.08;
  switch (type) {
    case "diagonal-right":
      return <><line x1="0" y1={s} x2={s} y2="0" stroke={fgColor} strokeWidth={sw} /><line x1={-h} y1={h} x2={h} y2={-h} stroke={fgColor} strokeWidth={sw} /><line x1={h} y1={s+h} x2={s+h} y2={h} stroke={fgColor} strokeWidth={sw} /></>;
    case "diagonal-left":
      return <><line x1="0" y1="0" x2={s} y2={s} stroke={fgColor} strokeWidth={sw} /><line x1={-h} y1={h} x2={h} y2={s+h} stroke={fgColor} strokeWidth={sw} /><line x1={h} y1={-h} x2={s+h} y2={h} stroke={fgColor} strokeWidth={sw} /></>;
    case "diagonal-cross":
      return <><line x1="0" y1={s} x2={s} y2="0" stroke={fgColor} strokeWidth={sw*0.7} /><line x1="0" y1="0" x2={s} y2={s} stroke={fgColor} strokeWidth={sw*0.7} /></>;
    case "horizontal":
      return <><line x1="0" y1={h} x2={s} y2={h} stroke={fgColor} strokeWidth={sw} /></>;
    case "vertical":
      return <><line x1={h} y1="0" x2={h} y2={s} stroke={fgColor} strokeWidth={sw} /></>;
    case "grid":
      return <><line x1={h} y1="0" x2={h} y2={s} stroke={fgColor} strokeWidth={sw*0.7} /><line x1="0" y1={h} x2={s} y2={h} stroke={fgColor} strokeWidth={sw*0.7} /></>;
    case "dots-small":
      return <circle cx={h} cy={h} r={s*0.1} fill={fgColor} />;
    case "dots-large":
      return <circle cx={h} cy={h} r={s*0.2} fill={fgColor} />;
    case "dense":
      return <><line x1="0" y1={s*0.25} x2={s} y2={s*0.25} stroke={fgColor} strokeWidth={sw} /><line x1="0" y1={s*0.5} x2={s} y2={s*0.5} stroke={fgColor} strokeWidth={sw} /><line x1="0" y1={s*0.75} x2={s} y2={s*0.75} stroke={fgColor} strokeWidth={sw} /><line x1={s*0.25} y1="0" x2={s*0.25} y2={s} stroke={fgColor} strokeWidth={sw*0.5} /><line x1={s*0.75} y1="0" x2={s*0.75} y2={s} stroke={fgColor} strokeWidth={sw*0.5} /></>;
    case "light-fill":
      return <><circle cx={s*0.25} cy={s*0.25} r={s*0.04} fill={fgColor} /><circle cx={s*0.75} cy={s*0.75} r={s*0.04} fill={fgColor} /></>;
    case "medium-fill":
      return <><circle cx={s*0.25} cy={s*0.25} r={s*0.06} fill={fgColor} /><circle cx={s*0.75} cy={s*0.75} r={s*0.06} fill={fgColor} /><circle cx={s*0.75} cy={s*0.25} r={s*0.04} fill={fgColor} /><circle cx={s*0.25} cy={s*0.75} r={s*0.04} fill={fgColor} /></>;
    case "diamonds":
      return <path d={`M${h} ${s*0.1} L${s*0.9} ${h} L${h} ${s*0.9} L${s*0.1} ${h} Z`} fill="none" stroke={fgColor} strokeWidth={sw*0.7} />;
    default:
      return null;
  }
}

// Renders SVG <defs> with all needed patterns for zones on the map
export function ZonePatternDefs({ zones }) {
  const patternZones = useMemo(() =>
    zones.filter(z => z.fill_type === "pattern" && z.pattern_type && !z.is_removed),
    [zones]
  );

  if (patternZones.length === 0) return null;

  return (
    <defs>
      {patternZones.map(zone => {
        const patternSize = 3;
        const fg = zone.pattern_fg_color || "#000000";
        const bg = zone.pattern_bg_color || "#ffffff";
        return (
          <pattern
            key={`pat-${zone.id}`}
            id={`zone-pattern-${zone.id}`}
            patternUnits="userSpaceOnUse"
            width={patternSize}
            height={patternSize}
          >
            <rect width={patternSize} height={patternSize} fill={bg} />
            {getPatternContent(zone.pattern_type, fg, patternSize)}
          </pattern>
        );
      })}
    </defs>
  );
}

// Small inline preview for the toolbar/picker
export function PatternPreviewSvg({ patternType, fgColor, bgColor, size = 28, selected, onClick, label }) {
  const tileSize = 10;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 p-1 rounded-lg transition-all ${
        selected
          ? "bg-emerald-100 ring-2 ring-emerald-400 shadow-sm"
          : "hover:bg-slate-100 border border-transparent hover:border-slate-200"
      }`}
      title={label}
      data-testid={`pattern-opt-${patternType}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${tileSize * 3} ${tileSize * 3}`}>
        <defs>
          <pattern id={`preview-${patternType}`} patternUnits="userSpaceOnUse" width={tileSize} height={tileSize}>
            <rect width={tileSize} height={tileSize} fill={bgColor || "#fff"} />
            {getPatternContent(patternType, fgColor || "#000", tileSize)}
          </pattern>
        </defs>
        <rect width={tileSize * 3} height={tileSize * 3} rx="2" fill={`url(#preview-${patternType})`} stroke={selected ? "#059669" : "#cbd5e1"} strokeWidth="1" />
      </svg>
      {label && <span className="text-[7px] font-medium text-muted-foreground leading-none truncate w-full text-center">{label}</span>}
    </button>
  );
}
