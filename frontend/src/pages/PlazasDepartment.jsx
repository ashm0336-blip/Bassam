import { useState, useEffect } from "react";
import axios from "axios";
import EmployeeManagement from "@/components/EmployeeManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutGrid, 
  Users, 
  AlertTriangle,
  MapPin,
  TrendingUp,
  Maximize2,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PlazaCard = ({ plaza }) => {
  const statusConfig = {
    normal: { color: "bg-primary", textColor: "text-primary", label: "طبيعي", progressColor: "[&>div]:bg-primary" },
    warning: { color: "bg-secondary", textColor: "text-secondary", label: "مرتفع", progressColor: "[&>div]:bg-secondary" },
    critical: { color: "bg-destructive", textColor: "text-destructive", label: "حرج", progressColor: "[&>div]:bg-destructive" }
  };

  const status = statusConfig[plaza.status] || statusConfig.normal;

  return (
    <Card className="card-hover" data-testid={`plaza-card-${plaza.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${status.color}/10 flex items-center justify-center`}>
              <LayoutGrid className={`w-5 h-5 ${status.textColor}`} />
            </div>
            <div>
              <h3 className="font-cairo font-semibold">{plaza.name}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {plaza.zone === "north" ? "الجهة الشمالية" :
                 plaza.zone === "south" ? "الجهة الجنوبية" :
                 plaza.zone === "east" ? "الجهة الشرقية" :
                 plaza.zone === "west" ? "الجهة الغربية" :
                 plaza.zone === "masa" ? "منطقة المسعى" : "منطقة أجياد"}
              </p>
            </div>
          </div>
          <Badge className={`${status.color} text-white text-xs`}>{status.label}</Badge>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">نسبة الإشغال</span>
              <span className="font-semibold">{plaza.percentage}%</span>
            </div>
            <Progress value={plaza.percentage} className={`h-3 ${status.progressColor}`} />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <p className="text-[10px] text-muted-foreground">الحشود الحالية</p>
              <p className="font-cairo font-bold text-lg">{plaza.current_crowd.toLocaleString('ar-SA')}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">الطاقة القصوى</p>
              <p className="font-cairo font-bold text-lg">{plaza.max_capacity.toLocaleString('ar-SA')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PlazasDepartment() {
  const [plazas, setPlazas] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plazasRes, statsRes] = await Promise.all([
          axios.get(`${API}/plazas`),
          axios.get(`${API}/plazas/stats`)
        ]);
        setPlazas(plazasRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error("Error fetching plazas data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-5 h-24 bg-muted/50" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="plazas-page">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employees">
            <Users className="w-4 h-4 ml-2" />
            الموظفون
          </TabsTrigger>
          <TabsTrigger value="plazas">
            <LayoutGrid className="w-4 h-4 ml-2" />
            الساحات
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <Activity className="w-4 h-4 ml-2" />
            لوحة التحكم
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <div>
            <h2 className="font-cairo font-bold text-xl text-right">لوحة تحكم إدارة الساحات</h2>
            <p className="text-sm text-muted-foreground mt-1 text-right">نظرة شاملة على حالة الساحات والموظفين</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 justify-between">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <LayoutGrid className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">إجمالي الساحات</p>
                    <p className="text-2xl font-cairo font-bold">{stats?.total_plazas || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 justify-between">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">الحشود الحالية</p>
                    <p className="text-2xl font-cairo font-bold">{stats?.current_crowd?.toLocaleString('ar-SA') || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">نسبة الإشغال</p>
                    <p className="text-2xl font-cairo font-bold">{stats?.overall_percentage || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 justify-between">
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">ساحات حرجة</p>
                    <p className="text-2xl font-cairo font-bold text-destructive">{stats?.critical || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-cairo text-right">توزيع الحالة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="w-3 h-3 rounded-full bg-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-primary">{stats?.normal || 0}</p>
                  <p className="text-sm text-muted-foreground">طبيعي</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                  <div className="w-3 h-3 rounded-full bg-secondary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-secondary">{stats?.warning || 0}</p>
                  <p className="text-sm text-muted-foreground">مرتفع</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div className="w-3 h-3 rounded-full bg-destructive mx-auto mb-2" />
                  <p className="text-2xl font-bold text-destructive">{stats?.critical || 0}</p>
                  <p className="text-sm text-muted-foreground">حرج</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plazas" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-cairo font-bold text-2xl">إدارة الساحات</h1>
              <p className="text-sm text-muted-foreground mt-1">مراقبة وإدارة ساحات الحرم المكي الشريف</p>
            </div>
            <Button variant="outline" data-testid="view-map-btn">
              <Maximize2 className="w-4 h-4 ml-2" />
              عرض الخريطة
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plazas.map((plaza, index) => (
              <div key={plaza.id} className={`animate-fade-in stagger-${index + 1}`}>
                <PlazaCard plaza={plaza} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          <EmployeeManagement department="plazas" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
