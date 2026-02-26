import {
  Plus, Save, X, RefreshCw, Edit2, CalendarRange, AlertCircle,
  Database, Copy, FileStack, ArrowLeftRight, ArrowRight, RotateCcw,
  MessageSquare, CircleDot, CircleOff, Trash2, CheckCircle2,
  Users, Maximize2, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/context/LanguageContext";
import { CHANGE_LABELS } from "../constants";
import { API, getAuthHeaders, formatDateShort } from "../utils";
import axios from "axios";
import { toast } from "sonner";

export function NewSessionDialog({ open, onOpenChange, newSessionDate, setNewSessionDate, cloneSource, setCloneSource, sessions, saving, handleCreateSession }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-600" />{isAr ? "بدء جولة جديدة" : "Start New Tour"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label className="text-sm font-medium">{isAr ? "التاريخ" : "Date"}</Label><Input type="date" value={newSessionDate} onChange={(e) => setNewSessionDate(e.target.value)} className="mt-1" data-testid="new-session-date" /></div>
          <div>
            <Label className="text-sm font-medium mb-2 block">{isAr ? "مصدر المناطق" : "Zones Source"}</Label>
            <div className="space-y-2">
              {[
                { val: "auto", icon: RefreshCw, color: "text-emerald-600", title: isAr ? "تلقائي" : "Automatic", desc: isAr ? `نسخ من ${sessions.length > 0 ? "آخر جولة" : "الخريطة الأساسية"}` : `Clone from ${sessions.length > 0 ? "latest tour" : "master map"}`, testId: "source-auto" },
                { val: "master", icon: Database, color: "text-blue-600", title: isAr ? "الخريطة الأساسية" : "Master Map", desc: isAr ? "نسخ من المناطق الأصلية في إدارة الخرائط" : "Clone from original zones in map management", testId: "source-master" },
              ].map(opt => (
                <label key={opt.val} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${cloneSource === opt.val ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-200" : "hover:bg-slate-50"}`} data-testid={opt.testId}>
                  <input type="radio" name="cloneSource" value={opt.val} checked={cloneSource === opt.val} onChange={() => setCloneSource(opt.val)} className="accent-emerald-600" />
                  <div className="flex items-center gap-2 flex-1"><opt.icon className={`w-4 h-4 ${opt.color}`} /><div><p className="text-sm font-medium">{opt.title}</p><p className="text-[11px] text-muted-foreground">{opt.desc}</p></div></div>
                </label>
              ))}
              {sessions.length > 0 && (
                <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${cloneSource !== "auto" && cloneSource !== "master" && cloneSource !== "empty" ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-200" : "hover:bg-slate-50"}`} data-testid="source-session">
                  <input type="radio" name="cloneSource" value="session" checked={cloneSource !== "auto" && cloneSource !== "master" && cloneSource !== "empty"} onChange={() => setCloneSource(sessions[0].id)} className="accent-emerald-600 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><Copy className="w-4 h-4 text-purple-600" /><p className="text-sm font-medium">{isAr ? "نسخ من جولة محددة" : "Clone from specific tour"}</p></div>
                    {cloneSource !== "auto" && cloneSource !== "master" && cloneSource !== "empty" && (
                      <Select value={cloneSource} onValueChange={setCloneSource}>
                        <SelectTrigger className="mt-2 h-8 text-xs" data-testid="source-session-select"><SelectValue /></SelectTrigger>
                        <SelectContent>{sessions.map(s => <SelectItem key={s.id} value={s.id}>{formatDateShort(s.date)} - {s.status === "completed" ? (isAr ? "مكتمل" : "Done") : (isAr ? "مسودة" : "Draft")}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                </label>
              )}
              <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${cloneSource === "empty" ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-200" : "hover:bg-slate-50"}`} data-testid="source-empty">
                <input type="radio" name="cloneSource" value="empty" checked={cloneSource === "empty"} onChange={() => setCloneSource("empty")} className="accent-emerald-600" />
                <div className="flex items-center gap-2 flex-1"><FileStack className="w-4 h-4 text-slate-500" /><div><p className="text-sm font-medium">{isAr ? "بدء فارغ" : "Start Empty"}</p><p className="text-[11px] text-muted-foreground">{isAr ? "بدون أي مناطق - ارسم من الصفر" : "No zones - draw from scratch"}</p></div></div>
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreateSession} disabled={saving || !newSessionDate} className="bg-emerald-600 hover:bg-emerald-700" data-testid="confirm-new-session">
            {saving ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <Plus className="w-4 h-4 ml-1" />}{isAr ? "بدء الجولة" : "Start Tour"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BatchDialog({ open, onOpenChange, batchStartDate, setBatchStartDate, batchEndDate, setBatchEndDate, batchCloneSource, setBatchCloneSource, sessions, saving, handleBatchCreate }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><CalendarRange className="w-5 h-5 text-blue-600" />{isAr ? "إدخال متعدد (بأثر رجعي)" : "Batch Entry (Retroactive)"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100"><p className="text-xs text-blue-700"><AlertCircle className="w-4 h-4 inline ml-1" />{isAr ? "سيتم إنشاء جلسة لكل يوم في النطاق المحدد. الأيام الي فيها جلسات مسبقة سيتم تخطيها تلقائياً." : "A session will be created for each day in the range. Days with existing sessions will be skipped."}</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-sm font-medium">{isAr ? "من تاريخ" : "From"}</Label><Input type="date" value={batchStartDate} onChange={(e) => setBatchStartDate(e.target.value)} className="mt-1" data-testid="batch-start-date" /></div>
            <div><Label className="text-sm font-medium">{isAr ? "إلى تاريخ" : "To"}</Label><Input type="date" value={batchEndDate} onChange={(e) => setBatchEndDate(e.target.value)} className="mt-1" data-testid="batch-end-date" /></div>
          </div>
          <div><Label className="text-sm font-medium mb-2 block">{isAr ? "مصدر المناطق" : "Zones Source"}</Label>
            <Select value={batchCloneSource} onValueChange={setBatchCloneSource}><SelectTrigger data-testid="batch-source-select"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="master">{isAr ? "الخريطة الأساسية" : "Master Map"}</SelectItem><SelectItem value="empty">{isAr ? "بدء فارغ (بدون مناطق)" : "Empty (no zones)"}</SelectItem>{sessions.map(s => <SelectItem key={s.id} value={s.id}>{isAr ? "جولة " : "Tour "}{formatDateShort(s.date)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {batchStartDate && batchEndDate && <div className="text-center p-2 bg-slate-50 rounded"><p className="text-sm font-medium">{Math.max(0, Math.round((new Date(batchEndDate) - new Date(batchStartDate)) / 86400000) + 1)} {isAr ? "يوم" : "days"}</p></div>}
        </div>
        <DialogFooter>
          <Button onClick={handleBatchCreate} disabled={saving || !batchStartDate || !batchEndDate} className="bg-blue-600 hover:bg-blue-700" data-testid="confirm-batch">
            {saving ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <CalendarRange className="w-4 h-4 ml-1" />}{isAr ? "إنشاء الجلسات" : "Create Sessions"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ZoneEditDialog({ open, onOpenChange, selectedZone, setSelectedZone, activeSession, handleUpdateZone, handleToggleRemove, handleCategoryChange, setActiveSession, setSelectedZoneId, ZONE_TYPES }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  if (!selectedZone) return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent /></Dialog>;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><Edit2 className="w-5 h-5" />{isAr ? "تعديل المنطقة" : "Edit Zone"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: selectedZone.fill_color }}>{ZONE_TYPES.find(t => t.value === selectedZone.zone_type)?.icon || "?"}</div>
            <div className="flex-1"><p className="font-semibold text-sm">{selectedZone.zone_code}</p><p className="text-xs text-muted-foreground">{isAr ? selectedZone.name_ar : selectedZone.name_en}</p></div>
            {selectedZone.change_type && selectedZone.change_type !== "unchanged" && (() => { const cl = CHANGE_LABELS[selectedZone.change_type]; return cl ? <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: cl.bg, color: cl.color }}>{isAr ? cl.ar : cl.en}</span> : null; })()}
          </div>
          {activeSession?.status === "draft" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium">{isAr ? "اسم المنطقة" : "Zone Name"}</Label><Input className="mt-1 text-sm" value={selectedZone.name_ar || ""} onChange={(e) => setSelectedZone(p => ({ ...p, name_ar: e.target.value }))} data-testid="zone-edit-name" /></div>
              <div><Label className="text-xs font-medium">{isAr ? "الترميز" : "Zone Code"}</Label><Input className="mt-1 text-sm font-mono" value={selectedZone.zone_code || ""} onChange={(e) => setSelectedZone(p => ({ ...p, zone_code: e.target.value }))} data-testid="zone-edit-code" /></div>
            </div>
          )}
          <div><Label className="text-sm font-medium">{isAr ? "الفئة" : "Category"}</Label>
            <Select value={selectedZone.zone_type} onValueChange={(v) => { handleCategoryChange(selectedZone.id, v); setSelectedZone(p => ({ ...p, zone_type: v })); }} disabled={activeSession?.status === "completed"}>
              <SelectTrigger className="mt-1" data-testid="zone-category-select"><SelectValue /></SelectTrigger>
              <SelectContent>{ZONE_TYPES.map(t => <SelectItem key={t.value} value={t.value}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />{isAr ? t.label_ar : t.label_en}</div></SelectItem>)}</SelectContent>
            </Select>
          </div>
          {activeSession?.status === "draft" && (
            <div className="space-y-4" data-testid="capacity-calculator">
              <div className="p-3 border rounded-lg bg-blue-50/30">
                <h4 className="font-cairo font-semibold text-sm flex items-center gap-2 mb-3"><Maximize2 className="w-4 h-4 text-blue-600" />{isAr ? "حساب المساحة" : "Area Calculator"}</h4>
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div><Label className="text-xs">{isAr ? "الطول (م)" : "Length (m)"}</Label><Input type="text" inputMode="decimal" className="mt-1 text-sm font-mono" value={selectedZone.length_m ?? ""} data-testid="zone-length-input" onChange={(e) => { const val = e.target.value.replace(/[^\d.]/g, ""); const l = parseFloat(val) || 0; const w = selectedZone.width_m || 0; const area = +(l * w).toFixed(3); setSelectedZone(p => ({ ...p, length_m: val, area_sqm: area, max_capacity: area > 0 ? Math.round(area / 0.55) : 0 })); }} /></div>
                  <div><Label className="text-xs">{isAr ? "العرض (م)" : "Width (m)"}</Label><Input type="text" inputMode="decimal" className="mt-1 text-sm font-mono" value={selectedZone.width_m ?? ""} data-testid="zone-width-input" onChange={(e) => { const val = e.target.value.replace(/[^\d.]/g, ""); const w = parseFloat(val) || 0; const l = parseFloat(selectedZone.length_m) || 0; const area = +(l * w).toFixed(3); setSelectedZone(p => ({ ...p, width_m: val, area_sqm: area, max_capacity: area > 0 ? Math.round(area / 0.55) : 0 })); }} /></div>
                  <div className="text-center p-2 bg-white rounded-lg border"><span className="text-[10px] text-muted-foreground block">{isAr ? "المساحة" : "Area"}</span><span className="text-lg font-bold font-mono text-blue-700" data-testid="zone-area-result">{(selectedZone.area_sqm || 0).toLocaleString()}</span><span className="text-[10px] text-muted-foreground"> {isAr ? "م²" : "m²"}</span></div>
                </div>
              </div>
              {selectedZone.area_sqm > 0 && (
                <div className="p-3 border rounded-lg bg-emerald-50/30">
                  <h4 className="font-cairo font-semibold text-sm flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-emerald-600" />{isAr ? "مستويات السعة" : "Capacity Levels"}</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ pp: 0.75, label_ar: "آمن", label_en: "Safe", color: "#16a34a", bg: "#dcfce7" },{ pp: 0.60, label_ar: "متوسط", label_en: "Medium", color: "#d97706", bg: "#fefce8" },{ pp: 0.55, label_ar: "أقصى", label_en: "Maximum", color: "#dc2626", bg: "#fef2f2" }].map(level => (
                      <div key={level.pp} className="rounded-lg border p-2.5 text-center" style={{ backgroundColor: level.bg, borderColor: level.color + "30" }}>
                        <span className="text-[10px] font-medium block" style={{ color: level.color }}>{isAr ? level.label_ar : level.label_en}</span>
                        <span className="text-xl font-bold font-mono block" style={{ color: level.color }}>{Math.round(selectedZone.area_sqm / level.pp).toLocaleString()}</span>
                        <span className="text-[9px] text-muted-foreground">{level.pp} {isAr ? "م²/فرد" : "m²/p"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedZone.area_sqm > 0 && <CarpetCalculator selectedZone={selectedZone} setSelectedZone={setSelectedZone} isAr={isAr} />}
            </div>
          )}
          <div><Label className="text-sm font-medium">{isAr ? "ملاحظة يومية" : "Daily Note"}</Label><Textarea className="mt-1 text-sm" placeholder={isAr ? "أضف ملاحظة لهذا اليوم..." : "Add a note..."} value={selectedZone.daily_note || ""} onChange={(e) => setSelectedZone(p => ({ ...p, daily_note: e.target.value }))} rows={2} disabled={activeSession?.status === "completed"} data-testid="zone-daily-note" /></div>
          {activeSession?.status === "draft" && (
            <div className="p-3 border rounded-lg space-y-2">
              <Label className="text-sm font-medium">{isAr ? "حالة المنطقة" : "Zone Status"}</Label>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => { if (selectedZone.is_removed) { handleToggleRemove(selectedZone.id, true); setSelectedZone(p => ({ ...p, is_removed: false })); } }} className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-all ${!selectedZone.is_removed ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-slate-50"}`} data-testid="zone-status-active"><CircleDot className="w-5 h-5 text-emerald-500" /><span className="font-medium">{isAr ? "نشط" : "Active"}</span></button>
                <button onClick={() => { if (!selectedZone.is_removed) { handleToggleRemove(selectedZone.id, false); setSelectedZone(p => ({ ...p, is_removed: true })); } }} className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-all ${selectedZone.is_removed ? "border-amber-500 bg-amber-50 ring-1 ring-amber-200" : "hover:bg-slate-50"}`} data-testid="zone-status-inactive"><CircleOff className="w-5 h-5 text-amber-500" /><span className="font-medium">{isAr ? "غير نشط" : "Inactive"}</span></button>
                <button onClick={async () => {
                  try {
                    await axios.delete(`${API}/admin/map-sessions/${activeSession.id}/zones/${selectedZone.id}`, getAuthHeaders());
                    const res = await axios.get(`${API}/map-sessions/${activeSession.id}`);
                    setActiveSession(res.data); onOpenChange(false); setSelectedZoneId(null);
                    toast.success(isAr ? "تم حذف المنطقة نهائياً" : "Zone permanently deleted");
                  } catch { toast.error(isAr ? "تعذر الحذف" : "Delete failed"); }
                }} className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-red-200 text-xs transition-all hover:bg-red-50 hover:border-red-400" data-testid="zone-status-delete"><Trash2 className="w-5 h-5 text-red-500" /><span className="font-medium text-red-600">{isAr ? "حذف نهائي" : "Delete"}</span></button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          {activeSession?.status === "draft" && (
            <Button onClick={() => { handleUpdateZone(selectedZone.id, { name_ar: selectedZone.name_ar, name_en: selectedZone.name_en, zone_code: selectedZone.zone_code, daily_note: selectedZone.daily_note, area_sqm: selectedZone.area_sqm, length_m: selectedZone.length_m, width_m: selectedZone.width_m, per_person_sqm: selectedZone.per_person_sqm || 0.55, max_capacity: selectedZone.max_capacity, carpet_length: selectedZone.carpet_length, carpet_width: selectedZone.carpet_width }); onOpenChange(false); }} data-testid="save-zone-changes"><Save className="w-4 h-4 ml-1" />{isAr ? "حفظ" : "Save"}</Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>{isAr ? "إغلاق" : "Close"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CarpetCalculator({ selectedZone, setSelectedZone, isAr }) {
  const cl = selectedZone.carpet_length || 1.2;
  const cw = selectedZone.carpet_width || 0.7;
  const zl = selectedZone.length_m || 0;
  const zw = selectedZone.width_m || 0;
  const carpetsPerRow = zw > 0 ? Math.floor(zw / cw) : 0;
  const numRows = zl > 0 ? Math.floor(zl / cl) : 0;
  const totalCarpets = carpetsPerRow * numRows;

  return (
    <div className="p-3 border rounded-lg bg-amber-50/30">
      <h4 className="font-cairo font-semibold text-sm flex items-center gap-2 mb-3"><Layers className="w-4 h-4 text-amber-600" />{isAr ? "حساب سجاجيد الصلاة" : "Prayer Carpet Calculator"}</h4>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div><Label className="text-xs">{isAr ? "طول السجادة (م)" : "Carpet Length (m)"}</Label><Input type="text" inputMode="decimal" className="mt-1 text-sm font-mono" value={selectedZone.carpet_length ?? "1.2"} data-testid="carpet-length-input" onChange={(e) => setSelectedZone(p => ({ ...p, carpet_length: e.target.value.replace(/[^\d.]/g, "") }))} /></div>
        <div><Label className="text-xs">{isAr ? "عرض السجادة (م)" : "Carpet Width (m)"}</Label><Input type="text" inputMode="decimal" className="mt-1 text-sm font-mono" value={selectedZone.carpet_width ?? "0.7"} data-testid="carpet-width-input" onChange={(e) => setSelectedZone(p => ({ ...p, carpet_width: e.target.value.replace(/[^\d.]/g, "") }))} /></div>
      </div>
      {zl > 0 && zw > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-amber-200 bg-white p-2.5 text-center"><span className="text-[10px] text-muted-foreground block">{isAr ? "عدد السجاجيد" : "Total Carpets"}</span><span className="text-xl font-bold font-mono text-amber-700" data-testid="carpets-total">{totalCarpets.toLocaleString()}</span></div>
            <div className="rounded-lg border border-amber-200 bg-white p-2.5 text-center"><span className="text-[10px] text-muted-foreground block">{isAr ? "عدد الصفوف" : "Rows"}</span><span className="text-xl font-bold font-mono text-amber-700" data-testid="carpets-rows">{numRows}</span></div>
            <div className="rounded-lg border border-amber-200 bg-white p-2.5 text-center"><span className="text-[10px] text-muted-foreground block">{isAr ? "سجاجيد/صف" : "Per Row"}</span><span className="text-xl font-bold font-mono text-amber-700" data-testid="carpets-per-row">{carpetsPerRow}</span></div>
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-amber-100 text-center space-y-1.5">
            <div className="flex items-center justify-center gap-1.5 text-[11px] flex-wrap">
              <span className="text-muted-foreground">{isAr ? "عدد الصفوف" : "Rows"}:</span>
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-mono font-bold">{parseFloat(zl).toFixed(2)}</span>
              <span className="text-slate-400">&divide;</span>
              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-mono font-bold">{parseFloat(cl).toFixed(2)}</span>
              <span className="text-slate-400">=</span>
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-mono font-bold">{numRows}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] flex-wrap">
              <span className="text-muted-foreground">{isAr ? "سجاجيد/صف" : "Per row"}:</span>
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-mono font-bold">{parseFloat(zw).toFixed(2)}</span>
              <span className="text-slate-400">&divide;</span>
              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-mono font-bold">{parseFloat(cw).toFixed(2)}</span>
              <span className="text-slate-400">=</span>
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-mono font-bold">{carpetsPerRow}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px]">
              <span className="text-muted-foreground">{isAr ? "الإجمالي" : "Total"}:</span>
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-mono font-bold">{numRows}</span>
              <span className="text-slate-400">&times;</span>
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-mono font-bold">{carpetsPerRow}</span>
              <span className="text-slate-400">=</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono font-bold text-sm">{totalCarpets.toLocaleString()} {isAr ? "سجادة" : "carpets"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function NewZoneDialog({ open, onOpenChange, newZoneForm, setNewZoneForm, drawingPoints, setDrawingPoints, handleSaveNewZone, ZONE_TYPES }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setDrawingPoints([]); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-600" />{isAr ? "إضافة منطقة جديدة" : "Add New Zone"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: ZONE_TYPES.find(t => t.value === newZoneForm.zone_type)?.color || "#22c55e" }}>{ZONE_TYPES.find(t => t.value === newZoneForm.zone_type)?.icon || "?"}</div>
            <div className="flex-1"><p className="text-sm font-medium text-emerald-700">{newZoneForm.name_ar || (isAr ? "منطقة جديدة" : "New Zone")}</p><p className="text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5 inline ml-1" />{isAr ? `تم رسم الشكل بـ ${drawingPoints.length} نقطة` : `Shape drawn with ${drawingPoints.length} points`}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-medium">{isAr ? "اسم المنطقة" : "Zone Name"}</Label><Input className="mt-1 text-sm" placeholder={isAr ? "مثال: مصلى رجال 5" : "e.g., Men Prayer 5"} value={newZoneForm.name_ar} onChange={(e) => setNewZoneForm(p => ({ ...p, name_ar: e.target.value }))} data-testid="new-zone-name" /></div>
            <div><Label className="text-xs font-medium">{isAr ? "الترميز" : "Zone Code"}</Label><Input className="mt-1 text-sm font-mono" placeholder={isAr ? "مثال: Z-001" : "e.g., Z-001"} value={newZoneForm.zone_code} onChange={(e) => setNewZoneForm(p => ({ ...p, zone_code: e.target.value }))} data-testid="new-zone-code" /></div>
          </div>
          <div><Label className="text-sm font-medium">{isAr ? "الفئة" : "Category"}</Label>
            <Select value={newZoneForm.zone_type} onValueChange={(v) => setNewZoneForm(p => ({ ...p, zone_type: v, fill_color: ZONE_TYPES.find(t => t.value === v)?.color || "#22c55e" }))}>
              <SelectTrigger className="mt-1" data-testid="new-zone-type"><SelectValue /></SelectTrigger>
              <SelectContent>{ZONE_TYPES.map(t => <SelectItem key={t.value} value={t.value}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />{isAr ? t.label_ar : t.label_en}</div></SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-3 p-3 border rounded-lg bg-blue-50/30" data-testid="new-zone-capacity-calculator">
            <h4 className="font-cairo font-semibold text-sm flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" />{isAr ? "حساب السعة" : "Capacity Calculator"}</h4>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">{isAr ? "المساحة (م²)" : "Area (m²)"}</Label><Input type="number" min={0} className="mt-1 text-sm font-mono" value={newZoneForm.area_sqm} onChange={(e) => { const area = parseFloat(e.target.value) || 0; const pp = newZoneForm.per_person_sqm || 0.8; setNewZoneForm(p => ({ ...p, area_sqm: area, max_capacity: pp > 0 && area > 0 ? Math.round(area / pp) : p.max_capacity })); }} data-testid="new-zone-area" /></div>
              <div><Label className="text-xs">{isAr ? "نصيب الفرد (م²)" : "Per Person (m²)"}</Label><Input type="number" min={0.1} step={0.1} className="mt-1 text-sm font-mono" value={newZoneForm.per_person_sqm} onChange={(e) => { const pp = parseFloat(e.target.value) || 0.8; const area = newZoneForm.area_sqm || 0; setNewZoneForm(p => ({ ...p, per_person_sqm: pp, max_capacity: pp > 0 && area > 0 ? Math.round(area / pp) : p.max_capacity })); }} data-testid="new-zone-perperson" /></div>
              <div><Label className="text-xs">{isAr ? "السعة القصوى" : "Max Capacity"}</Label><Input type="number" min={0} className="mt-1 text-sm font-mono font-bold" value={newZoneForm.max_capacity} onChange={(e) => setNewZoneForm(p => ({ ...p, max_capacity: parseInt(e.target.value) || 0 }))} data-testid="new-zone-capacity" /></div>
            </div>
            {newZoneForm.area_sqm > 0 && newZoneForm.per_person_sqm > 0 && (
              <div className="p-3 bg-white rounded-lg border border-blue-100 text-center">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg font-bold font-mono">{newZoneForm.area_sqm} {isAr ? "م²" : "m²"}</span>
                  <span className="text-slate-400 font-bold text-lg">&divide;</span>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-bold font-mono">{newZoneForm.per_person_sqm} {isAr ? "م²/فرد" : "m²/p"}</span>
                  <span className="text-slate-400 font-bold text-lg">=</span>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg font-bold font-mono text-base">{Math.round(newZoneForm.area_sqm / newZoneForm.per_person_sqm).toLocaleString()} {isAr ? "مصلي" : "cap"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSaveNewZone} className="bg-emerald-600 hover:bg-emerald-700" data-testid="confirm-new-zone"><Plus className="w-4 h-4 ml-1" />{isAr ? "إضافة المنطقة" : "Add Zone"}</Button>
          <Button variant="outline" onClick={() => { onOpenChange(false); setDrawingPoints([]); }}>{isAr ? "إلغاء" : "Cancel"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NotesDialog({ open, onOpenChange, sessionNotes, setSessionNotes, handleUpdateSession }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><MessageSquare className="w-5 h-5" />{isAr ? "ملاحظات المشرف" : "Supervisor Notes"}</DialogTitle></DialogHeader>
        <Textarea value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} placeholder={isAr ? "أضف ملاحظاتك..." : "Add your notes..."} rows={5} className="text-sm" data-testid="supervisor-notes-textarea" />
        <DialogFooter>
          <Button onClick={() => { handleUpdateSession({ supervisor_notes: sessionNotes }); onOpenChange(false); }} data-testid="save-notes-btn"><Save className="w-4 h-4 ml-1" />{isAr ? "حفظ" : "Save"}</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CompareDialog({ open, onOpenChange, compareData, ZONE_TYPES }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle className="font-cairo flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-blue-600" />{isAr ? "مقارنة الجولات" : "Compare Tours"}</DialogTitle></DialogHeader>
        {compareData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="text-center flex-1"><p className="text-xs text-muted-foreground">{isAr ? "الحالية" : "Current"}</p><p className="font-semibold text-sm">{formatDateShort(compareData.session_1.date)}</p></div>
              <ArrowLeftRight className="w-5 h-5 text-slate-400 mx-3" />
              <div className="text-center flex-1"><p className="text-xs text-muted-foreground">{isAr ? "المقارنة" : "Compared"}</p><p className="font-semibold text-sm">{formatDateShort(compareData.session_2.date)}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-emerald-50 rounded-lg"><p className="text-2xl font-bold text-emerald-600">{compareData.added.length}</p><p className="text-xs text-emerald-600">{isAr ? "مضاف" : "Added"}</p></div>
              <div className="text-center p-3 bg-red-50 rounded-lg"><p className="text-2xl font-bold text-red-500">{compareData.removed.length}</p><p className="text-xs text-red-500">{isAr ? "محذوف" : "Removed"}</p></div>
              <div className="text-center p-3 bg-amber-50 rounded-lg"><p className="text-2xl font-bold text-amber-600">{compareData.modified.length}</p><p className="text-xs text-amber-600">{isAr ? "معدّل" : "Modified"}</p></div>
            </div>
            {compareData.added.length > 0 && <div><h4 className="text-sm font-semibold mb-2 text-emerald-600 flex items-center gap-1"><Plus className="w-4 h-4" />{isAr ? "مضافة" : "Added"}</h4>{compareData.added.map((z,i) => <div key={i} className="p-2 bg-emerald-50 rounded mb-1 text-sm flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: z.fill_color }} /><span className="font-medium">{z.zone_code}</span><span className="text-muted-foreground">- {isAr ? z.name_ar : z.name_en}</span></div>)}</div>}
            {compareData.removed.length > 0 && <div><h4 className="text-sm font-semibold mb-2 text-red-500 flex items-center gap-1"><X className="w-4 h-4" />{isAr ? "محذوفة" : "Removed"}</h4>{compareData.removed.map((z,i) => <div key={i} className="p-2 bg-red-50 rounded mb-1 text-sm flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: z.fill_color }} /><span className="font-medium line-through">{z.zone_code}</span><span className="text-muted-foreground">- {isAr ? z.name_ar : z.name_en}</span></div>)}</div>}
            {compareData.modified.length > 0 && <div><h4 className="text-sm font-semibold mb-2 text-amber-600 flex items-center gap-1"><Edit2 className="w-4 h-4" />{isAr ? "معدّلة" : "Modified"}</h4>{compareData.modified.map((m,i) => <div key={i} className="p-2 bg-amber-50 rounded mb-1 text-sm"><div className="flex items-center gap-2"><span className="font-medium">{m.before.zone_code}</span><ArrowRight className="w-3 h-3 text-amber-500" /><span>{m.after.zone_code}</span></div>{m.before.zone_type !== m.after.zone_type && <div className="text-[11px] text-amber-600 mt-0.5">{isAr ? "الفئة: " : "Type: "}{ZONE_TYPES.find(t => t.value === m.before.zone_type)?.[isAr ? "label_ar" : "label_en"]} → {ZONE_TYPES.find(t => t.value === m.after.zone_type)?.[isAr ? "label_ar" : "label_en"]}</div>}</div>)}</div>}
            {compareData.unchanged_count > 0 && <p className="text-xs text-muted-foreground text-center">{compareData.unchanged_count} {isAr ? "بدون تغيير" : "unchanged"}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
