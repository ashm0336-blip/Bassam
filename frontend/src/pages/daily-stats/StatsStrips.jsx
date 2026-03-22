import { formatNumber } from "./constants";
import { Users2, Building2, TrendingUp, ChevronDown, Upload, Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shrink-0 flex-1 min-w-0 justify-center transition-all hover:scale-[1.02]"
      style={{ borderColor: color + "25", backgroundColor: color + "06" }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
      <span className="text-[12px] font-bold font-cairo" style={{ color }}>
        {formatNumber(value)}
      </span>
      <span className="text-[9px] font-cairo text-muted-foreground whitespace-nowrap">{label}</span>
    </div>
  );
}

export function GroupPill({ label, items }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-[9px] font-cairo font-semibold text-muted-foreground whitespace-nowrap">{label}:</span>
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-1 px-2 py-1 rounded-md border"
          style={{ borderColor: item.color + "30", backgroundColor: item.color + "08" }}
        >
          <span className="text-[11px] font-bold font-cairo" style={{ color: item.color }}>
            {formatNumber(item.val)}
          </span>
          <span className="text-[8px] font-cairo" style={{ color: item.color + "bb" }}>{item.sub}</span>
        </div>
      ))}
    </div>
  );
}

export function HighLowPill({ highVal, highDate, lowVal, lowDate }) {
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

export function FilesMenu({ onImport, onExport, onTemplate, color }) {
  const borderColor = color === "blue" ? "border-blue-200 dark:border-blue-700" : color === "emerald" ? "border-emerald-200 dark:border-emerald-700" : "border-border";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold shrink-0 transition-all hover:bg-muted/50 text-muted-foreground ${borderColor}`} data-testid="files-menu">
          <FileText className="w-3 h-3" />
          <span className="font-cairo">ملفات</span>
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" dir="rtl" className="min-w-[160px]">
        <DropdownMenuItem onClick={onExport} className="text-xs font-cairo gap-2">
          <Download className="w-3.5 h-3.5" />تصدير Excel
        </DropdownMenuItem>
        {onImport && (
          <>
            <DropdownMenuItem onClick={onTemplate} className="text-xs font-cairo gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5" />قالب الاستيراد
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onImport} className="text-xs font-cairo gap-2">
              <Upload className="w-3.5 h-3.5" />استيراد Excel
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StatsStrip({ summary, onImport, onExport, onTemplate }) {
  const s = summary?.count ? summary : {};
  return (
    <div className="space-y-2.5" data-testid="summary-cards">
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
        <HighLowPill highVal={s.max_haram_worshippers} highDate={s.max_haram_worshippers_date} lowVal={s.min_haram_worshippers} lowDate={s.min_haram_worshippers_date} />
      </div>
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
        <HighLowPill highVal={s.max_nabawi_worshippers} highDate={s.max_nabawi_worshippers_date} lowVal={s.min_nabawi_worshippers} lowDate={s.min_nabawi_worshippers_date} />
      </div>
      <div className="flex items-center gap-2">
        <FilesMenu onImport={onImport} onExport={onExport} onTemplate={onTemplate} color="default" />
      </div>
    </div>
  );
}

export function HaramStrip({ summary, onImport, onExport, onTemplate }) {
  const s = summary || {};
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-card border border-blue-200/60 dark:border-blue-800/40 rounded-xl px-3 py-2.5 shadow-sm overflow-x-auto" data-testid="haram-strip">
      <div className="flex items-center gap-1.5 shrink-0 pl-2.5 border-l border-blue-200/50 dark:border-blue-700/30">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
        <span className="text-[11px] font-cairo font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">الحرام</span>
      </div>
      <StatPill icon={Users2} label="المصلين" value={s.sum_haram_worshippers} color="#2563eb" />
      <StatPill icon={Users2} label="المعتمرين" value={s.sum_haram_umrah} color="#7c3aed" />
      <StatPill icon={Building2} label="حجر إسماعيل" value={s.sum_haram_hijr_ismail} color="#0891b2" />
      <StatPill icon={TrendingUp} label="العربات" value={s.sum_haram_carts} color="#ca8a04" />
      <div className="w-px h-6 bg-blue-200/50 dark:bg-blue-700/30 shrink-0" />
      <HighLowPill highVal={s.max_haram_worshippers} highDate={s.max_haram_worshippers_date} lowVal={s.min_haram_worshippers} lowDate={s.min_haram_worshippers_date} />
      <div className="w-px h-6 bg-blue-200/50 dark:bg-blue-700/30 shrink-0" />
      <FilesMenu onImport={onImport} onExport={onExport} onTemplate={onTemplate} color="blue" />
    </div>
  );
}

export function NabawiStrip({ summary, onImport, onExport, onTemplate }) {
  const s = summary || {};
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-card border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl px-3 py-2.5 shadow-sm overflow-x-auto" data-testid="nabawi-strip">
      <div className="flex items-center gap-1.5 shrink-0 pl-2.5 border-l border-emerald-200/50 dark:border-emerald-700/30">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <span className="text-[11px] font-cairo font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">النبوي</span>
      </div>
      <StatPill icon={Users2} label="المصلين" value={s.sum_nabawi_worshippers} color="#059669" />
      <StatPill icon={Building2} label="ممر السلام" value={s.sum_nabawi_salam_corridor} color="#0d9488" />
      <div className="w-px h-6 bg-emerald-200/40 shrink-0 hidden sm:block" />
      <GroupPill label="الروضة رجال" items={[
        { sub: "منشور", val: s.sum_nabawi_rawdah_men_published, color: "#16a34a" },
        { sub: "محجوز", val: s.sum_nabawi_rawdah_men_reserved, color: "#ca8a04" },
        { sub: "فعلي", val: s.sum_nabawi_rawdah_men_actual, color: "#2563eb" },
      ]} />
      <div className="w-px h-6 bg-emerald-200/40 shrink-0 hidden sm:block" />
      <GroupPill label="الروضة نساء" items={[
        { sub: "منشور", val: s.sum_nabawi_rawdah_women_published, color: "#ec4899" },
        { sub: "محجوز", val: s.sum_nabawi_rawdah_women_reserved, color: "#f59e0b" },
        { sub: "فعلي", val: s.sum_nabawi_rawdah_women_actual, color: "#8b5cf6" },
      ]} />
      <div className="w-px h-6 bg-emerald-200/50 dark:bg-emerald-700/30 shrink-0" />
      <HighLowPill highVal={s.max_nabawi_worshippers} highDate={s.max_nabawi_worshippers_date} lowVal={s.min_nabawi_worshippers} lowDate={s.min_nabawi_worshippers_date} />
      <div className="w-px h-6 bg-emerald-200/50 dark:bg-emerald-700/30 shrink-0" />
      <FilesMenu onImport={onImport} onExport={onExport} onTemplate={onTemplate} color="emerald" />
    </div>
  );
}
