import { useSearchParams } from "react-router-dom";
import DepartmentOverview from "@/pages/DepartmentOverview";
import DepartmentSettings from "@/pages/DepartmentSettings";
import TasksPage from "@/pages/TasksPage";
import EmployeeManagement from "@/components/EmployeeManagement";

export default function PlanningDepartment() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  return (
    <div className="space-y-6" data-testid="planning-page">
      {activeTab === 'dashboard'     && <DepartmentOverview department="planning" />}
      {activeTab === 'employees'     && <DepartmentSettings department="planning" />}
      {activeTab === 'transactions'  && <TasksPage department="planning" />}
      {activeTab === 'schedule'      && <EmployeeManagement department="planning" />}
      {activeTab === 'settings'      && <DepartmentSettings department="planning" />}
    </div>
  );
}
