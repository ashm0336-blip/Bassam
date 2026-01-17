import { useState, useEffect } from "react";
import axios from "axios";
import EmployeeManagement from "@/components/EmployeeManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  HeartPulse,
  Clock,
  CheckCircle2,
  Star,
  MessageSquare,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CrowdServicesDepartment() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API}/crowd-services/stats`);
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching crowd services stats:", error);
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
    <div className="space-y-6" data-testid="crowd-services-page">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employees">
            <Users className="w-4 h-4 ml-2" />
            الموظفون
          </TabsTrigger>
          <TabsTrigger value="services">
            <HeartPulse className="w-4 h-4 ml-2" />
            الخدمات
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <Activity className="w-4 h-4 ml-2" />
            لوحة التحكم
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <div>
            <h2 className="font-cairo font-bold text-xl text-right">لوحة تحكم خدمات حشود الحرم</h2>
            <p className="text-sm text-muted-foreground mt-1 text-right">نظرة شاملة على الخدمات والطلبات</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 justify-between">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">طلبات اليوم</p>
                    <p className="text-2xl font-cairo font-bold">{stats?.service_requests_today || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 justify-between">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">تم حلها</p>
                    <p className="text-2xl font-cairo font-bold text-green-600">{stats?.resolved_requests || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 justify-between">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">متوسط الاستجابة</p>
                    <p className="text-2xl font-cairo font-bold">{stats?.average_response_time || 0} د</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 justify-between">
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">نسبة الرضا</p>
                    <p className="text-2xl font-cairo font-bold">{stats?.satisfaction_rate || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-cairo font-bold text-2xl">إدارة خدمات حشود الحرم</h1>
              <p className="text-sm text-muted-foreground mt-1">إدارة طلبات الخدمة وفرق المساعدة الميدانية</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90" data-testid="new-request-btn">
              <MessageSquare className="w-4 h-4 ml-2" />
              طلب جديد
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          <EmployeeManagement department="crowd_services" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
