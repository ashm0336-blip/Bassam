import { useState, useMemo } from "react";
import {
  Plus, Trash2, Edit2, Check, CheckCircle2, MessageSquare, FileText,
  Clock, Filter, Download, Activity, Layers, User2, ChevronDown,
  ArrowRight, Tag, Hash, Palette, Users, Maximize2, EyeOff,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// ── Arabic Maps ────────────────────────────────────────────────
const ZONE_TYPE_AR_MAP = {
  "men_prayer":"مصلى رجال","women_prayer":"مصلى نساء","mixed_prayer":"مصلى مختلط",
  "children_prayer":"مصلى أطفال","elderly_prayer":"مصلى كبار السن",
  "disabled_prayer":"مصلى ذوي الاحتياجات","quran_recitation":"حلقة قرآن",
  "lecture_hall":"قاعة محاضرات","emergency_exit":"مخرج طوارئ","storage":"مخزن",
  "service_area":"منطقة خدمات","corridor":"ممر","wudu_area":"منطقة وضوء",
  "men_only":"رجال فقط","women_only":"نساء فقط","service":"خدمات","prayer":"مصلى",
};
function _ztAR(key) { return ZONE_TYPE_AR_MAP[key] || key || "غير محدد"; }

const PRAYER_AR_MAP = {
  "fajr":"الفجر","sunrise":"الشروق","duha":"الضحى","dhuhr":"الظهر",
  "asr":"العصر","maghrib":"المغرب","isha":"العشاء","tarawih":"التراويح",
};
function _pt(key) { return PRAYER_AR_MAP[key] || key || "الصلاة"; }

const SESSION_ACTION_CFG = {
  prayer_started:    { label:"بدء جولة صلاة",    color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe", Icon:Plus      },
  prayer_completed:  { label:"إنهاء جولة صلاة",  color:"#059669", bg:"#ecfdf5", border:"#a7f3d0", Icon:CheckCircle2 },
  prayer_skipped:    { label:"تجاوز صلاة",        color:"#94a3b8", bg:"#f8fafc", border:"#e2e8f0", Icon:ArrowRight },
  session_completed: { label:"إنهاء الجولة اليومية", color:"#059669", bg:"#ecfdf5", border:"#a7f3d0", Icon:CheckCircle2 },
  session_reopened:  { label:"إعادة فتح",         color:"#d97706", bg:"#fffbeb", border:"#fcd34d", Icon:Edit2     },
  session_created:   { label:"بدء جولة جديدة",   color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe", Icon:Plus      },
  notes_added:       { label:"ملاحظات المشرف",    color:"#7c3aed", bg:"#f5f3ff", border:"#c4b5fd", Icon:MessageSquare },
};
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
  added:            { label:"إضافة",       color:"#059669", bg:"#ecfdf5", border:"#a7f3d0", icon:Plus,         dot:"bg-emerald-500" },
  modified:         { label:"تعديل",       color:"#d97706", bg:"#fffbeb", border:"#fcd34d", icon:Edit2,        dot:"bg-amber-500"   },
  category_changed: { label:"تغيير فئة",   color:"#7c3aed", bg:"#f5f3ff", border:"#c4b5fd", icon:Tag,          dot:"bg-violet-500"  },
  moved:            { label:"تحريك",       color:"#0284c7", bg:"#e0f2fe", border:"#7dd3fc", icon:Maximize2,    dot:"bg-sky-500"     },
  deactivated:      { label:"غير نشط",     color:"#64748b", bg:"#f1f5f9", border:"#cbd5e1", icon:EyeOff,       dot:"bg-slate-400"   },
  reactivated:      { label:"تنشيط",       color:"#059669", bg:"#ecfdf5", border:"#a7f3d0", icon:CheckCircle2, dot:"bg-emerald-400" },
  removed:          { label:"حذف",         color:"#dc2626", bg:"#fef2f2", border:"#fecaca", icon:Trash2,       dot:"bg-red-500"     },
  zone_deleted:     { label:"حذف نهائي",   color:"#dc2626", bg:"#fef2f2", border:"#fecaca", icon:Trash2,       dot:"bg-red-500"     },
  assigned:         { label:"تعيين موظف",  color:"#059669", bg:"#ecfdf5", border:"#a7f3d0", icon:User2,        dot:"bg-emerald-400" },
  unassigned:       { label:"فك تعيين",    color:"#6b7280", bg:"#f9fafb", border:"#e5e7eb", icon:User2,        dot:"bg-slate-400"   },
  unchanged:        { label:"بدون تغيير",  color:"#94a3b8", bg:"#f8fafc", border:"#e2e8f0", icon:Check,        dot:"bg-slate-300"   },
};

function buildTimeline(activeSession, ZONE_TYPES, isAr) {
  const allZones = activeSession?.zones || [];
  const events = [];

  // ① أحداث الـ zones (إضافة/تعديل/حذف)
  allZones.forEach(zone => {
    const hist = zone.history || [];
    hist.forEach(h => {
      const cfg = CHANGE_CONFIG[h.action] || CHANGE_CONFIG.modified;
      const ti = ZONE_TYPES?.find(t => t.value === zone.zone_type);
      events.push({
        id: `${zone.id}-${h.at}`,
        type: "zone",
        zone_id: zone.id,
        zone_code: zone.zone_code || "—",
        zone_name: isAr ? zone.name_ar : (zone.name_en || zone.name_ar),
        zone_color: zone.fill_color || "#6b7280",
        zone_type: ti?.label_ar || _ztAR(zone.zone_type),
        action: h.action || "modified",
        by: h.by || "النظام",
        at: h.at,
        note: h.note || "",
        is_removed: zone.is_removed,
      });
    });

    if (hist.length === 0 && zone.change_type && zone.change_type !== "unchanged") {
      const ti = ZONE_TYPES?.find(t => t.value === zone.zone_type);
      events.push({
        id: zone.id, type:"zone",
        zone_id: zone.id, zone_code: zone.zone_code || "—",
        zone_name: isAr ? zone.name_ar : (zone.name_en || zone.name_ar),
        zone_color: zone.fill_color || "#6b7280",
        zone_type: ti?.label_ar || _ztAR(zone.zone_type),
        action: zone.change_type || (zone.is_removed ? "removed" : "modified"),
        by: zone.updated_by || "—", at: zone.updated_at || zone.created_at,
        note: "", is_removed: zone.is_removed,
      });
    }
  });

  // ② أحداث الجلسة (صلاة/إنهاء/ملاحظات)
  const sessionHist = activeSession?.session_history || [];
  sessionHist.forEach(h => {
    events.push({
      id: `session-${h.at}`, type: "session",
      action: h.action || "session_created",
      by: h.by || "النظام",
      at: h.at,
      note: h.note || "",
      icon: h.icon || "📌",
    });
  });

  return events.sort((a,b) => (b.at||"").localeCompare(a.at||""));
}

export function ChangesLog({ activeSession, changedZones, ZONE_TYPES }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [filter, setFilter] = useState("all");

  // ── نافذة وقت الجولة النشطة ──────────────────────────────────
  const isPrayerSession = activeSession?.session_type === "prayer";
  const sessionStartAt = useMemo(() => {
    if (!isPrayerSession || !activeSession?.session_history) return null;
    const startEvent = [...(activeSession.session_history)].reverse()
      .find(h => h.action === "prayer_started" || h.action === "session_created");
    return startEvent?.at || activeSession.created_at || null;
  }, [activeSession, isPrayerSession]);
  const sessionEndAt = useMemo(() => {
    if (!isPrayerSession || !activeSession?.session_history) return null;
    const endEvent = (activeSession.session_history)
      .filter(h => ["prayer_completed","prayer_skipped","session_completed"].includes(h.action))
      .at(-1);
    return endEvent?.at || null;
  }, [activeSession, isPrayerSession]);

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
    let result = timeline;
    // فلتر حسب نافذة وقت الجلسة الصلاة
    if (isPrayerSession && sessionStartAt) {
      result = result.filter(e => {
        if (!e.at) return false;
        const afterStart = e.at >= sessionStartAt;
        const beforeEnd  = !sessionEndAt || e.at <= sessionEndAt;
        return afterStart && beforeEnd;
      });
    }
    // فلتر حسب النوع
    if (filter === "added")    result = result.filter(e => e.action === "added");
    if (filter === "modified") result = result.filter(e => ["modified","category_changed","moved"].includes(e.action));
    if (filter === "removed")  result = result.filter(e => e.action === "removed" || e.is_removed);
    return result;
  }, [timeline, filter, isPrayerSession, sessionStartAt, sessionEndAt]);

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
                {isPrayerSession && sessionStartAt
                  ? `جولة ${activeSession?.prayer ? (_pt(activeSession.prayer)) : "الصلاة"} · ${formatSATime(sessionStartAt)}${sessionEndAt ? ` ← ${formatSATime(sessionEndAt)}` : " ← جارية"}`
                  : timeline.length > 0
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

      {/* ── Cards Grid ── */}
      {!hasChanges ? (
        <div className="py-6 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50" data-testid="no-changes">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-300 mb-1.5" />
          <p className="text-sm font-bold text-slate-500">لا توجد تغييرات</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">أي تعديل سيظهر هنا فوراً</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-4 text-center rounded-xl border border-dashed bg-slate-50/50">
          <p className="text-xs text-muted-foreground">لا أحداث بهذا النوع</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-1.5">
          {filtered.map((ev) => {
            // ── كرت حدث جلسة ──
            if (ev.type === "session") {
              const scfg = SESSION_ACTION_CFG[ev.action] || SESSION_ACTION_CFG.session_created;
              return (
                <div key={ev.id}
                  className="flex flex-col gap-1.5 p-2 rounded-lg border shadow-sm hover:shadow-md transition-all"
                  style={{ backgroundColor:scfg.bg, borderColor:scfg.border }}
                  data-testid={`log-card-${ev.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-base leading-none">{ev.icon}</span>
                      <span className="text-[8px] font-black" style={{ color:scfg.color }}>{scfg.label}</span>
                    </div>
                    <span className="text-[7px] text-slate-400 font-mono">{formatSATime(ev.at)}</span>
                  </div>
                  <p className="text-[9px] font-semibold leading-snug" style={{ color:scfg.color }}>
                    {ev.note.split('\n')[0]?.replace(/^[🕌✅⏭️🏁🔄📋📝🗑️]/,'').trim() || scfg.label}
                  </p>
                  {ev.by && <p className="text-[7px] text-slate-400 flex items-center gap-0.5"><User2 className="w-2 h-2"/>{ev.by}</p>}
                </div>
              );
            }

            // ── كرت حدث zone ──
            const cfg = CHANGE_CONFIG[ev.action] || CHANGE_CONFIG.modified;
            const CfgIcon = cfg.icon;
            return (
              <div key={ev.id}
                className="flex flex-col gap-1.5 p-2 rounded-lg border bg-white shadow-sm hover:shadow-md transition-all"
                style={{ borderColor:cfg.color+"30", borderRightWidth:"2px", borderRightColor:cfg.color }}
                data-testid={`log-card-${ev.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor:cfg.bg }}>
                      <CfgIcon className="w-3 h-3" style={{ color:cfg.color }}/>
                    </div>
                    <span className="text-[8px] font-black" style={{ color:cfg.color }}>{cfg.label}</span>
                  </div>
                  <span className="text-[7px] text-slate-400 font-mono">{formatSATime(ev.at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor:ev.zone_color||"#94a3b8" }}/>
                  <p className={`text-[9px] font-semibold leading-tight truncate ${ev.is_removed?"line-through text-slate-400":"text-slate-800"}`}>
                    {ev.zone_name}
                  </p>
                </div>
                {ev.note && (
                  <p className="text-[8px] text-slate-500 leading-tight">
                    {ev.note.split('\n').find(l=>l.includes('→') || l.includes('←') || l.includes('▲') || l.includes('▼'))?.trim() || ev.note.split('\n')[0]?.trim()}
                  </p>
                )}
                {ev.by && ev.by !== "—" && <p className="text-[7px] text-slate-400 flex items-center gap-0.5"><User2 className="w-2 h-2"/>{ev.by}</p>}
              </div>
            );
          })}
        </div>
      )}
      {/* ── ملاحظات المشرف ── */}
      {activeSession?.supervisor_notes && (
        <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100">
          <h4 className="font-cairo font-semibold text-xs text-blue-700 flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-3.5 h-3.5"/>ملاحظات المشرف
          </h4>
          <p className="text-xs text-blue-600 whitespace-pre-wrap leading-relaxed">{activeSession.supervisor_notes}</p>
        </div>
      )}
    </div>
  );
}
