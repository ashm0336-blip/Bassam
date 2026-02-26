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
