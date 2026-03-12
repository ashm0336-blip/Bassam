import { useState, useMemo } from "react";
import {
  Plus, Trash2, Edit2, Check, CheckCircle2, MessageSquare, FileText,
  Clock, Filter, Download, Activity, Layers, User2, ChevronDown,
  ArrowRight, Tag, Hash, Palette, Users, Maximize2,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// ── Helpers ────────────────────────────────────────────────────
function formatSATime(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    const sa = new Date(d.getTime() + 3 * 60 * 60 * 1000);
    const h = String(sa.getUTCHours()).padStart(2,"0");
    const m = String(sa.getUTCMinutes()).padStart(2,"0");
    return `${h}:${m}`;
  } catch { return "—"; }
}
function formatSADateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("ar-SA", {
      timeZone: "Asia/Riyadh",
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

const CHANGE_CONFIG = {
  added:            { label:"إضافة",       color:"#059669", bg:"#ecfdf5", border:"#a7f3d0", icon:Plus,    dot:"bg-emerald-500" },
  modified:         { label:"تعديل",       color:"#d97706", bg:"#fffbeb", border:"#fcd34d", icon:Edit2,   dot:"bg-amber-500"   },
  category_changed: { label:"تغيير فئة",   color:"#7c3aed", bg:"#f5f3ff", border:"#c4b5fd", icon:Tag,     dot:"bg-violet-500"  },
  moved:            { label:"تحريك",       color:"#0284c7", bg:"#e0f2fe", border:"#7dd3fc", icon:Maximize2,dot:"bg-sky-500"    },
  removed:          { label:"حذف",         color:"#dc2626", bg:"#fef2f2", border:"#fecaca", icon:Trash2,  dot:"bg-red-500"     },
  assigned:         { label:"تعيين موظف",  color:"#059669", bg:"#ecfdf5", border:"#a7f3d0", icon:User2,   dot:"bg-emerald-400" },
  unassigned:       { label:"فك تعيين",    color:"#6b7280", bg:"#f9fafb", border:"#e5e7eb", icon:User2,   dot:"bg-slate-400"   },
  unchanged:        { label:"بدون تغيير",  color:"#94a3b8", bg:"#f8fafc", border:"#e2e8f0", icon:Check,   dot:"bg-slate-300"   },
};

function buildTimeline(activeSession, ZONE_TYPES, isAr) {
  const allZones = activeSession?.zones || [];
  const events = [];

  allZones.forEach(zone => {
    const hist = zone.history || [];
    // من الـ history في كل zone
    hist.forEach(h => {
      const cfg = CHANGE_CONFIG[h.action] || CHANGE_CONFIG[h.action?.includes("assign")?"assigned":"modified"];
      const ti = ZONE_TYPES?.find(t => t.value === zone.zone_type);
      events.push({
        id: `${zone.id}-${h.at}`,
        zone_id: zone.id,
        zone_code: zone.zone_code || "—",
        zone_name: isAr ? zone.name_ar : (zone.name_en || zone.name_ar),
        zone_color: zone.fill_color || "#6b7280",
        zone_icon: ti?.icon || "🏛️",
        zone_type: ti?.label_ar || zone.zone_type || "—",
        action: h.action || "modified",
        by: h.by || "النظام",
        at: h.at,
        note: h.note || "",
        is_removed: zone.is_removed,
      });
    });

    // إذا لا يوجد history لكن يوجد change_type
    if (hist.length === 0 && zone.change_type && zone.change_type !== "unchanged") {
      const ti = ZONE_TYPES?.find(t => t.value === zone.zone_type);
      events.push({
        id: zone.id,
        zone_id: zone.id,
        zone_code: zone.zone_code || "—",
        zone_name: isAr ? zone.name_ar : (zone.name_en || zone.name_ar),
        zone_color: zone.fill_color || "#6b7280",
        zone_icon: ti?.icon || "🏛️",
        zone_type: ti?.label_ar || zone.zone_type || "—",
        action: zone.change_type || (zone.is_removed ? "removed" : "modified"),
        by: zone.updated_by || "—",
        at: zone.updated_at || zone.created_at,
        note: "",
        is_removed: zone.is_removed,
      });
    }
  });

  return events.sort((a,b) => (b.at||"").localeCompare(a.at||""));
}

export function ChangesLog({ activeSession, changedZones, ZONE_TYPES }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [filter, setFilter] = useState("all");

  const allZones     = activeSession?.zones || [];
  const totalZones   = allZones.length;
  const summary      = activeSession?.changes_summary || {};
  const addedCount   = allZones.filter(z => z.change_type === "added").length;
  const editedCount  = allZones.filter(z => z.change_type && ["modified","category_changed","moved"].includes(z.change_type)).length;
  const removedCount = allZones.filter(z => z.is_removed || z.change_type === "removed").length;
  const unchanged    = allZones.filter(z => !z.is_removed && (!z.change_type || z.change_type === "unchanged")).length;
  const hasChanges   = changedZones.length > 0 || allZones.some(z => z.is_removed);

  const timeline = useMemo(() => buildTimeline(activeSession, ZONE_TYPES, isAr), [activeSession, ZONE_TYPES, isAr]);

  const filtered = useMemo(() => {
    if (filter === "all") return timeline;
    return timeline.filter(e => {
      if (filter === "added")   return e.action === "added";
      if (filter === "modified") return ["modified","category_changed","moved"].includes(e.action);
      if (filter === "removed") return e.action === "removed" || e.is_removed;
      return true;
    });
  }, [timeline, filter]);

  return (
    <div data-testid="changes-log" className="space-y-3">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl p-4"
        style={{ background:"linear-gradient(135deg,#fffbeb 0%,#fef3c7 50%,#fffbeb 100%)", border:"1px solid #fcd34d" }}>
        <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10 bg-amber-400"/>
        <div className="relative flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shadow-sm">
              <Activity className="w-4.5 h-4.5 text-amber-600"/>
            </div>
            <div>
              <h3 className="font-cairo font-bold text-sm text-amber-900">سجل التغييرات</h3>
              <p className="text-[9px] text-amber-600">
                {timeline.length > 0
                  ? `${timeline.length} حدث مسجّل · آخر تحديث: ${formatSATime(timeline[0]?.at)}`
                  : "لا توجد تغييرات حتى الآن"}
              </p>
            </div>
          </div>
          {/* Filter chips */}
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { key:"all",      label:`الكل (${timeline.length})`,    color:"#6b7280" },
              { key:"added",    label:`إضافة (${addedCount})`,         color:"#059669" },
              { key:"modified", label:`تعديل (${editedCount})`,        color:"#d97706" },
              { key:"removed",  label:`حذف (${removedCount})`,         color:"#dc2626" },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="text-[9px] font-bold px-2 py-1 rounded-full border transition-all"
                style={filter===f.key
                  ? { color:"white", backgroundColor:f.color, borderColor:f.color }
                  : { color:f.color, backgroundColor:"white", borderColor:f.color+"50" }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI mini cards */}
        <div className="relative grid grid-cols-4 gap-2 mt-3">
          {[
            { label:"مضاف",     value:addedCount,   color:"#059669", bg:"#ecfdf5", Icon:Plus    },
            { label:"معدّل",    value:editedCount,  color:"#d97706", bg:"#fffbeb", Icon:Edit2   },
            { label:"محذوف",    value:removedCount, color:"#dc2626", bg:"#fef2f2", Icon:Trash2  },
            { label:"بدون تغيير",value:unchanged,  color:"#94a3b8", bg:"#f8fafc", Icon:Check   },
          ].map((s,i) => (
            <div key={i} className="flex items-center gap-1.5 bg-white/70 rounded-xl px-2.5 py-2 border border-white/60">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor:s.bg }}>
                <s.Icon className="w-3 h-3" style={{ color:s.color }}/>
              </div>
              <div>
                <p className="font-black text-base leading-none" style={{ color:s.color }}>{s.value}</p>
                <p className="text-[8px] text-slate-500 leading-tight">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Timeline ── */}
      {!hasChanges ? (
        <div className="py-8 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50" data-testid="no-changes">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-300 mb-2" />
          <p className="text-sm font-bold text-slate-500">لا توجد تغييرات في هذه الجولة</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">أي تعديل على المناطق سيظهر هنا فوراً</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-6 text-center rounded-xl border border-dashed bg-slate-50/50">
          <p className="text-xs text-muted-foreground">لا توجد أحداث بهذا النوع</p>
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* خط الـ timeline */}
          <div className="absolute right-[19px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-amber-200 via-slate-200 to-transparent rounded-full"/>

          {filtered.map((ev, idx) => {
            const cfg = CHANGE_CONFIG[ev.action] || CHANGE_CONFIG.modified;
            const Icon = cfg.icon;
            const isLast = idx === filtered.length - 1;

            return (
              <div key={ev.id} className="relative flex gap-4 pb-3 group">
                {/* النقطة على الـ timeline */}
                <div className="relative z-10 flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border-2 border-white transition-all group-hover:scale-110"
                    style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
                    <Icon className="w-4 h-4" style={{ color: cfg.color }}/>
                  </div>
                  {/* وقت صغير تحت الأيقونة */}
                  <div className="text-[8px] text-slate-400 text-center mt-0.5 font-mono">
                    {formatSATime(ev.at)}
                  </div>
                </div>

                {/* محتوى الحدث */}
                <div className="flex-1 min-w-0 bg-white rounded-xl border shadow-sm p-3 transition-all group-hover:shadow-md"
                  style={{ borderColor: cfg.color + "25" }}
                  data-testid={`timeline-event-${ev.id}`}>

                  {/* Row 1: نوع الحدث + الـ zone */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* badge نوع التغيير */}
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full border"
                        style={{ color:cfg.color, backgroundColor:cfg.bg, borderColor:cfg.border }}>
                        {cfg.label}
                      </span>
                      {/* zone code */}
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-700">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: ev.zone_color }}/>
                        {ev.zone_code}
                      </span>
                    </div>
                    {/* وقت كامل */}
                    <span className="text-[9px] text-slate-400 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-2.5 h-2.5"/>
                      {formatSADateTime(ev.at)}
                    </span>
                  </div>

                  {/* Row 2: اسم المنطقة */}
                  <p className={`text-[11px] font-cairo font-semibold leading-tight mb-1 ${ev.is_removed ? "line-through text-slate-400" : "text-slate-800"}`}>
                    {ev.zone_name}
                  </p>

                  {/* Row 3: تفاصيل — note بأسطر منسقة */}
                  <div className="mt-1.5 space-y-0.5">
                    {ev.note ? (
                      ev.note.split('\n').map((line, li) => line.trim() && (
                        <p key={li} className={`text-[10px] leading-snug ${li === 0 ? "font-semibold text-slate-700" : "text-slate-500 mr-2"}`}>
                          {line.trim()}
                        </p>
                      ))
                    ) : null}
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Layers className="w-2.5 h-2.5"/>{ev.zone_type}</span>
                      {ev.by && ev.by !== "—" && <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><User2 className="w-2.5 h-2.5"/>{ev.by}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Supervisor Notes ── */}
      {activeSession?.supervisor_notes && (
        <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-100">
          <h4 className="font-cairo font-semibold text-xs text-blue-700 flex items-center gap-2 mb-1.5">
            <MessageSquare className="w-3.5 h-3.5"/>ملاحظات المشرف
          </h4>
          <p className="text-xs text-blue-600 whitespace-pre-wrap leading-relaxed">{activeSession.supervisor_notes}</p>
        </div>
      )}
    </div>
  );
}
