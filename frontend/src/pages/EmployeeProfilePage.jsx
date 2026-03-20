import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  User, Phone, Briefcase, MapPin, Clock, Calendar, Shield,
  ArrowRight, CheckCircle2, XCircle, Lock, Activity, FileText, Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

const DEPT_LABELS = { gates: 'إدارة الأبواب', plazas: 'إدارة الساحات', planning: 'إدارة التخطيط', crowd_services: 'خدمات الحشود', mataf: 'صحن المطاف', haram_map: 'إدارة المصليات' };
const DEPT_COLORS = { gates: '#1d4ed8', plazas: '#0d9488', planning: '#7c3aed', crowd_services: '#d97706', mataf: '#dc2626', haram_map: '#059669' };
const STATUS_CONFIG = { active: { label: 'نشط', color: '#22c55e', icon: CheckCircle2 }, frozen: { label: 'مجمّد', color: '#ef4444', icon: Lock }, terminated: { label: 'منتهي', color: '#6b7280', icon: XCircle }, pending: { label: 'معلّق', color: '#f59e0b', icon: Clock } };

const ACTION_LABELS = {
  login: 'تسجيل دخول', logout: 'تسجيل خروج',
  employee_created: 'إضافة موظف', employee_updated: 'تعديل بيانات', employee_deleted: 'حذف موظف',
  account_activated: 'تفعيل حساب', account_frozen: 'تجميد حساب', account_terminated: 'إنهاء خدمة',
  role_changed: 'تغيير الدور', permissions_reset: 'إعادة تعيين صلاحيات',
  'تغيير مجموعة صلاحيات': 'تغيير مجموعة صلاحيات', 'تخصيص صلاحيات فردية': 'تخصيص صلاحيات فردية',
  'نسخ صلاحيات': 'نسخ صلاحيات',
  pin_changed: 'تغيير PIN', pin_reset: 'إعادة تعيين PIN',
  schedule_created: 'إنشاء جدول', schedule_approved: 'اعتماد جدول',
  task_created: 'إنشاء مهمة', task_completed: 'إنجاز مهمة',
};

export default function EmployeeProfilePage({ self = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const { employee: emp, account, activities, schedules } = data;
  const dept = emp?.department || account?.department;
  const deptColor = DEPT_COLORS[dept] || '#666';
  const statusConf = STATUS_CONFIG[account?.account_status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConf.icon;
  const displayName = emp?.name || account?.name || 'مستخدم';
  const groupName = account?.permission_group_name_ar || account?.permission_group_name;

  return (
    <div className="max-w-4xl mx-auto space-y-4" data-testid="employee-profile">
      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate(-1)}>
        <ArrowRight className="w-3.5 h-3.5" /> رجوع
      </Button>

      {/* Header Card */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="h-2" style={{ background: deptColor }} />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-cairo font-bold shadow-lg" style={{ background: deptColor }}>
              {displayName.charAt(0)}
            </div>
            <div className="flex-1 text-center sm:text-right">
              <h1 className="font-cairo font-bold text-2xl">{displayName}</h1>
              {emp?.job_title && <p className="text-sm text-muted-foreground mt-1">{emp.job_title}</p>}
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                {dept && (
                  <Badge style={{ background: `${deptColor}15`, color: deptColor, border: `1px solid ${deptColor}30` }}>
                    {DEPT_LABELS[dept] || dept}
                  </Badge>
                )}
                {account && (
                  <Badge style={{ background: `${statusConf.color}15`, color: statusConf.color, border: `1px solid ${statusConf.color}30` }}>
                    <StatusIcon className="w-3 h-3 ml-1" />
                    {statusConf.label}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 ml-1" />
                  {groupName || (account?.role === 'system_admin' ? 'مسؤول النظام' : 'بدون مجموعة')}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-cairo">المعلومات الشخصية</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: FileText, label: 'رقم الموظف', value: emp?.employee_number || '—' },
              { icon: FileText, label: 'رقم الهوية', value: (emp?.national_id || account?.national_id) ? `${(emp?.national_id || account?.national_id || '').slice(0,3)}****${(emp?.national_id || account?.national_id || '').slice(-3)}` : '—' },
              { icon: Phone, label: 'الجوال', value: emp?.contact_phone || '—' },
              { icon: Briefcase, label: 'نوع التوظيف', value: emp?.employment_type === 'permanent' ? 'دائم' : emp?.employment_type === 'seasonal' ? 'موسمي' : emp?.employment_type === 'temporary' ? 'مؤقت' : '—' },
              { icon: Shield, label: 'مجموعة الصلاحيات', value: groupName || (account?.role === 'system_admin' ? 'مسؤول النظام' : 'بدون مجموعة') },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-dashed border-border last:border-0">
                  <span className="text-sm">{item.value}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs">{item.label}</span>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-cairo">معلومات العمل</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: MapPin, label: 'الموقع', value: emp?.location || '—' },
              { icon: Clock, label: 'الوردية', value: emp?.shift || '—' },
              { icon: Calendar, label: 'أيام الراحة', value: emp?.rest_days?.join('، ') || '—' },
              { icon: Calendar, label: 'انتهاء العقد', value: emp?.contract_end || 'غير محدد' },
              { icon: Activity, label: 'الحالة', value: emp?.is_active !== false ? 'نشط' : 'غير نشط' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-dashed border-border last:border-0">
                  <span className="text-sm">{item.value}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs">{item.label}</span>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Activity Log */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-cairo">سجل الأحداث</CardTitle></CardHeader>
        <CardContent>
          {(!activities || activities.length === 0) && <p className="text-xs text-muted-foreground text-center py-4">لا يوجد أحداث مسجلة</p>}
          <div className="space-y-2">
            {activities?.slice(0, 20).map((a, i) => {
              const actionLabel = ACTION_LABELS[a.action] || a.action;
              return (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Activity className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{actionLabel}</p>
                    {a.details && <p className="text-[10px] text-muted-foreground truncate">{a.details}</p>}
                    {a.user_name && a.user_name !== displayName && (
                      <p className="text-[9px] text-slate-400">بواسطة: {a.user_name}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {a.timestamp ? new Date(a.timestamp).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
