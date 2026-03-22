import momentHijri from "moment-hijri";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const HARAM_FIELDS = [
  { key: "haram_worshippers", label: "المصلين", icon: "users" },
  { key: "haram_umrah", label: "المعتمرين", icon: "users" },
  { key: "haram_hijr_ismail", label: "حجر إسماعيل", icon: "building" },
  { key: "haram_carts", label: "العربات", icon: "cart" },
];

export const NABAWI_FIELDS = [
  { key: "nabawi_worshippers", label: "المصلين", icon: "users" },
  { key: "nabawi_rawdah_men_published", label: "الروضة رجال - منشور", group: "rawdah_men" },
  { key: "nabawi_rawdah_men_reserved", label: "الروضة رجال - محجوز", group: "rawdah_men" },
  { key: "nabawi_rawdah_men_actual", label: "الروضة رجال - فعلي", group: "rawdah_men" },
  { key: "nabawi_rawdah_women_published", label: "الروضة نساء - منشور", group: "rawdah_women" },
  { key: "nabawi_rawdah_women_reserved", label: "الروضة نساء - محجوز", group: "rawdah_women" },
  { key: "nabawi_rawdah_women_actual", label: "الروضة نساء - فعلي", group: "rawdah_women" },
  { key: "nabawi_salam_corridor", label: "ممر السلام", icon: "door" },
];

export const HIJRI_MONTHS = [
  { value: "01", label: "محرم" },
  { value: "02", label: "صفر" },
  { value: "03", label: "ربيع الأول" },
  { value: "04", label: "ربيع الثاني" },
  { value: "05", label: "جمادى الأولى" },
  { value: "06", label: "جمادى الآخرة" },
  { value: "07", label: "رجب" },
  { value: "08", label: "شعبان" },
  { value: "09", label: "رمضان" },
  { value: "10", label: "شوال" },
  { value: "11", label: "ذو القعدة" },
  { value: "12", label: "ذو الحجة" },
];

export function formatNumber(num) {
  if (num === null || num === undefined || num === "") return "-";
  return Number(num).toLocaleString("ar-SA");
}

export function formatDateAr(dateStr) {
  if (!dateStr) return "-";
  const parts = dateStr.replace("/", "-").split("-");
  if (parts.length !== 3) return dateStr;
  const d = Number(parts[2]);
  const m = Number(parts[1]);
  const y = Number(parts[0]);
  return `${d.toLocaleString("ar-SA",{useGrouping:false})}/${m.toLocaleString("ar-SA",{useGrouping:false})}/${y.toLocaleString("ar-SA",{useGrouping:false})}`;
}

export function getGregorianFromHijri(hijriDate) {
  try {
    const m = momentHijri(hijriDate, "iYYYY-iMM-iDD");
    if (m.isValid()) {
      return `${m.date().toLocaleString("ar-SA",{useGrouping:false})}/${(m.month()+1).toLocaleString("ar-SA",{useGrouping:false})}/${m.year().toLocaleString("ar-SA",{useGrouping:false})}`;
    }
  } catch {}
  return "-";
}

export function getCurrentHijriDate() {
  const m = momentHijri();
  return {
    year: m.iYear().toString(),
    month: m.iMonth() + 1,
    day: m.iDate(),
    formatted: m.format("iYYYY-iMM-iDD"),
    monthPadded: String(m.iMonth() + 1).padStart(2, "0"),
  };
}

export function hijriToGregorian(hijriDate) {
  try {
    const m = momentHijri(hijriDate, "iYYYY-iMM-iDD");
    if (m.isValid()) {
      return m.format("YYYY-MM-DD");
    }
  } catch {}
  return "";
}
