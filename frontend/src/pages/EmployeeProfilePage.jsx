import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import {
  User, Phone, Briefcase, MapPin, Clock, Calendar, Shield,
  ArrowRight, CheckCircle2, XCircle, Lock, Activity, FileText,
  Building2, ChevronLeft, BadgeCheck, IdCard, CalendarDays,
  Loader2, UserCog, LayoutGrid
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

const DEPT_LABELS = {
  gates: "إدارة الأبواب",
  plazas: "إدارة الساحات",
  planning: "إدارة التخطيط",
  crowd_services: "خدمات الحشود",
  mataf: "صحن المطاف",
  haram_map: "إدارة المصليات",
};

const DEPT_COLORS = {
  gates: "#1d4ed8",
  plazas: "#0d9488",
  planning: "#7c3aed",
  crowd_services: "#d97706",
  mataf: "#dc2626",
  haram_map: "#059669",
};

const STATUS_CONFIG = {
  active:     { label: "نشط",   color: "#22c55e", icon: CheckCircle2 },
  frozen:     { label: "مجمّد", color: "#ef4444", icon: Lock },
  terminated: { label: "منتهي", color: "#6b7280", icon: XCircle },
  pending:    { label: "معلّق", color: "#f59e0b", icon: Clock },
};

const SHIFT_LABELS = {
  morning: "الوردية الصباحية",
  evening: "الوردية المسائية",
  night:   "الوردية الليلية",
};

const EMPLOYMENT_LABELS = {
  permanent: "دائم",
  seasonal:  "موسمي",
  temporary: "مؤقت",
};

const ACTION_LABELS = {
  login: "تسجيل دخول", logout: "تسجيل خروج",
  employee_created: "إضافة موظف", employee_updated: "تعديل بيانات", employee_deleted: "حذف موظف",
  account_activated: "تفعيل حساب", account_frozen: "تجميد حساب", account_terminated: "إنهاء خدمة",
  role_changed: "تغيير الدور", permissions_reset: "إعادة تعيين صلاحيات",
  "تغيير مجموعة صلاحيات": "تغيير مجموعة صلاحيات",
  "تخصيص صلاحيات فردية": "تخصيص صلاحيات فردية",
  "نسخ صلاحيات": "نسخ صلاحيات",
  pin_changed: "تغيير PIN", pin_reset: "إعادة تعيين PIN",
  schedule_created: "إنشاء جدول", schedule_approved: "اعتماد جدول",
  task_created: "إنشاء مهمة", task_completed: "إنجاز مهمة",
};

const TABS = [
  { id: "personal",  label: "المعلومات الشخصية", icon: User },
  { id: "work",      label: "معلومات العمل",      icon: Briefcase },
  { id: "activity",  label: "سجل الأحداث",       icon: Activity },
  { id: "pages",     label: "الصفحات المتاحة",    icon: LayoutGrid, selfOnly: true },
];

export default function EmployeeProfilePage({ self = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { menuItems } = useSidebar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");

  useEffect(() => {
    if (self) fetchMyProfile();
    else if (id) fetchProfile();
  }, [id, self]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/employees/${id}/profile`, getAuth());
      setData(res.data);
    } catch {} finally { setLoading(false); }
  };

  const fetchMyProfile = async () => {
    try {
      const res = await axios.get(`${API}/auth/my-profile`, getAuth());
      setData(res.data);
    } catch {} finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">البيانات غير متوفرة</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>رجوع</Button>
    </div>
  );

  const { employee: emp, account, activities } = data;
  const dept = emp?.department || account?.department;
  const deptColor = DEPT_COLORS[dept] || "#6366f1";
  const statusConf = STATUS_CONFIG[account?.account_status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConf.icon;
  const displayName = emp?.name || account?.name || "مستخدم";
  const groupName = account?.permission_group_name_ar || account?.permission_group_name;

  const hours = new Date().getHours();
  const greeting = hours < 12 ? "صباح الخير" : "مساء الخير";

  const visibleTabs = TABS.filter(t => !t.selfOnly || self);

  const topMenuItems = self
    ? menuItems
        .filter(item => !item.parent_id && item.href && item.href !== "/" && item.href !== "/welcome" && item.href !== "/my-profile" && !item.admin_only)
        .slice(0, 8)
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-8" data-testid="employee-profile">
      {!self && (
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate(-1)}>
          <ArrowRight className="w-3.5 h-3.5" /> رجوع
        </Button>
      )}

      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="h-1.5" style={{ background: `linear-gradient(to left, ${deptColor}, ${deptColor}99)` }} />
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-cairo font-bold shadow-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${deptColor}, ${deptColor}cc)` }}
            >
              {displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              {self && (
                <p className="text-sm text-muted-foreground mb-0.5">{greeting} 👋</p>
              )}
              <h1 className="font-cairo font-bold text-xl sm:text-2xl truncate">{displayName}</h1>
              {emp?.job_title && <p className="text-sm text-muted-foreground mt-0.5">{emp.job_title}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {dept && (
                  <Badge className="text-[11px]" style={{ background: `${deptColor}15`, color: deptColor, border: `1px solid ${deptColor}30` }}>
                    <Building2 className="w-3 h-3 ml-1" />
                    {DEPT_LABELS[dept] || dept}
                  </Badge>
                )}
                {account && (
                  <Badge className="text-[11px]" style={{ background: `${statusConf.color}15`, color: statusConf.color, border: `1px solid ${statusConf.color}30` }}>
                    <StatusIcon className="w-3 h-3 ml-1" />
                    {statusConf.label}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[11px]">
                  <Shield className="w-3 h-3 ml-1" />
                  {groupName || (account?.role === "system_admin" ? "مسؤول النظام" : "بدون مجموعة")}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-cairo font-semibold whitespace-nowrap transition-all flex-1 justify-center min-w-0
                ${isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "personal" && (
        <PersonalTab emp={emp} account={account} groupName={groupName} />
      )}
      {activeTab === "work" && (
        <WorkTab emp={emp} />
      )}
      {activeTab === "activity" && (
        <ActivityTab activities={activities} displayName={displayName} />
      )}
      {activeTab === "pages" && self && (
        <PagesTab menuItems={topMenuItems} navigate={navigate} />
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-dashed border-border last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-cairo font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

function PersonalTab({ emp, account, groupName }) {
  const nationalId = emp?.national_id || account?.national_id;
  const maskedId = nationalId
    ? `${nationalId.slice(0, 3)}****${nationalId.slice(-3)}`
    : "—";

  const items = [
    { icon: IdCard,    label: "رقم الموظف",       value: emp?.employee_number || "—",  color: "text-violet-600 bg-violet-50" },
    { icon: FileText,  label: "رقم الهوية",        value: maskedId,                      color: "text-slate-600 bg-slate-50" },
    { icon: Phone,     label: "رقم التواصل",       value: emp?.contact_phone || "—",     color: "text-blue-600 bg-blue-50" },
    { icon: UserCog,   label: "نوع التوظيف",       value: EMPLOYMENT_LABELS[emp?.employment_type] || "—", color: "text-amber-600 bg-amber-50" },
    { icon: Shield,    label: "مجموعة الصلاحيات",  value: groupName || (account?.role === "system_admin" ? "مسؤول النظام" : "بدون مجموعة"), color: "text-emerald-600 bg-emerald-50" },
    { icon: BadgeCheck, label: "حالة الحساب",      value: account?.account_status === "active" ? "مفعّل" : account?.account_status === "frozen" ? "مجمّد" : account?.account_status === "terminated" ? "منتهي" : "معلّق", color: account?.account_status === "active" ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50" },
  ];

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          {items.map((item, i) => (
            <InfoRow key={i} {...item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkTab({ emp }) {
  const items = [
    { icon: MapPin,      label: "موقع التغطية",  value: emp?.location || "—",                        color: "text-emerald-600 bg-emerald-50" },
    { icon: Clock,       label: "الوردية",       value: SHIFT_LABELS[emp?.shift] || emp?.shift || "—", color: "text-amber-600 bg-amber-50" },
    { icon: CalendarDays, label: "أيام الراحة",   value: emp?.rest_days?.length > 0 ? emp.rest_days.join("، ") : "—", color: "text-blue-600 bg-blue-50" },
    { icon: Calendar,    label: "انتهاء العقد",   value: emp?.contract_end || "غير محدد",              color: "text-red-600 bg-red-50" },
    { icon: Activity,    label: "حالة النشاط",    value: emp?.is_active !== false ? "نشط" : "غير نشط", color: "text-green-600 bg-green-50" },
    { icon: Building2,   label: "الإدارة",        value: DEPT_LABELS[emp?.department] || emp?.department || "—", color: "text-violet-600 bg-violet-50" },
  ];

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          {items.map((item, i) => (
            <InfoRow key={i} {...item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityTab({ activities, displayName }) {
  if (!activities || activities.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-12 text-center">
          <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">لا يوجد أحداث مسجلة</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-1">
          {activities.slice(0, 30).map((a, i) => {
            const actionLabel = ACTION_LABELS[a.action] || a.action;
            return (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-cairo font-semibold">{actionLabel}</p>
                  {a.details && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{a.details}</p>
                  )}
                  {a.user_name && a.user_name !== displayName && (
                    <p className="text-[10px] text-slate-400 mt-0.5">بواسطة: {a.user_name}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">
                  {a.timestamp
                    ? new Date(a.timestamp).toLocaleDateString("ar-SA", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })
                    : ""}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PagesTab({ menuItems, navigate }) {
  if (!menuItems || menuItems.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-12 text-center">
          <LayoutGrid className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">لا توجد صفحات متاحة</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {menuItems.map(item => (
        <button
          key={item.id}
          onClick={() => navigate(item.href)}
          className="flex items-center gap-3 p-3.5 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/20 transition-all text-start w-full group shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
            <Building2 className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-cairo font-semibold text-sm truncate">{item.name_ar}</p>
            <p className="text-[11px] text-muted-foreground truncate">{item.name_en}</p>
          </div>
          <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
        </button>
      ))}
    </div>
  );
}
