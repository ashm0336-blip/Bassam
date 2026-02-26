export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ZONE_TYPES_FALLBACK = [
  { value: "men_prayer", label_ar: "مصليات الرجال", label_en: "Men Prayer Areas", color: "#22c55e", icon: "M" },
  { value: "women_prayer", label_ar: "مصليات النساء", label_en: "Women Prayer Areas", color: "#93c5fd", icon: "W" },
  { value: "service", label_ar: "خدمات", label_en: "Services", color: "#374151", icon: "X" },
];

export const CHANGE_LABELS = {
  added: { ar: "مضاف", en: "Added", color: "#22c55e", bg: "#dcfce7" },
  removed: { ar: "تم الإزالة", en: "Removed", color: "#ef4444", bg: "#fef2f2" },
  modified: { ar: "معدّل", en: "Modified", color: "#f59e0b", bg: "#fefce8" },
  category_changed: { ar: "تغيير فئة", en: "Category Changed", color: "#8b5cf6", bg: "#f5f3ff" },
  moved: { ar: "تم النقل", en: "Moved", color: "#06b6d4", bg: "#ecfeff" },
  unchanged: { ar: "بدون تغيير", en: "Unchanged", color: "#94a3b8", bg: "#f8fafc" },
};

export const AR_WEEKDAYS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
export const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export const PRAYER_TIMES = [
  { key: "fajr", label_ar: "الفجر", label_en: "Fajr", icon: "🌙" },
  { key: "dhuhr", label_ar: "الظهر", label_en: "Dhuhr", icon: "☀️" },
  { key: "asr", label_ar: "العصر", label_en: "Asr", icon: "🌤" },
  { key: "maghrib", label_ar: "المغرب", label_en: "Maghrib", icon: "🌅" },
  { key: "isha", label_ar: "العشاء", label_en: "Isha", icon: "🌃" },
  { key: "taraweeh", label_ar: "التراويح", label_en: "Taraweeh", icon: "✨" },
];

export const DRAW_POINT_RADIUS = 0.08;
export const SNAP_DISTANCE = 1.2;

// All drag-based shape modes (user drags to define bounding box)
export const DRAG_SHAPE_MODES = ["rect", "circle", "ellipse", "triangle", "pentagon", "hexagon", "star", "diamond", "lshape", "ushape"];

// Shape definitions with SVG preview paths (viewBox 0 0 24 24)
export const SHAPE_LIBRARY = [
  { mode: "rect", label_ar: "مستطيل", label_en: "Rectangle", path: "M3 5h18v14H3z" },
  { mode: "circle", label_ar: "دائرة", label_en: "Circle", path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" },
  { mode: "ellipse", label_ar: "بيضاوي", label_en: "Ellipse", path: "M12 6c5 0 9 2.7 9 6s-4 6-9 6-9-2.7-9-6 4-6 9-6z" },
  { mode: "triangle", label_ar: "مثلث", label_en: "Triangle", path: "M12 3L22 21H2z" },
  { mode: "diamond", label_ar: "معين", label_en: "Diamond", path: "M12 2L22 12L12 22L2 12z" },
  { mode: "pentagon", label_ar: "خماسي", label_en: "Pentagon", path: "M12 2L22 9.5L18.5 21H5.5L2 9.5z" },
  { mode: "hexagon", label_ar: "سداسي", label_en: "Hexagon", path: "M12 2L21 7V17L12 22L3 17V7z" },
  { mode: "star", label_ar: "نجمة", label_en: "Star", path: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" },
  { mode: "lshape", label_ar: "شكل L", label_en: "L Shape", path: "M4 3h7v7h9v11H4z" },
  { mode: "ushape", label_ar: "شكل U", label_en: "U Shape", path: "M3 3h5v13h8V3h5v18H3z" },
];
