import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import DepartmentOverview from "@/pages/DepartmentOverview";
import DepartmentSettings from "@/pages/DepartmentSettings";
import TasksPage from "@/pages/TasksPage";
import EmployeeManagement from "@/components/EmployeeManagement";

export default function HaramMapPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
  const { canViewPage } = useAuth();
  const { menuItems } = useSidebar();
  const { language } = useLanguage();

  const dept = "haram_map";
  const base = "/haram-map";

  const pageInfo = menuItems.find(item => item.href === base && !item.parent_id);
  const pageTitle = pageInfo
    ? (language === 'ar' ? pageInfo.name_ar : pageInfo.name_en)
    : (language === 'ar' ? 'إدارة المصليات' : 'Prayer Halls');

  return (
    <div className="space-y-6" data-testid="haram-map-page">
      {activeTab === "dashboard" && <DepartmentOverview department={dept} />}
      {activeTab === "employees" && canViewPage(`${base}?tab=settings&sub=Staff`) && <DepartmentSettings department={dept} />}
      {activeTab === "transactions" && canViewPage(`${base}?tab=transactions`) && <TasksPage department={dept} />}
      {activeTab === "schedule" && canViewPage(`${base}?tab=schedule`) && <EmployeeManagement department={dept} />}
      {activeTab === "settings" && canViewPage(`${base}?tab=settings`) && <DepartmentSettings department={dept} />}
    </div>
  );
}
