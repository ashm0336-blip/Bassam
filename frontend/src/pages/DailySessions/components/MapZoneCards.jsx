import { ChevronRight, CircleDot, CircleOff, FileText, Edit2, Plus, Trash2, Check, X, RotateCcw, CheckCircle2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { CHANGE_LABELS } from "../constants";

export function MapZoneCards({
  activeSession, activeZones, removedZones, changedZones,
  selectedZoneId, setSelectedZoneId,
  mapSubTab, setMapSubTab,
  showRemovedZones, setShowRemovedZones,
  zoneCardsRef, ZONE_TYPES,
  setSelectedZone, setShowZoneDialog,
  handleToggleRemove,
}) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <>
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg" data-testid="map-sub-tabs">
        <button onClick={() => setMapSubTab("zones")} data-testid="sub-tab-zones"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-cairo font-semibold transition-all ${mapSubTab === "zones" ? "bg-white shadow-sm text-emerald-700" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}>
          <CircleDot className="w-3.5 h-3.5" />{isAr ? "المناطق النشطة" : "Active Zones"}<Badge variant="secondary" className="text-[10px]">{activeZones.length}</Badge>
        </button>
        <button onClick={() => setMapSubTab("changes")} data-testid="sub-tab-changes"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-cairo font-semibold transition-all ${mapSubTab === "changes" ? "bg-white shadow-sm text-amber-700" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}>
          <FileText className="w-3.5 h-3.5" />{isAr ? "التغييرات" : "Changes"}{changedZones.length > 0 && <Badge variant="destructive" className="text-[10px] px-1.5">{changedZones.length}</Badge>}
        </button>
      </div>

      {mapSubTab === "zones" && activeZones.length > 0 && (
        <div data-testid="zones-below-map">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            {activeZones.map(zone => {
              const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
              const cl = CHANGE_LABELS[zone.change_type] || CHANGE_LABELS.unchanged;
              const ch = zone.change_type && zone.change_type !== "unchanged";
              const isSelected = zone.id === selectedZoneId;
              return (
                <div key={zone.id} ref={el => { zoneCardsRef.current[zone.id] = el; }} data-testid={`zone-card-${zone.id}`}
                  className={`rounded-lg border p-2 transition-all ${activeSession?.status === "draft" ? "cursor-pointer" : ""} ${isSelected ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-200 shadow-md" : ch ? "hover:shadow-md" : "hover:shadow-sm hover:border-slate-300"}`}
                  style={ch && !isSelected ? { borderBottomColor: cl.color, borderBottomWidth: 2 } : {}}
                  onClick={() => setSelectedZoneId(isSelected ? null : zone.id)}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: zone.fill_color }}>{ti?.icon || "?"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs truncate">{zone.zone_code}</span>
                        {ch && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cl.color }} />}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{isAr ? zone.name_ar : zone.name_en}</p>
                    </div>
                    {activeSession?.status === "draft" && (
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100" style={{ opacity: isSelected ? 1 : undefined }}>
                        <button className="p-0.5 rounded hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); setSelectedZone(zone); setShowZoneDialog(true); }} data-testid={`edit-zone-btn-${zone.id}`}>
                          <Edit2 className="w-3 h-3 text-slate-400 hover:text-blue-600" />
                        </button>
                        <button className="p-0.5 rounded hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleToggleRemove(zone.id, false); }} data-testid={`remove-zone-btn-${zone.id}`}>
                          <CircleOff className="w-3 h-3 text-slate-400 hover:text-red-500" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {removedZones.length > 0 && (
            <div data-testid="removed-zones-section" className="mt-3">
              <button onClick={() => setShowRemovedZones(prev => !prev)} className="flex items-center gap-2 w-full text-right py-2 px-1 text-sm font-cairo font-semibold text-red-400 hover:text-red-600 transition-colors" data-testid="toggle-removed-zones">
                <ChevronRight className={`w-4 h-4 transition-transform ${showRemovedZones ? "rotate-90" : ""}`} />
                <CircleOff className="w-4 h-4" />{isAr ? "المناطق المزالة" : "Removed Zones"}<Badge variant="destructive" className="text-[10px] px-1.5">{removedZones.length}</Badge>
              </button>
              {showRemovedZones && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 mt-2">
                  {removedZones.map(zone => {
                    const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                    return (
                      <div key={zone.id} className="rounded-xl border border-red-200/50 bg-red-50/30 p-3 opacity-80" data-testid={`removed-zone-card-${zone.id}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100 text-red-500 text-xs font-bold"><X className="w-4 h-4" /></div>
                            <div><span className="font-semibold text-sm line-through text-red-400">{zone.zone_code}</span><p className="text-xs text-red-400">{isAr ? zone.name_ar : zone.name_en}</p></div>
                          </div>
                          {activeSession?.status === "draft" && (
                            <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-7 text-xs" onClick={() => handleToggleRemove(zone.id, true)} data-testid={`restore-zone-btn-${zone.id}`}>
                              <RotateCcw className="w-3 h-3 ml-1" />{isAr ? "استعادة" : "Restore"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mapSubTab === "changes" && (
        <ChangesView activeSession={activeSession} ZONE_TYPES={ZONE_TYPES} isAr={isAr} />
      )}
    </>
  );
}

function ChangesView({ activeSession, ZONE_TYPES, isAr }) {
  const allZones = activeSession?.zones || [];
  const groups = [
    { type: "added", label: isAr ? "مناطق مضافة" : "Added Zones", zones: allZones.filter(z => z.change_type === "added"), color: "#22c55e", bg: "#dcfce7", icon: Plus },
    { type: "removed", label: isAr ? "مناطق محذوفة" : "Removed Zones", zones: allZones.filter(z => z.is_removed || z.change_type === "removed"), color: "#ef4444", bg: "#fef2f2", icon: Trash2 },
    { type: "modified", label: isAr ? "مناطق معدّلة" : "Modified Zones", zones: allZones.filter(z => z.change_type && ["modified","category_changed","moved"].includes(z.change_type)), color: "#f59e0b", bg: "#fefce8", icon: Edit2 },
    { type: "unchanged", label: isAr ? "بدون تغيير" : "Unchanged", zones: allZones.filter(z => !z.is_removed && (!z.change_type || z.change_type === "unchanged")), color: "#94a3b8", bg: "#f8fafc", icon: Check },
  ].filter(g => g.zones.length > 0);

  return (
    <div data-testid="changes-below-map" className="space-y-4">
      {activeSession?.changes_summary && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: "added", icon: Plus, label: isAr ? "مضاف" : "Added", color: "#22c55e", bg: "from-emerald-50" },
            { key: "removed", icon: Trash2, label: isAr ? "محذوف" : "Removed", color: "#ef4444", bg: "from-red-50" },
            { key: "modified", icon: Edit2, label: isAr ? "معدّل" : "Modified", color: "#f59e0b", bg: "from-amber-50" },
            { key: "unchanged", icon: Check, label: isAr ? "بدون تغيير" : "Unchanged", color: "#94a3b8", bg: "from-slate-50" },
          ].map(item => {
            const count = activeSession.changes_summary[item.key] || 0;
            const Icon = item.icon;
            return (
              <div key={item.key} className={`rounded-xl border bg-gradient-to-bl ${item.bg} to-white p-2.5`}>
                <div className="flex items-center justify-between mb-1"><span className="text-[10px] text-muted-foreground font-medium">{item.label}</span><Icon className="w-3.5 h-3.5" style={{ color: item.color }} /></div>
                <p className="text-xl font-bold" style={{ color: item.color }}>{count}</p>
              </div>
            );
          })}
        </div>
      )}
      {groups.length === 0 ? (
        <div className="py-8 text-center"><CheckCircle2 className="w-10 h-10 mx-auto text-emerald-300 mb-2" /><p className="text-sm text-muted-foreground">{isAr ? "لا توجد تغييرات" : "No changes"}</p></div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const GroupIcon = group.icon;
            return (
              <div key={group.type} data-testid={`changes-group-${group.type}`}>
                <h3 className="font-cairo font-semibold text-xs flex items-center gap-2 mb-2"><GroupIcon className="w-3.5 h-3.5" style={{ color: group.color }} />{group.label}<Badge className="text-[9px] px-1.5" style={{ backgroundColor: group.bg, color: group.color }}>{group.zones.length}</Badge></h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                  {group.zones.map(zone => {
                    const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                    return (
                      <div key={zone.id} className="rounded-lg border p-2 transition-all hover:shadow-sm" style={{ borderBottomColor: group.color, borderBottomWidth: 2 }} data-testid={`change-item-${zone.id}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: zone.fill_color || group.color }}>{ti?.icon || "?"}</div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-bold truncate ${group.type === "removed" ? "line-through text-red-400" : ""}`}>{zone.zone_code}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{isAr ? zone.name_ar : zone.name_en}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {activeSession?.supervisor_notes && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <h4 className="font-cairo font-semibold text-xs text-blue-700 flex items-center gap-2 mb-1"><MessageSquare className="w-3.5 h-3.5" />{isAr ? "ملاحظات المشرف" : "Supervisor Notes"}</h4>
          <p className="text-xs text-blue-600 whitespace-pre-wrap">{activeSession.supervisor_notes}</p>
        </div>
      )}
    </div>
  );
}
