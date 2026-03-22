import { HARAM_FIELDS, NABAWI_FIELDS, formatNumber, hijriToGregorian } from "./constants";
import { BarChart3, Calendar, Users2, Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DataTable({ items, onEdit, onDelete, canEdit, mosqueFilter }) {
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
              <TableHead className="text-center py-3 w-[60px]">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shadow-sm">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-[11px] font-bold font-cairo text-red-500">حذف</span>
                </div>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={item.id} className={`hover:bg-primary/5 transition-colors [&>td]:py-2.5 ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}>
              <TableCell className="text-center sticky right-0 bg-background z-10 border-l border-primary/5 px-3">
                <div className="font-bold text-[13px] text-primary font-mono">{item.date_hijri}</div>
                <div className="text-[10px] text-muted-foreground font-mono">({hijriToGregorian(item.date_hijri)})</div>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50" onClick={() => onDelete(item)} data-testid={`delete-${item.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
