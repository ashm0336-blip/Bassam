import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import EmployeeManagement from "@/components/EmployeeManagement";
import {
  Users,
  UserCheck,
  UserX,
  MapPin,
  ClipboardList,
  Clock,
  CheckCircle2,
  Briefcase,
  Activity,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <Card className="card-hover">
    <CardContent className="p-3">
      <div className="flex items-center gap-2 justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-cairo font-bold">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function PlanningDepartment() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  
  const [stats, setStats] = useState(null);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [statsRes, empStatsRes] = await Promise.all([
          axios.get(`${API}/planning/stats`),
          axios.get(`${API}/employees/stats/planning`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setStats(statsRes.data);
        setEmployeeStats(empStatsRes.data);
      } catch (error) {
        console.error("Error fetching planning stats:", error);
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
    <div className="space-y-6" data-testid="planning-page">
      {activeTab === 'dashboard' && (
        <>
          <div>
            <h2 className="font-cairo font-bold text-xl text-right">لوحة تحكم إدارة التخطيط</h2>
            <p className="text-sm text-muted-foreground mt-1 text-right">نظرة شاملة على جميع العمليات والموظفين</p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <p className="text-xs text-blue-700">إجمالي الموظفين</p>
                    <p className="text-3xl font-bold text-blue-900">{employeeStats?.total_employees || 0}</p>
                    <p className="text-xs text-blue-600 mt-1">{employeeStats?.active_employees || 0} نشط</p>
                  </div>
                  <Users className="w-12 h-12 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <p className="text-xs text-green-700">المعاملات</p>
                    <p className="text-3xl font-bold text-green-900">0</p>
                    <p className="text-xs text-green-600 mt-1">جميع الحالات</p>
                  </div>
                  <ClipboardList className="w-12 h-12 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <p className="text-xs text-purple-700">الشؤون الإدارية</p>
                    <p className="text-3xl font-bold text-purple-900">3</p>
                    <p className="text-xs text-purple-600 mt-1">موظفين</p>
                  </div>
                  <Briefcase className="w-12 h-12 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 border-cyan-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <p className="text-xs text-cyan-700">الفنية والميدانية</p>
                    <p className="text-3xl font-bold text-cyan-900">6</p>
                    <p className="text-xs text-cyan-600 mt-1">موظفين</p>
                  </div>
                  <Briefcase className="w-12 h-12 text-cyan-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Employees Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-cairo text-base text-right">حالة الموظفين</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-right">
                    <p className="text-sm font-medium">نشطون</p>
                    <p className="text-2xl font-bold text-green-700">{employeeStats?.active_employees || 0}</p>
                  </div>
                  <UserCheck className="w-8 h-8 text-green-600" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <div className="text-right">
                    <p className="text-sm font-medium">غير نشطين</p>
                    <p className="text-2xl font-bold text-gray-700">{employeeStats?.inactive_employees || 0}</p>
                  </div>
                  <UserX className="w-8 h-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>

            {/* Work Tasks Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-cairo text-base text-right">توزيع المهام</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-right flex-1">
                    <p className="text-sm font-medium">الشؤون الإدارية</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-purple-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{width: '21%'}}></div>
                      </div>
                      <span className="text-sm font-bold text-purple-700">3</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                  <div className="text-right flex-1">
                    <p className="text-sm font-medium">الشؤون الفنية والميدانية</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-cyan-200 rounded-full h-2">
                        <div className="bg-cyan-600 h-2 rounded-full" style={{width: '43%'}}></div>
                      </div>
                      <span className="text-sm font-bold text-cyan-700">6</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <div className="text-right flex-1">
                    <p className="text-sm font-medium">غير محدد</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-gray-600 h-2 rounded-full" style={{width: '36%'}}></div>
                      </div>
                      <span className="text-sm font-bold text-gray-700">5</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* activeTab === 'data' تم حذفه - لا داعي له */}

      {activeTab === 'employees' && (
        <EmployeeManagement department="planning" />
      )}
    </div>
  );
}
