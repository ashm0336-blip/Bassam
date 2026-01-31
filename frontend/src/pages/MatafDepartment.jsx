import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import EmployeeManagement from "@/components/EmployeeManagement";
import TransactionsPage from "@/pages/TransactionsPage";
import DepartmentSettings from "@/pages/DepartmentSettings";
import { 
  Clock,
  Users,
  RotateCw,
  Layers,
  Activity,
  UserCheck,
  UserX,
  MapPin
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
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const { menuItems } = useSidebar();
  const { language } = useLanguage();
  
  // Get page title from sidebar menu
  const pageInfo = menuItems.find(item => item.href === '/mataf' && !item.parent_id);
  const pageTitle = pageInfo ? (language === 'ar' ? pageInfo.name_ar : pageInfo.name_en) : (language === 'ar' ? 'صحن المطاف' : 'Mataf');
  
  const [matafLevels, setMatafLevels] = useState([]);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch data when on dashboard or data tab
    if (activeTab !== 'dashboard' && activeTab !== 'data') {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [matafRes, empStatsRes] = await Promise.all([
          axios.get(`${API}/mataf`),
          axios.get(`${API}/employees/stats/mataf`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setMatafLevels(matafRes.data);
        setEmployeeStats(empStatsRes.data);
      } catch (error) {
        console.error("Error fetching mataf data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

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
      {activeTab === 'dashboard' && (
        <>
          <div>
            <h2 className="font-cairo font-bold text-xl text-right">{pageTitle}</h2>
            <p className="text-sm text-muted-foreground mt-1 text-right">نظرة شاملة على حركة الطواف</p>
          </div>
          
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
        </>
      )}

      {activeTab === 'data' && (
        <>
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {matafLevels.map((level, index) => (
              <div key={level.id} className={`animate-fade-in stagger-${index + 1}`}>
                <LevelCard level={level} />
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'employees' && (
        <EmployeeManagement department="mataf" />
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <TransactionsPage department="mataf" />
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <DepartmentSettings department="mataf" />
      )}
    </div>
  );
}
