import { useSearchParams } from "react-router-dom";
import DepartmentOverview from "@/pages/DepartmentOverview";
import DepartmentSettings from "@/pages/DepartmentSettings";
import TasksPage from "@/pages/TasksPage";

export default function MatafDepartment() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  return (
    <div className="space-y-6" data-testid="mataf-page">
      {activeTab === 'dashboard'     && <DepartmentOverview department="mataf" />}
      {activeTab === 'employees'     && <DepartmentSettings department="mataf" />}
      {activeTab === 'transactions'  && <TasksPage department="mataf" />}
      {activeTab === 'settings'      && <DepartmentSettings department="mataf" />}
    </div>
  );
}
