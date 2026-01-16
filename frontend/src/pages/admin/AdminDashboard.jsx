import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Users, 
  Activity,
  TrendingUp,
  UserPlus,
  Clock,
  Shield,
  Eye,
  Briefcase,
  UserCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_COLORS = {
  system_admin: "#dc2626",
  general_manager: "#9333ea",
  department_manager: "#3b82f6",
  field_staff: "#22c55e",
  monitoring_team: "#f97316"
};

const ROLE_LABELS = {
  ar: {
    system_admin: "مسؤول النظام",
    general_manager: "المدير العام",
    department_manager: "مدير إدارة",
    field_staff: "موظف ميداني",
    monitoring_team: "فريق المراقبة"
  },
  en: {
    system_admin: "System Admin",
    general_manager: "General Manager",
    department_manager: "Department Manager",
    field_staff: "Field Staff",
    monitoring_team: "Monitoring Team"
  }
};

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendUp, color = "primary" }) => (
  <Card className="card-hover">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          color === "primary" ? "bg-primary/10 text-primary" :
          color === "secondary" ? "bg-secondary/20 text-secondary" :
          color === "destructive" ? "bg-destructive/10 text-destructive" :
          "bg-muted text-muted-foreground"
        }`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="space-y-2 text-right flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-cairo font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 text-xs justify-end ${trendUp ? "text-primary" : "text-destructive"}`}>
              <TrendingUp className="w-3 h-3" />
              <span>{trend}</span>
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function AdminDashboard() {
  const { language } = useLanguage();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    activeToday: 0,
    newThisWeek: 0,
    byRole: {}
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const usersData = response.data;
      setUsers(usersData);
      
      // Calculate stats
      const byRole = {};
      usersData.forEach(user => {
        byRole[user.role] = (byRole[user.role] || 0) + 1;
      });
      
      // Get recent users (last 5)
      const sorted = [...usersData].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setRecentUsers(sorted.slice(0, 5));
      
      // Calculate new users this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const newThisWeek = usersData.filter(u => 
        new Date(u.created_at) > oneWeekAgo
      ).length;
      
      setStats({
        total: usersData.length,
        activeToday: usersData.length, // Mock for now
        newThisWeek,
        byRole
      });
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare pie chart data
  const pieData = Object.entries(stats.byRole).map(([role, count]) => ({
    name: ROLE_LABELS[language][role] || role,
    value: count,
    color: ROLE_COLORS[role]
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-cairo font-bold text-xl text-right">
          {language === 'ar' ? 'لوحة تحكم مسؤول النظام' : 'System Admin Dashboard'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 text-right">
          {language === 'ar' ? 'نظرة عامة على نشاط المستخدمين والنظام' : 'Overview of user activity and system'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={language === 'ar' ? 'الأدوار النشطة' : 'Active Roles'}
          value={Object.keys(stats.byRole).length}
          subtitle={language === 'ar' ? 'من 5 أدوار' : 'of 5 roles'}
          icon={Shield}
          color="secondary"
        />
        <StatCard
          title={language === 'ar' ? 'مستخدمون جدد' : 'New Users'}
          value={stats.newThisWeek}
          subtitle={language === 'ar' ? 'هذا الأسبوع' : 'this week'}
          icon={UserPlus}
          trend={language === 'ar' ? '+15%' : '+15%'}
          trendUp={true}
          color="primary"
        />
        <StatCard
          title={language === 'ar' ? 'المستخدمون النشطون' : 'Active Users'}
          value={stats.activeToday}
          subtitle={language === 'ar' ? 'اليوم' : 'today'}
          icon={Activity}
          color="secondary"
        />
        <StatCard
          title={language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}
          value={stats.total}
          subtitle={language === 'ar' ? 'في النظام' : 'in system'}
          icon={Users}
          color="primary"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-cairo text-lg text-right">
                {language === 'ar' ? 'آخر المستخدمين المضافين' : 'Recently Added Users'}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 ml-1" />
                {language === 'ar' ? 'الأحدث' : 'Latest'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers.map((user, index) => {
                const roleConfig = {
                  system_admin: { icon: Shield, color: "bg-red-600" },
                  general_manager: { icon: Briefcase, color: "bg-purple-500" },
                  department_manager: { icon: Briefcase, color: "bg-blue-500" },
                  field_staff: { icon: UserCheck, color: "bg-green-500" },
                  monitoring_team: { icon: Eye, color: "bg-orange-500" }
                }[user.role] || { icon: Users, color: "bg-gray-500" };
                
                const Icon = roleConfig.icon;
                
                return (
                  <div 
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="text-right flex-1">
                      <p className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="font-medium text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-full ${roleConfig.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats by Role */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo text-lg text-right">
            {language === 'ar' ? 'توزيع المستخدمين' : 'User Distribution'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(ROLE_LABELS[language]).map(([key, label]) => {
              const count = stats.byRole[key] || 0;
              const total = stats.total;
              const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
              const roleConfig = {
                system_admin: { icon: Shield, color: "bg-red-600" },
                general_manager: { icon: Briefcase, color: "bg-purple-500" },
                department_manager: { icon: Briefcase, color: "bg-blue-500" },
                field_staff: { icon: UserCheck, color: "bg-green-500" },
                monitoring_team: { icon: Eye, color: "bg-orange-500" }
              }[key];
              
              const Icon = roleConfig.icon;
              
              return (
                <div key={key} className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {percentage}%
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold">{count}</span>
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${roleConfig.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${roleConfig.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
