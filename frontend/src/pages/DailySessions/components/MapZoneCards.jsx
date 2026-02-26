import { useState, useMemo } from "react";
import { Plus, Trash2, Edit2, Check, CheckCircle2, MessageSquare, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";

export function ChangesLog({ activeSession, changedZones, ZONE_TYPES }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [activeTab, setActiveTab] = useState("added");

  const allZones = activeSession?.zones || [];
  const totalZones = allZones.length;

  const tabs = useMemo(() => [
    { key: "added", label: isAr ? "مضافة" : "Added", zones: allZones.filter(z => z.change_type === "added"), color: "#22c55e", bgLight: "#dcfce7", borderColor: "#bbf7d0", icon: Plus },
    { key: "modified", label: isAr ? "معدّلة" : "Modified", zones: allZones.filter(z => z.change_type && ["modified","category_changed","moved"].includes(z.change_type)), color: "#f59e0b", bgLight: "#fefce8", borderColor: "#fde68a", icon: Edit2 },
    { key: "removed", label: isAr ? "محذوفة" : "Removed", zones: allZones.filter(z => z.is_removed || z.change_type === "removed"), color: "#ef4444", bgLight: "#fef2f2", borderColor: "#fecaca", icon: Trash2 },
  ], [allZones, isAr]);

  const unchangedCount = allZones.filter(z => !z.is_removed && (!z.change_type || z.change_type === "unchanged")).length;
  const summary = activeSession?.changes_summary || {};
  const hasChanges = changedZones.length > 0 || allZones.some(z => z.is_removed);
  const activeTabData = tabs.find(t => t.key === activeTab);

  if (!hasChanges) {
    return (
      <div className="py-6 text-center rounded-xl border border-dashed bg-slate-50/50" data-testid="no-changes">
        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-300 mb-2" />
        <p className="text-sm font-medium text-muted-foreground">{isAr ? "لا توجد تغييرات في هذه الجولة" : "No changes in this tour"}</p>
      </div>
    );
  }

  return (
    <div data-testid="changes-log" className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <FileText className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h3 className="font-cairo font-bold text-sm">{isAr ? "سجل التغييرات" : "Changes Log"}</h3>
          <p className="text-[10px] text-muted-foreground">{isAr ? `${changedZones.length} تغيير من أصل ${totalZones} منطقة` : `${changedZones.length} changes out of ${totalZones} zones`}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          { key: "added", icon: Plus, label: isAr ? "مضاف" : "Added", color: "#22c55e", gradient: "from-emerald-50 to-emerald-25" },
          { key: "removed", icon: Trash2, label: isAr ? "محذوف" : "Removed", color: "#ef4444", gradient: "from-red-50 to-red-25" },
          { key: "modified", icon: Edit2, label: isAr ? "معدّل" : "Modified", color: "#f59e0b", gradient: "from-amber-50 to-amber-25" },
          { key: "unchanged", icon: Check, label: isAr ? "بدون تغيير" : "Unchanged", color: "#94a3b8", gradient: "from-slate-50 to-slate-25" },
        ].map(item => {
          const count = summary[item.key] || (item.key === "unchanged" ? unchangedCount : 0);
          const Icon = item.icon;
          const isUnchanged = item.key === "unchanged";
          return (
            <div key={item.key} className={`relative overflow-hidden rounded-xl border bg-gradient-to-bl ${item.gradient} to-white p-3`} data-testid={`kpi-${item.key}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: item.color + "15" }}>
                  <Icon className="w-3 h-3" style={{ color: item.color }} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold font-mono" style={{ color: item.color }}>{count}</p>
                {isUnchanged && <span className="text-[10px] text-muted-foreground font-medium">/ {totalZones}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="rounded-xl border bg-white overflow-hidden" data-testid="changes-tabs-container">
        <div className="flex border-b" data-testid="changes-tab-bar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const isEmpty = tab.zones.length === 0;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                data-testid={`changes-tab-${tab.key}`}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-4 text-xs font-cairo font-semibold transition-all relative ${
                  isActive
                    ? "text-slate-900 bg-white"
                    : isEmpty
                      ? "text-slate-300 bg-slate-50/50 cursor-default"
                      : "text-slate-500 bg-slate-50/80 hover:bg-white/80 hover:text-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: isActive ? tab.color : undefined }} />
                <span>{tab.label}</span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={isActive
                    ? { backgroundColor: tab.bgLight, color: tab.color }
                    : { backgroundColor: "#f1f5f9", color: "#94a3b8" }
                  }
                >
                  {tab.zones.length}
                </span>
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full" style={{ backgroundColor: tab.color }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-3" data-testid={`changes-content-${activeTab}`}>
          {activeTabData && activeTabData.zones.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
              {activeTabData.zones.map(zone => {
                const ti = ZONE_TYPES.find(t => t.value === zone.zone_type);
                const isRemoved = activeTab === "removed";
                return (
                  <div
                    key={zone.id}
                    className="group rounded-lg border p-2.5 transition-all hover:shadow-md hover:-translate-y-0.5"
                    style={{ borderColor: activeTabData.borderColor }}
                    data-testid={`change-item-${zone.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm transition-transform group-hover:scale-110 ${isRemoved ? "opacity-50" : ""}`}
                        style={{ backgroundColor: zone.fill_color || activeTabData.color }}
                      >
                        {ti?.icon || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${isRemoved ? "line-through text-red-400" : ""}`}>
                          {zone.zone_code}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate leading-tight">
                          {isAr ? zone.name_ar : zone.name_en}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: activeTabData?.bgLight }}>
                {activeTabData && <activeTabData.icon className="w-5 h-5" style={{ color: activeTabData.color, opacity: 0.4 }} />}
              </div>
              <p className="text-xs text-muted-foreground">
                {isAr ? `لا توجد مناطق ${activeTabData?.label}` : `No ${activeTabData?.label?.toLowerCase()} zones`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Supervisor Notes */}
      {activeSession?.supervisor_notes && (
        <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-100">
          <h4 className="font-cairo font-semibold text-xs text-blue-700 flex items-center gap-2 mb-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            {isAr ? "ملاحظات المشرف" : "Supervisor Notes"}
          </h4>
          <p className="text-xs text-blue-600 whitespace-pre-wrap leading-relaxed">{activeSession.supervisor_notes}</p>
        </div>
      )}
    </div>
  );
}
