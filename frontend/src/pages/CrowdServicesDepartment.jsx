import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Users, 
  HeartPulse,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Star,
  Phone,
  UserCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ServiceRequestCard = ({ request }) => {
  const priorityConfig = {
    high: { color: "bg-destructive", label: "عالي" },
    medium: { color: "bg-secondary", label: "متوسط" },
    low: { color: "bg-primary", label: "منخفض" }
  };

  const statusConfig = {
    pending: { color: "border-secondary text-secondary", label: "قيد الانتظار" },
    in_progress: { color: "border-blue-500 text-blue-500", label: "جاري التنفيذ" },
    resolved: { color: "border-primary text-primary", label: "مكتمل" }
  };

  const priority = priorityConfig[request.priority] || priorityConfig.medium;
  const status = statusConfig[request.status] || statusConfig.pending;

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-full ${priority.color} rounded-full`} />
            <div>
              <h3 className="font-semibold text-sm">{request.title}</h3>
              <p className="text-xs text-muted-foreground">{request.time}</p>
            </div>
          </div>
          <Badge variant="outline" className={status.color}>{status.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{request.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            {request.location}
          </span>
          <Button variant="ghost" size="sm" className="text-xs text-primary h-7">
            عرض التفاصيل
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const TeamCard = ({ team }) => (
  <Card className="card-hover">
    <CardContent className="p-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <UserCheck className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{team.name}</h3>
          <p className="text-xs text-muted-foreground">{team.location}</p>
        </div>
        <Badge className={team.status === "active" ? "bg-primary" : "bg-muted text-muted-foreground"}>
          {team.status === "active" ? "نشط" : "في استراحة"}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100">
        <div className="text-center">
          <p className="text-lg font-cairo font-bold">{team.members}</p>
          <p className="text-[10px] text-muted-foreground">أفراد</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-cairo font-bold">{team.tasks_today}</p>
          <p className="text-[10px] text-muted-foreground">مهام اليوم</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-cairo font-bold">{team.completed}</p>
          <p className="text-[10px] text-muted-foreground">مكتمل</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

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

  const serviceRequests = [
    { id: 1, title: "طلب مساعدة كبير سن", description: "زائر كبير في السن يحتاج كرسي متحرك", time: "منذ 5 دقائق", location: "باب الملك فهد", priority: "high", status: "in_progress" },
    { id: 2, title: "استفسار عن المسارات", description: "مجموعة تسأل عن أقرب مسار للمطاف", time: "منذ 12 دقيقة", location: "الساحة الشمالية", priority: "low", status: "resolved" },
    { id: 3, title: "حالة طبية بسيطة", description: "زائر يشعر بدوخة ويحتاج مساعدة", time: "منذ 8 دقائق", location: "صحن المطاف", priority: "medium", status: "pending" },
    { id: 4, title: "فقدان طفل", description: "عائلة تبحث عن طفل مفقود (8 سنوات)", time: "منذ 3 دقائق", location: "باب العمرة", priority: "high", status: "in_progress" },
  ];

  const teams = [
    { id: 1, name: "فريق الإرشاد أ", location: "الساحة الشمالية", status: "active", members: 12, tasks_today: 45, completed: 38 },
    { id: 2, name: "فريق المساعدة ب", location: "صحن المطاف", status: "active", members: 8, tasks_today: 32, completed: 28 },
    { id: 3, name: "فريق الدعم ج", location: "الساحة الجنوبية", status: "inactive", members: 10, tasks_today: 25, completed: 25 },
  ];

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
      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">طلبات اليوم</p>
                <p className="text-2xl font-cairo font-bold">{stats?.service_requests_today || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تم حلها</p>
                <p className="text-2xl font-cairo font-bold text-green-600">{stats?.resolved_requests || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متوسط الاستجابة</p>
                <p className="text-2xl font-cairo font-bold">{stats?.average_response_time || 0} د</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">نسبة الرضا</p>
                <p className="text-2xl font-cairo font-bold">{stats?.satisfaction_rate || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Requests */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all">جميع الطلبات</TabsTrigger>
              <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
              <TabsTrigger value="in_progress">جاري التنفيذ</TabsTrigger>
              <TabsTrigger value="resolved">مكتملة</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {serviceRequests.map((request, index) => (
                <div key={request.id} className={`animate-fade-in stagger-${index + 1}`}>
                  <ServiceRequestCard request={request} />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="pending" className="space-y-3 mt-4">
              {serviceRequests.filter(r => r.status === "pending").map(request => (
                <ServiceRequestCard key={request.id} request={request} />
              ))}
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-3 mt-4">
              {serviceRequests.filter(r => r.status === "in_progress").map(request => (
                <ServiceRequestCard key={request.id} request={request} />
              ))}
            </TabsContent>

            <TabsContent value="resolved" className="space-y-3 mt-4">
              {serviceRequests.filter(r => r.status === "resolved").map(request => (
                <ServiceRequestCard key={request.id} request={request} />
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Teams Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-cairo text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                الفرق الميدانية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {teams.map(team => (
                <TeamCard key={team.id} team={team} />
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-cairo text-lg">إحصائيات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">الفرق النشطة</span>
                <span className="font-bold">{stats?.active_teams || 0} فريق</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">طلبات معلقة</span>
                <span className="font-bold text-secondary">{stats?.pending_requests || 0}</span>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">نسبة الإنجاز اليوم</span>
                  <span className="font-bold">
                    {stats?.resolved_requests && stats?.service_requests_today 
                      ? Math.round((stats.resolved_requests / stats.service_requests_today) * 100) 
                      : 0}%
                  </span>
                </div>
                <Progress 
                  value={stats?.resolved_requests && stats?.service_requests_today 
                    ? (stats.resolved_requests / stats.service_requests_today) * 100 
                    : 0} 
                  className="h-2 [&>div]:bg-primary" 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
