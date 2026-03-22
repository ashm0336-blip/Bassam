import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import { toast } from "sonner";
import momentHijri from "moment-hijri";
import {
  BarChart3, Calendar, Upload, Download, Plus, Save, Trash2, Edit3,
  ChevronRight, ChevronLeft, FileSpreadsheet, TrendingUp, Users2,
  Building2, X, Search, Filter, Loader2, CheckCircle, AlertCircle,
  ChevronDown, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ─── Field Definitions ──────────────────────────────────────────
const HARAM_FIELDS = [
  { key: "haram_worshippers", label: "المصلين", icon: "users" },
  { key: "haram_umrah", label: "المعتمرين", icon: "users" },
  { key: "haram_hijr_ismail", label: "حجر إسماعيل", icon: "building" },
  { key: "haram_carts", label: "العربات", icon: "cart" },
];

const NABAWI_FIELDS = [
  { key: "nabawi_worshippers", label: "المصلين", icon: "users" },
  { key: "nabawi_rawdah_men_published", label: "الروضة رجال - منشور", group: "rawdah_men" },
  { key: "nabawi_rawdah_men_reserved", label: "الروضة رجال - محجوز", group: "rawdah_men" },
  { key: "nabawi_rawdah_men_actual", label: "الروضة رجال - فعلي", group: "rawdah_men" },
  { key: "nabawi_rawdah_women_published", label: "الروضة نساء - منشور", group: "rawdah_women" },
  { key: "nabawi_rawdah_women_reserved", label: "الروضة نساء - محجوز", group: "rawdah_women" },
  { key: "nabawi_rawdah_women_actual", label: "الروضة نساء - فعلي", group: "rawdah_women" },
  { key: "nabawi_salam_corridor", label: "ممر السلام", icon: "door" },
];

// Hijri month names
const HIJRI_MONTHS = [
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

function formatNumber(num) {
  if (num === null || num === undefined || num === "") return "-";
  return Number(num).toLocaleString("ar-SA");
}

function formatDateAr(dateStr) {
  if (!dateStr) return "-";
  const parts = dateStr.replace("/", "-").split("-");
  if (parts.length !== 3) return dateStr;
  const d = Number(parts[2]);
  const m = Number(parts[1]);
  const y = Number(parts[0]);
  return `${d.toLocaleString("ar-SA",{useGrouping:false})}/${m.toLocaleString("ar-SA",{useGrouping:false})}/${y.toLocaleString("ar-SA",{useGrouping:false})}`;
}

function getGregorianFromHijri(hijriDate) {
  try {
    const m = momentHijri(hijriDate, "iYYYY-iMM-iDD");
    if (m.isValid()) {
      return `${m.date().toLocaleString("ar-SA",{useGrouping:false})}/${(m.month()+1).toLocaleString("ar-SA",{useGrouping:false})}/${m.year().toLocaleString("ar-SA",{useGrouping:false})}`;
    }
  } catch {}
  return "-";
}

function getCurrentHijriDate() {
  const m = momentHijri();
  return {
    year: m.iYear().toString(),
    month: m.iMonth() + 1,
    day: m.iDate(),
    formatted: m.format("iYYYY-iMM-iDD"),
    monthPadded: String(m.iMonth() + 1).padStart(2, "0"),
  };
}

function hijriToGregorian(hijriDate) {
  try {
    const m = momentHijri(hijriDate, "iYYYY-iMM-iDD");
    if (m.isValid()) {
      return m.format("YYYY-MM-DD");
    }
  } catch {}
  return "";
}

// ─── Month Day Bar (clickable day indicators) ───────────────────
function MonthDayBar({ filterYear, filterMonth, daysInMonth, items, selectedDateHijri, onDayClick, checkFields }) {
  const dayStatus = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      const parts = item.date_hijri?.split("-");
      if (!parts || parts.length !== 3) return;
      const day = parseInt(parts[2]);
      const total = checkFields.length;
      let filled = 0;
      checkFields.forEach((f) => {
        const val = item[f.key];
        if (val !== null && val !== undefined && val !== "" && val !== "null") filled++;
      });
      if (filled === 0) map[day] = "empty";
      else if (filled < total) map[day] = "partial";
      else map[day] = "complete";
    });
    return map;
  }, [items, checkFields]);

  const selectedDay = useMemo(() => {
    const parts = selectedDateHijri?.split("-");
    return parts?.length === 3 ? parseInt(parts[2]) : 0;
  }, [selectedDateHijri]);

  const complete = Object.values(dayStatus).filter((s) => s === "complete").length;
  const partial = Object.values(dayStatus).filter((s) => s === "partial").length;

  return (
    <div className="space-y-1.5" data-testid="month-day-bar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-cairo text-muted-foreground">تقدم الشهر:</span>
          <span className="text-[10px] font-cairo font-bold text-emerald-600">{complete} مكتمل</span>
          {partial > 0 && <span className="text-[10px] font-cairo font-bold text-amber-500">{partial} جزئي</span>}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-emerald-500" />
            <span className="text-[8px] text-muted-foreground font-cairo">مكتمل</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-amber-400" />
            <span className="text-[8px] text-muted-foreground font-cairo">جزئي</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-red-400" />
            <span className="text-[8px] text-muted-foreground font-cairo">فارغ</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-[3px] flex-wrap">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const status = dayStatus[day] || "empty";
          const isSelected = day === selectedDay;
          const dateStr = `${filterYear}-${filterMonth}-${String(day).padStart(2, "0")}`;
          return (
            <button
              key={day}
              onClick={() => onDayClick(dateStr)}
              title={`يوم ${day} — ${status === "complete" ? "مكتمل" : status === "partial" ? "جزئي" : "فارغ"}`}
              data-testid={`day-${day}`}
              className={`
                relative h-6 rounded-sm text-[8px] font-bold transition-all cursor-pointer
                ${daysInMonth <= 29 ? 'flex-1 min-w-[22px]' : 'flex-1 min-w-[20px]'}
                ${isSelected ? 'ring-2 ring-primary ring-offset-1 scale-110 z-10' : 'hover:scale-105'}
                ${status === "complete"
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : status === "partial"
                    ? 'bg-amber-400 text-white hover:bg-amber-500'
                    : 'bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Copy Previous Day Button ───────────────────────────────────
function CopyPrevButton({ selectedDateHijri, items, setFormData, fields }) {
  const handleCopy = () => {
    const m = momentHijri(selectedDateHijri, "iYYYY-iMM-iDD");
    if (!m.isValid()) return;
    const prevDate = m.clone().subtract(1, "day").format("iYYYY-iMM-iDD");
    const prevData = items.find((i) => i.date_hijri === prevDate);
    if (!prevData) {
      toast.error("لا توجد بيانات لليوم السابق");
      return;
    }
    const data = {};
    fields.forEach((f) => {
      data[f.key] = prevData[f.key] ?? "";
    });
    setFormData((prev) => ({ ...prev, ...data }));
    toast.success("تم نسخ بيانات اليوم السابق");
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-[10px] h-7" data-testid="copy-prev-btn">
      <ChevronLeft className="w-3 h-3" />
      نسخ من أمس
    </Button>
  );
}


// ─── Stats Strip (like GatesTab density toolbar) ────────────────
function StatsStrip({ summary, onImport, onExport, onTemplate }) {
  const s = summary?.count ? summary : {};

  return (
    <div className="space-y-2.5" data-testid="summary-cards">
      {/* المسجد الحرام Strip */}
      <div className="flex items-center gap-1.5 bg-white dark:bg-card border border-blue-200/60 dark:border-blue-800/40 rounded-xl px-3 py-2 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-blue-200/50 dark:border-blue-700/30">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] font-cairo font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">الحرام</span>
        </div>
        <StatPill icon={Users2} label="المصلين" value={s.sum_haram_worshippers} color="#2563eb" />
        <StatPill icon={Users2} label="المعتمرين" value={s.sum_haram_umrah} color="#7c3aed" />
        <StatPill icon={Building2} label="حجر إسماعيل" value={s.sum_haram_hijr_ismail} color="#0891b2" />
        <StatPill icon={TrendingUp} label="العربات" value={s.sum_haram_carts} color="#ca8a04" />
        <div className="w-px h-5 bg-blue-200/50 dark:bg-blue-700/30 shrink-0" />
        <HighLowPill
          highVal={s.max_haram_worshippers}
          highDate={s.max_haram_worshippers_date}
          lowVal={s.min_haram_worshippers}
          lowDate={s.min_haram_worshippers_date}
          label="المصلين"
        />
      </div>

      {/* المسجد النبوي Strip */}
      <div className="flex items-center gap-1.5 bg-white dark:bg-card border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl px-3 py-2 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-emerald-200/50 dark:border-emerald-700/30">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-cairo font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">النبوي</span>
        </div>
        <StatPill icon={Users2} label="المصلين" value={s.sum_nabawi_worshippers} color="#059669" />
        <StatPill icon={Building2} label="ممر السلام" value={s.sum_nabawi_salam_corridor} color="#0d9488" />
        <div className="w-px h-5 bg-emerald-200/40 shrink-0 hidden sm:block" />
        <GroupPill label="الروضة رجال" items={[
          { sub: "منشور", val: s.sum_nabawi_rawdah_men_published, color: "#16a34a" },
          { sub: "محجوز", val: s.sum_nabawi_rawdah_men_reserved, color: "#ca8a04" },
          { sub: "فعلي", val: s.sum_nabawi_rawdah_men_actual, color: "#2563eb" },
        ]} />
        <div className="w-px h-5 bg-emerald-200/40 shrink-0 hidden sm:block" />
        <GroupPill label="الروضة نساء" items={[
          { sub: "منشور", val: s.sum_nabawi_rawdah_women_published, color: "#ec4899" },
          { sub: "محجوز", val: s.sum_nabawi_rawdah_women_reserved, color: "#f59e0b" },
          { sub: "فعلي", val: s.sum_nabawi_rawdah_women_actual, color: "#8b5cf6" },
        ]} />
        <div className="w-px h-5 bg-emerald-200/50 dark:bg-emerald-700/30 shrink-0" />
        <HighLowPill
          highVal={s.max_nabawi_worshippers}
          highDate={s.max_nabawi_worshippers_date}
          lowVal={s.min_nabawi_worshippers}
          lowDate={s.min_nabawi_worshippers_date}
          label="المصلين"
        />
      </div>

      {/* Files menu for combined view */}
      <div className="flex items-center gap-2">
        <FilesMenu onImport={onImport} onExport={onExport} onTemplate={onTemplate} color="default" />
      </div>
    </div>
  );
}

// ─── Haram-only Strip ───────────────────────────────────────────
function HaramStrip({ summary, onImport, onExport, onTemplate }) {
  const s = summary || {};
  return (
    <div className="flex items-center gap-1.5 bg-white dark:bg-card border border-blue-200/60 dark:border-blue-800/40 rounded-xl px-3 py-2 shadow-sm overflow-x-auto" data-testid="haram-strip">
      <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-blue-200/50 dark:border-blue-700/30">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-[10px] font-cairo font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">الحرام</span>
      </div>
      <StatPill icon={Users2} label="المصلين" value={s.sum_haram_worshippers} color="#2563eb" />
      <StatPill icon={Users2} label="المعتمرين" value={s.sum_haram_umrah} color="#7c3aed" />
      <StatPill icon={Building2} label="حجر إسماعيل" value={s.sum_haram_hijr_ismail} color="#0891b2" />
      <StatPill icon={TrendingUp} label="العربات" value={s.sum_haram_carts} color="#ca8a04" />
      <div className="w-px h-5 bg-blue-200/50 dark:bg-blue-700/30 shrink-0" />
      <HighLowPill
        highVal={s.max_haram_worshippers}
        highDate={s.max_haram_worshippers_date}
        lowVal={s.min_haram_worshippers}
        lowDate={s.min_haram_worshippers_date}
      />
      <div className="w-px h-5 bg-blue-200/50 dark:bg-blue-700/30 shrink-0" />
      <FilesMenu onImport={onImport} onExport={onExport} onTemplate={onTemplate} color="blue" />
    </div>
  );
}

// ─── Nabawi-only Strip ──────────────────────────────────────────
function NabawiStrip({ summary, onImport, onExport, onTemplate }) {
  const s = summary || {};
  return (
    <div className="flex items-center gap-1.5 bg-white dark:bg-card border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl px-3 py-2 shadow-sm overflow-x-auto" data-testid="nabawi-strip">
      <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-emerald-200/50 dark:border-emerald-700/30">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-[10px] font-cairo font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">النبوي</span>
      </div>
      <StatPill icon={Users2} label="المصلين" value={s.sum_nabawi_worshippers} color="#059669" />
      <StatPill icon={Building2} label="ممر السلام" value={s.sum_nabawi_salam_corridor} color="#0d9488" />
      <div className="w-px h-5 bg-emerald-200/40 shrink-0 hidden sm:block" />
      <GroupPill label="الروضة رجال" items={[
        { sub: "منشور", val: s.sum_nabawi_rawdah_men_published, color: "#16a34a" },
        { sub: "محجوز", val: s.sum_nabawi_rawdah_men_reserved, color: "#ca8a04" },
        { sub: "فعلي", val: s.sum_nabawi_rawdah_men_actual, color: "#2563eb" },
      ]} />
      <div className="w-px h-5 bg-emerald-200/40 shrink-0 hidden sm:block" />
      <GroupPill label="الروضة نساء" items={[
        { sub: "منشور", val: s.sum_nabawi_rawdah_women_published, color: "#ec4899" },
        { sub: "محجوز", val: s.sum_nabawi_rawdah_women_reserved, color: "#f59e0b" },
        { sub: "فعلي", val: s.sum_nabawi_rawdah_women_actual, color: "#8b5cf6" },
      ]} />
      <div className="w-px h-5 bg-emerald-200/50 dark:bg-emerald-700/30 shrink-0" />
      <HighLowPill
        highVal={s.max_nabawi_worshippers}
        highDate={s.max_nabawi_worshippers_date}
        lowVal={s.min_nabawi_worshippers}
        lowDate={s.min_nabawi_worshippers_date}
      />
      <div className="w-px h-5 bg-emerald-200/50 dark:bg-emerald-700/30 shrink-0" />
      <FilesMenu onImport={onImport} onExport={onExport} onTemplate={onTemplate} color="emerald" />
    </div>
  );
}

// ─── Files Menu (DropdownMenu like employees page) ─────────────
function FilesMenu({ onImport, onExport, onTemplate, color }) {
  const borderColor = color === "blue" ? "border-blue-200 dark:border-blue-700" : color === "emerald" ? "border-emerald-200 dark:border-emerald-700" : "border-border";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-semibold shrink-0 transition-all hover:bg-muted/50 text-muted-foreground ${borderColor}`} data-testid="files-menu">
          <FileText className="w-3 h-3" />
          <span className="font-cairo">ملفات</span>
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" dir="rtl" className="min-w-[160px]">
        <DropdownMenuItem onClick={onExport} className="text-xs font-cairo gap-2">
          <Download className="w-3.5 h-3.5" />تصدير Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onTemplate} className="text-xs font-cairo gap-2">
          <FileSpreadsheet className="w-3.5 h-3.5" />قالب الاستيراد
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onImport} className="text-xs font-cairo gap-2">
          <Upload className="w-3.5 h-3.5" />استيراد Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


