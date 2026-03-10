import { useSearchParams } from "react-router-dom";
import DepartmentOverview from "@/pages/DepartmentOverview";
import TasksPage from "@/pages/TasksPage";
import DepartmentSettings from "@/pages/DepartmentSettings";

export default function GatesDepartment() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  return (
    <div data-testid="gates-page">
      {activeTab === 'dashboard'    && <DepartmentOverview department="gates" />}
      {activeTab === 'data'         && <DepartmentSettings department="gates" />}
      {activeTab === 'employees'    && <DepartmentSettings department="gates" />}
      {activeTab === 'transactions' && <TasksPage department="gates" />}
      {activeTab === 'settings'     && <DepartmentSettings department="gates" />}
    </div>
  );
}
