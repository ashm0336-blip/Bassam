import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import EmployeeManagement from "@/components/EmployeeManagement";
import GatesDataManagement from "@/components/GatesDataManagement";
import TransactionsPage from "@/pages/TransactionsPage";
import { 
  DoorOpen, 
  DoorClosed,
  Wrench,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Users,
  Activity,
  MapPin,
  Filter,
  UserCheck,
  UserX
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const GateCard = ({ gate }) => {
  const statusConfig = {
    open: { icon: DoorOpen, color: "bg-primary", label: "مفتوح", textColor: "text-primary" },
    closed: { icon: DoorClosed, color: "bg-destructive", label: "مغلق", textColor: "text-destructive" },
    maintenance: { icon: Wrench, color: "bg-secondary", label: "صيانة", textColor: "text-secondary" }
  };

  const directionConfig = {
    entry: { icon: ArrowDownRight, label: "دخول" },
    exit: { icon: ArrowUpRight, label: "خروج" },
    both: { icon: ArrowLeftRight, label: "دخول/خروج" }
  };

  const status = statusConfig[gate.status] || statusConfig.open;
  const direction = directionConfig[gate.direction] || directionConfig.both;
  const StatusIcon = status.icon;
  const DirectionIcon = direction.icon;
  const flowPercentage = (gate.current_flow / gate.max_flow) * 100;

  return (
    <Card className="card-hover" data-testid={`gate-card-${gate.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${status.color}/10 flex items-center justify-center`}>
              <StatusIcon className={`w-5 h-5 ${status.textColor}`} />
            </div>
            <div>
              <h3 className="font-cairo font-semibold text-sm">{gate.name}</h3>
              <p className="text-xs text-muted-foreground">باب رقم {gate.number}</p>
            </div>
          </div>
          <Badge className={`${status.color} text-white text-[10px]`}>{status.label}</Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <DirectionIcon className="w-4 h-4" />
              {direction.label}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {gate.location}
            </span>
          </div>

          {gate.status === "open" && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">التدفق الحالي</span>
                <span className="font-semibold">{gate.current_flow.toLocaleString('ar-SA')} / {gate.max_flow.toLocaleString('ar-SA')}</span>
              </div>
              <Progress 
                value={flowPercentage} 
                className={`h-2 ${
                  flowPercentage < 70 ? "[&>div]:bg-primary" :
                  flowPercentage < 85 ? "[&>div]:bg-secondary" :
                  "[&>div]:bg-destructive"
                }`}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function GatesDepartment() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { menuItems } = useSidebar();
  const { language } = useLanguage();
  const activeTab = searchParams.get('tab') || 'dashboard';
  
  const [gates, setGates] = useState([]);
  const [stats, setStats] = useState(null);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Get page title from sidebar menu (main parent item, not submenu)
  const pageInfo = menuItems.find(item => item.href === '/gates' && !item.parent_id);
  const pageTitle = pageInfo ? (language === 'ar' ? pageInfo.name_ar : pageInfo.name_en) : (language === 'ar' ? 'إدارة الأبواب' : 'Gates Management');
  const pageSubtitle = (language === 'ar' ? 'نظرة شاملة على حالة الأبواب والموظفين' : 'Overview of gates and employees');

  // Update when tab changes - no need for separate state
  useEffect(() => {
    // Re-fetch data when tab changes if needed
    console.log('Active tab:', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [gatesRes, statsRes, empStatsRes] = await Promise.all([
          axios.get(`${API}/gates`),
          axios.get(`${API}/gates/stats`),
          axios.get(`${API}/employees/stats/gates`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setGates(gatesRes.data);
        setStats(statsRes.data);
        setEmployeeStats(empStatsRes.data);
      } catch (error) {
        console.error("Error fetching gates data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredGates = filter === "all" 
    ? gates 
    : gates.filter(g => g.status === filter);

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
    <div className="space-y-6" data-testid="gates-page">
      {/* Show content based on active tab from URL */}
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

          {/* Main Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="card-hover">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DoorOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">إجمالي الأبواب</p>
                    <p className="text-xl font-cairo font-bold">{gates.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <DoorOpen className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">مفتوحة</p>
                    <p className="text-xl font-cairo font-bold text-green-600">{gates.filter(g => g.status === 'مفتوح').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <DoorClosed className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">مغلقة</p>
                    <p className="text-xl font-cairo font-bold text-red-600">{gates.filter(g => g.status === 'مغلق').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">التدفق</p>
                    <p className="text-xl font-cairo font-bold">{gates.reduce((sum, g) => sum + (g.current_flow || 0), 0).toLocaleString('ar-SA')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gates by Plaza */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-cairo text-base text-right">حسب المنطقة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {['الساحة الشرقية', 'الساحة الشمالية', 'الساحة الجنوبية', 'الساحة الغربية'].map((plaza, idx) => {
                    const plazaGates = gates.filter(g => g.plaza === plaza);
                    const colors = ['#BC9661', '#1A4782', '#0E573A', '#700D21'];
                    return (
                      <div key={plaza} className="p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx] }} />
                          <p className="text-xs font-medium">{plaza.replace('الساحة ', '')}</p>
                        </div>
                        <p className="text-xl font-bold">{plazaGates.length}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Congestion */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-cairo text-base text-right">الازدحام</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200">
                    <div className="w-3 h-3 rounded-full bg-green-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-green-600">{gates.filter(g => g.current_indicator === 'خفيف').length}</p>
                    <p className="text-xs text-muted-foreground">خفيف</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200">
                    <div className="w-3 h-3 rounded-full bg-orange-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-orange-600">{gates.filter(g => g.current_indicator === 'متوسط').length}</p>
                    <p className="text-xs text-muted-foreground">متوسط</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
                    <div className="w-3 h-3 rounded-full bg-red-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-red-600">{gates.filter(g => g.current_indicator === 'مزدحم').length}</p>
                    <p className="text-xs text-muted-foreground">مزدحم</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Type */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-cairo text-base text-right">حسب النوع</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['رئيسي', 'فرعي', 'سلم كهربائي', 'مصعد', 'درج', 'جسر'].map((type, idx) => {
                    const count = gates.filter(g => g.gate_type === type).length;
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
                    return count > 0 && (
                      <div key={type} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${colors[idx]} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white font-bold text-xs">{count}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{type}</p>
                            <span className="text-xs text-muted-foreground">{((count / gates.length) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Direction */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-cairo text-base text-right">حسب المسار</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200">
                    <p className="text-xl font-bold text-blue-600">{gates.filter(g => g.direction === 'دخول').length}</p>
                    <p className="text-xs text-muted-foreground">دخول</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200">
                    <p className="text-xl font-bold text-purple-600">{gates.filter(g => g.direction === 'خروج').length}</p>
                    <p className="text-xs text-muted-foreground">خروج</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200">
                    <p className="text-xl font-bold text-green-600">{gates.filter(g => g.direction === 'دخول وخروج').length}</p>
                    <p className="text-xs text-muted-foreground">كلاهما</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-cairo text-base text-right">حسب الفئة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {['محرمين', 'مصلين', 'عربات'].map((cat, idx) => {
                    const count = gates.filter(g => Array.isArray(g.category) ? g.category.includes(cat) : g.category === cat).length;
                    const colors = ['text-primary', 'text-secondary', 'text-blue-600'];
                    const bgColors = ['bg-primary/5 border-primary/20', 'bg-secondary/10 border-secondary/20', 'bg-blue-50 border-blue-200'];
                    return (
                      <div key={cat} className={`text-center p-3 rounded-lg border ${bgColors[idx]}`}>
                        <p className={`text-xl font-bold ${colors[idx]}`}>{count}</p>
                        <p className="text-xs text-muted-foreground">{cat}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Classification */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-cairo text-base text-right">حسب التصنيف</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {['عام', 'رجال', 'نساء', 'طوارئ', 'خدمات', 'جنائز'].map((cls, idx) => {
                    const count = gates.filter(g => g.classification === cls).length;
                    const colors = ['bg-gray-500', 'bg-blue-500', 'bg-pink-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500'];
                    return count > 0 && (
                      <div key={cls} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                        <div className={`w-7 h-7 rounded-full ${colors[idx]} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white font-bold text-xs">{count}</span>
                        </div>
                        <p className="text-sm font-medium">{cls}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Data Management Tab */}
      {activeTab === 'data' && (
        <GatesDataManagement />
      )}

      {/* Employees Management Tab */}
      {activeTab === 'employees' && (
        <EmployeeManagement department="gates" />
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <TransactionsPage department="gates" />
      )}

      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <ShiftsCalendar department="gates" />
      )}
    </div>
  );
}
