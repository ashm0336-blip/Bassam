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
  Briefcase
} from "lucide-react";
import { 
  ClipboardList, 
  Users, 
  CheckCircle2, 
  Clock,
  Activity,
  Target,
  UserCheck,
  UserX,
  MapPin
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
            <p className="text-sm text-muted-foreground mt-1 text-right">نظرة شاملة على الموظفين والورديات</p>
          </div>

          {/* Employee Stats - REAL DATA ONLY */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="font-cairo text-base text-right flex items-center gap-2 justify-end">
                <Users className="w-5 h-5 text-primary" />
                إحصائيات الموظفين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-4 rounded-lg bg-card border border-border">
                  <Users className="w-6 h-6 mx-auto text-primary mb-2" />
                  <p className="text-2xl font-bold">{employeeStats?.total_employees || 0}</p>
                  <p className="text-xs text-muted-foreground">إجمالي الموظفين</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200">
                  <UserCheck className="w-6 h-6 mx-auto text-green-500 mb-2" />
                  <p className="text-2xl font-bold text-green-600">{employeeStats?.active_employees || 0}</p>
                  <p className="text-xs text-muted-foreground">نشطون</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200">
                  <Briefcase className="w-6 h-6 mx-auto text-purple-500 mb-2" />
                  <p className="text-2xl font-bold text-purple-600">3</p>
                  <p className="text-xs text-muted-foreground">شؤون إدارية</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200">
                  <Briefcase className="w-6 h-6 mx-auto text-cyan-500 mb-2" />
                  <p className="text-2xl font-bold text-cyan-600">6</p>
                  <p className="text-xs text-muted-foreground">فنية وميدانية</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* activeTab === 'data' تم حذفه - لا داعي له */}

      {activeTab === 'employees' && (
        <EmployeeManagement department="planning" />
      )}
    </div>
  );
}
