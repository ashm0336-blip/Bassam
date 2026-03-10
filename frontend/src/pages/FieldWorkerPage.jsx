import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import {
  Send, AlertTriangle, Activity, ThermometerSun, Shield,
  Wrench, CheckCircle2, Loader2, MapPin, Clock, ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

const DENSITY_LEVELS = [
  { value: "خفيف", label: "خفيف", color: "#22c55e", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-300", icon: "🟢" },
  { value: "متوسط", label: "متوسط", color: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-300", icon: "🟡" },
  { value: "مزدحم", label: "مزدحم", color: "#ef4444", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-300", icon: "🔴" },
  { value: "حرج", label: "حرج", color: "#7f1d1d", bg: "bg-red-100 dark:bg-red-900/40", border: "border-red-500", icon: "⛔" },
];

const ALERT_TYPES = [
  { value: "density", label: "كثافة مرتفعة", icon: ThermometerSun, color: "#f59e0b" },
  { value: "security", label: "حالة أمنية", icon: Shield, color: "#ef4444" },
  { value: "medical", label: "حالة طبية", icon: Activity, color: "#dc2626" },
  { value: "maintenance", label: "صيانة", icon: Wrench, color: "#6366f1" },
];

export default function FieldWorkerPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("density");
  const [submitting, setSubmitting] = useState(false);
  const [recentSubmissions, setRecentSubmissions] = useState({ densities: [], alerts: [] });

  // Density form
  const [selectedDensity, setSelectedDensity] = useState(null);
  const [densityNotes, setDensityNotes] = useState("");
  const [zoneName, setZoneName] = useState("");

  // Alert form
  const [selectedAlertType, setSelectedAlertType] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertLocation, setAlertLocation] = useState("");

  useEffect(() => {
    fetchRecent();
  }, []);

  const fetchRecent = async () => {
    try {
      const res = await axios.get(`${API}/field/my-submissions`, getAuth());
      setRecentSubmissions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const submitDensity = async () => {
    if (!selectedDensity) { toast.error("اختر مستوى الكثافة"); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/field/density`, {
        zone_name: zoneName || user?.location || "الموقع الحالي",
        value: selectedDensity,
        notes: densityNotes,
      }, getAuth());
      toast.success("✅ تم إرسال الكثافة بنجاح");
      setSelectedDensity(null);
      setDensityNotes("");
      setZoneName("");
      fetchRecent();
    } catch (e) {
      toast.error("حدث خطأ أثناء الإرسال");
    } finally {
      setSubmitting(false);
    }
  };

  const submitAlert = async () => {
    if (!selectedAlertType) { toast.error("اختر نوع التنبيه"); return; }
    if (!alertMessage.trim()) { toast.error("اكتب وصف التنبيه"); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/field/alert`, {
        alert_type: selectedAlertType,
        message: alertMessage,
        location: alertLocation || user?.location || "",
        priority: selectedAlertType === "security" || selectedAlertType === "medical" ? "critical" : "medium",
      }, getAuth());
      toast.success("✅ تم إرسال التنبيه بنجاح");
      setSelectedAlertType(null);
      setAlertMessage("");
      setAlertLocation("");
      fetchRecent();
    } catch (e) {
      toast.error("حدث خطأ أثناء الإرسال");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24" data-testid="field-worker-page">
      {/* Header */}
      <div className="text-center py-2">
        <h1 className="font-cairo font-bold text-xl">الواجهة الميدانية</h1>
        <p className="text-xs text-muted-foreground">مرحباً {user?.name?.split(' ')[0]} — إدخال سريع</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-muted rounded-xl p-1 gap-1">
        <button
          className={`flex-1 py-3 rounded-lg font-cairo font-bold text-sm transition-all ${activeTab === 'density' ? 'bg-card shadow-md text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('density')}
          data-testid="tab-density"
        >
          <ThermometerSun className="w-5 h-5 mx-auto mb-1" />
          إدخال كثافة
        </button>
        <button
          className={`flex-1 py-3 rounded-lg font-cairo font-bold text-sm transition-all ${activeTab === 'alert' ? 'bg-card shadow-md text-destructive' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('alert')}
          data-testid="tab-alert"
        >
          <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
          إرسال تنبيه
        </button>
      </div>

      {/* ── Density Tab ── */}
      {activeTab === 'density' && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">الموقع (اختياري)</label>
              <input
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                placeholder="مثال: بوابة 15"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                data-testid="density-zone"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">مستوى الكثافة</label>
              <div className="grid grid-cols-2 gap-2">
                {DENSITY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${selectedDensity === level.value ? `${level.bg} ${level.border} scale-[1.02] shadow-md` : 'border-border hover:border-muted-foreground/30'}`}
                    onClick={() => setSelectedDensity(level.value)}
                    data-testid={`density-${level.value}`}
                  >
                    <span className="text-2xl block mb-1">{level.icon}</span>
                    <span className="font-cairo font-bold text-sm">{level.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              placeholder="ملاحظات إضافية (اختياري)"
              value={densityNotes}
              onChange={(e) => setDensityNotes(e.target.value)}
              className="h-16 text-sm"
              data-testid="density-notes"
            />

            <Button
              className="w-full h-12 text-base font-cairo font-bold gap-2"
              onClick={submitDensity}
              disabled={!selectedDensity || submitting}
              data-testid="submit-density"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              إرسال الكثافة
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Alert Tab ── */}
      {activeTab === 'alert' && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">نوع التنبيه</label>
              <div className="grid grid-cols-2 gap-2">
                {ALERT_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${selectedAlertType === type.value ? 'border-destructive bg-destructive/5 scale-[1.02] shadow-md' : 'border-border hover:border-muted-foreground/30'}`}
                      onClick={() => setSelectedAlertType(type.value)}
                      data-testid={`alert-type-${type.value}`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-1" style={{ color: type.color }} />
                      <span className="font-cairo font-bold text-xs">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">الموقع</label>
              <input
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                placeholder="مثال: بالقرب من باب الصفا"
                value={alertLocation}
                onChange={(e) => setAlertLocation(e.target.value)}
                data-testid="alert-location"
              />
            </div>

            <Textarea
              placeholder="وصف الحالة..."
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              className="h-20 text-sm"
              data-testid="alert-message"
            />

            <Button
              variant="destructive"
              className="w-full h-12 text-base font-cairo font-bold gap-2"
              onClick={submitAlert}
              disabled={!selectedAlertType || !alertMessage.trim() || submitting}
              data-testid="submit-alert"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
              إرسال التنبيه
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Recent submissions ── */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-cairo">آخر إرسالاتي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...recentSubmissions.densities.slice(0, 3), ...recentSubmissions.alerts.slice(0, 3)].length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">لا توجد إرسالات بعد</p>
          )}
          {recentSubmissions.densities.slice(0, 3).map((d, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <ThermometerSun className="w-4 h-4 text-amber-500" />
              <div className="flex-1">
                <p className="text-xs font-medium">كثافة: {d.value}</p>
                <p className="text-[10px] text-muted-foreground">{d.zone_name}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
          ))}
          {recentSubmissions.alerts.slice(0, 3).map((a, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <div className="flex-1">
                <p className="text-xs font-medium">{a.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{a.message}</p>
              </div>
              <Badge variant="outline" className="text-[9px]">{a.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
