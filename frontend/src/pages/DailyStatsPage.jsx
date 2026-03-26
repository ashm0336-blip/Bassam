import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import { toast } from "sonner";
import momentHijri from "moment-hijri";
import {
  BarChart3, Calendar, ChevronRight, ChevronLeft, Building2, Loader2, CheckCircle, Layers,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Split components
import { API, HARAM_FIELDS, NABAWI_FIELDS, HIJRI_MONTHS, getCurrentHijriDate, hijriToGregorian } from "./daily-stats/constants";
import { MonthDayBar } from "./daily-stats/MonthDayBar";
import { StatsStrip, HaramStrip, NabawiStrip } from "./daily-stats/StatsStrips";
import { DailyEntryCard } from "./daily-stats/DailyEntryCard";
import { DataTable } from "./daily-stats/DataTable";
import { ImportDialog } from "./daily-stats/ImportDialog";

export default function DailyStatsPage() {
  const { user, canRead, canWrite, canViewPage, canEditPage } = useAuth();
  const { language } = useLanguage();

  // Tab-level permissions (like Settings page)
  const isAdmin = user?.role === 'system_admin';
  const canSeeHaram = isAdmin || canRead('page_stats_haram') || canViewPage('/daily-stats?tab=haram');
  const canSeeNabawi = isAdmin || canRead('page_stats_nabawi') || canViewPage('/daily-stats?tab=nabawi');
  const canSeeCombined = isAdmin || canRead('page_stats_all') || canViewPage('/daily-stats?tab=all');

  const canEditHaram = isAdmin || canWrite('edit_stats_haram') || canEditPage('/daily-stats?tab=haram');
  const canEditNabawi = isAdmin || canWrite('edit_stats_nabawi') || canEditPage('/daily-stats?tab=nabawi');
  const canEdit = isAdmin || canWrite('edit_daily_stats') || canEditPage('/daily-stats');
  const canImport = isAdmin || canWrite('import_daily_stats') || canEditPage('/daily-stats?tab=all');

  // Determine first available tab
  const defaultTab = canSeeHaram ? "haram" : canSeeNabawi ? "nabawi" : canSeeCombined ? "all" : "haram";

  // State
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const currentHijri = getCurrentHijriDate();
  const [filterYear, setFilterYear] = useState(currentHijri.year);
  const [filterMonth, setFilterMonth] = useState(currentHijri.monthPadded);

  // Entry form
  const [selectedDateHijri, setSelectedDateHijri] = useState(currentHijri.formatted);
  const [formData, setFormData] = useState({});

  // Dialogs
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Available Hijri years
  const hijriYears = useMemo(() => {
    const current = parseInt(currentHijri.year);
    return Array.from({ length: 7 }, (_, i) => (current - 5 + i).toString());
  }, [currentHijri.year]);

  // ─── Data Fetching ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = { month: filterMonth, year: filterYear, page, limit: 50 };
      const [dataRes, summaryRes] = await Promise.all([
        axios.get(`${API}/daily-stats`, { headers: { Authorization: `Bearer ${token}` }, params }),
        axios.get(`${API}/daily-stats/summary`, { headers: { Authorization: `Bearer ${token}` }, params: { month: filterMonth, year: filterYear } }),
      ]);
      setItems(dataRes.data.items || []);
      setTotalPages(dataRes.data.pages || 1);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error("Failed to fetch daily stats:", err);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Load existing data for selected date ──────────────────
  useEffect(() => {
    if (!selectedDateHijri) return;
    const existing = items.find((i) => i.date_hijri === selectedDateHijri);
    if (existing) {
      const data = {};
      [...HARAM_FIELDS, ...NABAWI_FIELDS].forEach((f) => { data[f.key] = existing[f.key] ?? ""; });
      setFormData(data);
    } else {
      setFormData({});
    }
  }, [selectedDateHijri, items]);

  // ─── Sync date with filter ──────────────────────────────────
  useEffect(() => {
    setSelectedDateHijri(`${filterYear}-${filterMonth}-01`);
  }, [filterYear, filterMonth]);

  // ─── Date Navigation ───────────────────────────────────────
  const navigateDate = (direction) => {
    const m = momentHijri(selectedDateHijri, "iYYYY-iMM-iDD");
    if (!m.isValid()) return;
    const newDate = direction === "next" ? m.clone().add(1, "day") : m.clone().subtract(1, "day");
    const newMonth = String(newDate.iMonth() + 1).padStart(2, "0");
    const newYear = String(newDate.iYear());
    if (newMonth !== filterMonth || newYear !== filterYear) return;
    setSelectedDateHijri(newDate.format("iYYYY-iMM-iDD"));
  };

  const currentDay = useMemo(() => {
    const m = momentHijri(selectedDateHijri, "iYYYY-iMM-iDD");
    return m.isValid() ? m.iDate() : 1;
  }, [selectedDateHijri]);

  const daysInMonth = useMemo(() => {
    const m = momentHijri(`${filterYear}-${filterMonth}-01`, "iYYYY-iMM-iDD");
    return m.isValid() ? m.iDaysInMonth() : 30;
  }, [filterYear, filterMonth]);

  const gregDate = useMemo(() => hijriToGregorian(selectedDateHijri), [selectedDateHijri]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleSave = async (mosqueType) => {
    if (!selectedDateHijri) { toast.error("يرجى اختيار التاريخ"); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = { date_hijri: selectedDateHijri, date_gregorian: gregDate };
      const fields = mosqueType === "haram" ? HARAM_FIELDS : NABAWI_FIELDS;
      fields.forEach((f) => { if (formData[f.key] !== undefined && formData[f.key] !== "") payload[f.key] = formData[f.key]; });
      await axios.post(`${API}/daily-stats`, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("تم حفظ البيانات بنجاح");
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "فشل الحفظ"); }
    finally { setSaving(false); }
  };

  const handleEdit = (item) => {
    setSelectedDateHijri(item.date_hijri);
    setActiveTab("haram");
    const data = {};
    [...HARAM_FIELDS, ...NABAWI_FIELDS].forEach((f) => { data[f.key] = item[f.key] ?? ""; });
    setFormData(data);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info(`تم تحميل بيانات ${item.date_hijri} للتعديل`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/daily-stats/${deleteTarget.id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("تم الحذف بنجاح");
      setDeleteTarget(null);
      fetchData();
    } catch { toast.error("فشل الحذف"); }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/daily-stats/export/data`, {
        headers: { Authorization: `Bearer ${token}` }, params: { month: filterMonth, year: filterYear }, responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `daily_stats_${filterYear}_${filterMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("تم تصدير البيانات");
    } catch { toast.error("فشل التصدير"); }
  };

  const handleTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/daily-stats/export/template`, {
        headers: { Authorization: `Bearer ${token}` }, responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "daily_stats_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("تم تحميل القالب");
    } catch { toast.error("فشل تحميل القالب"); }
  };

  const dateHasData = useMemo(() => items.some((i) => i.date_hijri === selectedDateHijri), [items, selectedDateHijri]);

  // ─── Date Selector Card (shared between tabs) ─────────────
  const DateSelector = ({ borderColor }) => (
    <Card className={borderColor}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigateDate("next")} className="h-8 w-8" disabled={currentDay >= daysInMonth} data-testid="date-next">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold font-mono text-primary" data-testid="date-input">{selectedDateHijri}</span>
              {gregDate && <span className="text-[11px] text-muted-foreground font-mono">({gregDate})</span>}
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground font-cairo">يوم {currentDay} من {daysInMonth}</span>
              {dateHasData && (
                <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300 py-0 px-1.5">
                  <CheckCircle className="w-2.5 h-2.5 ml-0.5" />مسجل
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigateDate("prev")} className="h-8 w-8" disabled={currentDay <= 1} data-testid="date-prev">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5" dir="rtl" data-testid="daily-stats-page">
      {/* Header */}
      <div>
        <h1 className="text-xl lg:text-2xl font-bold font-cairo flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          الإحصائيات اليومية
        </h1>
        <p className="text-xs text-muted-foreground mt-1 font-cairo">إحصائيات الحشود اليومية للمسجد الحرام والمسجد النبوي</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); setPage(1); }}>
          <SelectTrigger className="w-[120px] h-9 text-xs" data-testid="filter-year"><SelectValue placeholder="السنة" /></SelectTrigger>
          <SelectContent>{hijriYears.map((y) => <SelectItem key={y} value={y}>{y} هـ</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={(v) => { setFilterMonth(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-9 text-xs" data-testid="filter-month"><SelectValue placeholder="الشهر" /></SelectTrigger>
          <SelectContent>{HIJRI_MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
        <Badge variant="secondary" className="text-[10px] px-2.5 py-1 gap-1.5 flex items-center" data-testid="record-count">
          <Calendar className="w-3 h-3" />
          {loading ? "..." : `${summary?.count ?? 0} يوم مسجل`}
        </Badge>
      </div>

      {/* Tabs — professional style like Settings page */}
      {(() => {
        const tabs = [
          { key: "haram", label: "المسجد الحرام", desc: "إحصائيات الحرم المكي", icon: Building2, color: "#2563eb", light: "#dbeafe", visible: canSeeHaram },
          { key: "nabawi", label: "المسجد النبوي", desc: "إحصائيات المسجد النبوي", icon: Building2, color: "#059669", light: "#d1fae5", visible: canSeeNabawi },
          { key: "all", label: "العرض الشامل", desc: "جميع البيانات", icon: Layers, color: "#6366f1", light: "#e0e7ff", visible: canSeeCombined },
        ].filter(t => t.visible);

        return (
      <>
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/40 border" data-testid="stats-tabs">
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                data-testid={`tab-${tab.key}`}
                className={`
                  relative flex-1 flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all duration-300
                  ${isActive
                    ? 'bg-white dark:bg-card shadow-md border-2 scale-[1.02]'
                    : 'bg-transparent border-2 border-transparent hover:bg-white/60 dark:hover:bg-card/60 hover:shadow-sm'
                  }
                `}
                style={isActive ? { borderColor: tab.color } : {}}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${isActive ? 'shadow-sm' : ''}`}
                  style={isActive ? { backgroundColor: tab.light, color: tab.color } : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs font-cairo transition-colors duration-300 ${isActive ? 'font-bold' : 'font-medium text-muted-foreground'}`}
                  style={isActive ? { color: tab.color } : {}}
                >
                  {tab.label}
                </span>
                <span className="text-[9px] text-muted-foreground font-cairo">{tab.desc}</span>
                {isActive && (
                  <div className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-1 rounded-full" style={{ backgroundColor: tab.color }} />
                )}
              </button>
            );
          })}
        </div>

        {canSeeHaram && activeTab === "haram" && (
        <div className="space-y-4 mt-4">
          <HaramStrip summary={summary} onImport={(canImport && canEditHaram) ? () => setImportOpen(true) : null} onExport={handleExport} onTemplate={handleTemplate} />
          <MonthDayBar filterYear={filterYear} filterMonth={filterMonth} daysInMonth={daysInMonth} items={items} selectedDateHijri={selectedDateHijri} onDayClick={(d) => setSelectedDateHijri(d)} checkFields={HARAM_FIELDS} />
          <DateSelector borderColor="border-blue-500/15" />
          <DailyEntryCard mosqueType="haram" fields={HARAM_FIELDS} formData={formData} setFormData={setFormData} onSave={() => handleSave("haram")} saving={saving} canEdit={canEditHaram} items={items} selectedDateHijri={selectedDateHijri} />
          <Separator />
          <h3 className="font-cairo font-semibold text-sm flex items-center gap-2"><Calendar className="w-4 h-4" />سجل الشهر - المسجد الحرام</h3>
          {loading ? <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            : <DataTable items={items} onEdit={handleEdit} onDelete={(item) => setDeleteTarget(item)} canEdit={canEditHaram} mosqueFilter="haram" />}
        </div>
        )}

        {canSeeNabawi && activeTab === "nabawi" && (
        <div className="space-y-4 mt-4">
          <NabawiStrip summary={summary} onImport={(canImport && canEditNabawi) ? () => setImportOpen(true) : null} onExport={handleExport} onTemplate={handleTemplate} />
          <MonthDayBar filterYear={filterYear} filterMonth={filterMonth} daysInMonth={daysInMonth} items={items} selectedDateHijri={selectedDateHijri} onDayClick={(d) => setSelectedDateHijri(d)} checkFields={NABAWI_FIELDS} />
          <DateSelector borderColor="border-emerald-500/15" />
          <DailyEntryCard mosqueType="nabawi" fields={NABAWI_FIELDS} formData={formData} setFormData={setFormData} onSave={() => handleSave("nabawi")} saving={saving} canEdit={canEditNabawi} items={items} selectedDateHijri={selectedDateHijri} />
          <Separator />
          <h3 className="font-cairo font-semibold text-sm flex items-center gap-2"><Calendar className="w-4 h-4" />سجل الشهر - المسجد النبوي</h3>
          {loading ? <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            : <DataTable items={items} onEdit={handleEdit} onDelete={(item) => setDeleteTarget(item)} canEdit={canEditNabawi} mosqueFilter="nabawi" />}
        </div>
        )}

        {canSeeCombined && activeTab === "all" && (
        <div className="space-y-4 mt-4">
          <StatsStrip summary={summary} onImport={(canImport && canEdit) ? () => setImportOpen(true) : null} onExport={handleExport} onTemplate={handleTemplate} />
          <h3 className="font-cairo font-semibold text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" />العرض الشامل - جميع البيانات</h3>
          {loading ? <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            : <DataTable items={items} onEdit={handleEdit} onDelete={(item) => setDeleteTarget(item)} canEdit={canEdit} mosqueFilter="all" />}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid="prev-page"><ChevronRight className="w-4 h-4" /></Button>
              <span className="text-xs text-muted-foreground font-mono">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} data-testid="next-page"><ChevronLeft className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
        )}
      </>
        );
      })()}

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onSuccess={() => { fetchData(); setImportOpen(false); }} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cairo">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="font-cairo">هل أنت متأكد من حذف بيانات يوم {deleteTarget?.date_hijri}؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="font-cairo">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-cairo" data-testid="confirm-delete">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
