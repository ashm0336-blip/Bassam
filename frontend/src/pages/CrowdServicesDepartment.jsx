import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import EmployeeManagement from "@/components/EmployeeManagement";
import TransactionsPage from "@/pages/TransactionsPage";
import DepartmentSettings from "@/pages/DepartmentSettings";
import { 
  Users, 
  HeartPulse,
  Clock,
  CheckCircle2,
  Star,
  MessageSquare,
  Activity,
  UserCheck,
  UserX,
  MapPin,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CrowdServicesDepartment() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const { menuItems } = useSidebar();
  const { language } = useLanguage();
  
  // Get page title from sidebar menu
  const pageInfo = menuItems.find(item => item.href === '/crowd-services' && !item.parent_id);
  const pageTitle = pageInfo ? (language === 'ar' ? pageInfo.name_ar : pageInfo.name_en) : (language === 'ar' ? 'خدمات الحشود' : 'Crowd Services');
  
  const [stats, setStats] = useState(null);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [statsRes, empStatsRes] = await Promise.all([
          axios.get(`${API}/crowd-services/stats`),
          axios.get(`${API}/employees/stats/crowd_services`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setStats(statsRes.data);
        setEmployeeStats(empStatsRes.data);
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
      {activeTab === 'dashboard' && (
        <>
          <div>
            <h2 className="font-cairo font-bold text-xl text-right">{pageTitle}</h2>
            <p className="text-sm text-muted-foreground mt-1 text-right">نظرة شاملة على الخدمات والطلبات</p>
          </div>
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20"><CardHeader className="pb-3"><CardTitle className="font-cairo text-base text-right flex items-center gap-2 justify-end"><Users className="w-5 h-5 text-primary" />إحصائيات الموظفين</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2"><div className="text-center p-2 rounded-lg bg-card border border-border"><Users className="w-4 h-4 mx-auto text-primary mb-1" /><p className="text-lg font-bold">{employeeStats?.total_employees || 0}</p><p className="text-[10px] text-muted-foreground">إجمالي</p></div><div className="text-center p-2 rounded-lg bg-card border border-border"><UserCheck className="w-4 h-4 mx-auto text-green-500 mb-1" /><p className="text-lg font-bold text-green-600">{employeeStats?.active_employees || 0}</p><p className="text-[10px] text-muted-foreground">نشطون</p></div><div className="text-center p-2 rounded-lg bg-card border border-border"><UserX className="w-4 h-4 mx-auto text-gray-500 mb-1" /><p className="text-lg font-bold text-gray-600">{employeeStats?.inactive_employees || 0}</p><p className="text-[10px] text-muted-foreground">غير نشطين</p></div><div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200"><div className="w-2 h-2 rounded-full bg-blue-500 mx-auto mb-1" /><p className="text-lg font-bold text-blue-600">{employeeStats?.shifts?.shift_1 || 0}</p><p className="text-[10px] text-muted-foreground">الأولى</p></div><div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200"><div className="w-2 h-2 rounded-full bg-green-500 mx-auto mb-1" /><p className="text-lg font-bold text-green-600">{employeeStats?.shifts?.shift_2 || 0}</p><p className="text-[10px] text-muted-foreground">الثانية</p></div><div className="text-center p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200"><div className="w-2 h-2 rounded-full bg-orange-500 mx-auto mb-1" /><p className="text-lg font-bold text-orange-600">{employeeStats?.shifts?.shift_3 || 0}</p><p className="text-[10px] text-muted-foreground">الثالثة</p></div><div className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200"><div className="w-2 h-2 rounded-full bg-purple-500 mx-auto mb-1" /><p className="text-lg font-bold text-purple-600">{employeeStats?.shifts?.shift_4 || 0}</p><p className="text-[10px] text-muted-foreground">الرابعة</p></div><div className="text-center p-2 rounded-lg bg-card border border-border"><MapPin className="w-4 h-4 mx-auto text-blue-500 mb-1" /><p className="text-lg font-bold text-blue-600">{employeeStats?.locations_count || 0}</p><p className="text-[10px] text-muted-foreground">المواقع</p></div></div></CardContent></Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="card-hover">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">إجمالي المعاملات</p>
                    <p className="text-xl font-cairo font-bold">{stats?.total_transactions || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">قيد الانتظار</p>
                    <p className="text-xl font-cairo font-bold text-yellow-600">{stats?.pending_transactions || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">مكتملة</p>
                    <p className="text-xl font-cairo font-bold text-green-600">{stats?.completed_transactions || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">الموظفين</p>
                    <p className="text-xl font-cairo font-bold text-blue-600">{stats?.total_employees || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'data' && (
        <>
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
        </>
      )}

      {activeTab === 'employees' && (
        <EmployeeManagement department="crowd_services" />
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <TransactionsPage department="crowd_services" />
      )}
      
      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <DepartmentSettings department="crowd_services" />
      )}
    </div>
  );
}
