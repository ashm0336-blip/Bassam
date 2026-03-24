import momentHijri from "moment-hijri";
import { toast } from "sonner";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function DailyEntryCard({ mosqueType, fields, formData, setFormData, onSave, saving, canEdit, items, selectedDateHijri }) {
  const isHaram = mosqueType === "haram";
  const accentBorder = isHaram ? "border-blue-500/15" : "border-emerald-500/15";
  const accentBg = isHaram ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700";

  const rawdahMen = fields.filter((f) => f.group === "rawdah_men");
  const rawdahWomen = fields.filter((f) => f.group === "rawdah_women");
  const standaloneFields = fields.filter((f) => !f.group);

  const renderInput = (field, shortLabel) => (
    <div key={field.key} className="relative">
      <Label className="text-[10px] text-muted-foreground mb-0.5 block font-cairo text-center truncate">{shortLabel || field.label}</Label>
      <Input
        type="number" inputMode="numeric"
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
          <div className="grid grid-cols-4 gap-3">
            {fields.map((f) => renderInput(f))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {standaloneFields.map((f) => renderInput(f))}
            </div>
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
