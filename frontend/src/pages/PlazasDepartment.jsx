import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import DepartmentOverview from "@/pages/DepartmentOverview";
import DepartmentSettings from "@/pages/DepartmentSettings";
import TasksPage from "@/pages/TasksPage";
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
          axios.get(`${API}/employees/stats/squares`, {
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
        <DepartmentOverview department="squares" />
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
        <DepartmentSettings department="squares" />
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <TasksPage department="squares" />
      )}
      
      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <DepartmentSettings department="squares" />
      )}
    </div>
  );
}
