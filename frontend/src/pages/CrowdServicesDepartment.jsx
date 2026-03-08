import { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import axios from "axios";
import DepartmentOverview from "@/pages/DepartmentOverview";
import DepartmentSettings from "@/pages/DepartmentSettings";
import TransactionsPage from "@/pages/TransactionsPage";
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
        <DepartmentOverview department="crowd_services" />
      )}}

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
        <DepartmentSettings department="crowd_services" />
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
