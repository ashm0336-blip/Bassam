export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const normalizeImageUrl = (url) => {
  if (!url) return url;
  let value = url;
  if (value.includes(".preview.emergentagent.com") && !value.startsWith(process.env.REACT_APP_BACKEND_URL)) {
    const pathMatch = value.match(/\/(?:api\/)?uploads\/.+$/);
    if (pathMatch) value = `${process.env.REACT_APP_BACKEND_URL}${pathMatch[0].startsWith("/api") ? pathMatch[0] : "/api" + pathMatch[0]}`;
  }
  if (value.startsWith("/")) value = `${process.env.REACT_APP_BACKEND_URL}${value}`;
  else if (value.startsWith("uploads/")) value = `${process.env.REACT_APP_BACKEND_URL}/${value}`;
  if (value.includes("/uploads/") && !value.includes("/api/uploads/")) value = value.replace("/uploads/", "/api/uploads/");
  return value;
};

export const getPath = (points, close = true) => {
  if (!points || points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
  if (close && points.length > 2) d += " Z";
  return d;
};

export const getDistance = (p1, p2) => Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);

export const getHitPointIndex = (points, pos, zoom) => {
  if (!points?.length) return -1;
  const radius = 2 / Math.max(zoom, 0.5);
  return points.findIndex((p) => getDistance(pos, p) < radius);
};

export const isPointInPolygon = (point, polygon) => {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
};

export const getZoneCenter = (points) => {
  if (!points?.length) return { x: 50, y: 50 };
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  return { x: cx, y: cy };
};

export const rotatePoints = (points, center, angle) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map(p => ({
    x: center.x + (p.x - center.x) * cos - (p.y - center.y) * sin,
    y: center.y + (p.x - center.x) * sin + (p.y - center.y) * cos,
  }));
};

export const movePoints = (points, dx, dy) => points.map(p => ({ x: p.x + dx, y: p.y + dy }));

export const getRotationHandle = (points, zoom) => {
  if (!points?.length) return null;
  const center = getZoneCenter(points);
  const minY = Math.min(...points.map(p => p.y));
  const handleOffset = 3 / Math.max(zoom, 0.5);
  return { x: center.x, y: minY - handleOffset, cx: center.x, cy: center.y };
};

export const generateCircleFromDrag = (center, edge) => {
  const r = getDistance(center, edge);
  if (r < 0.5) return null;
  return Array.from({ length: 36 }, (_, i) => ({
    x: center.x + r * Math.cos(2 * Math.PI * i / 36),
    y: center.y + r * Math.sin(2 * Math.PI * i / 36),
  }));
};

export const generateEllipseFromDrag = (start, end) => {
  const cx = (start.x + end.x) / 2, cy = (start.y + end.y) / 2;
  const rx = Math.abs(end.x - start.x) / 2, ry = Math.abs(end.y - start.y) / 2;
  if (rx < 0.5 || ry < 0.5) return null;
  return Array.from({ length: 36 }, (_, i) => ({
    x: cx + rx * Math.cos(2 * Math.PI * i / 36),
    y: cy + ry * Math.sin(2 * Math.PI * i / 36),
  }));
};

// Generic polygon generator (triangle, pentagon, hexagon)
export const generatePolygonFromDrag = (start, end, sides) => {
  const cx = (start.x + end.x) / 2, cy = (start.y + end.y) / 2;
  const rx = Math.abs(end.x - start.x) / 2, ry = Math.abs(end.y - start.y) / 2;
  if (rx < 0.5 || ry < 0.5) return null;
  return Array.from({ length: sides }, (_, i) => ({
    x: cx + rx * Math.cos(2 * Math.PI * i / sides - Math.PI / 2),
    y: cy + ry * Math.sin(2 * Math.PI * i / sides - Math.PI / 2),
  }));
};

export const generateDiamondFromDrag = (start, end) => {
  const cx = (start.x + end.x) / 2, cy = (start.y + end.y) / 2;
  const rx = Math.abs(end.x - start.x) / 2, ry = Math.abs(end.y - start.y) / 2;
  if (rx < 0.3 || ry < 0.3) return null;
  return [{ x: cx, y: cy - ry }, { x: cx + rx, y: cy }, { x: cx, y: cy + ry }, { x: cx - rx, y: cy }];
};

export const generateStarFromDrag = (start, end) => {
  const cx = (start.x + end.x) / 2, cy = (start.y + end.y) / 2;
  const rx = Math.abs(end.x - start.x) / 2, ry = Math.abs(end.y - start.y) / 2;
  if (rx < 0.5 || ry < 0.5) return null;
  return Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    const r = i % 2 === 0 ? 1 : 0.4;
    return { x: cx + rx * r * Math.cos(angle), y: cy + ry * r * Math.sin(angle) };
  });
};

export const generateLShapeFromDrag = (start, end) => {
  const x1 = Math.min(start.x, end.x), y1 = Math.min(start.y, end.y);
  const x2 = Math.max(start.x, end.x), y2 = Math.max(start.y, end.y);
  if (x2 - x1 < 1 || y2 - y1 < 1) return null;
  const t = Math.min(x2 - x1, y2 - y1) * 0.38;
  return [{ x: x1, y: y1 }, { x: x1 + t, y: y1 }, { x: x1 + t, y: y2 - t }, { x: x2, y: y2 - t }, { x: x2, y: y2 }, { x: x1, y: y2 }];
};