// ─── Stat Pill (single stat in toolbar) ─────────────────────────
function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shrink-0 transition-all hover:scale-[1.02]"
      style={{ borderColor: color + "25", backgroundColor: color + "06" }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
      <span className="text-[11px] font-bold font-cairo tabular-nums" style={{ color }}>
        {formatNumber(value)}
      </span>
      <span className="text-[9px] font-cairo text-muted-foreground whitespace-nowrap">{label}</span>
    </div>
  );
}

// ─── Group Pill (Rawdah sub-stats) ──────────────────────────────
function GroupPill({ label, items }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-[9px] font-cairo font-semibold text-muted-foreground whitespace-nowrap">{label}:</span>
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border"
          style={{ borderColor: item.color + "30", backgroundColor: item.color + "08" }}
        >
          <span className="text-[10px] font-bold font-cairo tabular-nums" style={{ color: item.color }}>
            {formatNumber(item.val)}
          </span>
          <span className="text-[8px] font-cairo" style={{ color: item.color + "bb" }}>{item.sub}</span>
        </div>
      ))}
    </div>
  );
}

// ─── High/Low Pill ──────────────────────────────────────────────
function HighLowPill({ highVal, highDate, lowVal, lowDate, label }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {highVal != null && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-700/30">
          <TrendingUp className="w-3 h-3 text-emerald-600" />
          <span className="text-[10px] font-bold font-cairo text-emerald-700 dark:text-emerald-400">{formatNumber(highVal)}</span>
          {highDate && <span className="text-[8px] text-emerald-500 font-cairo">{highDate.split("-").pop()}</span>}
        </div>
      )}
      {lowVal != null && lowVal > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-700/30">
          <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />
          <span className="text-[10px] font-bold font-cairo text-red-600 dark:text-red-400">{formatNumber(lowVal)}</span>
          {lowDate && <span className="text-[8px] text-red-400 font-cairo">{lowDate.split("-").pop()}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Daily Entry Card (Mosque-specific) ─────────────────────────
function DailyEntryCard({ mosqueType, fields, formData, setFormData, onSave, saving, canEdit, items, selectedDateHijri }) {
  const isHaram = mosqueType === "haram";
  const accentBorder = isHaram ? "border-blue-500/15" : "border-emerald-500/15";
  const accentBg = isHaram ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700";

  // For Nabawi: detect grouped fields (rawdah)
  const isGrouped = (f) => f.group;
  const rawdahMen = fields.filter((f) => f.group === "rawdah_men");
  const rawdahWomen = fields.filter((f) => f.group === "rawdah_women");
  const standaloneFields = fields.filter((f) => !f.group);

  const renderInput = (field, shortLabel) => (
    <div key={field.key} className="relative">
      <Label className="text-[10px] text-muted-foreground mb-0.5 block font-cairo text-center truncate">{shortLabel || field.label}</Label>
      <Input
        type="number"
        placeholder="0"
        value={formData[field.key] ?? ""}
        onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
        disabled={!canEdit}
        className="text-center h-8 font-mono text-sm"
        dir="ltr"
        data-testid={`input-${field.key}`}
      />
    </div>
  );

  return (
    <Card className={`${accentBorder} border`} data-testid={`entry-card-${mosqueType}`}>
      <CardContent className="p-4 space-y-3">
        {isHaram ? (
          /* ── Haram: 4 inputs in one row ── */
          <div className="grid grid-cols-4 gap-3">
            {fields.map((f) => renderInput(f))}
          </div>
        ) : (
          /* ── Nabawi: compact grouped layout ── */
          <div className="space-y-3">
            {/* Row 1: المصلين + ممر السلام */}
            <div className="grid grid-cols-2 gap-3">
              {standaloneFields.map((f) => renderInput(f))}
            </div>
            {/* Row 2: الروضة رجال */}
            {rawdahMen.length > 0 && (
              <div className="rounded-lg border border-blue-200/40 dark:border-blue-800/30 bg-blue-50/30 dark:bg-blue-950/10 p-3">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-blue-200/50 dark:bg-blue-700/30" />
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 font-cairo px-2">الروضة الشريفة - رجال</span>
                  <div className="h-px flex-1 bg-blue-200/50 dark:bg-blue-700/30" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {rawdahMen.map((f) => renderInput(f, f.label.split(" - ")[1]))}
                </div>
              </div>
            )}
            {/* Row 3: الروضة نساء */}
            {rawdahWomen.length > 0 && (
              <div className="rounded-lg border border-pink-200/40 dark:border-pink-800/30 bg-pink-50/30 dark:bg-pink-950/10 p-3">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-pink-200/50 dark:bg-pink-700/30" />
                  <span className="text-[10px] font-bold text-pink-700 dark:text-pink-400 font-cairo px-2">الروضة الشريفة - نساء</span>
                  <div className="h-px flex-1 bg-pink-200/50 dark:bg-pink-700/30" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {rawdahWomen.map((f) => renderInput(f, f.label.split(" - ")[1]))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {canEdit && (
          <div className="flex items-center gap-2 pt-1">
            <CopyPrevButton selectedDateHijri={selectedDateHijri} items={items} setFormData={setFormData} fields={fields} />
            <Button onClick={onSave} disabled={saving} className={`flex-1 h-9 text-white ${accentBg}`} data-testid={`save-${mosqueType}`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1.5" /> : <Save className="w-4 h-4 ml-1.5" />}
              <span className="text-xs font-cairo">حفظ البيانات</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Data Table ─────────────────────────────────────────────────
function DataTable({ items, onEdit, onDelete, canEdit, mosqueFilter }) {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground" data-testid="empty-table">
        <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
        <p className="font-cairo text-sm">لا توجد بيانات مسجلة</p>
        <p className="text-xs mt-1">ابدأ بإدخال إحصائيات يومية جديدة</p>
      </div>
    );
  }

  const showHaram = !mosqueFilter || mosqueFilter === "haram" || mosqueFilter === "all";
  const showNabawi = !mosqueFilter || mosqueFilter === "nabawi" || mosqueFilter === "all";

  return (
    <div className="overflow-x-auto rounded-xl border shadow-sm" data-testid="data-table">
      <Table className="min-w-[700px]">
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 border-b-2 border-primary/20 [&>th:not(:last-child)]:border-l [&>th:not(:last-child)]:border-primary/10">
            {/* التاريخ */}
            <TableHead className="text-center py-3 min-w-[130px] sticky right-0 bg-gradient-to-r from-primary/5 to-primary/3 z-10">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shadow-sm">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[11px] font-bold font-cairo text-foreground">التاريخ</span>
              </div>
            </TableHead>
            {showHaram && HARAM_FIELDS.map((f) => (
              <TableHead key={f.key} className="text-center py-3 min-w-[100px] bg-blue-50/40 dark:bg-blue-950/15">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shadow-sm">
                    <Users2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-[11px] font-bold font-cairo text-blue-800 dark:text-blue-300">{f.label}</span>
                </div>
              </TableHead>
            ))}
            {showNabawi && NABAWI_FIELDS.map((f) => (
              <TableHead key={f.key} className="text-center py-3 min-w-[100px] bg-emerald-50/40 dark:bg-emerald-950/15">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shadow-sm">
                    <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-[11px] font-bold font-cairo text-emerald-800 dark:text-emerald-300">{f.label}</span>
                </div>
              </TableHead>
            ))}
            {canEdit && (
              <TableHead className="text-center py-3 w-[80px]">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm">
                    <Edit3 className="w-4 h-4 text-slate-500" />
                  </div>
                  <span className="text-[11px] font-bold font-cairo text-slate-500">إجراءات</span>
                </div>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={item.id} className={`hover:bg-primary/5 transition-colors [&>td]:py-2.5 ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}>
              <TableCell className="text-center sticky right-0 bg-background z-10 border-l border-primary/5 px-3">
                <div className="font-cairo font-bold text-[13px] text-primary" dir="rtl">{formatDateAr(item.date_hijri)}</div>
                <div className="font-cairo text-[10px] text-muted-foreground" dir="rtl">{getGregorianFromHijri(item.date_hijri)}</div>
              </TableCell>
              {showHaram && HARAM_FIELDS.map((f) => (
                <TableCell key={f.key} className="text-center font-cairo text-[13px] font-semibold bg-blue-500/[0.015]">
                  <span className={item[f.key] != null && item[f.key] !== '' ? 'text-foreground' : 'text-muted-foreground/40'}>{formatNumber(item[f.key])}</span>
                </TableCell>
              ))}
              {showNabawi && NABAWI_FIELDS.map((f) => (
                <TableCell key={f.key} className="text-center font-cairo text-[13px] font-semibold bg-emerald-500/[0.015]">
                  <span className={item[f.key] != null && item[f.key] !== '' ? 'text-foreground' : 'text-muted-foreground/40'}>{formatNumber(item[f.key])}</span>
                </TableCell>
              ))}
              {canEdit && (
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50" onClick={() => onEdit(item)} data-testid={`edit-${item.id}`}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50" onClick={() => onDelete(item)} data-testid={`delete-${item.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Import Dialog ──────────────────────────────────────────────
function ImportDialog({ open, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API}/daily-stats/import`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      if (res.data.created > 0 || res.data.updated > 0) {
        toast.success(`تم استيراد ${res.data.created} سجل جديد وتحديث ${res.data.updated} سجل`);
        onSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "فشل الاستيراد");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/daily-stats/export/template`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "daily_stats_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("تم تحميل القالب");
    } catch {
      toast.error("فشل تحميل القالب");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-cairo flex items-center gap-2">
            <Upload className="w-5 h-5" />
            استيراد من Excel
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            ارفع ملف Excel يحتوي على الإحصائيات اليومية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById("stats-import-file").click()}
            data-testid="import-drop-zone"
          >
            <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-cairo">
              {file ? file.name : "اضغط لاختيار ملف Excel"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx</p>
            <input
              id="stats-import-file"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files[0]);
                setResult(null);
              }}
            />
          </div>

          <Button variant="outline" size="sm" className="w-full gap-2" onClick={downloadTemplate} data-testid="download-template">
            <Download className="w-4 h-4" />
            تحميل قالب Excel
          </Button>

          {result && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1" data-testid="import-result">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-4 h-4" />
                <span>جديد: {result.created} | محدث: {result.updated} | تخطي: {result.skipped}</span>
              </div>
              {result.errors?.length > 0 && (
                <div className="text-destructive mt-1">
                  <p className="font-semibold">أخطاء:</p>
                  {result.errors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
          <Button onClick={handleImport} disabled={!file || importing} data-testid="import-submit">
            {importing ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Upload className="w-4 h-4 ml-2" />}
            استيراد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page Component ────────────────────────────────────────
export default function DailyStatsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();

  // State
  const [activeTab, setActiveTab] = useState("haram");
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
  const [editingItem, setEditingItem] = useState(null);

  // Dialogs
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Determine if user can edit
  const canEdit = true; // Controlled by permissions system at sidebar level

  // Available Hijri years
  const hijriYears = useMemo(() => {
    const current = parseInt(currentHijri.year);
    const years = [];
    for (let y = current - 5; y <= current + 1; y++) {
      years.push(y.toString());
    }
    return years;
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Load existing data for selected date ──────────────────
  useEffect(() => {
    if (!selectedDateHijri) return;
    const existing = items.find((i) => i.date_hijri === selectedDateHijri);
    if (existing) {
      const data = {};
      [...HARAM_FIELDS, ...NABAWI_FIELDS].forEach((f) => {
        data[f.key] = existing[f.key] ?? "";
      });
      setFormData(data);
    } else {
      setFormData({});
    }
  }, [selectedDateHijri, items]);

  // ─── Sync date with filter ──────────────────────────────────
  useEffect(() => {
    // When filter changes, reset date to 1st of selected month
    setSelectedDateHijri(`${filterYear}-${filterMonth}-01`);
  }, [filterYear, filterMonth]);

  // ─── Date Navigation (clamped to selected month) ───────────
  const navigateDate = (direction) => {
    const m = momentHijri(selectedDateHijri, "iYYYY-iMM-iDD");
    if (!m.isValid()) return;
    const newDate = direction === "next" ? m.clone().add(1, "day") : m.clone().subtract(1, "day");
    // Clamp to current filter month
    const newMonth = String(newDate.iMonth() + 1).padStart(2, "0");
    const newYear = String(newDate.iYear());
    if (newMonth !== filterMonth || newYear !== filterYear) return; // Don't go beyond month
    setSelectedDateHijri(newDate.format("iYYYY-iMM-iDD"));
  };

  // Current day number for display
  const currentDay = useMemo(() => {
    const m = momentHijri(selectedDateHijri, "iYYYY-iMM-iDD");
    return m.isValid() ? m.iDate() : 1;
  }, [selectedDateHijri]);

  // Days in current hijri month
  const daysInMonth = useMemo(() => {
    const m = momentHijri(`${filterYear}-${filterMonth}-01`, "iYYYY-iMM-iDD");
    return m.isValid() ? m.iDaysInMonth() : 30;
  }, [filterYear, filterMonth]);

  const gregDate = useMemo(() => hijriToGregorian(selectedDateHijri), [selectedDateHijri]);

  // ─── Save Handler ─────────────────────────────────────────
  const handleSave = async (mosqueType) => {
    if (!selectedDateHijri) {
      toast.error("يرجى اختيار التاريخ");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        date_hijri: selectedDateHijri,
        date_gregorian: gregDate,
      };

      const fields = mosqueType === "haram" ? HARAM_FIELDS : NABAWI_FIELDS;
      fields.forEach((f) => {
        if (formData[f.key] !== undefined && formData[f.key] !== "") {
          payload[f.key] = formData[f.key];
        }
      });

      await axios.post(`${API}/daily-stats`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("تم حفظ البيانات بنجاح");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  // ─── Edit Handler ─────────────────────────────────────────
  const handleEdit = (item) => {
    setSelectedDateHijri(item.date_hijri);
    setActiveTab("haram"); // Switch to entry view
    const data = {};
    [...HARAM_FIELDS, ...NABAWI_FIELDS].forEach((f) => {
      data[f.key] = item[f.key] ?? "";
    });
    setFormData(data);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info(`تم تحميل بيانات ${item.date_hijri} للتعديل`);
  };

  // ─── Delete Handler ───────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/daily-stats/${deleteTarget.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("تم الحذف بنجاح");
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("فشل الحذف");
    }
  };

  // ─── Export ───────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/daily-stats/export/data`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { month: filterMonth, year: filterYear },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `daily_stats_${filterYear}_${filterMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("تم تصدير البيانات");
    } catch {
      toast.error("فشل التصدير");
    }
  };

  // ─── Download Template ────────────────────────────────────
  const handleTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/daily-stats/export/template`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "daily_stats_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("تم تحميل القالب");
    } catch {
      toast.error("فشل تحميل القالب");
    }
  };

  // ─── Check if date has existing data ──────────────────────
  const dateHasData = useMemo(() => {
    return items.some((i) => i.date_hijri === selectedDateHijri);
  }, [items, selectedDateHijri]);

  return (
    <div className="space-y-5" dir="rtl" data-testid="daily-stats-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold font-cairo flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            الإحصائيات اليومية
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-cairo">
            إحصائيات الحشود اليومية للمسجد الحرام والمسجد النبوي
          </p>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); setPage(1); }}>
          <SelectTrigger className="w-[120px] h-9 text-xs" data-testid="filter-year">
            <SelectValue placeholder="السنة" />
          </SelectTrigger>
          <SelectContent>
            {hijriYears.map((y) => (
              <SelectItem key={y} value={y}>{y} هـ</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterMonth} onValueChange={(v) => { setFilterMonth(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-9 text-xs" data-testid="filter-month">
            <SelectValue placeholder="الشهر" />
          </SelectTrigger>
          <SelectContent>
            {HIJRI_MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="text-[10px] px-2.5 py-1 gap-1.5 flex items-center" data-testid="record-count">
          <Calendar className="w-3 h-3" />
          {loading ? "..." : `${summary?.count ?? 0} يوم مسجل`}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full grid grid-cols-3 h-10">
          <TabsTrigger value="haram" className="text-xs font-cairo gap-1.5" data-testid="tab-haram">
            <Building2 className="w-3.5 h-3.5" />
            المسجد الحرام
          </TabsTrigger>
          <TabsTrigger value="nabawi" className="text-xs font-cairo gap-1.5" data-testid="tab-nabawi">
            <Building2 className="w-3.5 h-3.5" />
            المسجد النبوي
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs font-cairo gap-1.5" data-testid="tab-all">
            <BarChart3 className="w-3.5 h-3.5" />
            العرض الشامل
          </TabsTrigger>
        </TabsList>

        {/* ─── Haram Tab ──────────────────────────────────────── */}
        <TabsContent value="haram" className="space-y-4 mt-4">
          {/* Haram Stats Strip */}
          <HaramStrip summary={summary} onImport={() => setImportOpen(true)} onExport={handleExport} onTemplate={handleTemplate} />

          {/* Month Progress */}
          <MonthDayBar
            filterYear={filterYear} filterMonth={filterMonth} daysInMonth={daysInMonth}
            items={items} selectedDateHijri={selectedDateHijri}
            onDayClick={(d) => setSelectedDateHijri(d)}
            checkFields={HARAM_FIELDS}
          />

          {/* Date Selector */}
          <Card className="border-blue-500/15">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigateDate("next")} className="h-8 w-8" disabled={currentDay >= daysInMonth} data-testid="date-next">
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <div className="flex-1 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg font-bold font-mono text-primary" data-testid="date-input">{selectedDateHijri}</span>
                    {gregDate && (
                      <span className="text-[11px] text-muted-foreground font-mono">({gregDate})</span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground font-cairo">يوم {currentDay} من {daysInMonth}</span>
                    {dateHasData && (
                      <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300 py-0 px-1.5">
                        <CheckCircle className="w-2.5 h-2.5 ml-0.5" />
                        مسجل
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

          <DailyEntryCard
            mosqueType="haram"
            fields={HARAM_FIELDS}
            formData={formData}
            setFormData={setFormData}
            onSave={() => handleSave("haram")}
            saving={saving}
            canEdit={canEdit}
            items={items}
            selectedDateHijri={selectedDateHijri}
          />

          <Separator />

          <h3 className="font-cairo font-semibold text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            سجل الشهر - المسجد الحرام
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable
              items={items}
              onEdit={handleEdit}
              onDelete={(item) => setDeleteTarget(item)}
              canEdit={canEdit}
              mosqueFilter="haram"
            />
          )}
        </TabsContent>

        {/* ─── Nabawi Tab ─────────────────────────────────────── */}
        <TabsContent value="nabawi" className="space-y-4 mt-4">
          {/* Nabawi Stats Strip */}
          <NabawiStrip summary={summary} onImport={() => setImportOpen(true)} onExport={handleExport} onTemplate={handleTemplate} />

          {/* Month Progress */}
          <MonthDayBar
            filterYear={filterYear} filterMonth={filterMonth} daysInMonth={daysInMonth}
            items={items} selectedDateHijri={selectedDateHijri}
            onDayClick={(d) => setSelectedDateHijri(d)}
            checkFields={NABAWI_FIELDS}
          />

          <Card className="border-emerald-500/15">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigateDate("next")} className="h-8 w-8" disabled={currentDay >= daysInMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <div className="flex-1 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg font-bold font-mono text-primary">{selectedDateHijri}</span>
                    {gregDate && (
                      <span className="text-[11px] text-muted-foreground font-mono">({gregDate})</span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground font-cairo">يوم {currentDay} من {daysInMonth}</span>
                    {dateHasData && (
                      <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300 py-0 px-1.5">
                        <CheckCircle className="w-2.5 h-2.5 ml-0.5" />
                        مسجل
                      </Badge>
                    )}
                  </div>
                </div>

                <Button variant="ghost" size="icon" onClick={() => navigateDate("prev")} className="h-8 w-8" disabled={currentDay <= 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <DailyEntryCard
            mosqueType="nabawi"
            fields={NABAWI_FIELDS}
            formData={formData}
            setFormData={setFormData}
            onSave={() => handleSave("nabawi")}
            saving={saving}
            canEdit={canEdit}
            items={items}
            selectedDateHijri={selectedDateHijri}
          />

          <Separator />

          <h3 className="font-cairo font-semibold text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            سجل الشهر - المسجد النبوي
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable
              items={items}
              onEdit={handleEdit}
              onDelete={(item) => setDeleteTarget(item)}
              canEdit={canEdit}
              mosqueFilter="nabawi"
            />
          )}
        </TabsContent>

        {/* ─── Combined View Tab ──────────────────────────────── */}
        <TabsContent value="all" className="space-y-4 mt-4">
          {/* Full Stats Strip */}
          <StatsStrip summary={summary} onImport={() => setImportOpen(true)} onExport={handleExport} onTemplate={handleTemplate} />

          <h3 className="font-cairo font-semibold text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            العرض الشامل - جميع البيانات
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable
              items={items}
              onEdit={handleEdit}
              onDelete={(item) => setDeleteTarget(item)}
              canEdit={canEdit}
              mosqueFilter="all"
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                data-testid="prev-page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground font-mono">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                data-testid="next-page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          fetchData();
          setImportOpen(false);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cairo">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="font-cairo">
              هل أنت متأكد من حذف بيانات يوم {deleteTarget?.date_hijri}؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="font-cairo">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-cairo"
              data-testid="confirm-delete"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
