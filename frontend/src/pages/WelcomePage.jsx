import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, ROLE_LABELS } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { Card, CardContent } from "@/components/ui/card";
import {
  User, Building2, Clock, MapPin, Shield, ChevronLeft,
  CalendarDays, Briefcase, Phone, Loader2, BadgeCheck,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEPT_LABELS = {
  planning: "إدارة تخطيط خدمات الحشود",
  gates: "إدارة الأبواب",
  plazas: "إدارة الساحات",
  squares: "إدارة الساحات",
  mataf: "إدارة المطاف",
  crowd_services: "إدارة خدمات الحشود",
  haram_map: "إدارة المصليات",
};

const SHIFT_LABELS = {
  morning: "الوردية الصباحية",
  evening: "الوردية المسائية",
  night: "الوردية الليلية",
};

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { menuItems } = useSidebar();
  const [empData, setEmpData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.employee_id) { setLoading(false); return; }
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/employees/${user.employee_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEmpData(res.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchProfile();
  }, [user?.employee_id]);

  const roleName = user?.permission_group_name || ROLE_LABELS[user?.role]?.ar || "—";
  const deptName = DEPT_LABELS[user?.department] || user?.department || "—";
  const shiftName = empData?.shift
    ? (SHIFT_LABELS[empData.shift] || empData.shift)
    : "—";
  const locationName = empData?.location || "—";
  const employeeNumber = empData?.employee_number || "—";
  const phone = empData?.contact_phone || "—";
  const restDays = empData?.rest_days?.length > 0
    ? empData.rest_days.join("، ")
    : "—";

  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 12 ? "صباح الخير" : hours < 17 ? "مساء الخير" : "مساء الخير";

  const topMenuItems = menuItems
    .filter(item => !item.parent_id && item.href && item.href !== "/" && item.href !== "/welcome" && !item.admin_only)
    .slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-1">{greeting} 👋</p>
            <h1 className="font-cairo font-bold text-2xl text-foreground truncate">
              {user?.name || "مستخدم"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
                <Shield className="w-3 h-3" /> {roleName}
              </span>
              {user?.department && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
                  <Building2 className="w-3 h-3" /> {deptName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <InfoCard icon={Briefcase} label="الرقم الوظيفي" value={employeeNumber} color="text-violet-600 bg-violet-50" />
        <InfoCard icon={Clock} label="الوردية" value={shiftName} color="text-amber-600 bg-amber-50" />
        <InfoCard icon={MapPin} label="موقع التغطية" value={locationName} color="text-emerald-600 bg-emerald-50" />
        <InfoCard icon={CalendarDays} label="أيام الراحة" value={restDays} color="text-blue-600 bg-blue-50" />
        <InfoCard icon={Phone} label="رقم التواصل" value={phone} color="text-slate-600 bg-slate-50" />
        <InfoCard icon={BadgeCheck} label="حالة الحساب" value={user?.account_status === "active" ? "مفعّل" : "معلق"} color={user?.account_status === "active" ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50"} />
      </div>

      {topMenuItems.length > 0 && (
        <div>
          <h2 className="font-cairo font-bold text-base mb-3 flex items-center gap-2">
            <ChevronLeft className="w-4 h-4 text-primary" /> الصفحات المتاحة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topMenuItems.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.href)}
                className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-start w-full group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-cairo font-semibold text-sm truncate">{item.name_ar}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.name_en}</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, color }) {
  return (
    <Card className="border">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
          <p className="text-sm font-cairo font-semibold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
