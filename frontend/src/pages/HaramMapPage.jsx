import { useSearchParams } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import DepartmentOverview from "@/pages/DepartmentOverview";
import DepartmentSettings from "@/pages/DepartmentSettings";
import TasksPage from "@/pages/TasksPage";
import EmployeeManagement from "@/components/EmployeeManagement";

export default function HaramMapPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
  const { menuItems } = useSidebar();
  const { language } = useLanguage();

  const pageInfo = menuItems.find(item => item.href === '/haram-map' && !item.parent_id);
  const pageTitle = pageInfo
    ? (language === 'ar' ? pageInfo.name_ar : pageInfo.name_en)
    : (language === 'ar' ? 'إدارة المصليات' : 'Prayer Halls');

  return (
    <div className="space-y-6" data-testid="haram-map-page">
      {activeTab === "dashboard" && <DepartmentOverview department="haram_map" />}
      {activeTab === "employees" && <DepartmentSettings department="haram_map" />}
      {activeTab === "transactions" && <TasksPage department="haram_map" />}
      {activeTab === "schedule" && <EmployeeManagement department="haram_map" />}
      {activeTab === "settings" && <DepartmentSettings department="haram_map" />}
    </div>
  );
}
