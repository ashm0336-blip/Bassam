import { useState, useEffect } from "react";
import axios from "axios";
import EmployeeManagement from "@/components/EmployeeManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ClipboardList, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock,
  Activity,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <Card className="card-hover">
    <CardContent className="p-5">
      <div className="flex items-center gap-4 justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-cairo font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function PlanningDepartment() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API}/planning/stats`);
        setStats(response.data);
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
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employees">
            <Users className="w-4 h-4 ml-2" />
            الموظفون
          </TabsTrigger>
          <TabsTrigger value="planning">
            <ClipboardList className="w-4 h-4 ml-2" />
            الخطط
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <Activity className="w-4 h-4 ml-2" />
            لوحة التحكم
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <div>
            <h2 className="font-cairo font-bold text-xl text-right">لوحة تحكم إدارة التخطيط</h2>
            <p className="text-sm text-muted-foreground mt-1 text-right">نظرة شاملة على الخطط والموارد</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="الخطط النشطة"
              value={stats?.active_plans || 0}
              icon={ClipboardList}
              color="bg-primary/10 text-primary"
            />
            <StatCard
              title="بانتظار الموافقة"
              value={stats?.pending_approvals || 0}
              icon={Clock}
              color="bg-secondary/20 text-secondary"
            />
            <StatCard
              title="المكتملة اليوم"
              value={stats?.completed_today || 0}
              icon={CheckCircle2}
              color="bg-green-100 text-green-700"
            />
            <StatCard
              title="الموظفون المنتشرون"
              value={stats?.staff_deployed || 0}
              icon={Users}
              color="bg-blue-100 text-blue-700"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-cairo text-right">استخدام الموارد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>الموظفون الميدانيون</span>
                  <span className="font-semibold">{stats?.resource_utilization || 0}%</span>
                </div>
                <Progress value={stats?.resource_utilization || 0} className="h-2 [&>div]:bg-primary" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-cairo font-bold text-2xl">إدارة تخطيط خدمات الحشود</h1>
              <p className="text-sm text-muted-foreground mt-1">إدارة الخطط والجداول والموارد البشرية</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90" data-testid="create-plan-btn">
              <ClipboardList className="w-4 h-4 ml-2" />
              خطة جديدة
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          <EmployeeManagement department="planning" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
