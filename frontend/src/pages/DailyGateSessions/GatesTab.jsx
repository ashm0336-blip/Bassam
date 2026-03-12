import { useState, useMemo } from "react";
import {
  DoorOpen, DoorClosed, Users, MessageSquare, AlertCircle, Search, Gauge
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const STATUS_CONFIG = {
  open: { color: "#22c55e", label_ar: "مفتوح", label_en: "Open", icon: DoorOpen },
  closed: { color: "#ef4444", label_ar: "مغلق", label_en: "Closed", icon: DoorClosed },
};

const INDICATOR_CONFIG = {
  light: { color: "#22c55e", label_ar: "خفيف", label_en: "Light" },
  medium: { color: "#f59e0b", label_ar: "متوسط", label_en: "Medium" },
  crowded: { color: "#ef4444", label_ar: "مزدحم", label_en: "Crowded" },
};

const CLASSIFICATIONS = [
  { value: "general", label_ar: "عام", label_en: "General" },
  { value: "men", label_ar: "رجال", label_en: "Men" },
  { value: "women", label_ar: "نساء", label_en: "Women" },
  { value: "emergency", label_ar: "طوارئ", label_en: "Emergency" },
];

const DIRECTIONS = [
  { value: "entry", label_ar: "دخول", label_en: "Entry" },
  { value: "exit", label_ar: "خروج", label_en: "Exit" },
  { value: "both", label_ar: "دخول وخروج", label_en: "Both" },
];

export function GatesTab({ activeGates, removedGates, activeSession, isAr, onUpdateGate }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterIndicator, setFilterIndicator] = useState("all");
  const [noteGate, setNoteGate] = useState(null);
  const [noteText, setNoteText] = useState("");

  const isDraft = activeSession?.status === "draft";

  const filteredGates = useMemo(() => {
    let gates = activeGates;
    if (filterStatus !== "all") gates = gates.filter(g => g.status === filterStatus);
    if (filterIndicator !== "all") gates = gates.filter(g => g.status === "open" && (g.indicator || "light") === filterIndicator);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      gates = gates.filter(g => g.name_ar?.toLowerCase().includes(q) || g.name_en?.toLowerCase().includes(q));
    }
    return gates;
  }, [activeGates, filterStatus, filterIndicator, searchQuery]);

  const handleStatusChange = (gateId, newStatus) => {
    if (!isDraft) return;
    const update = { status: newStatus };
    if (newStatus === "closed") update.indicator = "light";
    onUpdateGate(gateId, update);
    toast.success(isAr ? "تم تحديث الحالة" : "Status updated", { duration: 1200 });
  };

  const handleIndicatorChange = (gateId, newIndicator) => {
    if (!isDraft) return;
    onUpdateGate(gateId, { indicator: newIndicator });
    toast.success(isAr ? "تم تحديث المؤشر" : "Indicator updated", { duration: 1200 });
  };

  const handleToggleRemove = (gateId, isRemoved) => {
    onUpdateGate(gateId, { is_removed: !isRemoved });
  };

  const handleSaveNote = () => {
    if (!noteGate) return;
    onUpdateGate(noteGate.id, { daily_note: noteText });
    setNoteGate(null);
    toast.success(isAr ? "تم حفظ الملاحظة" : "Note saved", { duration: 1200 });
  };

  const counts = useMemo(() => {
    const total = activeGates.length;
    const open = activeGates.filter(g => g.status === "open").length;
    const closed = activeGates.filter(g => g.status === "closed").length;
    const openGates = activeGates.filter(g => g.status === "open");
    const light = openGates.filter(g => (g.indicator || "light") === "light").length;
    const medium = openGates.filter(g => (g.indicator || "light") === "medium").length;
    const crowded = openGates.filter(g => (g.indicator || "light") === "crowded").length;
    return { total, open, closed, light, medium, crowded };
  }, [activeGates]);

  return (
    <div className="space-y-3" data-testid="gates-tab">
      {/* Professional Toolbar */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm flex-wrap">
        {/* Search */}
        <div className="relative min-w-[140px]">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث..." : "Search..."} className="pr-7 h-8 text-[10px] w-full" data-testid="gate-search" />
        </div>

        <div className="w-px h-5 bg-slate-200 hidden sm:block" />

        {/* Status filter pills */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {[
            { key: "all", label: isAr ? "الكل" : "All" },
            { key: "open", label: isAr ? "مفتوح" : "Open" },
            { key: "closed", label: isAr ? "مغلق" : "Closed" },
          ].map(f => (
            <button key={f.key} onClick={() => { setFilterStatus(f.key); if (f.key === "closed") setFilterIndicator("all"); }}
              data-testid={`filter-status-${f.key}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold transition-all ${filterStatus === f.key ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200 hidden sm:block" />

        {/* KPI + Legend pills */}
        <div className="hidden sm:flex items-center gap-1.5 mr-auto">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100">
            <DoorOpen className="w-3 h-3 text-blue-500" />
            <span className="text-[9px] font-bold text-blue-600">{counts.total}</span>
            <span className="text-[8px] text-slate-400">{isAr ? "باب" : "gates"}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg border" style={{ backgroundColor: counts.total > 0 ? "#05966908" : "#f1f5f9", borderColor: "#05966930" }}>
            <span className="text-[9px] font-bold text-emerald-600">{counts.total > 0 ? Math.round(counts.open / counts.total * 100) : 0}%</span>
            <span className="text-[8px] text-slate-400">{isAr ? "مفتوح" : "open"}</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          {[
            { color: "#16a34a", label: isAr ? "خفيف" : "Light", count: counts.light },
            { color: "#f59e0b", label: isAr ? "متوسط" : "Med", count: counts.medium },
            { color: "#ef4444", label: isAr ? "مزدحم" : "Crowd", count: counts.crowded },
          ].filter(l => l.count > 0 || l.color === "#16a34a").map(l => (
            <button key={l.color}
              onClick={() => { if (l.color === "#16a34a") { setFilterIndicator("light"); setFilterStatus("open"); } else if (l.color === "#f59e0b") { setFilterIndicator("medium"); setFilterStatus("open"); } else { setFilterIndicator("crowded"); setFilterStatus("open"); } }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all hover:scale-105" style={{ borderColor: l.color + "40", backgroundColor: l.color + "08" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
              {l.count > 0 && <span className="text-[8px] font-bold" style={{ color: l.color }}>{l.count}</span>}
              <span className="text-[8px] font-medium" style={{ color: l.color + "cc" }}>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Gates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {filteredGates.map(gate => {
          const isOpen = gate.status === "open";
          const sc = STATUS_CONFIG[gate.status] || STATUS_CONFIG.open;
          const ic = INDICATOR_CONFIG[gate.indicator || "light"] || INDICATOR_CONFIG.light;
          const dir = DIRECTIONS.find(d => d.value === gate.direction);
          const cls = CLASSIFICATIONS.find(c => c.value === gate.classification);

          return (
            <div key={gate.id} className="relative rounded-xl border bg-white p-3 transition-all hover:shadow-md group" data-testid={`gate-card-${gate.id}`}>
              {/* Top: Name + Status badge + Note */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-cairo font-bold text-sm truncate">{gate.name_ar}</span>
                    <Badge className="text-[9px] px-1.5 py-0" style={{ backgroundColor: `${sc.color}15`, color: sc.color, border: `1px solid ${sc.color}30` }}>
                      {isAr ? sc.label_ar : sc.label_en}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                    {dir && <span>{isAr ? dir.label_ar : dir.label_en}</span>}
                    {cls && <span>{isAr ? cls.label_ar : cls.label_en}</span>}
                    {(gate.assigned_staff || 0) > 0 && (
                      <span className="flex items-center gap-0.5 text-blue-600"><Users className="w-3 h-3" />{gate.assigned_staff}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => { setNoteGate(gate); setNoteText(gate.daily_note || ""); }}
                  className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${gate.daily_note ? "bg-amber-100 text-amber-600" : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"}`}>
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status row: Open / Closed */}
              <div className="space-y-1.5">
                {isDraft ? (
                  <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-lg" data-testid={`gate-status-bar-${gate.id}`}>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                      const isActive = gate.status === key;
                      return (
                        <button key={key} onClick={() => handleStatusChange(gate.id, key)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${isActive ? "text-white shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-white"}`}
                          style={isActive ? { backgroundColor: cfg.color } : {}} data-testid={`gate-${gate.id}-status-${key}`}>
                          <cfg.icon className="w-3.5 h-3.5" />
                          {isAr ? cfg.label_ar : cfg.label_en}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: `${sc.color}10` }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sc.color }} />
                    <span className="text-xs font-semibold" style={{ color: sc.color }}>{isAr ? sc.label_ar : sc.label_en}</span>
                  </div>
                )}

                {/* Indicator row: Light / Medium / Crowded (only for open gates) */}
                {isOpen && isDraft ? (
                  <div className="flex items-center gap-1 p-1 bg-amber-50/50 rounded-lg border border-amber-100" data-testid={`gate-indicator-bar-${gate.id}`}>
                    <Gauge className="w-3 h-3 text-amber-400 mx-1 flex-shrink-0" />
                    {Object.entries(INDICATOR_CONFIG).map(([key, cfg]) => {
                      const isActive = (gate.indicator || "light") === key;
                      return (
                        <button key={key} onClick={() => handleIndicatorChange(gate.id, key)}
                          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold transition-all ${isActive ? "text-white shadow-sm" : "text-slate-400 hover:bg-white"}`}
                          style={isActive ? { backgroundColor: cfg.color } : {}} data-testid={`gate-${gate.id}-indicator-${key}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white/60' : ''}`} style={!isActive ? { backgroundColor: cfg.color } : {}} />
                          {isAr ? cfg.label_ar : cfg.label_en}
                        </button>
                      );
                    })}
                  </div>
                ) : isOpen && !isDraft ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: `${ic.color}08` }}>
                    <Gauge className="w-3 h-3" style={{ color: ic.color }} />
                    <span className="text-[10px] font-medium" style={{ color: ic.color }}>
                      {isAr ? 'الازدحام:' : 'Crowd:'} {isAr ? ic.label_ar : ic.label_en}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Note preview */}
              {gate.daily_note && (
                <div className="mt-2 px-2 py-1 bg-amber-50 rounded text-[10px] text-amber-700 truncate border-r-2 border-amber-300">
                  {gate.daily_note}
                </div>
              )}

              {/* Disable button */}
              {isDraft && (
                <button onClick={() => handleToggleRemove(gate.id, gate.is_removed)}
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-red-100 text-red-400 hover:bg-red-200 hover:text-red-600 flex items-center justify-center transition-all text-[10px]"
                  title={isAr ? "تعطيل" : "Disable"}>
                  x
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Removed gates */}
      {removedGates.length > 0 && (
        <div className="pt-3 border-t">
          <h4 className="text-xs font-semibold text-red-500 mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {isAr ? "أبواب معطلة" : "Disabled Gates"}
            <Badge variant="destructive" className="text-[10px] px-1.5">{removedGates.length}</Badge>
          </h4>
          <div className="flex flex-wrap gap-2">
            {removedGates.map(gate => (
              <div key={gate.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50/50">
                <span className="text-xs text-red-400 line-through">{gate.name_ar}</span>
                {isDraft && (
                  <button onClick={() => handleToggleRemove(gate.id, true)}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium">
                    {isAr ? "استعادة" : "Restore"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note Dialog */}
      <Dialog open={!!noteGate} onOpenChange={(open) => { if (!open) setNoteGate(null); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              {isAr ? "ملاحظة" : "Note"} - {noteGate?.name_ar}
            </DialogTitle>
          </DialogHeader>
          <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
            placeholder={isAr ? "أضف ملاحظة..." : "Add note..."} rows={3} className="text-sm" disabled={!isDraft} />
          <DialogFooter>
            {isDraft && <Button size="sm" onClick={handleSaveNote}>{isAr ? "حفظ" : "Save"}</Button>}
            <Button size="sm" variant="outline" onClick={() => setNoteGate(null)}>{isAr ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
