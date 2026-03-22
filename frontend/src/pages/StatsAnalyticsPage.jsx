import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import momentHijri from "moment-hijri";
import {
  TrendingUp, TrendingDown, Calendar, BarChart3, Building2, Users2,
  ArrowUpRight, ArrowDownRight, Minus, Loader2, ArrowLeftRight,
  ChevronLeft, ChevronRight, Layers, Target, Activity, Zap,
  CalendarDays, Eye, GitCompare
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

// ─── Constants ──────────────────────────────────────────────────
const HIJRI_MONTHS = [
  { value: "01", label: "محرم" }, { value: "02", label: "صفر" },
  { value: "03", label: "ربيع الأول" }, { value: "04", label: "ربيع الثاني" },
  { value: "05", label: "جمادى الأولى" }, { value: "06", label: "جمادى الآخرة" },
  { value: "07", label: "رجب" }, { value: "08", label: "شعبان" },
  { value: "09", label: "رمضان" }, { value: "10", label: "شوال" },
  { value: "11", label: "ذو القعدة" }, { value: "12", label: "ذو الحجة" },
];

const WEEKDAY_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const COLORS = {
  haram: "#2563eb", haramLight: "#dbeafe",
  nabawi: "#059669", nabawiLight: "#d1fae5",
  umrah: "#7c3aed", umrahLight: "#ede9fe",
  rawdah: "#0891b2", rawdahLight: "#cffafe",
  carts: "#ca8a04", cartsLight: "#fef9c3",
  salam: "#0d9488", salamLight: "#ccfbf1",
  hijr: "#e11d48", hijrLight: "#ffe4e6",
  accent: "#f97316",
};

function fmt(num) {
  if (num === null || num === undefined) return "—";
  return Number(num).toLocaleString("ar-SA");
}
function fmtK(num) {
  if (!num) return "٠";
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(".", "٫") + " م";
  if (num >= 1000) return (num / 1000).toFixed(0) + " ألف";
  return fmt(num);
}
function pct(val, total) {
  if (!total) return 0;
  return Math.round((val / total) * 100);
}
function getDay(dateStr) {
  return dateStr ? parseInt(dateStr.split("-")[2]) : 0;
}
function getMonthName(m) {
  return HIJRI_MONTHS.find(h => h.value === m)?.label || m;
}

// ─── Get Hijri weekday ──────────────────────────────────────────
function getHijriWeekday(dateHijri) {
  try {
    const m = momentHijri(dateHijri, "iYYYY-iMM-iDD");
    return m.isValid() ? m.day() : -1;
  } catch { return -1; }
}

// Auto-classify day based on Hijri date
function classifyDay(dateHijri) {
  const parts = dateHijri.split("-");
  if (parts.length !== 3) return "عادي";
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  const weekday = getHijriWeekday(dateHijri);
  if (month === 9) return "رمضان";
  if (month === 12 && day >= 8 && day <= 13) return "موسم حج";
  if (month === 12) return "ذو الحجة";
  if (weekday === 5) return "جمعة";
  return "عادي";
}

// ─── Sparkline (mini chart) ─────────────────────────────────────
function Sparkline({ data, dataKey, color, height = 32 }) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5}
          fill={`url(#spark-${dataKey})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────
function KpiCard({ title, value, prevValue, icon: Icon, color, bgColor, sparkData, sparkKey, subtitle }) {
  const safeVal = Number(value) || 0;
  const safePrev = Number(prevValue) || 0;
  const change = safePrev > 0 && safeVal > 0 ? ((safeVal - safePrev) / safePrev * 100) : null;
  const isUp = change !== null && change > 0;
  const isDown = change !== null && change < 0;

  return (
    <Card className="border overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5" data-testid={`kpi-${sparkKey || 'card'}`}>
      <CardContent className="p-0">
        <div className="p-3 pb-1">
          <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: bgColor }}>
              <Icon className="w-4.5 h-4.5" style={{ color }} />
            </div>
            {change !== null && (
              <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold
                ${isUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  isDown ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-slate-100 text-slate-500'}`}>
                {isUp ? <ArrowUpRight className="w-3 h-3" /> : isDown ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {Math.abs(change).toFixed(1)}٪
              </div>
            )}
          </div>
          <p className="text-xl font-bold font-cairo tabular-nums" style={{ color }}>{fmtK(value)}</p>
          <p className="text-[10px] text-muted-foreground font-cairo mt-0.5 leading-tight">{title}</p>
          {subtitle && <p className="text-[9px] text-muted-foreground/60 font-cairo">{subtitle}</p>}
        </div>
        {sparkData?.length > 1 && (
          <div className="mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <Sparkline data={sparkData} dataKey={sparkKey} color={color} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-xl shadow-2xl p-3 text-xs font-cairo min-w-[160px]" dir="rtl">
      <p className="font-bold mb-2 text-primary border-b pb-1">يوم {label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </span>
          <span className="font-bold tabular-nums">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Heat Map Calendar ──────────────────────────────────────────
function HeatMapCalendar({ items, daysInMonth, field, label, color = "#10b981" }) {
  const maxVal = useMemo(() => {
    let m = 0;
    items.forEach(i => { if ((i[field] || 0) > m) m = i[field]; });
    return m || 1;
  }, [items, field]);

  return (
    <div>
      <p className="text-[11px] font-cairo font-bold text-muted-foreground mb-2">{label}</p>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const item = items.find(d => getDay(d.date_hijri) === day);
          const val = item ? (item[field] || 0) : 0;
          const intensity = val / maxVal;
          const bg = val === 0 ? "hsl(var(--muted))" : `rgba(${hexToRgb(color)},${0.15 + intensity * 0.85})`;
          const textColor = intensity > 0.5 ? "white" : "hsl(var(--muted-foreground))";
          const dayClass = item ? classifyDay(item.date_hijri) : "";
          return (
            <div key={day}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[9px] font-bold transition-all hover:scale-110 cursor-default relative
                ${dayClass === 'جمعة' ? 'ring-1 ring-amber-400' : ''} ${dayClass === 'رمضان' ? 'ring-1 ring-purple-400' : ''}`}
              style={{ backgroundColor: bg, color: textColor }}
              title={`يوم ${day}: ${fmt(val)}${dayClass !== 'عادي' ? ` (${dayClass})` : ''}`}
            >
              {day}
              {val > 0 && <span className="text-[6px] opacity-70">{fmtK(val)}</span>}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(var(--muted))" }} />
          <span className="text-[8px] text-muted-foreground">لا بيانات</span>
        </div>
        <div className="flex items-center gap-0.5">
          {[0.2, 0.4, 0.6, 0.8, 1].map(i => (
            <div key={i} className="w-3 h-3 rounded" style={{ backgroundColor: `rgba(${hexToRgb(color)},${i})` }} />
          ))}
          <span className="text-[8px] text-muted-foreground mr-1">ذروة</span>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─── Comparison Table ───────────────────────────────────────────
function ComparisonTable({ current, compare, currentLabel, compareLabel }) {
  if (!current || !compare) return null;
  const metrics = [
    { key: "sum_haram_worshippers", label: "مصلين الحرام", icon: Building2, color: COLORS.haram },
    { key: "sum_haram_umrah", label: "المعتمرين", icon: Users2, color: COLORS.umrah },
    { key: "sum_haram_hijr_ismail", label: "حجر إسماعيل", icon: Target, color: COLORS.hijr },
    { key: "sum_haram_carts", label: "العربات", icon: Activity, color: COLORS.carts },
    { key: "sum_nabawi_worshippers", label: "مصلين النبوي", icon: Building2, color: COLORS.nabawi },
    { key: "sum_nabawi_rawdah_men_actual", label: "الروضة رجال فعلي", icon: Users2, color: COLORS.rawdah },
    { key: "sum_nabawi_rawdah_women_actual", label: "الروضة نساء فعلي", icon: Users2, color: COLORS.rawdah },
    { key: "sum_nabawi_salam_corridor", label: "ممر السلام", icon: Layers, color: COLORS.salam },
    { key: "avg_haram_worshippers", label: "متوسط يومي - الحرام", icon: BarChart3, color: COLORS.haram },
    { key: "avg_nabawi_worshippers", label: "متوسط يومي - النبوي", icon: BarChart3, color: COLORS.nabawi },
  ];

  return (
    <Card data-testid="comparison-table">
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b bg-gradient-to-l from-blue-50/50 to-emerald-50/50 dark:from-blue-950/20 dark:to-emerald-950/20">
          <h3 className="font-cairo font-bold text-sm flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-primary" />
            جدول المقارنة
          </h3>
        </div>
        <div className="divide-y">
          {/* Header */}
          <div className="grid grid-cols-4 text-[10px] font-bold text-muted-foreground px-4 py-2 bg-muted/30">
            <div>المؤشر</div>
            <div className="text-center">{currentLabel}</div>
            <div className="text-center">{compareLabel}</div>
            <div className="text-center">التغيير</div>
          </div>
          {metrics.map(m => {
            const curVal = current[m.key] || 0;
            const cmpVal = compare[m.key] || 0;
            const diff = cmpVal > 0 ? ((curVal - cmpVal) / cmpVal * 100) : null;
            const Icon = m.icon;
            return (
              <div key={m.key} className="grid grid-cols-4 items-center px-4 py-2.5 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                  <span className="text-[11px] font-cairo font-semibold">{m.label}</span>
                </div>
                <div className="text-center text-[12px] font-bold tabular-nums">{fmt(Math.round(curVal))}</div>
                <div className="text-center text-[12px] font-bold tabular-nums text-muted-foreground">{fmt(Math.round(cmpVal))}</div>
                <div className="text-center">
                  {diff !== null ? (
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold
                      ${diff > 0 ? 'bg-emerald-100 text-emerald-700' : diff < 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                      {diff > 0 ? <ArrowUpRight className="w-3 h-3" /> : diff < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {Math.abs(diff).toFixed(1)}٪
                    </span>
                  ) : <span className="text-[10px] text-muted-foreground">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Auto Insight Generator ─────────────────────────────────────
function generateInsights(summary, prevSummary, items) {
  const insights = [];
  if (!summary?.count) return insights;

  const sh = summary.sum_haram_worshippers || 0;
  const sn = summary.sum_nabawi_worshippers || 0;
  const total = sh + sn;
  const ph = prevSummary?.sum_haram_worshippers || 0;
  const pn = prevSummary?.sum_nabawi_worshippers || 0;

  // Total change
  if (ph > 0) {
    const chg = ((sh - ph) / ph * 100).toFixed(1);
    if (chg > 0) insights.push({ type: "up", text: `ارتفع إجمالي مصلين الحرام بنسبة ${chg}٪ مقارنة بالفترة السابقة` });
    else if (chg < 0) insights.push({ type: "down", text: `انخفض إجمالي مصلين الحرام بنسبة ${Math.abs(chg)}٪ مقارنة بالفترة السابقة` });
    else insights.push({ type: "stable", text: `إجمالي مصلين الحرام مستقر مقارنة بالفترة السابقة` });
  }

  // Rawdah occupancy
  const rawdahMenPub = summary.sum_nabawi_rawdah_men_published || 0;
  const rawdahMenAct = summary.sum_nabawi_rawdah_men_actual || 0;
  if (rawdahMenPub > 0) {
    const occ = pct(rawdahMenAct, rawdahMenPub);
    insights.push({ type: occ > 90 ? "up" : occ < 60 ? "down" : "stable",
      text: `نسبة إشغال الروضة (رجال): ${occ}٪ من الطاقة المنشورة` });
  }

  // Peak day
  if (summary.max_haram_worshippers_date) {
    const peakDay = getDay(summary.max_haram_worshippers_date);
    insights.push({ type: "peak", text: `أعلى يوم حشود في الحرام: يوم ${peakDay} بعدد ${fmt(summary.max_haram_worshippers)} مصلي` });
  }

  // Distribution
  if (total > 0) {
    const haramPct = pct(sh, total);
    insights.push({ type: "info", text: `توزيع المصلين: ${haramPct}٪ في الحرام و ${100 - haramPct}٪ في النبوي` });
  }

  // Average
  if (summary.avg_haram_worshippers) {
    insights.push({ type: "info", text: `المتوسط اليومي: ${fmt(Math.round(summary.avg_haram_worshippers))} مصلي في الحرام و ${fmt(Math.round(summary.avg_nabawi_worshippers || 0))} في النبوي` });
  }

  // Weekday pattern
  if (items.length > 6) {
    const weekdaySums = {};
    items.forEach(item => {
      const wd = getHijriWeekday(item.date_hijri);
      if (wd >= 0) {
        weekdaySums[wd] = (weekdaySums[wd] || 0) + (item.haram_worshippers || 0) + (item.nabawi_worshippers || 0);
      }
    });
    const maxWd = Object.entries(weekdaySums).sort((a, b) => b[1] - a[1])[0];
    if (maxWd) {
      insights.push({ type: "peak", text: `أكثر أيام الأسبوع ازدحاماً: ${WEEKDAY_AR[parseInt(maxWd[0])]}` });
    }
  }

  return insights;
}

// ─── Main Page ──────────────────────────────────────────────────
export default function StatsAnalyticsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();

  const currentHijri = useMemo(() => {
    const m = momentHijri();
    return { year: m.iYear().toString(), month: String(m.iMonth() + 1).padStart(2, "0") };
  }, []);

  // Time mode
  const [timeMode, setTimeMode] = useState("monthly"); // daily, weekly, monthly, yearly

  // Period selection
  const [filterYear, setFilterYear] = useState(currentHijri.year);
  const [filterMonth, setFilterMonth] = useState(currentHijri.month);

  // Comparison
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareYear, setCompareYear] = useState(() => String(parseInt(currentHijri.year) - 1));
  const [compareMonth, setCompareMonth] = useState(currentHijri.month);

  // Data
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [prevSummary, setPrevSummary] = useState(null);
  const [compareItems, setCompareItems] = useState([]);
  const [compareSummary, setCompareSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const hijriYears = useMemo(() => {
    const c = parseInt(currentHijri.year);
    return Array.from({ length: 10 }, (_, i) => (c - 7 + i).toString());
  }, [currentHijri.year]);

  const daysInMonth = useMemo(() => {
    const m = momentHijri(`${filterYear}-${filterMonth}-01`, "iYYYY-iMM-iDD");
    return m.isValid() ? m.iDaysInMonth() : 30;
  }, [filterYear, filterMonth]);

  const periodLabel = useMemo(() => {
    if (timeMode === "yearly") return `${filterYear} هـ`;
    return `${getMonthName(filterMonth)} ${filterYear} هـ`;
  }, [timeMode, filterYear, filterMonth]);

  const comparePeriodLabel = useMemo(() => {
    if (timeMode === "yearly") return `${compareYear} هـ`;
    return `${getMonthName(compareMonth)} ${compareYear} هـ`;
  }, [timeMode, compareYear, compareMonth]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const h = { headers: headers() };
      const params = timeMode === "yearly"
        ? { year: filterYear, limit: 400 }
        : { month: filterMonth, year: filterYear, limit: 200 };

      const [dataRes, sumRes] = await Promise.all([
        axios.get(`${API}/daily-stats`, { ...h, params }),
        axios.get(`${API}/daily-stats/summary`, { ...h, params: timeMode === "yearly" ? { year: filterYear } : { month: filterMonth, year: filterYear } }),
      ]);
      setItems(dataRes.data.items || []);
      setSummary(sumRes.data);

      // Previous period for KPI arrows
      let prevParams;
      if (timeMode === "yearly") {
        prevParams = { year: String(parseInt(filterYear) - 1) };
      } else {
        let pm = String(parseInt(filterMonth) - 1).padStart(2, "0");
        let py = filterYear;
        if (pm === "00") { pm = "12"; py = String(parseInt(filterYear) - 1); }
        prevParams = { month: pm, year: py };
      }
      const prevRes = await axios.get(`${API}/daily-stats/summary`, { ...h, params: prevParams }).catch(() => ({ data: {} }));
      setPrevSummary(prevRes.data);

      // Comparison data
      if (compareEnabled) {
        const cmpParams = timeMode === "yearly"
          ? { year: compareYear, limit: 400 }
          : { month: compareMonth, year: compareYear, limit: 200 };
        const cmpSumParams = timeMode === "yearly"
          ? { year: compareYear }
          : { month: compareMonth, year: compareYear };
        const [cmpDataRes, cmpSumRes] = await Promise.all([
          axios.get(`${API}/daily-stats`, { ...h, params: cmpParams }),
          axios.get(`${API}/daily-stats/summary`, { ...h, params: cmpSumParams }),
        ]);
        setCompareItems(cmpDataRes.data.items || []);
        setCompareSummary(cmpSumRes.data);
      } else {
        setCompareItems([]);
        setCompareSummary(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterMonth, compareYear, compareMonth, compareEnabled, timeMode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Computed Data ──────────────────────────────────────────
  const sparkData = useMemo(() => {
    return items.sort((a, b) => a.date_hijri.localeCompare(b.date_hijri)).map(item => ({
      day: getDay(item.date_hijri),
      haram: item.haram_worshippers || 0,
      nabawi: item.nabawi_worshippers || 0,
      umrah: item.haram_umrah || 0,
    }));
  }, [items]);

  const chartData = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.date_hijri.localeCompare(b.date_hijri));

    if (timeMode === "weekly" && sorted.length > 0) {
      // Group by week
      const weeks = {};
      sorted.forEach(item => {
        const day = getDay(item.date_hijri);
        const weekNum = Math.ceil(day / 7);
        if (!weeks[weekNum]) weeks[weekNum] = { week: weekNum, label: `أسبوع ${weekNum}`, haram: 0, nabawi: 0, umrah: 0, hijr: 0, carts: 0, salam: 0, rawdah_men: 0, rawdah_women: 0, count: 0 };
        weeks[weekNum].haram += item.haram_worshippers || 0;
        weeks[weekNum].nabawi += item.nabawi_worshippers || 0;
        weeks[weekNum].umrah += item.haram_umrah || 0;
        weeks[weekNum].hijr += item.haram_hijr_ismail || 0;
        weeks[weekNum].carts += item.haram_carts || 0;
        weeks[weekNum].salam += item.nabawi_salam_corridor || 0;
        weeks[weekNum].rawdah_men += item.nabawi_rawdah_men_actual || 0;
        weeks[weekNum].rawdah_women += item.nabawi_rawdah_women_actual || 0;
        weeks[weekNum].count += 1;
      });
      return Object.values(weeks).sort((a, b) => a.week - b.week);
    }

    if (timeMode === "yearly" && sorted.length > 0) {
      // Group by month
      const months = {};
      sorted.forEach(item => {
        const m = item.date_hijri.split("-")[1];
        if (!months[m]) months[m] = { month: m, label: getMonthName(m), haram: 0, nabawi: 0, umrah: 0, hijr: 0, carts: 0, salam: 0, rawdah_men: 0, rawdah_women: 0, count: 0 };
        months[m].haram += item.haram_worshippers || 0;
        months[m].nabawi += item.nabawi_worshippers || 0;
        months[m].umrah += item.haram_umrah || 0;
        months[m].hijr += item.haram_hijr_ismail || 0;
        months[m].carts += item.haram_carts || 0;
        months[m].salam += item.nabawi_salam_corridor || 0;
        months[m].rawdah_men += item.nabawi_rawdah_men_actual || 0;
        months[m].rawdah_women += item.nabawi_rawdah_women_actual || 0;
        months[m].count += 1;
      });
      return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
    }

    // Daily (default)
    return sorted.map(item => ({
      day: getDay(item.date_hijri),
      label: `${getDay(item.date_hijri)}`,
      haram: item.haram_worshippers || 0,
      nabawi: item.nabawi_worshippers || 0,
      umrah: item.haram_umrah || 0,
      hijr: item.haram_hijr_ismail || 0,
      carts: item.haram_carts || 0,
      salam: item.nabawi_salam_corridor || 0,
      rawdah_men: item.nabawi_rawdah_men_actual || 0,
      rawdah_women: item.nabawi_rawdah_women_actual || 0,
    }));
  }, [items, timeMode]);

  // Comparison overlay data
  const comparisonChartData = useMemo(() => {
    if (!compareEnabled || !compareItems.length) return null;
    const cmpSorted = [...compareItems].sort((a, b) => a.date_hijri.localeCompare(b.date_hijri));
    // Merge with current data by day number
    const merged = chartData.map(cur => {
      const cmpItem = timeMode === "yearly"
        ? cmpSorted.find(c => c.date_hijri?.split("-")[1] === cur.month)
        : cmpSorted.find(c => getDay(c.date_hijri) === cur.day);
      return {
        ...cur,
        cmp_haram: cmpItem ? (cmpItem.haram_worshippers || 0) : 0,
        cmp_nabawi: cmpItem ? (cmpItem.nabawi_worshippers || 0) : 0,
      };
    });
    return merged;
  }, [chartData, compareItems, compareEnabled, timeMode]);

  // Pie data
  const pieData = useMemo(() => {
    if (!summary?.count) return [];
    return [
      { name: "مصلين الحرام", value: summary.sum_haram_worshippers || 0, color: COLORS.haram },
      { name: "المعتمرين", value: summary.sum_haram_umrah || 0, color: COLORS.umrah },
      { name: "حجر إسماعيل", value: summary.sum_haram_hijr_ismail || 0, color: COLORS.hijr },
      { name: "العربات", value: summary.sum_haram_carts || 0, color: COLORS.carts },
      { name: "مصلين النبوي", value: summary.sum_nabawi_worshippers || 0, color: COLORS.nabawi },
      { name: "ممر السلام", value: summary.sum_nabawi_salam_corridor || 0, color: COLORS.salam },
    ].filter(d => d.value > 0);
  }, [summary]);

  // Radar data
  const radarData = useMemo(() => {
    if (!summary?.count) return [];
    const maxH = summary.max_haram_worshippers || 1;
    const maxN = summary.max_nabawi_worshippers || 1;
    const maxU = summary.max_haram_umrah || 1;
    const normalize = (v, m) => m > 0 ? Math.round((v / m) * 100) : 0;
    return [
      { metric: "المصلين", haram: normalize(summary.avg_haram_worshippers, maxH) * 100, nabawi: normalize(summary.avg_nabawi_worshippers, maxN) * 100 },
      { metric: "الحد الأعلى", haram: 100 * 100, nabawi: 100 * 100 },
      { metric: "الحد الأدنى", haram: normalize(summary.min_haram_worshippers, maxH) * 100, nabawi: normalize(summary.min_nabawi_worshippers, maxN) * 100 },
      { metric: "المتوسط", haram: normalize(summary.avg_haram_worshippers, maxH) * 100, nabawi: normalize(summary.avg_nabawi_worshippers, maxN) * 100 },
    ];
  }, [summary]);

  // Weekday distribution
  const weekdayData = useMemo(() => {
    if (!items.length) return [];
    const sums = {};
    const counts = {};
    items.forEach(item => {
      const wd = getHijriWeekday(item.date_hijri);
      if (wd >= 0) {
        sums[wd] = (sums[wd] || 0) + (item.haram_worshippers || 0) + (item.nabawi_worshippers || 0);
        counts[wd] = (counts[wd] || 0) + 1;
      }
    });
    return WEEKDAY_AR.map((name, i) => ({
      name,
      total: sums[i] || 0,
      avg: counts[i] ? Math.round((sums[i] || 0) / counts[i]) : 0,
    }));
  }, [items]);

  // Rawdah occupancy
  const rawdahOccupancy = useMemo(() => {
    if (!summary) return { men: null, women: null };
    const menPub = summary.sum_nabawi_rawdah_men_published || 0;
    const menAct = summary.sum_nabawi_rawdah_men_actual || 0;
    const womenPub = summary.sum_nabawi_rawdah_women_published || 0;
    const womenAct = summary.sum_nabawi_rawdah_women_actual || 0;
    return {
      men: menPub > 0 ? pct(menAct, menPub) : null,
      women: womenPub > 0 ? pct(womenAct, womenPub) : null,
    };
  }, [summary]);

  // Insights
  const insights = useMemo(() => generateInsights(summary, prevSummary, items), [summary, prevSummary, items]);

  const xKey = timeMode === "weekly" ? "label" : timeMode === "yearly" ? "label" : "day";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-cairo">جاري تحميل التحليلات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl" data-testid="stats-analytics-page">
      {/* ─── Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg lg:text-xl font-bold font-cairo flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              لوحة التحليلات
            </h1>
            <p className="text-[11px] text-muted-foreground font-cairo">
              تحليل شامل لبيانات الحشود — {periodLabel}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1.5 py-1 px-3">
            <CalendarDays className="w-3 h-3" />
            {summary?.count ?? 0} يوم مسجل
          </Badge>
        </div>

        {/* Controls Bar */}
        <Card className="border-primary/10">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Time Mode Tabs */}
              <Tabs value={timeMode} onValueChange={setTimeMode} dir="rtl">
                <TabsList className="h-8">
                  <TabsTrigger value="daily" className="text-[10px] px-3 h-7 font-cairo" data-testid="mode-daily">يومي</TabsTrigger>
                  <TabsTrigger value="weekly" className="text-[10px] px-3 h-7 font-cairo" data-testid="mode-weekly">أسبوعي</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-[10px] px-3 h-7 font-cairo" data-testid="mode-monthly">شهري</TabsTrigger>
                  <TabsTrigger value="yearly" className="text-[10px] px-3 h-7 font-cairo" data-testid="mode-yearly">سنوي</TabsTrigger>
                </TabsList>
              </Tabs>

              <Separator orientation="vertical" className="h-6" />

              {/* Period Filters */}
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[100px] h-8 text-[11px]" data-testid="filter-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hijriYears.map(y => <SelectItem key={y} value={y}>{y} هـ</SelectItem>)}
                </SelectContent>
              </Select>
              {timeMode !== "yearly" && (
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-[110px] h-8 text-[11px]" data-testid="filter-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HIJRI_MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              <Separator orientation="vertical" className="h-6" />

              {/* Compare Toggle */}
              <Button variant={compareEnabled ? "default" : "outline"} size="sm" className="h-8 gap-1.5 text-[10px]"
                onClick={() => setCompareEnabled(!compareEnabled)} data-testid="compare-toggle">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                {compareEnabled ? "إلغاء المقارنة" : "مقارنة"}
              </Button>

              {compareEnabled && (
                <>
                  <Select value={compareYear} onValueChange={setCompareYear}>
                    <SelectTrigger className="w-[100px] h-8 text-[11px]" data-testid="compare-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hijriYears.map(y => <SelectItem key={y} value={y}>{y} هـ</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {timeMode !== "yearly" && (
                    <Select value={compareMonth} onValueChange={setCompareMonth}>
                      <SelectTrigger className="w-[110px] h-8 text-[11px]" data-testid="compare-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HIJRI_MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── KPI Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="إجمالي مصلين الحرام" value={summary?.sum_haram_worshippers} prevValue={prevSummary?.sum_haram_worshippers}
          icon={Building2} color={COLORS.haram} bgColor={COLORS.haramLight} sparkData={sparkData} sparkKey="haram" />
        <KpiCard title="إجمالي المعتمرين" value={summary?.sum_haram_umrah} prevValue={prevSummary?.sum_haram_umrah}
          icon={Users2} color={COLORS.umrah} bgColor={COLORS.umrahLight} sparkData={sparkData} sparkKey="umrah" />
        <KpiCard title="إجمالي مصلين النبوي" value={summary?.sum_nabawi_worshippers} prevValue={prevSummary?.sum_nabawi_worshippers}
          icon={Building2} color={COLORS.nabawi} bgColor={COLORS.nabawiLight} sparkData={sparkData} sparkKey="nabawi" />
        <KpiCard title="إجمالي الحرمين" value={(summary?.sum_haram_worshippers || 0) + (summary?.sum_nabawi_worshippers || 0)}
          prevValue={(prevSummary?.sum_haram_worshippers || 0) + (prevSummary?.sum_nabawi_worshippers || 0)}
          icon={Layers} color="#334155" bgColor="#f1f5f9" sparkKey="total"
          subtitle={`${summary?.count || 0} يوم × متوسط ${fmtK(summary?.avg_haram_worshippers)}`} />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="متوسط يومي — الحرام" value={summary?.avg_haram_worshippers ? Math.round(summary.avg_haram_worshippers) : 0}
          prevValue={prevSummary?.avg_haram_worshippers ? Math.round(prevSummary.avg_haram_worshippers) : 0}
          icon={BarChart3} color={COLORS.carts} bgColor={COLORS.cartsLight} sparkKey="avg-h" />
        <KpiCard title="متوسط يومي — النبوي" value={summary?.avg_nabawi_worshippers ? Math.round(summary.avg_nabawi_worshippers) : 0}
          prevValue={prevSummary?.avg_nabawi_worshippers ? Math.round(prevSummary.avg_nabawi_worshippers) : 0}
          icon={BarChart3} color={COLORS.salam} bgColor={COLORS.salamLight} sparkKey="avg-n" />
        <KpiCard title="إشغال الروضة (رجال)" value={rawdahOccupancy.men} prevValue={null}
          icon={Target} color={COLORS.rawdah} bgColor={COLORS.rawdahLight} sparkKey="rawdah-m"
          subtitle={rawdahOccupancy.men !== null ? `${rawdahOccupancy.men}٪ من المنشور` : "لا بيانات"} />
        <KpiCard title="إشغال الروضة (نساء)" value={rawdahOccupancy.women} prevValue={null}
          icon={Target} color={COLORS.hijr} bgColor={COLORS.hijrLight} sparkKey="rawdah-w"
          subtitle={rawdahOccupancy.women !== null ? `${rawdahOccupancy.women}٪ من المنشور` : "لا بيانات"} />
      </div>

      {/* ─── Auto Insights ─────────────────────────────────── */}
      {insights.length > 0 && (
        <Card className="border-amber-200/50 bg-gradient-to-l from-amber-50/30 to-transparent dark:from-amber-950/10" data-testid="insights-card">
          <CardContent className="p-4">
            <h3 className="font-cairo font-bold text-sm flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              ملخص تلقائي
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] font-cairo leading-relaxed">
                  <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[8px]
                    ${ins.type === 'up' ? 'bg-emerald-100 text-emerald-600' :
                      ins.type === 'down' ? 'bg-red-100 text-red-600' :
                      ins.type === 'peak' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'}`}>
                    {ins.type === 'up' ? '↑' : ins.type === 'down' ? '↓' : ins.type === 'peak' ? '★' : '●'}
                  </span>
                  <span>{ins.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Main Line Chart ───────────────────────────────── */}
      <Card data-testid="line-chart">
        <CardContent className="p-4">
          <h3 className="font-cairo font-bold text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {timeMode === "yearly" ? "المصلين حسب الشهر" : timeMode === "weekly" ? "المصلين حسب الأسبوع" : "المصلين يومياً"}
            {compareEnabled && <Badge variant="outline" className="text-[9px] mr-2">مع مقارنة</Badge>}
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={comparisonChartData || chartData}>
                <defs>
                  <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--border))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--border))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => fmtK(v)} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span className="text-[10px] font-cairo">{v}</span>} />
                <Line type="monotone" dataKey="haram" name="الحرام" stroke={COLORS.haram} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.haram }} activeDot={{ r: 6, stroke: COLORS.haram, strokeWidth: 2, fill: "white" }} />
                <Line type="monotone" dataKey="nabawi" name="النبوي" stroke={COLORS.nabawi} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.nabawi }} activeDot={{ r: 6, stroke: COLORS.nabawi, strokeWidth: 2, fill: "white" }} />
                {compareEnabled && comparisonChartData && (
                  <>
                    <Line type="monotone" dataKey="cmp_haram" name={`الحرام (${comparePeriodLabel})`} stroke={COLORS.haram} strokeWidth={1.5} strokeDasharray="5 5" dot={false} opacity={0.5} />
                    <Line type="monotone" dataKey="cmp_nabawi" name={`النبوي (${comparePeriodLabel})`} stroke={COLORS.nabawi} strokeWidth={1.5} strokeDasharray="5 5" dot={false} opacity={0.5} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm font-cairo">لا توجد بيانات لهذه الفترة</div>
          )}
        </CardContent>
      </Card>

      {/* ─── Bar + Pie Row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Stacked Bar Chart */}
        <Card className="lg:col-span-3" data-testid="bar-chart">
          <CardContent className="p-4">
            <h3 className="font-cairo font-bold text-sm mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              تفاصيل المؤشرات
            </h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey={xKey} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => fmtK(v)} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={v => <span className="text-[9px] font-cairo">{v}</span>} />
                  <Bar dataKey="umrah" name="المعتمرين" fill={COLORS.umrah} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="hijr" name="حجر إسماعيل" fill={COLORS.hijr} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="carts" name="العربات" fill={COLORS.carts} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="salam" name="ممر السلام" fill={COLORS.salam} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm font-cairo">لا توجد بيانات</div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="lg:col-span-2" data-testid="pie-chart">
          <CardContent className="p-4">
            <h3 className="font-cairo font-bold text-sm mb-4 text-center">توزيع الحشود</h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} innerRadius={50} paddingAngle={2} dataKey="value">
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="hsl(var(--background))" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="font-cairo">{d.name}</span>
                      </div>
                      <span className="font-bold tabular-nums">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm font-cairo">لا توجد بيانات</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Weekday Distribution ──────────────────────────── */}
      {weekdayData.length > 0 && (
        <Card data-testid="weekday-chart">
          <CardContent className="p-4">
            <h3 className="font-cairo font-bold text-sm mb-4 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              توزيع أيام الأسبوع
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weekdayData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => fmtK(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="إجمالي المصلين" radius={[0, 6, 6, 0]}>
                  {weekdayData.map((entry, i) => (
                    <Cell key={i} fill={entry.name === "الجمعة" ? COLORS.accent : COLORS.haram} opacity={entry.name === "الجمعة" ? 1 : 0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ─── Heat Maps ─────────────────────────────────────── */}
      {timeMode !== "yearly" && (
        <Card data-testid="heatmap">
          <CardContent className="p-4">
            <h3 className="font-cairo font-bold text-sm mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              خريطة الكثافة — {periodLabel}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HeatMapCalendar items={items} daysInMonth={daysInMonth} field="haram_worshippers" label="المسجد الحرام — المصلين" color={COLORS.haram} />
              <HeatMapCalendar items={items} daysInMonth={daysInMonth} field="nabawi_worshippers" label="المسجد النبوي — المصلين" color={COLORS.nabawi} />
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HeatMapCalendar items={items} daysInMonth={daysInMonth} field="haram_umrah" label="المعتمرين" color={COLORS.umrah} />
              <HeatMapCalendar items={items} daysInMonth={daysInMonth} field="nabawi_rawdah_men_actual" label="الروضة رجال (فعلي)" color={COLORS.rawdah} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Rawdah Occupancy Detail ───────────────────────── */}
      {summary?.sum_nabawi_rawdah_men_published > 0 && (
        <Card data-testid="rawdah-detail">
          <CardContent className="p-4">
            <h3 className="font-cairo font-bold text-sm mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              تحليل الروضة — المنشور vs المحجوز vs الفعلي
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey={xKey} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => fmtK(v)} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span className="text-[9px] font-cairo">{v}</span>} />
                <Bar dataKey="rawdah_men" name="رجال فعلي" fill={COLORS.rawdah} radius={[2, 2, 0, 0]} />
                <Bar dataKey="rawdah_women" name="نساء فعلي" fill={COLORS.hijr} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ─── Comparison Table ──────────────────────────────── */}
      {compareEnabled && compareSummary?.count > 0 && (
        <ComparisonTable current={summary} compare={compareSummary} currentLabel={periodLabel} compareLabel={comparePeriodLabel} />
      )}
    </div>
  );
}
