import { useState, useEffect } from "react";
import axios from "axios";
import { 
  ClipboardList, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  FileText,
  TrendingUp,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <Card className="card-hover">
    <CardContent className="p-5">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-cairo font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

const PlanCard = ({ plan }) => {
  const statusConfig = {
    active: { color: "bg-primary/10 text-primary", label: "نشط" },
    pending: { color: "bg-secondary/20 text-secondary-foreground", label: "قيد المراجعة" },
    completed: { color: "bg-muted text-muted-foreground", label: "مكتمل" }
  };

  const status = statusConfig[plan.status] || statusConfig.pending;

  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{plan.title}</h3>
              <p className="text-xs text-muted-foreground">{plan.date}</p>
            </div>
          </div>
          <Badge className={status.color}>{status.label}</Badge>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {plan.team_size} فرد
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {plan.duration}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="text-primary text-xs">
            التفاصيل
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const EventCard = ({ event }) => (
  <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:border-primary/20 transition-colors">
    <div className="w-14 h-14 rounded-lg bg-secondary/10 flex flex-col items-center justify-center">
      <span className="text-lg font-cairo font-bold text-secondary">{event.day}</span>
      <span className="text-[10px] text-muted-foreground">{event.month}</span>
    </div>
    <div className="flex-1">
      <h4 className="font-semibold text-sm mb-1">{event.title}</h4>
      <p className="text-xs text-muted-foreground">{event.time}</p>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="text-[10px]">{event.type}</Badge>
        <span className="text-[10px] text-muted-foreground">{event.location}</span>
      </div>
    </div>
  </div>
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

  const plans = [
    {
      id: 1,
      title: "خطة إدارة الحشود - صلاة الجمعة",
      description: "خطة شاملة لإدارة تدفق الحشود خلال صلاة الجمعة مع توزيع المشرفين",
      status: "active",
      date: "اليوم",
      team_size: 150,
      duration: "6 ساعات"
    },
    {
      id: 2,
      title: "خطة الطوارئ - الساحات الخارجية",
      description: "خطة بديلة لتوزيع الحشود في حالة الازدحام الشديد",
      status: "pending",
      date: "قيد المراجعة",
      team_size: 80,
      duration: "مستمر"
    },
    {
      id: 3,
      title: "خطة توزيع المسارات - باب الملك عبدالعزيز",
      description: "تحسين مسارات الدخول والخروج عبر الباب الرئيسي",
      status: "completed",
      date: "أمس",
      team_size: 45,
      duration: "4 ساعات"
    }
  ];

  const events = [
    { day: "15", month: "ذو الحجة", title: "التجهيز لموسم الحج", time: "08:00 صباحاً", type: "تخطيط", location: "قاعة الاجتماعات" },
    { day: "18", month: "ذو الحجة", title: "اجتماع المشرفين الأسبوعي", time: "10:00 صباحاً", type: "اجتماع", location: "المكتب الرئيسي" },
    { day: "20", month: "ذو الحجة", title: "تدريب فرق الطوارئ", time: "02:00 مساءً", type: "تدريب", location: "الساحة الشمالية" }
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
    <div className="space-y-6" data-testid="planning-page">
      {/* Header */}
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

      {/* Stats */}
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plans Section */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="active">الخطط النشطة</TabsTrigger>
              <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
              <TabsTrigger value="completed">المكتملة</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="space-y-4 mt-4">
              {plans.filter(p => p.status === "active").map(plan => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </TabsContent>
            
            <TabsContent value="pending" className="space-y-4 mt-4">
              {plans.filter(p => p.status === "pending").map(plan => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4 mt-4">
              {plans.filter(p => p.status === "completed").map(plan => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resource Utilization */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-cairo text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                استخدام الموارد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>الموظفون الميدانيون</span>
                  <span className="font-semibold">{stats?.resource_utilization || 0}%</span>
                </div>
                <Progress value={stats?.resource_utilization || 0} className="h-2 [&>div]:bg-primary" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>المعدات والأجهزة</span>
                  <span className="font-semibold">85%</span>
                </div>
                <Progress value={85} className="h-2 [&>div]:bg-secondary" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>السيارات والمركبات</span>
                  <span className="font-semibold">72%</span>
                </div>
                <Progress value={72} className="h-2 [&>div]:bg-blue-500" />
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-cairo text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                الفعاليات القادمة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.map((event, index) => (
                <EventCard key={index} event={event} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
