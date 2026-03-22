import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import momentHijri from "moment-hijri";
import {
  TrendingUp, TrendingDown, Calendar, BarChart3, Building2, Users2,
  ArrowUpRight, ArrowDownRight, Minus, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const HIJRI_MONTHS = [
  { value: "01", label: "محرم" }, { value: "02", label: "صفر" },
  { value: "03", label: "ربيع الأول" }, { value: "04", label: "ربيع الثاني" },
  { value: "05", label: "جمادى الأولى" }, { value: "06", label: "جمادى الآخرة" },
  { value: "07", label: "رجب" }, { value: "08", label: "شعبان" },
  { value: "09", label: "رمضان" }, { value: "10", label: "شوال" },
  { value: "11", label: "ذو القعدة" }, { value: "12", label: "ذو الحجة" },
];

function fmt(num) {
  if (!num && num !== 0) return "٠";
  return Number(num).toLocaleString("ar-SA");
}

function getDay(dateStr) {
  return dateStr ? parseInt(dateStr.split("-")[2]) : 0;
}

// ─── KPI Card ───────────────────────────────────────────────────
function KpiCard({ title, value, prevValue, icon: Icon, color, bgColor }) {
  const change = prevValue && prevValue > 0 ? ((value - prevValue) / prevValue * 100) : null;
  const isUp = change > 0;
  const isDown = change < 0;

  return (
    <Card className="border overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bgColor }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          {change !== null && (
            <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${isUp ? 'bg-emerald-100 text-emerald-700' : isDown ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
              {isUp ? <ArrowUpRight className="w-3 h-3" /> : isDown ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {Math.abs(change).toFixed(1)}٪
            </div>
          )}
        </div>
        <p className="text-2xl font-bold font-cairo" style={{ color }}>{fmt(value)}</p>
        <p className="text-[11px] text-muted-foreground font-cairo mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}

// ─── Heat Map ───────────────────────────────────────────────────
function HeatMap({ items, daysInMonth, field, label }) {
  const maxVal = useMemo(() => {
    let m = 0;
    items.forEach(i => { if (i[field] > m) m = i[field]; });
    return m || 1;
  }, [items, field]);

  return (
    <div>
      <p className="text-[11px] font-cairo font-semibold text-muted-foreground mb-2 text-center">{label}</p>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const item = items.find(d => getDay(d.date_hijri) === day);
          const val = item ? (item[field] || 0) : 0;
          const intensity = val / maxVal;
          const bg = val === 0
            ? "rgb(243,244,246)"
            : `rgba(16,185,129,${0.15 + intensity * 0.85})`;
          const textColor = intensity > 0.5 ? "white" : "rgb(100,100,100)";
          return (
            <div
              key={day}
              className="aspect-square rounded-md flex items-center justify-center text-[9px] font-bold transition-all hover:scale-110 cursor-default"
              style={{ backgroundColor: bg, color: textColor }}
              title={`يوم ${day}: ${fmt(val)}`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-card border rounded-lg shadow-lg p-3 text-xs font-cairo" dir="rtl">
      <p className="font-bold mb-1.5">يوم {label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-bold tabular-nums">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function StatsAnalyticsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();

  const currentHijri = useMemo(() => {
    const m = momentHijri();
    return { year: m.iYear().toString(), month: String(m.iMonth() + 1).padStart(2, "0") };
  }, []);

  const [filterYear, setFilterYear] = useState(currentHijri.year);
  const [filterMonth, setFilterMonth] = useState(currentHijri.month);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [prevSummary, setPrevSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const hijriYears = useMemo(() => {
    const c = parseInt(currentHijri.year);
    return Array.from({ length: 7 }, (_, i) => (c - 5 + i).toString());
  }, [currentHijri.year]);

  const daysInMonth = useMemo(() => {
    const m = momentHijri(`${filterYear}-${filterMonth}-01`, "iYYYY-iMM-iDD");
    return m.isValid() ? m.iDaysInMonth() : 30;
  }, [filterYear, filterMonth]);

  const monthLabel = HIJRI_MONTHS.find(m => m.value === filterMonth)?.label || "";

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Current month
      const [dataRes, sumRes] = await Promise.all([
        axios.get(`${API}/daily-stats`, { headers, params: { month: filterMonth, year: filterYear, limit: 200 } }),
        axios.get(`${API}/daily-stats/summary`, { headers, params: { month: filterMonth, year: filterYear } }),
      ]);
      setItems(dataRes.data.items || []);
      setSummary(sumRes.data);

      // Previous month for comparison
      let prevMonth = String(parseInt(filterMonth) - 1).padStart(2, "0");
      let prevYear = filterYear;
      if (prevMonth === "00") { prevMonth = "12"; prevYear = String(parseInt(filterYear) - 1); }
      const prevRes = await axios.get(`${API}/daily-stats/summary`, { headers, params: { month: prevMonth, year: prevYear } }).catch(() => ({ data: {} }));
      setPrevSummary(prevRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Chart data
  const chartData = useMemo(() => {
    return items
      .sort((a, b) => a.date_hijri.localeCompare(b.date_hijri))
      .map(item => ({
        day: getDay(item.date_hijri),
        haram: item.haram_worshippers || 0,
        nabawi: item.nabawi_worshippers || 0,
        umrah: item.haram_umrah || 0,
        hijr: item.haram_hijr_ismail || 0,
        carts: item.haram_carts || 0,
        salam: item.nabawi_salam_corridor || 0,
      }));
  }, [items]);

  // Pie data
  const pieData = useMemo(() => {
    if (!summary || !summary.count) return [];
    return [
      { name: "المصلين - الحرام", value: summary.sum_haram_worshippers || 0, color: "#2563eb" },
      { name: "المعتمرين", value: summary.sum_haram_umrah || 0, color: "#7c3aed" },
      { name: "المصلين - النبوي", value: summary.sum_nabawi_worshippers || 0, color: "#059669" },
      { name: "ممر السلام", value: summary.sum_nabawi_salam_corridor || 0, color: "#0d9488" },
    ].filter(d => d.value > 0);
  }, [summary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl" data-testid="stats-analytics-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold font-cairo flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            تحليلات الإحصائيات
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-cairo">
            تحليل ومقارنة بيانات الحشود للمسجد الحرام والمسجد النبوي
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {hijriYears.map(y => <SelectItem key={y} value={y}>{y} هـ</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HIJRI_MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-[10px] px-2.5 py-1 gap-1.5 flex items-center">
            <Calendar className="w-3 h-3" />
            {summary?.count ?? 0} يوم
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="إجمالي مصلين الحرام" value={summary?.sum_haram_worshippers} prevValue={prevSummary?.sum_haram_worshippers} icon={Building2} color="#2563eb" bgColor="#eff6ff" />
        <KpiCard title="إجمالي المعتمرين" value={summary?.sum_haram_umrah} prevValue={prevSummary?.sum_haram_umrah} icon={Users2} color="#7c3aed" bgColor="#f5f3ff" />
        <KpiCard title="إجمالي مصلين النبوي" value={summary?.sum_nabawi_worshippers} prevValue={prevSummary?.sum_nabawi_worshippers} icon={Building2} color="#059669" bgColor="#ecfdf5" />
        <KpiCard title="متوسط يومي - الحرام" value={summary?.avg_haram_worshippers} prevValue={prevSummary?.avg_haram_worshippers} icon={BarChart3} color="#ca8a04" bgColor="#fefce8" />
      </div>

      {/* Line Chart - Daily Trend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-cairo font-bold text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            المصلين يومياً - {monthLabel} {filterYear} هـ
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v / 1000).toFixed(0) + "k"} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span className="text-xs font-cairo">{v}</span>} />
                <Line type="monotone" dataKey="haram" name="الحرام" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="nabawi" name="النبوي" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm font-cairo">لا توجد بيانات</div>
          )}
        </CardContent>
      </Card>

      {/* Bar Chart + Pie Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <h3 className="font-cairo font-bold text-sm mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              مقارنة الفئات - {monthLabel}
            </h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v / 1000).toFixed(0) + "k"} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={v => <span className="text-xs font-cairo">{v}</span>} />
                  <Bar dataKey="umrah" name="المعتمرين" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="hijr" name="حجر إسماعيل" fill="#0891b2" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="carts" name="العربات" fill="#ca8a04" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm font-cairo">لا توجد بيانات</div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-cairo font-bold text-sm mb-4 text-center">توزيع الحشود</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" outerRadius={80} innerRadius={40} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}٪`} labelLine={false}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm font-cairo">لا توجد بيانات</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Heat Maps */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-cairo font-bold text-sm mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            خريطة الازدحام - {monthLabel} {filterYear} هـ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <HeatMap items={items} daysInMonth={daysInMonth} field="haram_worshippers" label="المسجد الحرام - المصلين" />
            <HeatMap items={items} daysInMonth={daysInMonth} field="nabawi_worshippers" label="المسجد النبوي - المصلين" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