export const generateUShapeFromDrag = (start, end) => {
  const x1 = Math.min(start.x, end.x), y1 = Math.min(start.y, end.y);
  const x2 = Math.max(start.x, end.x), y2 = Math.max(start.y, end.y);
  if (x2 - x1 < 1 || y2 - y1 < 1) return null;
  const t = Math.min(x2 - x1, y2 - y1) * 0.28;
  return [{ x: x1, y: y1 }, { x: x1 + t, y: y1 }, { x: x1 + t, y: y2 - t }, { x: x2 - t, y: y2 - t }, { x: x2 - t, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }];
};

// Unified shape generator - generates points from drag start/end based on mode
export const generateShapeFromDrag = (mode, start, end) => {
  if (!start || !end) return null;
  switch (mode) {
    case "rect": {
      const x1 = Math.min(start.x, end.x), y1 = Math.min(start.y, end.y);
      const x2 = Math.max(start.x, end.x), y2 = Math.max(start.y, end.y);
      return (x2 - x1 > 1 && y2 - y1 > 1) ? [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }] : null;
    }
    case "circle": return generateCircleFromDrag(start, end);
    case "ellipse": return generateEllipseFromDrag(start, end);
    case "triangle": return generatePolygonFromDrag(start, end, 3);
    case "pentagon": return generatePolygonFromDrag(start, end, 5);
    case "hexagon": return generatePolygonFromDrag(start, end, 6);
    case "diamond": return generateDiamondFromDrag(start, end);
    case "star": return generateStarFromDrag(start, end);
    case "lshape": return generateLShapeFromDrag(start, end);
    case "ushape": return generateUShapeFromDrag(start, end);
    default: return null;
  }
};

const pointToLineDistance = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return getDistance(p, a);
  return Math.abs(dx * (a.y - p.y) - dy * (a.x - p.x)) / len;
};

export const simplifyPoints = (pts, tolerance = 0.3) => {
  if (pts.length <= 2) return pts;
  const first = pts[0], last = pts[pts.length - 1];
  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = pointToLineDistance(pts[i], first, last);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > tolerance) {
    const left = simplifyPoints(pts.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPoints(pts.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
};

export const smoothPoints = (pts, iterations = 2) => {
  let result = [...pts];
  for (let iter = 0; iter < iterations; iter++) {
    const smoothed = [];
    for (let i = 0; i < result.length; i++) {
      const p0 = result[i];
      const p1 = result[(i + 1) % result.length];
      smoothed.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 });
      smoothed.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 });
    }
    result = smoothed;
  }
  return result;
};

export const getDensityLevel = (current, max, area = 0) => {
  if (!area || area <= 0) {
    if (!max || max <= 0) return { level: "unknown", pct: 0, color: "#94a3b8", bg: "#f8fafc", label_ar: "غير محدد", label_en: "N/A" };
    const pct = Math.round((current / max) * 100);
    if (pct >= 90) return { level: "critical", pct, color: "#dc2626", bg: "#fef2f2", label_ar: "حرج", label_en: "Critical" };
    if (pct >= 70) return { level: "high", pct, color: "#ea580c", bg: "#fff7ed", label_ar: "مرتفع", label_en: "High" };
    if (pct >= 25) return { level: "normal", pct, color: "#16a34a", bg: "#f0fdf4", label_ar: "طبيعي", label_en: "Normal" };
    return { level: "low", pct, color: "#0ea5e9", bg: "#f0f9ff", label_ar: "منخفض", label_en: "Low" };
  }
  const capSafe = Math.round(area / 0.75);
  const capMedium = Math.round(area / 0.60);
  const capMax = Math.round(area / 0.55);
  const pct = capMax > 0 ? Math.round((current / capMax) * 100) : 0;
  if (current > capMax) return { level: "over", pct: Math.min(pct, 120), color: "#7c2d12", bg: "#fef2f2", label_ar: "تجاوز", label_en: "Over" };
  if (current > capMedium) return { level: "max", pct, color: "#dc2626", bg: "#fef2f2", label_ar: "أقصى", label_en: "Maximum" };
  if (current > capSafe) return { level: "medium", pct, color: "#d97706", bg: "#fffbeb", label_ar: "متوسط", label_en: "Medium" };
  if (current > 0) return { level: "safe", pct, color: "#16a34a", bg: "#f0fdf4", label_ar: "آمن", label_en: "Safe" };
  return { level: "empty", pct: 0, color: "#0ea5e9", bg: "#f0f9ff", label_ar: "فارغ", label_en: "Empty" };
};

export const formatDate = (dateStr) => {
  try { return new Date(dateStr + "T00:00:00").toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); }
  catch { return dateStr; }
};

export const formatDateShort = (dateStr) => {
  try { return new Date(dateStr + "T00:00:00").toLocaleDateString("ar-SA", { month: "short", day: "numeric" }); }
  catch { return dateStr; }
};
