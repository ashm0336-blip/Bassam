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
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'الحشود الحالية' : 'Current Crowd'}</p>
              <p className="font-cairo font-bold text-lg">{dept.current_crowd.toLocaleString('ar-SA')}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'الموظفون' : 'Staff'}</p>
              <p className="font-cairo font-bold text-lg">{dept.active_staff}</p>
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
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, deptsRes, crowdRes, alertsRes] = await Promise.all([
          axios.get(`${API}/dashboard/stats`),
          axios.get(`${API}/dashboard/departments`),
          axios.get(`${API}/dashboard/crowd-hourly`),
          axios.get(`${API}/alerts`)
        ]);
        
        setStats(statsRes.data);
        setDepartments(deptsRes.data);
        setCrowdData(crowdRes.data);
        setAlerts(alertsRes.data.slice(0, 4));
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الزوار اليوم"
          value={stats?.total_visitors_today?.toLocaleString('ar-SA') || "0"}
          subtitle="منذ الفجر"
          icon={Users}
          trend="+12% من أمس"
          trendUp={true}
          color="primary"
        />
        <StatCard
          title="الحشود الحالية"
          value={stats?.current_crowd?.toLocaleString('ar-SA') || "0"}
          subtitle={`من ${stats?.max_capacity?.toLocaleString('ar-SA')} الطاقة الاستيعابية`}
          icon={Activity}
          color="secondary"
        />
        <StatCard
          title="الأبواب المفتوحة"
          value={`${stats?.open_gates || 0} / ${stats?.total_gates || 0}`}
          subtitle="باب نشط"
          icon={DoorOpen}
          color="primary"
        />
        <StatCard
          title="التنبيهات النشطة"
          value={stats?.alerts_count || 0}
          subtitle={`${stats?.incidents_today || 0} حوادث اليوم`}
          icon={AlertTriangle}
          color="destructive"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crowd Chart */}
        <Card className="lg:col-span-2" data-testid="crowd-chart">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-cairo text-lg">حركة الحشود على مدار اليوم</CardTitle>
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 ml-1" />
                تحديث مباشر
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={crowdData}>
                  <defs>
                    <linearGradient id="crowdGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#004D38" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#004D38" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#E5E5E0' }}
                    reversed
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#E5E5E0' }}
                    tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: '1px solid #E5E5E0',
                      borderRadius: '8px',
                      direction: 'rtl'
                    }}
                    formatter={(value) => [value.toLocaleString('ar-SA'), 'الحشود']}
                    labelFormatter={(label) => `الساعة ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#004D38" 
                    strokeWidth={2}
                    fill="url(#crowdGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card data-testid="alerts-panel">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-cairo text-lg">آخر التنبيهات</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary">
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
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
          <h2 className="font-cairo font-bold text-xl">حالة الإدارات</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-xs"
              data-testid="sound-toggle"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 ml-1" /> : <VolumeX className="w-4 h-4 ml-1" />}
              {soundEnabled ? "تنبيهات صوتية" : "صامت"}
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <TrendingUp className="w-4 h-4 ml-2" />
              تقرير مفصل
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {departments.map((dept, index) => (
            <div key={dept.id} className={`animate-fade-in stagger-${index + 1}`}>
              <DepartmentCard dept={dept} />
            </div>
          ))}
        </div>
      </div>

      {/* Department Comparison Chart */}
      <Card data-testid="dept-comparison-chart">
        <CardHeader className="pb-2">
          <CardTitle className="font-cairo text-lg">مقارنة نسب الإشغال بين الإدارات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departments} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" horizontal={true} vertical={false} />
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={150}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #E5E5E0',
                    borderRadius: '8px',
                    direction: 'rtl'
                  }}
                  formatter={(value) => [`${value}%`, 'نسبة الإشغال']}
                />
                <Bar 
                  dataKey="percentage" 
                  fill="#004D38"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
