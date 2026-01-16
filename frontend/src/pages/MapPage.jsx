import { useState, useEffect } from "react";
import axios from "axios";
import InteractiveMap from "@/components/InteractiveMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Map, 
  LayoutGrid, 
  DoorOpen, 
  Circle,
  Activity,
  AlertTriangle
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MapPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [gatesRes, plazasRes, matafRes] = await Promise.all([
          axios.get(`${API}/gates/stats`),
          axios.get(`${API}/plazas/stats`),
          axios.get(`${API}/mataf/stats`)
        ]);
        setStats({
          gates: gatesRes.data,
          plazas: plazasRes.data,
          mataf: matafRes.data
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6" data-testid="map-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-cairo font-bold text-2xl">الخريطة التفاعلية</h1>
          <p className="text-sm text-muted-foreground mt-1">
            مراقبة الحرم المكي الشريف في الوقت الفعلي
          </p>
        </div>
        <Badge variant="outline" className="animate-pulse-soft">
          <Activity className="w-4 h-4 ml-1 text-primary" />
          تحديث مباشر
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DoorOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الأبواب المفتوحة</p>
                <p className="text-xl font-cairo font-bold">
                  {stats?.gates?.open || 0} / {stats?.gates?.total || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إشغال الساحات</p>
                <p className="text-xl font-cairo font-bold">
                  {stats?.plazas?.overall_percentage || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Circle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إشغال المطاف</p>
                <p className="text-xl font-cairo font-bold">
                  {stats?.mataf?.overall_percentage || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">مناطق حرجة</p>
                <p className="text-xl font-cairo font-bold text-destructive">
                  {(stats?.plazas?.critical || 0) + (stats?.mataf?.status_summary?.critical || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Map */}
      <InteractiveMap />

      {/* Instructions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-cairo text-lg">تعليمات الاستخدام</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">1</span>
              </div>
              <div>
                <p className="font-semibold">انقر على الأبواب</p>
                <p className="text-muted-foreground text-xs">لعرض تفاصيل كل باب وحالة التدفق</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-secondary font-bold">2</span>
              </div>
              <div>
                <p className="font-semibold">انقر على الساحات</p>
                <p className="text-muted-foreground text-xs">لعرض نسبة الإشغال وعدد الحشود</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <div>
                <p className="font-semibold">استخدم التكبير</p>
                <p className="text-muted-foreground text-xs">لرؤية تفاصيل أكثر في الخريطة</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
