import { useState, useEffect } from "react";
import axios from "axios";
import EmployeeManagement from "@/components/EmployeeManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Circle, 
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  RotateCw,
  Layers,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LevelCard = ({ level }) => {
  const statusConfig = {
    normal: { color: "bg-primary", textColor: "text-primary", label: "طبيعي", progressColor: "[&>div]:bg-primary" },
    warning: { color: "bg-secondary", textColor: "text-secondary", label: "مرتفع", progressColor: "[&>div]:bg-secondary" },
    critical: { color: "bg-destructive", textColor: "text-destructive", label: "حرج", progressColor: "[&>div]:bg-destructive" }
  };

  const status = statusConfig[level.status] || statusConfig.normal;

  return (
    <Card className="card-hover" data-testid={`level-card-${level.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${status.color}/10 flex items-center justify-center`}>
              <Layers className={`w-6 h-6 ${status.textColor}`} />
            </div>
            <div>
              <h3 className="font-cairo font-bold text-lg">{level.level}</h3>
              <p className="text-xs text-muted-foreground">صحن المطاف</p>
            </div>
          </div>
          <Badge className={`${status.color} text-white`}>{status.label}</Badge>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">نسبة الإشغال</span>
              <span className="font-bold">{level.percentage}%</span>
            </div>
            <Progress value={level.percentage} className={`h-3 ${status.progressColor}`} />
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">الحشود الحالية</span>
              </div>
              <p className="font-cairo font-bold text-xl">{level.current_crowd.toLocaleString('ar-SA')}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">متوسط الطواف</span>
              </div>
              <p className="font-cairo font-bold text-xl">{level.average_tawaf_time} <span className="text-sm font-normal">دقيقة</span></p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function MatafDepartment() {
  const [matafLevels, setMatafLevels] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matafRes, statsRes] = await Promise.all([
          axios.get(`${API}/mataf`),
          axios.get(`${API}/mataf/stats`)
        ]);
        setMatafLevels(matafRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error("Error fetching mataf data:", error);
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
            <Card key={i}><CardContent className="p-6 h-48 bg-muted/50" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="mataf-page">
      <Tabs defaultValue="mataf" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="employees">
            <Users className="w-4 h-4 ml-2" />
            الموظفون
          </TabsTrigger>
          <TabsTrigger value="mataf">
            <Circle className="w-4 h-4 ml-2" />
            المطاف
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mataf" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-cairo font-bold text-2xl">إدارة صحن المطاف</h1>
              <p className="text-sm text-muted-foreground mt-1">مراقبة حركة الطواف والحشود في الطوابق المختلفة</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                <Activity className="w-4 h-4 ml-1" />
                تحديث مباشر
              </Badge>
              <Button variant="outline" size="icon" data-testid="refresh-btn">
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الحشود</p>
                    <p className="text-2xl font-cairo font-bold">{stats?.current_crowd?.toLocaleString('ar-SA') || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">نسبة الإشغال</p>
                    <p className="text-2xl font-cairo font-bold">{stats?.overall_percentage || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">متوسط الطواف</p>
                    <p className="text-2xl font-cairo font-bold">{stats?.average_tawaf_time || 0} <span className="text-sm font-normal">دقيقة</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">مناطق حرجة</p>
                    <p className="text-2xl font-cairo font-bold text-destructive">{stats?.status_summary?.critical || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {matafLevels.map((level, index) => (
              <div key={level.id} className={`animate-fade-in stagger-${index + 1}`}>
                <LevelCard level={level} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          <EmployeeManagement department="mataf" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
