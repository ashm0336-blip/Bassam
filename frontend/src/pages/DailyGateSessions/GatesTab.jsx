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
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isAr ? "بحث عن باب..." : "Search gates..."} className="pr-9 h-9 text-sm" data-testid="gate-search" />
      </div>

      {/* Two-row filters */}
      <div className="space-y-2">
        {/* Status filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-slate-400 w-14">{isAr ? 'الحالة:' : 'Status:'}</span>
          {[
            { key: "all", label: isAr ? "الكل" : "All", count: counts.total, color: "#475569" },
            { key: "open", label: isAr ? "مفتوح" : "Open", count: counts.open, color: "#22c55e" },
            { key: "closed", label: isAr ? "مغلق" : "Closed", count: counts.closed, color: "#ef4444" },
          ].map(f => (
            <button key={f.key} onClick={() => { setFilterStatus(f.key); if (f.key === "closed") setFilterIndicator("all"); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${filterStatus === f.key ? 'text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              style={filterStatus === f.key ? { backgroundColor: f.color } : {}} data-testid={`filter-status-${f.key}`}>
              {f.key !== "all" && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: filterStatus === f.key ? '#fff' : f.color }} />}
              {f.label} <span className="text-[10px] opacity-70">({f.count})</span>
            </button>
          ))}
        </div>

        {/* Indicator filter - only for open gates */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-slate-400 w-14 flex items-center gap-1">
            <Gauge className="w-3 h-3" />{isAr ? 'الازدحام:' : 'Crowd:'}
          </span>
          {[
            { key: "all", label: isAr ? "الكل" : "All", count: counts.open },
            { key: "light", label: isAr ? "خفيف" : "Light", count: counts.light, color: "#22c55e" },
            { key: "medium", label: isAr ? "متوسط" : "Medium", count: counts.medium, color: "#f59e0b" },
            { key: "crowded", label: isAr ? "مزدحم" : "Crowded", count: counts.crowded, color: "#ef4444" },
          ].map(f => (
            <button key={f.key}
              onClick={() => { setFilterIndicator(f.key); if (f.key !== "all") setFilterStatus("open"); }}
              disabled={filterStatus === "closed"}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all
                ${filterStatus === "closed" ? 'opacity-40 cursor-not-allowed' : ''}
                ${filterIndicator === f.key && filterStatus !== "closed" ? 'text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              style={filterIndicator === f.key && filterStatus !== "closed" ? { backgroundColor: f.color || "#475569" } : {}}
              data-testid={`filter-indicator-${f.key}`}>
              {f.color && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: filterIndicator === f.key ? '#fff' : f.color }} />}
              {f.label} <span className="text-[10px] opacity-70">({f.count})</span>
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
