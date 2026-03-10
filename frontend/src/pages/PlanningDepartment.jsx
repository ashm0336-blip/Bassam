import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import DepartmentOverview from "@/pages/DepartmentOverview";
import DepartmentSettings from "@/pages/DepartmentSettings";
import TasksPage from "@/pages/TasksPage";
import {
  Users,
  UserCheck,
  UserX,
  MapPin,
  ClipboardList,
  Clock,
  CheckCircle2,
  CheckCircle,
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
  const { menuItems } = useSidebar();
  const { language } = useLanguage();
  
  // Get page title from sidebar menu
  const pageInfo = menuItems.find(item => item.href === '/planning' && !item.parent_id);
  const pageTitle = pageInfo ? (language === 'ar' ? pageInfo.name_ar : pageInfo.name_en) : (language === 'ar' ? 'تخطيط خدمات الحشود' : 'Planning');
  
  const [stats, setStats] = useState(null);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [employeesRes, empStatsRes, planningStatsRes] = await Promise.all([
          axios.get(`${API}/employees?department=planning`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/employees/stats/planning`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/planning/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        // حساب النشطين بناءً على أيام الراحة
        const today = new Date().toLocaleDateString('ar-SA', { weekday: 'long' }).replace('يوم ', '');
        const allEmployees = employeesRes.data;
        
        const activeNow = allEmployees.filter(emp => {
          if (!emp.weekly_rest) return true; // لو ما عنده راحة يعتبر نشط
          return !emp.weekly_rest.includes(today);
        });
        
        const onRest = allEmployees.filter(emp => {
          if (!emp.weekly_rest) return false;
          return emp.weekly_rest.includes(today);
        });
        
        setEmployeeStats({
          ...empStatsRes.data,
          total_employees: allEmployees.length,
          active_employees: activeNow.length,
          inactive_employees: onRest.length,
          on_rest: onRest.length
        });
        setStats(planningStatsRes.data);
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
        <DepartmentOverview department="planning" />
      )}

      {/* activeTab === 'data' تم حذفه - لا داعي له */}

      {activeTab === 'employees' && (
        <DepartmentSettings department="planning" />
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <TasksPage department="planning" />
      )}
      
      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <DepartmentSettings department="planning" />
      )}
    </div>
  );
}
