import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import EmployeeManagement from "@/components/EmployeeManagement";
import TransactionsPage from "@/pages/TransactionsPage";
import ShiftsCalendar from "@/pages/ShiftsCalendar";
import {
  Users,
  UserCheck,
  UserX,
  MapPin,
  ClipboardList,
  Clock,
  CheckCircle2,
  CheckCircle,
  Briefcase,
  Activity,
  Target
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
  const { menuItems } = useSidebar();
  const { language } = useLanguage();
  
  // Get page title from sidebar menu
  const pageInfo = menuItems.find(item => item.href === '/planning' && !item.parent_id);
  const pageTitle = pageInfo ? (language === 'ar' ? pageInfo.name_ar : pageInfo.name_en) : (language === 'ar' ? 'تخطيط خدمات الحشود' : 'Planning');
  
  const [stats, setStats] = useState(null);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [employeesRes, empStatsRes, planningStatsRes] = await Promise.all([
          axios.get(`${API}/employees?department=planning`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/employees/stats/planning`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/planning/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        // حساب النشطين بناءً على أيام الراحة
        const today = new Date().toLocaleDateString('ar-SA', { weekday: 'long' }).replace('يوم ', '');
        const allEmployees = employeesRes.data;
        
        const activeNow = allEmployees.filter(emp => {
          if (!emp.weekly_rest) return true; // لو ما عنده راحة يعتبر نشط
          return !emp.weekly_rest.includes(today);
        });
        
        const onRest = allEmployees.filter(emp => {
          if (!emp.weekly_rest) return false;
          return emp.weekly_rest.includes(today);
        });
        
        setEmployeeStats({
          ...empStatsRes.data,
          total_employees: allEmployees.length,
          active_employees: activeNow.length,
          inactive_employees: onRest.length,
          on_rest: onRest.length
        });
        setStats(planningStatsRes.data);
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
            <h2 className="font-cairo font-bold text-xl text-right">{pageTitle}</h2>
            <p className="text-sm text-muted-foreground mt-1 text-right">نظرة شاملة على جميع العمليات والموظفين</p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <p className="text-xs text-blue-700">إجمالي الموظفين</p>
                    <p className="text-3xl font-bold text-blue-900">{employeeStats?.total_employees || 0}</p>
                    <p className="text-xs text-blue-600 mt-1">{employeeStats?.active_employees || 0} نشط</p>
                  </div>
                  <Users className="w-12 h-12 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <p className="text-xs text-green-700">المعاملات</p>
                    <p className="text-3xl font-bold text-green-900">{stats?.total_transactions || 0}</p>
                    <p className="text-xs text-green-600 mt-1">{stats?.pending_transactions || 0} قيد الانتظار</p>
                  </div>
                  <ClipboardList className="w-12 h-12 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <p className="text-xs text-purple-700">قيد التنفيذ</p>
                    <p className="text-3xl font-bold text-purple-900">{stats?.in_progress_transactions || 0}</p>
                    <p className="text-xs text-purple-600 mt-1">من المعاملات</p>
                  </div>
                  <Activity className="w-12 h-12 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 border-cyan-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <p className="text-xs text-cyan-700">مكتملة</p>
                    <p className="text-3xl font-bold text-cyan-900">{stats?.completed_transactions || 0}</p>
                    <p className="text-xs text-cyan-600 mt-1">من المعاملات</p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-cyan-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Employees Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-cairo text-base text-right">حالة الموظفين</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-right">
                    <p className="text-sm font-medium">نشطون</p>
                    <p className="text-2xl font-bold text-green-700">{employeeStats?.active_employees || 0}</p>
                  </div>
                  <UserCheck className="w-8 h-8 text-green-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <div className="text-right">
                    <p className="text-sm font-medium">غير نشطين</p>
                    <p className="text-2xl font-bold text-gray-700">{employeeStats?.inactive_employees || 0}</p>
                  </div>
                  <UserX className="w-8 h-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>

            {/* Transactions Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-cairo text-base text-right">إحصائيات المعاملات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-right flex-1">
                    <p className="text-sm font-medium">قيد الانتظار</p>
                    <p className="text-2xl font-bold text-yellow-700">{stats?.pending_transactions || 0}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-right flex-1">
                    <p className="text-sm font-medium">قيد التنفيذ</p>
                    <p className="text-2xl font-bold text-blue-700">{stats?.in_progress_transactions || 0}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-right flex-1">
                    <p className="text-sm font-medium">مكتملة</p>
                    <p className="text-2xl font-bold text-green-700">{stats?.completed_transactions || 0}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* activeTab === 'data' تم حذفه - لا داعي له */}

      {activeTab === 'employees' && (
        <EmployeeManagement department="planning" />
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <TransactionsPage department="planning" />
      )}

      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <ShiftsCalendar department="planning" />
      )}
    </div>
  );
}
