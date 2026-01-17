import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Users, 
  DoorOpen, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  Activity,
  ArrowUp,
  ArrowDown,
  Volume2,
  VolumeX
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { CrowdAlertMonitor } from "@/hooks/useAlertSound";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendUp, color = "primary" }) => (
  <Card className="card-hover" data-testid={`stat-card-${title}`}>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-cairo font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${trendUp ? "text-primary" : "text-destructive"}`}>
              {trendUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          color === "primary" ? "bg-primary/10 text-primary" :
          color === "secondary" ? "bg-secondary/20 text-secondary" :
          color === "destructive" ? "bg-destructive/10 text-destructive" :
          "bg-muted text-muted-foreground"
        }`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const DepartmentCard = ({ dept, language }) => {
  const statusColors = {
    normal: "bg-primary",
    warning: "bg-secondary",
    critical: "bg-destructive"
  };

  const statusLabels = {
    normal: language === 'ar' ? "طبيعي" : "Normal",
    warning: language === 'ar' ? "مرتفع" : "High",
    critical: language === 'ar' ? "حرج" : "Critical"
  };

  const employeeStats = dept.employee_stats || {};

  return (
    <Card className="card-hover" data-testid={`dept-card-${dept.id}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cairo font-semibold text-sm">{dept.name}</h3>
          <Badge 
            className={`${statusColors[dept.status]} text-white text-[10px] px-2 py-0.5`}
          >
            {statusLabels[dept.status]}
          </Badge>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{language === 'ar' ? 'نسبة الإشغال' : 'Occupancy'}</span>
              <span className="font-semibold">{dept.percentage}%</span>
            </div>
            <Progress 
              value={dept.percentage} 
              className={`h-2 ${
                dept.status === "normal" ? "[&>div]:bg-primary" :
                dept.status === "warning" ? "[&>div]:bg-secondary" :
                "[&>div]:bg-destructive"
              }`}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2 text-[10px]">
            <div>
              <p className="text-muted-foreground">{language === 'ar' ? 'الموظفون' : 'Staff'}</p>
              <p className="font-cairo font-bold text-base">{dept.active_staff}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{language === 'ar' ? 'المواقع' : 'Locations'}</p>
              <p className="font-cairo font-bold text-base">{employeeStats.locations_count || 0}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-1 pt-2 border-t border-gray-100">
            <div className="text-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto mb-1" />
              <p className="text-[9px] text-muted-foreground">{language === 'ar' ? 'و1' : 'S1'}</p>
              <p className="font-bold text-xs">{employeeStats.shifts?.['الأولى'] || 0}</p>
            </div>
            <div className="text-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mx-auto mb-1" />
              <p className="text-[9px] text-muted-foreground">{language === 'ar' ? 'و2' : 'S2'}</p>
              <p className="font-bold text-xs">{employeeStats.shifts?.['الثانية'] || 0}</p>
            </div>
            <div className="text-center">
              <div className="w-2 h-2 rounded-full bg-orange-500 mx-auto mb-1" />
              <p className="text-[9px] text-muted-foreground">{language === 'ar' ? 'و3' : 'S3'}</p>
              <p className="font-bold text-xs">{employeeStats.shifts?.['الثالثة'] || 0}</p>
            </div>
            <div className="text-center">
              <div className="w-2 h-2 rounded-full bg-purple-500 mx-auto mb-1" />
              <p className="text-[9px] text-muted-foreground">{language === 'ar' ? 'و4' : 'S4'}</p>
              <p className="font-bold text-xs">{employeeStats.shifts?.['الرابعة'] || 0}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AlertItem = ({ alert }) => {
  const typeStyles = {
    emergency: { bg: "bg-destructive/10", border: "border-destructive/30", icon: "text-destructive" },
    warning: { bg: "bg-secondary/10", border: "border-secondary/30", icon: "text-secondary" },
    info: { bg: "bg-primary/10", border: "border-primary/30", icon: "text-primary" }
  };

  const style = typeStyles[alert.type] || typeStyles.info;

  return (
    <div 
      className={`p-4 rounded-lg border ${style.bg} ${style.border} animate-fade-in`}
      data-testid={`alert-${alert.id}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${style.icon}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{alert.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [crowdData, setCrowdData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [gatesWithoutStaff, setGatesWithoutStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, deptsRes, crowdRes, alertsRes, gatesRes, employeesRes] = await Promise.all([
          axios.get(`${API}/dashboard/stats`),
          axios.get(`${API}/dashboard/departments`),
          axios.get(`${API}/dashboard/crowd-hourly`),
          axios.get(`${API}/alerts`),
          axios.get(`${API}/gates`),
          axios.get(`${API}/employees?department=gates`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          })
        ]);
        
        setStats(statsRes.data);
        setDepartments(deptsRes.data);
        setCrowdData(crowdRes.data);
        setAlerts(alertsRes.data.slice(0, 4));
        
        // Find open gates without staff
        const openGates = gatesRes.data.filter(g => g.status === 'مفتوح');
        const employees = employeesRes.data.filter(e => e.is_active);
        const gatesNoStaff = openGates.filter(gate => {
          const staffAtGate = employees.filter(emp => emp.location === gate.name);
          return staffAtGate.length === 0;
        });
        setGatesWithoutStaff(gatesNoStaff);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-32 bg-muted/50" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Sound Alert Monitor */}
      <CrowdAlertMonitor 
        departments={departments}
        enabled={soundEnabled}
        threshold={85}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title={t('openGates')}
          value={`${stats?.open_gates || 0} / ${stats?.total_gates || 0}`}
          subtitle={language === 'ar' ? 'باب نشط' : 'active gates'}
          icon={DoorOpen}
          color="primary"
        />
        <StatCard
          title={language === 'ar' ? 'الموظفين النشطين' : 'Active Staff'}
          value={stats?.active_staff || 0}
          subtitle={language === 'ar' ? 'في الخدمة الآن' : 'on duty now'}
          icon={Users}
          color="secondary"
        />
        <StatCard
          title={t('activeAlerts')}
          value={stats?.alerts_count || 0}
          subtitle={language === 'ar' ? `${gatesWithoutStaff.length} باب بدون موظفين` : `${gatesWithoutStaff.length} gates without staff`}
          icon={AlertTriangle}
          color="destructive"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Distribution by Shift */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-cairo text-lg text-right">{language === 'ar' ? 'توزيع الموظفين حسب الوردية' : 'Staff Distribution by Shift'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {departments.map((dept) => {
                const shifts = dept.employee_stats?.shifts || {};
                const total = Object.values(shifts).reduce((a, b) => a + b, 0);
                
                if (total === 0) return null;
                
                return (
                  <div key={dept.id} className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium mb-2 text-right">{dept.name}</p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="w-3 h-3 rounded-full bg-blue-500 mx-auto mb-1" />
                        <p className="text-xs font-bold">{shifts['الأولى'] || 0}</p>
                      </div>
                      <div>
                        <div className="w-3 h-3 rounded-full bg-green-500 mx-auto mb-1" />
                        <p className="text-xs font-bold">{shifts['الثانية'] || 0}</p>
                      </div>
                      <div>
                        <div className="w-3 h-3 rounded-full bg-orange-500 mx-auto mb-1" />
                        <p className="text-xs font-bold">{shifts['الثالثة'] || 0}</p>
                      </div>
                      <div>
                        <div className="w-3 h-3 rounded-full bg-purple-500 mx-auto mb-1" />
                        <p className="text-xs font-bold">{shifts['الرابعة'] || 0}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card data-testid="alerts-panel">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-cairo text-lg">{t('latestAlerts')}</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary">
                {t('viewAll')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Gates Without Staff Warning */}
            {gatesWithoutStaff.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-destructive">
                      {language === 'ar' ? '⚠️ أبواب مفتوحة بدون موظفين' : '⚠️ Open gates without staff'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {gatesWithoutStaff.slice(0, 3).map(g => g.name).join(', ')}
                      {gatesWithoutStaff.length > 3 && ` +${gatesWithoutStaff.length - 3}`}
                    </p>
                    <p className="text-xs font-medium mt-1 text-destructive">
                      {language === 'ar' ? `إجمالي ${gatesWithoutStaff.length} باب يحتاج موظفين` : `${gatesWithoutStaff.length} gates need staff`}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {alerts.map((alert, index) => (
              <div key={alert.id} className={`stagger-${index + 1}`}>
                <AlertItem alert={alert} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Departments Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-cairo font-bold text-xl">{t('departmentStatus')}</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-xs"
              data-testid="sound-toggle"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 ml-1" /> : <VolumeX className="w-4 h-4 ml-1" />}
              {soundEnabled ? (language === 'ar' ? 'تنبيهات صوتية' : 'Sound alerts') : (language === 'ar' ? 'صامت' : 'Muted')}
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <TrendingUp className="w-4 h-4 ml-2" />
              {t('detailedReport')}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {departments.map((dept, index) => (
            <div key={dept.id} className={`animate-fade-in stagger-${index + 1}`}>
              <DepartmentCard dept={dept} language={language} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
