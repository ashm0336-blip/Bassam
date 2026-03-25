import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DepartmentOverview from "@/pages/DepartmentOverview";
import DepartmentSettings from "@/pages/DepartmentSettings";
import TasksPage from "@/pages/TasksPage";
import EmployeeManagement from "@/components/EmployeeManagement";

export default function MatafDepartment() {
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'dashboard';
  const activeTab = rawTab === 'overview' ? 'dashboard' : rawTab;
  const { canViewPage } = useAuth();

  const dept = "mataf";
  const base = "/mataf";

  return (
    <div className="space-y-6" data-testid="mataf-page">
      {activeTab === 'dashboard'     && <DepartmentOverview department={dept} />}
      {activeTab === 'employees'     && canViewPage(`${base}?tab=settings&sub=Staff`) && <DepartmentSettings department={dept} />}
      {activeTab === 'transactions'  && canViewPage(`${base}?tab=transactions`) && <TasksPage department={dept} />}
      {activeTab === 'schedule'      && canViewPage(`${base}?tab=schedule`) && <EmployeeManagement department={dept} />}
      {activeTab === 'settings'      && canViewPage(`${base}?tab=settings`) && <DepartmentSettings department={dept} />}
    </div>
  );
}
