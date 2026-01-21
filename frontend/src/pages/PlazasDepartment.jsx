import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import EmployeeManagement from "@/components/EmployeeManagement";
import TransactionsPage from "@/pages/TransactionsPage";
import ShiftsCalendar from "@/pages/ShiftsCalendar";
import { 
  LayoutGrid, 
  Users, 
  AlertTriangle,
  MapPin,
  TrendingUp,
  Maximize2,
  Activity,
  UserCheck,
  UserX
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
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { menuItems } = useSidebar();
  const { language } = useLanguage();
  const activeTab = searchParams.get('tab') || 'dashboard';
  
  // Get page title and subtitle from sidebar menu
  const pageInfo = menuItems.find(item => item.href === '/plazas' && !item.parent_id);
  const pageTitle = pageInfo ? (language === 'ar' ? pageInfo.name_ar : pageInfo.name_en) : (language === 'ar' ? 'إدارة الساحات' : 'Plazas Management');
  const pageSubtitle = pageInfo ? (language === 'ar' ? pageInfo.subtitle_ar : pageInfo.subtitle_en) : (language === 'ar' ? 'نظرة شاملة على حالة الساحات والموظفين' : 'Overview of plazas and employees');
  
  const [plazas, setPlazas] = useState([]);
  const [stats, setStats] = useState(null);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [plazasRes, statsRes, empStatsRes] = await Promise.all([
          axios.get(`${API}/plazas`),
          axios.get(`${API}/plazas/stats`),
          axios.get(`${API}/employees/stats/plazas`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setPlazas(plazasRes.data);
        setStats(statsRes.data);
        setEmployeeStats(empStatsRes.data);
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
      {activeTab === 'dashboard' && (
        <>
          <div>
            <h2 className="font-cairo font-bold text-xl text-right">{pageTitle}</h2>
            {pageSubtitle && <p className="text-sm text-muted-foreground mt-1 text-right">{pageSubtitle}</p>}
          </div>

          {/* Employee Stats */}
<Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="font-cairo text-base text-right flex items-center gap-2 justify-end">
                <Users className="w-5 h-5 text-primary" />
                إحصائيات الموظفين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                <div className="text-center p-2 rounded-lg bg-card border border-border">
                  <Users className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold">{employeeStats?.total_employees || 0}</p>
                  <p className="text-[10px] text-muted-foreground">إجمالي</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-card border border-border">
                  <UserCheck className="w-4 h-4 mx-auto text-green-500 mb-1" />
                  <p className="text-lg font-bold text-green-600">{employeeStats?.active_employees || 0}</p>
                  <p className="text-[10px] text-muted-foreground">نشطون</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-card border border-border">
                  <UserX className="w-4 h-4 mx-auto text-gray-500 mb-1" />
                  <p className="text-lg font-bold text-gray-600">{employeeStats?.inactive_employees || 0}</p>
                  <p className="text-[10px] text-muted-foreground">غير نشطين</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-blue-600">{employeeStats?.shifts?.shift_1 || 0}</p>
                  <p className="text-[10px] text-muted-foreground">الأولى</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200">
                  <div className="w-2 h-2 rounded-full bg-green-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-green-600">{employeeStats?.shifts?.shift_2 || 0}</p>
                  <p className="text-[10px] text-muted-foreground">الثانية</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-orange-600">{employeeStats?.shifts?.shift_3 || 0}</p>
                  <p className="text-[10px] text-muted-foreground">الثالثة</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-purple-600">{employeeStats?.shifts?.shift_4 || 0}</p>
                  <p className="text-[10px] text-muted-foreground">الرابعة</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-card border border-border">
                  <MapPin className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                  <p className="text-lg font-bold text-blue-600">{employeeStats?.locations_count || 0}</p>
                  <p className="text-[10px] text-muted-foreground">المواقع</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card className="card-hover">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">إجمالي</p>
                    <p className="text-xl font-cairo font-bold">{stats?.total_plazas || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">الحشود</p>
                    <p className="text-xl font-cairo font-bold">{stats?.current_crowd?.toLocaleString('ar-SA') || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">الإشغال</p>
                    <p className="text-xl font-cairo font-bold">{stats?.overall_percentage || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">حرجة</p>
                    <p className="text-xl font-cairo font-bold text-destructive">{stats?.critical || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-cairo text-base text-right">توزيع الحالة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="w-3 h-3 rounded-full bg-primary mx-auto mb-1" />
                  <p className="text-xl font-bold text-primary">{stats?.normal || 0}</p>
                  <p className="text-xs text-muted-foreground">طبيعي</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                  <div className="w-3 h-3 rounded-full bg-secondary mx-auto mb-1" />
                  <p className="text-xl font-bold text-secondary">{stats?.warning || 0}</p>
                  <p className="text-xs text-muted-foreground">مرتفع</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div className="w-3 h-3 rounded-full bg-destructive mx-auto mb-1" />
                  <p className="text-xl font-bold text-destructive">{stats?.critical || 0}</p>
                  <p className="text-xs text-muted-foreground">حرج</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'data' && (
        <>
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
        </>
      )}

      {activeTab === 'employees' && (
        <EmployeeManagement department="plazas" />
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <TransactionsPage department="plazas" />
      )}

      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <ShiftsCalendar department="plazas" />
      )}
    </div>
  );
}
