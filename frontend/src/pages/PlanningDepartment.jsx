import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import EmployeeManagement from "@/components/EmployeeManagement";
import { 
  ClipboardList, 
  Users, 
  CheckCircle2, 
  Clock,
  Activity,
  Target,
  UserCheck,
  UserX,
  MapPin
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <Card className="card-hover">
    <CardContent className="p-3">
      <div className="flex items-center gap-2 justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-cairo font-bold">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function PlanningDepartment() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  
  const [stats, setStats] = useState(null);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [statsRes, empStatsRes] = await Promise.all([
          axios.get(`${API}/planning/stats`),
          axios.get(`${API}/employees/stats/planning`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setStats(statsRes.data);
        setEmployeeStats(empStatsRes.data);
      } catch (error) {
        console.error("Error fetching planning stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-5 h-24 bg-muted/50" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="planning-page">
      {activeTab === 'dashboard' && (
        <>
          <div>
            <h2 className="font-cairo font-bold text-xl text-right">لوحة تحكم إدارة التخطيط</h2>
            <p className="text-sm text-muted-foreground mt-1 text-right">نظرة شاملة على الخطط والموارد</p>
          </div>

          {/* Employee Stats */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="font-cairo text-base text-right flex items-center gap-2 justify-end">
                <Users className="w-5 h-5 text-primary" />
                إحصائيات الموظفين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                <div className="text-center p-2 rounded-lg bg-card border border-border"><Users className="w-4 h-4 mx-auto text-primary mb-1" /><p className="text-lg font-bold">{employeeStats?.total_employees || 0}</p><p className="text-[10px] text-muted-foreground">إجمالي</p></div>
                <div className="text-center p-2 rounded-lg bg-card border border-border"><UserCheck className="w-4 h-4 mx-auto text-green-500 mb-1" /><p className="text-lg font-bold text-green-600">{employeeStats?.active_employees || 0}</p><p className="text-[10px] text-muted-foreground">نشطون</p></div>
                <div className="text-center p-2 rounded-lg bg-card border border-border"><UserX className="w-4 h-4 mx-auto text-gray-500 mb-1" /><p className="text-lg font-bold text-gray-600">{employeeStats?.inactive_employees || 0}</p><p className="text-[10px] text-muted-foreground">غير نشطين</p></div>
                <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200"><div className="w-2 h-2 rounded-full bg-blue-500 mx-auto mb-1" /><p className="text-lg font-bold text-blue-600">{employeeStats?.shifts?.shift_1 || 0}</p><p className="text-[10px] text-muted-foreground">الأولى</p></div>
                <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200"><div className="w-2 h-2 rounded-full bg-green-500 mx-auto mb-1" /><p className="text-lg font-bold text-green-600">{employeeStats?.shifts?.shift_2 || 0}</p><p className="text-[10px] text-muted-foreground">الثانية</p></div>
                <div className="text-center p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200"><div className="w-2 h-2 rounded-full bg-orange-500 mx-auto mb-1" /><p className="text-lg font-bold text-orange-600">{employeeStats?.shifts?.shift_3 || 0}</p><p className="text-[10px] text-muted-foreground">الثالثة</p></div>
                <div className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200"><div className="w-2 h-2 rounded-full bg-purple-500 mx-auto mb-1" /><p className="text-lg font-bold text-purple-600">{employeeStats?.shifts?.shift_4 || 0}</p><p className="text-[10px] text-muted-foreground">الرابعة</p></div>
                <div className="text-center p-2 rounded-lg bg-card border border-border"><MapPin className="w-4 h-4 mx-auto text-blue-500 mb-1" /><p className="text-lg font-bold text-blue-600">{employeeStats?.locations_count || 0}</p><p className="text-[10px] text-muted-foreground">المواقع</p></div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="الخطط النشطة" value={stats?.active_plans || 0} icon={ClipboardList} color="bg-primary/10 text-primary" />
            <StatCard title="بانتظار الموافقة" value={stats?.pending_approvals || 0} icon={Clock} color="bg-secondary/20 text-secondary" />
            <StatCard title="المكتملة اليوم" value={stats?.completed_today || 0} icon={CheckCircle2} color="bg-green-100 text-green-700" />
            <StatCard title="الموظفون المنتشرون" value={stats?.staff_deployed || 0} icon={Users} color="bg-blue-100 text-blue-700" />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-cairo text-base text-right">استخدام الموارد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>الموظفون الميدانيون</span>
                  <span className="font-semibold">{stats?.resource_utilization || 0}%</span>
                </div>
                <Progress value={stats?.resource_utilization || 0} className="h-2 [&>div]:bg-primary" />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* activeTab === 'data' تم حذفه - لا داعي له */}

      {activeTab === 'employees' && (
        <EmployeeManagement department="planning" />
      )}
    </div>
  );
}
