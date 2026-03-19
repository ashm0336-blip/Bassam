import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  User, Phone, Briefcase, MapPin, Clock, Calendar, Shield,
  ArrowRight, CheckCircle2, XCircle, Lock, Activity, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

const DEPT_LABELS = { gates: 'إدارة الأبواب', plazas: 'إدارة الساحات', planning: 'إدارة التخطيط', crowd_services: 'خدمات الحشود', mataf: 'صحن المطاف', haram_map: 'إدارة المصليات' };
const DEPT_COLORS = { gates: '#1d4ed8', plazas: '#0d9488', planning: '#7c3aed', crowd_services: '#d97706', mataf: '#dc2626', haram_map: '#059669' };
const ROLE_LABELS = { system_admin: 'مسؤول النظام', general_manager: 'المدير العام', department_manager: 'مدير الإدارة', shift_supervisor: 'مشرف الوردية', field_staff: 'موظف ميداني', admin_staff: 'موظف إداري' };
const STATUS_CONFIG = { active: { label: 'نشط', color: '#22c55e', icon: CheckCircle2 }, frozen: { label: 'مجمّد', color: '#ef4444', icon: Lock }, terminated: { label: 'منتهي', color: '#6b7280', icon: XCircle }, pending: { label: 'معلّق', color: '#f59e0b', icon: Clock } };

export default function EmployeeProfilePage({ self = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (self) {
      fetchMyProfile();
    } else if (id) {
      fetchProfile();
    }
  }, [id, self]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/employees/${id}/profile`, getAuth());
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const res = await axios.get(`${API}/auth/my-profile`, getAuth());
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-center">
        <User className="w-10 h-10 text-primary mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">جاري التحميل...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">الموظف غير موجود</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>رجوع</Button>
    </div>
  );

  const { employee: emp, account, activities, schedules } = data;
  const deptColor = DEPT_COLORS[emp.department] || '#666';
  const statusConf = STATUS_CONFIG[account?.account_status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConf.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-4" data-testid="employee-profile">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate(-1)}>
        <ArrowRight className="w-3.5 h-3.5" /> رجوع
      </Button>

      {/* Header Card */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="h-2" style={{ background: deptColor }} />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-cairo font-bold shadow-lg" style={{ background: deptColor }}>
              {emp.name?.charAt(0) || 'م'}
            </div>
            <div className="flex-1 text-center sm:text-right">
              <h1 className="font-cairo font-bold text-2xl">{emp.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">{emp.job_title}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <Badge style={{ background: `${deptColor}15`, color: deptColor, border: `1px solid ${deptColor}30` }}>
                  {DEPT_LABELS[emp.department] || emp.department}
                </Badge>
                {account && (
                  <Badge style={{ background: `${statusConf.color}15`, color: statusConf.color, border: `1px solid ${statusConf.color}30` }}>
                    <StatusIcon className="w-3 h-3 ml-1" />
                    {statusConf.label}
                  </Badge>
                )}
                {account?.role && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="w-3 h-3 ml-1" />
                    {account.permission_group_name_ar || ROLE_LABELS[account.role] || account.role}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Info */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-cairo">المعلومات الشخصية</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: FileText, label: 'رقم الموظف', value: emp.employee_number || '—' },
              { icon: FileText, label: 'رقم الهوية', value: emp.national_id ? `${emp.national_id.slice(0,3)}****${emp.national_id.slice(-3)}` : '—' },
              { icon: Phone, label: 'الجوال', value: emp.contact_phone || '—' },
              { icon: Briefcase, label: 'نوع العمل', value: emp.work_type === 'field' ? 'ميداني' : 'إداري' },
              { icon: FileText, label: 'نوع التوظيف', value: emp.employment_type === 'permanent' ? 'دائم' : emp.employment_type === 'seasonal' ? 'موسمي' : 'مؤقت' },
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

        {/* Work Info */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-cairo">معلومات العمل</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: MapPin, label: 'الموقع', value: emp.location || '—' },
              { icon: Clock, label: 'الوردية', value: emp.shift || '—' },
              { icon: Calendar, label: 'أيام الراحة', value: emp.rest_days?.join('، ') || emp.weekly_rest || '—' },
              { icon: Calendar, label: 'انتهاء العقد', value: emp.contract_end || 'غير محدد' },
              { icon: Activity, label: 'الحالة', value: emp.is_active ? 'نشط' : 'غير نشط' },
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
        <CardHeader className="pb-2"><CardTitle className="text-sm font-cairo">سجل النشاط</CardTitle></CardHeader>
        <CardContent>
          {activities?.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا يوجد نشاط مسجل</p>}
          <div className="space-y-2">
            {activities?.slice(0, 8).map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <Activity className="w-3 h-3 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">{a.action}</p>
                  {a.details && <p className="text-[10px] text-muted-foreground">{a.details}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {a.timestamp ? new Date(a.timestamp).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
