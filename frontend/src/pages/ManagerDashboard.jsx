import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Users, 
  DoorOpen, 
  FileText, 
  AlertTriangle,
  Clock,
  CheckCircle,
  Building2,
  TrendingUp,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ManagerDashboard() {
  const { language } = useLanguage();
  const [stats, setStats] = useState({
    gates: { total: 0, open: 0, closed: 0 },
    employees: { total: 0, active: 0, inactive: 0, byDepartment: {} },
    transactions: { total: 0, pending: 0, inProgress: 0, completed: 0 },
    alerts: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllStats();
    const interval = setInterval(fetchAllStats, 30000); // تحديث كل 30 ثانية
    return () => clearInterval(interval);
  }, []);

  const fetchAllStats = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const [gatesRes, employeesRes, transactionsRes, activityRes] = await Promise.all([
        axios.get(`${API}/gates`),
        axios.get(`${API}/employees`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/transactions/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/activity-logs`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const gates = gatesRes.data;
      const employees = employeesRes.data;
      
      // حساب إحصائيات الأبواب
      const openGates = gates.filter(g => g.status === 'مفتوح');
      const gatesWithoutStaff = openGates.filter(gate => {
        const staffAtGate = employees.filter(emp => emp.location === gate.name && emp.is_active);
        return staffAtGate.length === 0;
      });

      // حساب إحصائيات الموظفين
      const activeEmployees = employees.filter(e => e.is_active);
      const byDepartment = employees.reduce((acc, emp) => {
        const dept = emp.department || 'غير محدد';
        if (!acc[dept]) acc[dept] = { total: 0, active: 0 };
        acc[dept].total++;
        if (emp.is_active) acc[dept].active++;
        return acc;
      }, {});

      setStats({
        gates: {
          total: gates.length,
          open: openGates.length,
          closed: gates.length - openGates.length,
          withoutStaff: gatesWithoutStaff.length
        },
        employees: {
          total: employees.length,
          active: activeEmployees.length,
          inactive: employees.length - activeEmployees.length,
          byDepartment
        },
        transactions: transactionsRes.data,
        alerts: gatesWithoutStaff.map(g => ({
          type: 'warning',
          message: `${g.name} - باب مفتوح بدون موظفين`
        })),
        recentActivity: activityRes.data.slice(0, 5)
      });

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const departments = ['gates', 'plazas', 'mataf', 'planning', 'crowd_services'];
  const deptNames = {
    gates: 'إدارة الأبواب',
    plazas: 'إدارة الساحات',
    mataf: 'صحن المطاف',
    planning: 'التخطيط',
    crowd_services: 'خدمات الحشود'
  };

  return (
    <div className="space-y-6" data-testid="manager-dashboard">
      {/* Welcome */}
      <div className="text-right">
        <h1 className="font-cairo font-bold text-3xl">
          {language === 'ar' ? 'لوحة تحكم المدير العام' : 'General Manager Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {language === 'ar' ? 'نظرة شاملة على جميع الإدارات والعمليات' : 'Comprehensive overview of all departments'}
        </p>
      </div>

      {/* Critical Alerts */}
      {stats.alerts.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="font-cairo text-base text-right flex items-center gap-2 justify-end text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {language === 'ar' ? 'تنبيهات عاجلة' : 'Critical Alerts'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.alerts.map((alert, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-card rounded-lg border border-destructive/20 text-right">
                  <p className="text-sm font-medium text-destructive">{alert.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {language === 'ar' ? 'الأبواب' : 'Gates'}
                </p>
                <p className="text-3xl font-cairo font-bold text-blue-900 dark:text-blue-100">
                  {stats.gates.open}/{stats.gates.total}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {stats.gates.open} {language === 'ar' ? 'مفتوح' : 'open'}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                <DoorOpen className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm text-green-700 dark:text-green-300">
                  {language === 'ar' ? 'الموظفين النشطين' : 'Active Staff'}
                </p>
                <p className="text-3xl font-cairo font-bold text-green-900 dark:text-green-100">
                  {stats.employees.active}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {language === 'ar' ? `من ${stats.employees.total} إجمالي` : `of ${stats.employees.total} total`}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {language === 'ar' ? 'المعاملات قيد التنفيذ' : 'Active Transactions'}
                </p>
                <p className="text-3xl font-cairo font-bold text-orange-900 dark:text-orange-100">
                  {stats.transactions.in_progress + stats.transactions.pending}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {stats.transactions.pending} {language === 'ar' ? 'قيد الانتظار' : 'pending'}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {language === 'ar' ? 'التنبيهات' : 'Alerts'}
                </p>
                <p className="text-3xl font-cairo font-bold text-red-900 dark:text-red-100">
                  {stats.alerts.length}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {language === 'ar' ? 'تحتاج انتباه' : 'need attention'}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departments Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo text-base text-right flex items-center gap-2 justify-end">
              <Building2 className="w-5 h-5" />
              {language === 'ar' ? 'حالة الإدارات' : 'Departments Status'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {departments.map(dept => {
              const deptStats = stats.employees.byDepartment[dept] || { total: 0, active: 0 };
              const percentage = deptStats.total > 0 ? (deptStats.active / deptStats.total) * 100 : 0;
              
              return (
                <div key={dept}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-right flex-1">
                      <p className="font-medium text-sm">{deptNames[dept]}</p>
                      <p className="text-xs text-muted-foreground">
                        {deptStats.active} {language === 'ar' ? 'نشط من' : 'active of'} {deptStats.total}
                      </p>
                    </div>
                    <Badge variant={deptStats.active > 0 ? "default" : "secondary"}>
                      {Math.round(percentage)}%
                    </Badge>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Transactions Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo text-base text-right flex items-center gap-2 justify-end">
              <FileText className="w-5 h-5" />
              {language === 'ar' ? 'حالة المعاملات' : 'Transactions Status'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-right flex-1">
                  <p className="text-sm font-medium">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.transactions.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-right flex-1">
                  <p className="text-sm font-medium">{language === 'ar' ? 'تحت الإجراء' : 'In Progress'}</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.transactions.in_progress}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-right flex-1">
                  <p className="text-sm font-medium">{language === 'ar' ? 'مكتملة' : 'Completed'}</p>
                  <p className="text-2xl font-bold text-green-700">{stats.transactions.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo text-base text-right">
            {language === 'ar' ? 'آخر النشاطات' : 'Recent Activities'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentActivity.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 border-r-4 border-primary bg-muted/30 rounded">
                <div className="flex-1 text-right">
                  <p className="font-medium text-sm">{activity.action}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.user_email} - {new Date(activity.timestamp).toLocaleString('ar-SA')}
                  </p>
                  {activity.details && (
                    <p className="text-xs text-muted-foreground mt-1">{activity.details}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {activity.target_type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
