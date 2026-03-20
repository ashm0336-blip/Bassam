import { useSearchParams } from "react-router-dom";
import DepartmentOverview from "@/pages/DepartmentOverview";
import DepartmentSettings from "@/pages/DepartmentSettings";
import TasksPage from "@/pages/TasksPage";
import EmployeeManagement from "@/components/EmployeeManagement";

export default function GatesDepartment() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  return (
    <div className="space-y-6" data-testid="gates-page">
      {activeTab === 'dashboard'     && <DepartmentOverview department="gates" />}
      {activeTab === 'employees'     && <DepartmentSettings department="gates" />}
      {activeTab === 'transactions'  && <TasksPage department="gates" />}
      {activeTab === 'schedule'      && <EmployeeManagement department="gates" />}
      {activeTab === 'settings'      && <DepartmentSettings department="gates" />}
    </div>
  );
}
